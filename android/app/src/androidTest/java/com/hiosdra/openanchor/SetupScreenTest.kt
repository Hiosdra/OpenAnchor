package com.hiosdra.openanchor

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsOn
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.hiosdra.openanchor.helpers.tryPerformScrollTo
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
class SetupScreenTest {

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
        navigateToSetup()
    }

    private fun navigateToSetup() {
        composeTestRule.onNodeWithText("Drop Anchor").performScrollTo().performClick()
        composeTestRule.waitForText("Anchor Position")
    }

    // --- 1. Setup Opens on Drop Anchor ---

    @Test
    fun setup_opensOnDropAnchor() {
        composeTestRule.onNodeWithText("Anchor Position").assertIsDisplayed()
    }

    // --- 2. Step 1: GPS Position ---

    @Test
    fun setup_step1_useCurrentPositionVisible() {
        composeTestRule.onNodeWithText("Use Current Position").tryPerformScrollTo().assertIsDisplayed()
    }

    // --- 3. Zone Type Selection (Step 2) ---

    @Test
    fun setup_step2_zoneTypeHeadingVisible() {
        composeTestRule.onNodeWithText("Next").tryPerformScrollTo().performClick()
        composeTestRule.waitForText("Choose Safe Zone Type")
        composeTestRule.onNodeWithText("Choose Safe Zone Type").assertIsDisplayed()
    }

    @Test
    fun setup_step2_simpleCircleOptionVisible() {
        composeTestRule.onNodeWithText("Next").tryPerformScrollTo().performClick()
        composeTestRule.waitForText("Simple Circle")
        composeTestRule.onNodeWithText("Simple Circle").assertIsDisplayed()
    }

    @Test
    fun setup_step2_circleWithSectorOptionVisible() {
        composeTestRule.onNodeWithText("Next").tryPerformScrollTo().performClick()
        composeTestRule.waitForText("Circle + Sector")
        composeTestRule.onNodeWithText("Circle + Sector").assertIsDisplayed()
    }

    @Test
    fun setup_step2_canSelectSimpleCircle() {
        composeTestRule.onNodeWithText("Next").tryPerformScrollTo().performClick()
        composeTestRule.waitForText("Simple Circle")
        composeTestRule.onNodeWithText("Simple Circle").performClick()
    }

    // --- 4. Radius Configuration (Step 3) ---

    private fun navigateToRadiusStep() {
        // Step 1 → Step 2
        composeTestRule.onNodeWithText("Next").tryPerformScrollTo().performClick()
        composeTestRule.waitForText("Choose Safe Zone Type")
        // Select Simple Circle and advance
        composeTestRule.onNodeWithText("Simple Circle").performClick()
        composeTestRule.onNodeWithText("Next").tryPerformScrollTo().performClick()
        composeTestRule.waitForText("Set Safe Radius")
    }

    @Test
    fun setup_step3_radiusHeadingVisible() {
        navigateToRadiusStep()
        composeTestRule.onNodeWithText("Set Safe Radius").assertIsDisplayed()
    }

    @Test
    fun setup_step3_calculateFromChainSwitchVisible() {
        navigateToRadiusStep()
        composeTestRule.onNodeWithText("Calculate from chain").tryPerformScrollTo().assertIsDisplayed()
    }

    @Test
    fun setup_step3_radiusInputVisible() {
        navigateToRadiusStep()
        composeTestRule.onNodeWithText("Radius").tryPerformScrollTo().assertIsDisplayed()
    }

    // --- 5. Chain Calculator ---

    @Test
    fun setup_step3_chainCalculator_depthInputAppears() {
        navigateToRadiusStep()
        composeTestRule.onNodeWithText("Calculate from chain").tryPerformScrollTo().performClick()
        composeTestRule.waitForText("Depth (m)")
        composeTestRule.onNodeWithText("Depth (m)").tryPerformScrollTo().assertIsDisplayed()
    }

    @Test
    fun setup_step3_chainCalculator_scopeRatioChipsVisible() {
        navigateToRadiusStep()
        composeTestRule.onNodeWithText("Calculate from chain").tryPerformScrollTo().performClick()
        composeTestRule.waitForText("3:1 Calm")
        composeTestRule.onNodeWithText("3:1 Calm").tryPerformScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithText("5:1 Moderate").tryPerformScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithText("7:1 Standard").tryPerformScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithText("10:1 Storm").tryPerformScrollTo().assertIsDisplayed()
        composeTestRule.onNodeWithText("Manual").tryPerformScrollTo().assertIsDisplayed()
    }

    // --- 6. Setup Navigation ---

    @Test
    fun setup_nextButtonNavigatesBetweenSteps() {
        // Step 1 → Step 2
        composeTestRule.onNodeWithText("Next").tryPerformScrollTo().performClick()
        composeTestRule.waitForText("Choose Safe Zone Type")
        composeTestRule.onNodeWithText("Choose Safe Zone Type").assertIsDisplayed()
    }

    @Test
    fun setup_backArrowReturnsToPreviousStep() {
        // Step 1 → Step 2
        composeTestRule.onNodeWithText("Next").tryPerformScrollTo().performClick()
        composeTestRule.waitForText("Choose Safe Zone Type")
        // Step 2 → Step 1
        composeTestRule.onNodeWithContentDescription("Back").performClick()
        composeTestRule.waitForText("Anchor Position")
        composeTestRule.onNodeWithText("Anchor Position").assertIsDisplayed()
    }

    @Test
    fun setup_backFromStep1ReturnsToHome() {
        composeTestRule.onNodeWithContentDescription("Back").performClick()
        composeTestRule.waitForText("OpenAnchor")
        composeTestRule.onNodeWithText("Drop Anchor").performScrollTo().assertIsDisplayed()
    }
}
