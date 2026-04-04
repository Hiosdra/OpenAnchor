package com.hiosdra.openanchor.ui.historydetail

import androidx.activity.ComponentActivity
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.*
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.hiosdra.openanchor.core.ui.R
import com.hiosdra.openanchor.domain.model.AnchorZone
import com.hiosdra.openanchor.ui.samplePosition
import com.hiosdra.openanchor.ui.sampleSession
import com.hiosdra.openanchor.ui.sampleTrackPoint
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
class HistoryDetailScreenTest {

    @get:Rule
    val composeRule = createAndroidComposeRule<ComponentActivity>()

    // ── Loading state ───────────────────────────────────────────────────

    @Test
    fun loadingState_showsSpinner_hidesContent() {
        val vm = viewModel(HistoryDetailState(isLoading = true))

        composeRule.setContentWithTheme {
            HistoryDetailScreen(sessionId = 1L, onBack = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(composeRule.string(R.string.session_details)).assertIsDisplayed()
        // Share icon should NOT be visible while loading
        composeRule.onNode(hasContentDescription(composeRule.string(R.string.export_gpx))).assertDoesNotExist()
    }

    // ── Session not found ───────────────────────────────────────────────

    @Test
    fun sessionNotFound_showsMessage() {
        val vm = viewModel(HistoryDetailState(isLoading = false, session = null))

        composeRule.setContentWithTheme {
            HistoryDetailScreen(sessionId = 99L, onBack = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(composeRule.string(R.string.session_not_found)).assertIsDisplayed()
    }

    // ── Session loaded with data ────────────────────────────────────────

    @Test
    fun sessionLoaded_showsTimestampsAndMetrics() {
        val session = sampleSession(alarmTriggered = false)
        val points = listOf(
            sampleTrackPoint(sessionId = 1L),
            sampleTrackPoint(sessionId = 1L)
        )
        val vm = viewModel(HistoryDetailState(isLoading = false, session = session, trackPoints = points))

        composeRule.setContentWithTheme {
            HistoryDetailScreen(sessionId = 1L, onBack = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(composeRule.string(R.string.start_time)).assertIsDisplayed()
        composeRule.onNodeWithText(composeRule.string(R.string.end_time)).assertIsDisplayed()
        composeRule.onNodeWithText(composeRule.string(R.string.radius_label)).assertIsDisplayed()
        composeRule.onNodeWithText("35 m").assertIsDisplayed()
        composeRule.onNodeWithText(composeRule.string(R.string.track_points_count)).assertIsDisplayed()
        composeRule.onNodeWithText("2").assertIsDisplayed()
        composeRule.onNodeWithText(composeRule.string(R.string.alarms_triggered)).assertIsDisplayed()
        composeRule.onNodeWithText("0").assertIsDisplayed()
    }

    @Test
    fun sessionLoaded_showsDuration() {
        val session = sampleSession()
        val vm = viewModel(HistoryDetailState(isLoading = false, session = session))

        composeRule.setContentWithTheme {
            HistoryDetailScreen(sessionId = 1L, onBack = {}, viewModel = vm)
        }

        // sampleSession: endTime - startTime = 3_600_000 ms = 1h 0min
        composeRule.onNodeWithText(composeRule.string(R.string.duration_format, 1L, 0L)).assertIsDisplayed()
    }

    @Test
    fun sessionLoaded_showsExportGpxButton() {
        val vm = viewModel(
            HistoryDetailState(isLoading = false, session = sampleSession(), trackPoints = emptyList())
        )

        composeRule.setContentWithTheme {
            HistoryDetailScreen(sessionId = 1L, onBack = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(composeRule.string(R.string.export_gpx)).assertIsDisplayed()
    }

    @Test
    fun sessionLoaded_topBarShareIcon_visible() {
        val vm = viewModel(
            HistoryDetailState(isLoading = false, session = sampleSession())
        )

        composeRule.setContentWithTheme {
            HistoryDetailScreen(sessionId = 1L, onBack = {}, viewModel = vm)
        }

        composeRule.onNode(hasContentDescription(composeRule.string(R.string.export_gpx))).assertIsDisplayed()
    }

    // ── Empty track points ──────────────────────────────────────────────

    @Test
    fun emptyTrackPoints_showsZeroCount() {
        val vm = viewModel(
            HistoryDetailState(isLoading = false, session = sampleSession(), trackPoints = emptyList())
        )

        composeRule.setContentWithTheme {
            HistoryDetailScreen(sessionId = 1L, onBack = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(composeRule.string(R.string.track_points_count)).assertIsDisplayed()
        // "0" appears twice (track points + alarms) — assert both exist
        composeRule.onAllNodesWithText("0").assertCountEquals(2)
    }

    // ── Alarm vs safe session ───────────────────────────────────────────

    @Test
    fun alarmSession_showsAlarmCount() {
        val session = sampleSession(alarmTriggered = true)   // alarmCount = 1
        val alarmPoint = sampleTrackPoint(sessionId = 1L, isAlarm = true)
        val vm = viewModel(
            HistoryDetailState(isLoading = false, session = session, trackPoints = listOf(alarmPoint))
        )

        composeRule.setContentWithTheme {
            HistoryDetailScreen(sessionId = 1L, onBack = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(composeRule.string(R.string.alarms_triggered)).assertIsDisplayed()
        // "1" appears as both track-point count and alarm count
        composeRule.onAllNodesWithText("1")[0].assertIsDisplayed()
    }

    @Test
    fun safeSession_showsZeroAlarms() {
        val session = sampleSession(alarmTriggered = false)
        val vm = viewModel(
            HistoryDetailState(isLoading = false, session = session, trackPoints = emptyList())
        )

        composeRule.setContentWithTheme {
            HistoryDetailScreen(sessionId = 1L, onBack = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(composeRule.string(R.string.alarms_triggered)).assertIsDisplayed()
        composeRule.onAllNodesWithText("0").assertCountEquals(2)
    }

    // ── SectorWithCircle zone type ──────────────────────────────────────

    @Test
    fun sectorWithCircleZone_rendersWithoutCrash() {
        val sectorZone = AnchorZone.SectorWithCircle(
            anchorPosition = samplePosition(),
            radiusMeters = 30.0,
            sectorRadiusMeters = 80.0,
            sectorHalfAngleDeg = 60.0,
            sectorBearingDeg = 45.0
        )
        val session = sampleSession().copy(zone = sectorZone)
        val vm = viewModel(
            HistoryDetailState(isLoading = false, session = session, trackPoints = emptyList())
        )

        composeRule.setContentWithTheme {
            HistoryDetailScreen(sessionId = 1L, onBack = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(composeRule.string(R.string.radius_label)).assertIsDisplayed()
        composeRule.onNodeWithText("30 m").assertIsDisplayed()
    }

    // ── Back navigation ─────────────────────────────────────────────────

    @Test
    fun backButton_invokesOnBack() {
        val vm = viewModel(HistoryDetailState(isLoading = false, session = sampleSession()))
        var backCalled = false

        composeRule.setContentWithTheme {
            HistoryDetailScreen(sessionId = 1L, onBack = { backCalled = true }, viewModel = vm)
        }

        composeRule.onNodeWithContentDescription("Back").performClick()
        assert(backCalled) { "Expected onBack callback to be invoked" }
    }

    // ── GPX export action ───────────────────────────────────────────────

    @Test
    fun exportGpxButton_callsViewModelExport() {
        val vm = viewModel(
            HistoryDetailState(isLoading = false, session = sampleSession())
        )

        composeRule.setContentWithTheme {
            HistoryDetailScreen(sessionId = 1L, onBack = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(composeRule.string(R.string.export_gpx)).performClick()
        verify { vm.exportGpx() }
    }

    @Test
    fun topBarShareIcon_callsViewModelExport() {
        val vm = viewModel(
            HistoryDetailState(isLoading = false, session = sampleSession())
        )

        composeRule.setContentWithTheme {
            HistoryDetailScreen(sessionId = 1L, onBack = {}, viewModel = vm)
        }

        composeRule.onNode(hasContentDescription(composeRule.string(R.string.export_gpx))).performClick()
        verify { vm.exportGpx() }
    }

    // ── Export error state ───────────────────────────────────────────────

    @Test
    fun exportError_showsErrorMessage() {
        val vm = viewModel(
            HistoryDetailState(
                isLoading = false,
                session = sampleSession(),
                exportError = true
            )
        )

        composeRule.setContentWithTheme {
            HistoryDetailScreen(sessionId = 1L, onBack = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(composeRule.string(R.string.export_gpx_error)).assertExists()
    }

    @Test
    fun noExportError_hidesErrorMessage() {
        val vm = viewModel(
            HistoryDetailState(
                isLoading = false,
                session = sampleSession(),
                exportError = false
            )
        )

        composeRule.setContentWithTheme {
            HistoryDetailScreen(sessionId = 1L, onBack = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(composeRule.string(R.string.export_gpx_error)).assertDoesNotExist()
    }

    // ── Session without endTime ─────────────────────────────────────────

    @Test
    fun sessionWithoutEndTime_omitsDurationRow() {
        val session = sampleSession().copy(endTime = null)
        val vm = viewModel(HistoryDetailState(isLoading = false, session = session))

        composeRule.setContentWithTheme {
            HistoryDetailScreen(sessionId = 1L, onBack = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(composeRule.string(R.string.start_time)).assertIsDisplayed()
        composeRule.onNodeWithText(composeRule.string(R.string.end_time)).assertDoesNotExist()
    }

    // ── Helpers ─────────────────────────────────────────────────────────

    private fun viewModel(state: HistoryDetailState): HistoryDetailViewModel {
        val vm = mockk<HistoryDetailViewModel>(relaxed = true)
        every { vm.state } returns MutableStateFlow(state)
        return vm
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
