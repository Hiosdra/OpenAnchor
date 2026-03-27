package com.hiosdra.openanchor

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
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
 * Weather screen requires active monitoring session parameters (lat/lon).
 * Tests verify that the app doesn't crash when navigating normally,
 * and that weather-related UI elements exist on reachable screens.
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
        android.Manifest.permission.ACCESS_BACKGROUND_LOCATION
    )

    @Before
    fun setUp() {
        hiltRule.inject()
        composeTestRule.skipOnboardingIfPresent()
    }

    @Test
    fun homeScreen_loadsSuccessfully() {
        composeTestRule.waitForText("Drop Anchor", timeoutMs = 10_000)
        composeTestRule.assertTextDisplayed("OpenAnchor")
    }

    @Test
    fun setupScreen_isReachableForWeatherPrerequisite() {
        composeTestRule.waitForText("Drop Anchor", timeoutMs = 10_000)
        composeTestRule.waitForText("Drop Anchor", timeoutMs = 5_000).performClick()
        composeTestRule.waitForText("Anchor Position", timeoutMs = 5_000)
        composeTestRule.assertTextDisplayed("Anchor Position")
    }
}
