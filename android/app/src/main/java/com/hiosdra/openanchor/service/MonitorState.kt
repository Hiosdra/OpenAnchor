package com.hiosdra.openanchor.service

import com.hiosdra.openanchor.domain.drift.DriftAnalysis
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
    val gpsSignalLost: Boolean = false,
    // Paired mode fields
    val isPairedMode: Boolean = false,
    val peerConnected: Boolean = false,
    val peerBatteryLevel: Double? = null,
    val peerIsCharging: Boolean? = null,
    val sog: Double? = null,
    val cog: Double? = null,
    // Local battery (Faza 4.4)
    val localBatteryLevel: Int = -1,
    val localBatteryCharging: Boolean = false,
    // Drift detection (Faza 4.5)
    val driftAnalysis: DriftAnalysis? = null
)
