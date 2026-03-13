package com.hiosdra.openanchor.network

import com.hiosdra.openanchor.domain.geometry.ZoneCheckResult
import com.hiosdra.openanchor.domain.model.AlarmState
import com.hiosdra.openanchor.domain.model.AnchorZone
import com.hiosdra.openanchor.domain.model.Position
import com.google.gson.JsonParser
import org.junit.Before
import org.junit.Test
import org.junit.Assert.*

/**
 * Comprehensive tests for ProtocolMessageParser - JSON protocol message handling.
 */
class ProtocolMessageParserTest {

    private lateinit var parser: ProtocolMessageParser

    @Before
    fun setup() {
        parser = ProtocolMessageParser()
    }

    // ========== Parse Inbound Messages ==========

    @Test
    fun parseInbound_fullSync_circle_parsesCorrectly() {
        val json = """
            {
                "type": "FULL_SYNC",
                "timestamp": 1234567890,
                "payload": {
                    "isAnchored": true,
                    "anchorPos": {"lat": 43.7384, "lng": 7.4246},
                    "zoneType": "CIRCLE",
                    "radiusMeters": 100.0,
                    "bufferRadiusMeters": 150.0,
                    "units": "m",
                    "chainLengthM": 70.0,
                    "depthM": 10.0
                }
            }
        """.trimIndent()

        val result = parser.parseInbound(json)

        assertNotNull(result)
        assertTrue(result is ProtocolMessageParser.InboundMessage.FullSync)
        val fullSync = result as ProtocolMessageParser.InboundMessage.FullSync

        assertTrue(fullSync.payload.isAnchored)
        assertEquals(43.7384, fullSync.payload.anchorPos.lat, 0.0001)
        assertEquals(7.4246, fullSync.payload.anchorPos.lng, 0.0001)
        assertEquals("CIRCLE", fullSync.payload.zoneType)
        assertEquals(100.0, fullSync.payload.radiusMeters, 0.01)
        assertEquals(150.0, fullSync.payload.bufferRadiusMeters!!, 0.01)
        assertEquals(70.0, fullSync.payload.chainLengthM!!, 0.01)
        assertEquals(10.0, fullSync.payload.depthM!!, 0.01)
    }

    @Test
    fun parseInbound_fullSync_sector_parsesCorrectly() {
        val json = """
            {
                "type": "FULL_SYNC",
                "payload": {
                    "isAnchored": true,
                    "anchorPos": {"lat": 43.7384, "lng": 7.4246},
                    "zoneType": "SECTOR",
                    "radiusMeters": 50.0,
                    "bufferRadiusMeters": 80.0,
                    "sector": {
                        "bearingDeg": 180.0,
                        "halfAngleDeg": 45.0,
                        "radiusMeters": 200.0
                    }
                }
            }
        """.trimIndent()

        val result = parser.parseInbound(json)

        assertNotNull(result)
        assertTrue(result is ProtocolMessageParser.InboundMessage.FullSync)
        val fullSync = result as ProtocolMessageParser.InboundMessage.FullSync

        assertEquals("SECTOR", fullSync.payload.zoneType)
        assertNotNull(fullSync.payload.sector)
        assertEquals(180.0, fullSync.payload.sector!!.bearingDeg, 0.01)
        assertEquals(45.0, fullSync.payload.sector!!.halfAngleDeg, 0.01)
        assertEquals(200.0, fullSync.payload.sector!!.radiusMeters, 0.01)
    }

    @Test
    fun parseInbound_stateUpdate_parsesCorrectly() {
        val json = """
            {
                "type": "STATE_UPDATE",
                "timestamp": 1234567890,
                "payload": {
                    "currentPos": {"lat": 43.7385, "lng": 7.4247},
                    "gpsAccuracy": 5.0,
                    "distanceToAnchor": 45.5,
                    "alarmState": "SAFE",
                    "sog": 0.5,
                    "cog": 270.0,
                    "batteryLevel": 85.0,
                    "isCharging": false
                }
            }
        """.trimIndent()

        val result = parser.parseInbound(json)

        assertNotNull(result)
        assertTrue(result is ProtocolMessageParser.InboundMessage.StateUpdate)
        val stateUpdate = result as ProtocolMessageParser.InboundMessage.StateUpdate

        assertEquals(43.7385, stateUpdate.payload.currentPos.lat, 0.0001)
        assertEquals(7.4247, stateUpdate.payload.currentPos.lng, 0.0001)
        assertEquals(5.0f, stateUpdate.payload.gpsAccuracy, 0.01f)
        assertEquals(45.5, stateUpdate.payload.distanceToAnchor, 0.01)
        assertEquals("SAFE", stateUpdate.payload.alarmState)
        assertEquals(0.5, stateUpdate.payload.sog!!, 0.01)
        assertEquals(270.0, stateUpdate.payload.cog!!, 0.01)
        assertEquals(85.0, stateUpdate.payload.batteryLevel!!, 0.01)
        assertFalse(stateUpdate.payload.isCharging!!)
    }

