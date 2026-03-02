package com.hiosdra.openanchor.domain.drift

import com.hiosdra.openanchor.domain.model.Position
import com.hiosdra.openanchor.domain.model.TrackPoint
import io.mockk.every
import io.mockk.mockkStatic
import io.mockk.unmockkStatic
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.Assert.*

/**
 * Comprehensive tests for DriftDetector - anchor drag detection.
 */
class DriftDetectorTest {

    private lateinit var driftDetector: DriftDetector
    private val anchorPosition = Position(43.7384, 7.4246) // Nice, France
    private var currentTime = 0L

    @Before
    fun setup() {
        driftDetector = DriftDetector()
        currentTime = 1000000L

        // Mock System.currentTimeMillis()
        mockkStatic(System::class)
        every { System.currentTimeMillis() } answers { currentTime }
    }

    @After
    fun tearDown() {
        unmockkStatic(System::class)
    }

    private fun advanceTime(millis: Long) {
        currentTime += millis
    }

    private fun createTrackPoint(
        bearing: Double,
        distanceMeters: Float,
        timeOffsetMs: Long = 0
    ): TrackPoint {
        val lat = anchorPosition.latitude + (distanceMeters / 111000.0) * kotlin.math.cos(Math.toRadians(bearing))
        val lng = anchorPosition.longitude + (distanceMeters / (111000.0 * kotlin.math.cos(Math.toRadians(anchorPosition.latitude)))) * kotlin.math.sin(Math.toRadians(bearing))

        return TrackPoint(
            sessionId = 1,
            position = Position(lat, lng, timestamp = currentTime - timeOffsetMs),
            distanceToAnchor = distanceMeters
        )
    }

    // ========== Insufficient Data ==========

    @Test
    fun analyze_emptyList_returnsNotDragging() {
        val result = driftDetector.analyze(emptyList(), anchorPosition)

        assertFalse(result.isDragging)
        assertTrue(result.description.contains("Not enough data"))
    }

    @Test
    fun analyze_lessThan5Points_returnsNotDragging() {
        val points = listOf(
            createTrackPoint(0.0, 10f, 4000),
            createTrackPoint(0.0, 15f, 3000),
            createTrackPoint(0.0, 20f, 2000),
            createTrackPoint(0.0, 25f, 1000)
        )

        val result = driftDetector.analyze(points, anchorPosition)

        assertFalse(result.isDragging)
        assertTrue(result.description.contains("Not enough data"))
    }

    @Test
    fun analyze_oldData_returnsNotDragging() {
        // Points all older than 5 minutes
        val points = listOf(
            createTrackPoint(0.0, 10f, 400000),
            createTrackPoint(0.0, 15f, 380000),
            createTrackPoint(0.0, 20f, 360000),
            createTrackPoint(0.0, 25f, 340000),
            createTrackPoint(0.0, 30f, 320000)
        )

        val result = driftDetector.analyze(points, anchorPosition)

        assertFalse(result.isDragging)
        assertTrue(result.description.contains("Not enough recent data"))
    }

    // ========== No Drift - Distance Not Increasing ==========

    @Test
    fun analyze_stablePosition_returnsNotDragging() {
        // 5 points at same distance (boat not moving)
        val points = listOf(
            createTrackPoint(0.0, 50f, 4000),
            createTrackPoint(0.0, 50f, 3000),
            createTrackPoint(0.0, 50f, 2000),
            createTrackPoint(0.0, 50f, 1000),
            createTrackPoint(0.0, 50f, 0)
        )

        val result = driftDetector.analyze(points, anchorPosition)

        assertFalse(result.isDragging)
        assertTrue(result.description.contains("No consistent distance increase"))
    }

    @Test
    fun analyze_oscillatingDistance_returnsNotDragging() {
        // Distance oscillating up and down (swinging on anchor)
        val points = listOf(
            createTrackPoint(0.0, 40f, 4000),
            createTrackPoint(90.0, 45f, 3000),
            createTrackPoint(180.0, 42f, 2000),
            createTrackPoint(270.0, 46f, 1000),
            createTrackPoint(0.0, 43f, 0)
        )

        val result = driftDetector.analyze(points, anchorPosition)

        assertFalse(result.isDragging)
    }

