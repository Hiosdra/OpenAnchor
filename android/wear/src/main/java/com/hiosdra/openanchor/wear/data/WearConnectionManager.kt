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
 * Manages connection state between the watch and the phone.
 *
 * Tracks whether the phone is connected by monitoring data-layer activity.
 * Automatically marks as disconnected if no data arrives within [CONNECTION_TIMEOUT_MS].
 */
object WearConnectionManager {

    private const val TAG = "WearConnectionManager"
    private const val CONNECTION_TIMEOUT_MS = 30_000L

    private val scope = CoroutineScope(Dispatchers.Main.immediate + SupervisorJob())

    private val _connected = MutableStateFlow(false)
    val connected: StateFlow<Boolean> = _connected.asStateFlow()

    private var watchdogJob: Job? = null

    /** Call when any valid data is received from the phone. */
    fun markDataReceived() {
        _connected.update { true }
        restartWatchdog()
    }

    fun setConnected(isConnected: Boolean) {
        _connected.update { isConnected }
        if (isConnected) restartWatchdog() else watchdogJob?.cancel()
    }

    private fun restartWatchdog() {
        watchdogJob?.cancel()
        watchdogJob = scope.launch {
            delay(CONNECTION_TIMEOUT_MS)
            _connected.update { false }
            Log.d(TAG, "Connection watchdog: no data in ${CONNECTION_TIMEOUT_MS}ms, marking disconnected")
        }
    }
}
