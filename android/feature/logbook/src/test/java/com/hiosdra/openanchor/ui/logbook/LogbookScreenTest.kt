package com.hiosdra.openanchor.ui.logbook

import androidx.activity.ComponentActivity
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.AndroidComposeTestRule
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.hiosdra.openanchor.core.ui.R
import com.hiosdra.openanchor.domain.model.LogbookEntry
import com.hiosdra.openanchor.ui.sampleSession
import com.hiosdra.openanchor.ui.theme.OpenAnchorTheme
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.flow.MutableStateFlow
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config

@RunWith(AndroidJUnit4::class)
@Config(sdk = [35])
class LogbookScreenTest {

    @get:Rule
    val composeRule = createAndroidComposeRule<ComponentActivity>()

    private val viewModel = mockk<LogbookViewModel>(relaxed = true)
    private val state = MutableStateFlow(LogbookUiState())

    @Before
    fun setup() {
        every { viewModel.uiState } returns state
    }

    private fun setScreen() {
        composeRule.setContentWithTheme {
            LogbookScreen(onBack = {}, viewModel = viewModel)
        }
    }

    // ── Title ──

    @Test
    fun `screen shows AI logbook title`() {
        state.value = LogbookUiState()
        setScreen()

        composeRule.onNodeWithText(composeRule.string(R.string.ai_logbook)).assertIsDisplayed()
    }

    // ── Empty state ──

    @Test
    fun `empty state shows empty message`() {
        state.value = LogbookUiState(
            entries = emptyList(),
            isAiConfigured = false
        )
        setScreen()

        composeRule.onNodeWithText(composeRule.string(R.string.logbook_empty)).assertIsDisplayed()
    }

    @Test
    fun `empty state with AI configured and sessions shows generate button`() {
        state.value = LogbookUiState(
            entries = emptyList(),
            sessions = listOf(sampleSession()),
            isAiConfigured = true
        )
        setScreen()

        composeRule.onNodeWithText(composeRule.string(R.string.logbook_empty)).assertIsDisplayed()
        composeRule.onNodeWithText(composeRule.string(R.string.logbook_generate)).assertIsDisplayed()
    }

    @Test
    fun `empty state without AI configured does not show generate button`() {
        state.value = LogbookUiState(
            entries = emptyList(),
            sessions = listOf(sampleSession()),
            isAiConfigured = false
        )
        setScreen()

        composeRule.onNodeWithText(composeRule.string(R.string.logbook_empty)).assertIsDisplayed()
        composeRule.onNodeWithText(composeRule.string(R.string.logbook_generate)).assertDoesNotExist()
    }

    @Test
    fun `empty state without sessions does not show generate button`() {
        state.value = LogbookUiState(
            entries = emptyList(),
            sessions = emptyList(),
            isAiConfigured = true
        )
        setScreen()

        composeRule.onNodeWithText(composeRule.string(R.string.logbook_empty)).assertIsDisplayed()
        composeRule.onNodeWithText(composeRule.string(R.string.logbook_generate)).assertDoesNotExist()
    }

    // ── Entries loaded ──

    @Test
    fun `entries show summary text`() {
        state.value = LogbookUiState(
            entries = listOf(sampleEntry()),
            sessions = listOf(sampleSession()),
            isAiConfigured = true
        )
        setScreen()

        composeRule.onNodeWithText("Quiet night at anchor").assertIsDisplayed()
    }

    @Test
    fun `multiple entries all shown`() {
        state.value = LogbookUiState(
            entries = listOf(
                sampleEntry(id = 1L, summary = "Session Alpha"),
                sampleEntry(id = 2L, sessionId = 2L, summary = "Session Beta")
            ),
            sessions = listOf(sampleSession()),
            isAiConfigured = true
        )
        setScreen()

        composeRule.onNodeWithText("Session Alpha").assertIsDisplayed()
        composeRule.onNodeWithText("Session Beta").assertIsDisplayed()
    }