    @Test
    fun analyze_decreasingDistance_returnsNotDragging() {
        // Boat moving closer to anchor
        val points = listOf(
            createTrackPoint(0.0, 50f, 4000),
            createTrackPoint(0.0, 45f, 3000),
            createTrackPoint(0.0, 40f, 2000),
            createTrackPoint(0.0, 35f, 1000),
            createTrackPoint(0.0, 30f, 0)
        )

        val result = driftDetector.analyze(points, anchorPosition)

        assertFalse(result.isDragging)
    }

    // ========== No Drift - Inconsistent Direction ==========

    @Test
    fun analyze_increasingDistanceButInconsistentDirection_returnsNotDragging() {
        // Distance increasing but direction changing a lot
        val points = listOf(
            createTrackPoint(0.0, 40f, 4000),
            createTrackPoint(90.0, 41f, 3000),
            createTrackPoint(180.0, 42f, 2000),
            createTrackPoint(270.0, 43f, 1000),
            createTrackPoint(0.0, 44f, 0)
        )

        val result = driftDetector.analyze(points, anchorPosition)

        assertFalse(result.isDragging)
        assertTrue(result.description.contains("Movement direction inconsistent"))
    }

    // ========== No Drift - Too Small Movement ==========

    @Test
    fun analyze_consistentButTooSmall_returnsNotDragging() {
        // Consistent direction but total drift < 3 meters
        val points = listOf(
            createTrackPoint(0.0, 40.0f, 4000),
            createTrackPoint(0.0, 40.5f, 3000),
            createTrackPoint(0.0, 41.0f, 2000),
            createTrackPoint(0.0, 41.5f, 1000),
            createTrackPoint(0.0, 42.0f, 0)
        )

        val result = driftDetector.analyze(points, anchorPosition)

        assertFalse(result.isDragging)
        assertTrue(result.description.contains("Drift too small"))
    }

    // ========== Drift Detected ==========

    @Test
    fun analyze_consistentNorthwardDrift_detectsDragging() {
        // 5 points moving consistently north, increasing distance
        val points = listOf(
            createTrackPoint(0.0, 40f, 4000),
            createTrackPoint(0.0, 45f, 3000),
            createTrackPoint(0.0, 50f, 2000),
            createTrackPoint(0.0, 55f, 1000),
            createTrackPoint(0.0, 60f, 0)
        )

        val result = driftDetector.analyze(points, anchorPosition)

        assertTrue(result.isDragging)
        assertNotNull(result.driftBearingDeg)
        assertTrue(result.driftBearingDeg!! < 45.0) // Roughly northward (0°)
        assertTrue(result.driftSpeedMpm > 0.0)
        assertTrue(result.consistentReadings >= 4)
        assertTrue(result.description.contains("Anchor drag detected"))
    }

    @Test
    fun analyze_consistentEastwardDrift_detectsDragging() {
        // Moving east
        val points = listOf(
            createTrackPoint(90.0, 40f, 4000),
            createTrackPoint(90.0, 45f, 3000),
            createTrackPoint(90.0, 50f, 2000),
            createTrackPoint(90.0, 55f, 1000),
            createTrackPoint(90.0, 60f, 0)
        )

        val result = driftDetector.analyze(points, anchorPosition)

        assertTrue(result.isDragging)
        assertNotNull(result.driftBearingDeg)
        // Bearing should be around 90° (east)
        assertTrue(result.driftBearingDeg!! > 45.0 && result.driftBearingDeg!! < 135.0)
    }

    @Test
    fun analyze_consistentSouthwardDrift_detectsDragging() {
        // Moving south
        val points = listOf(
            createTrackPoint(180.0, 40f, 4000),
            createTrackPoint(180.0, 45f, 3000),
            createTrackPoint(180.0, 50f, 2000),
            createTrackPoint(180.0, 55f, 1000),
            createTrackPoint(180.0, 60f, 0)
        )

        val result = driftDetector.analyze(points, anchorPosition)

        assertTrue(result.isDragging)
        assertNotNull(result.driftBearingDeg)
        // Bearing should be around 180° (south)
        assertTrue(result.driftBearingDeg!! > 135.0 && result.driftBearingDeg!! < 225.0)
    }

    @Test
    fun analyze_fastDrift_highSpeed() {
        // Rapid drift: 50m in 4 seconds
        val points = listOf(
            createTrackPoint(0.0, 40f, 4000),
            createTrackPoint(0.0, 50f, 3000),
            createTrackPoint(0.0, 60f, 2000),
            createTrackPoint(0.0, 70f, 1000),
            createTrackPoint(0.0, 90f, 0)
        )

        val result = driftDetector.analyze(points, anchorPosition)

        assertTrue(result.isDragging)
        // 50m over 4 seconds = ~750 m/min
        assertTrue(result.driftSpeedMpm > 500.0)
    }