    @Test
    fun parseInbound_triggerAlarm_parsesCorrectly() {
        val json = """
            {
                "type": "TRIGGER_ALARM",
                "payload": {
                    "reason": "OUT_OF_ZONE",
                    "message": "Boat has drifted outside safe zone!",
                    "alarmState": "ALARM"
                }
            }
        """.trimIndent()

        val result = parser.parseInbound(json)

        assertNotNull(result)
        assertTrue(result is ProtocolMessageParser.InboundMessage.TriggerAlarm)
        val triggerAlarm = result as ProtocolMessageParser.InboundMessage.TriggerAlarm

        assertEquals("OUT_OF_ZONE", triggerAlarm.payload.reason)
        assertEquals("Boat has drifted outside safe zone!", triggerAlarm.payload.message)
        assertEquals("ALARM", triggerAlarm.payload.alarmState)
    }

    @Test
    fun parseInbound_ping_parsesCorrectly() {
        val json = """
            {
                "type": "PING",
                "timestamp": 1234567890
            }
        """.trimIndent()

        val result = parser.parseInbound(json)

        assertNotNull(result)
        assertTrue(result is ProtocolMessageParser.InboundMessage.Ping)
        val ping = result as ProtocolMessageParser.InboundMessage.Ping

        assertEquals(1234567890L, ping.timestamp)
    }

    @Test
    fun parseInbound_disconnect_parsesCorrectly() {
        val json = """
            {
                "type": "DISCONNECT",
                "payload": {
                    "reason": "SESSION_ENDED"
                }
            }
        """.trimIndent()

        val result = parser.parseInbound(json)

        assertNotNull(result)
        assertTrue(result is ProtocolMessageParser.InboundMessage.Disconnect)
        val disconnect = result as ProtocolMessageParser.InboundMessage.Disconnect

        assertEquals("SESSION_ENDED", disconnect.payload.reason)
    }

    @Test
    fun parseInbound_unknownType_returnsUnknown() {
        val json = """
            {
                "type": "UNKNOWN_TYPE",
                "payload": {}
            }
        """.trimIndent()

        val result = parser.parseInbound(json)

        assertNotNull(result)
        assertTrue(result is ProtocolMessageParser.InboundMessage.Unknown)
        val unknown = result as ProtocolMessageParser.InboundMessage.Unknown

        assertEquals("UNKNOWN_TYPE", unknown.type)
    }

    @Test
    fun parseInbound_missingType_returnsNull() {
        val json = """
            {
                "payload": {}
            }
        """.trimIndent()

        val result = parser.parseInbound(json)

        assertNull(result)
    }

    @Test
    fun parseInbound_invalidJson_returnsNull() {
        val json = "{ invalid json }"

        val result = parser.parseInbound(json)

        assertNull(result)
    }

    @Test
    fun parseInbound_emptyJson_returnsNull() {
        val result = parser.parseInbound("")

        assertNull(result)
    }

    // ========== Build Outbound Messages ==========

    @Test
    fun buildPing_createsValidJson() {
        val json = parser.buildPing()

        assertNotNull(json)

        val parsed = JsonParser.parseString(json).asJsonObject
        assertEquals("PING", parsed.get("type").asString)
        assertTrue(parsed.has("timestamp"))
    }

    @Test
    fun buildAndroidGpsReport_minimal_createsValidJson() {
        val position = Position(43.7384, 7.4246, accuracy = 5.0f)
        val json = parser.buildAndroidGpsReport(
            position = position,
            distanceToAnchor = 45.5,
            zoneCheckResult = ZoneCheckResult.INSIDE,
            alarmState = AlarmState.SAFE
        )

        assertNotNull(json)

        val parsed = JsonParser.parseString(json).asJsonObject
        assertEquals("ANDROID_GPS_REPORT", parsed.get("type").asString)

        val payload = parsed.get("payload").asJsonObject
        assertEquals(43.7384, payload.get("pos").asJsonObject.get("lat").asDouble, 0.0001)
        assertEquals(7.4246, payload.get("pos").asJsonObject.get("lng").asDouble, 0.0001)
        assertEquals(5.0f, payload.get("accuracy").asFloat, 0.01f)
        assertEquals(45.5, payload.get("distanceToAnchor").asDouble, 0.01)
        assertEquals("INSIDE", payload.get("zoneCheckResult").asString)
        assertEquals("SAFE", payload.get("alarmState").asString)
    }

