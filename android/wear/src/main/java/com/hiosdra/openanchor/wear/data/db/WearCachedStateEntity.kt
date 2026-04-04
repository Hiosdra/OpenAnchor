package com.hiosdra.openanchor.wear.data.db

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.hiosdra.openanchor.wear.data.WearAlarmState
import com.hiosdra.openanchor.wear.data.WearMonitorState

@Entity(tableName = "cached_monitor_state")
data class WearCachedStateEntity(
    @PrimaryKey val id: Int = 1,
    val alarmState: String,
    val distanceMeters: Double,
    val gpsAccuracyMeters: Float,
    val gpsSignalLost: Boolean,
    val isActive: Boolean,
    val lastUpdatedTimestamp: Long
) {
    fun toMonitorState(): WearMonitorState = WearMonitorState(
        isActive = isActive,
        alarmState = WearAlarmState.fromString(alarmState),
        distanceMeters = distanceMeters,
        gpsAccuracyMeters = gpsAccuracyMeters,
        gpsSignalLost = gpsSignalLost,
        timestamp = lastUpdatedTimestamp
    )

    companion object {
        fun from(state: WearMonitorState): WearCachedStateEntity = WearCachedStateEntity(
            alarmState = state.alarmState.name,
            distanceMeters = state.distanceMeters,
            gpsAccuracyMeters = state.gpsAccuracyMeters,
            gpsSignalLost = state.gpsSignalLost,
            isActive = state.isActive,
            lastUpdatedTimestamp = state.timestamp
        )
    }
}
