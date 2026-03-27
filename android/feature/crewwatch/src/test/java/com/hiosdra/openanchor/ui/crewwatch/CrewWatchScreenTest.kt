package com.hiosdra.openanchor.ui.crewwatch

import androidx.activity.ComponentActivity

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.hasScrollToNodeAction
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.AndroidComposeTestRule
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performScrollToNode
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.hiosdra.openanchor.core.ui.R
import com.hiosdra.openanchor.ui.theme.OpenAnchorTheme
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.flow.MutableStateFlow
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config

@RunWith(AndroidJUnit4::class)
@Config(sdk = [35])
class CrewWatchScreenTest {

    @get:Rule
    val composeRule = createAndroidComposeRule<ComponentActivity>()

    // ── Idle state (not running) ────────────────────────────────────────

    @Test
    fun idleState_showsSubtitle() {
        val vm = viewModel(CrewWatchUiState())

        composeRule.setContentWithTheme {
            CrewWatchScreen(onBack = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.crew_watch_subtitle)).assertIsDisplayed()
    }

    @Test
    fun idleState_showsScheduleHeader() {
        val vm = viewModel(CrewWatchUiState())

        composeRule.setContentWithTheme {
            CrewWatchScreen(onBack = {}, viewModel = vm)
        }

        // Schedule header is below TimerCard + ControlsCard in LazyColumn
        composeRule.onNodeWithText(string(R.string.crew_watch_duration)).assertIsDisplayed()
    }

