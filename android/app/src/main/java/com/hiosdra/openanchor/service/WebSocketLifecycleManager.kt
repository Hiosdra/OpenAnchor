package com.hiosdra.openanchor.service

import com.hiosdra.openanchor.network.AnchorWebSocketServer
import com.hiosdra.openanchor.network.PairedModeManager
import kotlinx.coroutines.CoroutineScope
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manages the WebSocket server lifecycle for paired mode.
 * Coordinates [AnchorWebSocketServer] start/stop with [PairedModeManager] listening.
 */
@Singleton
class WebSocketLifecycleManager @Inject constructor(
    private val wsServer: AnchorWebSocketServer,
    val pairedModeManager: PairedModeManager
) {
    fun start(scope: CoroutineScope) {
        wsServer.start(scope = scope)
        pairedModeManager.startListening(scope)
    }

    fun stop() {
        pairedModeManager.stopListening()
        wsServer.stop()
    }

    val isRunning: Boolean
        get() = wsServer.serverState.value.isRunning
}
