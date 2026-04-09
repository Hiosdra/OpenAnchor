package com.hiosdra.openanchor.service

import android.util.Log
import com.hiosdra.openanchor.data.battery.BatteryProvider
import com.hiosdra.openanchor.data.location.LocationProvider
import com.hiosdra.openanchor.domain.geometry.GeoCalculations
import com.hiosdra.openanchor.domain.model.*
import com.hiosdra.openanchor.network.PairedModeManager
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import javax.inject.Inject

class PairedModeOrchestrator @Inject constructor(
    private val webSocketLifecycleManager: WebSocketLifecycleManager,
    private val locationProvider: LocationProvider,
    private val batteryProvider: BatteryProvider,
    alarmPlayer: AlarmPlayer,
    private val alarmEngine: AlarmEngine,
    private val alarmHandler: AlarmHandler,
    wearDataSender: WearDataSender,
    standaloneMonitorManager: StandaloneMonitorManager
) : BaseMonitoringOrchestrator(alarmPlayer, wearDataSender, standaloneMonitorManager) {

    companion object {
        private const val TAG = "PairedModeOrchestrator"
        private const val PAIRED_GPS_VERIFICATION_INTERVAL_MS = 10 * 60 * 1000L
    }

    private val pairedModeManager: PairedModeManager
        get() = webSocketLifecycleManager.pairedModeManager

    private var pairedGpsVerificationJob: Job? = null

    fun startServer(scope: CoroutineScope) {
        webSocketLifecycleManager.start(scope)
    }

    fun startEventCollection(
        scope: CoroutineScope,
        monitorState: MutableStateFlow<MonitorState>,
        onUpdateNotification: (String, AlarmState) -> Unit,
        onStopMonitoring: () -> Unit
    ) {
        scope.launchTracked {
            launch {
                pairedModeManager.events.collect { event ->
                    handlePairedEvent(event, scope, monitorState, onUpdateNotification, onStopMonitoring)
                }
            }

            launch {
                pairedModeManager.pairedState.collect { pairedState ->
                    if (pairedState.isPaired) {
                        monitorState.value = monitorState.value.copy(
                            isPairedMode = true,
                            peerConnected = pairedState.peerConnected,
                            anchorPosition = pairedState.anchorPosition ?: monitorState.value.anchorPosition,
                            zone = pairedState.zone ?: monitorState.value.zone,
                            boatPosition = pairedState.peerBoatPosition ?: monitorState.value.boatPosition,
                            distanceToAnchor = pairedState.peerDistanceToAnchor,
                            alarmState = pairedState.peerAlarmState,
                            gpsAccuracyMeters = pairedState.peerGpsAccuracy,
                            peerBatteryLevel = pairedState.peerBatteryLevel,
                            peerIsCharging = pairedState.peerIsCharging,
                            sog = pairedState.peerSog,
                            cog = pairedState.peerCog
                        )
                    }
                }
            }
        }
    }

    private suspend fun handlePairedEvent(
        event: PairedModeManager.PairedEvent,
        scope: CoroutineScope,
        monitorState: MutableStateFlow<MonitorState>,
        onUpdateNotification: (String, AlarmState) -> Unit,
        onStopMonitoring: () -> Unit
    ) {
        when (event) {
            is PairedModeManager.PairedEvent.EnterPairedMode -> {
                Log.i(TAG, "Entering paired mode")
                standaloneMonitorManager.cancelAll()
                stopAlarmIfPlaying()
                alarmEngine.reset()
                monitorState.value = monitorState.value.copy(
                    isActive = true,
                    isPairedMode = true,
                    anchorPosition = event.anchorPosition,
                    zone = event.zone,
                    alarmState = AlarmState.SAFE
                )
                startPairedGpsVerification(event.zone, event.anchorPosition, scope, monitorState)
                onUpdateNotification("Paired mode - monitoring via tablet", AlarmState.SAFE)
            }

            is PairedModeManager.PairedEvent.ExitPairedMode -> {
                Log.i(TAG, "Exiting paired mode")
                pairedGpsVerificationJob?.cancel()
                monitorState.value = monitorState.value.copy(
                    isPairedMode = false,
                    peerConnected = false
                )
            }

            is PairedModeManager.PairedEvent.AlarmTriggered -> {
                Log.w(TAG, "Paired alarm: ${event.reason} -> ${event.alarmState}")
                val pairedEvent = PairedAlarmEvent(event.reason, event.message, event.alarmState)
                val result = alarmHandler.handlePairedAlarm(pairedEvent, monitorState.value.alarmState, alarmPlayer.isPlaying())

                if (result.shouldStartAlarm) alarmPlayer.startAlarm()
                if (result.shouldStopAlarm) alarmPlayer.stopAlarm()
                if (result.shouldSendWearTrigger) {
                    scope.launch { wearDataSender.sendAlarmTrigger() }
                }

                monitorState.value = monitorState.value.copy(
                    alarmState = result.newAlarmState,
                    gpsSignalLost = result.gpsSignalLost
                )
                onUpdateNotification(result.notificationText, result.newAlarmState)
            }

            is PairedModeManager.PairedEvent.HeartbeatTimeout -> {
                Log.w(TAG, "Heartbeat timeout — switching to standalone fallback")
                triggerAlarmAndNotifyWear(scope)
                monitorState.value = monitorState.value.copy(
                    isPairedMode = false,
                    peerConnected = false,
                    alarmState = AlarmState.ALARM
                )
                onUpdateNotification("Connection lost with navigation station!", AlarmState.ALARM)
                pairedGpsVerificationJob?.cancel()
                pairedGpsVerificationJob = null
                val zone = monitorState.value.zone
                val anchorPos = monitorState.value.anchorPosition
                if (zone != null && anchorPos != null) {
                    standaloneMonitorManager.startStandaloneFallbackMonitoring(
                        zone, anchorPos, scope, monitorState, onUpdateNotification
                    )
                }
            }

            is PairedModeManager.PairedEvent.SessionEnded -> {
                Log.i(TAG, "Paired session ended: ${event.reason}")
                pairedGpsVerificationJob?.cancel()
                when (event.reason) {
                    "SESSION_ENDED" -> onStopMonitoring()
                    else -> {
                        monitorState.value = monitorState.value.copy(
                            isPairedMode = false,
                            peerConnected = false
                        )
                    }
                }
            }

            is PairedModeManager.PairedEvent.LowBatteryWarning -> {
                Log.w(TAG, "Peer low battery: ${event.level}")
                onUpdateNotification(
                    "Tablet battery low! (${(event.level * 100).toInt()}%)",
                    monitorState.value.alarmState
                )
            }
        }
    }

    private fun startPairedGpsVerification(
        zone: AnchorZone,
        anchorPosition: Position,
        scope: CoroutineScope,
        monitorState: MutableStateFlow<MonitorState>
    ) {
        pairedGpsVerificationJob?.cancel()
        pairedGpsVerificationJob = scope.launch {
            while (isActive) {
                delay(PAIRED_GPS_VERIFICATION_INTERVAL_MS)
                if (!monitorState.value.isPairedMode) break

                try {
                    locationProvider.locationUpdates(0).first().let { position ->
                        val distance = GeoCalculations.distanceMeters(position, anchorPosition)
                        val adjustedDistance = distance - position.accuracy
                        val zoneResult = if (adjustedDistance > zone.radiusMeters) {
                            GeoCalculations.checkZone(position, zone)
                        } else {
                            com.hiosdra.openanchor.domain.geometry.ZoneCheckResult.INSIDE
                        }
                        val alarmState = alarmEngine.processReading(zoneResult)

                        val battery = batteryProvider.getCurrentBatteryState()
                        val drift = monitorState.value.driftAnalysis

                        pairedModeManager.sendGpsReport(
                            position, distance, zoneResult, alarmState,
                            batteryLevel = battery?.level,
                            isCharging = battery?.isCharging,
                            driftDetected = drift?.isDragging,
                            driftBearingDeg = drift?.driftBearingDeg,
                            driftSpeedMps = drift?.driftSpeedMpm?.let { it / 60.0 }
                        )
                        Log.i(TAG, "GPS verification: dist=${distance}m, zone=$zoneResult, alarm=$alarmState")
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "GPS verification failed", e)
                }
            }
        }
    }

    fun stopServer() {
        webSocketLifecycleManager.stop()
    }

    override fun cancelAll() {
        super.cancelAll()
        pairedGpsVerificationJob?.cancel()
        pairedGpsVerificationJob = null
    }

    suspend fun sendDismissAlarm() {
        pairedModeManager.sendDismissAlarm()
    }

    suspend fun sendMuteAlarm() {
        pairedModeManager.sendMuteAlarm()
    }
}
