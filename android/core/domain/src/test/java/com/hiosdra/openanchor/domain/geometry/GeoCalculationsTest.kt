package com.hiosdra.openanchor.domain.geometry

import com.hiosdra.openanchor.domain.model.AnchorZone
import com.hiosdra.openanchor.domain.model.Position
import org.junit.Test
import org.junit.Assert.*

/**
 * Comprehensive tests for GeoCalculations - geographic calculations for anchor monitoring.
 */
class GeoCalculationsTest {

    companion object {
        // Test positions around the world
        private val POSITION_EQUATOR = Position(0.0, 0.0)
        private val POSITION_NORTH_POLE = Position(90.0, 0.0)
        private val POSITION_SOUTH_POLE = Position(-90.0, 0.0)
        private val POSITION_GREENWICH = Position(51.4778, 0.0)
        private val POSITION_NYC = Position(40.7128, -74.0060)
        private val POSITION_SYDNEY = Position(-33.8688, 151.2093)

        // Test position for zone checks (Mediterranean)
        private val ANCHOR_POSITION = Position(43.7384, 7.4246) // Nice, France

        private const val TOLERANCE_METERS = 1.0
        private const val TOLERANCE_DEGREES = 0.1
    }

    // ========== Distance Calculations ==========

    @Test
    fun distanceMeters_samePosition_returnsZero() {
        val distance = GeoCalculations.distanceMeters(POSITION_EQUATOR, POSITION_EQUATOR)
        assertEquals(0.0, distance, TOLERANCE_METERS)
    }

    @Test
    fun distanceMeters_equatorTo1DegreeEast_isApproximately111km() {
        val pos1 = Position(0.0, 0.0)
        val pos2 = Position(0.0, 1.0)
        val distance = GeoCalculations.distanceMeters(pos1, pos2)
        // At equator, 1 degree longitude ≈ 111 km
        assertEquals(111_000.0, distance, 1000.0)
    }

    @Test
    fun distanceMeters_equatorTo1DegreeNorth_isApproximately111km() {
        val pos1 = Position(0.0, 0.0)
        val pos2 = Position(1.0, 0.0)
        val distance = GeoCalculations.distanceMeters(pos1, pos2)
        // 1 degree latitude is always ≈ 111 km
        assertEquals(111_000.0, distance, 1000.0)
    }

    @Test
    fun distanceMeters_nycToSydney_isApproximately16000km() {
        val distance = GeoCalculations.distanceMeters(POSITION_NYC, POSITION_SYDNEY)
        // NYC to Sydney is approximately 16,000 km
        assertEquals(16_000_000.0, distance, 100_000.0)
    }

    @Test
    fun distanceMeters_northPoleToSouthPole_isHalfEarthCircumference() {
        val distance = GeoCalculations.distanceMeters(POSITION_NORTH_POLE, POSITION_SOUTH_POLE)
        // Half of Earth's circumference ≈ 20,000 km
        assertEquals(20_000_000.0, distance, 100_000.0)
    }

    @Test
    fun distanceMeters_smallDistance_isAccurate() {
        // Test with a known small distance (100m east at mid-latitude)
        val pos1 = Position(45.0, 0.0)
        val pos2 = Position(45.0, 0.00127) // Approximately 100m east at 45° latitude
        val distance = GeoCalculations.distanceMeters(pos1, pos2)
        assertEquals(100.0, distance, 5.0)
    }

    @Test
    fun distanceMeters_isSymmetric() {
        val d1 = GeoCalculations.distanceMeters(POSITION_NYC, POSITION_SYDNEY)
        val d2 = GeoCalculations.distanceMeters(POSITION_SYDNEY, POSITION_NYC)
        assertEquals(d1, d2, TOLERANCE_METERS)
    }

    // ========== Bearing Calculations ==========

    @Test
    fun bearingDegrees_northward_returns0() {
        val from = Position(0.0, 0.0)
        val to = Position(1.0, 0.0)
        val bearing = GeoCalculations.bearingDegrees(from, to)
        assertEquals(0.0, bearing, TOLERANCE_DEGREES)
    }

    @Test
    fun bearingDegrees_eastward_returns90() {
        val from = Position(0.0, 0.0)
        val to = Position(0.0, 1.0)
        val bearing = GeoCalculations.bearingDegrees(from, to)
        assertEquals(90.0, bearing, TOLERANCE_DEGREES)
    }

