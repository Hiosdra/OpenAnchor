package com.hiosdra.openanchor.domain.model

data class AnchorSession(
    val id: Long = 0,
    val anchorPosition: Position,
    val zone: AnchorZone,
    val startTime: Long = System.currentTimeMillis(),
    val endTime: Long? = null,
    val chainLengthM: Double? = null,
    val depthM: Double? = null,
    val alarmTriggered: Boolean = false,
    val alarmCount: Int = 0,
    val maxDistanceMeters: Double = 0.0,
    val maxSog: Double = 0.0
)
