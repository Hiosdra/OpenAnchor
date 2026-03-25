package com.hiosdra.openanchor.wear.data

/**
 * Sealed class representing the UI state of the wear monitor screen.
 *
 * Transforms raw [WearMonitorState] + connection status into a single
 * type-safe hierarchy that the UI can render without business-logic checks.
 */
sealed class WearScreenState {

    /** Phone not connected or monitoring not active yet. */
    data object Connecting : WearScreenState()

    /** Connected but GPS signal is lost on the phone. */
    data class GpsLost(
        val alarmState: WearAlarmState,
        val lastKnownDistance: Double,
        val timestamp: Long
    ) : WearScreenState()

    /** Actively monitoring anchor position. */
    data class Monitoring(
        val alarmState: WearAlarmState,
        val distanceMeters: Double,
        val gpsAccuracyMeters: Float,
        val timestamp: Long
    ) : WearScreenState()

    /** Was connected but phone has stopped sending data. */
    data class Disconnected(
        val lastKnownState: WearMonitorState?
    ) : WearScreenState()

    companion object {
        /**
         * Derive the appropriate screen state from raw state + connection info.
         */
        fun from(state: WearMonitorState, isConnected: Boolean): WearScreenState {
            return when {
                !isConnected -> {
                    if (state.timestamp > 0L) Disconnected(state) else Connecting
                }
                !state.isActive -> Connecting
                state.gpsSignalLost -> GpsLost(
                    alarmState = state.alarmState,
                    lastKnownDistance = state.distanceMeters,
                    timestamp = state.timestamp
                )
                else -> Monitoring(
                    alarmState = state.alarmState,
                    distanceMeters = state.distanceMeters,
                    gpsAccuracyMeters = state.gpsAccuracyMeters,
                    timestamp = state.timestamp
                )
            }
        }
    }
}
