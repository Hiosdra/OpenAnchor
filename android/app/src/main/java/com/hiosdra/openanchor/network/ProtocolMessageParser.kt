package com.hiosdra.openanchor.network

import android.util.Log
import com.google.gson.Gson
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.hiosdra.openanchor.domain.geometry.ZoneCheckResult
import com.hiosdra.openanchor.domain.model.AlarmState
import com.hiosdra.openanchor.domain.model.AnchorZone
import com.hiosdra.openanchor.domain.model.Position
import javax.inject.Inject
import javax.inject.Singleton

/**
 * JSON (de)serialization for all protocol v2.0 message types.
 * Uses Gson (already in project dependencies).
 */
@Singleton
class ProtocolMessageParser @Inject constructor() {

    private val gson = Gson()

    companion object {
        private const val TAG = "ProtocolParser"
    }

    // --- Parsing inbound messages ---

    sealed class InboundMessage {
        data class FullSync(val payload: FullSyncPayload) : InboundMessage()
        data class StateUpdate(val payload: StateUpdatePayload) : InboundMessage()
        data class TriggerAlarm(val payload: TriggerAlarmPayload) : InboundMessage()
        data class Ping(val timestamp: Long) : InboundMessage()
        data class Disconnect(val payload: DisconnectPayload) : InboundMessage()
        data class Unknown(val type: String) : InboundMessage()
    }

    fun parseInbound(json: String): InboundMessage? {
        return try {
            val root = JsonParser.parseString(json).asJsonObject
            val type = root.get("type")?.asString
            if (type == null) {
                Log.w(TAG, "Inbound message missing 'type' field, dropping: $json")
                return null
            }
            val payloadElement = root.get("payload")
            val payloadObj = if (payloadElement != null && payloadElement.isJsonObject) payloadElement.asJsonObject else null

            when (type) {
                "FULL_SYNC" -> {
                    val payload = gson.fromJson(payloadObj, FullSyncPayload::class.java)
                    InboundMessage.FullSync(payload)
                }
                "STATE_UPDATE" -> {
                    val payload = gson.fromJson(payloadObj, StateUpdatePayload::class.java)
                    InboundMessage.StateUpdate(payload)
                }
                "TRIGGER_ALARM" -> {
                    val payload = gson.fromJson(payloadObj, TriggerAlarmPayload::class.java)
                    InboundMessage.TriggerAlarm(payload)
                }
                "PING" -> {
                    val timestamp = root.get("timestamp")?.asLong ?: System.currentTimeMillis()
                    InboundMessage.Ping(timestamp)
                }
                "DISCONNECT" -> {
                    val payload = gson.fromJson(payloadObj, DisconnectPayload::class.java)
                    InboundMessage.Disconnect(payload)
                }
                else -> InboundMessage.Unknown(type)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse inbound message: $json", e)
            null
        }
    }

    // --- Building outbound messages ---

    fun buildPing(): String {
        return gson.toJson(ProtocolMessage(
            type = "PING",
            timestamp = System.currentTimeMillis()
        ))
    }

    fun buildAndroidGpsReport(
        position: Position,
        distanceToAnchor: Double,
        zoneCheckResult: ZoneCheckResult,
        alarmState: AlarmState,
        batteryLevel: Int? = null,
        isCharging: Boolean? = null,
        driftDetected: Boolean? = null,
        driftBearingDeg: Double? = null,
        driftSpeedMps: Double? = null
    ): String {
        return gson.toJson(ProtocolMessage(
            type = "ANDROID_GPS_REPORT",
            timestamp = System.currentTimeMillis(),
            payload = AndroidGpsReportPayload(
                pos = LatLng(position.latitude, position.longitude),
                accuracy = position.accuracy,
                distanceToAnchor = distanceToAnchor,
                zoneCheckResult = zoneCheckResult.name,
                alarmState = alarmState.name,
                batteryLevel = batteryLevel,
                isCharging = isCharging,
                driftDetected = driftDetected,
                driftBearingDeg = driftBearingDeg,
                driftSpeedMps = driftSpeedMps
            )
        ))
    }

    fun buildActionCommand(command: String): String {
        return gson.toJson(ProtocolMessage(
            type = "ACTION_COMMAND",
            timestamp = System.currentTimeMillis(),
            payload = ActionCommandPayload(command = command)
        ))
    }

    // --- Client-side outbound messages (Android client → Android server) ---

    /**
     * Build a FULL_SYNC message to send zone configuration to the server.
     * Used by client mode (mirrors what PWA sends on connect).
     */
    fun buildFullSync(payload: FullSyncPayload): String {
        return gson.toJson(ProtocolMessage(
            type = "FULL_SYNC",
            timestamp = System.currentTimeMillis(),
            payload = payload
        ))
    }

    /**
     * Build a STATE_UPDATE message with current telemetry.
     * Sent every 2 seconds by the client (mirrors PWA behavior).
     */
    fun buildStateUpdate(payload: StateUpdatePayload): String {
        return gson.toJson(ProtocolMessage(
            type = "STATE_UPDATE",
            timestamp = System.currentTimeMillis(),
            payload = payload
        ))
    }

    /**
     * Build a TRIGGER_ALARM message.
     * Sent when client detects zone violation, GPS loss, or low battery.
     */
    fun buildTriggerAlarm(payload: TriggerAlarmPayload): String {
        return gson.toJson(ProtocolMessage(
            type = "TRIGGER_ALARM",
            timestamp = System.currentTimeMillis(),
            payload = payload
        ))
    }

    /**
     * Build a DISCONNECT message for graceful disconnection.
     */
    fun buildDisconnect(reason: String): String {
        return gson.toJson(ProtocolMessage(
            type = "DISCONNECT",
            timestamp = System.currentTimeMillis(),
            payload = DisconnectPayload(reason = reason)
        ))
    }

    // --- Conversion helpers ---

    /**
     * Convert a FULL_SYNC payload to an AnchorZone domain object.
     */
    fun toAnchorZone(payload: FullSyncPayload): AnchorZone {
        val anchorPos = Position(
            latitude = payload.anchorPos.lat,
            longitude = payload.anchorPos.lng
        )
        return when (payload.zoneType.uppercase()) {
            "SECTOR" -> {
                val sector = payload.sector ?: error("Sector payload required for SECTOR zone type")
                AnchorZone.SectorWithCircle(
                    anchorPosition = anchorPos,
                    radiusMeters = payload.radiusMeters,
                    bufferRadiusMeters = payload.bufferRadiusMeters,
                    sectorRadiusMeters = sector.radiusMeters,
                    sectorHalfAngleDeg = sector.halfAngleDeg,
                    sectorBearingDeg = sector.bearingDeg
                )
            }
            else -> {
                AnchorZone.Circle(
                    anchorPosition = anchorPos,
                    radiusMeters = payload.radiusMeters,
                    bufferRadiusMeters = payload.bufferRadiusMeters
                )
            }
        }
    }

    /**
     * Parse an alarm state string to enum.
     */
    fun parseAlarmState(state: String): AlarmState {
        return try {
            AlarmState.valueOf(state.uppercase())
        } catch (_: Exception) {
            AlarmState.SAFE
        }
    }
}
