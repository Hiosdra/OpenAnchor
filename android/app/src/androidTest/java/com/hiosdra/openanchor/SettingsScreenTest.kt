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

@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class SettingsScreenTest {

    @get:Rule(order = 0)
    val hiltRule = HiltAndroidRule(this)

    @get:Rule(order = 1)
    val composeTestRule = createAndroidComposeRule<MainActivity>()

    @get:Rule(order = 2)
    val grantPermissionRule: GrantPermissionRule = GrantPermissionRule.grant(
        android.Manifest.permission.ACCESS_FINE_LOCATION,
        android.Manifest.permission.ACCESS_COARSE_LOCATION
    )

    @Before
    fun setUp() {
        hiltRule.inject()
        navigateToSettings()
    }

    private fun navigateToSettings() {
        composeTestRule.waitForText("OpenAnchor")
        composeTestRule.onNodeWithContentDescription("Settings").performClick()
        composeTestRule.waitForText("Settings")
    }

    @Test
    fun settingsScreen_displaysTitle() {
        composeTestRule.assertTextDisplayed("Settings")
    }

    @Test
    fun settingsScreen_displaysDistanceUnit() {
        composeTestRule.assertTextDisplayed("Distance unit")
    }

    @Test
    fun settingsScreen_displaysDepthUnit() {
        composeTestRule.assertTextDisplayed("Depth unit")
    }

    @Test
    fun settingsScreen_displaysLanguageOption() {
        composeTestRule.onNodeWithText("Language").performScrollTo()
        composeTestRule.assertTextDisplayed("Language")
        composeTestRule.assertTextDisplayed("English")
        composeTestRule.assertTextDisplayed("Polski")
    }

    @Test
    fun settingsScreen_displaysNightFilter() {
        composeTestRule.onNodeWithText("Red Night Filter").performScrollTo()
        composeTestRule.assertTextDisplayed("Red Night Filter")
        composeTestRule.assertTextDisplayed("Enable red light mode")
    }

    @Test
    fun settingsScreen_nightFilterToggleClickable() {
        composeTestRule.onNodeWithText("Enable red light mode").performScrollTo()
        composeTestRule.onNodeWithText("Enable red light mode").performClick()
        composeTestRule.waitForIdle()
    }

    @Test
    fun settingsScreen_displaysGpsInterval() {
        composeTestRule.onNodeWithText("GPS interval").performScrollTo()
        composeTestRule.assertTextDisplayed("GPS interval")
    }

    @Test
    fun settingsScreen_displaysAppInfo() {
        composeTestRule.onNodeWithText("OpenAnchor v", substring = true).performScrollTo()
        composeTestRule.assertTextDisplayed("OpenAnchor v")
        composeTestRule.assertTextDisplayed("Open source")
    }

    @Test
    fun settingsScreen_backNavigationReturnsHome() {
        composeTestRule.onNodeWithContentDescription("Back").performClick()
        composeTestRule.waitForText("OpenAnchor")
    }
}
