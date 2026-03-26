package com.hiosdra.openanchor.wear.data

/**
 * Constants for Wearable Data Layer paths shared between phone and watch.
 *
 * ⚠️ CROSS-MODULE DUPLICATION WARNING ⚠️
 * These constants are intentionally duplicated between two files:
 *   - WATCH: android/wear/src/main/java/com/hiosdra/openanchor/wear/data/DataPaths.kt (this file)
 *   - PHONE: android/app/src/main/java/com/hiosdra/openanchor/service/WearDataSender.kt
 *
 * Both files MUST define identical paths and keys. If you change a value here,
 * you MUST update the phone-side file as well (and vice versa).
 *
 * A shared Gradle module (:shared) would eliminate this duplication, but is not
 * currently justified given the small surface area and stability of these constants.
 */
@Suppress("KDocUnresolvedReference") // Phone-side reference is in a separate module
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
