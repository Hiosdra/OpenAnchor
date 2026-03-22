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
class HistoryDetailScreenTest {

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
        navigateToHistory()
    }

    private fun navigateToHistory() {
        composeTestRule.waitForText("OpenAnchor")
        composeTestRule
            .onNode(hasScrollToNodeAction())
            .performScrollToNode(hasText("History", substring = true))
        composeTestRule.waitForText("History").performClick()
        composeTestRule.waitForText("No anchoring history yet")
    }

    @Test
    fun historyScreen_emptyState_noSessionsToClick() {
        // With no data, we can't reach HistoryDetail, but we verify History loads
        composeTestRule.assertTextDisplayed("No anchoring history yet")
    }

    @Test
    fun historyScreen_emptyState_hasBackButton() {
        composeTestRule.onNodeWithContentDescription("Back").assertIsDisplayed()
    }

    @Test
    fun historyScreen_emptyState_backNavigatesToHome() {
        composeTestRule.onNodeWithContentDescription("Back").performClick()
        composeTestRule.waitForText("OpenAnchor")
        composeTestRule.assertTextDisplayed("OpenAnchor")
    }

    @Test
    fun historyScreen_emptyState_noExportButton() {
        // Export GPX should not be visible in empty history
        composeTestRule.onNodeWithText("Export GPX").assertDoesNotExist()
    }

    @Test
    fun historyScreen_emptyState_noSessionDetails() {
        // Session Details title should not be visible from History list
        composeTestRule.onNodeWithText("Session Details").assertDoesNotExist()
    }

    @Test
    fun historyScreen_emptyState_noStartTimeLabel() {
        composeTestRule.onNodeWithText("Start time").assertDoesNotExist()
    }

    @Test
    fun historyScreen_emptyState_noAlarmsTriggeredLabel() {
        composeTestRule.onNodeWithText("Alarms triggered").assertDoesNotExist()
    }
}
