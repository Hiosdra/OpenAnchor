package com.hiosdra.openanchor.data.db

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "anchor_sessions")
data class AnchorSessionEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val anchorLat: Double,
    val anchorLng: Double,
    val startTime: Long,
    val endTime: Long? = null,
    val zoneType: String, // "CIRCLE" or "SECTOR"
    val radiusMeters: Double,
    val bufferRadiusMeters: Double? = null,
    val sectorRadiusMeters: Double? = null,
    val sectorHalfAngleDeg: Double? = null,
    val sectorBearingDeg: Double? = null,
    val chainLengthM: Double? = null,
    val depthM: Double? = null,
    val alarmTriggered: Boolean = false,
    val alarmCount: Int = 0
)