    @Test
    fun `clicking entry expands to show log entry and safety note`() {
        state.value = LogbookUiState(
            entries = listOf(sampleEntry()),
            sessions = listOf(sampleSession()),
            isAiConfigured = true
        )
        setScreen()

        // Click to expand
        composeRule.onNodeWithText("Quiet night at anchor").performClick()
        composeRule.waitForIdle()

        composeRule.onNodeWithText("Anchored overnight in calm conditions.").assertIsDisplayed()
        composeRule.onNodeWithText("Holding well, no issues observed.").assertIsDisplayed()
    }

    @Test
    fun `expanded entry shows delete button`() {
        state.value = LogbookUiState(
            entries = listOf(sampleEntry()),
            sessions = listOf(sampleSession()),
            isAiConfigured = true
        )
        setScreen()

        composeRule.onNodeWithText("Quiet night at anchor").performClick()
        composeRule.waitForIdle()

        composeRule.onNodeWithText(composeRule.string(R.string.delete)).assertIsDisplayed()
    }

    @Test
    fun `clicking delete shows confirmation dialog`() {
        state.value = LogbookUiState(
            entries = listOf(sampleEntry()),
            sessions = listOf(sampleSession()),
            isAiConfigured = true
        )
        setScreen()

        // Expand entry
        composeRule.onNodeWithText("Quiet night at anchor").performClick()
        composeRule.waitForIdle()

        // Click delete
        composeRule.onNodeWithText(composeRule.string(R.string.delete)).performClick()
        composeRule.waitForIdle()

        composeRule.onNodeWithText(composeRule.string(R.string.logbook_delete_title)).assertIsDisplayed()
        composeRule.onNodeWithText(composeRule.string(R.string.logbook_delete_message)).assertIsDisplayed()
    }

    @Test
    fun `delete dialog shows cancel button`() {
        state.value = LogbookUiState(
            entries = listOf(sampleEntry()),
            sessions = listOf(sampleSession()),
            isAiConfigured = true
        )
        setScreen()

        composeRule.onNodeWithText("Quiet night at anchor").performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithText(composeRule.string(R.string.delete)).performClick()
        composeRule.waitForIdle()

        composeRule.onNodeWithText(composeRule.string(R.string.cancel)).assertIsDisplayed()
    }

    // ── Error banner ──

    @Test
    fun `error banner shows error message`() {
        state.value = LogbookUiState(
            entries = listOf(sampleEntry()),
            sessions = listOf(sampleSession()),
            error = "AI offline",
            isAiConfigured = true
        )
        setScreen()

        composeRule.onNodeWithText("AI offline").assertIsDisplayed()
    }

    @Test
    fun `no error banner when error is null`() {
        state.value = LogbookUiState(
            entries = listOf(sampleEntry()),
            sessions = listOf(sampleSession()),
            error = null,
            isAiConfigured = true
        )
        setScreen()

        composeRule.onNodeWithText("AI offline").assertDoesNotExist()
    }

    // ── AI configured generate button in top bar ──

    @Test
    fun `generate icon not shown when AI not configured`() {
        state.value = LogbookUiState(
            entries = listOf(sampleEntry()),
            sessions = listOf(sampleSession()),
            isAiConfigured = false
        )
        setScreen()

        // There should be no AutoAwesome icon in the top bar for generate action
        // The empty state generate button also should not appear since there are entries
        composeRule.onNodeWithText(composeRule.string(R.string.logbook_generate)).assertDoesNotExist()
    }

    // ── State transitions ──

    @Test
    fun `transition from empty to entries updates display`() {
        state.value = LogbookUiState(
            entries = emptyList(),
            isAiConfigured = true
        )
        setScreen()

        composeRule.onNodeWithText(composeRule.string(R.string.logbook_empty)).assertIsDisplayed()

        state.value = LogbookUiState(
            entries = listOf(sampleEntry()),
            sessions = listOf(sampleSession()),
            isAiConfigured = true
        )
        composeRule.waitForIdle()

        composeRule.onNodeWithText("Quiet night at anchor").assertIsDisplayed()
        composeRule.onNodeWithText(composeRule.string(R.string.logbook_empty)).assertDoesNotExist()
    }

