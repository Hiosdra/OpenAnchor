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
 * Weather screen (Marine Weather) is only accessible from the Monitor screen
 * via onOpenWeather callback, which passes lat/lon coordinates.
 *
 * Since reaching the Monitor screen requires a real GPS-based session,
 * these tests verify:
 * 1. The setup path that precedes weather access works correctly
 * 2. The full wizard flow that leads to the monitoring → weather path
 *
 * Deeper weather UI tests require either:
 * - A mock LocationProvider injected via Hilt to create a real session
 * - Or a TestNavHost that can navigate directly to weather/{lat}/{lon}
 */
@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class WeatherScreenTest {

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

    // --- 1. Home Screen Loads (prerequisite for all weather paths) ---

    @Test
    fun homeScreen_loadsSuccessfully() {
        composeTestRule.waitForText("Drop Anchor", timeoutMs = 10_000)
        composeTestRule.assertTextDisplayed("OpenAnchor")
    }

    // --- 2. Setup Flow (the path to monitoring → weather) ---

    @Test
    fun setupScreen_isReachableForMonitorPrerequisite() {
        composeTestRule.waitForText("Drop Anchor", timeoutMs = 10_000).performClick()
        composeTestRule.waitForText("Anchor Position")
        composeTestRule.assertTextDisplayed("Anchor Position")
    }

    @Test
    fun setupWizard_canReachRadiusStep() {
        composeTestRule.waitForText("Drop Anchor").performClick()
        composeTestRule.waitForText("Anchor Position")
        composeTestRule.onNodeWithText("Next").performClick()
        composeTestRule.waitForText("Choose Safe Zone Type")
        composeTestRule.onNodeWithText("Simple Circle").performClick()
        composeTestRule.onNodeWithText("Next").performClick()
        composeTestRule.waitForText("Set Safe Radius")
    }

    @Test
    fun setupWizard_dropAnchorButtonVisible() {
        composeTestRule.waitForText("Drop Anchor").performClick()
        composeTestRule.waitForText("Anchor Position")
        composeTestRule.onNodeWithText("Next").performClick()
        composeTestRule.waitForText("Choose Safe Zone Type")
        composeTestRule.onNodeWithText("Simple Circle").performClick()
        composeTestRule.onNodeWithText("Next").performClick()
        composeTestRule.waitForText("Set Safe Radius")
        composeTestRule.scrollToText("Drop Anchor").assertIsDisplayed()
    }

    // --- 3. Back Navigation From Setup ---

    @Test
    fun setupScreen_backReturnsToHome() {
        composeTestRule.waitForText("Drop Anchor").performClick()
        composeTestRule.waitForText("Anchor Position")
        Espresso.pressBack()
        composeTestRule.waitForText("Drop Anchor")
        composeTestRule.assertTextDisplayed("OpenAnchor")
    }

    @Test
    fun homeScreen_noWeatherButtonWithoutActiveSession() {
        composeTestRule.waitForText("Drop Anchor")
        composeTestRule.onNodeWithText("Marine Weather").assertDoesNotExist()
    }
}
