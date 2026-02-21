package com.hiosdra.openanchor.domain.model

data class Position(
    val latitude: Double,
    val longitude: Double,
    val accuracy: Float = 0f,
    val timestamp: Long = System.currentTimeMillis()
)
