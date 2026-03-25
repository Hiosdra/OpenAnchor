package com.hiosdra.openanchor.ui.client

import androidx.arch.core.executor.testing.InstantTaskExecutorRule
import app.cash.turbine.test
import com.hiosdra.openanchor.network.AnchorWebSocketClient
import com.hiosdra.openanchor.network.ClientModeManager
import com.hiosdra.openanchor.service.ServiceBinder
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
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
class ScanQRCodeViewModelTest {

    @get:Rule
    val instantExecutorRule = InstantTaskExecutorRule()

    private lateinit var wsClient: AnchorWebSocketClient
    private lateinit var clientModeManager: ClientModeManager
    private lateinit var serviceBinder: ServiceBinder
    private lateinit var clientStateFlow: MutableStateFlow<AnchorWebSocketClient.ClientState>

    @Before
    fun setup() {
        clientStateFlow = MutableStateFlow(AnchorWebSocketClient.ClientState())
        wsClient = mockk(relaxed = true)
        clientModeManager = mockk(relaxed = true)
        serviceBinder = mockk(relaxed = true)
        every { wsClient.clientState } returns clientStateFlow
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `initial state is scanning`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val viewModel = ScanQRCodeViewModel(wsClient, clientModeManager, serviceBinder)
        advanceUntilIdle()

        viewModel.uiState.test {
            assertEquals(ScanStep.SCANNING, awaitItem().step)
            cancel()
        }
    }

    @Test
    fun `onQRCodeScanned with valid JSON extracts URL`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val viewModel = ScanQRCodeViewModel(wsClient, clientModeManager, serviceBinder)
        advanceUntilIdle()

        viewModel.onQRCodeScanned("""{"wsUrl":"ws://192.168.1.1:8080","ssid":"test","password":"pass","protocol":"openanchor-v2"}""")

        viewModel.uiState.test {
            val state = awaitItem()
            assertEquals(ScanStep.SCANNED, state.step)
            assertEquals("ws://192.168.1.1:8080", state.scannedUrl)
            assertEquals("test", state.serverSsid)
            assertEquals("pass", state.serverPassword)
            cancel()
        }
    }

    @Test
    fun `onQRCodeScanned with no URL sets error`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val viewModel = ScanQRCodeViewModel(wsClient, clientModeManager, serviceBinder)
        advanceUntilIdle()

        viewModel.onQRCodeScanned("""{"ssid":"test"}""")

        viewModel.uiState.test {
            val state = awaitItem()
            assertEquals(ScanStep.ERROR, state.step)
            assertNotNull(state.errorMessage)
            cancel()
        }
    }

    @Test
    fun `onQRCodeScanned with unsupported protocol sets error`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val viewModel = ScanQRCodeViewModel(wsClient, clientModeManager, serviceBinder)
        advanceUntilIdle()

        viewModel.onQRCodeScanned("""{"wsUrl":"ws://test","protocol":"other-protocol"}""")

        viewModel.uiState.test {
            val state = awaitItem()
            assertEquals(ScanStep.ERROR, state.step)
            assertTrue(state.errorMessage!!.contains("Unsupported"))
            cancel()
        }
    }

    @Test
    fun `onQRCodeScanned with plain ws URL`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val viewModel = ScanQRCodeViewModel(wsClient, clientModeManager, serviceBinder)
        advanceUntilIdle()

        viewModel.onQRCodeScanned("ws://192.168.1.1:8080")

        viewModel.uiState.test {
            val state = awaitItem()
            assertEquals(ScanStep.SCANNED, state.step)
            assertEquals("ws://192.168.1.1:8080", state.scannedUrl)
            cancel()
        }
    }

    @Test
    fun `onQRCodeScanned with invalid content sets error`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val viewModel = ScanQRCodeViewModel(wsClient, clientModeManager, serviceBinder)
        advanceUntilIdle()

        viewModel.onQRCodeScanned("invalid content")

        viewModel.uiState.test {
            val state = awaitItem()
            assertEquals(ScanStep.ERROR, state.step)
            cancel()
        }
    }

    @Test
    fun `connectToServer starts client mode`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val viewModel = ScanQRCodeViewModel(wsClient, clientModeManager, serviceBinder)
        advanceUntilIdle()

        viewModel.onQRCodeScanned("ws://192.168.1.1:8080")
        viewModel.connectToServer()

        verify { serviceBinder.startClientMode("ws://192.168.1.1:8080") }
    }

    @Test
    fun `connectToServer with no URL does nothing`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val viewModel = ScanQRCodeViewModel(wsClient, clientModeManager, serviceBinder)
        advanceUntilIdle()

        viewModel.connectToServer()

        verify(exactly = 0) { serviceBinder.startClientMode(any()) }
    }

    @Test
    fun `setManualUrl updates state`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val viewModel = ScanQRCodeViewModel(wsClient, clientModeManager, serviceBinder)
        advanceUntilIdle()

        viewModel.setManualUrl("ws://test")

        viewModel.uiState.test {
            assertEquals("ws://test", awaitItem().manualUrl)
            cancel()
        }
    }

    @Test
    fun `connectManual with blank URL does nothing`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val viewModel = ScanQRCodeViewModel(wsClient, clientModeManager, serviceBinder)
        advanceUntilIdle()

        viewModel.setManualUrl("   ")
        viewModel.connectManual()

        verify(exactly = 0) { serviceBinder.startClientMode(any()) }
    }

    @Test
    fun `connectManual adds ws prefix if missing`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val viewModel = ScanQRCodeViewModel(wsClient, clientModeManager, serviceBinder)
        advanceUntilIdle()

        viewModel.setManualUrl("192.168.1.1:8080")
        viewModel.connectManual()

        verify { serviceBinder.startClientMode("ws://192.168.1.1:8080") }
    }

    @Test
    fun `connectManual keeps existing ws prefix`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val viewModel = ScanQRCodeViewModel(wsClient, clientModeManager, serviceBinder)
        advanceUntilIdle()

        viewModel.setManualUrl("wss://secure.server:8080")
        viewModel.connectManual()

        verify { serviceBinder.startClientMode("wss://secure.server:8080") }
    }

    @Test
    fun `resetToScanning resets state`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val viewModel = ScanQRCodeViewModel(wsClient, clientModeManager, serviceBinder)
        advanceUntilIdle()

        viewModel.onQRCodeScanned("ws://test")
        viewModel.resetToScanning()

        viewModel.uiState.test {
            assertEquals(ScanStep.SCANNING, awaitItem().step)
            cancel()
        }
    }

    @Test
    fun `cancelConnection disconnects and resets`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val viewModel = ScanQRCodeViewModel(wsClient, clientModeManager, serviceBinder)
        advanceUntilIdle()

        viewModel.cancelConnection()

        verify { wsClient.disconnect("USER_CANCEL") }
    }

    @Test
    fun `connection state updates when client connects`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val viewModel = ScanQRCodeViewModel(wsClient, clientModeManager, serviceBinder)
        advanceUntilIdle()

        clientStateFlow.value = AnchorWebSocketClient.ClientState(isConnected = true)
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertEquals(ScanStep.CONNECTED, state.step)
            assertTrue(state.isConnected)
            cancel()
        }
    }

    @Test
    fun `connection state updates with error`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val viewModel = ScanQRCodeViewModel(wsClient, clientModeManager, serviceBinder)
        advanceUntilIdle()

        clientStateFlow.value = AnchorWebSocketClient.ClientState(errorMessage = "Connection refused")
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertEquals(ScanStep.ERROR, state.step)
            assertEquals("Connection refused", state.errorMessage)
            cancel()
        }
    }
}
