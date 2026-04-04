package com.hiosdra.openanchor.domain.model

import org.junit.Assert.*
import org.junit.Test

class DomainModelsTest {

    // ============== Position Tests ==============

    @Test
    fun `Position creates with all parameters`() {
        val position = Position(
            latitude = 52.5,
            longitude = 13.4,
            accuracy = 10.0f,
            timestamp = 1000L
        )

        assertEquals(52.5, position.latitude, 0.0001)
        assertEquals(13.4, position.longitude, 0.0001)
        assertEquals(10.0f, position.accuracy, 0.001f)
        assertEquals(1000L, position.timestamp)
    }

    @Test
    fun `Position creates with default accuracy`() {
        val position = Position(
            latitude = 52.5,
            longitude = 13.4
        )

        assertEquals(0f, position.accuracy, 0.001f)
    }

    @Test
    fun `Position creates with default timestamp`() {
        val position = Position(
            latitude = 52.5,
            longitude = 13.4
        )

        assertTrue(position.timestamp > 0)
    }

    @Test
    fun `Position handles extreme coordinates`() {
        val position1 = Position(latitude = 90.0, longitude = 180.0)
        assertEquals(90.0, position1.latitude, 0.0001)
        assertEquals(180.0, position1.longitude, 0.0001)

        val position2 = Position(latitude = -90.0, longitude = -180.0)
        assertEquals(-90.0, position2.latitude, 0.0001)
        assertEquals(-180.0, position2.longitude, 0.0001)
    }

    @Test
    fun `Position handles zero coordinates`() {
        val position = Position(latitude = 0.0, longitude = 0.0)
        assertEquals(0.0, position.latitude, 0.0001)
        assertEquals(0.0, position.longitude, 0.0001)
    }

    @Test
    fun `Position handles high precision coordinates`() {
        val position = Position(
            latitude = 52.123456789,
            longitude = 13.987654321
        )
        assertEquals(52.123456789, position.latitude, 0.000000001)
        assertEquals(13.987654321, position.longitude, 0.000000001)
    }

    @Test
    fun `Position equality works correctly`() {
        val pos1 = Position(52.5, 13.4, 10.0f, 1000L)
        val pos2 = Position(52.5, 13.4, 10.0f, 1000L)
        val pos3 = Position(52.5, 13.4, 10.0f, 2000L)

        assertEquals(pos1, pos2)
        assertNotEquals(pos1, pos3)
    }

    // ============== AnchorZone.Circle Tests ==============

    @Test
    fun `Circle zone creates with all parameters`() {
        val position = Position(52.0, 13.0)
        val circle = AnchorZone.Circle(
            anchorPosition = position,
            radiusMeters = 50.0,
            bufferRadiusMeters = 75.0
        )

        assertEquals(52.0, circle.anchorPosition.latitude, 0.0001)
        assertEquals(13.0, circle.anchorPosition.longitude, 0.0001)
        assertEquals(50.0, circle.radiusMeters, 0.0001)
        assertEquals(75.0, circle.bufferRadiusMeters!!, 0.0001)
    }

    @Test
    fun `Circle zone creates without buffer`() {
        val position = Position(52.0, 13.0)
        val circle = AnchorZone.Circle(
            anchorPosition = position,
            radiusMeters = 50.0,
            bufferRadiusMeters = null
        )

        assertNull(circle.bufferRadiusMeters)
    }

    @Test
    fun `Circle zone handles small radius`() {
        val position = Position(52.0, 13.0)
        val circle = AnchorZone.Circle(
            anchorPosition = position,
            radiusMeters = 1.0,
            bufferRadiusMeters = 2.0
        )

        assertEquals(1.0, circle.radiusMeters, 0.0001)
        assertEquals(2.0, circle.bufferRadiusMeters!!, 0.0001)
    }

    @Test
    fun `Circle zone handles large radius`() {
        val position = Position(52.0, 13.0)
        val circle = AnchorZone.Circle(
            anchorPosition = position,
            radiusMeters = 999999.0,
            bufferRadiusMeters = 1000000.0
        )

        assertEquals(999999.0, circle.radiusMeters, 0.0001)
        assertEquals(1000000.0, circle.bufferRadiusMeters!!, 0.0001)
    }

