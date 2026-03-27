package com.hiosdra.openanchor.wear.data.db

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE, sdk = [33])
class WearDatabaseTest {

    private lateinit var database: WearDatabase
    private lateinit var stateDao: WearStateDao
    private lateinit var trackPointDao: WearTrackPointDao
    private lateinit var connectionHistoryDao: WearConnectionHistoryDao

    @Before
    fun setup() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        database = Room.inMemoryDatabaseBuilder(context, WearDatabase::class.java)
            .allowMainThreadQueries()
            .build()
        stateDao = database.stateDao()
        trackPointDao = database.trackPointDao()
        connectionHistoryDao = database.connectionHistoryDao()
    }

    @After
    fun tearDown() {
        database.close()
    }

    // -- WearStateDao tests --

    @Test
    fun `should upsert and retrieve cached state`() = runTest {
        val entity = WearCachedStateEntity(
            alarmState = "SAFE",
            distanceMeters = 42.0,
            gpsAccuracyMeters = 5f,
            gpsSignalLost = false,
            isActive = true,
            lastUpdatedTimestamp = 1000L
        )

        stateDao.upsert(entity)
        val result = stateDao.getLastState()

        assertNotNull(result)
        assertEquals("SAFE", result!!.alarmState)
        assertEquals(42.0, result.distanceMeters, 0.01)
        assertTrue(result.isActive)
    }

    @Test
    fun `should overwrite cached state on upsert`() = runTest {
        val first = WearCachedStateEntity(
            alarmState = "SAFE",
            distanceMeters = 10.0,
            gpsAccuracyMeters = 2f,
            gpsSignalLost = false,
            isActive = true,
            lastUpdatedTimestamp = 1000L
        )
        val second = WearCachedStateEntity(
            alarmState = "ALARM",
            distanceMeters = 99.0,
            gpsAccuracyMeters = 20f,
            gpsSignalLost = true,
            isActive = true,
            lastUpdatedTimestamp = 2000L
        )

        stateDao.upsert(first)
        stateDao.upsert(second)

        val result = stateDao.getLastState()
        assertNotNull(result)
        assertEquals("ALARM", result!!.alarmState)
        assertEquals(99.0, result.distanceMeters, 0.01)
        assertEquals(2000L, result.lastUpdatedTimestamp)
    }

    @Test
    fun `should return null when no cached state exists`() = runTest {
        val result = stateDao.getLastState()
        assertNull(result)
    }

    // -- WearTrackPointDao tests --

    @Test
    fun `should insert and retrieve track points`() = runTest {
        val point = WearTrackPointEntity(
            distanceMeters = 25.0,
            timestamp = 1000L,
            alarmState = "CAUTION"
        )

        trackPointDao.insert(point)
        val results = trackPointDao.getLastPoints(10)

        assertEquals(1, results.size)
        assertEquals(25.0, results[0].distanceMeters, 0.01)
        assertEquals("CAUTION", results[0].alarmState)
    }

    @Test
    fun `should return points in descending timestamp order`() = runTest {
        trackPointDao.insert(WearTrackPointEntity(distanceMeters = 10.0, timestamp = 100L, alarmState = "SAFE"))
        trackPointDao.insert(WearTrackPointEntity(distanceMeters = 20.0, timestamp = 300L, alarmState = "SAFE"))
        trackPointDao.insert(WearTrackPointEntity(distanceMeters = 30.0, timestamp = 200L, alarmState = "SAFE"))

        val results = trackPointDao.getLastPoints(10)

        assertEquals(3, results.size)
        assertEquals(300L, results[0].timestamp)
        assertEquals(200L, results[1].timestamp)
        assertEquals(100L, results[2].timestamp)
    }

    @Test
    fun `should trim track points to max count`() = runTest {
        // Insert 5 points
        for (i in 1..5) {
            trackPointDao.insert(
                WearTrackPointEntity(
                    distanceMeters = i.toDouble(),
                    timestamp = i.toLong() * 1000,
                    alarmState = "SAFE"
                )
            )
        }

        assertEquals(5, trackPointDao.count())

        // Trim to 3
        trackPointDao.trimToMaxCount(3)

        assertEquals(3, trackPointDao.count())

        // Should keep the 3 most recent
        val remaining = trackPointDao.getLastPoints(10)
        assertEquals(3, remaining.size)
        assertEquals(5000L, remaining[0].timestamp)
        assertEquals(4000L, remaining[1].timestamp)
        assertEquals(3000L, remaining[2].timestamp)
    }

    @Test
    fun `should not trim when under max count`() = runTest {
        trackPointDao.insert(WearTrackPointEntity(distanceMeters = 1.0, timestamp = 100L, alarmState = "SAFE"))
        trackPointDao.insert(WearTrackPointEntity(distanceMeters = 2.0, timestamp = 200L, alarmState = "SAFE"))

        trackPointDao.trimToMaxCount(100)

        assertEquals(2, trackPointDao.count())
    }

    @Test
    fun `should limit returned points`() = runTest {
        for (i in 1..10) {
            trackPointDao.insert(
                WearTrackPointEntity(
                    distanceMeters = i.toDouble(),
                    timestamp = i.toLong(),
                    alarmState = "SAFE"
                )
            )
        }

        val results = trackPointDao.getLastPoints(3)
        assertEquals(3, results.size)
    }

    // -- WearConnectionHistoryDao tests --

    @Test
    fun `should insert and retrieve connection history`() = runTest {
        val entry = WearConnectionHistoryEntity(
            phoneNodeId = "node-1",
            phoneDisplayName = "Pixel 8",
            connectedAt = 1000L
        )

        connectionHistoryDao.insert(entry)
        val results = connectionHistoryDao.getRecent(10)

        assertEquals(1, results.size)
        assertEquals("node-1", results[0].phoneNodeId)
        assertEquals("Pixel 8", results[0].phoneDisplayName)
        assertNull(results[0].disconnectedAt)
    }

    @Test
    fun `should update disconnect time`() = runTest {
        val entry = WearConnectionHistoryEntity(
            phoneNodeId = "node-1",
            phoneDisplayName = "Phone",
            connectedAt = 1000L
        )

        connectionHistoryDao.insert(entry)
        val inserted = connectionHistoryDao.getRecent(1)[0]

        connectionHistoryDao.updateDisconnectTime(inserted.id, 5000L)

        val updated = connectionHistoryDao.getRecent(1)[0]
        assertEquals(5000L, updated.disconnectedAt)
    }

    @Test
    fun `should return active connection without disconnect time`() = runTest {
        connectionHistoryDao.insert(
            WearConnectionHistoryEntity(
                phoneNodeId = "old-node",
                phoneDisplayName = "Old Phone",
                connectedAt = 1000L,
                disconnectedAt = 2000L
            )
        )
        connectionHistoryDao.insert(
            WearConnectionHistoryEntity(
                phoneNodeId = "active-node",
                phoneDisplayName = "Active Phone",
                connectedAt = 3000L
            )
        )

        val active = connectionHistoryDao.getActiveConnection()
        assertNotNull(active)
        assertEquals("active-node", active!!.phoneNodeId)
    }

    @Test
    fun `should return null when no active connection`() = runTest {
        connectionHistoryDao.insert(
            WearConnectionHistoryEntity(
                phoneNodeId = "node-1",
                phoneDisplayName = "Phone",
                connectedAt = 1000L,
                disconnectedAt = 2000L
            )
        )

        val active = connectionHistoryDao.getActiveConnection()
        assertNull(active)
    }

    @Test
    fun `should return recent connections in descending order`() = runTest {
        connectionHistoryDao.insert(
            WearConnectionHistoryEntity(phoneNodeId = "n1", phoneDisplayName = "P1", connectedAt = 100L)
        )
        connectionHistoryDao.insert(
            WearConnectionHistoryEntity(phoneNodeId = "n2", phoneDisplayName = "P2", connectedAt = 300L)
        )
        connectionHistoryDao.insert(
            WearConnectionHistoryEntity(phoneNodeId = "n3", phoneDisplayName = "P3", connectedAt = 200L)
        )

        val results = connectionHistoryDao.getRecent(10)
        assertEquals(3, results.size)
        assertEquals("n2", results[0].phoneNodeId)
        assertEquals("n3", results[1].phoneNodeId)
        assertEquals("n1", results[2].phoneNodeId)
    }

    // -- WearCachedStateEntity conversion tests --

    @Test
    fun `should convert entity to monitor state`() {
        val entity = WearCachedStateEntity(
            alarmState = "WARNING",
            distanceMeters = 35.5,
            gpsAccuracyMeters = 12f,
            gpsSignalLost = true,
            isActive = true,
            lastUpdatedTimestamp = 7777L
        )

        val state = entity.toMonitorState()

        assertEquals(com.hiosdra.openanchor.wear.data.WearAlarmState.WARNING, state.alarmState)
        assertEquals(35.5, state.distanceMeters, 0.01)
        assertEquals(12f, state.gpsAccuracyMeters, 0.01f)
        assertTrue(state.gpsSignalLost)
        assertTrue(state.isActive)
        assertEquals(7777L, state.timestamp)
    }

    @Test
    fun `should convert monitor state to entity`() {
        val state = com.hiosdra.openanchor.wear.data.WearMonitorState(
            isActive = true,
            alarmState = com.hiosdra.openanchor.wear.data.WearAlarmState.CAUTION,
            distanceMeters = 22.0,
            gpsAccuracyMeters = 6f,
            gpsSignalLost = false,
            timestamp = 8888L
        )

        val entity = WearCachedStateEntity.from(state)

        assertEquals("CAUTION", entity.alarmState)
        assertEquals(22.0, entity.distanceMeters, 0.01)
        assertEquals(6f, entity.gpsAccuracyMeters, 0.01f)
        assertEquals(false, entity.gpsSignalLost)
        assertEquals(true, entity.isActive)
        assertEquals(8888L, entity.lastUpdatedTimestamp)
    }
}
