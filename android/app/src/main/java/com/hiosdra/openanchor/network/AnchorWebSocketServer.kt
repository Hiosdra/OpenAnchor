package com.hiosdra.openanchor.network

import android.util.Log
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.routing.*
import io.ktor.server.websocket.*
import io.ktor.websocket.*
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.time.Duration.Companion.seconds

/**
 * Ktor-based WebSocket server for paired mode communication with the PWA.
 *
 * Protocol: v2.0
 * - Runs on configurable port (default 8080)
 * - Single client connection (PWA tablet)
 * - Heartbeat every 5s, timeout 15s
 * - Handles FULL_SYNC, STATE_UPDATE, TRIGGER_ALARM, PING, DISCONNECT
 * - Sends ANDROID_GPS_REPORT, ACTION_COMMAND, PING
 */
@Singleton
class AnchorWebSocketServer @Inject constructor(
    private val parser: ProtocolMessageParser
) {
    companion object {
        private const val TAG = "AnchorWSServer"
        const val DEFAULT_PORT = 8080
        private const val HEARTBEAT_INTERVAL_MS = 5_000L
        private const val HEARTBEAT_TIMEOUT_MS = 15_000L
    }

    private var server: EmbeddedServer<NettyApplicationEngine, NettyApplicationEngine.Configuration>? = null
    private var clientSession: WebSocketServerSession? = null
    private var heartbeatJob: Job? = null
    private var heartbeatWatchdogJob: Job? = null
    private var lastPeerPingTime: Long = 0L

    // Server state flow
    private val _serverState = MutableStateFlow(ServerState())
    val serverState: StateFlow<ServerState> = _serverState.asStateFlow()

    // Inbound message flow - collected by PairedModeManager
    private val _inboundMessages = MutableSharedFlow<ProtocolMessageParser.InboundMessage>(
        replay = 0,
        extraBufferCapacity = 64
    )
    val inboundMessages: SharedFlow<ProtocolMessageParser.InboundMessage> = _inboundMessages.asSharedFlow()

    // Connection events
    private val _connectionEvents = MutableSharedFlow<ConnectionEvent>(
        replay = 0,
        extraBufferCapacity = 16
    )
    val connectionEvents: SharedFlow<ConnectionEvent> = _connectionEvents.asSharedFlow()

    data class ServerState(
        val isRunning: Boolean = false,
        val port: Int = DEFAULT_PORT,
        val clientConnected: Boolean = false,
        val lastHeartbeatAge: Long = 0L
    )

    enum class ConnectionEvent {
        CLIENT_CONNECTED,
        CLIENT_DISCONNECTED,
        HEARTBEAT_TIMEOUT
    }

    fun start(port: Int = DEFAULT_PORT, scope: CoroutineScope) {
        if (server != null) {
            Log.w(TAG, "Server already running")
            return
        }

        try {
            server = embeddedServer(Netty, port = port) {
                install(WebSockets) {
                    pingPeriod = 15.seconds
                    timeout = 30.seconds
                    maxFrameSize = Long.MAX_VALUE
                    masking = false
                }
                routing {
                    webSocket("/") {
                        handleClientConnection(this)
                    }
                }
            }

            scope.launch(Dispatchers.IO) {
                try {
                    server?.start(wait = false)
                    _serverState.value = _serverState.value.copy(isRunning = true, port = port)
                    Log.i(TAG, "WebSocket server started on port $port")
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to start server", e)
                    _serverState.value = _serverState.value.copy(isRunning = false)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to create server", e)
        }
    }

    fun stop() {
        heartbeatJob?.cancel()
        heartbeatJob = null
        heartbeatWatchdogJob?.cancel()
        heartbeatWatchdogJob = null

        clientSession?.let { session ->
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    session.close(CloseReason(CloseReason.Codes.GOING_AWAY, "Server stopping"))
                } catch (_: Exception) {}
            }
        }
        clientSession = null

        server?.stop(1000, 2000)
        server = null

        _serverState.value = ServerState()
        Log.i(TAG, "WebSocket server stopped")
    }

    private suspend fun handleClientConnection(session: WebSocketServerSession) {
        // Only allow one client at a time
        clientSession?.let { existing ->
            try {
                existing.close(CloseReason(CloseReason.Codes.NORMAL, "New client connected"))
            } catch (_: Exception) {}
        }

        clientSession = session
        lastPeerPingTime = System.currentTimeMillis()
        _serverState.value = _serverState.value.copy(clientConnected = true)
        _connectionEvents.emit(ConnectionEvent.CLIENT_CONNECTED)
        Log.i(TAG, "PWA client connected")

        // Start heartbeat sender
        startHeartbeat(session)

        try {
            for (frame in session.incoming) {
                when (frame) {
                    is Frame.Text -> {
                        val text = frame.readText()
                        val message = parser.parseInbound(text)
                        if (message != null) {
                            if (message is ProtocolMessageParser.InboundMessage.Ping) {
                                lastPeerPingTime = System.currentTimeMillis()
                            }
                            _inboundMessages.emit(message)
                        }
                    }
                    else -> { /* ignore binary frames */ }
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Client connection error", e)
        } finally {
            clientSession = null
            heartbeatJob?.cancel()
            heartbeatWatchdogJob?.cancel()
            _serverState.value = _serverState.value.copy(clientConnected = false)
            _connectionEvents.emit(ConnectionEvent.CLIENT_DISCONNECTED)
            Log.i(TAG, "PWA client disconnected")
        }
    }

    private fun startHeartbeat(session: WebSocketServerSession) {
        heartbeatJob?.cancel()
        heartbeatWatchdogJob?.cancel()

        val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

        // Send PING every 5s
        heartbeatJob = scope.launch {
            while (isActive) {
                try {
                    session.send(Frame.Text(parser.buildPing()))
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to send heartbeat", e)
                    break
                }
                delay(HEARTBEAT_INTERVAL_MS)
            }
        }

        // Watchdog: check if peer sent PING within 15s
        heartbeatWatchdogJob = scope.launch {
            while (isActive) {
                delay(HEARTBEAT_INTERVAL_MS)
                val elapsed = System.currentTimeMillis() - lastPeerPingTime
                _serverState.value = _serverState.value.copy(lastHeartbeatAge = elapsed)
                if (elapsed > HEARTBEAT_TIMEOUT_MS) {
                    Log.w(TAG, "Heartbeat timeout! Peer not responding for ${elapsed}ms")
                    _connectionEvents.emit(ConnectionEvent.HEARTBEAT_TIMEOUT)
                    // Close the connection to trigger cleanup
                    try {
                        session.close(CloseReason(CloseReason.Codes.GOING_AWAY, "Heartbeat timeout"))
                    } catch (_: Exception) {}
                    break
                }
            }
        }
    }

    /**
     * Send a text message to the connected PWA client.
     */
    suspend fun send(message: String) {
        try {
            clientSession?.send(Frame.Text(message))
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send message", e)
        }
    }

    /**
     * Send an ACTION_COMMAND to the PWA.
     */
    suspend fun sendCommand(command: String) {
        send(parser.buildActionCommand(command))
    }

    /**
     * Send an ANDROID_GPS_REPORT to the PWA.
     */
    suspend fun sendGpsReport(
        position: com.hiosdra.openanchor.domain.model.Position,
        distanceToAnchor: Double,
        zoneCheckResult: com.hiosdra.openanchor.domain.geometry.ZoneCheckResult,
        alarmState: com.hiosdra.openanchor.domain.model.AlarmState,
        batteryLevel: Int? = null,
        isCharging: Boolean? = null,
        driftDetected: Boolean? = null,
        driftBearingDeg: Double? = null,
        driftSpeedMps: Double? = null
    ) {
        send(parser.buildAndroidGpsReport(
            position, distanceToAnchor, zoneCheckResult, alarmState,
            batteryLevel, isCharging, driftDetected, driftBearingDeg, driftSpeedMps
        ))
    }

    val isClientConnected: Boolean
        get() = clientSession != null && _serverState.value.clientConnected
}
