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
class StatisticsScreenTest {

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
        navigateToStatistics()
    }

    private fun navigateToStatistics() {
        composeTestRule.waitForText("OpenAnchor", timeoutMs = 10_000)
        try {
            composeTestRule.onNodeWithText("Statistics", substring = true).performScrollTo()
        } catch (_: Exception) {
            // Scroll may not be needed if Statistics is already visible
        }
        composeTestRule.waitForText("Statistics", timeoutMs = 5_000).performClick()
        composeTestRule.waitForIdle()
    }

    // --- 1. Navigation ---

    @Test
    fun statisticsScreen_navigateFromHome() {
        composeTestRule.assertTextDisplayed("Statistics")
    }

    // --- 2. Title & Back Button ---

    @Test
    fun statisticsScreen_displaysTitle() {
        composeTestRule.assertTextDisplayed("Statistics")
    }

    @Test
    fun statisticsScreen_hasBackButton() {
        composeTestRule.onNodeWithContentDescription("Back").assertIsDisplayed()
    }

    // --- 3. Empty State ---

    @Test
    fun statisticsScreen_showsEmptyState() {
        composeTestRule.assertTextDisplayed("No anchoring data yet")
    }

    @Test
    fun statisticsScreen_emptyState_noStatCards() {
        composeTestRule.onNodeWithText("Total sessions").assertDoesNotExist()
        composeTestRule.onNodeWithText("Total time anchored").assertDoesNotExist()
    }

    // --- 4. Back Navigation ---

    @Test
    fun statisticsScreen_backNavigatesToHome() {
        composeTestRule.onNodeWithContentDescription("Back").performClick()
        composeTestRule.waitForText("Drop Anchor", timeoutMs = 5_000)
        composeTestRule.onNodeWithText("Drop Anchor").assertIsDisplayed()
    }
}
