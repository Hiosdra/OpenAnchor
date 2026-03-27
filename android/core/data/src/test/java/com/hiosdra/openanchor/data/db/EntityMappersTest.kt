package com.hiosdra.openanchor.data.db

import com.hiosdra.openanchor.domain.model.*
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class EntityMappersTest {

    // ============== AnchorSession <-> Entity Mapping Tests ==============

    @Test
    fun `toDomain converts Circle zone correctly`() {
        val entity = AnchorSessionEntity(
            id = 1,
            anchorLat = 52.5,
            anchorLng = 13.4,
            startTime = 1000L,
            endTime = 2000L,
            zoneType = "CIRCLE",
            radiusMeters = 50.0,
            bufferRadiusMeters = 75.0,
            sectorRadiusMeters = null,
            sectorHalfAngleDeg = null,
            sectorBearingDeg = null,
            chainLengthM = 30.0,
            depthM = 10.0,
            alarmTriggered = true,
            alarmCount = 3,
            maxDistanceMeters = 45.0,
            maxSog = 2.5
        )

        val domain = entity.toDomain()

        assertEquals(1, domain.id)
        assertEquals(52.5, domain.anchorPosition.latitude, 0.0001)
        assertEquals(13.4, domain.anchorPosition.longitude, 0.0001)
        assertEquals(1000L, domain.startTime)
        assertEquals(2000L, domain.endTime)
        assertTrue(domain.zone is AnchorZone.Circle)
        assertEquals(50.0, domain.zone.radiusMeters, 0.0001)
        assertEquals(75.0, domain.zone.bufferRadiusMeters!!, 0.0001)
        assertEquals(30.0, domain.chainLengthM!!, 0.0001)
        assertEquals(10.0, domain.depthM!!, 0.0001)
        assertTrue(domain.alarmTriggered)
        assertEquals(3, domain.alarmCount)
        assertEquals(45.0, domain.maxDistanceMeters, 0.0001)
        assertEquals(2.5, domain.maxSog, 0.0001)
    }

    @Test
    fun `toDomain converts Sector zone correctly`() {
        val entity = AnchorSessionEntity(
            id = 2,
            anchorLat = 50.0,
            anchorLng = 10.0,
            startTime = 3000L,
            endTime = null,
            zoneType = "SECTOR",
            radiusMeters = 40.0,
            bufferRadiusMeters = null,
            sectorRadiusMeters = 80.0,
            sectorHalfAngleDeg = 45.0,
            sectorBearingDeg = 90.0,
            chainLengthM = null,
            depthM = null,
            alarmTriggered = false,
            alarmCount = 0,
            maxDistanceMeters = 0.0,
            maxSog = 0.0
        )

        val domain = entity.toDomain()

        assertEquals(2, domain.id)
        assertEquals(50.0, domain.anchorPosition.latitude, 0.0001)
        assertEquals(10.0, domain.anchorPosition.longitude, 0.0001)
        assertEquals(3000L, domain.startTime)
        assertNull(domain.endTime)
        assertTrue(domain.zone is AnchorZone.SectorWithCircle)
        val sector = domain.zone as AnchorZone.SectorWithCircle
        assertEquals(40.0, sector.radiusMeters, 0.0001)
        assertNull(sector.bufferRadiusMeters)
        assertEquals(80.0, sector.sectorRadiusMeters, 0.0001)
        assertEquals(45.0, sector.sectorHalfAngleDeg, 0.0001)
        assertEquals(90.0, sector.sectorBearingDeg, 0.0001)
        assertNull(domain.chainLengthM)
        assertNull(domain.depthM)
        assertEquals(false, domain.alarmTriggered)
        assertEquals(0, domain.alarmCount)
    }

    @Test
    fun `toDomain defaults sector parameters when null for SECTOR type`() {
        val entity = AnchorSessionEntity(
            id = 3,
            anchorLat = 51.0,
            anchorLng = 11.0,
            startTime = 4000L,
            endTime = null,
            zoneType = "SECTOR",
            radiusMeters = 50.0,
            bufferRadiusMeters = 60.0,
            sectorRadiusMeters = null, // Should default to radiusMeters
            sectorHalfAngleDeg = null,  // Should default to 60.0
            sectorBearingDeg = null     // Should default to 0.0
        )

        val domain = entity.toDomain()

        assertTrue(domain.zone is AnchorZone.SectorWithCircle)
        val sector = domain.zone as AnchorZone.SectorWithCircle
        assertEquals(50.0, sector.sectorRadiusMeters, 0.0001) // Defaults to radiusMeters
        assertEquals(60.0, sector.sectorHalfAngleDeg, 0.0001)  // Defaults to 60.0
        assertEquals(0.0, sector.sectorBearingDeg, 0.0001)     // Defaults to 0.0
    }

    @Test
    fun `toDomain handles unknown zone type as Circle`() {
        val entity = AnchorSessionEntity(
            id = 4,
            anchorLat = 48.0,
            anchorLng = 8.0,
            startTime = 5000L,
            endTime = null,
            zoneType = "UNKNOWN",
            radiusMeters = 30.0,
            bufferRadiusMeters = null
        )

        val domain = entity.toDomain()

        assertTrue(domain.zone is AnchorZone.Circle)
    }

    @Test
    fun `toEntity converts Circle zone correctly`() {
        val domain = AnchorSession(
            id = 10,
            anchorPosition = Position(latitude = 53.5, longitude = 14.4),
            zone = AnchorZone.Circle(
                anchorPosition = Position(latitude = 53.5, longitude = 14.4),
                radiusMeters = 60.0,
                bufferRadiusMeters = 80.0
            ),
            startTime = 6000L,
            endTime = 7000L,
            chainLengthM = 35.0,
            depthM = 12.0,
            alarmTriggered = true,
            alarmCount = 5,
            maxDistanceMeters = 55.0,
            maxSog = 3.0
        )

        val entity = domain.toEntity()

        assertEquals(10, entity.id)
        assertEquals(53.5, entity.anchorLat, 0.0001)
        assertEquals(14.4, entity.anchorLng, 0.0001)
        assertEquals(6000L, entity.startTime)
        assertEquals(7000L, entity.endTime)
        assertEquals("CIRCLE", entity.zoneType)
        assertEquals(60.0, entity.radiusMeters, 0.0001)
        assertEquals(80.0, entity.bufferRadiusMeters!!, 0.0001)
        assertNull(entity.sectorRadiusMeters)
        assertNull(entity.sectorHalfAngleDeg)
        assertNull(entity.sectorBearingDeg)
        assertEquals(35.0, entity.chainLengthM!!, 0.0001)
        assertEquals(12.0, entity.depthM!!, 0.0001)
        assertTrue(entity.alarmTriggered)
        assertEquals(5, entity.alarmCount)
        assertEquals(55.0, entity.maxDistanceMeters, 0.0001)
        assertEquals(3.0, entity.maxSog, 0.0001)
    }

    @Test
    fun `toEntity converts Sector zone correctly`() {
        val domain = AnchorSession(
            id = 11,
            anchorPosition = Position(latitude = 52.0, longitude = 12.0),
            zone = AnchorZone.SectorWithCircle(
                anchorPosition = Position(latitude = 52.0, longitude = 12.0),
                radiusMeters = 45.0,
                bufferRadiusMeters = 65.0,
                sectorRadiusMeters = 90.0,
                sectorHalfAngleDeg = 50.0,
                sectorBearingDeg = 180.0
            ),
            startTime = 8000L,
            endTime = null,
            chainLengthM = null,
            depthM = null,
            alarmTriggered = false,
            alarmCount = 0,
            maxDistanceMeters = 0.0,
            maxSog = 0.0
        )

        val entity = domain.toEntity()

        assertEquals(11, entity.id)
        assertEquals(52.0, entity.anchorLat, 0.0001)
        assertEquals(12.0, entity.anchorLng, 0.0001)
        assertEquals(8000L, entity.startTime)
        assertNull(entity.endTime)
        assertEquals("SECTOR", entity.zoneType)
        assertEquals(45.0, entity.radiusMeters, 0.0001)
        assertEquals(65.0, entity.bufferRadiusMeters!!, 0.0001)
        assertEquals(90.0, entity.sectorRadiusMeters!!, 0.0001)
        assertEquals(50.0, entity.sectorHalfAngleDeg!!, 0.0001)
        assertEquals(180.0, entity.sectorBearingDeg!!, 0.0001)
        assertNull(entity.chainLengthM)
        assertNull(entity.depthM)
        assertEquals(false, entity.alarmTriggered)
        assertEquals(0, entity.alarmCount)
    }

    @Test
    fun `AnchorSession roundtrip preserves Circle data`() {
        val original = AnchorSession(
            id = 20,
            anchorPosition = Position(latitude = 55.5, longitude = 15.5),
            zone = AnchorZone.Circle(
                anchorPosition = Position(latitude = 55.5, longitude = 15.5),
                radiusMeters = 70.0,
                bufferRadiusMeters = 90.0
            ),
            startTime = 9000L,
            endTime = 10000L,
            chainLengthM = 40.0,
            depthM = 15.0,
            alarmTriggered = true,
            alarmCount = 7,
            maxDistanceMeters = 65.0,
            maxSog = 4.0
        )

        val roundtrip = original.toEntity().toDomain()

        assertEquals(original.id, roundtrip.id)
        assertEquals(original.anchorPosition.latitude, roundtrip.anchorPosition.latitude, 0.0001)
        assertEquals(original.anchorPosition.longitude, roundtrip.anchorPosition.longitude, 0.0001)
        assertEquals(original.startTime, roundtrip.startTime)
        assertEquals(original.endTime, roundtrip.endTime)
        assertTrue(roundtrip.zone is AnchorZone.Circle)
        assertEquals(original.zone.radiusMeters, roundtrip.zone.radiusMeters, 0.0001)
        assertEquals(original.zone.bufferRadiusMeters, roundtrip.zone.bufferRadiusMeters)
        assertEquals(original.chainLengthM, roundtrip.chainLengthM)
        assertEquals(original.depthM, roundtrip.depthM)
        assertEquals(original.alarmTriggered, roundtrip.alarmTriggered)
        assertEquals(original.alarmCount, roundtrip.alarmCount)
        assertEquals(original.maxDistanceMeters, roundtrip.maxDistanceMeters, 0.0001)
        assertEquals(original.maxSog, roundtrip.maxSog, 0.0001)
    }

    @Test
    fun `AnchorSession roundtrip preserves Sector data`() {
        val original = AnchorSession(
            id = 21,
            anchorPosition = Position(latitude = 54.0, longitude = 13.0),
            zone = AnchorZone.SectorWithCircle(
                anchorPosition = Position(latitude = 54.0, longitude = 13.0),
                radiusMeters = 50.0,
                bufferRadiusMeters = null,
                sectorRadiusMeters = 100.0,
                sectorHalfAngleDeg = 70.0,
                sectorBearingDeg = 270.0
            ),
            startTime = 11000L,
            endTime = null,
            chainLengthM = null,
            depthM = null,
            alarmTriggered = false,
            alarmCount = 0,
            maxDistanceMeters = 0.0,
            maxSog = 0.0
        )

        val roundtrip = original.toEntity().toDomain()

        assertEquals(original.id, roundtrip.id)
        assertEquals(original.anchorPosition.latitude, roundtrip.anchorPosition.latitude, 0.0001)
        assertEquals(original.anchorPosition.longitude, roundtrip.anchorPosition.longitude, 0.0001)
        assertTrue(roundtrip.zone is AnchorZone.SectorWithCircle)
        val origSector = original.zone as AnchorZone.SectorWithCircle
        val rtSector = roundtrip.zone as AnchorZone.SectorWithCircle
        assertEquals(origSector.radiusMeters, rtSector.radiusMeters, 0.0001)
        assertEquals(origSector.bufferRadiusMeters, rtSector.bufferRadiusMeters)
        assertEquals(origSector.sectorRadiusMeters, rtSector.sectorRadiusMeters, 0.0001)
        assertEquals(origSector.sectorHalfAngleDeg, rtSector.sectorHalfAngleDeg, 0.0001)
        assertEquals(origSector.sectorBearingDeg, rtSector.sectorBearingDeg, 0.0001)
    }

    // ============== TrackPoint <-> Entity Mapping Tests ==============

    @Test
    fun `TrackPointEntity toDomain converts correctly`() {
        val entity = TrackPointEntity(
            id = 100,
            sessionId = 5,
            lat = 51.5,
            lng = 12.5,
            accuracy = 10.5f,
            timestamp = 12000L,
            distanceToAnchor = 25.5f,
            isAlarm = true,
            alarmState = "ALARM"
        )

        val domain = entity.toDomain()

        assertEquals(100, domain.id)
        assertEquals(5, domain.sessionId)
        assertEquals(51.5, domain.position.latitude, 0.0001)
        assertEquals(12.5, domain.position.longitude, 0.0001)
        assertEquals(10.5f, domain.position.accuracy, 0.0001f)
        assertEquals(12000L, domain.position.timestamp)
        assertEquals(25.5f, domain.distanceToAnchor, 0.0001f)
        assertTrue(domain.isAlarm)
        assertEquals("ALARM", domain.alarmState)
    }

    @Test
    fun `TrackPoint toEntity converts correctly`() {
        val domain = TrackPoint(
            id = 101,
            sessionId = 6,
            position = Position(
                latitude = 52.5,
                longitude = 13.5,
                accuracy = 15.0f,
                timestamp = 13000L
            ),
            distanceToAnchor = 30.0f,
            isAlarm = false,
            alarmState = "SAFE"
        )

        val entity = domain.toEntity()

        assertEquals(101, entity.id)
        assertEquals(6, entity.sessionId)
        assertEquals(52.5, entity.lat, 0.0001)
        assertEquals(13.5, entity.lng, 0.0001)
        assertEquals(15.0f, entity.accuracy, 0.0001f)
        assertEquals(13000L, entity.timestamp)
        assertEquals(30.0f, entity.distanceToAnchor, 0.0001f)
        assertEquals(false, entity.isAlarm)
        assertEquals("SAFE", entity.alarmState)
    }

    @Test
    fun `TrackPoint roundtrip preserves data`() {
        val original = TrackPoint(
            id = 102,
            sessionId = 7,
            position = Position(
                latitude = 53.0,
                longitude = 14.0,
                accuracy = 20.0f,
                timestamp = 14000L
            ),
            distanceToAnchor = 35.0f,
            isAlarm = true,
            alarmState = "CAUTION"
        )

        val roundtrip = original.toEntity().toDomain()

        assertEquals(original.id, roundtrip.id)
        assertEquals(original.sessionId, roundtrip.sessionId)
        assertEquals(original.position.latitude, roundtrip.position.latitude, 0.0001)
        assertEquals(original.position.longitude, roundtrip.position.longitude, 0.0001)
        assertEquals(original.position.accuracy, roundtrip.position.accuracy, 0.0001f)
        assertEquals(original.position.timestamp, roundtrip.position.timestamp)
        assertEquals(original.distanceToAnchor, roundtrip.distanceToAnchor, 0.0001f)
        assertEquals(original.isAlarm, roundtrip.isAlarm)
        assertEquals(original.alarmState, roundtrip.alarmState)
    }

    @Test
    fun `TrackPoint handles default values`() {
        val entity = TrackPointEntity(
            id = 0, // Default
            sessionId = 8,
            lat = 50.0,
            lng = 10.0,
            accuracy = 5.0f,
            timestamp = 15000L,
            distanceToAnchor = 10.0f,
            isAlarm = false, // Default
            alarmState = "SAFE" // Default
        )

        val domain = entity.toDomain()

        assertEquals(0, domain.id)
        assertEquals(false, domain.isAlarm)
        assertEquals("SAFE", domain.alarmState)
    }

    // ============== LogbookEntry <-> Entity Mapping Tests ==============

    @Test
    fun `LogbookEntryEntity toDomain converts correctly`() {
        val entity = LogbookEntryEntity(
            id = 200,
            sessionId = 9,
            createdAt = 16000L,
            summary = "Test summary",
            logEntry = "Detailed log entry text",
            safetyNote = "All good",
            isAiGenerated = true
        )

        val domain = entity.toDomain()

        assertEquals(200, domain.id)
        assertEquals(9, domain.sessionId)
        assertEquals(16000L, domain.createdAt)
        assertEquals("Test summary", domain.summary)
        assertEquals("Detailed log entry text", domain.logEntry)
        assertEquals("All good", domain.safetyNote)
        assertTrue(domain.isAiGenerated)
    }

    @Test
    fun `LogbookEntry toEntity converts correctly`() {
        val domain = LogbookEntry(
            id = 201,
            sessionId = 10,
            createdAt = 17000L,
            summary = "Another summary",
            logEntry = "Another log entry",
            safetyNote = "No issues",
            isAiGenerated = false
        )

        val entity = domain.toEntity()

        assertEquals(201, entity.id)
        assertEquals(10, entity.sessionId)
        assertEquals(17000L, entity.createdAt)
        assertEquals("Another summary", entity.summary)
        assertEquals("Another log entry", entity.logEntry)
        assertEquals("No issues", entity.safetyNote)
        assertEquals(false, entity.isAiGenerated)
    }

    @Test
    fun `LogbookEntry roundtrip preserves data`() {
        val original = LogbookEntry(
            id = 202,
            sessionId = 11,
            createdAt = 18000L,
            summary = "Final summary",
            logEntry = "Final log entry text with details",
            safetyNote = "Exercise caution",
            isAiGenerated = true
        )

        val roundtrip = original.toEntity().toDomain()

        assertEquals(original.id, roundtrip.id)
        assertEquals(original.sessionId, roundtrip.sessionId)
        assertEquals(original.createdAt, roundtrip.createdAt)
        assertEquals(original.summary, roundtrip.summary)
        assertEquals(original.logEntry, roundtrip.logEntry)
        assertEquals(original.safetyNote, roundtrip.safetyNote)
        assertEquals(original.isAiGenerated, roundtrip.isAiGenerated)
    }

    @Test
    fun `LogbookEntry handles default values`() {
        val entity = LogbookEntryEntity(
            id = 0, // Default
            sessionId = 12,
            summary = "Default test",
            logEntry = "Default entry",
            safetyNote = "Default safety"
            // createdAt and isAiGenerated use defaults
        )

        val domain = entity.toDomain()

        assertEquals(0, domain.id)
        assertTrue(domain.createdAt > 0) // Should have a timestamp
        assertTrue(domain.isAiGenerated) // Default is true
    }

    @Test
    fun `LogbookEntry handles empty strings`() {
        val domain = LogbookEntry(
            id = 203,
            sessionId = 13,
            createdAt = 19000L,
            summary = "",
            logEntry = "",
            safetyNote = "",
            isAiGenerated = false
        )

        val roundtrip = domain.toEntity().toDomain()

        assertEquals("", roundtrip.summary)
        assertEquals("", roundtrip.logEntry)
        assertEquals("", roundtrip.safetyNote)
    }

    @Test
    fun `LogbookEntry handles long text`() {
        val longText = "A".repeat(10000)
        val domain = LogbookEntry(
            id = 204,
            sessionId = 14,
            createdAt = 20000L,
            summary = longText,
            logEntry = longText,
            safetyNote = longText,
            isAiGenerated = true
        )

        val roundtrip = domain.toEntity().toDomain()

        assertEquals(longText, roundtrip.summary)
        assertEquals(longText, roundtrip.logEntry)
        assertEquals(longText, roundtrip.safetyNote)
    }

    // ============== Edge Case Tests ==============

    @Test
    fun `AnchorSession handles extreme coordinates`() {
        val domain = AnchorSession(
            id = 30,
            anchorPosition = Position(latitude = -90.0, longitude = -180.0),
            zone = AnchorZone.Circle(
                anchorPosition = Position(latitude = -90.0, longitude = -180.0),
                radiusMeters = 1.0,
                bufferRadiusMeters = null
            ),
            startTime = 21000L
        )

        val roundtrip = domain.toEntity().toDomain()

        assertEquals(-90.0, roundtrip.anchorPosition.latitude, 0.0001)
        assertEquals(-180.0, roundtrip.anchorPosition.longitude, 0.0001)
    }

    @Test
    fun `AnchorSession handles extreme positive coordinates`() {
        val domain = AnchorSession(
            id = 31,
            anchorPosition = Position(latitude = 90.0, longitude = 180.0),
            zone = AnchorZone.Circle(
                anchorPosition = Position(latitude = 90.0, longitude = 180.0),
                radiusMeters = 1.0,
                bufferRadiusMeters = null
            ),
            startTime = 22000L
        )

        val roundtrip = domain.toEntity().toDomain()

        assertEquals(90.0, roundtrip.anchorPosition.latitude, 0.0001)
        assertEquals(180.0, roundtrip.anchorPosition.longitude, 0.0001)
    }

    @Test
    fun `AnchorSession handles very large radius`() {
        val domain = AnchorSession(
            id = 32,
            anchorPosition = Position(latitude = 0.0, longitude = 0.0),
            zone = AnchorZone.Circle(
                anchorPosition = Position(latitude = 0.0, longitude = 0.0),
                radiusMeters = 999999.0,
                bufferRadiusMeters = 1000000.0
            ),
            startTime = 23000L
        )

        val roundtrip = domain.toEntity().toDomain()

        assertEquals(999999.0, roundtrip.zone.radiusMeters, 0.0001)
        assertEquals(1000000.0, roundtrip.zone.bufferRadiusMeters!!, 0.0001)
    }

    @Test
    fun `Sector handles extreme angles`() {
        val domain = AnchorSession(
            id = 33,
            anchorPosition = Position(latitude = 0.0, longitude = 0.0),
            zone = AnchorZone.SectorWithCircle(
                anchorPosition = Position(latitude = 0.0, longitude = 0.0),
                radiusMeters = 50.0,
                bufferRadiusMeters = null,
                sectorRadiusMeters = 100.0,
                sectorHalfAngleDeg = 180.0,
                sectorBearingDeg = 360.0
            ),
            startTime = 24000L
        )

        val roundtrip = domain.toEntity().toDomain()

        val sector = roundtrip.zone as AnchorZone.SectorWithCircle
        assertEquals(180.0, sector.sectorHalfAngleDeg, 0.0001)
        assertEquals(360.0, sector.sectorBearingDeg, 0.0001)
    }

    @Test
    fun `TrackPoint handles zero accuracy`() {
        val domain = TrackPoint(
            id = 103,
            sessionId = 15,
            position = Position(
                latitude = 50.0,
                longitude = 10.0,
                accuracy = 0.0f,
                timestamp = 25000L
            ),
            distanceToAnchor = 0.0f,
            isAlarm = false,
            alarmState = "SAFE"
        )

        val roundtrip = domain.toEntity().toDomain()

        assertEquals(0.0f, roundtrip.position.accuracy, 0.0001f)
        assertEquals(0.0f, roundtrip.distanceToAnchor, 0.0001f)
    }

    @Test
    fun `TrackPoint handles high accuracy value`() {
        val domain = TrackPoint(
            id = 104,
            sessionId = 16,
            position = Position(
                latitude = 50.0,
                longitude = 10.0,
                accuracy = 9999.9f,
                timestamp = 26000L
            ),
            distanceToAnchor = 9999.9f,
            isAlarm = false,
            alarmState = "SAFE"
        )

        val roundtrip = domain.toEntity().toDomain()

        assertEquals(9999.9f, roundtrip.position.accuracy, 0.1f)
        assertEquals(9999.9f, roundtrip.distanceToAnchor, 0.1f)
    }

    @Test
    fun `AnchorSession handles all optional fields as null`() {
        val domain = AnchorSession(
            id = 34,
            anchorPosition = Position(latitude = 50.0, longitude = 10.0),
            zone = AnchorZone.Circle(
                anchorPosition = Position(latitude = 50.0, longitude = 10.0),
                radiusMeters = 50.0,
                bufferRadiusMeters = null
            ),
            startTime = 27000L,
            endTime = null,
            chainLengthM = null,
            depthM = null,
            alarmTriggered = false,
            alarmCount = 0,
            maxDistanceMeters = 0.0,
            maxSog = 0.0
        )

        val entity = domain.toEntity()

        assertNull(entity.endTime)
        assertNull(entity.chainLengthM)
        assertNull(entity.depthM)
        assertNull(entity.bufferRadiusMeters)
    }
}
