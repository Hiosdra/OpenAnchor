package com.hiosdra.openanchor.ui.statistics

import androidx.arch.core.executor.testing.InstantTaskExecutorRule
import app.cash.turbine.test
import com.hiosdra.openanchor.data.repository.AnchorSessionRepository
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
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
class StatisticsViewModelTest {

    @get:Rule
    val instantExecutorRule = InstantTaskExecutorRule()

    private lateinit var repository: AnchorSessionRepository
    private lateinit var viewModel: StatisticsViewModel

    @Before
    fun setup() {
        repository = mockk(relaxed = true)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun createViewModel(): StatisticsViewModel {
        return StatisticsViewModel(repository)
    }

    @Test
    fun `initial state is loading`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        coEvery { repository.getCompletedSessionCount() } returns 0
        coEvery { repository.getTotalAlarmCount() } returns 0
        coEvery { repository.getTotalAnchoredMillis() } returns 0
        coEvery { repository.getLongestSessionMillis() } returns 0
        coEvery { repository.getAverageSessionMillis() } returns 0
        coEvery { repository.getMaxRadiusUsed() } returns 0.0
        coEvery { repository.getAverageRadius() } returns 0.0

        viewModel = createViewModel()

        viewModel.state.test {
            val state = awaitItem()
            assertTrue(state.isLoading)
            cancel()
        }
    }

    @Test
    fun `loadStatistics fetches all repository data`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        coEvery { repository.getCompletedSessionCount() } returns 10
        coEvery { repository.getTotalAlarmCount() } returns 5
        coEvery { repository.getTotalAnchoredMillis() } returns 3_600_000
        coEvery { repository.getLongestSessionMillis() } returns 7_200_000
        coEvery { repository.getAverageSessionMillis() } returns 1_800_000
        coEvery { repository.getMaxRadiusUsed() } returns 100.0
        coEvery { repository.getAverageRadius() } returns 75.0

        viewModel = createViewModel()
        advanceUntilIdle()

