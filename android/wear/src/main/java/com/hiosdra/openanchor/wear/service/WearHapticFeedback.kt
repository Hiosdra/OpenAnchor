package com.hiosdra.openanchor.wear.service

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import com.hiosdra.openanchor.wear.data.WearAlarmState

/**
 * Provides haptic feedback patterns for alarm state transitions.
 *
 * Tracks the previous alarm state and triggers appropriate vibration patterns
 * when the state escalates or changes.
 */
object WearHapticFeedback {

    private const val TAG = "WearHapticFeedback"

    private var previousAlarmState: WearAlarmState? = null

    /**
     * Call when alarm state changes. Triggers haptic feedback if the transition
     * warrants it.
     *
     * Patterns:
     * - SAFE → CAUTION: single short tap (100ms)
     * - CAUTION → WARNING: double tap (100ms, 100ms gap, 100ms)
     * - any → ALARM: long vibration (500ms)
     * - De-escalation (e.g., ALARM → SAFE): no haptic
     */
    fun onAlarmStateChanged(context: Context, newState: WearAlarmState) {
        val previous = previousAlarmState
        previousAlarmState = newState

        if (previous == null || previous == newState) return

        val vibrator = getVibrator(context) ?: return

        val effect = when {
            newState == WearAlarmState.ALARM -> {
                Log.d(TAG, "Alarm triggered: $previous → $newState")
                VibrationEffect.createOneShot(500, VibrationEffect.DEFAULT_AMPLITUDE)
            }
            previous == WearAlarmState.SAFE && newState == WearAlarmState.CAUTION -> {
                Log.d(TAG, "Caution: $previous → $newState")
                VibrationEffect.createOneShot(100, VibrationEffect.DEFAULT_AMPLITUDE)
            }
            previous == WearAlarmState.CAUTION && newState == WearAlarmState.WARNING -> {
                Log.d(TAG, "Warning: $previous → $newState")
                VibrationEffect.createWaveform(
                    longArrayOf(0, 100, 100, 100),
                    intArrayOf(0, 255, 0, 255),
                    -1
                )
            }
            previous.ordinal < newState.ordinal -> {
                // Any other escalation: single short tap
                Log.d(TAG, "Escalation: $previous → $newState")
                VibrationEffect.createOneShot(100, VibrationEffect.DEFAULT_AMPLITUDE)
            }
            else -> {
                // De-escalation: no haptic
                Log.d(TAG, "De-escalation: $previous → $newState (no haptic)")
                null
            }
        }

        effect?.let { vibrator.vibrate(it) }
    }

    private fun getVibrator(context: Context): Vibrator? {
        val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val manager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
            manager?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        }

        if (vibrator == null || !vibrator.hasVibrator()) {
            Log.w(TAG, "No vibrator available")
            return null
        }
        return vibrator
    }

    /** Reset tracked state (e.g., on disconnect). */
    fun reset() {
        previousAlarmState = null
    }
}
