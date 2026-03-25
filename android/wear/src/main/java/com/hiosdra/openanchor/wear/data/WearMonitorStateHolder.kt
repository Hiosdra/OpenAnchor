package com.hiosdra.openanchor.wear.data

import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Singleton state holder that bridges the WearableListenerService and the UI.
 * The service writes state here; the activity observes it.
 */
object WearMonitorStateHolder {

    private const val TAG = "WearMonitorStateHolder"
    private const val CONNECTION_TIMEOUT_MS = 30_000L

    private val scope = CoroutineScope(Dispatchers.Main.immediate + SupervisorJob())

    private val _state = MutableStateFlow(WearMonitorState())
    val state: StateFlow<WearMonitorState> = _state.asStateFlow()

    private val _connected = MutableStateFlow(false)
    val connected: StateFlow<Boolean> = _connected.asStateFlow()

    private var watchdogJob: Job? = null

    /** Atomically update state and mark connection as active. */
    fun updateState(newState: WearMonitorState) {
        _state.update { newState }
        markDataReceived()
    }

    fun setConnected(isConnected: Boolean) {
        _connected.update { isConnected }
    }

    private fun markDataReceived() {
        _connected.update { true }
        startConnectionWatchdog()
    }

    /**
     * Resets [connected] to false if no data arrives within [CONNECTION_TIMEOUT_MS].
     * Each call restarts the timer.
     */
    private fun startConnectionWatchdog() {
        watchdogJob?.cancel()
        watchdogJob = scope.launch {
            delay(CONNECTION_TIMEOUT_MS)
            _connected.update { false }
            Log.d(TAG, "Connection watchdog: no data in ${CONNECTION_TIMEOUT_MS}ms, marking disconnected")
        }
    }
}
