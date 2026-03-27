package com.hiosdra.openanchor.ui.client

import androidx.activity.ComponentActivity

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.*
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
class ScanQRCodeScreenTest {

    @get:Rule
    val composeRule = createAndroidComposeRule<ComponentActivity>()

    // ── Scanning step ───────────────────────────────────────────────────

    @Test
    fun scanningStep_showsTitleAndDescription() {
        val vm = viewModel(ScanQRCodeUiState(step = ScanStep.SCANNING))

        composeRule.setContentWithTheme {
            ScanQRCodeScreen(onBack = {}, onConnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.client_scan_title)).assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.client_scan_description)).assertIsDisplayed()
    }

    @Test
    fun scanningStep_showsOrDivider() {
        val vm = viewModel(ScanQRCodeUiState(step = ScanStep.SCANNING))

        composeRule.setContentWithTheme {
            ScanQRCodeScreen(onBack = {}, onConnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.pairing_or)).assertIsDisplayed()
    }

    // ── Scanned step ────────────────────────────────────────────────────

    @Test
    fun scannedStep_showsUrlAndConnectButton() {
        val vm = viewModel(
            ScanQRCodeUiState(
                step = ScanStep.SCANNED,
                scannedUrl = "ws://192.168.1.10:8080"
            )
        )

        composeRule.setContentWithTheme {
            ScanQRCodeScreen(onBack = {}, onConnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.client_scanned_title)).assertIsDisplayed()
        composeRule.onNodeWithText("ws://192.168.1.10:8080").assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.client_connect)).assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.client_rescan)).assertIsDisplayed()
    }

    @Test
    fun scannedStep_withSsidAndPassword_showsWifiDetails() {
        val vm = viewModel(
            ScanQRCodeUiState(
                step = ScanStep.SCANNED,
                scannedUrl = "ws://192.168.1.10:8080",
                serverSsid = "BoatNet",
                serverPassword = "anchor123"
            )
        )

        composeRule.setContentWithTheme {
            ScanQRCodeScreen(onBack = {}, onConnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText("BoatNet").assertIsDisplayed()
        composeRule.onNodeWithText("anchor123").assertIsDisplayed()
    }

    @Test
    fun scannedStep_withoutSsid_hidesWifiHint() {
        val vm = viewModel(
            ScanQRCodeUiState(
                step = ScanStep.SCANNED,
                scannedUrl = "ws://192.168.1.10:8080",
                serverSsid = null,
                serverPassword = null
            )
        )

        composeRule.setContentWithTheme {
            ScanQRCodeScreen(onBack = {}, onConnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.client_connect_wifi_hint)).assertDoesNotExist()
    }

    @Test
    fun scannedStep_connectButton_callsViewModel() {
        val vm = viewModel(
            ScanQRCodeUiState(
                step = ScanStep.SCANNED,
                scannedUrl = "ws://192.168.1.10:8080"
            )
        )

        composeRule.setContentWithTheme {
            ScanQRCodeScreen(onBack = {}, onConnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.client_connect)).performClick()
        verify { vm.connectToServer() }
    }

    @Test
    fun scannedStep_rescanButton_callsResetToScanning() {
        val vm = viewModel(
            ScanQRCodeUiState(
                step = ScanStep.SCANNED,
                scannedUrl = "ws://192.168.1.10:8080"
            )
        )

        composeRule.setContentWithTheme {
            ScanQRCodeScreen(onBack = {}, onConnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.client_rescan)).performClick()
        verify { vm.resetToScanning() }
    }

    // ── Connecting step ─────────────────────────────────────────────────

    @Test
    fun connectingStep_showsProgressAndUrl() {
        val vm = viewModel(
            ScanQRCodeUiState(
                step = ScanStep.CONNECTING,
                scannedUrl = "ws://192.168.1.10:8080",
                isConnecting = true
            )
        )

        composeRule.setContentWithTheme {
            ScanQRCodeScreen(onBack = {}, onConnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.client_connecting)).assertIsDisplayed()
        composeRule.onNodeWithText("ws://192.168.1.10:8080").assertIsDisplayed()
    }

    // ── Connected step ──────────────────────────────────────────────────

    @Test
    fun connectedStep_showsSuccessMessage() {
        val vm = viewModel(
            ScanQRCodeUiState(
                step = ScanStep.CONNECTED,
                isConnected = true
            )
        )

        composeRule.setContentWithTheme {
            ScanQRCodeScreen(onBack = {}, onConnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.client_connected)).assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.client_connected_hint)).assertIsDisplayed()
    }

    // ── Error step ──────────────────────────────────────────────────────

    @Test
    fun errorStep_showsErrorMessageAndRetryButton() {
        val vm = viewModel(
            ScanQRCodeUiState(
                step = ScanStep.ERROR,
                errorMessage = "Connection refused"
            )
        )

        composeRule.setContentWithTheme {
            ScanQRCodeScreen(onBack = {}, onConnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.pairing_error)).assertIsDisplayed()
        composeRule.onNodeWithText("Connection refused").assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.client_retry)).assertIsDisplayed()
    }

    @Test
    fun errorStep_retryButton_callsResetToScanning() {
        val vm = viewModel(
            ScanQRCodeUiState(
                step = ScanStep.ERROR,
                errorMessage = "Timeout"
            )
        )

        composeRule.setContentWithTheme {
            ScanQRCodeScreen(onBack = {}, onConnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.client_retry)).performClick()
        verify { vm.resetToScanning() }
    }

    @Test
    fun errorStep_nullMessage_showsUnknownError() {
        val vm = viewModel(
            ScanQRCodeUiState(
                step = ScanStep.ERROR,
                errorMessage = null
            )
        )

        composeRule.setContentWithTheme {
            ScanQRCodeScreen(onBack = {}, onConnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText("Unknown error").assertIsDisplayed()
    }

    // ── State transitions ───────────────────────────────────────────────

    @Test
    fun stateTransition_scanningToConnecting() {
        val state = MutableStateFlow(ScanQRCodeUiState(step = ScanStep.SCANNING))
        val vm = mockk<ScanQRCodeViewModel>(relaxed = true)
        every { vm.uiState } returns state

        composeRule.setContentWithTheme {
            ScanQRCodeScreen(onBack = {}, onConnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.client_scan_description)).assertIsDisplayed()

        state.value = ScanQRCodeUiState(
            step = ScanStep.CONNECTING,
            scannedUrl = "ws://10.0.0.1:8080",
            isConnecting = true
        )
        composeRule.waitForIdle()

        composeRule.onNodeWithText(string(R.string.client_connecting)).assertIsDisplayed()
        composeRule.onNodeWithText("ws://10.0.0.1:8080").assertIsDisplayed()
    }

    @Test
    fun stateTransition_connectingToError() {
        val state = MutableStateFlow(
            ScanQRCodeUiState(
                step = ScanStep.CONNECTING,
                scannedUrl = "ws://10.0.0.1:8080",
                isConnecting = true
            )
        )
        val vm = mockk<ScanQRCodeViewModel>(relaxed = true)
        every { vm.uiState } returns state

        composeRule.setContentWithTheme {
            ScanQRCodeScreen(onBack = {}, onConnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.client_connecting)).assertIsDisplayed()

        state.value = ScanQRCodeUiState(
            step = ScanStep.ERROR,
            errorMessage = "Server unreachable"
        )
        composeRule.waitForIdle()

        composeRule.onNodeWithText("Server unreachable").assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.client_retry)).assertIsDisplayed()
    }

    @Test
    fun stateTransition_scannedToConnected() {
        val state = MutableStateFlow(
            ScanQRCodeUiState(
                step = ScanStep.SCANNED,
                scannedUrl = "ws://192.168.1.10:8080"
            )
        )
        val vm = mockk<ScanQRCodeViewModel>(relaxed = true)
        every { vm.uiState } returns state

        composeRule.setContentWithTheme {
            ScanQRCodeScreen(onBack = {}, onConnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.client_scanned_title)).assertIsDisplayed()

        state.value = ScanQRCodeUiState(step = ScanStep.CONNECTED, isConnected = true)
        composeRule.waitForIdle()

        composeRule.onNodeWithText(string(R.string.client_connected)).assertIsDisplayed()
    }

    // ── Back button ─────────────────────────────────────────────────────

    @Test
    fun backButton_callsCancelAndOnBack() {
        var backCalled = false
        val vm = viewModel(ScanQRCodeUiState(step = ScanStep.SCANNING))

        composeRule.setContentWithTheme {
            ScanQRCodeScreen(
                onBack = { backCalled = true },
                onConnected = {},
                viewModel = vm
            )
        }

        composeRule.onNodeWithContentDescription("Back").performClick()
        verify { vm.cancelConnection() }
        assert(backCalled) { "onBack should have been called" }
    }

    // ── Scanning step details ───────────────────────────────────────────

    @Test
    fun scanningStep_showsManualUrlLabel() {
        val vm = viewModel(ScanQRCodeUiState(step = ScanStep.SCANNING))

        composeRule.setContentWithTheme {
            ScanQRCodeScreen(onBack = {}, onConnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.client_manual_url)).assertExists()
    }

    // ── Scanned step labels ─────────────────────────────────────────────

    @Test
    fun scannedStep_showsWsUrlLabel() {
        val vm = viewModel(
            ScanQRCodeUiState(
                step = ScanStep.SCANNED,
                scannedUrl = "ws://192.168.1.10:8080"
            )
        )

        composeRule.setContentWithTheme {
            ScanQRCodeScreen(onBack = {}, onConnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.pairing_ws_url)).assertIsDisplayed()
    }

    @Test
    fun scannedStep_showsWifiNameLabel() {
        val vm = viewModel(
            ScanQRCodeUiState(
                step = ScanStep.SCANNED,
                scannedUrl = "ws://192.168.1.10:8080",
                serverSsid = "BoatNet",
                serverPassword = "secret"
            )
        )

        composeRule.setContentWithTheme {
            ScanQRCodeScreen(onBack = {}, onConnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.pairing_wifi_name)).assertIsDisplayed()
    }

    @Test
    fun scannedStep_showsWifiPasswordLabel() {
        val vm = viewModel(
            ScanQRCodeUiState(
                step = ScanStep.SCANNED,
                scannedUrl = "ws://192.168.1.10:8080",
                serverSsid = "BoatNet",
                serverPassword = "secret"
            )
        )

        composeRule.setContentWithTheme {
            ScanQRCodeScreen(onBack = {}, onConnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.pairing_wifi_password)).assertIsDisplayed()
    }

    @Test
    fun scannedStep_withSsid_showsWifiHint() {
        val vm = viewModel(
            ScanQRCodeUiState(
                step = ScanStep.SCANNED,
                scannedUrl = "ws://192.168.1.10:8080",
                serverSsid = "BoatNet"
            )
        )

        composeRule.setContentWithTheme {
            ScanQRCodeScreen(onBack = {}, onConnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.client_connect_wifi_hint)).assertIsDisplayed()
    }

    @Test
    fun scannedStep_withoutPassword_hidesPasswordLabel() {
        val vm = viewModel(
            ScanQRCodeUiState(
                step = ScanStep.SCANNED,
                scannedUrl = "ws://192.168.1.10:8080",
                serverSsid = null,
                serverPassword = null
            )
        )

        composeRule.setContentWithTheme {
            ScanQRCodeScreen(onBack = {}, onConnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.pairing_wifi_password)).assertDoesNotExist()
        composeRule.onNodeWithText(string(R.string.pairing_wifi_name)).assertDoesNotExist()
    }

    // ── Error step details ──────────────────────────────────────────────

    @Test
    fun errorStep_showsErrorTitle() {
        val vm = viewModel(
            ScanQRCodeUiState(
                step = ScanStep.ERROR,
                errorMessage = "Network issue"
            )
        )

        composeRule.setContentWithTheme {
            ScanQRCodeScreen(onBack = {}, onConnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.pairing_error)).assertIsDisplayed()
        composeRule.onNodeWithText("Network issue").assertIsDisplayed()
    }

    // ── Additional state transitions ────────────────────────────────────

    @Test
    fun stateTransition_errorToScanning() {
        val state = MutableStateFlow(
            ScanQRCodeUiState(
                step = ScanStep.ERROR,
                errorMessage = "Failed"
            )
        )
        val vm = mockk<ScanQRCodeViewModel>(relaxed = true)
        every { vm.uiState } returns state

        composeRule.setContentWithTheme {
            ScanQRCodeScreen(onBack = {}, onConnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText("Failed").assertIsDisplayed()

        state.value = ScanQRCodeUiState(step = ScanStep.SCANNING)
        composeRule.waitForIdle()

        composeRule.onNodeWithText(string(R.string.client_scan_description)).assertIsDisplayed()
    }

    @Test
    fun stateTransition_scanningToScanned() {
        val state = MutableStateFlow(ScanQRCodeUiState(step = ScanStep.SCANNING))
        val vm = mockk<ScanQRCodeViewModel>(relaxed = true)
        every { vm.uiState } returns state

        composeRule.setContentWithTheme {
            ScanQRCodeScreen(onBack = {}, onConnected = {}, viewModel = vm)
        }

        composeRule.onNodeWithText(string(R.string.client_scan_description)).assertIsDisplayed()

        state.value = ScanQRCodeUiState(
            step = ScanStep.SCANNED,
            scannedUrl = "ws://10.0.0.5:8080",
            serverSsid = "TestWifi"
        )
        composeRule.waitForIdle()

        composeRule.onNodeWithText(string(R.string.client_scanned_title)).assertIsDisplayed()
        composeRule.onNodeWithText("ws://10.0.0.5:8080").assertIsDisplayed()
        composeRule.onNodeWithText("TestWifi").assertIsDisplayed()
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private fun viewModel(state: ScanQRCodeUiState): ScanQRCodeViewModel {
        val vm = mockk<ScanQRCodeViewModel>(relaxed = true)
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