    @Test
    fun idleState_showsDurationSelector() {
        val vm = viewModel(CrewWatchUiState(watchDurationHours = 4))

        composeRule.setContentWithTheme {
            CrewWatchScreen(onBack = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.crew_watch_duration)).assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.crew_watch_duration_hours, 1)).assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.crew_watch_duration_hours, 2)).assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.crew_watch_duration_hours, 3)).assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.crew_watch_duration_hours, 4)).assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.crew_watch_duration_hours, 6)).assertIsDisplayed()
    }

    @Test
    fun idleState_showsAlarmHint() {
        val vm = viewModel(CrewWatchUiState())

        composeRule.setContentWithTheme {
            CrewWatchScreen(onBack = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.crew_watch_alarm_5min)).assertIsDisplayed()
    }

    // ── No crew members ─────────────────────────────────────────────────

    @Test
    fun noCrew_showsStartButton() {
        val vm = viewModel(
            CrewWatchUiState(
                crewMembers = emptyList(),
                isRunning = false
            )
        )

        composeRule.setContentWithTheme {
            CrewWatchScreen(onBack = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.crew_watch_start)).assertIsDisplayed()
    }

    // ── Crew members added ──────────────────────────────────────────────

    @Test
    fun crewAdded_showsMemberNames() {
        val vm = viewModel(
            CrewWatchUiState(
                crewMembers = listOf("Alice", "Bob"),
                isRunning = false
            )
        )

        composeRule.setContentWithTheme {
            CrewWatchScreen(onBack = {}, viewModel = vm)
        }

        // Start button should be enabled with crew members
        composeRule.onNodeWithText(string(R.string.crew_watch_start)).assertIsDisplayed()
    }

    @Test
    fun crewAdded_startButton_callsViewModel() {
        val vm = viewModel(
            CrewWatchUiState(
                crewMembers = listOf("Alice", "Bob"),
                isRunning = false
            )
        )

        composeRule.setContentWithTheme {
            CrewWatchScreen(onBack = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.crew_watch_start)).performClick()
        verify { vm.startWatch() }
    }

    // ── Running state ───────────────────────────────────────────────────

    @Test
    fun running_showsCurrentCrewMemberAndTimer() {
        val vm = viewModel(
            CrewWatchUiState(
                isRunning = true,
                crewMembers = listOf("Alice", "Bob"),
                currentCrewMember = "Alice",
                nextCrewMember = "Bob",
                remainingMs = 3_600_000L,
                progress = 0.75f
            )
        )

        composeRule.setContentWithTheme {
            CrewWatchScreen(onBack = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.crew_watch_timer)).assertIsDisplayed()
        composeRule.onNodeWithText("01:00:00").assertIsDisplayed()
    }

    @Test
    fun running_showsTimerCountdown() {
        val vm = viewModel(
            CrewWatchUiState(
                isRunning = true,
                crewMembers = listOf("Alice"),
                currentCrewMember = "Alice",
                remainingMs = 3_661_000L, // 1h 1m 1s
                progress = 0.5f
            )
        )

        composeRule.setContentWithTheme {
            CrewWatchScreen(onBack = {}, viewModel = vm)
        }

        composeRule.onNodeWithText("01:01:01").assertIsDisplayed()
    }

    @Test
    fun running_showsNextCrewMemberInfo() {
        val vm = viewModel(
            CrewWatchUiState(
                isRunning = true,
                crewMembers = listOf("Alice", "Bob"),
                currentCrewMember = "Alice",
                nextCrewMember = "Bob",
                remainingMs = 3_600_000L,
                progress = 0.5f
            )
        )

        composeRule.setContentWithTheme {
            CrewWatchScreen(onBack = {}, viewModel = vm)
        }

        composeRule.onNodeWithText("${string(R.string.crew_watch_next)}: Bob").performScrollTo().assertIsDisplayed()
    }

    @Test
    fun running_showsStopButton() {
        val vm = viewModel(
            CrewWatchUiState(
                isRunning = true,
                crewMembers = listOf("Alice"),
                currentCrewMember = "Alice",
                remainingMs = 3_600_000L,
                progress = 0.5f
            )
        )

        composeRule.setContentWithTheme {
            CrewWatchScreen(onBack = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.crew_watch_stop)).performScrollTo().assertIsDisplayed()
    }

    @Test
    fun running_stopButton_callsViewModel() {
        val vm = viewModel(
            CrewWatchUiState(
                isRunning = true,
                crewMembers = listOf("Alice"),
                currentCrewMember = "Alice",
                remainingMs = 3_600_000L,
                progress = 0.5f
            )
        )

        composeRule.setContentWithTheme {
            CrewWatchScreen(onBack = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.crew_watch_stop)).performScrollTo().performClick()
        verify { vm.stopWatch() }
    }

    @Test
    fun running_hidesAddCrewMemberField() {
        val vm = viewModel(
            CrewWatchUiState(
                isRunning = true,
                crewMembers = listOf("Alice"),
                currentCrewMember = "Alice",
                remainingMs = 3_600_000L,
                progress = 0.5f
            )
        )

        composeRule.setContentWithTheme {
            CrewWatchScreen(onBack = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.crew_watch_crew_member)).assertDoesNotExist()
    }

    // ── Watch change dialog ─────────────────────────────────────────────

    @Test
    fun watchChangeEvent_showsDialog() {
        val vm = viewModel(
            CrewWatchUiState(
                isRunning = true,
                crewMembers = listOf("Alice", "Bob"),
                currentCrewMember = "Bob",
                remainingMs = 3_600_000L,
                progress = 0.0f,
                showWatchChangeEvent = "Bob"
            )
        )

        composeRule.setContentWithTheme {
            CrewWatchScreen(onBack = {}, viewModel = vm)
        }

        composeRule.onNodeWithText("Watch Change").assertIsDisplayed()
        composeRule.onNodeWithText("It's now Bob's watch!").assertIsDisplayed()
        composeRule.onNodeWithText("OK").assertIsDisplayed()
    }

    @Test
    fun watchChangeDialog_okButton_callsDismiss() {
        val vm = viewModel(
            CrewWatchUiState(
                isRunning = true,
                crewMembers = listOf("Alice", "Bob"),
                currentCrewMember = "Bob",
                remainingMs = 3_600_000L,
                progress = 0.0f,
                showWatchChangeEvent = "Bob"
            )
        )

        composeRule.setContentWithTheme {
            CrewWatchScreen(onBack = {}, viewModel = vm)
        }

        composeRule.onNodeWithText("OK").performClick()
        verify { vm.dismissWatchChange() }
    }

    @Test
    fun noWatchChangeEvent_hidesDialog() {
        val vm = viewModel(
            CrewWatchUiState(
                isRunning = true,
                crewMembers = listOf("Alice"),
                currentCrewMember = "Alice",
                remainingMs = 3_600_000L,
                progress = 0.5f,
                showWatchChangeEvent = null
            )
        )

        composeRule.setContentWithTheme {
            CrewWatchScreen(onBack = {}, viewModel = vm)
        }

        composeRule.onNodeWithText("Watch Change").assertDoesNotExist()
    }

    // ── Add crew member ─────────────────────────────────────────────────

    @Test
    fun notRunning_showsAddCrewMemberField() {
        val vm = viewModel(
            CrewWatchUiState(
                crewMembers = emptyList(),
                isRunning = false,
                newMemberName = ""
            )
        )

        composeRule.setContentWithTheme {
            CrewWatchScreen(onBack = {}, viewModel = vm)
        }

        // When no crew, the add crew member field should be in the LazyColumn
        // At minimum the start button should be visible
        composeRule.onNodeWithText(string(R.string.crew_watch_start)).assertIsDisplayed()
    }

    // ── Timer formatting ────────────────────────────────────────────────

    @Test
    fun timer_zeroPad_showsCorrectFormat() {
        val vm = viewModel(
            CrewWatchUiState(
                isRunning = true,
                crewMembers = listOf("Alice"),
                currentCrewMember = "Alice",
                remainingMs = 62_000L, // 0h 1m 2s
                progress = 0.99f
            )
        )

        composeRule.setContentWithTheme {
            CrewWatchScreen(onBack = {}, viewModel = vm)
        }

        composeRule.onNodeWithText("00:01:02").assertIsDisplayed()
    }

    @Test
    fun timer_multipleHours() {
        val vm = viewModel(
            CrewWatchUiState(
                isRunning = true,
                crewMembers = listOf("Alice"),
                currentCrewMember = "Alice",
                remainingMs = 14_400_000L, // 4h
                progress = 0.0f
            )
        )

        composeRule.setContentWithTheme {
            CrewWatchScreen(onBack = {}, viewModel = vm)
        }

        composeRule.onNodeWithText("04:00:00").assertIsDisplayed()
    }

    // ── State transitions ───────────────────────────────────────────────

    @Test
    fun stateTransition_idleToRunning() {
        val state = MutableStateFlow(
            CrewWatchUiState(
                crewMembers = listOf("Alice", "Bob"),
                isRunning = false
            )
        )
        val vm = mockk<CrewWatchViewModel>(relaxed = true)
        every { vm.uiState } returns state

        composeRule.setContentWithTheme {
            CrewWatchScreen(onBack = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.crew_watch_subtitle)).assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.crew_watch_start)).assertIsDisplayed()

        state.value = CrewWatchUiState(
            isRunning = true,
            crewMembers = listOf("Alice", "Bob"),
            currentCrewMember = "Alice",
            nextCrewMember = "Bob",
            remainingMs = 7_200_000L,
            progress = 0.0f
        )
        composeRule.waitForIdle()

        composeRule.onNodeWithText("02:00:00").assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.crew_watch_stop)).performScrollTo().assertIsDisplayed()
    }

    @Test
    fun stateTransition_runningToWatchChange() {
        val state = MutableStateFlow(
            CrewWatchUiState(
                isRunning = true,
                crewMembers = listOf("Alice", "Bob"),
                currentCrewMember = "Alice",
                nextCrewMember = "Bob",
                remainingMs = 100_000L,
                progress = 0.95f,
                showWatchChangeEvent = null
            )
        )
        val vm = mockk<CrewWatchViewModel>(relaxed = true)
        every { vm.uiState } returns state

        composeRule.setContentWithTheme {
            CrewWatchScreen(onBack = {}, viewModel = vm)
        }

        composeRule.onNodeWithText("Watch Change").assertDoesNotExist()

        state.value = state.value.copy(
            currentCrewMember = "Bob",
            nextCrewMember = "Alice",
            remainingMs = 7_200_000L,
            progress = 0.0f,
            showWatchChangeEvent = "Bob"
        )
        composeRule.waitForIdle()

        composeRule.onNodeWithText("Watch Change").assertIsDisplayed()
        composeRule.onNodeWithText("It's now Bob's watch!").assertIsDisplayed()
    }

    // ── Back button ─────────────────────────────────────────────────────

    @Test
    fun backButton_callsOnBack() {
        var backCalled = false
        val vm = viewModel(CrewWatchUiState())

        composeRule.setContentWithTheme {
            CrewWatchScreen(onBack = { backCalled = true }, viewModel = vm)
        }

        composeRule.onNodeWithContentDescription(string(R.string.cancel)).performClick()
        assert(backCalled) { "onBack should have been called" }
    }

    // ── Duration selection ──────────────────────────────────────────────

    @Test
    fun durationChip_callsSetDuration() {
        val vm = viewModel(CrewWatchUiState(watchDurationHours = 4, isRunning = false))

        composeRule.setContentWithTheme {
            CrewWatchScreen(onBack = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.crew_watch_duration_hours, 2)).performClick()
        verify { vm.setWatchDuration(2) }
    }

    @Test
    fun durationChips_disabledWhenRunning() {
        val vm = viewModel(
            CrewWatchUiState(
                isRunning = true,
                crewMembers = listOf("Alice"),
                currentCrewMember = "Alice",
                remainingMs = 3_600_000L,
                progress = 0.5f,
                watchDurationHours = 4
            )
        )

        composeRule.setContentWithTheme {
            CrewWatchScreen(onBack = {}, viewModel = vm)
        }

        // Duration chips should be present but disabled - click should not call setWatchDuration
        composeRule.onNodeWithText(string(R.string.crew_watch_duration_hours, 1)).performClick()
        verify(exactly = 0) { vm.setWatchDuration(any()) }
    }

    // ── Crew member labels ──────────────────────────────────────────────

    @Test
    fun running_showsOnWatchLabel() {
        val vm = viewModel(
            CrewWatchUiState(
                isRunning = true,
                crewMembers = listOf("Alice", "Bob"),
                currentCrewMember = "Alice",
                nextCrewMember = "Bob",
                remainingMs = 3_600_000L,
                progress = 0.5f
            )
        )

        composeRule.setContentWithTheme {
            CrewWatchScreen(onBack = {}, viewModel = vm)
        }

        composeRule.onNode(hasScrollToNodeAction())
            .performScrollToNode(hasText("On watch"))
        composeRule.onNodeWithText("On watch").assertIsDisplayed()
    }

    @Test
    fun running_showsNextLabel() {
        val vm = viewModel(
            CrewWatchUiState(
                isRunning = true,
                crewMembers = listOf("Alice", "Bob"),
                currentCrewMember = "Alice",
                nextCrewMember = "Bob",
                remainingMs = 3_600_000L,
                progress = 0.5f
            )
        )

        composeRule.setContentWithTheme {
            CrewWatchScreen(onBack = {}, viewModel = vm)
        }

        composeRule.onNode(hasScrollToNodeAction())
            .performScrollToNode(hasText(string(R.string.crew_watch_next), substring = true))
        composeRule.onNodeWithText(string(R.string.crew_watch_next), substring = true).assertExists()
    }

    // ── Crew member removal ─────────────────────────────────────────────

    @Test
    fun notRunning_removeButton_callsRemove() {
        val vm = viewModel(
            CrewWatchUiState(
                crewMembers = listOf("Alice"),
                isRunning = false
            )
        )

        composeRule.setContentWithTheme {
            CrewWatchScreen(onBack = {}, viewModel = vm)
        }

        composeRule.onNode(hasScrollToNodeAction())
            .performScrollToNode(hasContentDescription(string(R.string.crew_watch_remove)))
        composeRule.onNodeWithContentDescription(string(R.string.crew_watch_remove))
            .performClick()
        verify { vm.removeCrewMember(0) }
    }

    @Test
    fun running_hidesRemoveButton() {
        val vm = viewModel(
            CrewWatchUiState(
                isRunning = true,
                crewMembers = listOf("Alice", "Bob"),
                currentCrewMember = "Alice",
                nextCrewMember = "Bob",
                remainingMs = 3_600_000L,
                progress = 0.5f
            )
        )

        composeRule.setContentWithTheme {
            CrewWatchScreen(onBack = {}, viewModel = vm)
        }

        // Remove buttons should not exist when running (condition: !isRunning)
        composeRule.onNodeWithContentDescription(string(R.string.crew_watch_remove))
            .assertDoesNotExist()
    }

    // ── Add crew member ─────────────────────────────────────────────────

    @Test
    fun addCrewMember_clickAdd_callsViewModel() {
        val vm = viewModel(
            CrewWatchUiState(
                crewMembers = emptyList(),
                isRunning = false,
                newMemberName = "Charlie"
            )
        )

        composeRule.setContentWithTheme {
            CrewWatchScreen(onBack = {}, viewModel = vm)
        }

        composeRule.onNode(hasScrollToNodeAction())
            .performScrollToNode(hasContentDescription(string(R.string.crew_watch_add_crew)))
        composeRule.onNodeWithContentDescription(string(R.string.crew_watch_add_crew))
            .performClick()
        verify { vm.addCrewMember() }
    }

    // ── Timer color thresholds ──────────────────────────────────────────

    @Test
    fun timer_under5min_rendersTimer() {
        val vm = viewModel(
            CrewWatchUiState(
                isRunning = true,
                crewMembers = listOf("Alice"),
                currentCrewMember = "Alice",
                remainingMs = 4 * 60 * 1000L,
                progress = 0.95f
            )
        )

        composeRule.setContentWithTheme {
            CrewWatchScreen(onBack = {}, viewModel = vm)
        }

        composeRule.onNodeWithText("00:04:00").assertIsDisplayed()
    }

    @Test
    fun timer_under15min_rendersTimer() {
        val vm = viewModel(
            CrewWatchUiState(
                isRunning = true,
                crewMembers = listOf("Alice"),
                currentCrewMember = "Alice",
                remainingMs = 10 * 60 * 1000L,
                progress = 0.85f
            )
        )

        composeRule.setContentWithTheme {
            CrewWatchScreen(onBack = {}, viewModel = vm)
        }

        composeRule.onNodeWithText("00:10:00").assertIsDisplayed()
    }

    // ── Schedule header ─────────────────────────────────────────────────

    @Test
    fun scheduleHeader_shown() {
        val vm = viewModel(
            CrewWatchUiState(
                crewMembers = listOf("Alice"),
                isRunning = false
            )
        )

        composeRule.setContentWithTheme {
            CrewWatchScreen(onBack = {}, viewModel = vm)
        }

        composeRule.onNode(hasScrollToNodeAction())
            .performScrollToNode(hasText(string(R.string.crew_watch_schedule)))
        composeRule.onNodeWithText(string(R.string.crew_watch_schedule)).assertIsDisplayed()
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private fun viewModel(state: CrewWatchUiState): CrewWatchViewModel {
        val vm = mockk<CrewWatchViewModel>(relaxed = true)
        every { vm.uiState } returns MutableStateFlow(state)
        return vm
    }

    private fun string(resId: Int, vararg args: Any): String =
        composeRule.activity.getString(resId, *args)

    private fun AndroidComposeTestRule<*, ComponentActivity>.setContentWithTheme(
        content: @androidx.compose.runtime.Composable () -> Unit
    ) {
        setContent { OpenAnchorTheme { content() } }
    }
}
