package com.hiosdra.openanchor.data.repository

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.hiosdra.openanchor.data.db.OpenAnchorDatabase
import com.hiosdra.openanchor.domain.model.AnchorSession
import com.hiosdra.openanchor.domain.model.AnchorZone
import com.hiosdra.openanchor.domain.model.Position
import com.hiosdra.openanchor.domain.model.TrackPoint
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Robolectric-based tests for AnchorSessionRepository using in-memory Room database.
 * These tests run in the JVM and provide comprehensive coverage of repository operations.
 */
@RunWith(AndroidJUnit4::class)
class AnchorSessionRepositoryTest {

    private lateinit var database: OpenAnchorDatabase
    private lateinit var repository: AnchorSessionRepository

    @Before
    fun setup() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        database = Room.inMemoryDatabaseBuilder(context, OpenAnchorDatabase::class.java)
            .allowMainThreadQueries()
            .build()

        repository = AnchorSessionRepository(
            sessionDao = database.anchorSessionDao(),
            trackPointDao = database.trackPointDao()
        )
    }

    @After
    fun teardown() {
        database.close()
    }

    // ============== Session Insert Tests ==============

    @Test
    fun `insertSession inserts new session and returns id`() = runTest {
        val session = createTestSession()

        val id = repository.insertSession(session)

        assertTrue(id > 0)
        val retrieved = repository.getSessionById(id)
        assertNotNull(retrieved)
        assertEquals(id, retrieved?.id)
    }

    @Test
    fun `insertSession with Circle zone stores correctly`() = runTest {
        val session = createTestSession(
            zone = AnchorZone.Circle(
                anchorPosition = Position(52.0, 13.0),
                radiusMeters = 50.0,
                bufferRadiusMeters = 75.0
            )
        )

        val id = repository.insertSession(session)
        val retrieved = repository.getSessionById(id)

        assertNotNull(retrieved)
        assertTrue(retrieved?.zone is AnchorZone.Circle)
        assertEquals(50.0, retrieved?.zone?.radiusMeters ?: 0.0, 0.0001)
    }

    @Test
    fun `insertSession with Sector zone stores correctly`() = runTest {
        val session = createTestSession(
            zone = AnchorZone.SectorWithCircle(
                anchorPosition = Position(52.0, 13.0),
                radiusMeters = 40.0,
                bufferRadiusMeters = 60.0,
                sectorRadiusMeters = 80.0,
                sectorHalfAngleDeg = 45.0,
                sectorBearingDeg = 90.0
            )
        )

        val id = repository.insertSession(session)
        val retrieved = repository.getSessionById(id)

        assertNotNull(retrieved)
        assertTrue(retrieved?.zone is AnchorZone.SectorWithCircle)
        val sector = retrieved?.zone as AnchorZone.SectorWithCircle
        assertEquals(80.0, sector.sectorRadiusMeters, 0.0001)
        assertEquals(45.0, sector.sectorHalfAngleDeg, 0.0001)
    }

    // ============== Session Update Tests ==============

    @Test
    fun `updateSession modifies existing session`() = runTest {
        val session = createTestSession()
        val id = repository.insertSession(session)

        val updated = session.copy(
            id = id,
            endTime = 5000L,
            alarmTriggered = true,
            alarmCount = 3
        )
        repository.updateSession(updated)

        val retrieved = repository.getSessionById(id)
        assertEquals(5000L, retrieved?.endTime)
        assertTrue(retrieved?.alarmTriggered == true)
        assertEquals(3, retrieved?.alarmCount)
    }

    @Test
    fun `updateSession with changed zone type works correctly`() = runTest {
        val session = createTestSession()
        val id = repository.insertSession(session)

        val newZone = AnchorZone.SectorWithCircle(
            anchorPosition = Position(52.0, 13.0),
            radiusMeters = 40.0,
            bufferRadiusMeters = null,
            sectorRadiusMeters = 80.0,
            sectorHalfAngleDeg = 60.0,
            sectorBearingDeg = 180.0
        )
        val updated = session.copy(id = id, zone = newZone)
        repository.updateSession(updated)

        val retrieved = repository.getSessionById(id)
        assertTrue(retrieved?.zone is AnchorZone.SectorWithCircle)
    }

    // ============== Session Delete Tests ==============

    @Test
    fun `deleteSession removes session from database`() = runTest {
        val session = createTestSession()
        val id = repository.insertSession(session)

        repository.deleteSession(id)

        val retrieved = repository.getSessionById(id)
        assertNull(retrieved)
    }

    @Test
    fun `deleteSession cascades to track points`() = runTest {
        val session = createTestSession()
        val id = repository.insertSession(session)

        // Insert track points
        val trackPoint1 = createTrackPoint(sessionId = id)
        val trackPoint2 = createTrackPoint(sessionId = id)
        repository.insertTrackPoint(trackPoint1)
        repository.insertTrackPoint(trackPoint2)

        // Verify track points exist
        val pointsBefore = repository.getTrackPointsOnce(id)
        assertEquals(2, pointsBefore.size)

        // Delete session
        repository.deleteSession(id)

        // Verify track points are deleted (cascade)
        val pointsAfter = repository.getTrackPointsOnce(id)
        assertEquals(0, pointsAfter.size)
    }

    // ============== Session Query Tests ==============

    @Test
    fun `observeAllSessions returns empty list initially`() = runTest {
        val sessions = repository.observeAllSessions().first()
        assertTrue(sessions.isEmpty())
    }

    @Test
    fun `observeAllSessions returns all inserted sessions`() = runTest {
        val session1 = createTestSession()
        val session2 = createTestSession()
        repository.insertSession(session1)
        repository.insertSession(session2)

        val sessions = repository.observeAllSessions().first()
        assertEquals(2, sessions.size)
    }

    @Test
    fun `observeActiveSession returns null when no active session`() = runTest {
        val active = repository.observeActiveSession().first()
        assertNull(active)
    }

    @Test
    fun `observeActiveSession returns session without endTime`() = runTest {
        // Insert completed session
        val completed = createTestSession(endTime = 5000L)
        repository.insertSession(completed)

        // Insert active session
        val active = createTestSession(endTime = null)
        repository.insertSession(active)

        val retrieved = repository.observeActiveSession().first()
        assertNotNull(retrieved)
        assertNull(retrieved?.endTime)
    }

    @Test
    fun `getActiveSession returns null when no active session`() = runTest {
        val active = repository.getActiveSession()
        assertNull(active)
    }

    @Test
    fun `getActiveSession returns correct session`() = runTest {
        val session = createTestSession(endTime = null)
        val id = repository.insertSession(session)

        val active = repository.getActiveSession()
        assertNotNull(active)
        assertEquals(id, active?.id)
    }

    @Test
    fun `observeSession returns specific session`() = runTest {
        val session1 = createTestSession()
        val session2 = createTestSession()
        val id1 = repository.insertSession(session1)
        repository.insertSession(session2)

        val retrieved = repository.observeSession(id1).first()
        assertNotNull(retrieved)
        assertEquals(id1, retrieved?.id)
    }

    @Test
    fun `observeSession returns null for non-existent id`() = runTest {
        val retrieved = repository.observeSession(999L).first()
        assertNull(retrieved)
    }

    // ============== Track Point Tests ==============

    @Test
    fun `insertTrackPoint inserts track point`() = runTest {
        val session = createTestSession()
        val sessionId = repository.insertSession(session)

        val trackPoint = createTrackPoint(sessionId = sessionId)
        repository.insertTrackPoint(trackPoint)

        val points = repository.getTrackPointsOnce(sessionId)
        assertEquals(1, points.size)
    }

    @Test
    fun `insertTrackPoint stores all fields correctly`() = runTest {
        val session = createTestSession()
        val sessionId = repository.insertSession(session)

        val trackPoint = TrackPoint(
            sessionId = sessionId,
            position = Position(52.5, 13.5, 10.0f, 1000L),
            distanceToAnchor = 25.5f,
            isAlarm = true,
            alarmState = "ALARM"
        )
        repository.insertTrackPoint(trackPoint)

        val points = repository.getTrackPointsOnce(sessionId)
        assertEquals(1, points.size)
        assertEquals(52.5, points[0].position.latitude, 0.0001)
        assertEquals(25.5f, points[0].distanceToAnchor, 0.001f)
        assertTrue(points[0].isAlarm)
    }

    @Test
    fun `observeTrackPoints returns flow of track points`() = runTest {
        val session = createTestSession()
        val sessionId = repository.insertSession(session)

        val trackPoint1 = createTrackPoint(sessionId = sessionId)
        val trackPoint2 = createTrackPoint(sessionId = sessionId)
        repository.insertTrackPoint(trackPoint1)
        repository.insertTrackPoint(trackPoint2)

        val points = repository.observeTrackPoints(sessionId).first()
        assertEquals(2, points.size)
    }

    @Test
    fun `getTrackPointCount returns correct count`() = runTest {
        val session = createTestSession()
        val sessionId = repository.insertSession(session)

        repository.insertTrackPoint(createTrackPoint(sessionId = sessionId))
        repository.insertTrackPoint(createTrackPoint(sessionId = sessionId))
        repository.insertTrackPoint(createTrackPoint(sessionId = sessionId))

        val count = repository.getTrackPointCount(sessionId)
        assertEquals(3, count)
    }

    @Test
    fun `getTrackPointCount returns zero for session with no points`() = runTest {
        val session = createTestSession()
        val sessionId = repository.insertSession(session)

        val count = repository.getTrackPointCount(sessionId)
        assertEquals(0, count)
    }

    // ============== Statistics Tests ==============

    @Test
    fun `getCompletedSessionCount returns zero initially`() = runTest {
        val count = repository.getCompletedSessionCount()
        assertEquals(0, count)
    }

    @Test
    fun `getCompletedSessionCount returns correct count`() = runTest {
        // Insert completed sessions
        repository.insertSession(createTestSession(endTime = 5000L))
        repository.insertSession(createTestSession(endTime = 6000L))
        // Insert active session
        repository.insertSession(createTestSession(endTime = null))

        val count = repository.getCompletedSessionCount()
        assertEquals(2, count)
    }

    @Test
    fun `getTotalAlarmCount sums alarm counts`() = runTest {
        repository.insertSession(createTestSession(alarmCount = 3))
        repository.insertSession(createTestSession(alarmCount = 5))
        repository.insertSession(createTestSession(alarmCount = 2))

        val total = repository.getTotalAlarmCount()
        assertEquals(10, total)
    }

    @Test
    fun `getTotalAnchoredMillis calculates total time`() = runTest {
        repository.insertSession(createTestSession(startTime = 1000L, endTime = 3000L)) // 2000ms
        repository.insertSession(createTestSession(startTime = 5000L, endTime = 8000L)) // 3000ms

        val total = repository.getTotalAnchoredMillis()
        assertEquals(5000L, total)
    }

    @Test
    fun `getLongestSessionMillis returns longest duration`() = runTest {
        repository.insertSession(createTestSession(startTime = 1000L, endTime = 3000L)) // 2000ms
        repository.insertSession(createTestSession(startTime = 5000L, endTime = 10000L)) // 5000ms
        repository.insertSession(createTestSession(startTime = 15000L, endTime = 18000L)) // 3000ms

        val longest = repository.getLongestSessionMillis()
        assertEquals(5000L, longest)
    }

    @Test
    fun `getAverageSessionMillis calculates average duration`() = runTest {
        repository.insertSession(createTestSession(startTime = 1000L, endTime = 3000L)) // 2000ms
        repository.insertSession(createTestSession(startTime = 5000L, endTime = 9000L)) // 4000ms
        repository.insertSession(createTestSession(startTime = 15000L, endTime = 21000L)) // 6000ms

        val average = repository.getAverageSessionMillis()
        assertEquals(4000L, average) // (2000 + 4000 + 6000) / 3
    }

    @Test
    fun `getMaxRadiusUsed returns largest radius`() = runTest {
        repository.insertSession(createTestSession(radius = 50.0))
        repository.insertSession(createTestSession(radius = 100.0))
        repository.insertSession(createTestSession(radius = 75.0))

        val max = repository.getMaxRadiusUsed()
        assertEquals(100.0, max, 0.0001)
    }

    @Test
    fun `getAverageRadius calculates average radius`() = runTest {
        repository.insertSession(createTestSession(radius = 50.0, endTime = 3000L))
        repository.insertSession(createTestSession(radius = 100.0, endTime = 4000L))
        repository.insertSession(createTestSession(radius = 80.0, endTime = 5000L))

        val average = repository.getAverageRadius()
        // Should be approximately (50 + 100 + 80) / 3 = 76.67
        assertEquals(76.67, average, 0.5)
    }

    // ============== Integration Tests ==============

    @Test
    fun `complete workflow - insert, track, update, delete`() = runTest {
        // Insert session
        val session = createTestSession()
        val sessionId = repository.insertSession(session)

        // Add track points
        repository.insertTrackPoint(createTrackPoint(sessionId = sessionId))
        repository.insertTrackPoint(createTrackPoint(sessionId = sessionId))

        // Verify
        val points = repository.getTrackPointsOnce(sessionId)
        assertEquals(2, points.size)

        // Update session
        val updated = session.copy(id = sessionId, endTime = 5000L, alarmCount = 1)
        repository.updateSession(updated)

        // Verify update
        val retrieved = repository.getSessionById(sessionId)
        assertEquals(1, retrieved?.alarmCount)

        // Delete
        repository.deleteSession(sessionId)

        // Verify deletion
        val deleted = repository.getSessionById(sessionId)
        assertNull(deleted)
    }

    @Test
    fun `multiple concurrent sessions work correctly`() = runTest {
        // Insert multiple sessions
        val id1 = repository.insertSession(createTestSession())
        val id2 = repository.insertSession(createTestSession())
        val id3 = repository.insertSession(createTestSession())

        // Add track points to each
        repository.insertTrackPoint(createTrackPoint(sessionId = id1))
        repository.insertTrackPoint(createTrackPoint(sessionId = id1))
        repository.insertTrackPoint(createTrackPoint(sessionId = id2))

        // Verify counts
        assertEquals(2, repository.getTrackPointCount(id1))
        assertEquals(1, repository.getTrackPointCount(id2))
        assertEquals(0, repository.getTrackPointCount(id3))
    }

    // ============== Helper Methods ==============

    private fun createTestSession(
        endTime: Long? = null,
        alarmCount: Int = 0,
        radius: Double = 50.0,
        startTime: Long = 1000L,
        zone: AnchorZone? = null
    ): AnchorSession {
        val position = Position(52.0, 13.0)
        val actualZone = zone ?: AnchorZone.Circle(
            anchorPosition = position,
            radiusMeters = radius,
            bufferRadiusMeters = null
        )

        return AnchorSession(
            anchorPosition = position,
            zone = actualZone,
            startTime = startTime,
            endTime = endTime,
            alarmCount = alarmCount
        )
    }

    private fun createTrackPoint(sessionId: Long): TrackPoint {
        return TrackPoint(
            sessionId = sessionId,
            position = Position(52.1, 13.1, 10.0f, System.currentTimeMillis()),
            distanceToAnchor = 15.0f,
            isAlarm = false,
            alarmState = "SAFE"
        )
    }
}