    @Test
    fun analyze_slowDrift_lowSpeed() {
        // Slow drift: 5m in 4 seconds
        val points = listOf(
            createTrackPoint(0.0, 40f, 4000),
            createTrackPoint(0.0, 41f, 3000),
            createTrackPoint(0.0, 42f, 2000),
            createTrackPoint(0.0, 43f, 1000),
            createTrackPoint(0.0, 45f, 0)
        )

        val result = driftDetector.analyze(points, anchorPosition)

        assertTrue(result.isDragging)
        // 5m over 4 seconds = 75 m/min
        assertTrue(result.driftSpeedMpm < 150.0)
    }

    // ========== Bearing Accuracy ==========

    @Test
    fun analyze_driftBearing_accurateForCardinalDirections() {
        // Test all four cardinal directions
        val directions = mapOf(
            0.0 to 0.0,      // North
            90.0 to 90.0,    // East
            180.0 to 180.0,  // South
            270.0 to 270.0   // West
        )

        directions.forEach { (bearing, expectedBearing) ->
            val points = listOf(
                createTrackPoint(bearing, 40f, 4000),
                createTrackPoint(bearing, 45f, 3000),
                createTrackPoint(bearing, 50f, 2000),
                createTrackPoint(bearing, 55f, 1000),
                createTrackPoint(bearing, 60f, 0)
            )

            val result = driftDetector.analyze(points, anchorPosition)

            assertTrue("Failed for bearing $bearing", result.isDragging)
            assertNotNull(result.driftBearingDeg)

            // Allow 45° tolerance due to position approximation
            val diff = kotlin.math.abs(result.driftBearingDeg!! - expectedBearing)
            assertTrue("Bearing $bearing: expected ~$expectedBearing, got ${result.driftBearingDeg}", diff < 45.0)
        }
    }

    // ========== Consistent Readings Count ==========

    @Test
    fun analyze_5IncreasingPoints_consistentReadings4() {
        val points = listOf(
            createTrackPoint(0.0, 40f, 4000),
            createTrackPoint(0.0, 45f, 3000),
            createTrackPoint(0.0, 50f, 2000),
            createTrackPoint(0.0, 55f, 1000),
            createTrackPoint(0.0, 60f, 0)
        )

        val result = driftDetector.analyze(points, anchorPosition)

        assertTrue(result.isDragging)
        assertEquals(4, result.consistentReadings) // 4 consecutive increases
    }

    @Test
    fun analyze_morePoints_higherConsistentCount() {
        val points = listOf(
            createTrackPoint(0.0, 40f, 6000),
            createTrackPoint(0.0, 43f, 5000),
            createTrackPoint(0.0, 46f, 4000),
            createTrackPoint(0.0, 49f, 3000),
            createTrackPoint(0.0, 52f, 2000),
            createTrackPoint(0.0, 55f, 1000),
            createTrackPoint(0.0, 58f, 0)
        )

        val result = driftDetector.analyze(points, anchorPosition)

        assertTrue(result.isDragging)
        assertTrue(result.consistentReadings >= 5)
    }

    // ========== Edge Cases ==========

    @Test
    fun analyze_exactly5Points_works() {
        val points = listOf(
            createTrackPoint(0.0, 40f, 4000),
            createTrackPoint(0.0, 45f, 3000),
            createTrackPoint(0.0, 50f, 2000),
            createTrackPoint(0.0, 55f, 1000),
            createTrackPoint(0.0, 60f, 0)
        )

        val result = driftDetector.analyze(points, anchorPosition)

        assertTrue(result.isDragging)
    }

    @Test
    fun analyze_manyPoints_handlesCorrectly() {
        val points = (0..20).map { i ->
            createTrackPoint(45.0, 40f + i * 2f, i * 500L)
        }.reversed()

        val result = driftDetector.analyze(points, anchorPosition)

        // Should still detect the drift pattern
        assertTrue(result.isDragging)
    }

    @Test
    fun analyze_zeroTimeSpan_handlesGracefully() {
        // All points at same time (edge case)
        val points = listOf(
            createTrackPoint(0.0, 40f, 0),
            createTrackPoint(0.0, 45f, 0),
            createTrackPoint(0.0, 50f, 0),
            createTrackPoint(0.0, 55f, 0),
            createTrackPoint(0.0, 60f, 0)
        )

        val result = driftDetector.analyze(points, anchorPosition)

        // Should handle without crashing
        assertNotNull(result)
    }