    @Test
    fun `Circle zone equality works correctly`() {
        val pos1 = Position(52.0, 13.0)
        val pos2 = Position(52.0, 13.0)

        val circle1 = AnchorZone.Circle(pos1, 50.0, 75.0)
        val circle2 = AnchorZone.Circle(pos2, 50.0, 75.0)
        val circle3 = AnchorZone.Circle(pos1, 60.0, 75.0)

        assertEquals(circle1, circle2)
        assertNotEquals(circle1, circle3)
    }

    // ============== AnchorZone.SectorWithCircle Tests ==============

    @Test
    fun `Sector zone creates with all parameters`() {
        val position = Position(52.0, 13.0)
        val sector = AnchorZone.SectorWithCircle(
            anchorPosition = position,
            radiusMeters = 40.0,
            bufferRadiusMeters = 60.0,
            sectorRadiusMeters = 80.0,
            sectorHalfAngleDeg = 45.0,
            sectorBearingDeg = 90.0
        )

        assertEquals(52.0, sector.anchorPosition.latitude, 0.0001)
        assertEquals(13.0, sector.anchorPosition.longitude, 0.0001)
        assertEquals(40.0, sector.radiusMeters, 0.0001)
        assertEquals(60.0, sector.bufferRadiusMeters!!, 0.0001)
        assertEquals(80.0, sector.sectorRadiusMeters, 0.0001)
        assertEquals(45.0, sector.sectorHalfAngleDeg, 0.0001)
        assertEquals(90.0, sector.sectorBearingDeg, 0.0001)
    }

    @Test
    fun `Sector zone handles zero bearing`() {
        val position = Position(52.0, 13.0)
        val sector = AnchorZone.SectorWithCircle(
            anchorPosition = position,
            radiusMeters = 40.0,
            bufferRadiusMeters = null,
            sectorRadiusMeters = 80.0,
            sectorHalfAngleDeg = 45.0,
            sectorBearingDeg = 0.0
        )

        assertEquals(0.0, sector.sectorBearingDeg, 0.0001)
    }

    @Test
    fun `Sector zone handles 360 degree bearing`() {
        val position = Position(52.0, 13.0)
        val sector = AnchorZone.SectorWithCircle(
            anchorPosition = position,
            radiusMeters = 40.0,
            bufferRadiusMeters = null,
            sectorRadiusMeters = 80.0,
            sectorHalfAngleDeg = 45.0,
            sectorBearingDeg = 360.0
        )

        assertEquals(360.0, sector.sectorBearingDeg, 0.0001)
    }

    @Test
    fun `Sector zone handles narrow sector`() {
        val position = Position(52.0, 13.0)
        val sector = AnchorZone.SectorWithCircle(
            anchorPosition = position,
            radiusMeters = 40.0,
            bufferRadiusMeters = null,
            sectorRadiusMeters = 80.0,
            sectorHalfAngleDeg = 10.0,
            sectorBearingDeg = 90.0
        )

        assertEquals(10.0, sector.sectorHalfAngleDeg, 0.0001)
    }

    @Test
    fun `Sector zone handles wide sector`() {
        val position = Position(52.0, 13.0)
        val sector = AnchorZone.SectorWithCircle(
            anchorPosition = position,
            radiusMeters = 40.0,
            bufferRadiusMeters = null,
            sectorRadiusMeters = 80.0,
            sectorHalfAngleDeg = 180.0,
            sectorBearingDeg = 90.0
        )

        assertEquals(180.0, sector.sectorHalfAngleDeg, 0.0001)
    }

    @Test
    fun `Sector zone handles all cardinal directions`() {
        val position = Position(52.0, 13.0)

        val north = AnchorZone.SectorWithCircle(
            anchorPosition = position,
            radiusMeters = 40.0,
            bufferRadiusMeters = null,
            sectorRadiusMeters = 80.0,
            sectorHalfAngleDeg = 45.0,
            sectorBearingDeg = 0.0
        )
        assertEquals(0.0, north.sectorBearingDeg, 0.0001)

        val east = north.copy(sectorBearingDeg = 90.0)
        assertEquals(90.0, east.sectorBearingDeg, 0.0001)

        val south = north.copy(sectorBearingDeg = 180.0)
        assertEquals(180.0, south.sectorBearingDeg, 0.0001)

        val west = north.copy(sectorBearingDeg = 270.0)
        assertEquals(270.0, west.sectorBearingDeg, 0.0001)
    }

