package com.hiosdra.openanchor.service

import android.util.Log
import com.hiosdra.openanchor.data.location.LocationProvider
import com.hiosdra.openanchor.data.preferences.PreferencesManager
import com.hiosdra.openanchor.data.repository.AnchorSessionRepository
import com.hiosdra.openanchor.domain.geometry.GeoCalculations
import com.hiosdra.openanchor.domain.model.*
import java.util.concurrent.atomic.AtomicLong
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import javax.inject.Inject

class StandaloneMonitorManager @Inject constructor(
    private val locationProvider: LocationProvider,
    private val repository: AnchorSessionRepository,
    private val preferencesManager: PreferencesManager,
    private val gpsProcessor: GpsProcessor,
    private val alarmHandler: AlarmHandler,
    private val alarmPlayer: AlarmPlayer,
    private val alarmEngine: AlarmEngine,
    private val wearDataSender: WearDataSender
) {
    companion object {
        private const val TAG = "StandaloneMonitorMgr"
        private const val GPS_WATCHDOG_TIMEOUT_MS = 60_000L
        private const val GPS_WATCHDOG_CHECK_INTERVAL_MS = 10_000L
        private const val DB_WRITE_INTERVAL_MS = 5_000L
    }

    private var monitoringJob: Job? = null
    private var gpsWatchdogJob: Job? = null
    private val lastGpsFixTime = AtomicLong(System.currentTimeMillis())
    private var lastDbWriteTime: Long = 0L

    fun startMonitoring(
        sessionId: Long,
        scope: CoroutineScope,
        monitorState: MutableStateFlow<MonitorState>,
        onUpdateNotification: (String, AlarmState) -> Unit
    ) {
        monitoringJob?.cancel()
        monitoringJob = scope.launch {
            val session = repository.getSessionById(sessionId) ?: return@launch
            val zone = session.zone
            lastDbWriteTime = 0L

            monitorState.value = MonitorState(
                isActive = true,
                sessionId = sessionId,
                anchorPosition = session.anchorPosition,
                zone = zone,
                alarmState = AlarmState.SAFE
            )

            val intervalMs = preferencesManager.preferences.first().gpsIntervalSeconds * 1000L

            startGpsWatchdog(scope, monitorState, onUpdateNotification)

            locationProvider.locationUpdates(intervalMs).collect { position ->
                if (monitorState.value.isPairedMode) return@collect

                lastGpsFixTime.set(System.currentTimeMillis())
                val result = gpsProcessor.processPosition(position, session.anchorPosition, zone, sessionId)

                // Throttle DB writes: every 5s or on alarm state changes
                val now = System.currentTimeMillis()
                val alarmStateChanged = result.alarmState != monitorState.value.alarmState
                if (now - lastDbWriteTime > DB_WRITE_INTERVAL_MS || alarmStateChanged) {
                    repository.insertTrackPoint(result.trackPoint)
                    lastDbWriteTime = now
                }

                val previousAlarmState = monitorState.value.alarmState
                val transition = alarmHandler.handleAlarmTransition(result.alarmState, previousAlarmState, alarmPlayer.isPlaying())
                if (transition.shouldStartAlarm) {
                    alarmPlayer.startAlarm()
                    if (transition.shouldIncrementAlarmCount) {
                        val currentSession = repository.getSessionById(sessionId)
                        currentSession?.let {
                            repository.updateSession(it.copy(alarmTriggered = true, alarmCount = it.alarmCount + 1))
                        }
                    }
                }
                if (transition.shouldStopAlarm) alarmPlayer.stopAlarm()
                if (transition.shouldSendWearTrigger) {
                    scope.launch { wearDataSender.sendAlarmTrigger() }
                }

                monitorState.value = monitorState.value.copy(
                    boatPosition = position,
                    distanceToAnchor = result.distance,
                    alarmState = result.alarmState,
                    gpsAccuracyMeters = position.accuracy,
                    gpsSignalLost = false,
                    driftAnalysis = result.driftAnalysis
                )

                scope.launch { wearDataSender.sendMonitorState(monitorState.value) }

                val notifText = "Distance: %.0f m - %s".format(result.distance, result.alarmState.name)
                onUpdateNotification(notifText, result.alarmState)
            }
        }
    }

    private suspend fun handleAlarmTransition(
        alarmState: AlarmState,
        previousAlarmState: AlarmState,
        sessionId: Long,
        scope: CoroutineScope
    ) {
        val transition = alarmHandler.handleAlarmTransition(alarmState, previousAlarmState, alarmPlayer.isPlaying())
        if (transition.shouldStartAlarm) {
            alarmPlayer.startAlarm()
            if (transition.shouldIncrementAlarmCount) {
                val currentSession = repository.getSessionById(sessionId)
                currentSession?.let {
                    repository.updateSession(it.copy(alarmTriggered = true, alarmCount = it.alarmCount + 1))
                }
            }
        }
        if (transition.shouldStopAlarm) alarmPlayer.stopAlarm()
        if (transition.shouldSendWearTrigger) {
            scope.launch { wearDataSender.sendAlarmTrigger() }
        }
    }

    fun startGpsWatchdog(
        scope: CoroutineScope,
        monitorState: MutableStateFlow<MonitorState>,
        onUpdateNotification: (String, AlarmState) -> Unit
    ) {
        gpsWatchdogJob?.cancel()
        gpsWatchdogJob = scope.launch {
            while (isActive) {
                delay(GPS_WATCHDOG_CHECK_INTERVAL_MS)
                val elapsed = System.currentTimeMillis() - lastGpsFixTime.get()
                val signalLost = elapsed > GPS_WATCHDOG_TIMEOUT_MS
                if (signalLost != monitorState.value.gpsSignalLost) {
                    monitorState.value = monitorState.value.copy(gpsSignalLost = signalLost)
                    scope.launch { wearDataSender.sendMonitorState(monitorState.value) }
                    if (signalLost) {
                        onUpdateNotification("GPS signal lost!", monitorState.value.alarmState)
                    }
                }
            }
        }
    }

    fun startStandaloneFallbackMonitoring(
        zone: AnchorZone,
        anchorPosition: Position,
        scope: CoroutineScope,
        monitorState: MutableStateFlow<MonitorState>,
        onUpdateNotification: (String, AlarmState) -> Unit
    ) {
        monitoringJob?.cancel()
        monitoringJob = scope.launch {
            val intervalMs = preferencesManager.preferences.first().gpsIntervalSeconds * 1000L
            lastGpsFixTime.set(System.currentTimeMillis())
            startGpsWatchdog(scope, monitorState, onUpdateNotification)

            locationProvider.locationUpdates(intervalMs).collect { position ->
                if (monitorState.value.isPairedMode) return@collect

                lastGpsFixTime.set(System.currentTimeMillis())
                val distance = GeoCalculations.distanceMeters(position, anchorPosition)
                val zoneResult = GeoCalculations.checkZone(position, zone)
                val alarmState = alarmEngine.processReading(zoneResult)

                val previousAlarmState = monitorState.value.alarmState
                handleAlarmTransition(alarmState, previousAlarmState, monitorState.value.sessionId ?: -1, scope)

                monitorState.value = monitorState.value.copy(
                    boatPosition = position,
                    distanceToAnchor = distance,
                    alarmState = alarmState,
                    gpsAccuracyMeters = position.accuracy,
                    gpsSignalLost = false
                )

                scope.launch { wearDataSender.sendMonitorState(monitorState.value) }
                val notifText = "FALLBACK: %.0f m - %s".format(distance, alarmState.name)
                onUpdateNotification(notifText, alarmState)
            }
        }
    }

    fun resetGpsFixTime() {
        lastGpsFixTime.set(System.currentTimeMillis())
    }

    fun updateLastGpsFixTime() {
        lastGpsFixTime.set(System.currentTimeMillis())
    }

    fun cancelMonitoringJob() {
        monitoringJob?.cancel()
        monitoringJob = null
    }

    fun cancelAll() {
        monitoringJob?.cancel()
        monitoringJob = null
        gpsWatchdogJob?.cancel()
        gpsWatchdogJob = null
    }
}
