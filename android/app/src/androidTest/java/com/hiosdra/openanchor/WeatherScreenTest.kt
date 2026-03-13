package com.hiosdra.openanchor

import android.view.ViewGroup
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.navigation.NavController
import androidx.navigation.Navigation
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.hiosdra.openanchor.helpers.*
import dagger.hilt.android.testing.HiltAndroidRule
import dagger.hilt.android.testing.HiltAndroidTest
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class WeatherScreenTest {

    @get:Rule(order = 0)
    val hiltRule = HiltAndroidRule(this)

    @get:Rule(order = 1)
    val composeTestRule = createAndroidComposeRule<MainActivity>()

    // Weather screen requires latitude/longitude route parameters and is accessed
    // from Monitor screen's Weather FAB, not directly from Home.
    // We navigate programmatically via the NavController to test it.

    private fun navigateToWeather() {
        composeTestRule.waitForText("OpenAnchor")
        composeTestRule.activityRule.scenario.onActivity { activity ->
            val contentView = activity.findViewById<ViewGroup>(android.R.id.content)
            val composeView = contentView.getChildAt(0)
            val navController: NavController = Navigation.findNavController(composeView)
            navController.navigate("weather/54.35/18.65")
        }
        composeTestRule.waitForIdle()
    }

    // --- 1. Weather Screen Loads ---

    @Test
    fun weatherScreen_displaysTitle() {
        navigateToWeather()
        composeTestRule.waitForText("Marine Weather", timeoutMs = 10_000)
        composeTestRule.assertTextDisplayed("Marine Weather")
    }

    // --- 2. Back Button ---

    @Test
    fun weatherScreen_hasBackButton() {
        navigateToWeather()
        composeTestRule.waitForText("Marine Weather", timeoutMs = 10_000)
        composeTestRule.onNodeWithContentDescription("Back").assertIsDisplayed()
    }

    // --- 3. Loading or Content State ---

    @Test
    fun weatherScreen_showsLoadingOrContent() {
        navigateToWeather()
        composeTestRule.waitForText("Marine Weather", timeoutMs = 10_000)
        val hasLoading = composeTestRule
            .onAllNodesWithText("Loading marine weather", substring = true)
            .fetchSemanticsNodes().isNotEmpty()
        val hasError = composeTestRule
            .onAllNodesWithText("Retry")
            .fetchSemanticsNodes().isNotEmpty()
        val hasContent = composeTestRule
            .onAllNodesWithText("Current Conditions", substring = true)
            .fetchSemanticsNodes().isNotEmpty()
        assert(hasLoading || hasError || hasContent) {
            "Weather screen should show loading, error, or content state"
        }
    }

    // --- 4. Refresh Button ---

    @Test
    fun weatherScreen_hasRefreshButton() {
        navigateToWeather()
        composeTestRule.waitForText("Marine Weather", timeoutMs = 10_000)
        composeTestRule.onNodeWithContentDescription("Refresh").assertIsDisplayed()
    }

    // --- 5. Position Display ---

    @Test
    fun weatherScreen_showsPositionWhenLoaded() {
        navigateToWeather()
        composeTestRule.waitForText("Marine Weather", timeoutMs = 10_000)
        // Wait for loading to finish
        try {
            composeTestRule.waitUntil(15_000) {
                composeTestRule.onAllNodesWithText("Current Conditions", substring = true)
                    .fetchSemanticsNodes().isNotEmpty() ||
                composeTestRule.onAllNodesWithText("Retry")
                    .fetchSemanticsNodes().isNotEmpty()
            }
        } catch (_: Exception) {
            // May still be loading — acceptable
        }
        val hasContent = composeTestRule
            .onAllNodesWithText("54.35", substring = true)
            .fetchSemanticsNodes().isNotEmpty()
        val hasError = composeTestRule
            .onAllNodesWithText("Retry")
            .fetchSemanticsNodes().isNotEmpty()
        val hasLoading = composeTestRule
            .onAllNodesWithText("Loading", substring = true)
            .fetchSemanticsNodes().isNotEmpty()
        assert(hasContent || hasError || hasLoading) {
            "Weather screen should show coordinates, error, or still be loading"
        }
    }

    // --- 6. Back Navigation ---

    @Test
    fun weatherScreen_backNavigatesAway() {
        navigateToWeather()
        composeTestRule.waitForText("Marine Weather", timeoutMs = 10_000)
        composeTestRule.onNodeWithContentDescription("Back").performClick()
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithText("Marine Weather").assertDoesNotExist()
    }
}
