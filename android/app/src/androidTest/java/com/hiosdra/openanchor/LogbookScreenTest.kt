package com.hiosdra.openanchor

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.hiosdra.openanchor.helpers.*
import dagger.hilt.android.testing.HiltAndroidRule
import dagger.hilt.android.testing.HiltAndroidTest
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class LogbookScreenTest {

    @get:Rule(order = 0)
    val hiltRule = HiltAndroidRule(this)

    @get:Rule(order = 1)
    val composeTestRule = createAndroidComposeRule<MainActivity>()

    private fun navigateToLogbook() {
        composeTestRule.waitForText("OpenAnchor")
        composeTestRule
            .onNode(hasScrollToNodeAction())
            .performScrollToNode(hasText("AI Logbook", substring = true))
        composeTestRule.waitForText("AI Logbook").performClick()
        composeTestRule.waitForText("AI Logbook", timeoutMs = 5_000)
    }

    @Test
    fun logbookScreen_displaysTitle() {
        navigateToLogbook()
        composeTestRule.assertTextDisplayed("AI Logbook")
    }

    @Test
    fun logbookScreen_showsEmptyState() {
        navigateToLogbook()
        composeTestRule.assertTextDisplayed("No logbook entries yet")
    }

    @Test
    fun logbookScreen_emptyStateShowsFullMessage() {
        navigateToLogbook()
        composeTestRule.assertTextDisplayed("Generate one from a completed session")
    }

    @Test
    fun logbookScreen_emptyState_noGenerateButton() {
        // Without AI configured and sessions, the generate button should not appear
        navigateToLogbook()
        composeTestRule.onNodeWithText("Generate Entry").assertDoesNotExist()
    }

    @Test
    fun logbookScreen_emptyState_noGenerateActionButton() {
        // The top bar generate button only shows when AI is configured
        navigateToLogbook()
        composeTestRule.onNodeWithContentDescription("Generate entry").assertDoesNotExist()
    }

    @Test
    fun logbookScreen_hasBackButton() {
        navigateToLogbook()
        composeTestRule.onNodeWithContentDescription("Back").assertIsDisplayed()
    }

    @Test
    fun logbookScreen_backNavigatesToHome() {
        navigateToLogbook()
        composeTestRule.onNodeWithContentDescription("Back").performClick()
        composeTestRule.waitForText("OpenAnchor")
        composeTestRule.assertTextDisplayed("OpenAnchor")
    }

    @Test
    fun logbookScreen_emptyState_noDeleteButton() {
        navigateToLogbook()
        composeTestRule.onNodeWithContentDescription("Delete").assertDoesNotExist()
    }
}
