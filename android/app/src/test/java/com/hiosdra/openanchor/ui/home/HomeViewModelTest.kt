package com.hiosdra.openanchor.ui.home

import androidx.arch.core.executor.testing.InstantTaskExecutorRule
import app.cash.turbine.test
import com.hiosdra.openanchor.data.repository.AnchorSessionRepository
import com.hiosdra.openanchor.domain.model.AnchorSession
import com.hiosdra.openanchor.domain.model.AnchorZone
import com.hiosdra.openanchor.domain.model.Position
import com.hiosdra.openanchor.network.AnchorWebSocketClient
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.flowOf
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
class HomeViewModelTest {

    @get:Rule
    val instantExecutorRule = InstantTaskExecutorRule()

    private lateinit var repository: AnchorSessionRepository
    private lateinit var wsClient: AnchorWebSocketClient
    private lateinit var clientStateFlow: MutableStateFlow<AnchorWebSocketClient.ClientState>

    @Before
    fun setup() {
        repository = mockk(relaxed = true)
        wsClient = mockk(relaxed = true)
        clientStateFlow = MutableStateFlow(AnchorWebSocketClient.ClientState())
        every { wsClient.clientState } returns clientStateFlow
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `activeSession emits null when no active session`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        every { repository.observeActiveSession() } returns flowOf(null)
        val viewModel = HomeViewModel(repository, wsClient)
        advanceUntilIdle()

        viewModel.activeSession.test {
            assertNull(awaitItem())
            cancel()
        }
    }

    @Test
    fun `activeSession emits session when one exists`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val session = AnchorSession(
            id = 1,
            anchorPosition = Position(54.35, 18.65),
            zone = AnchorZone.Circle(Position(54.35, 18.65), 30.0)
        )
        every { repository.observeActiveSession() } returns flowOf(session)
        val viewModel = HomeViewModel(repository, wsClient)

        viewModel.activeSession.test {
            advanceUntilIdle()
            val result = expectMostRecentItem()
            assertNotNull(result)
            assertEquals(1L, result!!.id)
            cancel()
        }
    }

    @Test
    fun `isClientModeActive is false by default`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        every { repository.observeActiveSession() } returns flowOf(null)
        val viewModel = HomeViewModel(repository, wsClient)

        viewModel.isClientModeActive.test {
            advanceUntilIdle()
            val result = expectMostRecentItem()
            assertFalse(result)
            cancel()
        }
    }

    @Test
    fun `isClientModeActive is true when connected`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        every { repository.observeActiveSession() } returns flowOf(null)
        clientStateFlow.value = AnchorWebSocketClient.ClientState(isConnected = true)
        val viewModel = HomeViewModel(repository, wsClient)

        viewModel.isClientModeActive.test {
            advanceUntilIdle()
            val result = expectMostRecentItem()
            assertTrue(result)
            cancel()
        }
    }

    @Test
    fun `isClientModeActive is true when connecting`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        every { repository.observeActiveSession() } returns flowOf(null)
        clientStateFlow.value = AnchorWebSocketClient.ClientState(isConnecting = true)
        val viewModel = HomeViewModel(repository, wsClient)

        viewModel.isClientModeActive.test {
            advanceUntilIdle()
            val result = expectMostRecentItem()
            assertTrue(result)
            cancel()
        }
    }
}