    // ========== Realistic Scenarios ==========

    @Test
    fun scenario_strongWindDrift_detected() {
        // Strong wind causing 20m drift in 4 seconds
        val points = listOf(
            createTrackPoint(135.0, 50f, 4000),  // Southeast
            createTrackPoint(135.0, 55f, 3000),
            createTrackPoint(135.0, 60f, 2000),
            createTrackPoint(135.0, 65f, 1000),
            createTrackPoint(135.0, 70f, 0)
        )

        val result = driftDetector.analyze(points, anchorPosition)

        assertTrue(result.isDragging)
        assertTrue(result.driftSpeedMpm > 200.0) // Fast drift
    }

    @Test
    fun scenario_slowDragInStorm_detected() {
        // Slow but steady drag
        val points = listOf(
            createTrackPoint(270.0, 100f, 4000),
            createTrackPoint(270.0, 102f, 3000),
            createTrackPoint(270.0, 104f, 2000),
            createTrackPoint(270.0, 106f, 1000),
            createTrackPoint(270.0, 108f, 0)
        )

        val result = driftDetector.analyze(points, anchorPosition)

        assertTrue(result.isDragging)
        assertTrue(result.driftSpeedMpm < 200.0) // Slow drift
    }

    @Test
    fun scenario_normalSwinging_notDetected() {
        // Boat swinging on anchor in circle
        val points = listOf(
            createTrackPoint(0.0, 50f, 4000),
            createTrackPoint(90.0, 50f, 3000),
            createTrackPoint(180.0, 50f, 2000),
            createTrackPoint(270.0, 50f, 1000),
            createTrackPoint(0.0, 50f, 0)
        )

        val result = driftDetector.analyze(points, anchorPosition)

        assertFalse(result.isDragging)
    }

    @Test
    fun scenario_minorOscillations_notDetected() {
        // Small movements that don't indicate drag
        val points = listOf(
            createTrackPoint(0.0, 50.0f, 4000),
            createTrackPoint(10.0, 50.5f, 3000),
            createTrackPoint(20.0, 51.0f, 2000),
            createTrackPoint(30.0, 50.8f, 1000),
            createTrackPoint(40.0, 51.2f, 0)
        )

        val result = driftDetector.analyze(points, anchorPosition)

        // Total drift too small
        assertFalse(result.isDragging)
    }

    // ========== Description Messages ==========

    @Test
    fun analyze_description_isDragging_containsDirectionAndSpeed() {
        val points = listOf(
            createTrackPoint(0.0, 40f, 4000),
            createTrackPoint(0.0, 45f, 3000),
            createTrackPoint(0.0, 50f, 2000),
            createTrackPoint(0.0, 55f, 1000),
            createTrackPoint(0.0, 60f, 0)
        )

        val result = driftDetector.analyze(points, anchorPosition)

        assertTrue(result.description.contains("Anchor drag detected"))
        assertTrue(result.description.contains("Direction"))
        assertTrue(result.description.contains("Speed"))
    }

    @Test
    fun analyze_description_notDragging_explainswhy() {
        val stablePoints = listOf(
            createTrackPoint(0.0, 50f, 4000),
            createTrackPoint(0.0, 50f, 3000),
            createTrackPoint(0.0, 50f, 2000),
            createTrackPoint(0.0, 50f, 1000),
            createTrackPoint(0.0, 50f, 0)
        )

        val result = driftDetector.analyze(stablePoints, anchorPosition)

        assertFalse(result.description.isEmpty())
        assertTrue(result.description.contains("consecutive") || result.description.contains("increase"))
    }

    // ========== Integration Tests ==========

    @Test
    fun integration_mixOfOldAndRecentPoints_usesOnlyRecent() {
        val points = listOf(
            // Old points (should be filtered out)
            createTrackPoint(0.0, 10f, 400000),
            createTrackPoint(0.0, 15f, 380000),
            // Recent points
            createTrackPoint(90.0, 40f, 4000),
            createTrackPoint(90.0, 45f, 3000),
            createTrackPoint(90.0, 50f, 2000),
            createTrackPoint(90.0, 55f, 1000),
            createTrackPoint(90.0, 60f, 0)
        )

        val result = driftDetector.analyze(points, anchorPosition)

        // Should detect drift based on recent points only
        assertTrue(result.isDragging)
    }
}
