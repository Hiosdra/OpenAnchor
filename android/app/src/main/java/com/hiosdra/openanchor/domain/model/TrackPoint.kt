package com.hiosdra.openanchor.domain.model

data class TrackPoint(
    val id: Long = 0,
    val sessionId: Long,
    val position: Position,
    val distanceToAnchor: Float,
    val isAlarm: Boolean = false
)
