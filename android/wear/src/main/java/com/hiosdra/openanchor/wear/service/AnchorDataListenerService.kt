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
import com.hiosdra.openanchor.wear.data.WearDataRepository

/**
 * Background service that receives DataItems and Messages from the phone app
 * via the Wearable Data Layer API.
 *
 * - DataItems (MONITOR_STATE_PATH): continuous monitor state sync
 * - Messages (ALARM_TRIGGER_PATH): immediate alarm vibration trigger
 *
 * TODO: Multi-watch support — When multiple watches are paired, each watch
 *   receives all DataItems. To support role-based filtering (e.g. primary vs
 *   secondary watch), filter by source node ID in onDataChanged:
 *   1. Use NodeClient.getConnectedNodes() to discover phone node IDs
 *   2. Store a preferred phone node ID in local preferences
 *   3. In onDataChanged, check event.dataItem.uri.host against the preferred node
 *   4. Consider assigning roles (primary display, alarm-only, etc.) per watch
 */
class AnchorDataListenerService : WearableListenerService() {

    companion object {
        private const val TAG = "AnchorDataListener"
    }

    override fun onDataChanged(dataEvents: DataEventBuffer) {
        super.onDataChanged(dataEvents)

        try {
            for (event in dataEvents) {
                val uri = event.dataItem.uri
                if (uri.path == DataPaths.MONITOR_STATE_PATH) {
                    val dataMap = DataMapItem.fromDataItem(event.dataItem).dataMap
                    val state = WearDataParser.parse(dataMap)

                    if (state != null) {
                        WearDataRepository.onStateReceived(state)
                        Log.d(TAG, "State updated: ${state.alarmState}, dist=${state.distanceMeters}m")
                    } else {
                        Log.w(TAG, "Failed to parse DataItem from ${uri.host}")
                    }
                }
            }
        } finally {
            dataEvents.release()
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
            val manager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
            manager?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        }

        if (vibrator == null || !vibrator.hasVibrator()) {
            Log.w(TAG, "No vibrator available, skipping alarm vibration")
            return
        }

        // Strong repeating pattern: vibrate 500ms, pause 200ms (no infinite repeat)
        val timings = longArrayOf(0, 500, 200, 500, 200, 500, 200, 500, 200, 500)
        val amplitudes = intArrayOf(0, 255, 0, 255, 0, 255, 0, 255, 0, 255)

        // repeat=-1 was infinite; use 0 to repeat from index 0 and cancel after timeout
        val effect = VibrationEffect.createWaveform(timings, amplitudes, 0)
        vibrator.vibrate(effect)

        // Cancel vibration after 15 seconds to prevent battery drain
        android.os.Handler(mainLooper).postDelayed({ vibrator.cancel() }, 15_000L)
    }
}
