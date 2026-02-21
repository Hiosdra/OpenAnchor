package com.hiosdra.openanchor.data.battery

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import javax.inject.Inject
import javax.inject.Singleton

data class BatteryState(
    val level: Int = -1,        // 0-100
    val isCharging: Boolean = false,
    val temperature: Float = 0f  // Celsius
)

/**
 * Provides local device battery state as a Flow.
 * Registers a BroadcastReceiver for ACTION_BATTERY_CHANGED.
 */
@Singleton
class BatteryProvider @Inject constructor(
    @ApplicationContext private val context: Context
) {
    companion object {
        const val LOW_BATTERY_THRESHOLD = 20
        const val CRITICAL_BATTERY_THRESHOLD = 10
    }

    /**
     * Get current battery state (one-shot).
     */
    fun getCurrentBatteryState(): BatteryState {
        val batteryStatus: Intent? = IntentFilter(Intent.ACTION_BATTERY_CHANGED).let { filter ->
            context.registerReceiver(null, filter)
        }
        return parseBatteryIntent(batteryStatus)
    }

    /**
     * Observe battery state changes as a Flow.
     */
    fun batteryUpdates(): Flow<BatteryState> = callbackFlow {
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(ctx: Context?, intent: Intent?) {
                trySend(parseBatteryIntent(intent))
            }
        }

        val filter = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
        context.registerReceiver(receiver, filter)

        awaitClose {
            context.unregisterReceiver(receiver)
        }
    }

    private fun parseBatteryIntent(intent: Intent?): BatteryState {
        if (intent == null) return BatteryState()

        val level = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
        val scale = intent.getIntExtra(BatteryManager.EXTRA_SCALE, 100)
        val batteryPct = if (scale > 0) (level * 100) / scale else -1

        val status = intent.getIntExtra(BatteryManager.EXTRA_STATUS, -1)
        val isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING ||
                status == BatteryManager.BATTERY_STATUS_FULL

        val tempRaw = intent.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, 0)
        val tempCelsius = tempRaw / 10f

        return BatteryState(
            level = batteryPct,
            isCharging = isCharging,
            temperature = tempCelsius
        )
    }
}
