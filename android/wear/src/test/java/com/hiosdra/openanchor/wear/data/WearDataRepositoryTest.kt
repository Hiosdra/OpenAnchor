package com.hiosdra.openanchor.wear.data

import android.util.Log
import app.cash.turbine.test
import com.hiosdra.openanchor.wear.data.db.WearCachedStateEntity
import com.hiosdra.openanchor.wear.data.db.WearStateDao
import com.hiosdra.openanchor.wear.data.db.WearTrackPointDao
import com.hiosdra.openanchor.wear.data.db.WearTrackPointEntity
import io.mockk.Runs
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.just
import io.mockk.mockk
import io.mockk.mockkStatic
import io.mockk.unmockkAll
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class WearDataRepositoryTest {

    private val testDispatcher = UnconfinedTestDispatcher()

    private lateinit var stateHolder: WearMonitorStateHolder
    private lateinit var connectionManager: WearConnectionManager
    private lateinit var stateDao: WearStateDao
    private lateinit var trackPointDao: WearTrackPointDao
    private lateinit var repository: WearDataRepository

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        mockkStatic(Log::class)
        io.mockk.every { Log.d(any(), any()) } returns 0
        io.mockk.every { Log.w(any<String>(), any<String>()) } returns 0
        io.mockk.every { Log.w(any<String>(), any<String>(), any()) } returns 0
        io.mockk.every { Log.e(any(), any(), any()) } returns 0

        stateHolder = WearMonitorStateHolder()
        stateDao = mockk(relaxed = true)
        trackPointDao = mockk(relaxed = true)

        // Create a mock connectionManager
        connectionManager = mockk(relaxed = true)
        every { connectionManager.connected } returns kotlinx.coroutines.flow.MutableStateFlow(false)

        repository = WearDataRepository(
            stateHolder = stateHolder,
            connectionManager = connectionManager,
            stateDao = stateDao,
            trackPointDao = trackPointDao
        ).also {
            it.ioDispatcher = testDispatcher
        }
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
        unmockkAll()
    }

    @Test
    fun `should emit state when updated`() = runTest {
        val newState = WearMonitorState(
            isActive = true,
            alarmState = WearAlarmState.CAUTION,
            distanceMeters = 42.0,
            gpsAccuracyMeters = 5f,
            timestamp = 1000L
        )

        repository.state.test {
            assertEquals(WearMonitorState(), awaitItem()) // initial

            repository.onStateReceived(newState)
            assertEquals(newState, awaitItem())
        }
    }

    @Test
    fun `should persist state to Room on receive`() = runTest {
        val newState = WearMonitorState(
            isActive = true,
            alarmState = WearAlarmState.SAFE,
            distanceMeters = 10.0,
            gpsAccuracyMeters = 3f,
            timestamp = 2000L
        )

        repository.onStateReceived(newState)
        testScheduler.advanceUntilIdle()

        coVerify { stateDao.upsert(any()) }
        coVerify { trackPointDao.insert(any()) }
        coVerify { trackPointDao.trimToMaxCount(100) }
    }

    @Test
    fun `should load cached state on loadCachedState`() = runTest {
        val cached = WearCachedStateEntity(
            alarmState = "WARNING",
            distanceMeters = 25.0,
            gpsAccuracyMeters = 8f,
            gpsSignalLost = false,
            isActive = true,
            lastUpdatedTimestamp = 3000L
        )
        coEvery { stateDao.getLastState() } returns cached

        repository.loadCachedState()
        testScheduler.advanceUntilIdle()

        val state = repository.state.value
        assertEquals(WearAlarmState.WARNING, state.alarmState)
        assertEquals(25.0, state.distanceMeters, 0.01)
        assertTrue(state.isActive)
    }

    @Test
    fun `should reject negative distance`() = runTest {
        val invalidState = WearMonitorState(distanceMeters = -5.0)

        repository.state.test {
            awaitItem() // initial
            repository.onStateReceived(invalidState)
            expectNoEvents()
        }
    }

    @Test
    fun `should reject negative GPS accuracy`() = runTest {
        val invalidState = WearMonitorState(gpsAccuracyMeters = -1f)

        repository.state.test {
            awaitItem() // initial
            repository.onStateReceived(invalidState)
            expectNoEvents()
        }
    }

    @Test
    fun `should mark data received on connection manager`() = runTest {
        val validState = WearMonitorState(
            isActive = true,
            distanceMeters = 5.0,
            gpsAccuracyMeters = 2f,
            timestamp = 100L
        )

        repository.onStateReceived(validState)

        io.mockk.verify { connectionManager.markDataReceived() }
    }

    @Test
    fun `should delegate connection changes to connection manager`() {
        repository.onConnectionChanged(true)
        io.mockk.verify { connectionManager.setConnected(true) }

        repository.onConnectionChanged(false)
        io.mockk.verify { connectionManager.setConnected(false) }
    }

    @Test
    fun `validate should accept valid state`() {
        val validState = WearMonitorState(
            distanceMeters = 42.0,
            gpsAccuracyMeters = 5f
        )
        assertTrue(repository.validate(validState))
    }

    @Test
    fun `validate should accept zero values`() {
        val zeroState = WearMonitorState(
            distanceMeters = 0.0,
            gpsAccuracyMeters = 0f
        )
        assertTrue(repository.validate(zeroState))
    }

    @Test
    fun `validate should reject negative distance`() {
        val invalidState = WearMonitorState(distanceMeters = -1.0)
        assertFalse(repository.validate(invalidState))
    }

    @Test
    fun `validate should reject negative accuracy`() {
        val invalidState = WearMonitorState(gpsAccuracyMeters = -0.1f)
        assertFalse(repository.validate(invalidState))
    }

    @Test
    fun `screenState should return Connecting when not connected and no history`() {
        every { connectionManager.connected } returns kotlinx.coroutines.flow.MutableStateFlow(false)
        val screenState = repository.screenState()
        assertEquals(WearScreenState.Connecting, screenState)
    }

    @Test
    fun `should insert track point with correct data`() = runTest {
        val newState = WearMonitorState(
            isActive = true,
            alarmState = WearAlarmState.ALARM,
            distanceMeters = 55.5,
            gpsAccuracyMeters = 10f,
            timestamp = 5000L
        )

        repository.onStateReceived(newState)
        testScheduler.advanceUntilIdle()

        coVerify {
            trackPointDao.insert(match<WearTrackPointEntity> {
                it.distanceMeters == 55.5 &&
                    it.alarmState == "ALARM" &&
                    it.timestamp == 5000L
            })
        }
    }
}
