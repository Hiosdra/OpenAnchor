package com.hiosdra.openanchor.service

import android.util.Log
import com.hiosdra.openanchor.data.battery.BatteryProvider
import com.hiosdra.openanchor.data.location.LocationProvider
import com.hiosdra.openanchor.data.preferences.PreferencesManager
import com.hiosdra.openanchor.domain.geometry.GeoCalculations
import com.hiosdra.openanchor.domain.model.*
import com.hiosdra.openanchor.network.ClientModeManager
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import javax.inject.Inject

class ClientModeOrchestrator @Inject constructor(
    private val clientModeManager: ClientModeManager,
    private val locationProvider: LocationProvider,
    private val preferencesManager: PreferencesManager,
    private val batteryProvider: BatteryProvider,
    private val gpsProcessor: GpsProcessor,
    private val alarmPlayer: AlarmPlayer,
    private val alarmEngine: AlarmEngine,
    private val wearDataSender: WearDataSender,
    private val standaloneMonitorManager: StandaloneMonitorManager
) {
    companion object {
        private const val TAG = "ClientModeOrchestrator"
    }

    private var clientModeJob: Job? = null
    private var clientStateUpdateJob: Job? = null
    private var clientEventJob: Job? = null

    fun startClientMode(
        wsUrl: String,
        scope: CoroutineScope,
        monitorState: MutableStateFlow<MonitorState>,
        onUpdateNotification: (String, AlarmState) -> Unit,
        onMuteAlarm: () -> Unit,
        onDismissAlarm: () -> Unit
    ) {
        clientModeManager.connect(wsUrl, scope)
        startClientGpsMonitoring(scope, monitorState, onUpdateNotification)
        startClientEventCollection(scope, monitorState, onUpdateNotification, onMuteAlarm, onDismissAlarm)

        monitorState.value = monitorState.value.copy(
            isActive = true,
            isClientMode = true
        )
        onUpdateNotification("Client mode — connecting to $wsUrl", AlarmState.SAFE)
    }

    private fun startClientGpsMonitoring(
        scope: CoroutineScope,
        monitorState: MutableStateFlow<MonitorState>,
        onUpdateNotification: (String, AlarmState) -> Unit
    ) {
        clientModeJob?.cancel()
        clientModeJob = scope.launch {
            val intervalMs = preferencesManager.preferences.first().gpsIntervalSeconds * 1000L
            standaloneMonitorManager.resetGpsFixTime()
            standaloneMonitorManager.startGpsWatchdog(scope, monitorState, onUpdateNotification)

            locationProvider.locationUpdates(intervalMs).collect { position ->
                standaloneMonitorManager.updateLastGpsFixTime()

                val state = clientModeManager.clientModeState.value
                val anchorPos = state.anchorPosition
                val zone = state.zone

                var distance = 0.0
                var alarmState = AlarmState.SAFE

                if (anchorPos != null && zone != null) {
                    distance = GeoCalculations.distanceMeters(position, anchorPos)
                    val zoneResult = GeoCalculations.checkZone(position, zone)
                    alarmState = alarmEngine.processReading(zoneResult)

                    val previousAlarmState = monitorState.value.alarmState
                    when (alarmState) {
                        AlarmState.ALARM -> {
                            if (!alarmPlayer.isPlaying()) {
                                alarmPlayer.startAlarm()
                            }
                            if (previousAlarmState != AlarmState.ALARM) {
                                launch { wearDataSender.sendAlarmTrigger() }
                            }
                            clientModeManager.triggerAlarm(
                                reason = "OUT_OF_ZONE",
                                message = "Boat is %.0f m from anchor (zone limit: %.0f m)".format(distance, zone.radiusMeters),
                                alarmState = alarmState
                            )
                        }
                        else -> {
                            if (alarmPlayer.isPlaying()) {
                                alarmPlayer.stopAlarm()
                            }
                        }
                    }
                }

                var currentSog: Double? = null
                var currentCog: Double? = null
                if (anchorPos != null && zone != null) {
                    val sessionId = monitorState.value.sessionId ?: 0L
                    val result = gpsProcessor.processPosition(position, anchorPos, zone, sessionId)
                    currentSog = result.sog
                    currentCog = result.cog
                }

                val battery = batteryProvider.getCurrentBatteryState()
                val batteryLevelPercent = if (battery.level >= 0) {
                    battery.level.toDouble() / 100.0
                } else {
                    null
                }
                clientModeManager.updateTelemetry(
                    position = position,
                    distanceToAnchor = distance,
                    alarmState = alarmState,
                    sog = currentSog,
                    cog = currentCog,
                    batteryLevel = batteryLevelPercent,
                    isCharging = battery.isCharging
                )

                monitorState.value = monitorState.value.copy(
                    boatPosition = position,
                    distanceToAnchor = distance,
                    alarmState = alarmState,
                    gpsAccuracyMeters = position.accuracy,
                    gpsSignalLost = false,
                    sog = currentSog,
                    cog = currentCog,
                    isClientMode = true
                )

                launch { wearDataSender.sendMonitorState(monitorState.value) }

                val notifText = "Client: %.0f m - %s".format(distance, alarmState.name)
                onUpdateNotification(notifText, alarmState)
            }
        }
    }

    private fun startClientEventCollection(
        scope: CoroutineScope,
        monitorState: MutableStateFlow<MonitorState>,
        onUpdateNotification: (String, AlarmState) -> Unit,
        onMuteAlarm: () -> Unit,
        onDismissAlarm: () -> Unit
    ) {
        clientEventJob?.cancel()
        clientEventJob = scope.launch {
            launch {
                clientModeManager.clientModeState.collect { clientState ->
                    monitorState.value = monitorState.value.copy(
                        isClientMode = true,
                        peerConnected = clientState.isConnected,
                        anchorPosition = clientState.anchorPosition ?: monitorState.value.anchorPosition,
                        zone = clientState.zone ?: monitorState.value.zone
                    )
                    if (clientState.isConnected) {
                        onUpdateNotification(
                            "Connected to server — monitoring",
                            monitorState.value.alarmState
                        )
                    }
                }
            }

            launch {
                clientModeManager.events.collect { event ->
                    handleClientEvent(event, scope, monitorState, onUpdateNotification, onMuteAlarm, onDismissAlarm)
                }
            }
        }
    }

    private fun handleClientEvent(
        event: ClientModeManager.ClientModeEvent,
        scope: CoroutineScope,
        monitorState: MutableStateFlow<MonitorState>,
        onUpdateNotification: (String, AlarmState) -> Unit,
        onMuteAlarm: () -> Unit,
        onDismissAlarm: () -> Unit
    ) {
        when (event) {
            is ClientModeManager.ClientModeEvent.Connected -> {
                Log.i(TAG, "Client connected to server: ${event.serverUrl}")
                monitorState.value = monitorState.value.copy(peerConnected = true)
                onUpdateNotification("Connected to server", AlarmState.SAFE)
            }
            is ClientModeManager.ClientModeEvent.Disconnected -> {
                Log.w(TAG, "Client disconnected from server")
                monitorState.value = monitorState.value.copy(peerConnected = false)
                onUpdateNotification("Disconnected — reconnecting...", monitorState.value.alarmState)
            }
            is ClientModeManager.ClientModeEvent.HeartbeatTimeout -> {
                Log.w(TAG, "Client heartbeat timeout")
                alarmPlayer.startAlarm()
                scope.launch { wearDataSender.sendAlarmTrigger() }
                monitorState.value = monitorState.value.copy(
                    peerConnected = false,
                    alarmState = AlarmState.ALARM
                )
                onUpdateNotification("Connection lost with server!", AlarmState.ALARM)
            }
            is ClientModeManager.ClientModeEvent.ServerCommand -> {
                when (event.command) {
                    "MUTE_ALARM" -> onMuteAlarm()
                    "DISMISS_ALARM" -> onDismissAlarm()
                }
            }
            is ClientModeManager.ClientModeEvent.ServerGpsReport -> {
                Log.i(TAG, "Server GPS report: zone=${event.payload.zoneCheckResult}")
            }
            is ClientModeManager.ClientModeEvent.AlarmSendFailed -> {
                if (monitorState.value.alarmState == event.alarmState) {
                    Log.w(TAG, "Alarm send failed — triggering local alarm: ${event.reason}")
                    alarmPlayer.startAlarm()
                    scope.launch { wearDataSender.sendAlarmTrigger() }
                    monitorState.value = monitorState.value.copy(alarmState = event.alarmState)
                    onUpdateNotification("ALARM (offline): ${event.reason}", event.alarmState)
                }
            }
        }
    }

    fun disconnect(reason: String) {
        clientModeManager.disconnect(reason)
    }

    fun cancelAll() {
        clientModeJob?.cancel()
        clientModeJob = null
        clientStateUpdateJob?.cancel()
        clientStateUpdateJob = null
        clientEventJob?.cancel()
        clientEventJob = null
    }
}
