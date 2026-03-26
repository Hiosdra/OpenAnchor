package com.hiosdra.openanchor.wear.data

import android.util.Log
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine

/**
 * Repository layer between the data-listener service and the UI state holders.
 *
 * Responsibilities:
 * - Validate and transform incoming [WearMonitorState] data
 * - Coordinate updates to [WearMonitorStateHolder] and [WearConnectionManager]
 * - Provide a clean API for the service layer
 */
object WearDataRepository {

    private const val TAG = "WearDataRepository"

    /** Observe the current monitor state. */
    val state: StateFlow<WearMonitorState>
        get() = WearMonitorStateHolder.state

    /** Observe connection status. */
    val connected: StateFlow<Boolean>
        get() = WearConnectionManager.connected

    /**
     * Process a new monitor state received from the phone.
     * Validates the data before forwarding to the state holder.
     */
    fun onStateReceived(newState: WearMonitorState) {
        if (!validate(newState)) {
            Log.w(TAG, "Invalid state received, ignoring: $newState")
            return
        }
        WearMonitorStateHolder.updateState(newState)
        WearConnectionManager.markDataReceived()
    }

    /** Mark the phone connection as active/inactive. */
    fun onConnectionChanged(isConnected: Boolean) {
        WearConnectionManager.setConnected(isConnected)
    }

    /**
     * Derive the current [WearScreenState] from raw state + connection.
     */
    fun screenState(): WearScreenState {
        return WearScreenState.from(state.value, connected.value)
    }

    private fun validate(state: WearMonitorState): Boolean {
        if (state.distanceMeters < 0) {
            Log.w(TAG, "Negative distance: ${state.distanceMeters}")
            return false
        }
        if (state.gpsAccuracyMeters < 0) {
            Log.w(TAG, "Negative GPS accuracy: ${state.gpsAccuracyMeters}")
            return false
        }
        return true
    }
}
