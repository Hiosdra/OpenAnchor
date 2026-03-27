package com.hiosdra.openanchor.network

import android.util.Log
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import okhttp3.*
import java.util.concurrent.atomic.AtomicLong
import javax.inject.Inject
import javax.inject.Singleton

/**
 * OkHttp-based WebSocket client for client mode.
 * Mirrors the PWA's SyncController — connects to another Android device
 * running AnchorWebSocketServer.
 *
 * Protocol: v2.0
 * - Connects to ws://<ip>:8080
 * - Sends FULL_SYNC, STATE_UPDATE, TRIGGER_ALARM, PING, DISCONNECT
 * - Receives ANDROID_GPS_REPORT, ACTION_COMMAND, PING
 * - Heartbeat every 5s, timeout 15s
 * - Auto-reconnect with exponential backoff
 */
@Singleton
class AnchorWebSocketClient @Inject constructor(
    private val parser: ProtocolMessageParser,
    private val okHttpClient: OkHttpClient
) {
    companion object {
        private const val TAG = "AnchorWSClient"
        private const val HEARTBEAT_INTERVAL_MS = 5_000L
        private const val HEARTBEAT_TIMEOUT_MS = 15_000L
        private const val RECONNECT_BASE_MS = 2_000L
        private const val RECONNECT_MAX_MS = 30_000L
        private const val STATE_UPDATE_INTERVAL_MS = 2_000L
    }

    private var webSocket: WebSocket? = null
    private var heartbeatJob: Job? = null
    private var heartbeatWatchdogJob: Job? = null
    private var reconnectJob: Job? = null
    private val lastPeerPingTime = AtomicLong(0L)
    private var reconnectAttempt = 0
    private var intentionalDisconnect = false
    private var currentUrl: String? = null

    // Client state flow
    private val _clientState = MutableStateFlow(ClientState())
    val clientState: StateFlow<ClientState> = _clientState.asStateFlow()

    // Inbound messages from the server (ANDROID_GPS_REPORT, ACTION_COMMAND, PING)
    private val _inboundMessages = MutableSharedFlow<ServerMessage>(
        replay = 0,
        extraBufferCapacity = 64
    )
    val inboundMessages: SharedFlow<ServerMessage> = _inboundMessages.asSharedFlow()

    // Connection events
    private val _connectionEvents = MutableSharedFlow<ClientConnectionEvent>(
        replay = 0,
        extraBufferCapacity = 16
    )
    val connectionEvents: SharedFlow<ClientConnectionEvent> = _connectionEvents.asSharedFlow()

    data class ClientState(
        val isConnected: Boolean = false,
        val isConnecting: Boolean = false,
        val serverUrl: String? = null,
        val lastHeartbeatAge: Long = 0L,
        val reconnectAttempt: Int = 0,
        val errorMessage: String? = null
    )

    sealed class ServerMessage {
        data class GpsReport(val payload: AndroidGpsReportPayload) : ServerMessage()
        data class ActionCommand(val payload: ActionCommandPayload) : ServerMessage()
        data class Ping(val timestamp: Long) : ServerMessage()
    }

    enum class ClientConnectionEvent {
        CONNECTED,
        DISCONNECTED,
        HEARTBEAT_TIMEOUT,
        RECONNECTING
    }

    /**
     * Connect to a WebSocket server.
     * @param url WebSocket URL (e.g. "ws://192.168.43.1:8080")
     * @param scope CoroutineScope for heartbeat jobs
     */
    fun connect(url: String, scope: CoroutineScope) {
        intentionalDisconnect = false
        reconnectAttempt = 0
        currentUrl = url
        _clientState.value = _clientState.value.copy(
            serverUrl = url,
            isConnecting = true,
            errorMessage = null
        )
        doConnect(url, scope)
    }

    private fun doConnect(url: String, scope: CoroutineScope) {
        webSocket?.cancel()

        val request = Request.Builder()
            .url(url)
            .build()

        webSocket = okHttpClient.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                Log.i(TAG, "Connected to server: $url")
                lastPeerPingTime.set(System.currentTimeMillis())
                reconnectAttempt = 0
                _clientState.value = _clientState.value.copy(
                    isConnected = true,
                    isConnecting = false,
                    reconnectAttempt = 0,
                    errorMessage = null
                )
                scope.launch { _connectionEvents.emit(ClientConnectionEvent.CONNECTED) }
                startHeartbeat(scope)
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                scope.launch {
                    handleServerMessage(text)
                }
            }

            override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                Log.i(TAG, "Server closing: code=$code, reason=$reason")
                webSocket.close(1000, null)
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                Log.i(TAG, "Connection closed: code=$code, reason=$reason")
                handleDisconnection(scope)
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                Log.w(TAG, "Connection failure: ${t.message}")
                _clientState.value = _clientState.value.copy(
                    errorMessage = t.message ?: "Connection failed"
                )
                handleDisconnection(scope)
            }
        })
    }

    private fun handleServerMessage(json: String) {
        try {
            val root = com.google.gson.JsonParser.parseString(json).asJsonObject
            val type = root.get("type")?.asString ?: return
            val payloadElement = root.get("payload")
            val payloadObj = if (payloadElement != null && payloadElement.isJsonObject)
                payloadElement.asJsonObject else null

            val gson = com.google.gson.Gson()

            when (type) {
                "PING" -> {
                    lastPeerPingTime.set(System.currentTimeMillis())
                    _inboundMessages.tryEmit(ServerMessage.Ping(
                        root.get("timestamp")?.asLong ?: System.currentTimeMillis()
                    ))
                }
                "ANDROID_GPS_REPORT" -> {
                    val payload = gson.fromJson(payloadObj, AndroidGpsReportPayload::class.java)
                    _inboundMessages.tryEmit(ServerMessage.GpsReport(payload))
                }
                "ACTION_COMMAND" -> {
                    val payload = gson.fromJson(payloadObj, ActionCommandPayload::class.java)
                    _inboundMessages.tryEmit(ServerMessage.ActionCommand(payload))
                }
                else -> Log.w(TAG, "Unknown server message type: $type")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse server message: $json", e)
        }
    }

    private fun handleDisconnection(scope: CoroutineScope) {
        heartbeatJob?.cancel()
        heartbeatWatchdogJob?.cancel()
        webSocket = null

        val wasConnected = _clientState.value.isConnected
        _clientState.value = _clientState.value.copy(
            isConnected = false,
            isConnecting = false
        )

        scope.launch {
            _connectionEvents.emit(ClientConnectionEvent.DISCONNECTED)
        }

        if (!intentionalDisconnect && currentUrl != null) {
            scheduleReconnect(scope)
        }
    }

    private fun scheduleReconnect(scope: CoroutineScope) {
        reconnectJob?.cancel()
        reconnectJob = scope.launch {
            reconnectAttempt++
            val delay = (RECONNECT_BASE_MS * (1L shl minOf(reconnectAttempt - 1, 4)))
                .coerceAtMost(RECONNECT_MAX_MS)
            Log.i(TAG, "Reconnecting in ${delay}ms (attempt $reconnectAttempt)")
            _clientState.value = _clientState.value.copy(
                isConnecting = true,
                reconnectAttempt = reconnectAttempt
            )
            _connectionEvents.emit(ClientConnectionEvent.RECONNECTING)
            delay(delay)
            currentUrl?.let { doConnect(it, scope) }
        }
    }

    private fun startHeartbeat(scope: CoroutineScope) {
        heartbeatJob?.cancel()
        heartbeatWatchdogJob?.cancel()

        // Send PING every 5s
        heartbeatJob = scope.launch {
            while (isActive) {
                try {
                    send(parser.buildPing())
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to send heartbeat", e)
                    break
                }
                delay(HEARTBEAT_INTERVAL_MS)
            }
        }

        // Watchdog: check if server sent PING within 15s
        heartbeatWatchdogJob = scope.launch {
            while (isActive) {
                delay(HEARTBEAT_INTERVAL_MS)
                val elapsed = System.currentTimeMillis() - lastPeerPingTime.get()
                _clientState.value = _clientState.value.copy(lastHeartbeatAge = elapsed)
                if (elapsed > HEARTBEAT_TIMEOUT_MS) {
                    Log.w(TAG, "Heartbeat timeout! Server not responding for ${elapsed}ms")
                    _connectionEvents.emit(ClientConnectionEvent.HEARTBEAT_TIMEOUT)
                    webSocket?.close(1000, "Heartbeat timeout")
                    break
                }
            }
        }
    }

    /**
     * Send a raw text message to the server.
     */
    fun send(message: String): Boolean {
        return webSocket?.send(message) ?: false
    }

    /**
     * Send a FULL_SYNC message (zone configuration) to the server.
     */
    fun sendFullSync(payload: FullSyncPayload) {
        send(parser.buildFullSync(payload))
    }

    /**
     * Send a STATE_UPDATE message (telemetry) to the server.
     */
    fun sendStateUpdate(payload: StateUpdatePayload): Boolean {
        return send(parser.buildStateUpdate(payload))
    }

    /**
     * Send a TRIGGER_ALARM message to the server.
     */
    fun sendTriggerAlarm(payload: TriggerAlarmPayload): Boolean {
        return send(parser.buildTriggerAlarm(payload))
    }

    /**
     * Gracefully disconnect from the server.
     */
    fun disconnect(reason: String = "USER_DISCONNECT") {
        intentionalDisconnect = true
        reconnectJob?.cancel()
        heartbeatJob?.cancel()
        heartbeatWatchdogJob?.cancel()

        try {
            send(parser.buildDisconnect(reason))
        } catch (_: Exception) {}

        webSocket?.close(1000, reason)
        webSocket = null
        currentUrl = null
        _clientState.value = ClientState()
    }

    val isConnected: Boolean
        get() = _clientState.value.isConnected
}
