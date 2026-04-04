package com.hiosdra.openanchor.network

import com.hiosdra.openanchor.domain.model.AlarmState
import com.hiosdra.openanchor.domain.geometry.ZoneCheckResult

/**
 * Protocol v2.0 message types and data classes.
 * Matches the protocol specification in docs/protocol/protocol.md.
 */

// --- Message Types ---

enum class MessageType {
    FULL_SYNC,
    STATE_UPDATE,
    TRIGGER_ALARM,
    ANDROID_GPS_REPORT,
    ACTION_COMMAND,
    PING,
    DISCONNECT
}

// --- Inbound messages (PWA -> Android) ---

data class FullSyncPayload(
    val isAnchored: Boolean,
    val anchorPos: LatLng,
    val zoneType: String, // "CIRCLE" or "SECTOR"
    val radiusMeters: Double,
    val bufferRadiusMeters: Double? = null,
    val sector: SectorPayload? = null,
    val units: String = "m",
    val chainLengthM: Double? = null,
    val depthM: Double? = null
)

data class SectorPayload(
    val bearingDeg: Double,
    val halfAngleDeg: Double,
    val radiusMeters: Double
)

data class LatLng(
    val lat: Double,
    val lng: Double
)

data class StateUpdatePayload(
    val currentPos: LatLng,
    val gpsAccuracy: Float,
    val distanceToAnchor: Double,
    val alarmState: String, // "SAFE", "CAUTION", "WARNING", "ALARM"
    val sog: Double? = null,
    val cog: Double? = null,
    val batteryLevel: Double? = null,
    val isCharging: Boolean? = null
)

data class TriggerAlarmPayload(
    val reason: String, // "OUT_OF_ZONE", "GPS_LOST", "LOW_BATTERY"
    val message: String,
    val alarmState: String // "CAUTION", "WARNING", "ALARM"
)

data class DisconnectPayload(
    val reason: String // "SESSION_ENDED", "USER_DISCONNECT"
)

// --- Outbound messages (Android -> PWA) ---

data class AndroidGpsReportPayload(
    val pos: LatLng,
    val accuracy: Float,
    val distanceToAnchor: Double,
    val zoneCheckResult: String, // "INSIDE", "BUFFER", "OUTSIDE"
    val alarmState: String, // "SAFE", "CAUTION", "WARNING", "ALARM"
    // Battery info (Faza 5.2)
    val batteryLevel: Int? = null, // 0-100
    val isCharging: Boolean? = null,
    // Drift detection (Faza 5.2)
    val driftDetected: Boolean? = null,
    val driftBearingDeg: Double? = null,
    val driftSpeedMps: Double? = null
)

data class ActionCommandPayload(
    val command: String // "MUTE_ALARM", "DISMISS_ALARM"
)

// --- Envelope ---

data class ProtocolMessage(
    val type: String,
    val timestamp: Long,
    val payload: Any? = null
)
