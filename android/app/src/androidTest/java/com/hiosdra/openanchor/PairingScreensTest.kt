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

/**
 * Camera-dependent pairing tests. These navigate to the ScanQRCodeScreen
 * ("Connect to Server") which initializes CameraX for QR scanning.
 * Requires camera hardware not available on CI emulators.
 *
 * Non-camera tests are in PairingNavigationTest.
 */
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

    private fun navigateToScanQRScreen() {
        composeTestRule.navigateFromHome("Connect to Server")
        composeTestRule.waitForText("Scan Server QR Code", timeoutMs = 10_000)
    }

    // ══════════════════════════════════════════════════════════════════
    // ScanQRCodeScreen Tests (camera required)
    // ══════════════════════════════════════════════════════════════════

    @Test
    fun scanQRScreen_displaysWithoutCrash() {
        navigateToScanQRScreen()
        composeTestRule.assertTextDisplayed("Scan Server QR Code")
    }

    @Test
    fun scanQRScreen_titleVisible() {
        navigateToScanQRScreen()
        composeTestRule.assertTextDisplayed("Scan Server QR Code")
    }

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
}
