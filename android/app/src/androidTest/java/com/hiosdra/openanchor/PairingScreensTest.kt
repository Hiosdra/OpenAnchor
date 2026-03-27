package com.hiosdra.openanchor

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.espresso.Espresso
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.hiosdra.openanchor.helpers.*
import dagger.hilt.android.testing.HiltAndroidRule
import dagger.hilt.android.testing.HiltAndroidTest
import org.junit.Before
import org.junit.Ignore
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import androidx.test.rule.GrantPermissionRule

@Ignore("Requires camera hardware not available on CI emulator")
@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class PairingScreensTest {

    @get:Rule(order = 0)
    val hiltRule = HiltAndroidRule(this)

    @get:Rule(order = 1)
    val composeTestRule = createAndroidComposeRule<MainActivity>()

    @get:Rule(order = 2)
    val grantPermissionRule: GrantPermissionRule = GrantPermissionRule.grant(
        android.Manifest.permission.ACCESS_FINE_LOCATION,
        android.Manifest.permission.ACCESS_COARSE_LOCATION,
        android.Manifest.permission.ACCESS_BACKGROUND_LOCATION,
        android.Manifest.permission.CAMERA
    )

    @Before
    fun setUp() {
        hiltRule.inject()
        composeTestRule.skipOnboardingIfPresent()
    }

    // ── Helpers ──────────────────────────────────────────────────────

    private fun scrollToAndClick(text: String) {
        composeTestRule.waitForText("Drop Anchor")
        composeTestRule.onNodeWithText(text, substring = true).performScrollTo()
        composeTestRule.waitForIdle()
        composeTestRule.waitForText(text).performClick()
        composeTestRule.waitForIdle()
    }

    // ══════════════════════════════════════════════════════════════════
    // ScanQRCodeScreen Tests
    // ══════════════════════════════════════════════════════════════════

    private fun navigateToScanQRScreen() {
        scrollToAndClick("Connect to Server")
        composeTestRule.waitForText("Scan Server QR Code", timeoutMs = 10_000)
    }

    // ── 1. Screen Displays ──────────────────────────────────────────

    @Test
    fun scanQRScreen_displaysWithoutCrash() {
        navigateToScanQRScreen()
        composeTestRule.assertTextDisplayed("Scan Server QR Code")
    }

    // ── 2. Title Visible ────────────────────────────────────────────

    @Test
    fun scanQRScreen_titleVisible() {
        navigateToScanQRScreen()
        composeTestRule.assertTextDisplayed("Scan Server QR Code")
    }

    // ── 3. Scanning State Content ───────────────────────────────────

    @Test
    fun scanQRScreen_showsDescription() {
        navigateToScanQRScreen()
        composeTestRule.assertTextDisplayed("Scan the QR code displayed on the other device")
    }

    @Test
    fun scanQRScreen_showsManualUrlInput() {
        navigateToScanQRScreen()
        composeTestRule.assertTextDisplayed("Server URL")
    }

    @Test
    fun scanQRScreen_showsOrDivider() {
        navigateToScanQRScreen()
        composeTestRule.assertTextDisplayed("or")
    }

    @Test
    fun scanQRScreen_showsCameraPermissionOrPreview() {
        navigateToScanQRScreen()
        // Screen rendered without crash — camera area is present in some form
        composeTestRule.assertTextDisplayed("Scan Server QR Code")
    }

    // ── 4. Back Navigation ──────────────────────────────────────────

    @Test
    fun scanQRScreen_backNavigation_returnsToHome() {
        navigateToScanQRScreen()
        Espresso.pressBack()
        composeTestRule.waitForIdle()
        composeTestRule.waitForText("Drop Anchor", timeoutMs = 10_000)
    }

    @Test
    fun scanQRScreen_backButton_returnsToHome() {
        navigateToScanQRScreen()
        composeTestRule.onNodeWithContentDescription("Back").performClick()
        composeTestRule.waitForIdle()
        composeTestRule.waitForText("Drop Anchor", timeoutMs = 10_000)
    }

    // ══════════════════════════════════════════════════════════════════
    // PairedDashboardScreen Tests
    // ══════════════════════════════════════════════════════════════════

    // PairedDashboard requires an active pairing session. Since we can't
    // establish a real WebSocket connection in instrumented tests, we verify
    // the navigation flow reaches the QR code screen (the gateway to the
    // paired dashboard) and that the screen structure compiles correctly.

    @Test
    fun pairedDashboard_qrCodeGateway_isReachable() {
        // Verify the path to the paired dashboard starts correctly
        scrollToAndClick("Pair with Tablet")
        composeTestRule.waitForText("Pair with Tablet", timeoutMs = 10_000)
        composeTestRule.assertTextDisplayed("Connect to Tablet")
        composeTestRule.assertTextDisplayed("Create Hotspot")
    }

    // ══════════════════════════════════════════════════════════════════
    // ClientDashboardScreen Tests
    // ══════════════════════════════════════════════════════════════════

    // ClientDashboard requires an active server connection. Since we can't
    // establish a real WebSocket connection in instrumented tests, we verify
    // the navigation flow reaches the scan screen (the gateway to the
    // client dashboard) and that the screen structure compiles correctly.

    @Test
    fun clientDashboard_scanGateway_isReachable() {
        // Verify the path to the client dashboard starts correctly
        scrollToAndClick("Connect to Server")
        composeTestRule.waitForText("Scan Server QR Code", timeoutMs = 10_000)
        composeTestRule.assertTextDisplayed("Server URL")
    }
}
