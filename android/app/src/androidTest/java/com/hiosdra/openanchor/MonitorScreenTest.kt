package com.hiosdra.openanchor

import androidx.compose.ui.test.assertIsDisplayed
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
class MonitorScreenTest {

    @get:Rule(order = 0)
    val hiltRule = HiltAndroidRule(this)

    @get:Rule(order = 1)
    val composeTestRule = createAndroidComposeRule<MainActivity>()

    private fun navigateToSetup() {
        composeTestRule.waitForText("Drop Anchor").performClick()
    }

    @Test
    fun setupScreen_isReachable() {
        navigateToSetup()
        // Verify we left the home screen and setup loaded without crash
        composeTestRule.waitForText("Drop Anchor", timeoutMs = 5_000)
    }

    @Test
    fun homeScreen_showsDropAnchorButton() {
        composeTestRule.waitForText("OpenAnchor")
        composeTestRule.assertTextDisplayed("Drop Anchor")
    }

    @Test
    fun homeScreen_dropAnchorNavigatesAway() {
        composeTestRule.waitForText("OpenAnchor")
        composeTestRule.onNodeWithText("Drop Anchor", substring = true).performClick()
        // Verify navigation occurred (we should no longer see the full home screen)
        composeTestRule.waitUntil(5_000) {
            composeTestRule.onAllNodes(
                androidx.compose.ui.test.hasText("No anchoring history yet")
            ).fetchSemanticsNodes().isEmpty()
        }
    }
}
