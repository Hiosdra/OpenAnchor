package com.hiosdra.openanchor

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsNotDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
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
class HistoryScreenTest {

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
        navigateToHistory()
    }

    private fun navigateToHistory() {
        composeTestRule.waitForText("Drop Anchor")
        composeTestRule.scrollToText("History")
        composeTestRule.waitForText("History").performClick()
        composeTestRule.waitForIdle()
        composeTestRule.waitForText("No anchoring history yet")
    }

    @Test
    fun historyScreen_displaysTitle() {
        composeTestRule.assertTextDisplayed("History")
    }

    @Test
    fun historyScreen_showsEmptyState() {
        composeTestRule.assertTextDisplayed("No anchoring history yet")
    }

    @Test
    fun historyScreen_hasBackButton() {
        composeTestRule.onNodeWithContentDescription("Back").assertIsDisplayed()
    }

    @Test
    fun historyScreen_backNavigatesToHome() {
        composeTestRule.onNodeWithContentDescription("Back").performClick()
        composeTestRule.waitForText("Drop Anchor")
        composeTestRule.assertTextDisplayed("OpenAnchor")
    }

    @Test
    fun historyScreen_emptyState_noDeleteButton() {
        composeTestRule.onNodeWithContentDescription("Delete").assertDoesNotExist()
    }

    @Test
    fun historyScreen_emptyState_noAlarmIcon() {
        composeTestRule.onNodeWithContentDescription("Alarm triggered").assertDoesNotExist()
        composeTestRule.onNodeWithContentDescription("No alarms").assertDoesNotExist()
    }
}