    @Test
    fun buildAndroidGpsReport_full_createsValidJson() {
        val position = Position(43.7384, 7.4246, accuracy = 5.0f)
        val json = parser.buildAndroidGpsReport(
            position = position,
            distanceToAnchor = 45.5,
            zoneCheckResult = ZoneCheckResult.BUFFER,
            alarmState = AlarmState.CAUTION,
            batteryLevel = 75,
            isCharging = true,
            driftDetected = true,
            driftBearingDeg = 180.0,
            driftSpeedMps = 0.5
        )

        assertNotNull(json)

        val parsed = JsonParser.parseString(json).asJsonObject
        val payload = parsed.get("payload").asJsonObject

        assertEquals("BUFFER", payload.get("zoneCheckResult").asString)
        assertEquals("CAUTION", payload.get("alarmState").asString)
        assertEquals(75, payload.get("batteryLevel").asInt)
        assertTrue(payload.get("isCharging").asBoolean)
        assertTrue(payload.get("driftDetected").asBoolean)
        assertEquals(180.0, payload.get("driftBearingDeg").asDouble, 0.01)
        assertEquals(0.5, payload.get("driftSpeedMps").asDouble, 0.01)
    }

    @Test
    fun buildActionCommand_createsValidJson() {
        val json = parser.buildActionCommand("MUTE_ALARM")

        assertNotNull(json)

        val parsed = JsonParser.parseString(json).asJsonObject
        assertEquals("ACTION_COMMAND", parsed.get("type").asString)

        val payload = parsed.get("payload").asJsonObject
        assertEquals("MUTE_ALARM", payload.get("command").asString)
    }

    @Test
    fun buildFullSync_createsValidJson() {
        val payload = FullSyncPayload(
            isAnchored = true,
            anchorPos = LatLng(43.7384, 7.4246),
            zoneType = "CIRCLE",
            radiusMeters = 100.0,
            bufferRadiusMeters = 150.0,
            chainLengthM = 70.0,
            depthM = 10.0
        )

        val json = parser.buildFullSync(payload)

        assertNotNull(json)

        val parsed = JsonParser.parseString(json).asJsonObject
        assertEquals("FULL_SYNC", parsed.get("type").asString)

        val payloadParsed = parsed.get("payload").asJsonObject
        assertTrue(payloadParsed.get("isAnchored").asBoolean)
        assertEquals("CIRCLE", payloadParsed.get("zoneType").asString)
        assertEquals(100.0, payloadParsed.get("radiusMeters").asDouble, 0.01)
    }

    @Test
    fun buildStateUpdate_createsValidJson() {
        val payload = StateUpdatePayload(
            currentPos = LatLng(43.7384, 7.4246),
            gpsAccuracy = 5.0f,
            distanceToAnchor = 45.5,
            alarmState = "SAFE",
            sog = 0.5,
            cog = 270.0,
            batteryLevel = 85.0,
            isCharging = false
        )

        val json = parser.buildStateUpdate(payload)

        assertNotNull(json)

        val parsed = JsonParser.parseString(json).asJsonObject
        assertEquals("STATE_UPDATE", parsed.get("type").asString)
    }

    @Test
    fun buildTriggerAlarm_createsValidJson() {
        val payload = TriggerAlarmPayload(
            reason = "GPS_LOST",
            message = "GPS signal lost!",
            alarmState = "WARNING"
        )

        val json = parser.buildTriggerAlarm(payload)

        assertNotNull(json)

        val parsed = JsonParser.parseString(json).asJsonObject
        assertEquals("TRIGGER_ALARM", parsed.get("type").asString)

        val payloadParsed = parsed.get("payload").asJsonObject
        assertEquals("GPS_LOST", payloadParsed.get("reason").asString)
        assertEquals("GPS signal lost!", payloadParsed.get("message").asString)
        assertEquals("WARNING", payloadParsed.get("alarmState").asString)
    }

    @Test
    fun buildDisconnect_createsValidJson() {
        val json = parser.buildDisconnect("USER_DISCONNECT")

        assertNotNull(json)

        val parsed = JsonParser.parseString(json).asJsonObject
        assertEquals("DISCONNECT", parsed.get("type").asString)

        val payload = parsed.get("payload").asJsonObject
        assertEquals("USER_DISCONNECT", payload.get("reason").asString)
    }

    // ========== Conversion Helpers ==========

