package com.hiosdra.openanchor.service

import android.app.*
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Binder
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.hiosdra.openanchor.MainActivity
import com.hiosdra.openanchor.data.repository.AnchorSessionRepository
import com.hiosdra.openanchor.domain.model.*
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import javax.inject.Inject

@AndroidEntryPoint
class AnchorMonitorService : Service() {

    companion object {
        private const val TAG = "AnchorMonitorService"
        const val CHANNEL_ID = "anchor_monitor"
        const val NOTIFICATION_ID = 1
        const val ACTION_START = "com.hiosdra.openanchor.START_MONITORING"
        const val ACTION_STOP = "com.hiosdra.openanchor.STOP_MONITORING"
        const val ACTION_START_SERVER = "com.hiosdra.openanchor.START_WS_SERVER"
        const val ACTION_STOP_SERVER = "com.hiosdra.openanchor.STOP_WS_SERVER"
        const val ACTION_START_CLIENT = "com.hiosdra.openanchor.START_WS_CLIENT"
        const val ACTION_STOP_CLIENT = "com.hiosdra.openanchor.STOP_WS_CLIENT"
        const val EXTRA_SESSION_ID = "session_id"
        const val EXTRA_WS_URL = "ws_url"

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

        fun startServerIntent(context: Context): Intent {
            return Intent(context, AnchorMonitorService::class.java).apply {
                action = ACTION_START_SERVER
            }
        }

        fun stopServerIntent(context: Context): Intent {
            return Intent(context, AnchorMonitorService::class.java).apply {
                action = ACTION_STOP_SERVER
            }
        }

        fun startClientIntent(context: Context, wsUrl: String): Intent {
            return Intent(context, AnchorMonitorService::class.java).apply {
                action = ACTION_START_CLIENT
                putExtra(EXTRA_WS_URL, wsUrl)
            }
        }

        fun stopClientIntent(context: Context): Intent {
            return Intent(context, AnchorMonitorService::class.java).apply {
                action = ACTION_STOP_CLIENT
            }
        }
    }

