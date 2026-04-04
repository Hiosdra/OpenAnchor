package com.hiosdra.openanchor.network

import com.hiosdra.openanchor.domain.model.AlarmState
import org.junit.Assert.*
import org.junit.Test

class ProtocolMessagesTest {

    @Test
    fun `MessageType has expected entries`() {
        assertEquals(7, MessageType.entries.size)
        assertTrue(MessageType.entries.contains(MessageType.FULL_SYNC))
        assertTrue(MessageType.entries.contains(MessageType.STATE_UPDATE))
        assertTrue(MessageType.entries.contains(MessageType.TRIGGER_ALARM))
        assertTrue(MessageType.entries.contains(MessageType.ANDROID_GPS_REPORT))
        assertTrue(MessageType.entries.contains(MessageType.ACTION_COMMAND))
        assertTrue(MessageType.entries.contains(MessageType.PING))
        assertTrue(MessageType.entries.contains(MessageType.DISCONNECT))
    }

    @Test
    fun `LatLng holds coordinates`() {
        val pos = LatLng(54.35, 18.65)
        assertEquals(54.35, pos.lat, 0.001)
        assertEquals(18.65, pos.lng, 0.001)
    }

    @Test
    fun `FullSyncPayload holds all fields`() {
        val payload = FullSyncPayload(
            isAnchored = true,
            anchorPos = LatLng(54.35, 18.65),
            zoneType = "CIRCLE",
            radiusMeters = 30.0,
            bufferRadiusMeters = 50.0,
            sector = SectorPayload(bearingDeg = 90.0, halfAngleDeg = 60.0, radiusMeters = 30.0),
            units = "m",
            chainLengthM = 50.0,
            depthM = 10.0
        )
        assertTrue(payload.isAnchored)
        assertEquals("CIRCLE", payload.zoneType)
        assertEquals(30.0, payload.radiusMeters, 0.001)
        assertEquals(50.0, payload.bufferRadiusMeters!!, 0.001)
        assertNotNull(payload.sector)
        assertEquals(50.0, payload.chainLengthM!!, 0.001)
    }

    @Test
    fun `FullSyncPayload default values`() {
        val payload = FullSyncPayload(
            isAnchored = false,
            anchorPos = LatLng(0.0, 0.0),
            zoneType = "CIRCLE",
            radiusMeters = 10.0
        )
        assertNull(payload.bufferRadiusMeters)
        assertNull(payload.sector)
        assertEquals("m", payload.units)
        assertNull(payload.chainLengthM)
        assertNull(payload.depthM)
    }

    @Test
    fun `SectorPayload holds fields`() {
        val sector = SectorPayload(bearingDeg = 180.0, halfAngleDeg = 45.0, radiusMeters = 25.0)
        assertEquals(180.0, sector.bearingDeg, 0.001)
        assertEquals(45.0, sector.halfAngleDeg, 0.001)
        assertEquals(25.0, sector.radiusMeters, 0.001)
    }

    @Test
    fun `StateUpdatePayload holds all fields`() {
        val payload = StateUpdatePayload(
            currentPos = LatLng(54.35, 18.65),
            gpsAccuracy = 5.0f,
            distanceToAnchor = 15.5,
            alarmState = "SAFE",
            sog = 2.0,
            cog = 90.0,
            batteryLevel = 85.0,
            isCharging = true
        )
        assertEquals(5.0f, payload.gpsAccuracy, 0.001f)
        assertEquals(15.5, payload.distanceToAnchor, 0.001)
        assertEquals("SAFE", payload.alarmState)
        assertEquals(2.0, payload.sog!!, 0.001)
        assertEquals(85.0, payload.batteryLevel!!, 0.001)
        assertTrue(payload.isCharging!!)
    }

    @Test
    fun `StateUpdatePayload optional fields default to null`() {
        val payload = StateUpdatePayload(
            currentPos = LatLng(0.0, 0.0),
            gpsAccuracy = 0f,
            distanceToAnchor = 0.0,
            alarmState = "SAFE"
        )
        assertNull(payload.sog)
        assertNull(payload.cog)
        assertNull(payload.batteryLevel)
        assertNull(payload.isCharging)
    }

    @Test
    fun `TriggerAlarmPayload holds fields`() {
        val payload = TriggerAlarmPayload(
            reason = "OUT_OF_ZONE",
            message = "Boat left safe zone",
            alarmState = "ALARM"
        )
        assertEquals("OUT_OF_ZONE", payload.reason)
        assertEquals("Boat left safe zone", payload.message)
        assertEquals("ALARM", payload.alarmState)
    }

    @Test
    fun `DisconnectPayload holds reason`() {
        val payload = DisconnectPayload(reason = "SESSION_ENDED")
        assertEquals("SESSION_ENDED", payload.reason)
    }

    @Test
    fun `AndroidGpsReportPayload holds all fields`() {
        val payload = AndroidGpsReportPayload(
            pos = LatLng(54.35, 18.65),
            accuracy = 3.0f,
            distanceToAnchor = 20.0,
            zoneCheckResult = "INSIDE",
            alarmState = "SAFE",
            batteryLevel = 90,
            isCharging = false,
            driftDetected = true,
            driftBearingDeg = 45.0,
            driftSpeedMps = 0.1
        )
        assertEquals(3.0f, payload.accuracy, 0.001f)
        assertEquals(20.0, payload.distanceToAnchor, 0.001)
        assertEquals("INSIDE", payload.zoneCheckResult)
        assertEquals(90, payload.batteryLevel)
        assertTrue(payload.driftDetected!!)
    }

    @Test
    fun `AndroidGpsReportPayload optional fields default to null`() {
        val payload = AndroidGpsReportPayload(
            pos = LatLng(0.0, 0.0),
            accuracy = 0f,
            distanceToAnchor = 0.0,
            zoneCheckResult = "INSIDE",
            alarmState = "SAFE"
        )
        assertNull(payload.batteryLevel)
        assertNull(payload.isCharging)
        assertNull(payload.driftDetected)
    }

    @Test
    fun `ActionCommandPayload holds command`() {
        val payload = ActionCommandPayload(command = "MUTE_ALARM")
        assertEquals("MUTE_ALARM", payload.command)
    }

    @Test
    fun `ProtocolMessage holds type and timestamp`() {
        val msg = ProtocolMessage(type = "FULL_SYNC", timestamp = 1234567890L, payload = "test")
        assertEquals("FULL_SYNC", msg.type)
        assertEquals(1234567890L, msg.timestamp)
        assertEquals("test", msg.payload)
    }

    @Test
    fun `ProtocolMessage payload is optional`() {
        val msg = ProtocolMessage(type = "PING", timestamp = 1000L)
        assertNull(msg.payload)
    }
}
