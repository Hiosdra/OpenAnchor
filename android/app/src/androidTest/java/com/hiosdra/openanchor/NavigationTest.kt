package com.hiosdra.openanchor

import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.test.espresso.Espresso
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
class NavigationTest {

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
    }

    // ── Helpers ──────────────────────────────────────────────────────

    private fun scrollToAndClick(text: String) {
        composeTestRule.onNodeWithText(text, substring = true).performScrollTo()
        composeTestRule.waitForIdle()
        composeTestRule.waitForText(text).performClick()
        composeTestRule.waitForIdle()
    }

    private fun navigateBack() {
        Espresso.pressBack()
        composeTestRule.waitForIdle()
    }

    // ── 1. Home Screen is Start Destination ──────────────────────────

    @Test
    fun homeScreen_isStartDestination() {
        composeTestRule.assertTextDisplayed("OpenAnchor")
        composeTestRule.assertTextDisplayed("Drop Anchor")
    }

    // ── 2. Navigate to Setup ─────────────────────────────────────────

    @Test
    fun navigateToSetup() {
        scrollToAndClick("Drop Anchor")
        composeTestRule.waitForText("Anchor Position")
    }

    // ── 3. Navigate to History ───────────────────────────────────────

    @Test
    fun navigateToHistory() {
        scrollToAndClick("History")
        composeTestRule.waitForText("History")
    }

    // ── 4. Navigate to Settings ──────────────────────────────────────

    @Test
    fun navigateToSettings() {
        scrollToAndClick("Settings")
        composeTestRule.waitForText("Settings")
    }

    // ── 5. Navigate to Statistics ────────────────────────────────────

    @Test
    fun navigateToStatistics() {
        scrollToAndClick("Statistics")
        composeTestRule.waitForText("Statistics")
    }

    // ── 6. Navigate to Exam Quiz ─────────────────────────────────────

    @Test
    fun navigateToExamQuiz() {
        scrollToAndClick("Exam Quiz")
        composeTestRule.waitForText("Exam Quiz")
    }

    // ── 7. Navigate to AI Advisor ────────────────────────────────────

    @Test
    fun navigateToAiAdvisor() {
        scrollToAndClick("AI Advisor")
        composeTestRule.waitForText("AI Advisor")
    }

    // ── 8. Navigate to AI Logbook ────────────────────────────────────

    @Test
    fun navigateToAiLogbook() {
        scrollToAndClick("AI Logbook")
        composeTestRule.waitForText("Logbook")
    }

    // ── 9. Navigate to Crew Watch ────────────────────────────────────

    @Test
    fun navigateToCrewWatch() {
        scrollToAndClick("Crew Watch")
        composeTestRule.waitForText("Crew Watch")
    }

    // ── 10. Back Navigation ──────────────────────────────────────────

    @Test
    fun backFromHistory_returnsHome() {
        scrollToAndClick("History")
        composeTestRule.waitForText("History")
        navigateBack()
        composeTestRule.waitForText("Drop Anchor")
    }

    @Test
    fun backFromSettings_returnsHome() {
        scrollToAndClick("Settings")
        composeTestRule.waitForText("Settings")
        navigateBack()
        composeTestRule.waitForText("Drop Anchor")
    }

    @Test
    fun backFromExamQuiz_returnsHome() {
        scrollToAndClick("Exam Quiz")
        composeTestRule.waitForText("Exam Quiz")
        navigateBack()
        composeTestRule.waitForText("Drop Anchor")
    }

    // ── 11. Navigate to Pairing Screens ──────────────────────────────

    @Test
    fun navigateToPairWithTablet() {
        scrollToAndClick("Pair with Tablet")
        composeTestRule.waitForText("QR", timeoutMs = 10_000)
    }

    @Test
    fun navigateToConnectToServer() {
        scrollToAndClick("Connect to Server")
        composeTestRule.waitForText("Scan", timeoutMs = 10_000)
    }
}
