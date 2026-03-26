package com.hiosdra.openanchor.wear.service

import android.util.Log
import com.google.android.gms.wearable.DataMap
import com.hiosdra.openanchor.wear.data.DataPaths
import com.hiosdra.openanchor.wear.data.WearAlarmState
import com.hiosdra.openanchor.wear.data.WearMonitorState

/**
 * Parses Wearable Data Layer [DataMap] into [WearMonitorState].
 *
 * Extracted from [AnchorDataListenerService] so the parsing logic can be
 * unit-tested without mocking the WearableListenerService.
 */
object WearDataParser {

    private const val TAG = "WearDataParser"

    /**
     * Parse a [DataMap] received from the phone's monitor-state DataItem.
     *
     * @return parsed [WearMonitorState], or `null` if the data is malformed.
     */
    fun parse(dataMap: DataMap): WearMonitorState? {
        return try {
            WearMonitorState(
                isActive = dataMap.getBoolean(DataPaths.KEY_IS_ACTIVE, false),
                alarmState = WearAlarmState.fromString(
                    dataMap.getString(DataPaths.KEY_ALARM_STATE, "SAFE")
                ),
                distanceMeters = dataMap.getFloat(DataPaths.KEY_DISTANCE, 0f).toDouble(),
                gpsAccuracyMeters = dataMap.getFloat(DataPaths.KEY_GPS_ACCURACY, 0f),
                gpsSignalLost = dataMap.getBoolean(DataPaths.KEY_GPS_SIGNAL_LOST, false),
                timestamp = dataMap.getLong(DataPaths.KEY_TIMESTAMP, 0L)
            )
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse DataMap", e)
            null
        }
    }
}
