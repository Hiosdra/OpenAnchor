package com.hiosdra.openanchor.ui.advisor

import androidx.arch.core.executor.testing.InstantTaskExecutorRule
import app.cash.turbine.test
import com.hiosdra.openanchor.data.ai.GeminiService
import com.hiosdra.openanchor.data.preferences.PreferencesManager
import com.hiosdra.openanchor.data.preferences.UserPreferences
import com.hiosdra.openanchor.data.repository.AnchorSessionRepository
import com.hiosdra.openanchor.domain.model.Position
import io.mockk.*
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
class AdvisorViewModelTest {

    @get:Rule
    val instantExecutorRule = InstantTaskExecutorRule()

    private lateinit var geminiService: GeminiService
    private lateinit var sessionRepository: AnchorSessionRepository
    private lateinit var preferencesManager: PreferencesManager

    @Before
    fun setup() {
        geminiService = mockk(relaxed = true)
        sessionRepository = mockk(relaxed = true)
        preferencesManager = mockk(relaxed = true)

        every { preferencesManager.preferences } returns flowOf(UserPreferences())
        every { sessionRepository.observeActiveSession() } returns flowOf(null)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `initial state is not configured when no API key`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        every { geminiService.isConfigured } returns false
        val viewModel = AdvisorViewModel(geminiService, sessionRepository, preferencesManager)
        advanceUntilIdle()

        viewModel.uiState.test {
            assertFalse(awaitItem().isConfigured)
            cancel()
        }
    }

    @Test
    fun `configures with saved API key`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        every { preferencesManager.preferences } returns flowOf(UserPreferences(geminiApiKey = "test-key"))
        val viewModel = AdvisorViewModel(geminiService, sessionRepository, preferencesManager)
        advanceUntilIdle()

        verify { geminiService.configure("test-key") }
    }

    @Test
    fun `onApiKeyChange updates state`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val viewModel = AdvisorViewModel(geminiService, sessionRepository, preferencesManager)
        advanceUntilIdle()

        viewModel.onApiKeyChange("my-api-key")

        viewModel.uiState.test {
            assertEquals("my-api-key", awaitItem().apiKeyInput)
            cancel()
        }
    }

    @Test
    fun `saveApiKey with blank key does nothing`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val viewModel = AdvisorViewModel(geminiService, sessionRepository, preferencesManager)
        advanceUntilIdle()

        viewModel.onApiKeyChange("  ")
        viewModel.saveApiKey()
        advanceUntilIdle()

        coVerify(exactly = 0) { preferencesManager.setGeminiApiKey(any()) }
    }

    @Test
    fun `saveApiKey saves and configures`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val viewModel = AdvisorViewModel(geminiService, sessionRepository, preferencesManager)
        advanceUntilIdle()

        viewModel.onApiKeyChange("valid-key")
        viewModel.saveApiKey()
        advanceUntilIdle()

        coVerify { preferencesManager.setGeminiApiKey("valid-key") }
        verify { geminiService.configure("valid-key") }
    }

    @Test
    fun `sendMessage with blank text does nothing`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val viewModel = AdvisorViewModel(geminiService, sessionRepository, preferencesManager)
        advanceUntilIdle()

        viewModel.sendMessage("  ")
        advanceUntilIdle()

        viewModel.uiState.test {
            assertTrue(awaitItem().messages.isEmpty())
            cancel()
        }
    }

    @Test
    fun `sendMessage success adds user and AI messages`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        coEvery { geminiService.askAdvisor(any(), any(), any(), any()) } returns
                Result.success("AI response")
        val viewModel = AdvisorViewModel(geminiService, sessionRepository, preferencesManager)
        advanceUntilIdle()

        viewModel.sendMessage("Is my anchor safe?")
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertEquals(2, state.messages.size)
            assertTrue(state.messages[0].isUser)
            assertEquals("Is my anchor safe?", state.messages[0].text)
            assertFalse(state.messages[1].isUser)
            assertEquals("AI response", state.messages[1].text)
            assertFalse(state.isLoading)
            cancel()
        }
    }

    @Test
    fun `sendMessage failure sets error`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        coEvery { geminiService.askAdvisor(any(), any(), any(), any()) } returns
                Result.failure(Exception("API failed"))
        val viewModel = AdvisorViewModel(geminiService, sessionRepository, preferencesManager)
        advanceUntilIdle()

        viewModel.sendMessage("Test")
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertEquals(1, state.messages.size) // only user message
            assertTrue(state.messages[0].isUser)
            assertNotNull(state.error)
            assertFalse(state.isLoading)
            cancel()
        }
    }

    @Test
    fun `clearChat resets messages and error`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        coEvery { geminiService.askAdvisor(any(), any(), any(), any()) } returns
                Result.success("Response")
        val viewModel = AdvisorViewModel(geminiService, sessionRepository, preferencesManager)
        advanceUntilIdle()

        viewModel.sendMessage("Test")
        advanceUntilIdle()
        viewModel.clearChat()

        viewModel.uiState.test {
            val state = awaitItem()
            assertTrue(state.messages.isEmpty())
            assertNull(state.error)
            cancel()
        }
    }

    @Test
    fun `updatePosition stores position`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val viewModel = AdvisorViewModel(geminiService, sessionRepository, preferencesManager)
        advanceUntilIdle()

        // Just verify it doesn't crash
        viewModel.updatePosition(Position(54.35, 18.65))
    }

    @Test
    fun `suggestedQuestions has default values`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val viewModel = AdvisorViewModel(geminiService, sessionRepository, preferencesManager)
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertTrue(state.suggestedQuestions.isNotEmpty())
            cancel()
        }
    }
}
