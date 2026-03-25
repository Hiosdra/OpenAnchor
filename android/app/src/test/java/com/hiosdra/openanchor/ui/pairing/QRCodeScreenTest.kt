package com.hiosdra.openanchor.ui.pairing

import androidx.activity.ComponentActivity
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.*
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.hiosdra.openanchor.R
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
class QRCodeScreenTest {

    @get:Rule
    val composeRule = createAndroidComposeRule<ComponentActivity>()

    private fun string(resId: Int, vararg args: Any): String =
        composeRule.activity.getString(resId, *args)

    @Test
    fun idleStep_showsTitleDescriptionAndBothPairingButtons() {
        val viewModel = mockk<QRCodeViewModel>(relaxed = true)
        val state = MutableStateFlow(QRCodeUiState(step = PairingStep.IDLE))
        every { viewModel.uiState } returns state

        composeRule.setContent {
            OpenAnchorTheme {
                QRCodeScreen(onBack = {}, onPaired = {}, viewModel = viewModel)
            }
        }

        composeRule.onNodeWithText(string(R.string.pairing_title)).assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.pairing_description)).assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.pairing_create_hotspot)).assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.pairing_same_network)).assertExists()
        composeRule.onNodeWithText(string(R.string.pairing_hotspot_hint)).assertExists()
        composeRule.onNodeWithText(string(R.string.pairing_network_hint)).assertExists()
        composeRule.onNodeWithText(string(R.string.pairing_or)).assertExists()
    }

    @Test
    fun startingHotspotStep_showsLoadingMessage() {
        val viewModel = mockk<QRCodeViewModel>(relaxed = true)
        val state = MutableStateFlow(QRCodeUiState(step = PairingStep.STARTING_HOTSPOT))
        every { viewModel.uiState } returns state

        composeRule.setContent {
            OpenAnchorTheme {
                QRCodeScreen(onBack = {}, onPaired = {}, viewModel = viewModel)
            }
        }

        composeRule.onNodeWithText(string(R.string.pairing_starting_hotspot)).assertIsDisplayed()
    }

    @Test
    fun hotspotReadyStep_showsLoadingMessage() {
        val viewModel = mockk<QRCodeViewModel>(relaxed = true)
        val state = MutableStateFlow(QRCodeUiState(step = PairingStep.HOTSPOT_READY))
        every { viewModel.uiState } returns state

        composeRule.setContent {
            OpenAnchorTheme {
                QRCodeScreen(onBack = {}, onPaired = {}, viewModel = viewModel)
            }
        }

        composeRule.onNodeWithText(string(R.string.pairing_hotspot_ready)).assertIsDisplayed()
    }

    @Test
    fun startingServerStep_showsLoadingMessage() {
        val viewModel = mockk<QRCodeViewModel>(relaxed = true)
        val state = MutableStateFlow(QRCodeUiState(step = PairingStep.STARTING_SERVER))
        every { viewModel.uiState } returns state

        composeRule.setContent {
            OpenAnchorTheme {
                QRCodeScreen(onBack = {}, onPaired = {}, viewModel = viewModel)
            }
        }

        composeRule.onNodeWithText(string(R.string.pairing_starting_server)).assertIsDisplayed()
    }

    @Test
    fun waitingForClient_showsHotspotConnectionDetails() {
        val viewModel = mockk<QRCodeViewModel>(relaxed = true)
        val state = MutableStateFlow(
            QRCodeUiState(
                step = PairingStep.WAITING_FOR_CLIENT,
                hotspotSsid = "OpenAnchor-Net",
                hotspotPassword = "sail2025",
                wsUrl = "ws://192.168.49.1:8765",
                serverRunning = true,
                useExistingNetwork = false
            )
        )
        every { viewModel.uiState } returns state

        composeRule.setContent {
            OpenAnchorTheme {
                QRCodeScreen(onBack = {}, onPaired = {}, viewModel = viewModel)
            }
        }

        composeRule.onNodeWithText(string(R.string.pairing_scan_qr)).assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.pairing_scan_qr_hint)).assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.pairing_connection_details)).assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.pairing_wifi_name)).assertIsDisplayed()
        composeRule.onNodeWithText("OpenAnchor-Net").assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.pairing_wifi_password)).assertIsDisplayed()
        composeRule.onNodeWithText("sail2025").assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.pairing_ws_url)).assertIsDisplayed()
        composeRule.onNodeWithText("ws://192.168.49.1:8765").assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.pairing_server_status)).assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.pairing_status_running)).assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.pairing_manual_hint)).assertExists()
        composeRule.onNodeWithText(string(R.string.pairing_waiting)).assertExists()
        composeRule.onNodeWithText(string(R.string.pairing_stop)).assertExists()
    }

    @Test
    fun waitingForClient_existingNetwork_hidesHotspotCredentials() {
        val viewModel = mockk<QRCodeViewModel>(relaxed = true)
        val state = MutableStateFlow(
            QRCodeUiState(
                step = PairingStep.WAITING_FOR_CLIENT,
                wsUrl = "ws://10.0.0.5:8765",
                serverRunning = true,
                useExistingNetwork = true
            )
        )
        every { viewModel.uiState } returns state

        composeRule.setContent {
            OpenAnchorTheme {
                QRCodeScreen(onBack = {}, onPaired = {}, viewModel = viewModel)
            }
        }

        composeRule.onNodeWithText("ws://10.0.0.5:8765").assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.pairing_status_running)).assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.pairing_wifi_name)).assertDoesNotExist()
        composeRule.onNodeWithText(string(R.string.pairing_wifi_password)).assertDoesNotExist()
    }

    @Test
    fun waitingForClient_serverStopped_showsStoppedStatus() {
        val viewModel = mockk<QRCodeViewModel>(relaxed = true)
        val state = MutableStateFlow(
            QRCodeUiState(
                step = PairingStep.WAITING_FOR_CLIENT,
                wsUrl = "ws://192.168.1.1:8765",
                serverRunning = false
            )
        )
        every { viewModel.uiState } returns state

        composeRule.setContent {
            OpenAnchorTheme {
                QRCodeScreen(onBack = {}, onPaired = {}, viewModel = viewModel)
            }
        }

        composeRule.onNodeWithText(string(R.string.pairing_status_stopped)).assertIsDisplayed()
    }

    @Test
    fun pairedStep_showsConnectedConfirmation() {
        val viewModel = mockk<QRCodeViewModel>(relaxed = true)
        val state = MutableStateFlow(QRCodeUiState(step = PairingStep.PAIRED))
        every { viewModel.uiState } returns state

        composeRule.setContent {
            OpenAnchorTheme {
                QRCodeScreen(onBack = {}, onPaired = {}, viewModel = viewModel)
            }
        }

        composeRule.onNodeWithText(string(R.string.pairing_connected)).assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.pairing_connected_hint)).assertIsDisplayed()
    }

    @Test
    fun errorStep_showsErrorMessageAndRetryButtons() {
        val viewModel = mockk<QRCodeViewModel>(relaxed = true)
        val state = MutableStateFlow(
            QRCodeUiState(
                step = PairingStep.ERROR,
                errorMessage = "Hotspot failed to start"
            )
        )
        every { viewModel.uiState } returns state

        composeRule.setContent {
            OpenAnchorTheme {
                QRCodeScreen(onBack = {}, onPaired = {}, viewModel = viewModel)
            }
        }

        composeRule.onNodeWithText(string(R.string.pairing_error)).assertIsDisplayed()
        composeRule.onNodeWithText("Hotspot failed to start").assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.pairing_retry_hotspot)).assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.pairing_retry_network)).assertIsDisplayed()
    }

    @Test
    fun stateTransitions_idleToWaitingToErrorToPaired() {
        val viewModel = mockk<QRCodeViewModel>(relaxed = true)
        val state = MutableStateFlow(QRCodeUiState(step = PairingStep.IDLE))
        every { viewModel.uiState } returns state

        composeRule.setContent {
            OpenAnchorTheme {
                QRCodeScreen(onBack = {}, onPaired = {}, viewModel = viewModel)
            }
        }

        composeRule.onNodeWithText(string(R.string.pairing_title)).assertIsDisplayed()

        state.value = QRCodeUiState(
            step = PairingStep.STARTING_HOTSPOT
        )
        composeRule.waitForIdle()
        composeRule.onNodeWithText(string(R.string.pairing_starting_hotspot)).assertIsDisplayed()

        state.value = QRCodeUiState(
            step = PairingStep.WAITING_FOR_CLIENT,
            hotspotSsid = "BoatNet",
            hotspotPassword = "anchor123",
            wsUrl = "ws://192.168.1.10:8080",
            serverRunning = true
        )
        composeRule.waitForIdle()
        composeRule.onNodeWithText("BoatNet").assertIsDisplayed()
        composeRule.onNodeWithText("anchor123").assertIsDisplayed()
        composeRule.onNodeWithText("ws://192.168.1.10:8080").assertIsDisplayed()

        state.value = QRCodeUiState(
            step = PairingStep.ERROR,
            errorMessage = "Connection lost"
        )
        composeRule.waitForIdle()
        composeRule.onNodeWithText("Connection lost").assertIsDisplayed()
        composeRule.onNodeWithText(string(R.string.pairing_retry_hotspot)).assertIsDisplayed()

        state.value = QRCodeUiState(step = PairingStep.PAIRED)
        composeRule.waitForIdle()
        composeRule.onNodeWithText(string(R.string.pairing_connected)).assertIsDisplayed()
    }

    @Test
    fun topBar_showsPairWithTabletTitle() {
        val viewModel = mockk<QRCodeViewModel>(relaxed = true)
        every { viewModel.uiState } returns MutableStateFlow(QRCodeUiState())

        composeRule.setContent {
            OpenAnchorTheme {
                QRCodeScreen(onBack = {}, onPaired = {}, viewModel = viewModel)
            }
        }

        composeRule.onNodeWithText(string(R.string.pair_with_tablet)).assertIsDisplayed()
    }
}
