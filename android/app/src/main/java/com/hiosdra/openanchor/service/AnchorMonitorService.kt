package com.hiosdra.openanchor.service

import android.app.*
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Binder
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.hiosdra.openanchor.MainActivity
import com.hiosdra.openanchor.R
import com.hiosdra.openanchor.data.location.LocationProvider
import com.hiosdra.openanchor.data.preferences.PreferencesManager
import com.hiosdra.openanchor.data.repository.AnchorSessionRepository
import com.hiosdra.openanchor.data.battery.BatteryProvider
import com.hiosdra.openanchor.domain.drift.DriftDetector
import com.hiosdra.openanchor.domain.geometry.GeoCalculations
import com.hiosdra.openanchor.domain.model.*
import com.hiosdra.openanchor.network.AnchorWebSocketServer
import com.hiosdra.openanchor.network.AnchorWebSocketClient
import com.hiosdra.openanchor.network.ClientModeManager
import com.hiosdra.openanchor.network.HotspotManager
import com.hiosdra.openanchor.network.PairedModeManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import java.util.Collections
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
        private const val GPS_WATCHDOG_TIMEOUT_MS = 60_000L
        private const val GPS_WATCHDOG_CHECK_INTERVAL_MS = 10_000L
        private const val PAIRED_GPS_VERIFICATION_INTERVAL_MS = 10 * 60 * 1000L // 10 min
        private const val CLIENT_STATE_UPDATE_INTERVAL_MS = 2_000L

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

    @Inject lateinit var locationProvider: LocationProvider
    @Inject lateinit var repository: AnchorSessionRepository
    @Inject lateinit var preferencesManager: PreferencesManager
    @Inject lateinit var alarmPlayer: AlarmPlayer
    @Inject lateinit var alarmEngine: AlarmEngine
    @Inject lateinit var wearDataSender: WearDataSender
    @Inject lateinit var wsServer: AnchorWebSocketServer
    @Inject lateinit var hotspotManager: HotspotManager
    @Inject lateinit var pairedModeManager: PairedModeManager
    @Inject lateinit var batteryProvider: BatteryProvider
    @Inject lateinit var driftDetector: DriftDetector
    @Inject lateinit var wsClient: AnchorWebSocketClient
    @Inject lateinit var clientModeManager: ClientModeManager

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private var monitoringJob: Job? = null
    private var gpsWatchdogJob: Job? = null
    private var pairedModeEventJob: Job? = null
    private var pairedGpsVerificationJob: Job? = null
    private var batteryMonitorJob: Job? = null
    private var clientModeJob: Job? = null
    private var clientStateUpdateJob: Job? = null
    private var clientEventJob: Job? = null
    private var lastGpsFixTime: Long = System.currentTimeMillis()
    /** Ring buffer of recent track points for drift detection (last 30) */
    private val recentTrackPoints = Collections.synchronizedList(mutableListOf<com.hiosdra.openanchor.domain.model.TrackPoint>())
    private var previousPosition: Position? = null
    private var previousPositionTime: Long = 0L
    private var sessionMaxDistance: Double = 0.0
    private var sessionMaxSog: Double = 0.0

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

            // Start battery monitoring
            startBatteryMonitoring()

            locationProvider.locationUpdates(intervalMs).collect { position ->
                // In paired mode, skip standalone GPS processing
                if (_monitorState.value.isPairedMode) return@collect

                lastGpsFixTime = System.currentTimeMillis()
                val distance = GeoCalculations.distanceMeters(position, session.anchorPosition)
                val zoneResult = GeoCalculations.checkZone(position, zone)
                val alarmState = alarmEngine.processReading(zoneResult)

                // Compute SOG from consecutive positions (knots)
                var currentSog = 0.0
                val prevPos = previousPosition
                val prevTime = previousPositionTime
                if (prevPos != null && prevTime > 0L) {
                    val dtSeconds = (position.timestamp - prevTime) / 1000.0
                    if (dtSeconds > 0.5) {
                        val distBetween = GeoCalculations.distanceMeters(prevPos, position)
                        currentSog = distBetween / dtSeconds * 1.94384 // m/s → knots
                    }
                }
                previousPosition = position
                previousPositionTime = position.timestamp

                // Track session max values
                if (distance > sessionMaxDistance) sessionMaxDistance = distance
                if (currentSog > sessionMaxSog) sessionMaxSog = currentSog

                // Save track point with unified alarmState string
                val trackPoint = TrackPoint(
                    sessionId = sessionId,
                    position = position,
                    distanceToAnchor = distance.toFloat(),
                    isAlarm = alarmState == AlarmState.ALARM,
                    alarmState = alarmState.name
                )
                repository.insertTrackPoint(trackPoint)

                // Drift detection (Faza 4.5)
                recentTrackPoints.add(trackPoint)
                if (recentTrackPoints.size > 30) recentTrackPoints.removeAt(0)
                // Create snapshot for thread-safe iteration
                val trackPointsSnapshot = synchronized(recentTrackPoints) { recentTrackPoints.toList() }
                val driftAnalysis = driftDetector.analyze(trackPointsSnapshot, session.anchorPosition)

                // Handle alarm
                val previousAlarmState = _monitorState.value.alarmState
                handleAlarmTransition(alarmState, previousAlarmState, sessionId)

                // Update state
                _monitorState.value = _monitorState.value.copy(
                    boatPosition = position,
                    distanceToAnchor = distance,
                    alarmState = alarmState,
                    gpsAccuracyMeters = position.accuracy,
                    gpsSignalLost = false,
                    driftAnalysis = driftAnalysis
                )

                // Send state to watch
                serviceScope.launch { wearDataSender.sendMonitorState(_monitorState.value) }

                // Update notification
                val notifText = "Distance: %.0f m - %s".format(distance, alarmState.name)
                updateNotification(notifText, alarmState)
            }
        }
    }

    private suspend fun handleAlarmTransition(
        alarmState: AlarmState,
        previousAlarmState: AlarmState,
        sessionId: Long
    ) {
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
    }

    private fun startBatteryMonitoring() {
        batteryMonitorJob?.cancel()
        batteryMonitorJob = serviceScope.launch {
            batteryProvider.batteryUpdates().collect { battery ->
                _monitorState.value = _monitorState.value.copy(
                    localBatteryLevel = battery.level,
                    localBatteryCharging = battery.isCharging
                )
                // Alert if low battery
                if (battery.level in 1..BatteryProvider.LOW_BATTERY_THRESHOLD && !battery.isCharging) {
                    updateNotification(
                        "Low battery (${battery.level}%) — monitoring continues",
                        _monitorState.value.alarmState
                    )
                }
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
                    serviceScope.launch { wearDataSender.sendMonitorState(_monitorState.value) }
                    if (signalLost) {
                        updateNotification("GPS signal lost!", _monitorState.value.alarmState)
                    }
                }
            }
        }
    }

    // ═══════════════════════════════════════
    // WebSocket Server (Paired Mode)
    // ═══════════════════════════════════════

    private fun startWebSocketServer() {
        val notification = buildNotification("WebSocket server running...", AlarmState.SAFE)

        startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)

        wsServer.start(scope = serviceScope)
        pairedModeManager.startListening(serviceScope)
        startPairedModeEventCollection()
    }

    private fun stopWebSocketServer() {
        pairedModeEventJob?.cancel()
        pairedModeEventJob = null
        pairedGpsVerificationJob?.cancel()
        pairedGpsVerificationJob = null
        monitoringJob?.cancel()
        monitoringJob = null
        gpsWatchdogJob?.cancel()
        gpsWatchdogJob = null
        batteryMonitorJob?.cancel()
        batteryMonitorJob = null
        alarmEngine.reset()
        alarmPlayer.stopAlarm()
        pairedModeManager.stopListening()
        wsServer.stop()
        _monitorState.value = MonitorState()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun startPairedModeEventCollection() {
        pairedModeEventJob?.cancel()
        pairedModeEventJob = serviceScope.launch {
            // Collect paired mode events
            launch {
                pairedModeManager.events.collect { event ->
                    handlePairedEvent(event)
                }
            }

            // Mirror paired state to monitor state
            launch {
                pairedModeManager.pairedState.collect { pairedState ->
                    if (pairedState.isPaired) {
                        _monitorState.value = _monitorState.value.copy(
                            isPairedMode = true,
                            peerConnected = pairedState.peerConnected,
                            anchorPosition = pairedState.anchorPosition ?: _monitorState.value.anchorPosition,
                            zone = pairedState.zone ?: _monitorState.value.zone,
                            boatPosition = pairedState.peerBoatPosition ?: _monitorState.value.boatPosition,
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

    private suspend fun handlePairedEvent(event: PairedModeManager.PairedEvent) {
        when (event) {
            is PairedModeManager.PairedEvent.EnterPairedMode -> {
                Log.i(TAG, "Entering paired mode")
                // Cancel any standalone fallback monitoring that may be running
                monitoringJob?.cancel()
                monitoringJob = null
                // Dismiss connection-loss alarm if active
                if (alarmPlayer.isPlaying()) alarmPlayer.stopAlarm()
                alarmEngine.reset()
                _monitorState.value = _monitorState.value.copy(
                    isActive = true,
                    isPairedMode = true,
                    anchorPosition = event.anchorPosition,
                    zone = event.zone,
                    alarmState = AlarmState.SAFE
                )
                // Start periodic GPS verification
                startPairedGpsVerification(event.zone, event.anchorPosition)
                updateNotification("Paired mode - monitoring via tablet", AlarmState.SAFE)
            }

            is PairedModeManager.PairedEvent.ExitPairedMode -> {
                Log.i(TAG, "Exiting paired mode")
                pairedGpsVerificationJob?.cancel()
                _monitorState.value = _monitorState.value.copy(
                    isPairedMode = false,
                    peerConnected = false
                )
            }

            is PairedModeManager.PairedEvent.AlarmTriggered -> {
                Log.w(TAG, "Paired alarm: ${event.reason} -> ${event.alarmState}")
                val previousState = _monitorState.value.alarmState
                val newState = event.alarmState

                when (event.reason) {
                    "GPS_LOST" -> {
                        // PWA lost GPS — alert crew, always sound alarm
                        if (!alarmPlayer.isPlaying()) alarmPlayer.startAlarm()
                        serviceScope.launch { wearDataSender.sendAlarmTrigger() }
                        _monitorState.value = _monitorState.value.copy(
                            alarmState = AlarmState.ALARM,
                            gpsSignalLost = true
                        )
                        updateNotification("GPS lost on navigation station!", AlarmState.ALARM)
                        return
                    }
                    "LOW_BATTERY" -> {
                        // PWA low battery — alert crew
                        if (!alarmPlayer.isPlaying()) alarmPlayer.startAlarm()
                        serviceScope.launch { wearDataSender.sendAlarmTrigger() }
                        _monitorState.value = _monitorState.value.copy(alarmState = AlarmState.WARNING)
                        updateNotification("Tablet battery critical! ${event.message}", AlarmState.WARNING)
                        return
                    }
                    "WATCH_TIMER" -> {
                        // Crew watch timer expired — wake up the crew
                        if (!alarmPlayer.isPlaying()) alarmPlayer.startAlarm()
                        serviceScope.launch { wearDataSender.sendAlarmTrigger() }
                        updateNotification("Watch timer: ${event.message}", _monitorState.value.alarmState)
                        return
                    }
                }

                // Default: zone-based alarm (OUT_OF_ZONE etc.)
                when (newState) {
                    AlarmState.ALARM -> {
                        if (!alarmPlayer.isPlaying()) {
                            alarmPlayer.startAlarm()
                        }
                        if (previousState != AlarmState.ALARM) {
                            serviceScope.launch { wearDataSender.sendAlarmTrigger() }
                        }
                    }
                    AlarmState.WARNING -> {
                        // Vibration-only warning
                        if (alarmPlayer.isPlaying()) alarmPlayer.stopAlarm()
                    }
                    else -> {
                        if (alarmPlayer.isPlaying()) alarmPlayer.stopAlarm()
                    }
                }

                _monitorState.value = _monitorState.value.copy(alarmState = newState)
                updateNotification("ALARM: ${event.message}", newState)
            }

            is PairedModeManager.PairedEvent.HeartbeatTimeout -> {
                Log.w(TAG, "Heartbeat timeout — switching to standalone fallback")
                // Trigger connection lost alarm
                alarmPlayer.startAlarm()
                serviceScope.launch { wearDataSender.sendAlarmTrigger() }
                _monitorState.value = _monitorState.value.copy(
                    isPairedMode = false,
                    peerConnected = false,
                    alarmState = AlarmState.ALARM
                )
                updateNotification("Connection lost with navigation station!", AlarmState.ALARM)
                // Cancel paired GPS verification (will be replaced by continuous monitoring)
                pairedGpsVerificationJob?.cancel()
                pairedGpsVerificationJob = null
                // Start continuous standalone GPS monitoring as safety fallback
                val zone = _monitorState.value.zone
                val anchorPos = _monitorState.value.anchorPosition
                if (zone != null && anchorPos != null) {
                    startStandaloneFallbackMonitoring(zone, anchorPos)
                }
            }

            is PairedModeManager.PairedEvent.SessionEnded -> {
                Log.i(TAG, "Paired session ended: ${event.reason}")
                pairedGpsVerificationJob?.cancel()
                when (event.reason) {
                    "SESSION_ENDED" -> {
                        // Anchor weighed — stop everything
                        stopMonitoring()
                    }
                    else -> {
                        // User disconnect — keep standalone if anchor is still deployed
                        _monitorState.value = _monitorState.value.copy(
                            isPairedMode = false,
                            peerConnected = false
                        )
                    }
                }
            }

            is PairedModeManager.PairedEvent.LowBatteryWarning -> {
                Log.w(TAG, "Peer low battery: ${event.level}")
                updateNotification(
                    "Tablet battery low! (${(event.level * 100).toInt()}%)",
                    _monitorState.value.alarmState
                )
            }
        }
    }

    /**
     * Periodic GPS verification in paired mode (~10 min interval).
     * Uses phone GPS to cross-check the anchor zone.
     */
    private fun startPairedGpsVerification(zone: AnchorZone, anchorPosition: Position) {
        pairedGpsVerificationJob?.cancel()
        pairedGpsVerificationJob = serviceScope.launch {
            while (isActive) {
                delay(PAIRED_GPS_VERIFICATION_INTERVAL_MS)
                if (!_monitorState.value.isPairedMode) break

                try {
                    // Get a single GPS fix
                    locationProvider.locationUpdates(0).first().let { position ->
                        val distance = GeoCalculations.distanceMeters(position, anchorPosition)
                        val adjustedDistance = distance - position.accuracy
                        val zoneResult = if (adjustedDistance > zone.radiusMeters) {
                            GeoCalculations.checkZone(position, zone)
                        } else {
                            com.hiosdra.openanchor.domain.geometry.ZoneCheckResult.INSIDE
                        }
                        val alarmState = alarmEngine.processReading(zoneResult)

                        // Collect battery + drift info
                        val battery = batteryProvider.getCurrentBatteryState()
                        val drift = _monitorState.value.driftAnalysis

                        // Report to PWA with battery/drift
                        pairedModeManager.sendGpsReport(
                            position, distance, zoneResult, alarmState,
                            batteryLevel = battery?.level,
                            isCharging = battery?.isCharging,
                            driftDetected = drift?.isDragging,
                            driftBearingDeg = drift?.driftBearingDeg,
                            driftSpeedMps = drift?.driftSpeedMpm?.let { it / 60.0 } // m/min → m/s
                        )
                        Log.i(TAG, "GPS verification: dist=${distance}m, zone=$zoneResult, alarm=$alarmState")
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "GPS verification failed", e)
                }
            }
        }
    }

    /**
     * Start continuous GPS monitoring as a fallback after heartbeat timeout in paired mode.
     * Uses the zone received from the last FULL_SYNC to perform standalone zone checks.
     */
    private fun startStandaloneFallbackMonitoring(zone: AnchorZone, anchorPosition: Position) {
        monitoringJob?.cancel()
        monitoringJob = serviceScope.launch {
            val intervalMs = preferencesManager.preferences.first().gpsIntervalSeconds * 1000L
            lastGpsFixTime = System.currentTimeMillis()
            startGpsWatchdog()

            locationProvider.locationUpdates(intervalMs).collect { position ->
                // If we're back in paired mode (reconnected), stop standalone processing
                if (_monitorState.value.isPairedMode) return@collect

                lastGpsFixTime = System.currentTimeMillis()
                val distance = GeoCalculations.distanceMeters(position, anchorPosition)
                val zoneResult = GeoCalculations.checkZone(position, zone)
                val alarmState = alarmEngine.processReading(zoneResult)

                val previousAlarmState = _monitorState.value.alarmState
                handleAlarmTransition(alarmState, previousAlarmState, _monitorState.value.sessionId ?: -1)

                _monitorState.value = _monitorState.value.copy(
                    boatPosition = position,
                    distanceToAnchor = distance,
                    alarmState = alarmState,
                    gpsAccuracyMeters = position.accuracy,
                    gpsSignalLost = false
                )

                serviceScope.launch { wearDataSender.sendMonitorState(_monitorState.value) }
                val notifText = "FALLBACK: %.0f m - %s".format(distance, alarmState.name)
                updateNotification(notifText, alarmState)
            }
        }
    }

    // ═══════════════════════════════════════
    // WebSocket Client (Client Mode)
    // ═══════════════════════════════════════

    private fun startClientMode(wsUrl: String) {
        val notification = buildNotification("Connecting to server...", AlarmState.SAFE)
        startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)

        // Connect via ClientModeManager → AnchorWebSocketClient
        clientModeManager.connect(wsUrl, serviceScope)

        // Start GPS monitoring and send STATE_UPDATE every 2s
        startClientGpsMonitoring()

        // Collect events from ClientModeManager
        startClientEventCollection()

        // Start battery monitoring for local battery reporting
        startBatteryMonitoring()

        _monitorState.value = _monitorState.value.copy(
            isActive = true,
            isClientMode = true
        )
        updateNotification("Client mode — connecting to $wsUrl", AlarmState.SAFE)
    }

    private fun stopClientMode() {
        clientModeJob?.cancel()
        clientModeJob = null
        clientStateUpdateJob?.cancel()
        clientStateUpdateJob = null
        clientEventJob?.cancel()
        clientEventJob = null
        gpsWatchdogJob?.cancel()
        gpsWatchdogJob = null
        batteryMonitorJob?.cancel()
        batteryMonitorJob = null
        alarmEngine.reset()
        alarmPlayer.stopAlarm()
        clientModeManager.disconnect("USER_DISCONNECT")
        _monitorState.value = MonitorState()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun startClientGpsMonitoring() {
        clientModeJob?.cancel()
        clientModeJob = serviceScope.launch {
            val intervalMs = preferencesManager.preferences.first().gpsIntervalSeconds * 1000L
            lastGpsFixTime = System.currentTimeMillis()
            startGpsWatchdog()

            locationProvider.locationUpdates(intervalMs).collect { position ->
                lastGpsFixTime = System.currentTimeMillis()

                val state = clientModeManager.clientModeState.value
                val anchorPos = state.anchorPosition
                val zone = state.zone

                var distance = 0.0
                var alarmState = AlarmState.SAFE

                if (anchorPos != null && zone != null) {
                    distance = GeoCalculations.distanceMeters(position, anchorPos)
                    val zoneResult = GeoCalculations.checkZone(position, zone)
                    alarmState = alarmEngine.processReading(zoneResult)

                    // Handle alarm transitions
                    val previousAlarmState = _monitorState.value.alarmState
                    when (alarmState) {
                        AlarmState.ALARM -> {
                            if (!alarmPlayer.isPlaying()) {
                                alarmPlayer.startAlarm()
                            }
                            if (previousAlarmState != AlarmState.ALARM) {
                                launch { wearDataSender.sendAlarmTrigger() }
                            }
                            // Notify server about the alarm
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

                // Compute SOG from consecutive positions
                var currentSog: Double? = null
                var currentCog: Double? = null
                val prevPos = previousPosition
                val prevTime = previousPositionTime
                if (prevPos != null && prevTime > 0L) {
                    val dtSeconds = (position.timestamp - prevTime) / 1000.0
                    if (dtSeconds > 0.5) {
                        val distBetween = GeoCalculations.distanceMeters(prevPos, position)
                        currentSog = distBetween / dtSeconds * 1.94384 // m/s → knots
                        currentCog = GeoCalculations.bearingDegrees(prevPos, position)
                    }
                }
                previousPosition = position
                previousPositionTime = position.timestamp

                // Send telemetry to server via ClientModeManager
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

                // Update local monitor state
                _monitorState.value = _monitorState.value.copy(
                    boatPosition = position,
                    distanceToAnchor = distance,
                    alarmState = alarmState,
                    gpsAccuracyMeters = position.accuracy,
                    gpsSignalLost = false,
                    sog = currentSog,
                    cog = currentCog,
                    isClientMode = true
                )

                launch { wearDataSender.sendMonitorState(_monitorState.value) }

                val notifText = "Client: %.0f m - %s".format(distance, alarmState.name)
                updateNotification(notifText, alarmState)
            }
        }
    }

    private fun startClientEventCollection() {
        clientEventJob?.cancel()
        clientEventJob = serviceScope.launch {
            // Mirror ClientModeManager state to MonitorState
            launch {
                clientModeManager.clientModeState.collect { clientState ->
                    _monitorState.value = _monitorState.value.copy(
                        isClientMode = true,
                        peerConnected = clientState.isConnected,
                        anchorPosition = clientState.anchorPosition ?: _monitorState.value.anchorPosition,
                        zone = clientState.zone ?: _monitorState.value.zone
                    )
                    if (clientState.isConnected) {
                        updateNotification(
                            "Connected to server — monitoring",
                            _monitorState.value.alarmState
                        )
                    }
                }
            }

            // Handle events from ClientModeManager
            launch {
                clientModeManager.events.collect { event ->
                    handleClientEvent(event)
                }
            }
        }
    }

    private fun handleClientEvent(event: ClientModeManager.ClientModeEvent) {
        when (event) {
            is ClientModeManager.ClientModeEvent.Connected -> {
                Log.i(TAG, "Client connected to server: ${event.serverUrl}")
                _monitorState.value = _monitorState.value.copy(peerConnected = true)
                updateNotification("Connected to server", AlarmState.SAFE)
            }
            is ClientModeManager.ClientModeEvent.Disconnected -> {
                Log.w(TAG, "Client disconnected from server")
                _monitorState.value = _monitorState.value.copy(peerConnected = false)
                updateNotification("Disconnected — reconnecting...", _monitorState.value.alarmState)
            }
            is ClientModeManager.ClientModeEvent.HeartbeatTimeout -> {
                Log.w(TAG, "Client heartbeat timeout")
                alarmPlayer.startAlarm()
                serviceScope.launch { wearDataSender.sendAlarmTrigger() }
                _monitorState.value = _monitorState.value.copy(
                    peerConnected = false,
                    alarmState = AlarmState.ALARM
                )
                updateNotification("Connection lost with server!", AlarmState.ALARM)
            }
            is ClientModeManager.ClientModeEvent.ServerCommand -> {
                when (event.command) {
                    "MUTE_ALARM" -> muteAlarm()
                    "DISMISS_ALARM" -> dismissAlarm()
                }
            }
            is ClientModeManager.ClientModeEvent.ServerGpsReport -> {
                Log.i(TAG, "Server GPS report: zone=${event.payload.zoneCheckResult}")
                // Informational — the server's GPS verification of our anchor
            }
        }
    }

    // ═══════════════════════════════════════
    // Control Methods
    // ═══════════════════════════════════════

    fun stopMonitoring() {
        monitoringJob?.cancel()
        monitoringJob = null
        gpsWatchdogJob?.cancel()
        gpsWatchdogJob = null
        pairedGpsVerificationJob?.cancel()
        pairedGpsVerificationJob = null
        batteryMonitorJob?.cancel()
        batteryMonitorJob = null
        clientModeJob?.cancel()
        clientModeJob = null
        clientStateUpdateJob?.cancel()
        clientStateUpdateJob = null
        clientEventJob?.cancel()
        clientEventJob = null
        recentTrackPoints.clear()
        alarmEngine.reset()
        alarmPlayer.stopAlarm()

        // Disconnect client mode if active
        if (_monitorState.value.isClientMode) {
            clientModeManager.disconnect("SESSION_ENDED")
        }

        serviceScope.launch {
            try {
                val sessionId = _monitorState.value.sessionId
                if (sessionId != null) {
                    val session = repository.getSessionById(sessionId)
                    session?.let {
                        repository.updateSession(it.copy(
                            endTime = System.currentTimeMillis(),
                            maxDistanceMeters = sessionMaxDistance,
                            maxSog = sessionMaxSog
                        ))
                    }
                }
                // Reset tracking variables
                previousPosition = null
                previousPositionTime = 0L
                sessionMaxDistance = 0.0
                sessionMaxSog = 0.0
                _monitorState.value = MonitorState()
                // Notify watch that monitoring stopped
                wearDataSender.clearMonitorState()
            } finally {
                // Guarantee service stops even if DB/wear operations fail
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
            }
        }
    }

    fun dismissAlarm() {
        alarmPlayer.stopAlarm()
        alarmEngine.reset()
        // In paired mode, also notify PWA
        if (_monitorState.value.isPairedMode) {
            serviceScope.launch { pairedModeManager.sendDismissAlarm() }
        }
        // Update alarm state
        _monitorState.value = _monitorState.value.copy(alarmState = AlarmState.SAFE)
    }

    /**
     * Mute the alarm sound but keep monitoring.
     * The alarm will re-trigger if a new violation occurs.
     * Does NOT reset the AlarmEngine violation counter.
     */
    fun muteAlarm() {
        alarmPlayer.stopAlarm()
        // In paired mode, also notify PWA
        if (_monitorState.value.isPairedMode) {
            serviceScope.launch { pairedModeManager.sendMuteAlarm() }
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
        stopWebSocketServer()
        if (_monitorState.value.isClientMode) {
            clientModeManager.disconnect("SERVICE_DESTROYED")
        }
        serviceScope.cancel()
        alarmPlayer.stopAlarm()
        super.onDestroy()
    }
}
