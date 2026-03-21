package com.hiosdra.openanchor.ui.logbook

import androidx.arch.core.executor.testing.InstantTaskExecutorRule
import app.cash.turbine.test
import com.hiosdra.openanchor.data.ai.GeminiService
import com.hiosdra.openanchor.data.repository.AnchorSessionRepository
import com.hiosdra.openanchor.data.repository.LogbookRepository
import com.hiosdra.openanchor.domain.model.*
import io.mockk.*
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
class LogbookViewModelTest {

    @get:Rule
    val instantExecutorRule = InstantTaskExecutorRule()

    private lateinit var logbookRepository: LogbookRepository
    private lateinit var sessionRepository: AnchorSessionRepository
    private lateinit var geminiService: GeminiService
    private lateinit var viewModel: LogbookViewModel

    @Before
    fun setup() {
        logbookRepository = mockk(relaxed = true)
        sessionRepository = mockk(relaxed = true)
        geminiService = mockk(relaxed = true)

        coEvery { logbookRepository.observeAllEntries() } returns flowOf(emptyList())
        coEvery { sessionRepository.observeAllSessions() } returns flowOf(emptyList())
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun createViewModel(): LogbookViewModel {
        return LogbookViewModel(logbookRepository, sessionRepository, geminiService)
    }

    @Test
    fun `initial state checks AI configuration`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        every { geminiService.isConfigured } returns true
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.uiState.test {
            assertTrue(awaitItem().isAiConfigured)
            cancel()
        }
    }

    @Test
    fun `initial state shows AI not configured`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        every { geminiService.isConfigured } returns false
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.uiState.test {
            assertFalse(awaitItem().isAiConfigured)
            cancel()
        }
    }

    @Test
    fun `observes logbook entries`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val entries = listOf(
            LogbookEntry(id = 1, sessionId = 1, summary = "Test", logEntry = "Log", safetyNote = "Safe")
        )
        coEvery { logbookRepository.observeAllEntries() } returns flowOf(entries)
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertEquals(1, state.entries.size)
            assertEquals("Test", state.entries[0].summary)
            cancel()
        }
    }

    @Test
    fun `observes completed sessions`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val sessions = listOf(
            createTestSession(id = 1, endTime = 1000L),
            createTestSession(id = 2, endTime = null)
        )
        coEvery { sessionRepository.observeAllSessions() } returns flowOf(sessions)
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertEquals(1, state.sessions.size)
            assertEquals(1L, state.sessions[0].id)
            cancel()
        }
    }

    @Test
    fun `generateEntry when AI not configured sets error`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        every { geminiService.isConfigured } returns false
        viewModel = createViewModel()
        advanceUntilIdle()

        val session = createTestSession()
        viewModel.generateEntry(session)
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertNotNull(state.error)
            assertTrue(state.error!!.contains("not configured"))
            cancel()
        }
    }

    @Test
    fun `generateEntry success creates new entry`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        every { geminiService.isConfigured } returns true
        coEvery { sessionRepository.getTrackPointsOnce(any()) } returns emptyList()
        coEvery { geminiService.generateLogbookSummary(any(), any(), any()) } returns
                Result.success("SUMMARY: Test summary\nLOG: Test log entry\nSAFETY: All safe")
        coEvery { logbookRepository.getEntryForSession(any()) } returns null
        coEvery { logbookRepository.insertEntry(any()) } returns 1L

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.generateEntry(createTestSession())
        advanceUntilIdle()

        coVerify { logbookRepository.insertEntry(any()) }
    }

    @Test
    fun `generateEntry success updates existing entry`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        every { geminiService.isConfigured } returns true
        coEvery { sessionRepository.getTrackPointsOnce(any()) } returns emptyList()
        coEvery { geminiService.generateLogbookSummary(any(), any(), any()) } returns
                Result.success("SUMMARY: Updated\nLOG: Updated log\nSAFETY: Safe")
        val existing = LogbookEntry(id = 5, sessionId = 1, summary = "Old", logEntry = "Old", safetyNote = "Old")
        coEvery { logbookRepository.getEntryForSession(any()) } returns existing

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.generateEntry(createTestSession())
        advanceUntilIdle()

        coVerify { logbookRepository.updateEntry(match { it.id == 5L }) }
    }

    @Test
    fun `generateEntry failure sets error message`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        every { geminiService.isConfigured } returns true
        coEvery { sessionRepository.getTrackPointsOnce(any()) } returns emptyList()
        coEvery { geminiService.generateLogbookSummary(any(), any(), any()) } returns
                Result.failure(Exception("API error"))

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.generateEntry(createTestSession())
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertFalse(state.isGenerating)
            assertNotNull(state.error)
            assertTrue(state.error!!.contains("API error"))
            cancel()
        }
    }

    @Test
    fun `deleteEntry calls repository`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.deleteEntry(42L)
        advanceUntilIdle()

        coVerify { logbookRepository.deleteEntry(42L) }
    }

    @Test
    fun `clearError resets error state`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        every { geminiService.isConfigured } returns false
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.generateEntry(createTestSession())
        viewModel.clearError()

        viewModel.uiState.test {
            assertNull(awaitItem().error)
            cancel()
        }
    }

    private fun createTestSession(
        id: Long = 1L,
        endTime: Long? = 2000L
    ) = AnchorSession(
        id = id,
        anchorPosition = Position(54.35, 18.65),
        zone = AnchorZone.Circle(Position(54.35, 18.65), 30.0),
        startTime = 1000L,
        endTime = endTime
    )
}
