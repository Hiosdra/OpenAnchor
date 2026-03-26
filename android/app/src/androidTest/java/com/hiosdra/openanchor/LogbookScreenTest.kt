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
class LogbookScreenTest {

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
        navigateToLogbook()
    }

    private fun navigateToLogbook() {
        composeTestRule.waitForText("OpenAnchor")
        composeTestRule.onNodeWithText("AI Logbook", substring = true).performScrollTo()
        composeTestRule.waitForText("AI Logbook").performClick()
        composeTestRule.waitForText("AI Logbook", timeoutMs = 5_000)
    }

    @Test
    fun logbookScreen_displaysTitle() {
        composeTestRule.assertTextDisplayed("AI Logbook")
    }

    @Test
    fun logbookScreen_showsEmptyState() {
        composeTestRule.assertTextDisplayed("No logbook entries yet")
    }

    @Test
    fun logbookScreen_emptyStateShowsFullMessage() {
        composeTestRule.assertTextDisplayed("Generate one from a completed session")
    }

    @Test
    fun logbookScreen_emptyState_noGenerateButton() {
        // Without AI configured and sessions, the generate button should not appear
        composeTestRule.onNodeWithText("Generate Entry").assertDoesNotExist()
    }

    @Test
    fun logbookScreen_emptyState_noGenerateActionButton() {
        // The top bar generate button only shows when AI is configured
        composeTestRule.onNodeWithContentDescription("Generate entry").assertDoesNotExist()
    }

    @Test
    fun logbookScreen_hasBackButton() {
        composeTestRule.onNodeWithContentDescription("Back").assertIsDisplayed()
    }

    @Test
    fun logbookScreen_backNavigatesToHome() {
        composeTestRule.onNodeWithContentDescription("Back").performClick()
        composeTestRule.waitForText("OpenAnchor")
        composeTestRule.assertTextDisplayed("OpenAnchor")
    }

    @Test
    fun logbookScreen_emptyState_noDeleteButton() {
        composeTestRule.onNodeWithContentDescription("Delete").assertDoesNotExist()
    }
}
