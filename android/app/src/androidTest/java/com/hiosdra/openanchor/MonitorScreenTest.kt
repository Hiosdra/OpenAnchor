package com.hiosdra.openanchor

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.espresso.Espresso
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.hiosdra.openanchor.helpers.assertTextDisplayed
import com.hiosdra.openanchor.helpers.scrollToText
import com.hiosdra.openanchor.helpers.skipOnboardingIfPresent
import com.hiosdra.openanchor.helpers.waitForText
import dagger.hilt.android.testing.HiltAndroidRule
import dagger.hilt.android.testing.HiltAndroidTest
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import androidx.test.rule.GrantPermissionRule

/**
 * Tests for the monitor setup → drop anchor flow.
 * The actual MonitorScreen (MonitorDashboard) requires a real session
 * created via GPS, so these tests verify the full setup wizard completion
 * path and the transition attempt to monitoring.
 */
@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class MonitorScreenTest {

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
        navigateToSetup()
    }

    private fun navigateToSetup() {
        composeTestRule.waitForText("Drop Anchor").performClick()
        composeTestRule.waitForText("Anchor Position", timeoutMs = 5_000)
    }

    private fun navigateToStep2() {
        composeTestRule.onNodeWithText("Next").performClick()
        composeTestRule.waitForText("Choose Safe Zone Type")
    }

    private fun navigateToStep3() {
        navigateToStep2()
        composeTestRule.onNodeWithText("Simple Circle").performClick()
        composeTestRule.onNodeWithText("Next").performClick()
        composeTestRule.waitForText("Set Safe Radius")
    }

    private fun navigateToConfirm() {
        navigateToStep3()
        composeTestRule.scrollToText("Next").performClick()
        composeTestRule.waitForText("Confirm Setup", timeoutMs = 5_000)
    }

    // --- 1. Setup Screen Reachability ---

    @Test
    fun setupScreen_isReachable() {
        composeTestRule.waitForText("Anchor Position", timeoutMs = 5_000)
    }

    // --- 2. Full Wizard Flow ---

    @Test
    fun setupWizard_step1ToStep2Navigation() {
        navigateToStep2()
        composeTestRule.assertTextDisplayed("Choose Safe Zone Type")
    }

    @Test
    fun setupWizard_step2ToStep3Navigation() {
        navigateToStep3()
        composeTestRule.assertTextDisplayed("Set Safe Radius")
    }

    @Test
    fun setupWizard_fullFlowReachesDropAnchor() {
        navigateToConfirm()
        composeTestRule.scrollToText("Start Monitoring").assertIsDisplayed()
    }

    // --- 3. Back Navigation Through Wizard ---

    @Test
    fun setupWizard_backFromStep2ReturnsToStep1() {
        navigateToStep2()
        composeTestRule.onNodeWithContentDescription("Back").performClick()
        composeTestRule.waitForText("Anchor Position")
    }

    @Test
    fun setupWizard_backFromStep3ReturnsToStep2() {
        navigateToStep3()
        composeTestRule.onNodeWithContentDescription("Back").performClick()
        composeTestRule.waitForText("Choose Safe Zone Type")
    }

    @Test
    fun setupWizard_backFromStep1ReturnsToHome() {
        composeTestRule.onNodeWithContentDescription("Back").performClick()
        composeTestRule.waitForText("Drop Anchor")
        composeTestRule.assertTextDisplayed("OpenAnchor")
    }

    // --- 4. Resume Monitoring Not Available by Default ---

    @Test
    fun homeScreen_resumeMonitoringNotAvailableByDefault() {
        Espresso.pressBack()
        composeTestRule.waitForText("Drop Anchor")
        composeTestRule.onNodeWithText("Resume Monitoring").assertDoesNotExist()
    }
}
