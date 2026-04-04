package com.hiosdra.openanchor.network

import android.util.Log
import com.hiosdra.openanchor.domain.geometry.GeoCalculations
import com.hiosdra.openanchor.domain.geometry.ZoneCheckResult
import com.hiosdra.openanchor.domain.model.AlarmState
import com.hiosdra.openanchor.domain.model.AnchorZone
import com.hiosdra.openanchor.domain.model.Position
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Orchestrates client mode — the bridge between the WebSocket client
 * and AnchorMonitorService when this Android device acts as a client
 * (like the PWA acts towards the server).
 *
 * Responsibilities:
 * - Manages connection to the server device
 * - Performs GPS monitoring and sends STATE_UPDATE every 2s
 * - Sends FULL_SYNC on connect with the zone configuration
 * - Sends TRIGGER_ALARM when zone violations are detected
 * - Processes ANDROID_GPS_REPORT from the server (cross-validation)
 * - Processes ACTION_COMMAND (MUTE_ALARM / DISMISS_ALARM) from server
 * - Heartbeat monitoring
 */
@Singleton
class ClientModeManager @Inject constructor(
    private val wsClient: AnchorWebSocketClient,
    private val parser: ProtocolMessageParser
) {
    companion object {
        private const val TAG = "ClientModeManager"
    }

    private var collectionJob: Job? = null
    private var stateUpdateJob: Job? = null
    private var alarmSendFailedEmitted = false

    // Client mode state exposed to the service and UI
    private val _clientModeState = MutableStateFlow(ClientModeState())
    val clientModeState: StateFlow<ClientModeState> = _clientModeState.asStateFlow()

    // Events that the AnchorMonitorService needs to handle
    private val _events = MutableSharedFlow<ClientModeEvent>(
        replay = 0,
        extraBufferCapacity = 32
    )
    val events: SharedFlow<ClientModeEvent> = _events.asSharedFlow()

    data class ClientModeState(
        val isActive: Boolean = false,
        val isConnected: Boolean = false,
        val serverUrl: String? = null,
        // Zone info (set locally before connecting)
        val anchorPosition: Position? = null,
        val zone: AnchorZone? = null,
        val chainLengthM: Double? = null,
        val depthM: Double? = null,
        // Local telemetry (sent to server)
        val boatPosition: Position? = null,
        val distanceToAnchor: Double = 0.0,
        val alarmState: AlarmState = AlarmState.SAFE,
        val gpsAccuracy: Float = 0f,
        val sog: Double? = null,
        val cog: Double? = null,
        // Server GPS verification data
        val serverGpsReport: AndroidGpsReportPayload? = null,
        val serverDriftDetected: Boolean = false
    )

    sealed class ClientModeEvent {
        data class Connected(val serverUrl: String) : ClientModeEvent()
        data object Disconnected : ClientModeEvent()
        data object HeartbeatTimeout : ClientModeEvent()
        data class ServerCommand(val command: String) : ClientModeEvent()
        data class ServerGpsReport(val payload: AndroidGpsReportPayload) : ClientModeEvent()
        data class AlarmSendFailed(val reason: String, val message: String, val alarmState: AlarmState) : ClientModeEvent()
    }

    /**
     * Connect to a server and start client mode.
     * @param serverUrl WebSocket URL (e.g. "ws://192.168.43.1:8080")
     * @param scope CoroutineScope for background jobs
     */
    fun connect(serverUrl: String, scope: CoroutineScope) {
        _clientModeState.value = _clientModeState.value.copy(
            isActive = true,
            serverUrl = serverUrl
        )
        wsClient.connect(serverUrl, scope)
        startListening(scope)
    }

    /**
     * Start listening to WebSocket events.
     */
    private fun startListening(scope: CoroutineScope) {
        collectionJob?.cancel()
        collectionJob = scope.launch {
            // Collect inbound messages from server
            launch {
                wsClient.inboundMessages.collect { message ->
                    handleServerMessage(message)
                }
            }

            // Collect connection events
            launch {
                wsClient.connectionEvents.collect { event ->
                    handleConnectionEvent(event)
                }
            }

            // Mirror client state
            launch {
                wsClient.clientState.collect { state ->
                    _clientModeState.value = _clientModeState.value.copy(
                        isConnected = state.isConnected,
                        serverUrl = state.serverUrl
                    )
                }
            }
        }
    }

    private suspend fun handleServerMessage(message: AnchorWebSocketClient.ServerMessage) {
        when (message) {
            is AnchorWebSocketClient.ServerMessage.Ping -> {
                // Heartbeat handled by AnchorWebSocketClient
            }
            is AnchorWebSocketClient.ServerMessage.GpsReport -> {
                Log.i(TAG, "Server GPS report: zone=${message.payload.zoneCheckResult}")
                _clientModeState.value = _clientModeState.value.copy(
                    serverGpsReport = message.payload,
                    serverDriftDetected = message.payload.driftDetected ?: false
                )
                _events.emit(ClientModeEvent.ServerGpsReport(message.payload))
            }
            is AnchorWebSocketClient.ServerMessage.ActionCommand -> {
                Log.i(TAG, "Server command: ${message.payload.command}")
                _events.emit(ClientModeEvent.ServerCommand(message.payload.command))
            }
        }
    }

    private suspend fun handleConnectionEvent(event: AnchorWebSocketClient.ClientConnectionEvent) {
        when (event) {
            AnchorWebSocketClient.ClientConnectionEvent.CONNECTED -> {
                _clientModeState.value = _clientModeState.value.copy(isConnected = true)
                _events.emit(ClientModeEvent.Connected(
                    _clientModeState.value.serverUrl ?: ""
                ))
                // Send FULL_SYNC on connect (like PWA does)
                sendFullSync()
            }
            AnchorWebSocketClient.ClientConnectionEvent.DISCONNECTED -> {
                _clientModeState.value = _clientModeState.value.copy(isConnected = false)
                _events.emit(ClientModeEvent.Disconnected)
            }
            AnchorWebSocketClient.ClientConnectionEvent.HEARTBEAT_TIMEOUT -> {
                _clientModeState.value = _clientModeState.value.copy(isConnected = false)
                _events.emit(ClientModeEvent.HeartbeatTimeout)
            }
            AnchorWebSocketClient.ClientConnectionEvent.RECONNECTING -> {
                // Just update UI state — reconnect is automatic
            }
        }
    }

    /**
     * Set the anchor zone configuration. Must be called before or after connecting.
     * The FULL_SYNC will be sent (or re-sent) on next connect.
     */
    fun setZoneConfiguration(
        anchorPosition: Position,
        zone: AnchorZone,
        chainLengthM: Double? = null,
        depthM: Double? = null
    ) {
        _clientModeState.value = _clientModeState.value.copy(
            anchorPosition = anchorPosition,
            zone = zone,
            chainLengthM = chainLengthM,
            depthM = depthM
        )
        // If already connected, send immediately
        if (wsClient.isConnected) {
            sendFullSync()
        }
    }

    /**
     * Send FULL_SYNC to the server with current zone configuration.
     */
    private fun sendFullSync() {
        val state = _clientModeState.value
        val anchorPos = state.anchorPosition ?: return
        val zone = state.zone ?: return

        val payload = when (zone) {
            is AnchorZone.Circle -> FullSyncPayload(
                isAnchored = true,
                anchorPos = LatLng(anchorPos.latitude, anchorPos.longitude),
                zoneType = "CIRCLE",
                radiusMeters = zone.radiusMeters,
                bufferRadiusMeters = zone.bufferRadiusMeters,
                chainLengthM = state.chainLengthM,
                depthM = state.depthM
            )
            is AnchorZone.SectorWithCircle -> FullSyncPayload(
                isAnchored = true,
                anchorPos = LatLng(anchorPos.latitude, anchorPos.longitude),
                zoneType = "SECTOR",
                radiusMeters = zone.radiusMeters,
                bufferRadiusMeters = zone.bufferRadiusMeters,
                sector = SectorPayload(
                    bearingDeg = zone.sectorBearingDeg,
                    halfAngleDeg = zone.sectorHalfAngleDeg,
                    radiusMeters = zone.sectorRadiusMeters
                ),
                chainLengthM = state.chainLengthM,
                depthM = state.depthM
            )
        }

        wsClient.sendFullSync(payload)
        Log.i(TAG, "FULL_SYNC sent: ${payload.zoneType}")
    }

    /**
     * Update local GPS telemetry. Called periodically by AnchorMonitorService.
     * Sends STATE_UPDATE to the server.
     */
    fun updateTelemetry(
        position: Position,
        distanceToAnchor: Double,
        alarmState: AlarmState,
        sog: Double? = null,
        cog: Double? = null,
        batteryLevel: Double? = null,
        isCharging: Boolean? = null
    ) {
        _clientModeState.value = _clientModeState.value.copy(
            boatPosition = position,
            distanceToAnchor = distanceToAnchor,
            alarmState = alarmState,
            gpsAccuracy = position.accuracy,
            sog = sog,
            cog = cog
        )

        if (alarmState != AlarmState.ALARM) {
            alarmSendFailedEmitted = false
        }

        if (wsClient.isConnected) {
            val sent = wsClient.sendStateUpdate(StateUpdatePayload(
                currentPos = LatLng(position.latitude, position.longitude),
                gpsAccuracy = position.accuracy,
                distanceToAnchor = distanceToAnchor,
                alarmState = alarmState.name,
                sog = sog,
                cog = cog,
                batteryLevel = batteryLevel,
                isCharging = isCharging
            ))
            if (!sent) {
                Log.w(TAG, "STATE_UPDATE send failed — connection lost")
            }
        }
    }

    /**
     * Send TRIGGER_ALARM to the server.
     */
    fun triggerAlarm(reason: String, message: String, alarmState: AlarmState) {
        val sent = wsClient.sendTriggerAlarm(TriggerAlarmPayload(
            reason = reason,
            message = message,
            alarmState = alarmState.name
        ))
        if (!sent && !alarmSendFailedEmitted) {
            alarmSendFailedEmitted = true
            Log.w(TAG, "TRIGGER_ALARM send failed — connection lost, emitting local fallback")
            _events.tryEmit(ClientModeEvent.AlarmSendFailed(reason, message, alarmState))
        }
    }

    /**
     * Disconnect from the server and stop client mode.
     */
    fun disconnect(reason: String = "USER_DISCONNECT") {
        stateUpdateJob?.cancel()
        stateUpdateJob = null
        collectionJob?.cancel()
        collectionJob = null
        wsClient.disconnect(reason)
        _clientModeState.value = ClientModeState()
    }
}
