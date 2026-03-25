package com.hiosdra.openanchor.ui.client

import androidx.activity.ComponentActivity

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.AndroidComposeTestRule
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.hiosdra.openanchor.R
import com.hiosdra.openanchor.domain.model.AlarmState
import com.hiosdra.openanchor.ui.sampleServerGpsReport
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
class ClientDashboardScreenTest {

    @get:Rule
    val composeRule = createAndroidComposeRule<ComponentActivity>()

    // ── Default (disconnected) ──────────────────────────────────────────

    @Test
    fun defaultState_showsSafeAndDisconnected() {
        val vm = viewModel(ClientDashboardUiState())

        composeRule.setContentWithTheme {
            ClientDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText("SAFE").assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.paired_connection_lost)).assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.client_dashboard_title)).assertIsDisplayed()
    }

    // ── Connected state ─────────────────────────────────────────────────

    @Test
    fun connectedState_showsConnectedLabel() {
        val vm = viewModel(
            ClientDashboardUiState(
                isConnected = true,
                alarmState = AlarmState.SAFE,
                distanceToAnchor = 20.0,
                gpsAccuracy = 5f
            )
        )

        composeRule.setContentWithTheme {
            ClientDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.paired_connection_ok)).assertIsDisplayed()
        composeRule.onNodeWithText("±5 m").assertIsDisplayed()
    }

    // ── Alarm states ────────────────────────────────────────────────────

    @Test
    fun warningState_showsAlarmControls() {
        val vm = viewModel(
            ClientDashboardUiState(
                isConnected = true,
                alarmState = AlarmState.WARNING,
                distanceToAnchor = 42.0
            )
        )

        composeRule.setContentWithTheme {
            ClientDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText("WARNING").assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.dismiss)).assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.dismiss_alarm)).assertIsDisplayed()
    }

    @Test
    fun alarmState_showsAlarmControls() {
        val vm = viewModel(
            ClientDashboardUiState(
                isConnected = true,
                alarmState = AlarmState.ALARM,
                distanceToAnchor = 65.0
            )
        )

        composeRule.setContentWithTheme {
            ClientDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText("ALARM").assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.dismiss)).assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.dismiss_alarm)).assertIsDisplayed()
    }

    @Test
    fun cautionState_showsCautionLabel() {
        val vm = viewModel(
            ClientDashboardUiState(
                isConnected = true,
                alarmState = AlarmState.CAUTION,
                distanceToAnchor = 30.0
            )
        )

        composeRule.setContentWithTheme {
            ClientDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText("CAUTION").assertIsDisplayed()
    }

    @Test
    fun safeState_showsSafeLabel() {
        val vm = viewModel(
            ClientDashboardUiState(
                isConnected = true,
                alarmState = AlarmState.SAFE,
                distanceToAnchor = 10.0
            )
        )

        composeRule.setContentWithTheme {
            ClientDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText("SAFE").assertIsDisplayed()
    }

    @Test
    fun muteButton_callsViewModel() {
        val vm = viewModel(
            ClientDashboardUiState(
                isConnected = true,
                alarmState = AlarmState.ALARM,
                distanceToAnchor = 60.0
            )
        )

        composeRule.setContentWithTheme {
            ClientDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.dismiss)).performClick()
        verify { vm.muteAlarm() }
    }

    @Test
    fun dismissAlarmButton_callsViewModel() {
        val vm = viewModel(
            ClientDashboardUiState(
                isConnected = true,
                alarmState = AlarmState.ALARM,
                distanceToAnchor = 60.0
            )
        )

        composeRule.setContentWithTheme {
            ClientDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.dismiss_alarm)).performClick()
        verify { vm.dismissAlarm() }
    }

    // ── Telemetry cards ─────────────────────────────────────────────────

    @Test
    fun telemetry_showsSogValue() {
        val vm = viewModel(
            ClientDashboardUiState(
                isConnected = true,
                sog = 1.4,
                localBatteryLevel = 50
            )
        )

        composeRule.setContentWithTheme {
            ClientDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText("1.4 kn").assertIsDisplayed()
    }

    @Test
    fun telemetry_sogAndBatteryNull_showsDashes() {
        val vm = viewModel(
            ClientDashboardUiState(
                isConnected = true,
                sog = null,
                localBatteryLevel = -1
            )
        )

        composeRule.setContentWithTheme {
            ClientDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        // Both SOG and battery show "--" when no data
        assert(composeRule.onAllNodesWithText("--").fetchSemanticsNodes().size >= 2)
    }

    @Test
    fun telemetry_batteryLevel_showsPercentage() {
        val vm = viewModel(
            ClientDashboardUiState(
                isConnected = true,
                localBatteryLevel = 82,
                localBatteryCharging = true
            )
        )

        composeRule.setContentWithTheme {
            ClientDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText("82%").assertIsDisplayed()
    }

    // ── Server GPS report ───────────────────────────────────────────────

    @Test
    fun serverGpsReport_showsCard() {
        val vm = viewModel(
            ClientDashboardUiState(
                isConnected = true,
                serverGpsReport = sampleServerGpsReport()
            )
        )

        composeRule.setContentWithTheme {
            ClientDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.client_server_gps)).performScrollTo().assertIsDisplayed()
    }

    @Test
    fun serverGpsReport_showsPeerBattery() {
        val vm = viewModel(
            ClientDashboardUiState(
                isConnected = true,
                serverGpsReport = sampleServerGpsReport()
            )
        )

        composeRule.setContentWithTheme {
            ClientDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.peer_battery, 87)).performScrollTo().assertIsDisplayed()
    }

    @Test
    fun noServerGpsReport_hidesCard() {
        val vm = viewModel(
            ClientDashboardUiState(
                isConnected = true,
                serverGpsReport = null
            )
        )

        composeRule.setContentWithTheme {
            ClientDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.client_server_gps)).assertDoesNotExist()
    }

    // ── Drift warning ───────────────────────────────────────────────────

    @Test
    fun driftDetected_showsDriftWarning() {
        val vm = viewModel(
            ClientDashboardUiState(
                isConnected = true,
                serverDriftDetected = true,
                serverGpsReport = sampleServerGpsReport()
            )
        )

        composeRule.setContentWithTheme {
            ClientDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.drift_warning)).performScrollTo().assertIsDisplayed()
    }

    @Test
    fun noDrift_hidesDriftWarning() {
        val vm = viewModel(
            ClientDashboardUiState(
                isConnected = true,
                serverDriftDetected = false
            )
        )

        composeRule.setContentWithTheme {
            ClientDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.drift_warning)).assertDoesNotExist()
    }

    // ── Disconnect dialog ───────────────────────────────────────────────

    @Test
    fun disconnectDialog_showsTitleAndMessage() {
        val vm = viewModel(
            ClientDashboardUiState(
                isConnected = true,
                showDisconnectDialog = true
            )
        )

        composeRule.setContentWithTheme {
            ClientDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.client_disconnect_title)).assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.client_disconnect_message)).assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.paired_disconnect)).assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.cancel)).assertIsDisplayed()
    }

    @Test
    fun disconnectDialog_cancel_callsHide() {
        val vm = viewModel(
            ClientDashboardUiState(
                isConnected = true,
                showDisconnectDialog = true
            )
        )

        composeRule.setContentWithTheme {
            ClientDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.cancel)).performClick()
        verify { vm.hideDisconnectDialog() }
    }

    @Test
    fun disconnectDialog_confirm_callsDisconnect() {
        var disconnectedCalled = false
        val vm = viewModel(
            ClientDashboardUiState(
                isConnected = true,
                showDisconnectDialog = true
            )
        )

        composeRule.setContentWithTheme {
            ClientDashboardScreen(
                onDisconnected = { disconnectedCalled = true },
                viewModel = vm
            )
        }

        composeRule.onNodeWithText(string(R.string.paired_disconnect)).performClick()
        verify { vm.disconnect() }
        assert(disconnectedCalled)
    }

    @Test
    fun disconnectDialog_hidden_doesNotShowDialogContent() {
        val vm = viewModel(
            ClientDashboardUiState(
                isConnected = true,
                showDisconnectDialog = false
            )
        )

        composeRule.setContentWithTheme {
            ClientDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.client_disconnect_title)).assertDoesNotExist()
    }

    // ── State transitions ───────────────────────────────────────────────

    @Test
    fun stateTransition_safeToWarning_showsAlarmControls() {
        val state = MutableStateFlow(
            ClientDashboardUiState(
                isConnected = true,
                alarmState = AlarmState.SAFE,
                distanceToAnchor = 10.0
            )
        )
        val vm = mockk<ClientDashboardViewModel>(relaxed = true)
        every { vm.uiState } returns state

        composeRule.setContentWithTheme {
            ClientDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText("SAFE").assertIsDisplayed()

        state.value = state.value.copy(
            alarmState = AlarmState.WARNING,
            distanceToAnchor = 42.0
        )
        composeRule.waitForIdle()

        composeRule.onNodeWithText("WARNING").assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.dismiss_alarm)).assertIsDisplayed()
    }

    @Test
    fun stateTransition_driftAppears() {
        val state = MutableStateFlow(
            ClientDashboardUiState(
                isConnected = true,
                serverDriftDetected = false
            )
        )
        val vm = mockk<ClientDashboardViewModel>(relaxed = true)
        every { vm.uiState } returns state

        composeRule.setContentWithTheme {
            ClientDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.drift_warning)).assertDoesNotExist()

        state.value = state.value.copy(
            serverDriftDetected = true,
            serverGpsReport = sampleServerGpsReport()
        )
        composeRule.waitForIdle()

        composeRule.onNodeWithText(string(R.string.drift_warning)).performScrollTo().assertIsDisplayed()
    }

    @Test
    fun distanceToAnchor_showsFormattedValue() {
        val vm = viewModel(
            ClientDashboardUiState(
                isConnected = true,
                distanceToAnchor = 42.0,
                alarmState = AlarmState.SAFE
            )
        )

        composeRule.setContentWithTheme {
            ClientDashboardScreen(onDisconnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText("42 m").assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.paired_distance)).assertIsDisplayed()
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private fun viewModel(state: ClientDashboardUiState): ClientDashboardViewModel {
        val vm = mockk<ClientDashboardViewModel>(relaxed = true)
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
