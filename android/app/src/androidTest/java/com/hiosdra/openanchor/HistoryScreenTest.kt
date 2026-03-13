package com.hiosdra.openanchor

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsNotDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.hiosdra.openanchor.helpers.assertTextDisplayed
import com.hiosdra.openanchor.helpers.waitForText
import dagger.hilt.android.testing.HiltAndroidRule
import dagger.hilt.android.testing.HiltAndroidTest
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class HistoryScreenTest {

    @get:Rule(order = 0)
    val hiltRule = HiltAndroidRule(this)

    @get:Rule(order = 1)
    val composeTestRule = createAndroidComposeRule<MainActivity>()

    private fun navigateToHistory() {
        composeTestRule.waitForText("History").performClick()
        composeTestRule.waitForText("No anchoring history yet")
    }

    @Test
    fun historyScreen_displaysTitle() {
        navigateToHistory()
        composeTestRule.assertTextDisplayed("History")
    }

    @Test
    fun historyScreen_showsEmptyState() {
        navigateToHistory()
        composeTestRule.assertTextDisplayed("No anchoring history yet")
    }

    @Test
    fun historyScreen_hasBackButton() {
        navigateToHistory()
        composeTestRule.onNodeWithContentDescription("Back").assertIsDisplayed()
    }

    @Test
    fun historyScreen_backNavigatesToHome() {
        navigateToHistory()
        composeTestRule.onNodeWithContentDescription("Back").performClick()
        composeTestRule.waitForText("OpenAnchor")
        composeTestRule.assertTextDisplayed("OpenAnchor")
    }

    @Test
    fun historyScreen_emptyState_noDeleteButton() {
        navigateToHistory()
        composeTestRule.onNodeWithContentDescription("Delete").assertDoesNotExist()
    }

    @Test
    fun historyScreen_emptyState_noAlarmIcon() {
        navigateToHistory()
        composeTestRule.onNodeWithContentDescription("Alarm triggered").assertDoesNotExist()
        composeTestRule.onNodeWithContentDescription("No alarms").assertDoesNotExist()
    }
}
