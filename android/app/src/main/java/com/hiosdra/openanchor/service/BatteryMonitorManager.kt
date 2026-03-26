package com.hiosdra.openanchor.service

import com.hiosdra.openanchor.data.battery.BatteryProvider
import com.hiosdra.openanchor.domain.model.AlarmState
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import javax.inject.Inject

class BatteryMonitorManager @Inject constructor(
    private val batteryProvider: BatteryProvider
) {
    private var batteryMonitorJob: Job? = null

    fun startBatteryMonitoring(
        scope: CoroutineScope,
        monitorState: MutableStateFlow<MonitorState>,
        onUpdateNotification: (String, AlarmState) -> Unit
    ) {
        batteryMonitorJob?.cancel()
        batteryMonitorJob = scope.launch {
            batteryProvider.batteryUpdates().collect { battery ->
                monitorState.value = monitorState.value.copy(
                    localBatteryLevel = battery.level,
                    localBatteryCharging = battery.isCharging
                )
                if (battery.level in 1..BatteryProvider.LOW_BATTERY_THRESHOLD && !battery.isCharging) {
                    onUpdateNotification(
                        "Low battery (${battery.level}%) — monitoring continues",
                        monitorState.value.alarmState
                    )
                }
            }
        }
    }

    fun cancelAll() {
        batteryMonitorJob?.cancel()
        batteryMonitorJob = null
    }
}