    @Test
    fun `Sector zone equality works correctly`() {
        val pos1 = Position(52.0, 13.0)
        val pos2 = Position(52.0, 13.0)

        val sector1 = AnchorZone.SectorWithCircle(pos1, 40.0, null, 80.0, 45.0, 90.0)
        val sector2 = AnchorZone.SectorWithCircle(pos2, 40.0, null, 80.0, 45.0, 90.0)
        val sector3 = AnchorZone.SectorWithCircle(pos1, 40.0, null, 80.0, 45.0, 180.0)

        assertEquals(sector1, sector2)
        assertNotEquals(sector1, sector3)
    }

    // ============== AnchorSession Tests ==============

    @Test
    fun `AnchorSession creates with minimal parameters`() {
        val position = Position(52.0, 13.0)
        val zone = AnchorZone.Circle(position, 50.0, null)

        val session = AnchorSession(
            anchorPosition = position,
            zone = zone
        )

        assertEquals(0, session.id)
        assertEquals(52.0, session.anchorPosition.latitude, 0.0001)
        assertNull(session.endTime)
        assertNull(session.chainLengthM)
        assertNull(session.depthM)
        assertEquals(false, session.alarmTriggered)
        assertEquals(0, session.alarmCount)
        assertEquals(0.0, session.maxDistanceMeters, 0.0001)
        assertEquals(0.0, session.maxSog, 0.0001)
    }

    @Test
    fun `AnchorSession creates with all parameters`() {
        val position = Position(52.0, 13.0)
        val zone = AnchorZone.Circle(position, 50.0, 75.0)

        val session = AnchorSession(
            id = 123,
            anchorPosition = position,
            zone = zone,
            startTime = 1000L,
            endTime = 2000L,
            chainLengthM = 30.0,
            depthM = 10.0,
            alarmTriggered = true,
            alarmCount = 5,
            maxDistanceMeters = 45.0,
            maxSog = 2.5
        )

        assertEquals(123, session.id)
        assertEquals(52.0, session.anchorPosition.latitude, 0.0001)
        assertEquals(2000L, session.endTime)
        assertEquals(30.0, session.chainLengthM!!, 0.0001)
        assertEquals(10.0, session.depthM!!, 0.0001)
        assertTrue(session.alarmTriggered)
        assertEquals(5, session.alarmCount)
        assertEquals(45.0, session.maxDistanceMeters, 0.0001)
        assertEquals(2.5, session.maxSog, 0.0001)
    }

    @Test
    fun `AnchorSession with Circle zone`() {
        val position = Position(52.0, 13.0)
        val zone = AnchorZone.Circle(position, 50.0, 75.0)
        val session = AnchorSession(anchorPosition = position, zone = zone)

        assertTrue(session.zone is AnchorZone.Circle)
        assertEquals(50.0, session.zone.radiusMeters, 0.0001)
    }

    @Test
    fun `AnchorSession with Sector zone`() {
        val position = Position(52.0, 13.0)
        val zone = AnchorZone.SectorWithCircle(
            anchorPosition = position,
            radiusMeters = 40.0,
            bufferRadiusMeters = 60.0,
            sectorRadiusMeters = 80.0,
            sectorHalfAngleDeg = 45.0,
            sectorBearingDeg = 90.0
        )
        val session = AnchorSession(anchorPosition = position, zone = zone)

        assertTrue(session.zone is AnchorZone.SectorWithCircle)
        assertEquals(40.0, session.zone.radiusMeters, 0.0001)
    }

    @Test
    fun `AnchorSession handles no alarm`() {
        val position = Position(52.0, 13.0)
        val zone = AnchorZone.Circle(position, 50.0, null)
        val session = AnchorSession(anchorPosition = position, zone = zone)

        assertFalse(session.alarmTriggered)
        assertEquals(0, session.alarmCount)
    }

    @Test
    fun `AnchorSession handles multiple alarms`() {
        val position = Position(52.0, 13.0)
        val zone = AnchorZone.Circle(position, 50.0, null)
        val session = AnchorSession(
            anchorPosition = position,
            zone = zone,
            alarmTriggered = true,
            alarmCount = 10
        )

        assertTrue(session.alarmTriggered)
        assertEquals(10, session.alarmCount)
    }

    @Test
    fun `AnchorSession handles long duration`() {
        val position = Position(52.0, 13.0)
        val zone = AnchorZone.Circle(position, 50.0, null)
        val session = AnchorSession(
            anchorPosition = position,
            zone = zone,
            startTime = 1000000000000L,
            endTime = 1000086400000L // 24 hours later
        )

        val duration = session.endTime!! - session.startTime
        assertEquals(86_400_000L, duration) // 24 hours in milliseconds
    }

