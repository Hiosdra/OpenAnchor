package com.hiosdra.openanchor

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.hiosdra.openanchor.helpers.assertTextDisplayed
import com.hiosdra.openanchor.helpers.skipOnboardingIfPresent
import com.hiosdra.openanchor.helpers.scrollToText
import com.hiosdra.openanchor.helpers.waitForText
import dagger.hilt.android.testing.HiltAndroidRule
import dagger.hilt.android.testing.HiltAndroidTest
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import androidx.test.rule.GrantPermissionRule

@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class HomeScreenTest {

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

    // --- 1. Home Screen Display ---

    @Test
    fun homeScreen_titleDisplayed() {
        composeTestRule.assertTextDisplayed("OpenAnchor")
    }

    @Test
    fun homeScreen_subtitleDisplayed() {
        composeTestRule.assertTextDisplayed("Anchor alarm for sailors")
    }

    @Test
    fun homeScreen_dropAnchorButtonVisible() {
        composeTestRule.scrollToText("Drop Anchor").assertIsDisplayed()
    }

    @Test
    fun homeScreen_historyButtonVisible() {
        composeTestRule.scrollToText("History").assertIsDisplayed()
    }

    @Test
    fun homeScreen_statisticsButtonVisible() {
        composeTestRule.scrollToText("Statistics").assertIsDisplayed()
    }

    // --- 2. All Navigation Buttons Present ---

    @Test
    fun homeScreen_pairWithTabletVisible() {
        composeTestRule.scrollToText("Pair with Tablet").assertIsDisplayed()
    }

    @Test
    fun homeScreen_connectToServerVisible() {
        composeTestRule.scrollToText("Connect to Server").assertIsDisplayed()
    }

    @Test
    fun homeScreen_crewWatchVisible() {
        composeTestRule.scrollToText("Crew Watch").assertIsDisplayed()
    }

    @Test
    fun homeScreen_aiAdvisorVisible() {
        composeTestRule.scrollToText("AI Advisor").assertIsDisplayed()
    }

    @Test
    fun homeScreen_aiLogbookVisible() {
        composeTestRule.scrollToText("AI Logbook").assertIsDisplayed()
    }

    // --- 3. Conditional Buttons Hidden by Default ---

    @Test
    fun homeScreen_resumeMonitoringNotDisplayedByDefault() {
        composeTestRule.onNodeWithText("Resume Monitoring").assertDoesNotExist()
    }

    @Test
    fun homeScreen_resumeClientModeNotDisplayedByDefault() {
        composeTestRule.onNodeWithText("Resume Client Mode").assertDoesNotExist()
    }

    // --- 4. Settings Icon ---

    @Test
    fun homeScreen_settingsIconDisplayedAndClickable() {
        composeTestRule.onNodeWithContentDescription("Settings")
            .assertIsDisplayed()
            .performClick()
    }

    // --- 5. Drop Anchor Navigation ---

    @Test
    fun dropAnchorButton_navigatesToSetup() {
        composeTestRule.scrollToText("Drop Anchor").performClick()
        composeTestRule.waitForText("Anchor Position", timeoutMs = 5_000)
    }
}