    @Test
    fun bearingDegrees_southward_returns180() {
        val from = Position(1.0, 0.0)
        val to = Position(0.0, 0.0)
        val bearing = GeoCalculations.bearingDegrees(from, to)
        assertEquals(180.0, bearing, TOLERANCE_DEGREES)
    }

    @Test
    fun bearingDegrees_westward_returns270() {
        val from = Position(0.0, 1.0)
        val to = Position(0.0, 0.0)
        val bearing = GeoCalculations.bearingDegrees(from, to)
        assertEquals(270.0, bearing, TOLERANCE_DEGREES)
    }

    @Test
    fun bearingDegrees_northeast_returnsApprox45() {
        val from = Position(0.0, 0.0)
        val to = Position(1.0, 1.0)
        val bearing = GeoCalculations.bearingDegrees(from, to)
        assertTrue(bearing > 40.0 && bearing < 50.0)
    }

    @Test
    fun bearingDegrees_samePosition_returnsSomeBearing() {
        // Bearing from a point to itself is undefined, but should not crash
        val bearing = GeoCalculations.bearingDegrees(POSITION_EQUATOR, POSITION_EQUATOR)
        assertTrue(bearing >= 0.0 && bearing < 360.0)
    }

    @Test
    fun bearingDegrees_acrossDateline_isCorrect() {
        val from = Position(0.0, 179.0)
        val to = Position(0.0, -179.0)
        val bearing = GeoCalculations.bearingDegrees(from, to)
        // Should be approximately eastward (90°)
        assertEquals(90.0, bearing, 5.0)
    }

    // ========== Angle Difference ==========

    @Test
    fun angleDifference_sameAngle_returnsZero() {
        assertEquals(0.0, GeoCalculations.angleDifference(45.0, 45.0), TOLERANCE_DEGREES)
    }

    @Test
    fun angleDifference_oppositeDirections_returns180() {
        assertEquals(180.0, GeoCalculations.angleDifference(0.0, 180.0), TOLERANCE_DEGREES)
        assertEquals(180.0, GeoCalculations.angleDifference(90.0, 270.0), TOLERANCE_DEGREES)
    }

    @Test
    fun angleDifference_wrapsAround360() {
        // 350° and 10° are 20° apart (not 340°)
        assertEquals(20.0, GeoCalculations.angleDifference(350.0, 10.0), TOLERANCE_DEGREES)
        assertEquals(20.0, GeoCalculations.angleDifference(10.0, 350.0), TOLERANCE_DEGREES)
    }

    @Test
    fun angleDifference_isSymmetric() {
        assertEquals(
            GeoCalculations.angleDifference(45.0, 135.0),
            GeoCalculations.angleDifference(135.0, 45.0),
            TOLERANCE_DEGREES
        )
    }

    @Test
    fun angleDifference_isAlwaysBetween0And180() {
        val testCases = listOf(
            Pair(0.0, 90.0),
            Pair(45.0, 225.0),
            Pair(350.0, 10.0),
            Pair(180.0, 360.0),
            Pair(270.0, 90.0)
        )
        testCases.forEach { (a, b) ->
            val diff = GeoCalculations.angleDifference(a, b)
            assertTrue("Angle difference should be [0, 180]: $diff", diff >= 0.0 && diff <= 180.0)
        }
    }

    // ========== Circle Zone Checks ==========

    @Test
    fun checkZone_circle_insideRadius_returnsInside() {
        val zone = AnchorZone.Circle(
            anchorPosition = ANCHOR_POSITION,
            radiusMeters = 100.0
        )
        // Position 50m north of anchor
        val boatPos = GeoCalculations.destinationPoint(ANCHOR_POSITION, 0.0, 50.0)
        val result = GeoCalculations.checkZone(boatPos, zone)
        assertEquals(ZoneCheckResult.INSIDE, result)
    }

    @Test
    fun checkZone_circle_outsideRadius_returnsOutside() {
        val zone = AnchorZone.Circle(
            anchorPosition = ANCHOR_POSITION,
            radiusMeters = 100.0
        )
        // Position 150m north of anchor
        val boatPos = GeoCalculations.destinationPoint(ANCHOR_POSITION, 0.0, 150.0)
        val result = GeoCalculations.checkZone(boatPos, zone)
        assertEquals(ZoneCheckResult.OUTSIDE, result)
    }

    @Test
    fun checkZone_circle_onBoundary_returnsInside() {
        val zone = AnchorZone.Circle(
            anchorPosition = ANCHOR_POSITION,
            radiusMeters = 100.0
        )
        // Position just inside boundary (99.9m); exact 100.0m may exceed due to float precision
        val boatPos = GeoCalculations.destinationPoint(ANCHOR_POSITION, 45.0, 99.9)
        val result = GeoCalculations.checkZone(boatPos, zone)
        assertEquals(ZoneCheckResult.INSIDE, result)
    }

