package com.hiosdra.openanchor.wear.data

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Singleton state holder that bridges the WearableListenerService and the UI.
 * The service writes state here; the activity observes it.
 */
object WearMonitorStateHolder {

    private val _state = MutableStateFlow(WearMonitorState())
    val state: StateFlow<WearMonitorState> = _state.asStateFlow()

    private val _connected = MutableStateFlow(false)
    val connected: StateFlow<Boolean> = _connected.asStateFlow()

    fun updateState(newState: WearMonitorState) {
        _state.value = newState
    }

    fun setConnected(isConnected: Boolean) {
        _connected.value = isConnected
    }
}
