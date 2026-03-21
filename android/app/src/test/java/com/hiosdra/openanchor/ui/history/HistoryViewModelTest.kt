package com.hiosdra.openanchor.ui.history

import androidx.arch.core.executor.testing.InstantTaskExecutorRule
import app.cash.turbine.test
import com.hiosdra.openanchor.data.repository.AnchorSessionRepository
import com.hiosdra.openanchor.domain.model.AnchorSession
import com.hiosdra.openanchor.domain.model.AnchorZone
import com.hiosdra.openanchor.domain.model.Position
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
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
class HistoryViewModelTest {

    @get:Rule
    val instantExecutorRule = InstantTaskExecutorRule()

    private lateinit var repository: AnchorSessionRepository

    @Before
    fun setup() {
        repository = mockk(relaxed = true)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `sessions filters only completed sessions`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val sessions = listOf(
            createSession(id = 1, endTime = 1000L),
            createSession(id = 2, endTime = null),   // active, should be filtered
            createSession(id = 3, endTime = 3000L)
        )
        coEvery { repository.observeAllSessions() } returns flowOf(sessions)

        val viewModel = HistoryViewModel(repository)
        advanceUntilIdle()

        viewModel.sessions.test {
            val result = awaitItem()
            assertEquals(2, result.size)
            assertTrue(result.all { it.endTime != null })
            cancel()
        }
    }

    @Test
    fun `sessions returns empty when no completed sessions`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val sessions = listOf(createSession(id = 1, endTime = null))
        coEvery { repository.observeAllSessions() } returns flowOf(sessions)

        val viewModel = HistoryViewModel(repository)
        advanceUntilIdle()

        viewModel.sessions.test {
            assertTrue(awaitItem().isEmpty())
            cancel()
        }
    }

    @Test
    fun `deleteSession calls repository`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        coEvery { repository.observeAllSessions() } returns flowOf(emptyList())
        val viewModel = HistoryViewModel(repository)
        advanceUntilIdle()

        viewModel.deleteSession(42L)
        advanceUntilIdle()

        coVerify { repository.deleteSession(42L) }
    }

    private fun createSession(id: Long, endTime: Long?) = AnchorSession(
        id = id,
        anchorPosition = Position(54.35, 18.65),
        zone = AnchorZone.Circle(Position(54.35, 18.65), 30.0),
        startTime = 100L,
        endTime = endTime
    )
}
