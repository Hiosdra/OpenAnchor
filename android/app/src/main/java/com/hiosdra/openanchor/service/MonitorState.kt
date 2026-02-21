package com.hiosdra.openanchor.service

import com.hiosdra.openanchor.domain.model.AlarmState
import com.hiosdra.openanchor.domain.model.AnchorZone
import com.hiosdra.openanchor.domain.model.Position

data class MonitorState(
    val isActive: Boolean = false,
    val sessionId: Long? = null,
    val anchorPosition: Position? = null,
    val boatPosition: Position? = null,
    val zone: AnchorZone? = null,
    val distanceToAnchor: Double = 0.0,
    val alarmState: AlarmState = AlarmState.SAFE,
    val gpsAccuracyMeters: Float = 0f,
    val gpsSignalLost: Boolean = false
)
