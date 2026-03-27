package com.hiosdra.openanchor.ui.client

import androidx.arch.core.executor.testing.InstantTaskExecutorRule
import app.cash.turbine.test
import com.hiosdra.openanchor.network.ClientModeManager
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
class ClientDashboardViewModelTest {

    @get:Rule
    val instantExecutorRule = InstantTaskExecutorRule()

    private lateinit var clientModeManager: ClientModeManager
    private lateinit var serviceBinder: ServiceBinder
    private lateinit var clientModeStateFlow: MutableStateFlow<ClientModeManager.ClientModeState>
    private lateinit var eventsFlow: MutableSharedFlow<ClientModeManager.ClientModeEvent>

    @Before
    fun setup() {
        clientModeStateFlow = MutableStateFlow(ClientModeManager.ClientModeState())
        eventsFlow = MutableSharedFlow()
        clientModeManager = mockk(relaxed = true)
        serviceBinder = mockk(relaxed = true)

        every { clientModeManager.clientModeState } returns clientModeStateFlow
        every { clientModeManager.events } returns eventsFlow
        every { serviceBinder.serviceInstance } returns MutableStateFlow(null)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `initial state is not connected`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val viewModel = ClientDashboardViewModel(clientModeManager, serviceBinder)
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertFalse(state.isConnected)
            assertNull(state.serverUrl)
            cancel()
        }
    }

    @Test
    fun `showDisconnectDialog updates state`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val viewModel = ClientDashboardViewModel(clientModeManager, serviceBinder)
        advanceUntilIdle()

        viewModel.showDisconnectDialog()

        viewModel.uiState.test {
            assertTrue(awaitItem().showDisconnectDialog)
            cancel()
        }
    }

    @Test
    fun `hideDisconnectDialog updates state`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val viewModel = ClientDashboardViewModel(clientModeManager, serviceBinder)
        advanceUntilIdle()

        viewModel.showDisconnectDialog()
        viewModel.hideDisconnectDialog()

        viewModel.uiState.test {
            assertFalse(awaitItem().showDisconnectDialog)
            cancel()
        }
    }

    @Test
    fun `disconnect stops client mode`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val viewModel = ClientDashboardViewModel(clientModeManager, serviceBinder)
        advanceUntilIdle()

        viewModel.disconnect()

        verify { serviceBinder.stopClientMode() }
    }

    @Test
    fun `dismissAlarm delegates to service binder`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val viewModel = ClientDashboardViewModel(clientModeManager, serviceBinder)
        advanceUntilIdle()

        viewModel.dismissAlarm()

        verify { serviceBinder.dismissAlarm() }
    }

    @Test
    fun `muteAlarm delegates to service binder`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val viewModel = ClientDashboardViewModel(clientModeManager, serviceBinder)
        advanceUntilIdle()

        viewModel.muteAlarm()

        verify { serviceBinder.muteAlarm() }
    }
}
