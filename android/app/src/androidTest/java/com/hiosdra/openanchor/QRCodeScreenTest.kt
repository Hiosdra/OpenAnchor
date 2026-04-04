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
class QRCodeScreenTest {

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
        navigateToQRCodeScreen()
    }

    // ── Helpers ──────────────────────────────────────────────────────

    private fun scrollToAndClick(text: String) {
        composeTestRule.scrollToText(text)
        composeTestRule.waitForIdle()
        composeTestRule.waitForText(text).performClick()
        composeTestRule.waitForIdle()
    }

    private fun navigateToQRCodeScreen() {
        scrollToAndClick("Pair with Tablet")
        composeTestRule.waitForText("Pair with Tablet", timeoutMs = 10_000)
    }

    // ── 1. Screen Displays ──────────────────────────────────────────

    @Test
    fun qrCodeScreen_displaysWithoutCrash() {
        composeTestRule.assertTextDisplayed("Pair with Tablet")
    }

    // ── 2. Title Visible ────────────────────────────────────────────

    @Test
    fun qrCodeScreen_titleVisible() {
        // TopAppBar title
        composeTestRule.assertTextDisplayed("Pair with Tablet")
        // Idle state title
        composeTestRule.assertTextDisplayed("Connect to Tablet")
    }

    // ── 3. Idle State Content ───────────────────────────────────────

    @Test
    fun qrCodeScreen_idleState_showsPairingDescription() {
        composeTestRule.assertTextDisplayed("Pair your phone with the tablet")
    }

    @Test
    fun qrCodeScreen_idleState_showsHotspotButton() {
        composeTestRule.assertTextDisplayed("Create Hotspot")
    }

    @Test
    fun qrCodeScreen_idleState_showsSameNetworkButton() {
        composeTestRule.assertTextDisplayed("Use Same Network")
    }

    @Test
    fun qrCodeScreen_idleState_showsOrDivider() {
        composeTestRule.assertTextDisplayed("or")
    }

    // ── 4. Back Navigation ──────────────────────────────────────────

    @Test
    fun qrCodeScreen_backNavigation_returnsToHome() {
        Espresso.pressBack()
        composeTestRule.waitForIdle()
        composeTestRule.waitForText("Drop Anchor", timeoutMs = 10_000)
    }

    @Test
    fun qrCodeScreen_backButton_returnsToHome() {
        composeTestRule.onNodeWithContentDescription("Cancel").performClick()
        composeTestRule.waitForIdle()
        composeTestRule.waitForText("Drop Anchor", timeoutMs = 10_000)
    }
}
