package com.hiosdra.openanchor.service

import com.hiosdra.openanchor.domain.drift.DriftAnalysis
import com.hiosdra.openanchor.domain.drift.DriftDetector
import com.hiosdra.openanchor.domain.geometry.ZoneCheckResult
import com.hiosdra.openanchor.domain.model.AlarmState
import com.hiosdra.openanchor.domain.model.AnchorZone
import com.hiosdra.openanchor.domain.model.Position
import com.hiosdra.openanchor.domain.model.TrackPoint
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class GpsProcessorTest {

    private lateinit var alarmEngine: AlarmEngine
    private lateinit var driftDetector: DriftDetector
    private lateinit var processor: GpsProcessor

    private val anchorPosition = Position(latitude = 43.695, longitude = 7.265, timestamp = 0L)
    private val zone = AnchorZone.Circle(
        anchorPosition = anchorPosition,
        radiusMeters = 50.0
    )
    private val sessionId = 1L

    @Before
    fun setUp() {
        alarmEngine = mockk()
        driftDetector = mockk()
        processor = GpsProcessor(alarmEngine, driftDetector)

        every { alarmEngine.processReading(any<ZoneCheckResult>()) } returns AlarmState.SAFE
        every { driftDetector.analyze(any(), any()) } returns DriftAnalysis()
    }

    // ========== SOG / COG computation ==========

    @Test
    fun `first position has no SOG or COG`() {
        val pos = Position(latitude = 43.695, longitude = 7.265, timestamp = 1000L)
        val result = processor.processPosition(pos, anchorPosition, zone, sessionId)

        assertNull(result.sog)
        assertNull(result.cog)
    }

    @Test
    fun `second position computes SOG and COG`() {
        val pos1 = Position(latitude = 43.695, longitude = 7.265, timestamp = 1000L)
        // ~111 m north per 0.001 deg latitude
        val pos2 = Position(latitude = 43.696, longitude = 7.265, timestamp = 2000L)

        processor.processPosition(pos1, anchorPosition, zone, sessionId)
        val result = processor.processPosition(pos2, anchorPosition, zone, sessionId)

        assertNotNull(result.sog)
        assertNotNull(result.cog)
        assertTrue("SOG should be positive", result.sog!! > 0.0)
    }

    @Test
    fun `SOG not computed when time delta less than 500ms`() {
        val pos1 = Position(latitude = 43.695, longitude = 7.265, timestamp = 1000L)
        val pos2 = Position(latitude = 43.696, longitude = 7.265, timestamp = 1400L)

        processor.processPosition(pos1, anchorPosition, zone, sessionId)
        val result = processor.processPosition(pos2, anchorPosition, zone, sessionId)

        assertNull(result.sog)
        assertNull(result.cog)
    }

    @Test
    fun `SOG not computed when time delta exactly 500ms`() {
        val pos1 = Position(latitude = 43.695, longitude = 7.265, timestamp = 1000L)
        val pos2 = Position(latitude = 43.696, longitude = 7.265, timestamp = 1500L)

        processor.processPosition(pos1, anchorPosition, zone, sessionId)
        val result = processor.processPosition(pos2, anchorPosition, zone, sessionId)

        assertNull("SOG should be null at exactly 0.5s (requires > 0.5s)", result.sog)
    }

    @Test
    fun `SOG computed when time delta just over 500ms`() {
        val pos1 = Position(latitude = 43.695, longitude = 7.265, timestamp = 1000L)
        val pos2 = Position(latitude = 43.696, longitude = 7.265, timestamp = 1501L)

        processor.processPosition(pos1, anchorPosition, zone, sessionId)
        val result = processor.processPosition(pos2, anchorPosition, zone, sessionId)

        assertNotNull("SOG should be computed at > 0.5s delta", result.sog)
    }

    @Test
    fun `SOG is in knots`() {
        val pos1 = Position(latitude = 43.695, longitude = 7.265, timestamp = 1000L)
        // Move ~111m north in 1 second → ~111 m/s → ~215.8 knots
        val pos2 = Position(latitude = 43.696, longitude = 7.265, timestamp = 2000L)

        processor.processPosition(pos1, anchorPosition, zone, sessionId)
        val result = processor.processPosition(pos2, anchorPosition, zone, sessionId)

        val sogKnots = result.sog!!
        // 111m / 1s * 1.94384 ≈ 215.8 knots (approximate due to haversine)
        assertTrue("SOG should be roughly 215 knots", sogKnots in 200.0..230.0)
    }

    // ========== Track point creation ==========

    @Test
    fun `track point has correct session id and distance`() {
        val pos = Position(latitude = 43.695, longitude = 7.265, timestamp = 1000L)
        val result = processor.processPosition(pos, anchorPosition, zone, sessionId)

        assertEquals(sessionId, result.trackPoint.sessionId)
        assertEquals(result.distance.toFloat(), result.trackPoint.distanceToAnchor, 0.001f)
    }

    @Test
    fun `track point isAlarm true when alarm state is ALARM`() {
        every { alarmEngine.processReading(any<ZoneCheckResult>()) } returns AlarmState.ALARM

        val pos = Position(latitude = 43.695, longitude = 7.265, timestamp = 1000L)
        val result = processor.processPosition(pos, anchorPosition, zone, sessionId)

        assertTrue(result.trackPoint.isAlarm)
        assertEquals("ALARM", result.trackPoint.alarmState)
    }

    @Test
    fun `track point isAlarm false when alarm state is SAFE`() {
        val pos = Position(latitude = 43.695, longitude = 7.265, timestamp = 1000L)
        val result = processor.processPosition(pos, anchorPosition, zone, sessionId)

        assertFalse(result.trackPoint.isAlarm)
        assertEquals("SAFE", result.trackPoint.alarmState)
    }

    @Test
    fun `track point isAlarm false when alarm state is WARNING`() {
        every { alarmEngine.processReading(any<ZoneCheckResult>()) } returns AlarmState.WARNING

        val pos = Position(latitude = 43.695, longitude = 7.265, timestamp = 1000L)
        val result = processor.processPosition(pos, anchorPosition, zone, sessionId)

        assertFalse(result.trackPoint.isAlarm)
        assertEquals("WARNING", result.trackPoint.alarmState)
    }

    // ========== Session max distance ==========

    @Test
    fun `session max distance tracks maximum`() {
        // Position far from anchor
        val posFar = Position(latitude = 43.700, longitude = 7.265, timestamp = 1000L)
        // Position close to anchor
        val posClose = Position(latitude = 43.6951, longitude = 7.265, timestamp = 2000L)

        val result1 = processor.processPosition(posFar, anchorPosition, zone, sessionId)
        val result2 = processor.processPosition(posClose, anchorPosition, zone, sessionId)

        assertTrue("Max distance should remain from the farther position",
            result2.maxDistance >= result1.distance)
        assertEquals(result1.distance, result2.maxDistance, 0.001)
    }

    @Test
    fun `getSessionMaxDistance returns correct value`() {
        val pos = Position(latitude = 43.700, longitude = 7.265, timestamp = 1000L)
        val result = processor.processPosition(pos, anchorPosition, zone, sessionId)

        assertEquals(result.maxDistance, processor.getSessionMaxDistance(), 0.001)
    }

    // ========== Session max SOG ==========

    @Test
    fun `session max SOG tracks maximum`() {
        val pos1 = Position(latitude = 43.695, longitude = 7.265, timestamp = 1000L)
        // Fast movement
        val pos2 = Position(latitude = 43.696, longitude = 7.265, timestamp = 2000L)
        // Slow movement
        val pos3 = Position(latitude = 43.69601, longitude = 7.265, timestamp = 3000L)

        processor.processPosition(pos1, anchorPosition, zone, sessionId)
        val fast = processor.processPosition(pos2, anchorPosition, zone, sessionId)
        val slow = processor.processPosition(pos3, anchorPosition, zone, sessionId)

        assertTrue("Max SOG should remain from the faster segment",
            slow.maxSog >= fast.sog!!)
        assertEquals(fast.sog!!, slow.maxSog, 0.001)
    }

    @Test
    fun `getSessionMaxSog returns correct value`() {
        val pos1 = Position(latitude = 43.695, longitude = 7.265, timestamp = 1000L)
        val pos2 = Position(latitude = 43.696, longitude = 7.265, timestamp = 2000L)

        processor.processPosition(pos1, anchorPosition, zone, sessionId)
        val result = processor.processPosition(pos2, anchorPosition, zone, sessionId)

        assertEquals(result.maxSog, processor.getSessionMaxSog(), 0.001)
    }

    @Test
    fun `max SOG not updated when SOG is null`() {
        val pos = Position(latitude = 43.696, longitude = 7.265, timestamp = 1000L)
        processor.processPosition(pos, anchorPosition, zone, sessionId)

        assertEquals(0.0, processor.getSessionMaxSog(), 0.001)
    }

    // ========== Reset ==========

    @Test
    fun `reset clears all session state`() {
        val pos1 = Position(latitude = 43.695, longitude = 7.265, timestamp = 1000L)
        val pos2 = Position(latitude = 43.700, longitude = 7.265, timestamp = 2000L)
        processor.processPosition(pos1, anchorPosition, zone, sessionId)
        processor.processPosition(pos2, anchorPosition, zone, sessionId)

        processor.reset()

        assertEquals(0.0, processor.getSessionMaxDistance(), 0.001)
        assertEquals(0.0, processor.getSessionMaxSog(), 0.001)
    }

    @Test
    fun `reset clears previous position so next call has no SOG`() {
        val pos1 = Position(latitude = 43.695, longitude = 7.265, timestamp = 1000L)
        processor.processPosition(pos1, anchorPosition, zone, sessionId)

        processor.reset()

        val pos2 = Position(latitude = 43.696, longitude = 7.265, timestamp = 2000L)
        val result = processor.processPosition(pos2, anchorPosition, zone, sessionId)

        assertNull("SOG should be null after reset", result.sog)
        assertNull("COG should be null after reset", result.cog)
    }

    // ========== Track point buffer cap ==========

    @Test
    fun `track points capped at 30`() {
        for (i in 0 until 35) {
            val pos = Position(
                latitude = 43.695 + i * 0.0001,
                longitude = 7.265,
                timestamp = (i + 1) * 2000L // >0.5s apart for SOG
            )
            processor.processPosition(pos, anchorPosition, zone, sessionId)
        }

        // The drift detector should receive at most 30 track points
        verify(atLeast = 1) {
            driftDetector.analyze(match { it.size <= 30 }, any())
        }
    }

    // ========== Alarm engine and drift detector integration ==========

    @Test
    fun `alarm engine receives zone check result`() {
        every { alarmEngine.processReading(ZoneCheckResult.INSIDE) } returns AlarmState.SAFE

        val pos = Position(latitude = 43.695, longitude = 7.265, timestamp = 1000L)
        processor.processPosition(pos, anchorPosition, zone, sessionId)

        verify { alarmEngine.processReading(any<ZoneCheckResult>()) }
    }

    @Test
    fun `result reflects alarm state from engine`() {
        every { alarmEngine.processReading(any<ZoneCheckResult>()) } returns AlarmState.CAUTION

        val pos = Position(latitude = 43.695, longitude = 7.265, timestamp = 1000L)
        val result = processor.processPosition(pos, anchorPosition, zone, sessionId)

        assertEquals(AlarmState.CAUTION, result.alarmState)
    }

    @Test
    fun `drift analysis returned in result`() {
        val analysis = DriftAnalysis(isDragging = true, driftSpeedMpm = 5.0)
        every { driftDetector.analyze(any(), any()) } returns analysis

        val pos = Position(latitude = 43.695, longitude = 7.265, timestamp = 1000L)
        val result = processor.processPosition(pos, anchorPosition, zone, sessionId)

        assertEquals(analysis, result.driftAnalysis)
    }

    @Test
    fun `drift detector receives anchor position`() {
        val pos = Position(latitude = 43.695, longitude = 7.265, timestamp = 1000L)
        processor.processPosition(pos, anchorPosition, zone, sessionId)

        verify { driftDetector.analyze(any(), eq(anchorPosition)) }
    }
}
