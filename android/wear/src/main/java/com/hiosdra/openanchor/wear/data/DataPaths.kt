package com.hiosdra.openanchor.wear.data

/**
 * Constants for Wearable Data Layer paths shared between phone and watch.
 * Phone app uses these same string values (duplicated, not shared module).
 */
object DataPaths {
    // DataItem path for monitor state sync
    const val MONITOR_STATE_PATH = "/openanchor/monitor_state"

    // Message path for alarm vibration trigger
    const val ALARM_TRIGGER_PATH = "/openanchor/alarm_trigger"

    // DataMap keys
    const val KEY_ALARM_STATE = "alarm_state"
    const val KEY_DISTANCE = "distance"
    const val KEY_GPS_ACCURACY = "gps_accuracy"
    const val KEY_GPS_SIGNAL_LOST = "gps_signal_lost"
    const val KEY_IS_ACTIVE = "is_active"
    const val KEY_TIMESTAMP = "timestamp"
}
