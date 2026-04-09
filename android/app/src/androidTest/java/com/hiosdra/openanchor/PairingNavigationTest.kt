package com.hiosdra.openanchor

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.espresso.Espresso
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.hiosdra.openanchor.helpers.*
import dagger.hilt.android.testing.HiltAndroidRule
import dagger.hilt.android.testing.HiltAndroidTest
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import androidx.test.rule.GrantPermissionRule

/**
 * Tests for pairing navigation flows that do NOT require camera hardware.
 * These tests verify the QR code generation screen (Pair with Tablet)
 * which only generates/displays QR codes — no camera needed.
 *
 * Camera-dependent tests (ScanQRCodeScreen) remain in PairingScreensTest
 * with @Ignore.
 */
@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class PairingNavigationTest {

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

    // ── QR Code Generation Screen (Pair with Tablet) ────────────────

    @Test
    fun pairWithTablet_isReachable() {
        composeTestRule.navigateFromHome("Pair with Tablet")
        composeTestRule.waitForText("Pair with Tablet", timeoutMs = 10_000)
    }

    @Test
    fun pairWithTablet_showsConnectToTabletTitle() {
        composeTestRule.navigateFromHome("Pair with Tablet")
        composeTestRule.assertTextDisplayed("Connect to Tablet")
    }

    @Test
    fun pairWithTablet_showsCreateHotspotButton() {
        composeTestRule.navigateFromHome("Pair with Tablet")
        composeTestRule.waitForText("Pair with Tablet", timeoutMs = 10_000)
        composeTestRule.assertTextDisplayed("Create Hotspot")
    }

    @Test
    fun pairWithTablet_showsUseSameNetworkButton() {
        composeTestRule.navigateFromHome("Pair with Tablet")
        composeTestRule.waitForText("Pair with Tablet", timeoutMs = 10_000)
        composeTestRule.assertTextDisplayed("Use Same Network")
    }

    @Test
    fun pairWithTablet_showsPairingDescription() {
        composeTestRule.navigateFromHome("Pair with Tablet")
        composeTestRule.waitForText("Pair with Tablet", timeoutMs = 10_000)
        composeTestRule.assertTextDisplayed("Pair your phone with the tablet")
    }

    @Test
    fun pairWithTablet_backNavigation_returnsToHome() {
        composeTestRule.navigateFromHome("Pair with Tablet")
        composeTestRule.waitForText("Pair with Tablet", timeoutMs = 10_000)
        Espresso.pressBack()
        composeTestRule.waitForIdle()
        composeTestRule.waitForText("Drop Anchor", timeoutMs = 10_000)
    }

    @Test
    fun pairWithTablet_cancelButton_returnsToHome() {
        composeTestRule.navigateFromHome("Pair with Tablet")
        composeTestRule.waitForText("Pair with Tablet", timeoutMs = 10_000)
        composeTestRule.onNodeWithContentDescription("Cancel").performClick()
        composeTestRule.waitForIdle()
        composeTestRule.waitForText("Drop Anchor", timeoutMs = 10_000)
    }

    // ── Home Screen Pairing Buttons Visible ──────────────────────────

    @Test
    fun homeScreen_pairWithTabletButtonVisible() {
        composeTestRule.scrollToText("Pair with Tablet").assertIsDisplayed()
    }

    @Test
    fun homeScreen_connectToServerButtonVisible() {
        composeTestRule.scrollToText("Connect to Server").assertIsDisplayed()
    }
}
