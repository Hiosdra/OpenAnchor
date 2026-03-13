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
class AdvisorScreenTest {

    @get:Rule(order = 0)
    val hiltRule = HiltAndroidRule(this)

    @get:Rule(order = 1)
    val composeTestRule = createAndroidComposeRule<MainActivity>()

    private fun navigateToAdvisor() {
        composeTestRule.waitForText("OpenAnchor")
        composeTestRule
            .onNode(hasScrollToNodeAction())
            .performScrollToNode(hasText("AI Advisor", substring = true))
        composeTestRule.waitForText("AI Advisor").performClick()
        composeTestRule.waitForText("AI Advisor", timeoutMs = 5_000)
    }

    @Test
    fun advisorScreen_displaysTitle() {
        navigateToAdvisor()
        composeTestRule.assertTextDisplayed("AI Advisor")
    }

    @Test
    fun advisorScreen_showsApiKeySetupDescription() {
        navigateToAdvisor()
        composeTestRule.assertTextDisplayed("Enter your Gemini API key")
    }

    @Test
    fun advisorScreen_showsApiKeySetupFullDesc() {
        navigateToAdvisor()
        composeTestRule.assertTextDisplayed("ai.google.dev")
    }

    @Test
    fun advisorScreen_showsApiKeyInputField() {
        navigateToAdvisor()
        composeTestRule.assertTextDisplayed("Gemini API Key")
    }

    @Test
    fun advisorScreen_showsSaveKeyButton() {
        navigateToAdvisor()
        composeTestRule.assertTextDisplayed("Save Key")
    }

    @Test
    fun advisorScreen_saveKeyButtonDisabledWhenEmpty() {
        navigateToAdvisor()
        composeTestRule.onNodeWithText("Save Key").assertIsNotEnabled()
    }

    @Test
    fun advisorScreen_showsKeyHint() {
        navigateToAdvisor()
        composeTestRule.assertTextDisplayed("Paste your Gemini API key here")
    }

    @Test
    fun advisorScreen_hasBackButton() {
        navigateToAdvisor()
        composeTestRule.onNodeWithContentDescription("Back").assertIsDisplayed()
    }

    @Test
    fun advisorScreen_backNavigatesToHome() {
        navigateToAdvisor()
        composeTestRule.onNodeWithContentDescription("Back").performClick()
        composeTestRule.waitForText("OpenAnchor")
        composeTestRule.assertTextDisplayed("OpenAnchor")
    }

    @Test
    fun advisorScreen_noClearButtonInSetup() {
        navigateToAdvisor()
        composeTestRule.onNodeWithContentDescription("Clear chat").assertDoesNotExist()
    }
}
