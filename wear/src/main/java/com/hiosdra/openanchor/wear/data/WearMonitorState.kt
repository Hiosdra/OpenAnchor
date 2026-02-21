package com.hiosdra.openanchor.wear.data

/**
 * Lightweight data class representing anchor monitoring state on the watch.
 * Mirrors relevant fields from the phone's MonitorState, received via Data Layer.
 */
data class WearMonitorState(
    val isActive: Boolean = false,
    val alarmState: WearAlarmState = WearAlarmState.SAFE,
    val distanceMeters: Double = 0.0,
    val gpsAccuracyMeters: Float = 0f,
    val gpsSignalLost: Boolean = false,
    val timestamp: Long = 0L
)

/**
 * Watch-side alarm state enum. Matches phone's AlarmState values.
 */
enum class WearAlarmState {
    SAFE,
    CAUTION,
    WARNING,
    ALARM;

    companion object {
        fun fromString(value: String): WearAlarmState {
            return try {
                valueOf(value.uppercase())
            } catch (_: IllegalArgumentException) {
                SAFE
            }
        }
    }
}
