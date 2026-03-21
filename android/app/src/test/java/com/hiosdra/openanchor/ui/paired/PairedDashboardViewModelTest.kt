package com.hiosdra.openanchor.ui.paired

import androidx.arch.core.executor.testing.InstantTaskExecutorRule
import app.cash.turbine.test
import com.hiosdra.openanchor.network.AnchorWebSocketServer
import com.hiosdra.openanchor.network.PairedModeManager
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
class PairedDashboardViewModelTest {

    @get:Rule
    val instantExecutorRule = InstantTaskExecutorRule()

    private lateinit var pairedModeManager: PairedModeManager
    private lateinit var wsServer: AnchorWebSocketServer
    private lateinit var serviceBinder: ServiceBinder
    private lateinit var pairedStateFlow: MutableStateFlow<PairedModeManager.PairedState>
    private lateinit var serverStateFlow: MutableStateFlow<AnchorWebSocketServer.ServerState>
    private lateinit var eventsFlow: MutableSharedFlow<PairedModeManager.PairedEvent>

    @Before
    fun setup() {
        pairedStateFlow = MutableStateFlow(PairedModeManager.PairedState())
        serverStateFlow = MutableStateFlow(AnchorWebSocketServer.ServerState())
        eventsFlow = MutableSharedFlow()

        pairedModeManager = mockk(relaxed = true)
        wsServer = mockk(relaxed = true)
        serviceBinder = mockk(relaxed = true)

        every { pairedModeManager.pairedState } returns pairedStateFlow
        every { pairedModeManager.events } returns eventsFlow
        every { wsServer.serverState } returns serverStateFlow
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `initial state is not paired`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val viewModel = PairedDashboardViewModel(pairedModeManager, wsServer, serviceBinder)
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertFalse(state.isPaired)
            assertFalse(state.peerConnected)
            assertFalse(state.serverRunning)
            cancel()
        }
    }

    @Test
    fun `showDisconnectDialog updates state`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val viewModel = PairedDashboardViewModel(pairedModeManager, wsServer, serviceBinder)
        advanceUntilIdle()

        viewModel.showDisconnectDialog()
        advanceUntilIdle()

        viewModel.uiState.test {
            advanceUntilIdle()
            assertTrue(expectMostRecentItem().showDisconnectDialog)
            cancel()
        }
    }

    @Test
    fun `dismissDisconnectDialog updates state`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val viewModel = PairedDashboardViewModel(pairedModeManager, wsServer, serviceBinder)
        advanceUntilIdle()

        viewModel.showDisconnectDialog()
        viewModel.dismissDisconnectDialog()
        advanceUntilIdle()

        viewModel.uiState.test {
            advanceUntilIdle()
            assertFalse(expectMostRecentItem().showDisconnectDialog)
            cancel()
        }
    }

    @Test
    fun `disconnect stops WebSocket server`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val viewModel = PairedDashboardViewModel(pairedModeManager, wsServer, serviceBinder)
        advanceUntilIdle()

        viewModel.disconnect()
        advanceUntilIdle()

        verify { serviceBinder.stopWebSocketServer() }
    }

    @Test
    fun `dismissAlarm calls both paired manager and service binder`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val viewModel = PairedDashboardViewModel(pairedModeManager, wsServer, serviceBinder)
        advanceUntilIdle()

        viewModel.dismissAlarm()
        advanceUntilIdle()

        coVerify { pairedModeManager.sendDismissAlarm() }
        verify { serviceBinder.dismissAlarm() }
    }

    @Test
    fun `muteAlarm calls both paired manager and service binder`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val viewModel = PairedDashboardViewModel(pairedModeManager, wsServer, serviceBinder)
        advanceUntilIdle()

        viewModel.muteAlarm()
        advanceUntilIdle()

        coVerify { pairedModeManager.sendMuteAlarm() }
        verify { serviceBinder.muteAlarm() }
    }

    @Test
    fun `dismissConnectionWarning resets state`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val viewModel = PairedDashboardViewModel(pairedModeManager, wsServer, serviceBinder)
        advanceUntilIdle()

        viewModel.dismissConnectionWarning()
        advanceUntilIdle()

        viewModel.uiState.test {
            assertFalse(awaitItem().connectionLostWarning)
            cancel()
        }
    }
}
