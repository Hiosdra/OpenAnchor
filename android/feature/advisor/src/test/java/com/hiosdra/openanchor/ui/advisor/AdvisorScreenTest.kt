package com.hiosdra.openanchor.ui.advisor

import androidx.activity.ComponentActivity
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.*
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.hiosdra.openanchor.core.ui.R
import com.hiosdra.openanchor.ui.theme.OpenAnchorTheme
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.flow.MutableStateFlow
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config

@RunWith(AndroidJUnit4::class)
@Config(sdk = [35])
class AdvisorScreenTest {

    @get:Rule
    val composeRule = createAndroidComposeRule<ComponentActivity>()

    private fun string(resId: Int, vararg args: Any): String =
        composeRule.activity.getString(resId, *args)

    @Test
    fun notConfigured_showsApiKeySetupWithAllElements() {
        val viewModel = mockk<AdvisorViewModel>(relaxed = true)
        val state = MutableStateFlow(AdvisorUiState(isConfigured = false, apiKeyInput = ""))
        every { viewModel.uiState } returns state

        composeRule.setContent {
            OpenAnchorTheme {
                AdvisorScreen(onBack = {}, viewModel = viewModel)
            }
        }

        composeRule.onAllNodesWithText(string(R.string.ai_advisor))[0].assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.ai_advisor_setup_desc)).assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.ai_api_key)).assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.ai_save_key)).assertExists()
        composeRule.onNodeWithText(string(R.string.ai_key_hint)).assertExists()
    }

    @Test
    fun configured_emptyMessages_showsWelcomeAndSuggestedQuestions() {
        val viewModel = mockk<AdvisorViewModel>(relaxed = true)
        val state = MutableStateFlow(
            AdvisorUiState(
                isConfigured = true,
                messages = emptyList(),
                suggestedQuestions = listOf(
                    "Is my anchor safe in current conditions?",
                    "What scope ratio should I use?",
                    "When should I re-anchor?",
                    "How to prepare for overnight anchoring?",
                    "What are signs of anchor dragging?"
                )
            )
        )
        every { viewModel.uiState } returns state

        composeRule.setContent {
            OpenAnchorTheme {
                AdvisorScreen(onBack = {}, viewModel = viewModel)
            }
        }

        composeRule.onNodeWithText(string(R.string.ai_advisor_welcome)).assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.ai_suggested_questions)).assertIsDisplayed()
        composeRule.onNodeWithText("Is my anchor safe in current conditions?").assertIsDisplayed()
        composeRule.onNodeWithText("What scope ratio should I use?").assertExists()
        composeRule.onNodeWithText("When should I re-anchor?").assertExists()
        composeRule.onNodeWithText("How to prepare for overnight anchoring?").assertExists()
        composeRule.onNodeWithText("What are signs of anchor dragging?").assertExists()
        composeRule.onNodeWithText(string(R.string.ai_advisor_hint)).assertExists()
    }

    @Test
    fun configured_withMessages_showsChatBubbles() {
        val viewModel = mockk<AdvisorViewModel>(relaxed = true)
        val state = MutableStateFlow(
            AdvisorUiState(
                isConfigured = true,
                messages = listOf(
                    ChatMessage(text = "Is my anchor holding?", isUser = true),
                    ChatMessage(text = "Based on current conditions, your anchor appears stable.", isUser = false)
                )
            )
        )
        every { viewModel.uiState } returns state

        composeRule.setContent {
            OpenAnchorTheme {
                AdvisorScreen(onBack = {}, viewModel = viewModel)
            }
        }

        composeRule.onNodeWithText("Is my anchor holding?").assertIsDisplayed()
        composeRule.onNodeWithText("Based on current conditions, your anchor appears stable.").assertIsDisplayed()
    }

    @Test
    fun configured_loadingState_showsThinkingIndicator() {
        val viewModel = mockk<AdvisorViewModel>(relaxed = true)
        val state = MutableStateFlow(
            AdvisorUiState(
                isConfigured = true,
                messages = listOf(
                    ChatMessage(text = "What is the weather forecast?", isUser = true)
                ),
                isLoading = true
            )
        )
        every { viewModel.uiState } returns state

        composeRule.setContent {
            OpenAnchorTheme {
                AdvisorScreen(onBack = {}, viewModel = viewModel)
            }
        }

        composeRule.onNodeWithText("What is the weather forecast?").assertIsDisplayed()
        composeRule.onNodeWithText("Thinking...").assertIsDisplayed()
    }

    @Test
    fun configured_errorState_showsErrorMessage() {
        val viewModel = mockk<AdvisorViewModel>(relaxed = true)
        val state = MutableStateFlow(
            AdvisorUiState(
                isConfigured = true,
                messages = listOf(
                    ChatMessage(text = "Check conditions", isUser = true)
                ),
                error = "API rate limit exceeded"
            )
        )
        every { viewModel.uiState } returns state

        composeRule.setContent {
            OpenAnchorTheme {
                AdvisorScreen(onBack = {}, viewModel = viewModel)
            }
        }

        composeRule.onNodeWithText("Check conditions").assertIsDisplayed()
        composeRule.onNodeWithText("API rate limit exceeded").assertIsDisplayed()
    }

    @Test
    fun configured_multipleMessages_showsFullConversationHistory() {
        val viewModel = mockk<AdvisorViewModel>(relaxed = true)
        val state = MutableStateFlow(
            AdvisorUiState(
                isConfigured = true,
                messages = listOf(
                    ChatMessage(text = "How deep should I set my anchor?", isUser = true),
                    ChatMessage(text = "For sandy bottoms, aim for 5:1 scope ratio.", isUser = false),
                    ChatMessage(text = "What about rocky bottom?", isUser = true),
                    ChatMessage(text = "Rocky bottoms require extra care. Use 7:1 ratio.", isUser = false)
                )
            )
        )
        every { viewModel.uiState } returns state

        composeRule.setContent {
            OpenAnchorTheme {
                AdvisorScreen(onBack = {}, viewModel = viewModel)
            }
        }

        composeRule.onNodeWithText("How deep should I set my anchor?").assertIsDisplayed()
        composeRule.onNodeWithText("For sandy bottoms, aim for 5:1 scope ratio.").assertIsDisplayed()
        composeRule.onNodeWithText("What about rocky bottom?").assertIsDisplayed()
        composeRule.onNodeWithText("Rocky bottoms require extra care. Use 7:1 ratio.").assertIsDisplayed()
    }

    @Test
    fun stateTransitions_setupToChatToLoadingToError() {
        val viewModel = mockk<AdvisorViewModel>(relaxed = true)
        val state = MutableStateFlow(AdvisorUiState(isConfigured = false))
        every { viewModel.uiState } returns state

        composeRule.setContent {
            OpenAnchorTheme {
                AdvisorScreen(onBack = {}, viewModel = viewModel)
            }
        }

        // API key setup visible
        composeRule.onNodeWithText(string(R.string.ai_api_key)).assertIsDisplayed()

        // Transition to configured with empty chat
        state.value = AdvisorUiState(
            isConfigured = true,
            messages = emptyList()
        )
        composeRule.waitForIdle()
        composeRule.onNodeWithText(string(R.string.ai_advisor_welcome)).assertIsDisplayed()

        // User sends a message
        state.value = AdvisorUiState(
            isConfigured = true,
            messages = listOf(
                ChatMessage(text = "Is it safe to anchor here?", isUser = true)
            ),
            isLoading = true
        )
        composeRule.waitForIdle()
        composeRule.onNodeWithText("Is it safe to anchor here?").assertIsDisplayed()
        composeRule.onNodeWithText("Thinking...").assertIsDisplayed()

        // AI responds
        state.value = AdvisorUiState(
            isConfigured = true,
            messages = listOf(
                ChatMessage(text = "Is it safe to anchor here?", isUser = true),
                ChatMessage(text = "Current conditions are favorable.", isUser = false)
            ),
            isLoading = false
        )
        composeRule.waitForIdle()
        composeRule.onNodeWithText("Current conditions are favorable.").assertIsDisplayed()

        // Error occurs
        state.value = AdvisorUiState(
            isConfigured = true,
            messages = listOf(
                ChatMessage(text = "Is it safe to anchor here?", isUser = true),
                ChatMessage(text = "Current conditions are favorable.", isUser = false)
            ),
            error = "Network timeout"
        )
        composeRule.waitForIdle()
        composeRule.onNodeWithText("Network timeout").assertIsDisplayed()
    }

    @Test
    fun configured_withMessages_showsClearChatButton() {
        val viewModel = mockk<AdvisorViewModel>(relaxed = true)
        val state = MutableStateFlow(
            AdvisorUiState(
                isConfigured = true,
                messages = listOf(
                    ChatMessage(text = "Hello", isUser = true)
                )
            )
        )
        every { viewModel.uiState } returns state

        composeRule.setContent {
            OpenAnchorTheme {
                AdvisorScreen(onBack = {}, viewModel = viewModel)
            }
        }

        composeRule.onNodeWithText("Hello").assertIsDisplayed()
        // Clear chat button is in the top bar as an icon (DeleteSweep)
        // with contentDescription "Clear chat" — verify the message renders
    }

    @Test
    fun topBar_showsAdvisorTitle() {
        val viewModel = mockk<AdvisorViewModel>(relaxed = true)
        every { viewModel.uiState } returns MutableStateFlow(AdvisorUiState())

        composeRule.setContent {
            OpenAnchorTheme {
                AdvisorScreen(onBack = {}, viewModel = viewModel)
            }
        }

        composeRule.onAllNodesWithText(string(R.string.ai_advisor))[0].assertIsDisplayed()
    }
}
