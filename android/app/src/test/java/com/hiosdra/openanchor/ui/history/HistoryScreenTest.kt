package com.hiosdra.openanchor.ui.history

import androidx.activity.ComponentActivity
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.AndroidComposeTestRule
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.hiosdra.openanchor.R
import com.hiosdra.openanchor.domain.model.AnchorSession
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
class HistoryScreenTest {

    @get:Rule
    val composeRule = createAndroidComposeRule<ComponentActivity>()

    private val viewModel = mockk<HistoryViewModel>(relaxed = true)
    private val sessions = MutableStateFlow<List<AnchorSession>>(emptyList())

    private var clickedSessionId: Long? = null

    @Before
    fun setup() {
        every { viewModel.sessions } returns sessions
        every { viewModel.searchQuery } returns MutableStateFlow("")
        every { viewModel.deleteError } returns MutableStateFlow(false)
        clickedSessionId = null
    }

    private fun setScreen() {
        composeRule.setContentWithTheme {
            HistoryScreen(
                onSessionClick = { clickedSessionId = it },
                onBack = {},
                viewModel = viewModel
            )
        }
    }

    // ── Title ──

    @Test
    fun `screen shows history title`() {
        sessions.value = emptyList()
        setScreen()
        composeRule.onNodeWithText(composeRule.string(R.string.history)).assertIsDisplayed()
    }

    // ── Empty state ──

    @Test
    fun `empty state shows no history message`() {
        sessions.value = emptyList()
        setScreen()
        composeRule.onNodeWithText(composeRule.string(R.string.no_history)).assertIsDisplayed()
    }

    // ── Session cards ──

    @Test
    fun `session card shows anchor coordinates`() {
        sessions.value = listOf(sampleSession())
        setScreen()
        composeRule.onNodeWithText("54.000000, 18.000000").assertIsDisplayed()
    }

    @Test
    fun `session card shows duration`() {
        sessions.value = listOf(sampleSession())
        setScreen()
        composeRule.onNodeWithText(composeRule.string(R.string.duration_format, 1L, 0L)).assertIsDisplayed()
    }

    @Test
    fun `session with alarm triggered shows red warning`() {
        sessions.value = listOf(sampleSession(alarmTriggered = true))
        setScreen()
        composeRule.onNodeWithContentDescription("Alarm triggered").assertIsDisplayed()
    }

    @Test
    fun `session without alarm shows green warning`() {
        sessions.value = listOf(sampleSession(alarmTriggered = false))
        setScreen()
        composeRule.onNodeWithContentDescription("No alarms").assertIsDisplayed()
    }

    @Test
    fun `clicking session card calls onSessionClick`() {
        sessions.value = listOf(sampleSession(id = 42L))
        setScreen()

        composeRule.onNodeWithText("54.000000, 18.000000").performClick()
        composeRule.waitForIdle()

        assert(clickedSessionId == 42L) { "Expected clickedSessionId to be 42, was $clickedSessionId" }
    }

    @Test
    fun `multiple sessions all shown`() {
        sessions.value = listOf(
            sampleSession(id = 1L),
            sampleSession(id = 2L)
        )
        setScreen()
        composeRule.onAllNodesWithText("54.000000, 18.000000").assertCountEquals(2)
    }

    // ── Delete ──

    @Test
    fun `clicking delete icon shows confirmation dialog`() {
        sessions.value = listOf(sampleSession())
        setScreen()

        composeRule.onNodeWithContentDescription("Delete").performClick()
        composeRule.waitForIdle()

        composeRule.onNodeWithText(composeRule.string(R.string.delete_session_title)).assertIsDisplayed()
        composeRule.onNodeWithText(composeRule.string(R.string.delete_session_message)).assertIsDisplayed()
    }

    @Test
    fun `confirming delete calls viewModel deleteSession`() {
        sessions.value = listOf(sampleSession(id = 5L))
        setScreen()

        composeRule.onNodeWithContentDescription("Delete").performClick()
        composeRule.waitForIdle()

        composeRule.onAllNodesWithText(composeRule.string(R.string.delete))
            .filterToOne(hasAnyAncestor(isDialog()))
            .performClick()
        composeRule.waitForIdle()

        verify { viewModel.deleteSession(5L) }
    }

    @Test
    fun `cancelling delete dialog dismisses it`() {
        sessions.value = listOf(sampleSession())
        setScreen()

        composeRule.onNodeWithContentDescription("Delete").performClick()
        composeRule.waitForIdle()

        composeRule.onNodeWithText(composeRule.string(R.string.cancel)).performClick()
        composeRule.waitForIdle()

        composeRule.onNodeWithText(composeRule.string(R.string.delete_session_title)).assertDoesNotExist()
    }

    // ── State transitions ──

    @Test
    fun `transition from empty to sessions updates display`() {
        sessions.value = emptyList()
        setScreen()
        composeRule.onNodeWithText(composeRule.string(R.string.no_history)).assertIsDisplayed()

        sessions.value = listOf(sampleSession())
        composeRule.waitForIdle()

        composeRule.onNodeWithText("54.000000, 18.000000").assertIsDisplayed()
        composeRule.onNodeWithText(composeRule.string(R.string.no_history)).assertDoesNotExist()
    }
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
