package com.hiosdra.openanchor.ui.crewwatch

import androidx.arch.core.executor.testing.InstantTaskExecutorRule
import app.cash.turbine.test
import com.hiosdra.openanchor.service.CrewWatchManager
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
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
class CrewWatchViewModelTest {

    @get:Rule
    val instantExecutorRule = InstantTaskExecutorRule()

    private lateinit var crewWatchManager: CrewWatchManager
    private lateinit var stateFlow: MutableStateFlow<CrewWatchManager.CrewWatchState>
    private lateinit var eventsFlow: MutableSharedFlow<CrewWatchManager.CrewWatchEvent>

    @Before
    fun setup() {
        stateFlow = MutableStateFlow(CrewWatchManager.CrewWatchState())
        eventsFlow = MutableSharedFlow()
        crewWatchManager = mockk(relaxed = true)
        every { crewWatchManager.state } returns stateFlow
        every { crewWatchManager.events } returns eventsFlow
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `initial state is not running`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val viewModel = CrewWatchViewModel(crewWatchManager)
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertFalse(state.isRunning)
            assertTrue(state.crewMembers.isEmpty())
            assertEquals(4, state.watchDurationHours)
            cancel()
        }
    }

    @Test
    fun `updates reflect crew manager state`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        stateFlow.value = CrewWatchManager.CrewWatchState(
            isRunning = true,
            crewMembers = listOf("Alice", "Bob"),
            currentWatchIndex = 0,
            remainingMs = 3600000,
            totalWatchChanges = 2
        )
        val viewModel = CrewWatchViewModel(crewWatchManager)
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertTrue(state.isRunning)
            assertEquals(listOf("Alice", "Bob"), state.crewMembers)
            assertEquals("Alice", state.currentCrewMember)
            assertEquals("Bob", state.nextCrewMember)
            assertEquals(2, state.totalWatchChanges)
            cancel()
        }
    }

    @Test
    fun `addCrewMember delegates to manager and resets name`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val viewModel = CrewWatchViewModel(crewWatchManager)
        advanceUntilIdle()

        viewModel.updateNewMemberName("Charlie")
        viewModel.addCrewMember()
        advanceUntilIdle()

        verify { crewWatchManager.addCrewMember("Charlie") }

        viewModel.uiState.test {
            assertEquals("", awaitItem().newMemberName)
            cancel()
        }
    }

    @Test
    fun `removeCrewMember delegates to manager`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val viewModel = CrewWatchViewModel(crewWatchManager)
        advanceUntilIdle()

        viewModel.removeCrewMember(1)

        verify { crewWatchManager.removeCrewMember(1) }
    }

    @Test
    fun `setWatchDuration delegates to manager`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val viewModel = CrewWatchViewModel(crewWatchManager)
        advanceUntilIdle()

        viewModel.setWatchDuration(6)

        verify { crewWatchManager.setWatchDuration(6) }
    }

    @Test
    fun `startWatch delegates to manager`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val viewModel = CrewWatchViewModel(crewWatchManager)
        advanceUntilIdle()

        viewModel.startWatch()

        verify { crewWatchManager.startWatch() }
    }

    @Test
    fun `stopWatch delegates to manager`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val viewModel = CrewWatchViewModel(crewWatchManager)
        advanceUntilIdle()

        viewModel.stopWatch()

        verify { crewWatchManager.stopWatch() }
    }

    @Test
    fun `dismissWarning resets warning state`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val viewModel = CrewWatchViewModel(crewWatchManager)
        advanceUntilIdle()

        eventsFlow.emit(CrewWatchManager.CrewWatchEvent.WatchWarning)
        advanceUntilIdle()

        viewModel.dismissWarning()
        advanceUntilIdle()

        viewModel.uiState.test {
            assertFalse(awaitItem().showWarningEvent)
            cancel()
        }
    }

    @Test
    fun `dismissWatchChange resets watch change state`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val viewModel = CrewWatchViewModel(crewWatchManager)
        advanceUntilIdle()

        eventsFlow.emit(CrewWatchManager.CrewWatchEvent.WatchChange("Bob"))
        advanceUntilIdle()

        viewModel.dismissWatchChange()
        advanceUntilIdle()

        viewModel.uiState.test {
            assertNull(awaitItem().showWatchChangeEvent)
            cancel()
        }
    }

    @Test
    fun `updateNewMemberName updates state`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val viewModel = CrewWatchViewModel(crewWatchManager)
        advanceUntilIdle()

        viewModel.updateNewMemberName("Dave")
        advanceUntilIdle()

        viewModel.uiState.test {
            assertEquals("Dave", awaitItem().newMemberName)
            cancel()
        }
    }
}
