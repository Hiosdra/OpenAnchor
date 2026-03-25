package com.hiosdra.openanchor.wear.data

/**
 * Constants for Wearable Data Layer paths shared between phone and watch.
 *
 * ⚠️ DUPLICATION WARNING: These values are duplicated in the phone module at:
 *   android/app/src/main/java/com/hiosdra/openanchor/service/WearDataSender.kt
 * Any changes here MUST be mirrored there (and vice versa).
 *
 * TODO: Move these constants to a shared/common Gradle module to eliminate
 *   duplication risk. Both :app and :wear modules would depend on :shared.
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