    @Test
    fun checkZone_circle_withBuffer_inPrimaryZone_returnsInside() {
        val zone = AnchorZone.Circle(
            anchorPosition = ANCHOR_POSITION,
            radiusMeters = 100.0,
            bufferRadiusMeters = 150.0
        )
        val boatPos = GeoCalculations.destinationPoint(ANCHOR_POSITION, 0.0, 50.0)
        val result = GeoCalculations.checkZone(boatPos, zone)
        assertEquals(ZoneCheckResult.INSIDE, result)
    }

    @Test
    fun checkZone_circle_withBuffer_inBufferZone_returnsBuffer() {
        val zone = AnchorZone.Circle(
            anchorPosition = ANCHOR_POSITION,
            radiusMeters = 100.0,
            bufferRadiusMeters = 150.0
        )
        // Position 125m from anchor (between 100m and 150m)
        val boatPos = GeoCalculations.destinationPoint(ANCHOR_POSITION, 0.0, 125.0)
        val result = GeoCalculations.checkZone(boatPos, zone)
        assertEquals(ZoneCheckResult.BUFFER, result)
    }

    @Test
    fun checkZone_circle_withBuffer_outsideBuffer_returnsOutside() {
        val zone = AnchorZone.Circle(
            anchorPosition = ANCHOR_POSITION,
            radiusMeters = 100.0,
            bufferRadiusMeters = 150.0
        )
        // Position 200m from anchor
        val boatPos = GeoCalculations.destinationPoint(ANCHOR_POSITION, 0.0, 200.0)
        val result = GeoCalculations.checkZone(boatPos, zone)
        assertEquals(ZoneCheckResult.OUTSIDE, result)
    }

    @Test
    fun isInsideZone_circle_correctlyIdentifiesInside() {
        val zone = AnchorZone.Circle(
            anchorPosition = ANCHOR_POSITION,
            radiusMeters = 100.0
        )
        val insidePos = GeoCalculations.destinationPoint(ANCHOR_POSITION, 90.0, 50.0)
        val outsidePos = GeoCalculations.destinationPoint(ANCHOR_POSITION, 90.0, 150.0)

        assertTrue(GeoCalculations.isInsideZone(insidePos, zone))
        assertFalse(GeoCalculations.isInsideZone(outsidePos, zone))
    }

    // ========== Sector Zone Checks ==========

    @Test
    fun checkZone_sector_inSmallCircle_returnsInside() {
        val zone = AnchorZone.SectorWithCircle(
            anchorPosition = ANCHOR_POSITION,
            radiusMeters = 50.0,
            sectorRadiusMeters = 200.0,
            sectorHalfAngleDeg = 60.0,
            sectorBearingDeg = 90.0  // East
        )
        // Position 30m from anchor (inside small circle)
        val boatPos = GeoCalculations.destinationPoint(ANCHOR_POSITION, 0.0, 30.0)
        val result = GeoCalculations.checkZone(boatPos, zone)
        assertEquals(ZoneCheckResult.INSIDE, result)
    }

    @Test
    fun checkZone_sector_inSectorWithinAngle_returnsInside() {
        val zone = AnchorZone.SectorWithCircle(
            anchorPosition = ANCHOR_POSITION,
            radiusMeters = 50.0,
            sectorRadiusMeters = 200.0,
            sectorHalfAngleDeg = 60.0,
            sectorBearingDeg = 90.0  // East, sector covers 30° to 150°
        )
        // Position 100m east (bearing 90°, within sector)
        val boatPos = GeoCalculations.destinationPoint(ANCHOR_POSITION, 90.0, 100.0)
        val result = GeoCalculations.checkZone(boatPos, zone)
        assertEquals(ZoneCheckResult.INSIDE, result)
    }

    @Test
    fun checkZone_sector_inSectorAtEdgeOfAngle_returnsInside() {
        val zone = AnchorZone.SectorWithCircle(
            anchorPosition = ANCHOR_POSITION,
            radiusMeters = 50.0,
            sectorRadiusMeters = 200.0,
            sectorHalfAngleDeg = 60.0,
            sectorBearingDeg = 90.0  // Sector covers 30° to 150°
        )
        // Position at 145° (within sector, close to edge)
        val boatPos = GeoCalculations.destinationPoint(ANCHOR_POSITION, 145.0, 100.0)
        val result = GeoCalculations.checkZone(boatPos, zone)
        assertEquals(ZoneCheckResult.INSIDE, result)
    }

