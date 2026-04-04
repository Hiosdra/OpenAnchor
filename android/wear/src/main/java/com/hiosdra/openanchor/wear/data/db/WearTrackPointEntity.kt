package com.hiosdra.openanchor.wear.data.db

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "track_points")
data class WearTrackPointEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val distanceMeters: Double,
    val timestamp: Long,
    val alarmState: String
)