    @Test
    fun `AnchorSession equality works correctly`() {
        val pos1 = Position(52.0, 13.0)
        val zone1 = AnchorZone.Circle(pos1, 50.0, null)

        val session1 = AnchorSession(id = 1, anchorPosition = pos1, zone = zone1, startTime = 1000L)
        val session2 = AnchorSession(id = 1, anchorPosition = pos1, zone = zone1, startTime = 1000L)
        val session3 = AnchorSession(id = 2, anchorPosition = pos1, zone = zone1, startTime = 1000L)

        assertEquals(session1, session2)
        assertNotEquals(session1, session3)
    }

    // ============== TrackPoint Tests ==============

    @Test
    fun `TrackPoint creates with all parameters`() {
        val position = Position(52.0, 13.0, 10.0f, 1000L)
        val trackPoint = TrackPoint(
            id = 100,
            sessionId = 5,
            position = position,
            distanceToAnchor = 25.5f,
            isAlarm = true,
            alarmState = "ALARM"
        )

        assertEquals(100, trackPoint.id)
        assertEquals(5, trackPoint.sessionId)
        assertEquals(52.0, trackPoint.position.latitude, 0.0001)
        assertEquals(25.5f, trackPoint.distanceToAnchor, 0.001f)
        assertTrue(trackPoint.isAlarm)
        assertEquals("ALARM", trackPoint.alarmState)
    }

    @Test
    fun `TrackPoint creates with defaults`() {
        val position = Position(52.0, 13.0)
        val trackPoint = TrackPoint(
            sessionId = 5,
            position = position,
            distanceToAnchor = 25.5f
        )

        assertEquals(0, trackPoint.id)
        assertFalse(trackPoint.isAlarm)
        assertEquals("SAFE", trackPoint.alarmState)
    }

    @Test
    fun `TrackPoint handles zero distance`() {
        val position = Position(52.0, 13.0)
        val trackPoint = TrackPoint(
            sessionId = 5,
            position = position,
            distanceToAnchor = 0.0f
        )

        assertEquals(0.0f, trackPoint.distanceToAnchor, 0.001f)
    }

    @Test
    fun `TrackPoint handles large distance`() {
        val position = Position(52.0, 13.0)
        val trackPoint = TrackPoint(
            sessionId = 5,
            position = position,
            distanceToAnchor = 99999.9f
        )

        assertEquals(99999.9f, trackPoint.distanceToAnchor, 0.1f)
    }

    @Test
    fun `TrackPoint handles all alarm states`() {
        val position = Position(52.0, 13.0)

        val safe = TrackPoint(sessionId = 1, position = position, distanceToAnchor = 10f, alarmState = "SAFE")
        assertEquals("SAFE", safe.alarmState)

        val caution = TrackPoint(sessionId = 1, position = position, distanceToAnchor = 10f, alarmState = "CAUTION")
        assertEquals("CAUTION", caution.alarmState)

        val warning = TrackPoint(sessionId = 1, position = position, distanceToAnchor = 10f, alarmState = "WARNING")
        assertEquals("WARNING", warning.alarmState)

        val alarm = TrackPoint(sessionId = 1, position = position, distanceToAnchor = 10f, alarmState = "ALARM")
        assertEquals("ALARM", alarm.alarmState)
    }

    @Test
    fun `TrackPoint equality works correctly`() {
        val pos1 = Position(52.0, 13.0, 10.0f, 1000L)
        val pos2 = Position(52.0, 13.0, 10.0f, 1000L)

        val track1 = TrackPoint(id = 1, sessionId = 5, position = pos1, distanceToAnchor = 25.5f)
        val track2 = TrackPoint(id = 1, sessionId = 5, position = pos2, distanceToAnchor = 25.5f)
        val track3 = TrackPoint(id = 2, sessionId = 5, position = pos1, distanceToAnchor = 25.5f)

        assertEquals(track1, track2)
        assertNotEquals(track1, track3)
    }

    // ============== LogbookEntry Tests ==============

    @Test
    fun `LogbookEntry creates with all parameters`() {
        val entry = LogbookEntry(
            id = 200,
            sessionId = 9,
            createdAt = 1000L,
            summary = "Test summary",
            logEntry = "Detailed log entry text",
            safetyNote = "All good",
            isAiGenerated = true
        )

        assertEquals(200, entry.id)
        assertEquals(9, entry.sessionId)
        assertEquals(1000L, entry.createdAt)
        assertEquals("Test summary", entry.summary)
        assertEquals("Detailed log entry text", entry.logEntry)
        assertEquals("All good", entry.safetyNote)
        assertTrue(entry.isAiGenerated)
    }

