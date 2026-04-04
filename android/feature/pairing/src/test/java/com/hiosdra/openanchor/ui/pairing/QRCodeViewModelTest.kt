package com.hiosdra.openanchor.ui.pairing

import androidx.arch.core.executor.testing.InstantTaskExecutorRule
import app.cash.turbine.test
import com.hiosdra.openanchor.network.AnchorWebSocketServer
import com.hiosdra.openanchor.network.HotspotManager
import com.hiosdra.openanchor.service.ServiceBinderApi
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
    private lateinit var serviceBinder: ServiceBinderApi

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

    // --- stopPairing with hotspot mode ---

    @Test
    fun `stopPairing with hotspot mode stops hotspot`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = QRCodeViewModel(hotspotManager, wsServer, serviceBinder)
        advanceUntilIdle()

        vm.startPairingWithHotspot()
        advanceUntilIdle()

        vm.stopPairing()
        advanceUntilIdle()

        verify { hotspotManager.stopHotspot() }
        verify { serviceBinder.stopWebSocketServer() }
    }

    // --- startServer with null wsUrl ---

    @Test
    fun `startServer shows error when wsUrl is null`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        every { hotspotManager.getWebSocketUrl(any()) } returns null

        val vm = QRCodeViewModel(hotspotManager, wsServer, serviceBinder)
        advanceUntilIdle()

        vm.startPairingOnExistingNetwork()
        advanceUntilIdle()

        // Trigger server started
        serverStateFlow.value = AnchorWebSocketServer.ServerState(isRunning = true)
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertEquals(PairingStep.ERROR, state.step)
            assertEquals("Could not determine device IP address", state.errorMessage)
            cancel()
        }
    }

    // --- startServer with valid wsUrl ---

    @Test
    fun `startServer generates QR and sets wsUrl when available`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        every { hotspotManager.getWebSocketUrl(any()) } returns "ws://192.168.43.1:8080"

        val vm = QRCodeViewModel(hotspotManager, wsServer, serviceBinder)
        advanceUntilIdle()

        vm.startPairingOnExistingNetwork()
        advanceUntilIdle()

        // Trigger server started
        serverStateFlow.value = AnchorWebSocketServer.ServerState(isRunning = true)
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertEquals(PairingStep.WAITING_FOR_CLIENT, state.step)
            assertEquals("ws://192.168.43.1:8080", state.wsUrl)
            cancel()
        }
    }

    // --- hotspot active without server running ---

    @Test
    fun `hotspot active without server shows HOTSPOT_READY`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = QRCodeViewModel(hotspotManager, wsServer, serviceBinder)
        advanceUntilIdle()

        hotspotStateFlow.value = HotspotManager.HotspotState(
            isActive = true,
            ssid = "OpenAnchor-5678",
            password = "pass456"
        )
        // server is NOT running
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertEquals(PairingStep.HOTSPOT_READY, state.step)
            assertEquals("OpenAnchor-5678", state.hotspotSsid)
            cancel()
        }
    }

    // --- hotspot active WITH server shows WAITING_FOR_CLIENT ---

    @Test
    fun `hotspot active with server running shows WAITING_FOR_CLIENT`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = QRCodeViewModel(hotspotManager, wsServer, serviceBinder)
        advanceUntilIdle()

        // Set server running first
        serverStateFlow.value = AnchorWebSocketServer.ServerState(isRunning = true)
        advanceUntilIdle()

        // Then hotspot active
        hotspotStateFlow.value = HotspotManager.HotspotState(
            isActive = true,
            ssid = "OpenAnchor-ABCD",
            password = "pass789"
        )
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertEquals(PairingStep.WAITING_FOR_CLIENT, state.step)
            cancel()
        }
    }

    // --- startPairingWithHotspot triggers server start after hotspot ---

    @Test
    fun `startPairingWithHotspot starts server after hotspot becomes active`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = QRCodeViewModel(hotspotManager, wsServer, serviceBinder)
        advanceUntilIdle()

        vm.startPairingWithHotspot()
        advanceUntilIdle()

        // Simulate hotspot becoming active
        hotspotStateFlow.value = HotspotManager.HotspotState(isActive = true, ssid = "OA", password = "pw")
        advanceUntilIdle()

        verify { serviceBinder.startWebSocketServer() }
    }

    // --- QRCodeUiState defaults ---

    @Test
    fun `QRCodeUiState defaults are correct`() {
        val state = QRCodeUiState()
        assertEquals(PairingStep.IDLE, state.step)
        assertNull(state.hotspotSsid)
        assertNull(state.hotspotPassword)
        assertNull(state.wsUrl)
        assertNull(state.qrBitmap)
        assertFalse(state.serverRunning)
        assertFalse(state.clientConnected)
        assertNull(state.errorMessage)
        assertFalse(state.useExistingNetwork)
    }

    // --- PairingStep enum ---

    @Test
    fun `PairingStep has all expected values`() {
        val values = PairingStep.values()
        assertEquals(7, values.size)
        assertNotNull(PairingStep.IDLE)
        assertNotNull(PairingStep.STARTING_HOTSPOT)
        assertNotNull(PairingStep.HOTSPOT_READY)
        assertNotNull(PairingStep.STARTING_SERVER)
        assertNotNull(PairingStep.WAITING_FOR_CLIENT)
        assertNotNull(PairingStep.PAIRED)
        assertNotNull(PairingStep.ERROR)
    }
}