    @Test
    fun toAnchorZone_circle_convertsCorrectly() {
        val payload = FullSyncPayload(
            isAnchored = true,
            anchorPos = LatLng(43.7384, 7.4246),
            zoneType = "CIRCLE",
            radiusMeters = 100.0,
            bufferRadiusMeters = 150.0
        )

        val zone = parser.toAnchorZone(payload)

        assertTrue(zone is AnchorZone.Circle)
        val circle = zone as AnchorZone.Circle

        assertEquals(43.7384, circle.anchorPosition.latitude, 0.0001)
        assertEquals(7.4246, circle.anchorPosition.longitude, 0.0001)
        assertEquals(100.0, circle.radiusMeters, 0.01)
        assertEquals(150.0, circle.bufferRadiusMeters!!, 0.01)
    }

    @Test
    fun toAnchorZone_circleUppercase_convertsCorrectly() {
        val payload = FullSyncPayload(
            isAnchored = true,
            anchorPos = LatLng(43.7384, 7.4246),
            zoneType = "CIRCLE",
            radiusMeters = 100.0
        )

        val zone = parser.toAnchorZone(payload)

        assertTrue(zone is AnchorZone.Circle)
    }

    @Test
    fun toAnchorZone_circleLowercase_convertsCorrectly() {
        val payload = FullSyncPayload(
            isAnchored = true,
            anchorPos = LatLng(43.7384, 7.4246),
            zoneType = "circle",
            radiusMeters = 100.0
        )

        val zone = parser.toAnchorZone(payload)

        assertTrue(zone is AnchorZone.Circle)
    }

    @Test
    fun toAnchorZone_sector_convertsCorrectly() {
        val payload = FullSyncPayload(
            isAnchored = true,
            anchorPos = LatLng(43.7384, 7.4246),
            zoneType = "SECTOR",
            radiusMeters = 50.0,
            bufferRadiusMeters = 80.0,
            sector = SectorPayload(
                bearingDeg = 180.0,
                halfAngleDeg = 45.0,
                radiusMeters = 200.0
            )
        )

        val zone = parser.toAnchorZone(payload)

        assertTrue(zone is AnchorZone.SectorWithCircle)
        val sector = zone as AnchorZone.SectorWithCircle

        assertEquals(43.7384, sector.anchorPosition.latitude, 0.0001)
        assertEquals(7.4246, sector.anchorPosition.longitude, 0.0001)
        assertEquals(50.0, sector.radiusMeters, 0.01)
        assertEquals(80.0, sector.bufferRadiusMeters!!, 0.01)
        assertEquals(200.0, sector.sectorRadiusMeters, 0.01)
        assertEquals(45.0, sector.sectorHalfAngleDeg, 0.01)
        assertEquals(180.0, sector.sectorBearingDeg, 0.01)
    }

    @Test(expected = Exception::class)
    fun toAnchorZone_sectorWithoutSectorPayload_throwsError() {
        val payload = FullSyncPayload(
            isAnchored = true,
            anchorPos = LatLng(43.7384, 7.4246),
            zoneType = "SECTOR",
            radiusMeters = 50.0,
            sector = null // Missing sector payload
        )

        parser.toAnchorZone(payload)
    }

    @Test
    fun parseAlarmState_safe_parsesCorrectly() {
        assertEquals(AlarmState.SAFE, parser.parseAlarmState("SAFE"))
        assertEquals(AlarmState.SAFE, parser.parseAlarmState("safe"))
        assertEquals(AlarmState.SAFE, parser.parseAlarmState("Safe"))
    }

    @Test
    fun parseAlarmState_caution_parsesCorrectly() {
        assertEquals(AlarmState.CAUTION, parser.parseAlarmState("CAUTION"))
        assertEquals(AlarmState.CAUTION, parser.parseAlarmState("caution"))
    }

    @Test
    fun parseAlarmState_warning_parsesCorrectly() {
        assertEquals(AlarmState.WARNING, parser.parseAlarmState("WARNING"))
        assertEquals(AlarmState.WARNING, parser.parseAlarmState("warning"))
    }

    @Test
    fun parseAlarmState_alarm_parsesCorrectly() {
        assertEquals(AlarmState.ALARM, parser.parseAlarmState("ALARM"))
        assertEquals(AlarmState.ALARM, parser.parseAlarmState("alarm"))
    }

    @Test
    fun parseAlarmState_invalid_returnsSafe() {
        assertEquals(AlarmState.SAFE, parser.parseAlarmState("INVALID"))
        assertEquals(AlarmState.SAFE, parser.parseAlarmState(""))
        assertEquals(AlarmState.SAFE, parser.parseAlarmState("123"))
    }