    @Test
    fun checkZone_sector_outsideAngle_returnsOutside() {
        val zone = AnchorZone.SectorWithCircle(
            anchorPosition = ANCHOR_POSITION,
            radiusMeters = 50.0,
            sectorRadiusMeters = 200.0,
            sectorHalfAngleDeg = 60.0,
            sectorBearingDeg = 90.0  // Sector covers 30° to 150°
        )
        // Position 100m north (bearing 0°, outside sector angle)
        val boatPos = GeoCalculations.destinationPoint(ANCHOR_POSITION, 0.0, 100.0)
        val result = GeoCalculations.checkZone(boatPos, zone)
        assertEquals(ZoneCheckResult.OUTSIDE, result)
    }

    @Test
    fun checkZone_sector_outsideRadius_returnsOutside() {
        val zone = AnchorZone.SectorWithCircle(
            anchorPosition = ANCHOR_POSITION,
            radiusMeters = 50.0,
            sectorRadiusMeters = 200.0,
            sectorHalfAngleDeg = 60.0,
            sectorBearingDeg = 90.0
        )
        // Position 250m east (correct bearing but too far)
        val boatPos = GeoCalculations.destinationPoint(ANCHOR_POSITION, 90.0, 250.0)
        val result = GeoCalculations.checkZone(boatPos, zone)
        assertEquals(ZoneCheckResult.OUTSIDE, result)
    }

    @Test
    fun checkZone_sector_withBuffer_inSectorBuffer_returnsBuffer() {
        val zone = AnchorZone.SectorWithCircle(
            anchorPosition = ANCHOR_POSITION,
            radiusMeters = 50.0,
            bufferRadiusMeters = 80.0,
            sectorRadiusMeters = 200.0,
            sectorHalfAngleDeg = 60.0,
            sectorBearingDeg = 90.0
        )
        // Position 220m east (within sector angle, in buffer zone)
        val boatPos = GeoCalculations.destinationPoint(ANCHOR_POSITION, 90.0, 220.0)
        val result = GeoCalculations.checkZone(boatPos, zone)
        assertEquals(ZoneCheckResult.BUFFER, result)
    }

    // ========== Destination Point ==========

    @Test
    fun destinationPoint_north100m_isCorrect() {
        val dest = GeoCalculations.destinationPoint(POSITION_EQUATOR, 0.0, 100.0)
        // Check latitude increased (north) and longitude unchanged
        assertTrue(dest.latitude > POSITION_EQUATOR.latitude)
        assertEquals(POSITION_EQUATOR.longitude, dest.longitude, 0.0001)

        // Verify distance
        val distance = GeoCalculations.distanceMeters(POSITION_EQUATOR, dest)
        assertEquals(100.0, distance, TOLERANCE_METERS)
    }

    @Test
    fun destinationPoint_east100m_isCorrect() {
        val dest = GeoCalculations.destinationPoint(POSITION_EQUATOR, 90.0, 100.0)
        // Check longitude increased (east) and latitude unchanged
        assertTrue(dest.longitude > POSITION_EQUATOR.longitude)
        assertEquals(POSITION_EQUATOR.latitude, dest.latitude, 0.0001)

        // Verify distance
        val distance = GeoCalculations.distanceMeters(POSITION_EQUATOR, dest)
        assertEquals(100.0, distance, TOLERANCE_METERS)
    }

    @Test
    fun destinationPoint_south100m_isCorrect() {
        val dest = GeoCalculations.destinationPoint(POSITION_EQUATOR, 180.0, 100.0)
        // Check latitude decreased (south)
        assertTrue(dest.latitude < POSITION_EQUATOR.latitude)

        val distance = GeoCalculations.distanceMeters(POSITION_EQUATOR, dest)
        assertEquals(100.0, distance, TOLERANCE_METERS)
    }

    @Test
    fun destinationPoint_west100m_isCorrect() {
        val dest = GeoCalculations.destinationPoint(POSITION_EQUATOR, 270.0, 100.0)
        // Check longitude decreased (west)
        assertTrue(dest.longitude < POSITION_EQUATOR.longitude)

        val distance = GeoCalculations.distanceMeters(POSITION_EQUATOR, dest)
        assertEquals(100.0, distance, TOLERANCE_METERS)
    }

