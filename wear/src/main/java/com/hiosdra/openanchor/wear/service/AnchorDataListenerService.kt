package com.hiosdra.openanchor.wear.service

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.WearableListenerService
import com.hiosdra.openanchor.wear.data.DataPaths
import com.hiosdra.openanchor.wear.data.WearAlarmState
import com.hiosdra.openanchor.wear.data.WearMonitorState
import com.hiosdra.openanchor.wear.data.WearMonitorStateHolder

/**
 * Background service that receives DataItems and Messages from the phone app
 * via the Wearable Data Layer API.
 *
 * - DataItems (MONITOR_STATE_PATH): continuous monitor state sync
 * - Messages (ALARM_TRIGGER_PATH): immediate alarm vibration trigger
 */
class AnchorDataListenerService : WearableListenerService() {

    companion object {
        private const val TAG = "AnchorDataListener"
    }

    override fun onDataChanged(dataEvents: DataEventBuffer) {
        super.onDataChanged(dataEvents)

        for (event in dataEvents) {
            val uri = event.dataItem.uri
            if (uri.path == DataPaths.MONITOR_STATE_PATH) {
                try {
                    val dataMap = DataMapItem.fromDataItem(event.dataItem).dataMap

                    val state = WearMonitorState(
                        isActive = dataMap.getBoolean(DataPaths.KEY_IS_ACTIVE, false),
                        alarmState = WearAlarmState.fromString(
                            dataMap.getString(DataPaths.KEY_ALARM_STATE, "SAFE")
                        ),
                        distanceMeters = dataMap.getFloat(DataPaths.KEY_DISTANCE, 0f).toDouble(),
                        gpsAccuracyMeters = dataMap.getFloat(DataPaths.KEY_GPS_ACCURACY, 0f),
                        gpsSignalLost = dataMap.getBoolean(DataPaths.KEY_GPS_SIGNAL_LOST, false),
                        timestamp = dataMap.getLong(DataPaths.KEY_TIMESTAMP, 0L)
                    )

                    WearMonitorStateHolder.updateState(state)
                    WearMonitorStateHolder.setConnected(true)

                    Log.d(TAG, "State updated: ${state.alarmState}, dist=${state.distanceMeters}m")
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing DataItem", e)
                }
            }
        }
    }

    override fun onMessageReceived(messageEvent: MessageEvent) {
        super.onMessageReceived(messageEvent)

        if (messageEvent.path == DataPaths.ALARM_TRIGGER_PATH) {
            Log.d(TAG, "Alarm trigger message received — vibrating")
            triggerAlarmVibration()
        }
    }

    private fun triggerAlarmVibration() {
        val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val manager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            manager.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }

        // Strong repeating pattern: vibrate 500ms, pause 200ms, repeat 5 times
        val timings = longArrayOf(0, 500, 200, 500, 200, 500, 200, 500, 200, 500)
        val amplitudes = intArrayOf(0, 255, 0, 255, 0, 255, 0, 255, 0, 255)

        val effect = VibrationEffect.createWaveform(timings, amplitudes, -1)
        vibrator.vibrate(effect)
    }
}