    @Test
    fun `LogbookEntry creates with defaults`() {
        val entry = LogbookEntry(
            sessionId = 9,
            summary = "Test summary",
            logEntry = "Detailed log",
            safetyNote = "All good"
        )

        assertEquals(0, entry.id)
        assertTrue(entry.createdAt > 0)
        assertTrue(entry.isAiGenerated)
    }

    @Test
    fun `LogbookEntry handles manual entry`() {
        val entry = LogbookEntry(
            sessionId = 9,
            summary = "Manual entry",
            logEntry = "User-written log",
            safetyNote = "Check weather",
            isAiGenerated = false
        )

        assertFalse(entry.isAiGenerated)
    }

    @Test
    fun `LogbookEntry handles empty strings`() {
        val entry = LogbookEntry(
            sessionId = 9,
            summary = "",
            logEntry = "",
            safetyNote = ""
        )

        assertEquals("", entry.summary)
        assertEquals("", entry.logEntry)
        assertEquals("", entry.safetyNote)
    }

    @Test
    fun `LogbookEntry handles long text`() {
        val longText = "A".repeat(10000)
        val entry = LogbookEntry(
            sessionId = 9,
            summary = longText,
            logEntry = longText,
            safetyNote = longText
        )

        assertEquals(10000, entry.summary.length)
        assertEquals(10000, entry.logEntry.length)
        assertEquals(10000, entry.safetyNote.length)
    }

    @Test
    fun `LogbookEntry equality works correctly`() {
        val entry1 = LogbookEntry(
            id = 1,
            sessionId = 9,
            createdAt = 1000L,
            summary = "Test",
            logEntry = "Log",
            safetyNote = "Safe"
        )
        val entry2 = LogbookEntry(
            id = 1,
            sessionId = 9,
            createdAt = 1000L,
            summary = "Test",
            logEntry = "Log",
            safetyNote = "Safe"
        )
        val entry3 = LogbookEntry(
            id = 2,
            sessionId = 9,
            createdAt = 1000L,
            summary = "Test",
            logEntry = "Log",
            safetyNote = "Safe"
        )

        assertEquals(entry1, entry2)
        assertNotEquals(entry1, entry3)
    }

    // ============== AlarmState Tests ==============

    @Test
    fun `AlarmState enum has all expected values`() {
        val states = AlarmState.values()
        assertEquals(4, states.size)
        assertTrue(states.contains(AlarmState.SAFE))
        assertTrue(states.contains(AlarmState.CAUTION))
        assertTrue(states.contains(AlarmState.WARNING))
        assertTrue(states.contains(AlarmState.ALARM))
    }

    @Test
    fun `AlarmState valueOf works correctly`() {
        assertEquals(AlarmState.SAFE, AlarmState.valueOf("SAFE"))
        assertEquals(AlarmState.CAUTION, AlarmState.valueOf("CAUTION"))
        assertEquals(AlarmState.WARNING, AlarmState.valueOf("WARNING"))
        assertEquals(AlarmState.ALARM, AlarmState.valueOf("ALARM"))
    }

    // ============== Units Tests ==============

    @Test
    fun `DistanceUnit enum has expected values`() {
        val units = DistanceUnit.values()
        assertEquals(3, units.size)
        assertTrue(units.contains(DistanceUnit.METERS))
        assertTrue(units.contains(DistanceUnit.FEET))
        assertTrue(units.contains(DistanceUnit.NAUTICAL_MILES))
    }

    @Test
    fun `DistanceUnit has correct labels`() {
        assertEquals("m", DistanceUnit.METERS.label)
        assertEquals("ft", DistanceUnit.FEET.label)
        assertEquals("nm", DistanceUnit.NAUTICAL_MILES.label)
    }

    @Test
    fun `DepthUnit enum has expected values`() {
        val units = DepthUnit.values()
        assertEquals(2, units.size)
        assertTrue(units.contains(DepthUnit.METERS))
        assertTrue(units.contains(DepthUnit.FEET))
    }

    @Test
    fun `DepthUnit has correct labels`() {
        assertEquals("m", DepthUnit.METERS.label)
        assertEquals("ft", DepthUnit.FEET.label)
    }
}