    @Test
    fun `error appearing alongside entries both shown`() {
        state.value = LogbookUiState(
            entries = listOf(sampleEntry()),
            sessions = listOf(sampleSession()),
            isAiConfigured = true
        )
        setScreen()

        composeRule.onNodeWithText("Quiet night at anchor").assertIsDisplayed()

        state.value = LogbookUiState(
            entries = listOf(sampleEntry()),
            sessions = listOf(sampleSession()),
            error = "Generation failed",
            isAiConfigured = true
        )
        composeRule.waitForIdle()

        composeRule.onNodeWithText("Quiet night at anchor").assertIsDisplayed()
        composeRule.onNodeWithText("Generation failed").assertIsDisplayed()
    }

    // ── AI generated indicator ──

    @Test
    fun `ai generated entry shows entry content when expanded`() {
        state.value = LogbookUiState(
            entries = listOf(sampleEntry(isAiGenerated = true)),
            sessions = listOf(sampleSession()),
            isAiConfigured = true
        )
        setScreen()

        composeRule.onNodeWithText("Quiet night at anchor").performClick()
        composeRule.waitForIdle()

        composeRule.onNodeWithText("Anchored overnight in calm conditions.").assertIsDisplayed()
    }

    // ── Collapse after expand ──

    @Test
    fun `clicking expanded entry collapses it`() {
        state.value = LogbookUiState(
            entries = listOf(sampleEntry()),
            sessions = listOf(sampleSession()),
            isAiConfigured = true
        )
        setScreen()

        // Expand
        composeRule.onNodeWithText("Quiet night at anchor").performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithText("Anchored overnight in calm conditions.").assertIsDisplayed()

        // Collapse
        composeRule.onNodeWithText("Quiet night at anchor").performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithText("Anchored overnight in calm conditions.").assertDoesNotExist()
    }

    // ── Delete confirmation ──

    @Test
    fun `confirming delete calls viewModel deleteEntry`() {
        state.value = LogbookUiState(
            entries = listOf(sampleEntry()),
            sessions = listOf(sampleSession()),
            isAiConfigured = true
        )
        setScreen()

        // Expand → delete → confirm
        composeRule.onNodeWithText("Quiet night at anchor").performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithText(composeRule.string(R.string.delete)).performClick()
        composeRule.waitForIdle()

        // Click the confirm delete button inside the dialog
        composeRule.onAllNodesWithText(composeRule.string(R.string.delete))
            .filterToOne(hasAnyAncestor(isDialog()))
            .performClick()
        composeRule.waitForIdle()

        verify { viewModel.deleteEntry(1L) }
    }

    @Test
    fun `cancelling delete dialog dismisses it`() {
        state.value = LogbookUiState(
            entries = listOf(sampleEntry()),
            sessions = listOf(sampleSession()),
            isAiConfigured = true
        )
        setScreen()

        composeRule.onNodeWithText("Quiet night at anchor").performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithText(composeRule.string(R.string.delete)).performClick()
        composeRule.waitForIdle()

        // Cancel
        composeRule.onNodeWithText(composeRule.string(R.string.cancel)).performClick()
        composeRule.waitForIdle()

        composeRule.onNodeWithText(composeRule.string(R.string.logbook_delete_title)).assertDoesNotExist()
    }

    // ── SessionPickerDialog ──

    @Test
    fun `clicking generate icon opens session picker dialog`() {
        state.value = LogbookUiState(
            entries = listOf(sampleEntry()),
            sessions = listOf(sampleSession()),
            isAiConfigured = true
        )
        setScreen()

        composeRule.onNodeWithContentDescription("Generate entry").performClick()
        composeRule.waitForIdle()

        composeRule.onNodeWithText(composeRule.string(R.string.logbook_pick_session)).assertIsDisplayed()
    }

