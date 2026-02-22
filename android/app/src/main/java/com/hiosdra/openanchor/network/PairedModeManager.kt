package com.hiosdra.openanchor.network

import android.util.Log
import com.hiosdra.openanchor.domain.geometry.GeoCalculations
import com.hiosdra.openanchor.domain.model.AlarmState
import com.hiosdra.openanchor.domain.model.AnchorZone
import com.hiosdra.openanchor.domain.model.Position
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Orchestrates paired mode — the bridge between the WebSocket server
 * and the AnchorMonitorService.
 *
 * Responsibilities:
 * - Processes FULL_SYNC to create zone and enter paired mode
 * - Processes STATE_UPDATE to update the paired mode dashboard state
 * - Processes TRIGGER_ALARM to activate the local alarm
 * - Processes DISCONNECT for graceful unpair
 * - Manages heartbeat timeout → standalone fallback
 * - Handles periodic Android GPS verification (~10 min)
 */
@Singleton
class PairedModeManager @Inject constructor(
    private val wsServer: AnchorWebSocketServer,
    private val parser: ProtocolMessageParser
) {
    companion object {
        private const val TAG = "PairedModeManager"
        private const val VERIFICATION_INTERVAL_MS = 10 * 60 * 1000L // 10 minutes
    }

    private var collectionJob: Job? = null

    // Paired mode state exposed to the service and UI
    private val _pairedState = MutableStateFlow(PairedState())
    val pairedState: StateFlow<PairedState> = _pairedState.asStateFlow()

    // Events that the AnchorMonitorService needs to handle
    private val _events = MutableSharedFlow<PairedEvent>(
        replay = 0,
        extraBufferCapacity = 32
    )
    val events: SharedFlow<PairedEvent> = _events.asSharedFlow()

    data class PairedState(
        val isPaired: Boolean = false,
        val peerConnected: Boolean = false,
        // Zone info from FULL_SYNC
        val anchorPosition: Position? = null,
        val zone: AnchorZone? = null,
        val chainLengthM: Double? = null,
        val depthM: Double? = null,
        // Latest telemetry from PWA
        val peerBoatPosition: Position? = null,
        val peerDistanceToAnchor: Double = 0.0,
        val peerAlarmState: AlarmState = AlarmState.SAFE,
        val peerGpsAccuracy: Float = 0f,
        val peerSog: Double? = null,
        val peerCog: Double? = null,
        val peerBatteryLevel: Double? = null,
        val peerIsCharging: Boolean? = null
    )

    sealed class PairedEvent {
        data class EnterPairedMode(
            val zone: AnchorZone,
            val anchorPosition: Position,
            val chainLengthM: Double?,
            val depthM: Double?
        ) : PairedEvent()

        data object ExitPairedMode : PairedEvent()

        data class AlarmTriggered(
            val reason: String,
            val message: String,
            val alarmState: AlarmState
        ) : PairedEvent()

        data object HeartbeatTimeout : PairedEvent()

        data class SessionEnded(val reason: String) : PairedEvent()

        data class LowBatteryWarning(val level: Double) : PairedEvent()
    }

    /**
     * Start listening to WebSocket messages and connection events.
     * Should be called when the WS server starts.
     */
    fun startListening(scope: CoroutineScope) {
        collectionJob?.cancel()
        collectionJob = scope.launch {
            // Collect inbound messages
            launch {
                wsServer.inboundMessages.collect { message ->
                    handleMessage(message)
                }
            }

            // Collect connection events
            launch {
                wsServer.connectionEvents.collect { event ->
                    handleConnectionEvent(event)
                }
            }
        }
    }

    fun stopListening() {
        collectionJob?.cancel()
        collectionJob = null
        _pairedState.value = PairedState()
    }

    private suspend fun handleMessage(message: ProtocolMessageParser.InboundMessage) {
        when (message) {
            is ProtocolMessageParser.InboundMessage.FullSync -> handleFullSync(message.payload)
            is ProtocolMessageParser.InboundMessage.StateUpdate -> handleStateUpdate(message.payload)
            is ProtocolMessageParser.InboundMessage.TriggerAlarm -> handleTriggerAlarm(message.payload)
            is ProtocolMessageParser.InboundMessage.Ping -> { /* Handled in WS server for heartbeat tracking */ }
            is ProtocolMessageParser.InboundMessage.Disconnect -> handleDisconnect(message.payload)
            is ProtocolMessageParser.InboundMessage.Unknown -> {
                Log.w(TAG, "Unknown message type: ${message.type}")
            }
        }
    }

    private suspend fun handleFullSync(payload: FullSyncPayload) {
        Log.i(TAG, "FULL_SYNC received: isAnchored=${payload.isAnchored}, zone=${payload.zoneType}")

        if (!payload.isAnchored) {
            // PWA says anchor is not deployed — exit paired mode
            _pairedState.value = _pairedState.value.copy(isPaired = false)
            _events.emit(PairedEvent.SessionEnded("NOT_ANCHORED"))
            return
        }

        val zone = parser.toAnchorZone(payload)
        val anchorPos = Position(
            latitude = payload.anchorPos.lat,
            longitude = payload.anchorPos.lng
        )

        _pairedState.value = _pairedState.value.copy(
            isPaired = true,
            peerConnected = true,
            anchorPosition = anchorPos,
            zone = zone,
            chainLengthM = payload.chainLengthM,
            depthM = payload.depthM
        )

        _events.emit(PairedEvent.EnterPairedMode(
            zone = zone,
            anchorPosition = anchorPos,
            chainLengthM = payload.chainLengthM,
            depthM = payload.depthM
        ))
    }

    private suspend fun handleStateUpdate(payload: StateUpdatePayload) {
        val boatPos = Position(
            latitude = payload.currentPos.lat,
            longitude = payload.currentPos.lng,
            accuracy = payload.gpsAccuracy
        )
        val alarmState = parser.parseAlarmState(payload.alarmState)

        _pairedState.value = _pairedState.value.copy(
            peerBoatPosition = boatPos,
            peerDistanceToAnchor = payload.distanceToAnchor,
            peerAlarmState = alarmState,
            peerGpsAccuracy = payload.gpsAccuracy,
            peerSog = payload.sog,
            peerCog = payload.cog,
            peerBatteryLevel = payload.batteryLevel,
            peerIsCharging = payload.isCharging
        )

        // Low battery warning
        val battery = payload.batteryLevel
        val charging = payload.isCharging
        if (battery != null && battery < 0.1 && charging != true) {
            _events.emit(PairedEvent.LowBatteryWarning(battery))
        }
    }

    private suspend fun handleTriggerAlarm(payload: TriggerAlarmPayload) {
        Log.w(TAG, "TRIGGER_ALARM: reason=${payload.reason}, state=${payload.alarmState}")
        val alarmState = parser.parseAlarmState(payload.alarmState)
        _events.emit(PairedEvent.AlarmTriggered(
            reason = payload.reason,
            message = payload.message,
            alarmState = alarmState
        ))
    }

    private suspend fun handleDisconnect(payload: DisconnectPayload) {
        Log.i(TAG, "DISCONNECT received: reason=${payload.reason}")
        _pairedState.value = _pairedState.value.copy(isPaired = false, peerConnected = false)
        _events.emit(PairedEvent.SessionEnded(payload.reason))
    }

    private suspend fun handleConnectionEvent(event: AnchorWebSocketServer.ConnectionEvent) {
        when (event) {
            AnchorWebSocketServer.ConnectionEvent.CLIENT_CONNECTED -> {
                _pairedState.value = _pairedState.value.copy(peerConnected = true)
                Log.i(TAG, "Peer connected")
            }
            AnchorWebSocketServer.ConnectionEvent.CLIENT_DISCONNECTED -> {
                if (_pairedState.value.isPaired) {
                    // Unexpected disconnect — signal heartbeat timeout for alarm
                    _pairedState.value = _pairedState.value.copy(peerConnected = false)
                    _events.emit(PairedEvent.HeartbeatTimeout)
                } else {
                    _pairedState.value = _pairedState.value.copy(peerConnected = false)
                }
                Log.i(TAG, "Peer disconnected")
            }
            AnchorWebSocketServer.ConnectionEvent.HEARTBEAT_TIMEOUT -> {
                _pairedState.value = _pairedState.value.copy(peerConnected = false)
                _events.emit(PairedEvent.HeartbeatTimeout)
                Log.w(TAG, "Peer heartbeat timeout")
            }
        }
    }

    /**
     * Send a MUTE_ALARM command to the PWA.
     */
    suspend fun sendMuteAlarm() {
        wsServer.sendCommand("MUTE_ALARM")
    }

    /**
     * Send a DISMISS_ALARM command to the PWA.
     */
    suspend fun sendDismissAlarm() {
        wsServer.sendCommand("DISMISS_ALARM")
    }

    /**
     * Send Android's GPS verification result to the PWA, including battery and drift info.
     */
    suspend fun sendGpsReport(
        position: Position,
        distanceToAnchor: Double,
        zoneCheckResult: com.hiosdra.openanchor.domain.geometry.ZoneCheckResult,
        alarmState: AlarmState,
        batteryLevel: Int? = null,
        isCharging: Boolean? = null,
        driftDetected: Boolean? = null,
        driftBearingDeg: Double? = null,
        driftSpeedMps: Double? = null
    ) {
        wsServer.sendGpsReport(
            position, distanceToAnchor, zoneCheckResult, alarmState,
            batteryLevel, isCharging, driftDetected, driftBearingDeg, driftSpeedMps
        )
    }
}
