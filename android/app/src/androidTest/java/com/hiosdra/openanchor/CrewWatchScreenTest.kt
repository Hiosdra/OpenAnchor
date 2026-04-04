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
class CrewWatchScreenTest {

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
        navigateToCrewWatch()
    }

    private fun navigateToCrewWatch() {
        composeTestRule.waitForText("Drop Anchor")
        composeTestRule.waitForText("Crew Watch").performScrollTo()
        composeTestRule.waitForText("Crew Watch").performClick()
        composeTestRule.waitForText("Watch schedule and timer")
    }

    @Test
    fun crewWatchScreen_displaysTitle() {
        composeTestRule.assertTextDisplayed("Crew Watch")
    }

    @Test
    fun crewWatchScreen_showsSubtitle() {
        composeTestRule.assertTextDisplayed("Watch schedule and timer")
    }

    @Test
    fun crewWatchScreen_showsScheduleHeader() {
        composeTestRule.assertTextDisplayed("Schedule")
    }

    @Test
    fun crewWatchScreen_showsDurationSelector() {
        composeTestRule.assertTextDisplayed("Watch Duration")
    }

    @Test
    fun crewWatchScreen_showsDurationOptions() {
        composeTestRule.assertTextDisplayed("1 hours")
        composeTestRule.assertTextDisplayed("2 hours")
        composeTestRule.assertTextDisplayed("3 hours")
        composeTestRule.assertTextDisplayed("4 hours")
        composeTestRule.assertTextDisplayed("6 hours")
    }

    @Test
    fun crewWatchScreen_showsAlarmHint() {
        composeTestRule.assertTextDisplayed("5 min warning before watch change")
    }

    @Test
    fun crewWatchScreen_showsStartButton() {
        composeTestRule.assertTextDisplayed("Start Watch")
    }

    @Test
    fun crewWatchScreen_startButtonDisabledWithNoCrew() {
        composeTestRule.onNodeWithText("Start Watch").assertIsNotEnabled()
    }

    @Test
    fun crewWatchScreen_showsCrewMemberInput() {
        composeTestRule.onNodeWithText("Crew member").performScrollTo()
        composeTestRule.assertTextDisplayed("Crew member")
    }

    @Test
    fun crewWatchScreen_hasAddCrewButton() {
        composeTestRule.onNodeWithContentDescription("Add Crew").performScrollTo()
        composeTestRule.onNodeWithContentDescription("Add Crew").assertIsDisplayed()
    }

    @Test
    fun crewWatchScreen_hasBackButton() {
        composeTestRule.onNodeWithContentDescription("Cancel").assertIsDisplayed()
    }

    @Test
    fun crewWatchScreen_backNavigatesToHome() {
        composeTestRule.onNodeWithContentDescription("Cancel").performClick()
        composeTestRule.waitForText("Drop Anchor")
        composeTestRule.assertTextDisplayed("OpenAnchor")
    }
}
