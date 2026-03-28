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
import com.hiosdra.openanchor.wear.data.WearConnectionManager
import com.hiosdra.openanchor.wear.data.WearDataRepository
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

/**
 * Background service that receives DataItems and Messages from the phone app
 * via the Wearable Data Layer API.
 *
 * - DataItems (MONITOR_STATE_PATH): continuous monitor state sync
 * - Messages (ALARM_TRIGGER_PATH): immediate alarm vibration trigger
 *
 * Multi-watch architecture: Uses [WearConnectionManager] for authorized phone
 * node tracking. Only data from the authorized phone is processed.
 */
@AndroidEntryPoint
class AnchorDataListenerService : WearableListenerService() {

    companion object {
        private const val TAG = "AnchorDataListener"
    }

    @Inject lateinit var dataRepository: WearDataRepository
    @Inject lateinit var dataParser: WearDataParser
    @Inject lateinit var hapticFeedback: WearHapticFeedback
    @Inject lateinit var connectionManager: WearConnectionManager

    override fun onDataChanged(dataEvents: DataEventBuffer) {
        super.onDataChanged(dataEvents)

        try {
            for (event in dataEvents) {
                val uri = event.dataItem.uri
                val sourceNodeId = uri.host ?: continue

                if (uri.path == DataPaths.MONITOR_STATE_PATH) {
                    if (!connectionManager.isNodeAuthorized(sourceNodeId)) {
                        Log.d(TAG, "Ignoring data from unauthorized node: $sourceNodeId")
                        continue
                    }

                    // Auto-authorize on first connection (nodeId used as display name;
                    // Node object is not available in onDataChanged)
                    if (!connectionManager.isNodeAuthorized(sourceNodeId)) {
                        connectionManager.authorizeNode(sourceNodeId, sourceNodeId)
                    }

                    val dataMap = DataMapItem.fromDataItem(event.dataItem).dataMap
                    val state = dataParser.parse(dataMap)

                    if (state != null) {
                        dataRepository.onStateReceived(state)
                        hapticFeedback.onAlarmStateChanged(this, state.alarmState)
                        WearComplicationService.requestComplicationUpdate(this)
                        Log.d(TAG, "State updated: ${state.alarmState}, dist=${state.distanceMeters}m")
                    } else {
                        Log.w(TAG, "Failed to parse DataItem from $sourceNodeId")
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

        val timings = longArrayOf(0, 500, 200, 500, 200, 500, 200, 500, 200, 500)
        val amplitudes = intArrayOf(0, 255, 0, 255, 0, 255, 0, 255, 0, 255)

        val effect = VibrationEffect.createWaveform(timings, amplitudes, 0)
        vibrator.vibrate(effect)

        android.os.Handler(mainLooper).postDelayed({ vibrator.cancel() }, 15_000L)
    }
}