        coVerify { repository.getCompletedSessionCount() }
        coVerify { repository.getTotalAlarmCount() }
        coVerify { repository.getTotalAnchoredMillis() }
        coVerify { repository.getLongestSessionMillis() }
        coVerify { repository.getAverageSessionMillis() }
        coVerify { repository.getMaxRadiusUsed() }
        coVerify { repository.getAverageRadius() }
    }

    @Test
    fun `loadStatistics updates state with fetched data`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        coEvery { repository.getCompletedSessionCount() } returns 15
        coEvery { repository.getTotalAlarmCount() } returns 8
        coEvery { repository.getTotalAnchoredMillis() } returns 0
        coEvery { repository.getLongestSessionMillis() } returns 0
        coEvery { repository.getAverageSessionMillis() } returns 0
        coEvery { repository.getMaxRadiusUsed() } returns 0.0
        coEvery { repository.getAverageRadius() } returns 0.0

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.state.test {
            val state = awaitItem()
            assertFalse(state.isLoading)
            assertEquals(15, state.totalSessions)
            assertEquals(8, state.totalAlarms)
            cancel()
        }
    }

    @Test
    fun `loadStatistics converts millis to hours correctly`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        coEvery { repository.getCompletedSessionCount() } returns 0
        coEvery { repository.getTotalAlarmCount() } returns 0
        coEvery { repository.getTotalAnchoredMillis() } returns 7_200_000 // 2 hours
        coEvery { repository.getLongestSessionMillis() } returns 10_800_000 // 3 hours
        coEvery { repository.getAverageSessionMillis() } returns 5_400_000 // 1.5 hours
        coEvery { repository.getMaxRadiusUsed() } returns 0.0
        coEvery { repository.getAverageRadius() } returns 0.0

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.state.test {
            val state = awaitItem()
            assertEquals(2.0, state.totalAnchoredHours, 0.01)
            assertEquals(3.0, state.longestSessionHours, 0.01)
            assertEquals(1.5, state.averageSessionHours, 0.01)
            cancel()
        }
    }

    @Test
    fun `loadStatistics sets radius values correctly`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        coEvery { repository.getCompletedSessionCount() } returns 0
        coEvery { repository.getTotalAlarmCount() } returns 0
        coEvery { repository.getTotalAnchoredMillis() } returns 0
        coEvery { repository.getLongestSessionMillis() } returns 0
        coEvery { repository.getAverageSessionMillis() } returns 0
        coEvery { repository.getMaxRadiusUsed() } returns 150.5
        coEvery { repository.getAverageRadius() } returns 87.25

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.state.test {
            val state = awaitItem()
            assertEquals(150.5, state.maxRadiusMeters, 0.01)
            assertEquals(87.25, state.averageRadiusMeters, 0.01)
            cancel()
        }
    }

    @Test
    fun `loadStatistics handles zero values`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        coEvery { repository.getCompletedSessionCount() } returns 0
        coEvery { repository.getTotalAlarmCount() } returns 0
        coEvery { repository.getTotalAnchoredMillis() } returns 0
        coEvery { repository.getLongestSessionMillis() } returns 0
        coEvery { repository.getAverageSessionMillis() } returns 0
        coEvery { repository.getMaxRadiusUsed() } returns 0.0
        coEvery { repository.getAverageRadius() } returns 0.0

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.state.test {
            val state = awaitItem()
            assertFalse(state.isLoading)
            assertEquals(0, state.totalSessions)
            assertEquals(0, state.totalAlarms)
            assertEquals(0.0, state.totalAnchoredHours, 0.01)
            assertEquals(0.0, state.longestSessionHours, 0.01)
            assertEquals(0.0, state.averageSessionHours, 0.01)
            assertEquals(0.0, state.maxRadiusMeters, 0.01)
            assertEquals(0.0, state.averageRadiusMeters, 0.01)
            cancel()
        }
    }

    @Test
    fun `state emits loading then loaded`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        coEvery { repository.getCompletedSessionCount() } returns 5
        coEvery { repository.getTotalAlarmCount() } returns 2
        coEvery { repository.getTotalAnchoredMillis() } returns 3_600_000
        coEvery { repository.getLongestSessionMillis() } returns 3_600_000
        coEvery { repository.getAverageSessionMillis() } returns 3_600_000
        coEvery { repository.getMaxRadiusUsed() } returns 50.0
        coEvery { repository.getAverageRadius() } returns 40.0

        viewModel = createViewModel()

        viewModel.state.test {
            val loadingState = awaitItem()
            assertTrue(loadingState.isLoading)

            advanceUntilIdle()

            val loadedState = awaitItem()
            assertFalse(loadedState.isLoading)
            assertEquals(5, loadedState.totalSessions)
            assertEquals(2, loadedState.totalAlarms)

            cancel()
        }
    }

    @Test
    fun `realistic statistics scenario`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        coEvery { repository.getCompletedSessionCount() } returns 20
        coEvery { repository.getTotalAlarmCount() } returns 3
        coEvery { repository.getTotalAnchoredMillis() } returns 180_000_000 // 50 hours
        coEvery { repository.getLongestSessionMillis() } returns 28_800_000 // 8 hours
        coEvery { repository.getAverageSessionMillis() } returns 9_000_000 // 2.5 hours
        coEvery { repository.getMaxRadiusUsed() } returns 85.0
        coEvery { repository.getAverageRadius() } returns 55.5

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.state.test {
            val state = awaitItem()
            assertFalse(state.isLoading)
            assertEquals(20, state.totalSessions)
            assertEquals(3, state.totalAlarms)
            assertEquals(50.0, state.totalAnchoredHours, 0.01)
            assertEquals(8.0, state.longestSessionHours, 0.01)
            assertEquals(2.5, state.averageSessionHours, 0.01)
            assertEquals(85.0, state.maxRadiusMeters, 0.01)
            assertEquals(55.5, state.averageRadiusMeters, 0.01)
            cancel()
        }
    }
}