    // ========== Round Trip Tests ==========

    @Test
    fun roundTrip_fullSync_preservesData() {
        val original = FullSyncPayload(
            isAnchored = true,
            anchorPos = LatLng(43.7384, 7.4246),
            zoneType = "CIRCLE",
            radiusMeters = 100.0,
            bufferRadiusMeters = 150.0,
            chainLengthM = 70.0,
            depthM = 10.0
        )

        val json = parser.buildFullSync(original)
        val parsed = parser.parseInbound(json)

        assertTrue(parsed is ProtocolMessageParser.InboundMessage.FullSync)
        val fullSync = (parsed as ProtocolMessageParser.InboundMessage.FullSync).payload

        assertEquals(original.isAnchored, fullSync.isAnchored)
        assertEquals(original.anchorPos.lat, fullSync.anchorPos.lat, 0.0001)
        assertEquals(original.anchorPos.lng, fullSync.anchorPos.lng, 0.0001)
        assertEquals(original.zoneType, fullSync.zoneType)
        assertEquals(original.radiusMeters, fullSync.radiusMeters, 0.01)
        assertEquals(original.bufferRadiusMeters!!, fullSync.bufferRadiusMeters!!, 0.01)
    }

    @Test
    fun roundTrip_stateUpdate_preservesData() {
        val original = StateUpdatePayload(
            currentPos = LatLng(43.7384, 7.4246),
            gpsAccuracy = 5.0f,
            distanceToAnchor = 45.5,
            alarmState = "SAFE",
            sog = 0.5,
            cog = 270.0,
            batteryLevel = 85.0,
            isCharging = false
        )

        val json = parser.buildStateUpdate(original)
        val parsed = parser.parseInbound(json)

        assertTrue(parsed is ProtocolMessageParser.InboundMessage.StateUpdate)
        val stateUpdate = (parsed as ProtocolMessageParser.InboundMessage.StateUpdate).payload

        assertEquals(original.currentPos.lat, stateUpdate.currentPos.lat, 0.0001)
        assertEquals(original.alarmState, stateUpdate.alarmState)
        assertEquals(original.batteryLevel!!, stateUpdate.batteryLevel!!, 0.01)
    }

    // ========== Integration Tests ==========

    @Test
    fun integration_allMessageTypes_parseAndBuildCorrectly() {
        // Test that all message types can be built and parsed
        val messages = listOf(
            parser.buildPing(),
            parser.buildAndroidGpsReport(
                Position(43.7384, 7.4246),
                50.0,
                ZoneCheckResult.INSIDE,
                AlarmState.SAFE
            ),
            parser.buildActionCommand("MUTE_ALARM"),
            parser.buildDisconnect("USER_DISCONNECT")
        )

        messages.forEach { json ->
            val parsed = JsonParser.parseString(json).asJsonObject
            assertTrue(parsed.has("type"))
            assertTrue(parsed.has("timestamp"))
        }
    }

    @Test
    fun integration_fullSyncToAnchorZone_circleWorkflow() {
        val json = """
            {
                "type": "FULL_SYNC",
                "payload": {
                    "isAnchored": true,
                    "anchorPos": {"lat": 43.7384, "lng": 7.4246},
                    "zoneType": "CIRCLE",
                    "radiusMeters": 100.0,
                    "bufferRadiusMeters": 150.0
                }
            }
        """.trimIndent()

        val parsed = parser.parseInbound(json)
        assertTrue(parsed is ProtocolMessageParser.InboundMessage.FullSync)

        val zone = parser.toAnchorZone((parsed as ProtocolMessageParser.InboundMessage.FullSync).payload)
        assertTrue(zone is AnchorZone.Circle)
    }

    @Test
    fun integration_fullSyncToAnchorZone_sectorWorkflow() {
        val json = """
            {
                "type": "FULL_SYNC",
                "payload": {
                    "isAnchored": true,
                    "anchorPos": {"lat": 43.7384, "lng": 7.4246},
                    "zoneType": "SECTOR",
                    "radiusMeters": 50.0,
                    "sector": {
                        "bearingDeg": 180.0,
                        "halfAngleDeg": 45.0,
                        "radiusMeters": 200.0
                    }
                }
            }
        """.trimIndent()

        val parsed = parser.parseInbound(json)
        assertTrue(parsed is ProtocolMessageParser.InboundMessage.FullSync)

        val zone = parser.toAnchorZone((parsed as ProtocolMessageParser.InboundMessage.FullSync).payload)
        assertTrue(zone is AnchorZone.SectorWithCircle)
    }
}