    @Inject lateinit var repository: AnchorSessionRepository
    @Inject lateinit var alarmPlayer: AlarmPlayer
    @Inject lateinit var alarmEngine: AlarmEngine
    @Inject lateinit var wearDataSender: WearDataSender
    @Inject lateinit var gpsProcessor: GpsProcessor
    @Inject lateinit var standaloneMonitorManager: StandaloneMonitorManager
    @Inject lateinit var batteryMonitorManager: BatteryMonitorManager
    @Inject lateinit var pairedModeOrchestrator: PairedModeOrchestrator
    @Inject lateinit var clientModeOrchestrator: ClientModeOrchestrator

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

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
            ACTION_START_SERVER -> {
                startWebSocketServer()
            }
            ACTION_STOP_SERVER -> {
                stopWebSocketServer()
            }
            ACTION_START_CLIENT -> {
                val wsUrl = intent.getStringExtra(EXTRA_WS_URL)
                if (wsUrl != null) {
                    startClientMode(wsUrl)
                }
            }
            ACTION_STOP_CLIENT -> {
                stopClientMode()
            }
        }
        return START_STICKY
    }

    // ═══════════════════════════════════════
    // Standalone Mode Monitoring
    // ═══════════════════════════════════════

    private fun startMonitoring(sessionId: Long) {
        val notification = buildNotification("Monitoring anchor position...", AlarmState.SAFE)
        startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)

        standaloneMonitorManager.startMonitoring(sessionId, serviceScope, _monitorState, ::updateNotification)
        batteryMonitorManager.startBatteryMonitoring(serviceScope, _monitorState, ::updateNotification)
    }

    // ═══════════════════════════════════════
    // WebSocket Server (Paired Mode)
    // ═══════════════════════════════════════

    private fun startWebSocketServer() {
        val notification = buildNotification("WebSocket server running...", AlarmState.SAFE)
        startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)

        pairedModeOrchestrator.startServer(serviceScope)
        pairedModeOrchestrator.startEventCollection(serviceScope, _monitorState, ::updateNotification, ::stopMonitoring)
    }

    private fun stopWebSocketServer() {
        pairedModeOrchestrator.cancelAll()
        resetAlarmAndMonitors()
        pairedModeOrchestrator.stopServer()
        _monitorState.value = MonitorState()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    // ═══════════════════════════════════════
    // WebSocket Client (Client Mode)
    // ═══════════════════════════════════════

    private fun startClientMode(wsUrl: String) {
        val notification = buildNotification("Connecting to server...", AlarmState.SAFE)
        startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)

        clientModeOrchestrator.startClientMode(wsUrl, serviceScope, _monitorState, ::updateNotification, ::muteAlarm, ::dismissAlarm)
        batteryMonitorManager.startBatteryMonitoring(serviceScope, _monitorState, ::updateNotification)
    }

    private fun stopClientMode() {
        clientModeOrchestrator.cancelAll()
        resetAlarmAndMonitors()
        clientModeOrchestrator.disconnect("USER_DISCONNECT")
        _monitorState.value = MonitorState()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    // ═══════════════════════════════════════
    // Control Methods
    // ═══════════════════════════════════════

    /**
     * Common cleanup: cancel background monitors and reset alarm state.
     */
    private fun resetAlarmAndMonitors() {
        standaloneMonitorManager.cancelAll()
        batteryMonitorManager.cancelAll()
        alarmEngine.reset()
        alarmPlayer.stopAlarm()
    }

    fun stopMonitoring() {
        val wasPairedMode = _monitorState.value.isPairedMode

        pairedModeOrchestrator.cancelAll()
        clientModeOrchestrator.cancelAll()
        resetAlarmAndMonitors()

        if (wasPairedMode) {
            pairedModeOrchestrator.stopServer()
        }
        if (_monitorState.value.isClientMode) {
            clientModeOrchestrator.disconnect("SESSION_ENDED")
        }

        serviceScope.launch {
            try {
                val sessionId = _monitorState.value.sessionId
                if (sessionId != null) {
                    val session = repository.getSessionById(sessionId)
                    session?.let {
                        repository.updateSession(it.copy(
                            endTime = System.currentTimeMillis(),
                            maxDistanceMeters = gpsProcessor.getSessionMaxDistance(),
                            maxSog = gpsProcessor.getSessionMaxSog()
                        ))
                    }
                }
                gpsProcessor.reset()
                _monitorState.value = MonitorState()
                wearDataSender.clearMonitorState()
            } finally {
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
            }
        }
    }

    fun dismissAlarm() {
        alarmPlayer.stopAlarm()
        alarmEngine.reset()
        if (_monitorState.value.isPairedMode) {
            serviceScope.launch { pairedModeOrchestrator.sendDismissAlarm() }
        }
        _monitorState.value = _monitorState.value.copy(alarmState = AlarmState.SAFE)
    }

    /**
     * Mute the alarm sound but keep monitoring.
     * The alarm will re-trigger if a new violation occurs.
     * Does NOT reset the AlarmEngine violation counter.
     */
    fun muteAlarm() {
        alarmPlayer.stopAlarm()
        if (_monitorState.value.isPairedMode) {
            serviceScope.launch { pairedModeOrchestrator.sendMuteAlarm() }
        }
    }

    // ═══════════════════════════════════════
    // Notifications
    // ═══════════════════════════════════════

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
        val state = _monitorState.value
        when {
            state.isPairedMode -> {
                pairedModeOrchestrator.cancelAll()
                pairedModeOrchestrator.stopServer()
            }
            state.isClientMode -> {
                clientModeOrchestrator.cancelAll()
                clientModeOrchestrator.disconnect("SERVICE_DESTROYED")
            }
            else -> {
                standaloneMonitorManager.cancelAll()
            }
        }
        batteryMonitorManager.cancelAll()
        serviceScope.cancel()
        alarmPlayer.stopAlarm()
        stopForeground(STOP_FOREGROUND_REMOVE)
        super.onDestroy()
    }
}
