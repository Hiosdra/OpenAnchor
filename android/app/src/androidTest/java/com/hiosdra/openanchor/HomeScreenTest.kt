package com.hiosdra.openanchor

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.hiosdra.openanchor.helpers.assertTextDisplayed
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
        android.Manifest.permission.ACCESS_COARSE_LOCATION
    )

    @Before
    fun setUp() {
        hiltRule.inject()
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
        composeTestRule.onNodeWithText("Drop Anchor").performScrollTo().assertIsDisplayed()
    }

    @Test
    fun homeScreen_historyButtonVisible() {
        composeTestRule.onNodeWithText("History").performScrollTo().assertIsDisplayed()
    }

    @Test
    fun homeScreen_statisticsButtonVisible() {
        composeTestRule.onNodeWithText("Statistics").performScrollTo().assertIsDisplayed()
    }

    @Test
    fun homeScreen_examQuizButtonVisible() {
        composeTestRule.onNodeWithText("Exam Quiz").performScrollTo().assertIsDisplayed()
    }

    // --- 2. All Navigation Buttons Present ---

    @Test
    fun homeScreen_pairWithTabletVisible() {
        composeTestRule.onNodeWithText("Pair with Tablet").performScrollTo().assertIsDisplayed()
    }

    @Test
    fun homeScreen_connectToServerVisible() {
        composeTestRule.onNodeWithText("Connect to Server").performScrollTo().assertIsDisplayed()
    }

    @Test
    fun homeScreen_crewWatchVisible() {
        composeTestRule.onNodeWithText("Crew Watch").performScrollTo().assertIsDisplayed()
    }

    @Test
    fun homeScreen_aiAdvisorVisible() {
        composeTestRule.onNodeWithText("AI Advisor").performScrollTo().assertIsDisplayed()
    }

    @Test
    fun homeScreen_aiLogbookVisible() {
        composeTestRule.onNodeWithText("AI Logbook").performScrollTo().assertIsDisplayed()
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
        composeTestRule.onNodeWithText("Drop Anchor").performScrollTo().performClick()
        composeTestRule.waitForText("Anchor Position", timeoutMs = 5_000)
    }
}
