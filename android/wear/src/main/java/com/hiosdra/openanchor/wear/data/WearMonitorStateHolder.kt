package com.hiosdra.openanchor.wear.data

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import javax.inject.Inject
import javax.inject.Singleton

/**
 * State holder for anchor monitoring data on the watch.
 * Focused solely on monitor state — connection tracking is in [WearConnectionManager].
 *
 * The service writes state here (via [WearDataRepository]); the activity observes it.
 */
@Singleton
class WearMonitorStateHolder @Inject constructor() {

    private val _state = MutableStateFlow(WearMonitorState())
    val state: StateFlow<WearMonitorState> = _state.asStateFlow()

    /** Atomically update the monitor state. */
    fun updateState(newState: WearMonitorState) {
        _state.update { newState }
    }

    /** Reset state to defaults (e.g., on disconnect). */
    fun reset() {
        _state.update { WearMonitorState() }
    }
}