    @Test
    fun destinationPoint_zeroDistance_returnsSamePosition() {
        val dest = GeoCalculations.destinationPoint(ANCHOR_POSITION, 45.0, 0.0)
        assertEquals(ANCHOR_POSITION.latitude, dest.latitude, 0.0001)
        assertEquals(ANCHOR_POSITION.longitude, dest.longitude, 0.0001)
    }

    @Test
    fun destinationPoint_roundTrip_isAccurate() {
        // Go 1000m northeast, then back 1000m southwest
        val bearing1 = 45.0
        val bearing2 = 225.0
        val distance = 1000.0

        val intermediate = GeoCalculations.destinationPoint(ANCHOR_POSITION, bearing1, distance)
        val final = GeoCalculations.destinationPoint(intermediate, bearing2, distance)

        // Should be very close to original position
        assertEquals(ANCHOR_POSITION.latitude, final.latitude, 0.001)
        assertEquals(ANCHOR_POSITION.longitude, final.longitude, 0.001)
    }

    @Test
    fun destinationPoint_largeDistance_doesNotOverflow() {
        // Test with 10,000 km
        val dest = GeoCalculations.destinationPoint(POSITION_EQUATOR, 0.0, 10_000_000.0)
        assertTrue(dest.latitude >= -90.0 && dest.latitude <= 90.0)
        assertTrue(dest.longitude >= -180.0 && dest.longitude <= 180.0)
    }

    @Test
    fun destinationPoint_atPole_handlesEdgeCase() {
        // Destination from North Pole should handle edge case
        val dest = GeoCalculations.destinationPoint(POSITION_NORTH_POLE, 180.0, 1000.0)
        // Should move south from pole
        assertTrue(dest.latitude < POSITION_NORTH_POLE.latitude)
    }

    // ========== Integration Tests ==========

    @Test
    fun integration_circleZone_multipleDirections_allCorrect() {
        val zone = AnchorZone.Circle(
            anchorPosition = ANCHOR_POSITION,
            radiusMeters = 100.0
        )

        // Test positions at 50m in all cardinal directions (should all be INSIDE)
        val directions = listOf(0.0, 90.0, 180.0, 270.0)
        directions.forEach { bearing ->
            val pos = GeoCalculations.destinationPoint(ANCHOR_POSITION, bearing, 50.0)
            val result = GeoCalculations.checkZone(pos, zone)
            assertEquals("Failed at bearing $bearing", ZoneCheckResult.INSIDE, result)
        }
    }

    @Test
    fun integration_sectorZone_correctlyHandlesWindPattern() {
        // Simulate a typical anchoring scenario with wind from the north
        // Safe zone: 200m radius downwind (south), narrow zone upwind
        val zone = AnchorZone.SectorWithCircle(
            anchorPosition = ANCHOR_POSITION,
            radiusMeters = 30.0,  // Small circle around anchor
            sectorRadiusMeters = 200.0,  // Larger swing radius downwind
            sectorHalfAngleDeg = 45.0,  // 90° sector
            sectorBearingDeg = 180.0  // Pointing south (downwind)
        )

        // Should be INSIDE: close to anchor
        val nearAnchor = GeoCalculations.destinationPoint(ANCHOR_POSITION, 0.0, 20.0)
        assertEquals(ZoneCheckResult.INSIDE, GeoCalculations.checkZone(nearAnchor, zone))

        // Should be INSIDE: downwind in sector
        val downwind = GeoCalculations.destinationPoint(ANCHOR_POSITION, 180.0, 150.0)
        assertEquals(ZoneCheckResult.INSIDE, GeoCalculations.checkZone(downwind, zone))

        // Should be OUTSIDE: upwind (north) beyond small circle
        val upwind = GeoCalculations.destinationPoint(ANCHOR_POSITION, 0.0, 150.0)
        assertEquals(ZoneCheckResult.OUTSIDE, GeoCalculations.checkZone(upwind, zone))
    }

    @Test
    fun integration_bearingAndDistance_consistentWithDestinationPoint() {
        val bearingOut = 123.45
        val distance = 567.89

        val destination = GeoCalculations.destinationPoint(ANCHOR_POSITION, bearingOut, distance)
        val bearingBack = GeoCalculations.bearingDegrees(ANCHOR_POSITION, destination)
        val distanceBack = GeoCalculations.distanceMeters(ANCHOR_POSITION, destination)

        assertEquals(bearingOut, bearingBack, 0.5)
        assertEquals(distance, distanceBack, 1.0)
    }
}
