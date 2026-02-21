package com.hiosdra.openanchor.service

import android.app.*
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Binder
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.hiosdra.openanchor.MainActivity
import com.hiosdra.openanchor.R
import com.hiosdra.openanchor.data.location.LocationProvider
import com.hiosdra.openanchor.data.preferences.PreferencesManager
import com.hiosdra.openanchor.data.repository.AnchorSessionRepository
import com.hiosdra.openanchor.domain.geometry.GeoCalculations
import com.hiosdra.openanchor.domain.model.*
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import javax.inject.Inject

@AndroidEntryPoint
class AnchorMonitorService : Service() {

    companion object {
        const val CHANNEL_ID = "anchor_monitor"
        const val NOTIFICATION_ID = 1
        const val ACTION_START = "com.hiosdra.openanchor.START_MONITORING"
        const val ACTION_STOP = "com.hiosdra.openanchor.STOP_MONITORING"
        const val EXTRA_SESSION_ID = "session_id"
        private const val GPS_WATCHDOG_TIMEOUT_MS = 60_000L
        private const val GPS_WATCHDOG_CHECK_INTERVAL_MS = 10_000L

        fun startIntent(context: Context, sessionId: Long): Intent {
            return Intent(context, AnchorMonitorService::class.java).apply {
                action = ACTION_START
                putExtra(EXTRA_SESSION_ID, sessionId)
            }
        }

        fun stopIntent(context: Context): Intent {
            return Intent(context, AnchorMonitorService::class.java).apply {
                action = ACTION_STOP
            }
        }
    }

    @Inject lateinit var locationProvider: LocationProvider
    @Inject lateinit var repository: AnchorSessionRepository
    @Inject lateinit var preferencesManager: PreferencesManager
    @Inject lateinit var alarmPlayer: AlarmPlayer
    @Inject lateinit var alarmEngine: AlarmEngine
    @Inject lateinit var wearDataSender: WearDataSender

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private var monitoringJob: Job? = null
    private var gpsWatchdogJob: Job? = null
    private var lastGpsFixTime: Long = System.currentTimeMillis()

    private val _monitorState = MutableStateFlow(MonitorState())
    val monitorState: StateFlow<MonitorState> = _monitorState.asStateFlow()

    private val binder = LocalBinder()

    inner class LocalBinder : Binder() {
        fun getService(): AnchorMonitorService = this@AnchorMonitorService
    }

