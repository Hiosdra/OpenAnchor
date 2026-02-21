package com.hiosdra.openanchor.service

import android.content.Context
import android.util.Log
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Sends anchor monitoring state to the Wear OS companion app via the
 * Wearable Data Layer API.
 *
 * - DataClient.putDataItem() for continuous state sync (persists + syncs automatically)
 * - MessageClient.sendMessage() for immediate alarm vibration triggers
 */
@Singleton
class WearDataSender @Inject constructor(
    @ApplicationContext private val context: Context
) {
    companion object {
        private const val TAG = "WearDataSender"

        // Must match wear module's DataPaths
        private const val MONITOR_STATE_PATH = "/openanchor/monitor_state"
        private const val ALARM_TRIGGER_PATH = "/openanchor/alarm_trigger"

        private const val KEY_ALARM_STATE = "alarm_state"
        private const val KEY_DISTANCE = "distance"
        private const val KEY_GPS_ACCURACY = "gps_accuracy"
        private const val KEY_GPS_SIGNAL_LOST = "gps_signal_lost"
        private const val KEY_IS_ACTIVE = "is_active"
        private const val KEY_TIMESTAMP = "timestamp"
    }

    private val dataClient by lazy { Wearable.getDataClient(context) }
    private val messageClient by lazy { Wearable.getMessageClient(context) }
    private val nodeClient by lazy { Wearable.getNodeClient(context) }

    /**
     * Sends the current monitor state as a DataItem.
     * DataItems are persisted and synced automatically to connected nodes.
     */
    suspend fun sendMonitorState(state: MonitorState) {
        try {
            val request = PutDataMapRequest.create(MONITOR_STATE_PATH).apply {
                dataMap.putBoolean(KEY_IS_ACTIVE, state.isActive)
                dataMap.putString(KEY_ALARM_STATE, state.alarmState.name)
                dataMap.putFloat(KEY_DISTANCE, state.distanceToAnchor.toFloat())
                dataMap.putFloat(KEY_GPS_ACCURACY, state.gpsAccuracyMeters)
                dataMap.putBoolean(KEY_GPS_SIGNAL_LOST, state.gpsSignalLost)
                dataMap.putLong(KEY_TIMESTAMP, System.currentTimeMillis())
            }.asPutDataRequest().setUrgent()

            dataClient.putDataItem(request).await()
            Log.d(TAG, "Monitor state sent: ${state.alarmState}, dist=${state.distanceToAnchor}")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send monitor state", e)
        }
    }

    /**
     * Sends an immediate alarm trigger message to all connected watch nodes.
     * Messages are fire-and-forget (not persisted).
     */
    suspend fun sendAlarmTrigger() {
        try {
            val nodes = nodeClient.connectedNodes.await()
            for (node in nodes) {
                messageClient.sendMessage(
                    node.id,
                    ALARM_TRIGGER_PATH,
                    byteArrayOf()
                ).await()
                Log.d(TAG, "Alarm trigger sent to node: ${node.displayName}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send alarm trigger", e)
        }
    }

    /**
     * Clears the monitor state DataItem (e.g., when monitoring stops).
     */
    suspend fun clearMonitorState() {
        try {
            val request = PutDataMapRequest.create(MONITOR_STATE_PATH).apply {
                dataMap.putBoolean(KEY_IS_ACTIVE, false)
                dataMap.putString(KEY_ALARM_STATE, "SAFE")
                dataMap.putFloat(KEY_DISTANCE, 0f)
                dataMap.putFloat(KEY_GPS_ACCURACY, 0f)
                dataMap.putBoolean(KEY_GPS_SIGNAL_LOST, false)
                dataMap.putLong(KEY_TIMESTAMP, System.currentTimeMillis())
            }.asPutDataRequest().setUrgent()

            dataClient.putDataItem(request).await()
            Log.d(TAG, "Monitor state cleared")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to clear monitor state", e)
        }
    }
}