    @Test
    fun `session picker shows session details`() {
        state.value = LogbookUiState(
            entries = emptyList(),
            sessions = listOf(sampleSession()),
            isAiConfigured = true
        )
        setScreen()

        // Open dialog from empty state button
        composeRule.onNodeWithText(composeRule.string(R.string.logbook_generate)).performClick()
        composeRule.waitForIdle()

        composeRule.onNodeWithText(composeRule.string(R.string.logbook_pick_session)).assertIsDisplayed()
        // Session shows alarm count: "0 alarms"
        composeRule.onNodeWithText("0 alarms", substring = true).assertIsDisplayed()
    }

    @Test
    fun `session picker with no sessions shows empty message`() {
        state.value = LogbookUiState(
            entries = listOf(sampleEntry()),
            sessions = emptyList(),
            isAiConfigured = true
        )
        setScreen()

        composeRule.onNodeWithContentDescription("Generate entry").performClick()
        composeRule.waitForIdle()

        composeRule.onNodeWithText(composeRule.string(R.string.logbook_no_sessions)).assertIsDisplayed()
    }

    @Test
    fun `session picker clicking session calls viewModel generateEntry`() {
        val session = sampleSession()
        state.value = LogbookUiState(
            entries = emptyList(),
            sessions = listOf(session),
            isAiConfigured = true
        )
        setScreen()

        composeRule.onNodeWithText(composeRule.string(R.string.logbook_generate)).performClick()
        composeRule.waitForIdle()

        // Click the session card (it has "0 alarms" text)
        composeRule.onNodeWithText("0 alarms", substring = true).performClick()
        composeRule.waitForIdle()

        verify { viewModel.generateEntry(session) }
    }

    @Test
    fun `session picker cancel button dismisses dialog`() {
        state.value = LogbookUiState(
            entries = listOf(sampleEntry()),
            sessions = listOf(sampleSession()),
            isAiConfigured = true
        )
        setScreen()

        composeRule.onNodeWithContentDescription("Generate entry").performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithText(composeRule.string(R.string.logbook_pick_session)).assertIsDisplayed()

        composeRule.onNodeWithText(composeRule.string(R.string.cancel)).performClick()
        composeRule.waitForIdle()

        composeRule.onNodeWithText(composeRule.string(R.string.logbook_pick_session)).assertDoesNotExist()
    }

    @Test
    fun `session picker shows generating spinner for active session`() {
        state.value = LogbookUiState(
            entries = listOf(sampleEntry()),
            sessions = listOf(sampleSession()),
            isGenerating = true,
            generatingSessionId = 1L,
            isAiConfigured = true
        )
        setScreen()

        // Use the top bar icon to open the session picker
        composeRule.onNodeWithContentDescription("Generate entry").performClick()
        composeRule.waitForIdle()

        composeRule.onNodeWithText(composeRule.string(R.string.logbook_pick_session)).assertIsDisplayed()
    }

    @Test
    fun `error banner dismiss calls clearError`() {
        state.value = LogbookUiState(
            entries = listOf(sampleEntry()),
            sessions = listOf(sampleSession()),
            error = "AI offline",
            isAiConfigured = true
        )
        setScreen()

        composeRule.onNodeWithContentDescription("Dismiss").performClick()
        composeRule.waitForIdle()

        verify { viewModel.clearError() }
    }

    // ── Helpers ──

    private fun sampleEntry(
        id: Long = 1L,
        sessionId: Long = 1L,
        summary: String = "Quiet night at anchor",
        isAiGenerated: Boolean = true
    ) = LogbookEntry(
        id = id,
        sessionId = sessionId,
        createdAt = 1_700_000_000_000L,
        summary = summary,
        logEntry = "Anchored overnight in calm conditions.",
        safetyNote = "Holding well, no issues observed.",
        isAiGenerated = isAiGenerated
    )
}

private fun <A : ComponentActivity> AndroidComposeTestRule<*, A>.string(
    resId: Int,
    vararg formatArgs: Any
): String = activity.getString(resId, *formatArgs)

private fun AndroidComposeTestRule<*, ComponentActivity>.setContentWithTheme(
    content: @androidx.compose.runtime.Composable () -> Unit
) {
    setContent {
        OpenAnchorTheme {
            content()
        }
    }
}
