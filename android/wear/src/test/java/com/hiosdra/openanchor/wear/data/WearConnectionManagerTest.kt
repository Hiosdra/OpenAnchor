package com.hiosdra.openanchor.wear.data

import android.util.Log
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.datastore.preferences.core.Preferences
import app.cash.turbine.test
import com.hiosdra.openanchor.wear.data.db.WearConnectionHistoryDao
import com.hiosdra.openanchor.wear.data.db.WearConnectionHistoryEntity
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
import kotlinx.coroutines.Job
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder

@OptIn(ExperimentalCoroutinesApi::class)
class WearConnectionManagerTest {

    @get:Rule
    val tmpFolder = TemporaryFolder()

    private val testDispatcher = UnconfinedTestDispatcher()
    private val testScope = TestScope(testDispatcher + Job())

    private lateinit var dataStore: DataStore<Preferences>
    private lateinit var connectionHistoryDao: WearConnectionHistoryDao
    private lateinit var connectionManager: WearConnectionManager

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        mockkStatic(Log::class)
        every { Log.d(any(), any()) } returns 0
        every { Log.w(any<String>(), any<String>()) } returns 0

        connectionHistoryDao = mockk(relaxed = true)

        dataStore = PreferenceDataStoreFactory.create(
            scope = testScope,
            produceFile = { tmpFolder.newFile("test_prefs.preferences_pb") }
        )

        connectionManager = WearConnectionManager(
            connectionHistoryDao = connectionHistoryDao,
            dataStore = dataStore
        )
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
        unmockkAll()
    }

    @Test
    fun `should start disconnected`() = runTest {
        connectionManager.connected.test {
            assertFalse(awaitItem())
        }
    }

    @Test
    fun `should mark connected when data received`() = runTest {
        connectionManager.connected.test {
            assertFalse(awaitItem()) // initial

            connectionManager.markDataReceived()
            assertTrue(awaitItem())
        }
    }

    @Test
    fun `should set connected state`() = runTest {
        connectionManager.connected.test {
            assertFalse(awaitItem()) // initial

            connectionManager.setConnected(true)
            assertTrue(awaitItem())

            connectionManager.setConnected(false)
            assertFalse(awaitItem())
        }
    }

    @Test
    fun `should authorize first node`() = runTest {
        assertTrue(connectionManager.isNodeAuthorized("node-1"))

        connectionManager.authorizeNode("node-1", "Phone 1")
        testScheduler.advanceUntilIdle()

        assertTrue(connectionManager.isNodeAuthorized("node-1"))
        assertFalse(connectionManager.isNodeAuthorized("node-2"))
    }

    @Test
    fun `should record connection history on authorize`() = runTest {
        connectionManager.authorizeNode("node-1", "Phone 1")
        testScheduler.advanceUntilIdle()

        coVerify {
            connectionHistoryDao.insert(match<WearConnectionHistoryEntity> {
                it.phoneNodeId == "node-1" && it.phoneDisplayName == "Phone 1"
            })
        }
    }

    @Test
    fun `should clear authorization`() = runTest {
        connectionManager.authorizeNode("node-1", "Phone 1")
        testScheduler.advanceUntilIdle()

        assertFalse(connectionManager.isNodeAuthorized("node-2"))

        connectionManager.clearAuthorization()
        testScheduler.advanceUntilIdle()

        assertTrue(connectionManager.isNodeAuthorized("node-2"))
    }

    @Test
    fun `should allow any node when no authorization set`() {
        assertTrue(connectionManager.isNodeAuthorized("any-node"))
        assertTrue(connectionManager.isNodeAuthorized("another-node"))
    }

    @Test
    fun `should reject unauthorized nodes`() = runTest {
        connectionManager.authorizeNode("authorized-node", "My Phone")
        testScheduler.advanceUntilIdle()

        assertTrue(connectionManager.isNodeAuthorized("authorized-node"))
        assertFalse(connectionManager.isNodeAuthorized("rogue-node"))
    }

    @Test
    fun `should update disconnect time on clear authorization`() = runTest {
        val activeConnection = WearConnectionHistoryEntity(
            id = 1,
            phoneNodeId = "node-1",
            phoneDisplayName = "Phone",
            connectedAt = 1000L
        )
        coEvery { connectionHistoryDao.getActiveConnection() } returns activeConnection

        connectionManager.authorizeNode("node-1", "Phone")
        testScheduler.advanceUntilIdle()

        connectionManager.clearAuthorization()
        testScheduler.advanceUntilIdle()

        coVerify { connectionHistoryDao.updateDisconnectTime(1, any()) }
    }
}
