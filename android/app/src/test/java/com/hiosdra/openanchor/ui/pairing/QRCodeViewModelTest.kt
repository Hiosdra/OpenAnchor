package com.hiosdra.openanchor.ui.pairing

import androidx.arch.core.executor.testing.InstantTaskExecutorRule
import app.cash.turbine.test
import com.hiosdra.openanchor.network.AnchorWebSocketServer
import com.hiosdra.openanchor.network.HotspotManager
import com.hiosdra.openanchor.service.ServiceBinder
import io.mockk.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class QRCodeViewModelTest {

    @get:Rule
    val instantExecutorRule = InstantTaskExecutorRule()

    private lateinit var hotspotManager: HotspotManager
    private lateinit var wsServer: AnchorWebSocketServer
    private lateinit var serviceBinder: ServiceBinder

    private lateinit var hotspotStateFlow: MutableStateFlow<HotspotManager.HotspotState>
    private lateinit var serverStateFlow: MutableStateFlow<AnchorWebSocketServer.ServerState>
    private lateinit var connectionEventsFlow: MutableSharedFlow<AnchorWebSocketServer.ConnectionEvent>

    @Before
    fun setup() {
        hotspotStateFlow = MutableStateFlow(HotspotManager.HotspotState())
        serverStateFlow = MutableStateFlow(AnchorWebSocketServer.ServerState())
        connectionEventsFlow = MutableSharedFlow()

        hotspotManager = mockk(relaxed = true) {
            every { hotspotState } returns hotspotStateFlow
        }
        wsServer = mockk(relaxed = true) {
            every { serverState } returns serverStateFlow
            every { connectionEvents } returns connectionEventsFlow
        }
        serviceBinder = mockk(relaxed = true)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `initial state is IDLE`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = QRCodeViewModel(hotspotManager, wsServer, serviceBinder)
        advanceUntilIdle()

        vm.uiState.test {
            val state = awaitItem()
            assertEquals(PairingStep.IDLE, state.step)
            assertFalse(state.serverRunning)
            assertFalse(state.clientConnected)
            assertNull(state.errorMessage)
            cancel()
        }
    }

    @Test
    fun `stopPairing resets state to default`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = QRCodeViewModel(hotspotManager, wsServer, serviceBinder)
        advanceUntilIdle()

        vm.stopPairing()
        advanceUntilIdle()

        verify { serviceBinder.stopWebSocketServer() }

        vm.uiState.test {
            val state = awaitItem()
            assertEquals(PairingStep.IDLE, state.step)
            cancel()
        }
    }

    @Test
    fun `stopPairing on existing network does not stop hotspot`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = QRCodeViewModel(hotspotManager, wsServer, serviceBinder)
        advanceUntilIdle()

        vm.startPairingOnExistingNetwork()
        advanceUntilIdle()

        vm.stopPairing()
        advanceUntilIdle()

        verify(exactly = 0) { hotspotManager.stopHotspot() }
    }

    @Test
    fun `hotspot error updates state to ERROR`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = QRCodeViewModel(hotspotManager, wsServer, serviceBinder)
        advanceUntilIdle()

        hotspotStateFlow.value = HotspotManager.HotspotState(
            errorMessage = "Permission denied"
        )
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertEquals(PairingStep.ERROR, state.step)
            assertEquals("Permission denied", state.errorMessage)
            cancel()
        }
    }

    @Test
    fun `hotspot active updates ssid and password`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = QRCodeViewModel(hotspotManager, wsServer, serviceBinder)
        advanceUntilIdle()

        hotspotStateFlow.value = HotspotManager.HotspotState(
            isActive = true,
            ssid = "OpenAnchor-1234",
            password = "secret123"
        )
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertEquals("OpenAnchor-1234", state.hotspotSsid)
            assertEquals("secret123", state.hotspotPassword)
            cancel()
        }
    }

    @Test
    fun `server running updates state`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = QRCodeViewModel(hotspotManager, wsServer, serviceBinder)
        advanceUntilIdle()

        serverStateFlow.value = AnchorWebSocketServer.ServerState(isRunning = true)
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertTrue(state.serverRunning)
            assertEquals(PairingStep.WAITING_FOR_CLIENT, state.step)
            cancel()
        }
    }

    @Test
    fun `client connected via server state updates to PAIRED`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = QRCodeViewModel(hotspotManager, wsServer, serviceBinder)
        advanceUntilIdle()

        serverStateFlow.value = AnchorWebSocketServer.ServerState(
            isRunning = true,
            clientConnected = true
        )
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertEquals(PairingStep.PAIRED, state.step)
            assertTrue(state.clientConnected)
            cancel()
        }
    }

    @Test
    fun `connection event CLIENT_CONNECTED updates state`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = QRCodeViewModel(hotspotManager, wsServer, serviceBinder)
        advanceUntilIdle()

        connectionEventsFlow.emit(AnchorWebSocketServer.ConnectionEvent.CLIENT_CONNECTED)
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertEquals(PairingStep.PAIRED, state.step)
            assertTrue(state.clientConnected)
            cancel()
        }
    }

    @Test
    fun `connection event CLIENT_DISCONNECTED updates state`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = QRCodeViewModel(hotspotManager, wsServer, serviceBinder)
        advanceUntilIdle()

        connectionEventsFlow.emit(AnchorWebSocketServer.ConnectionEvent.CLIENT_CONNECTED)
        advanceUntilIdle()
        connectionEventsFlow.emit(AnchorWebSocketServer.ConnectionEvent.CLIENT_DISCONNECTED)
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertEquals(PairingStep.WAITING_FOR_CLIENT, state.step)
            assertFalse(state.clientConnected)
            cancel()
        }
    }

    @Test
    fun `connection event HEARTBEAT_TIMEOUT updates state`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = QRCodeViewModel(hotspotManager, wsServer, serviceBinder)
        advanceUntilIdle()

        connectionEventsFlow.emit(AnchorWebSocketServer.ConnectionEvent.CLIENT_CONNECTED)
        advanceUntilIdle()
        connectionEventsFlow.emit(AnchorWebSocketServer.ConnectionEvent.HEARTBEAT_TIMEOUT)
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertEquals(PairingStep.WAITING_FOR_CLIENT, state.step)
            assertFalse(state.clientConnected)
            cancel()
        }
    }

    @Test
    fun `startPairingOnExistingNetwork sets state correctly`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = QRCodeViewModel(hotspotManager, wsServer, serviceBinder)
        advanceUntilIdle()

        vm.startPairingOnExistingNetwork()
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertTrue(state.useExistingNetwork)
            assertNull(state.errorMessage)
            cancel()
        }

        verify { serviceBinder.startWebSocketServer() }
    }

    @Test
    fun `startPairingWithHotspot starts hotspot`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = QRCodeViewModel(hotspotManager, wsServer, serviceBinder)
        advanceUntilIdle()

        vm.startPairingWithHotspot()
        advanceUntilIdle()

        verify { hotspotManager.startHotspot() }

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertFalse(state.useExistingNetwork)
            cancel()
        }
    }
}
