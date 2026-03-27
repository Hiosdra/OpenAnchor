package com.hiosdra.openanchor.ui.paired

import androidx.activity.ComponentActivity
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.*
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.hiosdra.openanchor.core.ui.R
import com.hiosdra.openanchor.domain.model.AlarmState
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
class PairedDashboardScreenTest {

    @get:Rule
    val composeRule = createAndroidComposeRule<ComponentActivity>()

    // ── Default (disconnected peer) ─────────────────────────────────────

    @Test
    fun defaultState_showsSafeAlarmAndConnectionLost() {
        val vm = viewModel(PairedDashboardUiState(serverRunning = true, isPaired = true))

        composeRule.setContentWithTheme {
            PairedDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText("SAFE").assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.paired_connection_lost)).assertIsDisplayed()
        // GPS and battery both show "—" when no data
        assert(composeRule.onAllNodesWithText("—").fetchSemanticsNodes().size >= 2)
    }

    // ── Peer connected with telemetry ───────────────────────────────────

    @Test
    fun peerConnected_showsConnectionOkAndGps() {
        val vm = viewModel(
            PairedDashboardUiState(
                isPaired = true,
                peerConnected = true,
                serverRunning = true,
                gpsAccuracy = 3f,
                distanceToAnchor = 15.0,
                alarmState = AlarmState.SAFE
            )
        )

        composeRule.setContentWithTheme {
            PairedDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.paired_connection_ok)).assertIsDisplayed()
        composeRule.onNodeWithText("±3 m").assertIsDisplayed()
        composeRule.onNodeWithText("15").assertIsDisplayed()
    }

    // ── Battery display ─────────────────────────────────────────────────

    @Test
    fun batteryLevel_showsPercentage() {
        val vm = viewModel(
            PairedDashboardUiState(
                isPaired = true,
                peerConnected = true,
                serverRunning = true,
                batteryLevel = 0.82,
                isCharging = true
            )
        )

        composeRule.setContentWithTheme {
            PairedDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText("82%").assertIsDisplayed()
    }

    @Test
    fun batteryNull_showsDash() {
        val vm = viewModel(
            PairedDashboardUiState(
                isPaired = true,
                serverRunning = true,
                batteryLevel = null,
                gpsAccuracy = 5f
            )
        )

        composeRule.setContentWithTheme {
            PairedDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.paired_battery)).assertIsDisplayed()
        composeRule.onNodeWithText("—").assertIsDisplayed()
    }

    @Test
    fun batteryLow_showsPercentage() {
        val vm = viewModel(
            PairedDashboardUiState(
                isPaired = true,
                serverRunning = true,
                batteryLevel = 0.08,
                isCharging = false
            )
        )

        composeRule.setContentWithTheme {
            PairedDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText("8%").assertIsDisplayed()
    }

    // ── Alarm states ────────────────────────────────────────────────────

    @Test
    fun cautionState_showsCautionLabel() {
        val vm = viewModel(
            PairedDashboardUiState(
                isPaired = true,
                serverRunning = true,
                alarmState = AlarmState.CAUTION,
                distanceToAnchor = 30.0
            )
        )

        composeRule.setContentWithTheme {
            PairedDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText("CAUTION").assertIsDisplayed()
    }

    @Test
    fun warningState_showsDismissAlarmButton() {
        val vm = viewModel(
            PairedDashboardUiState(
                isPaired = true,
                serverRunning = true,
                alarmState = AlarmState.WARNING,
                distanceToAnchor = 45.0
            )
        )

        composeRule.setContentWithTheme {
            PairedDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText("WARNING").assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.dismiss_alarm)).performScrollTo().assertIsDisplayed()
    }

    @Test
    fun alarmState_showsDismissAlarmButton() {
        val vm = viewModel(
            PairedDashboardUiState(
                isPaired = true,
                serverRunning = true,
                alarmState = AlarmState.ALARM,
                distanceToAnchor = 60.0
            )
        )

        composeRule.setContentWithTheme {
            PairedDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText("ALARM").assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.dismiss_alarm)).performScrollTo().assertIsDisplayed()
    }

    @Test
    fun safeState_doesNotShowDismissButton() {
        val vm = viewModel(
            PairedDashboardUiState(
                isPaired = true,
                serverRunning = true,
                alarmState = AlarmState.SAFE,
                distanceToAnchor = 10.0
            )
        )

        composeRule.setContentWithTheme {
            PairedDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText("SAFE").assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.dismiss_alarm)).assertDoesNotExist()
    }

    @Test
    fun dismissAlarmButton_callsViewModel() {
        val vm = viewModel(
            PairedDashboardUiState(
                isPaired = true,
                serverRunning = true,
                alarmState = AlarmState.ALARM,
                distanceToAnchor = 60.0
            )
        )

        composeRule.setContentWithTheme {
            PairedDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.dismiss_alarm)).performScrollTo().performClick()
        verify { vm.dismissAlarm() }
    }

    // ── Distance display ────────────────────────────────────────────────

    @Test
    fun distanceDisplay_showsFormattedDistance() {
        val vm = viewModel(
            PairedDashboardUiState(
                isPaired = true,
                serverRunning = true,
                distanceToAnchor = 123.7,
                alarmState = AlarmState.SAFE
            )
        )

        composeRule.setContentWithTheme {
            PairedDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText("124").assertIsDisplayed()
    }

    // ── SOG / COG ───────────────────────────────────────────────────────

    @Test
    fun sogAndCog_showValues() {
        val vm = viewModel(
            PairedDashboardUiState(
                isPaired = true,
                serverRunning = true,
                sog = 2.3,
                cog = 180.0
            )
        )

        composeRule.setContentWithTheme {
            PairedDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText("2.3 kn").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithText("180°").performScrollTo().assertIsDisplayed()
    }

    @Test
    fun sogNull_hidesSOGCard() {
        val vm = viewModel(
            PairedDashboardUiState(
                isPaired = true,
                serverRunning = true,
                sog = null,
                cog = null
            )
        )

        composeRule.setContentWithTheme {
            PairedDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText("SOG").assertDoesNotExist()
        composeRule.onNodeWithText("COG").assertDoesNotExist()
    }

    // ── GPS accuracy ────────────────────────────────────────────────────

    @Test
    fun gpsAccuracyPresent_showsValue() {
        val vm = viewModel(
            PairedDashboardUiState(
                isPaired = true,
                serverRunning = true,
                gpsAccuracy = 20f
            )
        )

        composeRule.setContentWithTheme {
            PairedDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText("±20 m").assertIsDisplayed()
    }

    // ── Disconnect dialog ───────────────────────────────────────────────

    @Test
    fun disconnectDialog_showsTitleAndMessage() {
        val vm = viewModel(
            PairedDashboardUiState(
                isPaired = true,
                serverRunning = true,
                showDisconnectDialog = true
            )
        )

        composeRule.setContentWithTheme {
            PairedDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.paired_disconnect_title)).assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.paired_disconnect_message)).assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.cancel)).assertIsDisplayed()
    }

    @Test
    fun disconnectDialog_cancelDismissesDialog() {
        val vm = viewModel(
            PairedDashboardUiState(
                isPaired = true,
                serverRunning = true,
                showDisconnectDialog = true
            )
        )

        composeRule.setContentWithTheme {
            PairedDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.cancel)).performClick()
        verify { vm.dismissDisconnectDialog() }
    }

    @Test
    fun disconnectDialog_confirmCallsDisconnect() {
        var disconnectedCalled = false
        val vm = viewModel(
            PairedDashboardUiState(
                isPaired = true,
                serverRunning = true,
                showDisconnectDialog = true
            )
        )

        composeRule.setContentWithTheme {
            PairedDashboardScreen(onDisconnected = { disconnectedCalled = true }, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.paired_disconnect)).performClick()
        verify { vm.disconnect() }
        assert(disconnectedCalled)
    }

    @Test
    fun disconnectDialog_hidden_doesNotShowDialogContent() {
        val vm = viewModel(
            PairedDashboardUiState(
                isPaired = true,
                serverRunning = true,
                showDisconnectDialog = false
            )
        )

        composeRule.setContentWithTheme {
            PairedDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.paired_disconnect_title)).assertDoesNotExist()
    }

    // ── Top bar ─────────────────────────────────────────────────────────

    @Test
    fun topBar_showsTitle() {
        val vm = viewModel(PairedDashboardUiState(serverRunning = true, isPaired = true))

        composeRule.setContentWithTheme {
            PairedDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.paired_dashboard)).assertIsDisplayed()
    }

    // ── State transitions ───────────────────────────────────────────────

    @Test
    fun stateTransition_safeToAlarm_showsDismissButton() {
        val state = MutableStateFlow(
            PairedDashboardUiState(
                isPaired = true,
                serverRunning = true,
                alarmState = AlarmState.SAFE
            )
        )
        val vm = mockk<PairedDashboardViewModel>(relaxed = true)
        every { vm.uiState } returns state

        composeRule.setContentWithTheme {
            PairedDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.dismiss_alarm)).assertDoesNotExist()

        state.value = state.value.copy(alarmState = AlarmState.ALARM, distanceToAnchor = 55.0)
        composeRule.waitForIdle()

        composeRule.onNodeWithText("ALARM").assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.dismiss_alarm)).performScrollTo().assertIsDisplayed()
    }

    // ── Disconnect icon click ───────────────────────────────────────────

    @Test
    fun disconnectIconClick_callsShowDisconnectDialog() {
        val vm = viewModel(
            PairedDashboardUiState(isPaired = true, serverRunning = true)
        )

        composeRule.setContentWithTheme {
            PairedDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithContentDescription(string(R.string.paired_disconnect)).performClick()
        verify { vm.showDisconnectDialog() }
    }

    // ── CAUTION does not show dismiss ───────────────────────────────────

    @Test
    fun cautionState_doesNotShowDismissButton() {
        val vm = viewModel(
            PairedDashboardUiState(
                isPaired = true,
                serverRunning = true,
                alarmState = AlarmState.CAUTION,
                distanceToAnchor = 30.0
            )
        )

        composeRule.setContentWithTheme {
            PairedDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText("CAUTION").assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.dismiss_alarm)).assertDoesNotExist()
    }

    // ── Battery with charging ───────────────────────────────────────────

    @Test
    fun batteryCharging_showsPercentage() {
        val vm = viewModel(
            PairedDashboardUiState(
                isPaired = true,
                serverRunning = true,
                batteryLevel = 0.55,
                isCharging = true,
                peerConnected = true
            )
        )

        composeRule.setContentWithTheme {
            PairedDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText("55%").assertIsDisplayed()
    }

    // ── GPS accuracy edge cases ─────────────────────────────────────────

    @Test
    fun gpsAccuracyZero_showsDash() {
        val vm = viewModel(
            PairedDashboardUiState(
                isPaired = true,
                serverRunning = true,
                gpsAccuracy = 0f,
                batteryLevel = 0.50
            )
        )

        composeRule.setContentWithTheme {
            PairedDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        // GPS shows "—" when accuracy is 0; battery set to avoid duplicate "—"
        composeRule.onNodeWithText("—").assertIsDisplayed()
    }

    // ── SOG/COG partial ─────────────────────────────────────────────────

    @Test
    fun sogOnly_showsSogWithoutCog() {
        val vm = viewModel(
            PairedDashboardUiState(
                isPaired = true,
                serverRunning = true,
                sog = 3.5,
                cog = null
            )
        )

        composeRule.setContentWithTheme {
            PairedDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText("3.5 kn").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithText("COG").assertDoesNotExist()
    }

    @Test
    fun cogOnly_showsCogWithoutSog() {
        val vm = viewModel(
            PairedDashboardUiState(
                isPaired = true,
                serverRunning = true,
                sog = null,
                cog = 270.0
            )
        )

        composeRule.setContentWithTheme {
            PairedDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText("270°").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithText("SOG").assertDoesNotExist()
    }

    // ── Additional state transitions ────────────────────────────────────

    @Test
    fun alarmToSafe_hidesDismissButton() {
        val state = MutableStateFlow(
            PairedDashboardUiState(
                isPaired = true,
                serverRunning = true,
                alarmState = AlarmState.ALARM,
                distanceToAnchor = 55.0
            )
        )
        val vm = mockk<PairedDashboardViewModel>(relaxed = true)
        every { vm.uiState } returns state

        composeRule.setContentWithTheme {
            PairedDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.dismiss_alarm)).performScrollTo().assertIsDisplayed()

        state.value = state.value.copy(alarmState = AlarmState.SAFE, distanceToAnchor = 10.0)
        composeRule.waitForIdle()

        composeRule.onNodeWithText("SAFE").assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.dismiss_alarm)).assertDoesNotExist()
    }

    @Test
    fun multipleAlarmTransitions_safeToWarningToAlarm() {
        val state = MutableStateFlow(
            PairedDashboardUiState(
                isPaired = true,
                serverRunning = true,
                alarmState = AlarmState.SAFE,
                distanceToAnchor = 10.0
            )
        )
        val vm = mockk<PairedDashboardViewModel>(relaxed = true)
        every { vm.uiState } returns state

        composeRule.setContentWithTheme {
            PairedDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText("SAFE").assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.dismiss_alarm)).assertDoesNotExist()

        state.value = state.value.copy(alarmState = AlarmState.WARNING, distanceToAnchor = 40.0)
        composeRule.waitForIdle()

        composeRule.onNodeWithText("WARNING").assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.dismiss_alarm)).performScrollTo().assertIsDisplayed()

        state.value = state.value.copy(alarmState = AlarmState.ALARM, distanceToAnchor = 60.0)
        composeRule.waitForIdle()

        composeRule.onNodeWithText("ALARM").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.dismiss_alarm)).performScrollTo().assertIsDisplayed()
    }

    // ── WARNING dismiss click ───────────────────────────────────────────

    @Test
    fun warningState_dismissAlarmButton_callsViewModel() {
        val vm = viewModel(
            PairedDashboardUiState(
                isPaired = true,
                serverRunning = true,
                alarmState = AlarmState.WARNING,
                distanceToAnchor = 45.0
            )
        )

        composeRule.setContentWithTheme {
            PairedDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.dismiss_alarm)).performScrollTo().performClick()
        verify { vm.dismissAlarm() }
    }

    // ── Peer disconnected ───────────────────────────────────────────────

    @Test
    fun peerDisconnected_showsConnectionLost() {
        val vm = viewModel(
            PairedDashboardUiState(
                isPaired = true,
                serverRunning = true,
                peerConnected = false
            )
        )

        composeRule.setContentWithTheme {
            PairedDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.paired_connection_lost)).assertIsDisplayed()
    }

    // ── Distance edge cases ─────────────────────────────────────────────

    @Test
    fun distanceZero_showsZero() {
        val vm = viewModel(
            PairedDashboardUiState(
                isPaired = true,
                serverRunning = true,
                distanceToAnchor = 0.0,
                alarmState = AlarmState.SAFE
            )
        )

        composeRule.setContentWithTheme {
            PairedDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText("0").assertIsDisplayed()
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private fun viewModel(state: PairedDashboardUiState): PairedDashboardViewModel {
        val vm = mockk<PairedDashboardViewModel>(relaxed = true)
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