    override fun onBind(intent: Intent?): IBinder = binder

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                val sessionId = intent.getLongExtra(EXTRA_SESSION_ID, -1)
                if (sessionId != -1L) {
                    startMonitoring(sessionId)
                }
            }
            ACTION_STOP -> {
                stopMonitoring()
            }
        }
        return START_STICKY
    }

    private fun startMonitoring(sessionId: Long) {
        val notification = buildNotification("Monitoring anchor position...", AlarmState.SAFE)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        monitoringJob?.cancel()
        monitoringJob = serviceScope.launch {
            val session = repository.getSessionById(sessionId) ?: return@launch
            val zone = session.zone

            _monitorState.value = MonitorState(
                isActive = true,
                sessionId = sessionId,
                anchorPosition = session.anchorPosition,
                zone = zone,
                alarmState = AlarmState.SAFE
            )

            val intervalMs = preferencesManager.preferences.first().gpsIntervalSeconds * 1000L

            // Start GPS watchdog
            startGpsWatchdog()

            locationProvider.locationUpdates(intervalMs).collect { position ->
                lastGpsFixTime = System.currentTimeMillis()
                val distance = GeoCalculations.distanceMeters(position, session.anchorPosition)
                val zoneResult = GeoCalculations.checkZone(position, zone)
                val alarmState = alarmEngine.processReading(zoneResult)

                // Save track point
                repository.insertTrackPoint(
                    TrackPoint(
                        sessionId = sessionId,
                        position = position,
                        distanceToAnchor = distance.toFloat(),
                        isAlarm = alarmState == AlarmState.ALARM
                    )
                )

                // Handle alarm
                val previousAlarmState = _monitorState.value.alarmState
                when (alarmState) {
                    AlarmState.ALARM -> {
                        if (!alarmPlayer.isPlaying()) {
                            alarmPlayer.startAlarm()
                            // Update session alarm count
                            val currentSession = repository.getSessionById(sessionId)
                            currentSession?.let {
                                repository.updateSession(
                                    it.copy(
                                        alarmTriggered = true,
                                        alarmCount = it.alarmCount + 1
                                    )
                                )
                            }
                        }
                        // Send vibration trigger to watch on transition to ALARM
                        if (previousAlarmState != AlarmState.ALARM) {
                            serviceScope.launch { wearDataSender.sendAlarmTrigger() }
                        }
                    }
                    else -> {
                        if (alarmPlayer.isPlaying()) {
                            alarmPlayer.stopAlarm()
                        }
                    }
                }

                // Update state
                _monitorState.value = _monitorState.value.copy(
                    boatPosition = position,
                    distanceToAnchor = distance,
                    alarmState = alarmState,
                    gpsAccuracyMeters = position.accuracy,
                    gpsSignalLost = false
                )

                // Send state to watch
                serviceScope.launch { wearDataSender.sendMonitorState(_monitorState.value) }

                // Update notification
                val notifText = "Distance: %.0f m - %s".format(distance, alarmState.name)
                updateNotification(notifText, alarmState)
            }
        }
    }

    private fun startGpsWatchdog() {
        gpsWatchdogJob?.cancel()
        gpsWatchdogJob = serviceScope.launch {
            while (isActive) {
                delay(GPS_WATCHDOG_CHECK_INTERVAL_MS)
                val elapsed = System.currentTimeMillis() - lastGpsFixTime
                val signalLost = elapsed > GPS_WATCHDOG_TIMEOUT_MS
                if (signalLost != _monitorState.value.gpsSignalLost) {
                    _monitorState.value = _monitorState.value.copy(gpsSignalLost = signalLost)
                    // Send updated state to watch
                    serviceScope.launch { wearDataSender.sendMonitorState(_monitorState.value) }
                    if (signalLost) {
                        updateNotification("GPS signal lost!", _monitorState.value.alarmState)
                    }
                }
            }
        }
    }

    fun stopMonitoring() {
        monitoringJob?.cancel()
        monitoringJob = null
        gpsWatchdogJob?.cancel()
        gpsWatchdogJob = null
        alarmEngine.reset()
        alarmPlayer.stopAlarm()

        serviceScope.launch {
            val sessionId = _monitorState.value.sessionId
            if (sessionId != null) {
                val session = repository.getSessionById(sessionId)
                session?.let {
                    repository.updateSession(it.copy(endTime = System.currentTimeMillis()))
                }
            }
            _monitorState.value = MonitorState()
            // Notify watch that monitoring stopped
            wearDataSender.clearMonitorState()
        }

        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    fun dismissAlarm() {
        alarmPlayer.stopAlarm()
        alarmEngine.reset()
    }

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Anchor Monitoring",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Shows anchor monitoring status"
            setShowBadge(true)
        }
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(channel)
    }

    private fun buildNotification(text: String, alarmState: AlarmState): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val stopIntent = PendingIntent.getService(
            this,
            1,
            stopIntent(this),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val priority = when (alarmState) {
            AlarmState.ALARM -> NotificationCompat.PRIORITY_MAX
            AlarmState.WARNING -> NotificationCompat.PRIORITY_HIGH
            AlarmState.CAUTION -> NotificationCompat.PRIORITY_DEFAULT
            AlarmState.SAFE -> NotificationCompat.PRIORITY_LOW
        }

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("OpenAnchor")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentIntent(pendingIntent)
            .addAction(android.R.drawable.ic_media_pause, "Stop", stopIntent)
            .setPriority(priority)
            .setOngoing(true)
            .setSilent(alarmState == AlarmState.SAFE || alarmState == AlarmState.CAUTION)
            .build()
    }

    private fun updateNotification(text: String, alarmState: AlarmState) {
        val notification = buildNotification(text, alarmState)
        val manager = getSystemService(NotificationManager::class.java)
        manager.notify(NOTIFICATION_ID, notification)
    }

    override fun onDestroy() {
        serviceScope.cancel()
        alarmPlayer.stopAlarm()
        super.onDestroy()
    }
}
