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
class ExamQuizScreenTest {

    @get:Rule(order = 0)
    val hiltRule = HiltAndroidRule(this)

    @get:Rule(order = 1)
    val composeTestRule = createAndroidComposeRule<MainActivity>()

    private fun navigateToExamQuiz() {
        composeTestRule.waitForText("OpenAnchor")
        composeTestRule.onNodeWithText("Exam Quiz").performScrollTo().performClick()
        composeTestRule.waitForText("Exam Quiz", timeoutMs = 10_000)
    }

    private fun navigateToLearnMode() {
        navigateToExamQuiz()
        composeTestRule.onNodeWithText("Learn Mode").performScrollTo().performClick()
        composeTestRule.waitForText("Learn Mode", timeoutMs = 10_000)
    }

    // --- Menu tests ---

    @Test
    fun examMenu_displaysTitle() {
        navigateToExamQuiz()
        composeTestRule.assertTextDisplayed("Exam Quiz")
    }

    @Test
    fun examMenu_displaysProgressSection() {
        navigateToExamQuiz()
        composeTestRule.assertTextDisplayed("Your Progress")
    }

    @Test
    fun examMenu_displaysCategoriesSection() {
        navigateToExamQuiz()
        composeTestRule.onNodeWithText("Categories").performScrollTo()
        composeTestRule.assertTextDisplayed("Categories")
    }

    @Test
    fun examMenu_displaysModeButtons() {
        navigateToExamQuiz()
        composeTestRule.onNodeWithText("Learn Mode").performScrollTo()
        composeTestRule.assertTextDisplayed("Learn Mode")
        composeTestRule.onNodeWithText("Leitner Mode").performScrollTo()
        composeTestRule.assertTextDisplayed("Leitner Mode")
        composeTestRule.onNodeWithText("Exam Mode").performScrollTo()
        composeTestRule.assertTextDisplayed("Exam Mode")
    }

    @Test
    fun examMenu_displaysProgressStats() {
        navigateToExamQuiz()
        composeTestRule.assertTextDisplayed("Questions")
        composeTestRule.assertTextDisplayed("Correct")
        composeTestRule.assertTextDisplayed("Answered")
    }

    @Test
    fun examMenu_displaysInitialProgressValues() {
        navigateToExamQuiz()
        composeTestRule.assertTextDisplayed("0%")
    }

    @Test
    fun examMenu_displaysCategoryNames() {
        navigateToExamQuiz()
        composeTestRule.onNodeWithText("Categories").performScrollTo()
        // Category items show question counts
        composeTestRule.assertTextDisplayed("questions")
    }

    // --- Learn Mode tests ---

    @Test
    fun learnMode_displaysTitle() {
        navigateToLearnMode()
        composeTestRule.assertTextDisplayed("Learn Mode")
    }

    @Test
    fun learnMode_displaysNavigationButtons() {
        navigateToLearnMode()
        composeTestRule.waitForIdle()
        composeTestRule.assertTextDisplayed("Previous")
    }

    @Test
    fun learnMode_displaysAnswerOptions() {
        navigateToLearnMode()
        composeTestRule.waitForIdle()
        // Answer buttons are labeled A, B, C
        composeTestRule.assertTextDisplayed("A")
        composeTestRule.assertTextDisplayed("B")
        composeTestRule.assertTextDisplayed("C")
    }

    @Test
    fun learnMode_canClickAnswer() {
        navigateToLearnMode()
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithText("A").performClick()
        composeTestRule.waitForIdle()
        // After selecting, the Next button should appear
        composeTestRule.assertTextDisplayed("Next")
    }

    @Test
    fun learnMode_canNavigateNext() {
        navigateToLearnMode()
        composeTestRule.waitForIdle()
        // Click Skip/Next to advance without answering
        composeTestRule.onNodeWithText("Skip").performClick()
        composeTestRule.waitForIdle()
    }

    @Test
    fun learnMode_backReturnsToMenu() {
        navigateToLearnMode()
        composeTestRule.onNodeWithContentDescription("Back").performClick()
        composeTestRule.waitForText("Exam Quiz")
        composeTestRule.assertTextDisplayed("Your Progress")
    }

    // --- Leitner Mode tests ---

    @Test
    fun leitnerMode_displaysTitle() {
        navigateToExamQuiz()
        composeTestRule.onNodeWithText("Leitner Mode").performScrollTo().performClick()
        composeTestRule.waitForText("Leitner Mode", timeoutMs = 10_000)
        composeTestRule.assertTextDisplayed("Leitner Mode")
    }

    @Test
    fun leitnerMode_displaysBoxLabels() {
        navigateToExamQuiz()
        composeTestRule.onNodeWithText("Leitner Mode").performScrollTo().performClick()
        composeTestRule.waitForText("Leitner Mode", timeoutMs = 10_000)
        composeTestRule.assertTextDisplayed("New / Failed")
        composeTestRule.onNodeWithText("Learning").performScrollTo()
        composeTestRule.assertTextDisplayed("Learning")
    }

    @Test
    fun leitnerMode_displaysStartSession() {
        navigateToExamQuiz()
        composeTestRule.onNodeWithText("Leitner Mode").performScrollTo().performClick()
        composeTestRule.waitForText("Leitner Mode", timeoutMs = 10_000)
        composeTestRule.onNodeWithText("Start Session").performScrollTo()
        composeTestRule.assertTextDisplayed("Start Session")
    }

    @Test
    fun leitnerMode_backReturnsToMenu() {
        navigateToExamQuiz()
        composeTestRule.onNodeWithText("Leitner Mode").performScrollTo().performClick()
        composeTestRule.waitForText("Leitner Mode", timeoutMs = 10_000)
        composeTestRule.onNodeWithContentDescription("Back").performClick()
        composeTestRule.waitForText("Exam Quiz")
        composeTestRule.assertTextDisplayed("Your Progress")
    }

    // --- Exam Mode tests ---

    @Test
    fun examMode_displaysTitle() {
        navigateToExamQuiz()
        composeTestRule.onNodeWithText("Exam Mode").performScrollTo().performClick()
        composeTestRule.waitForText("Exam Mode", timeoutMs = 10_000)
        composeTestRule.assertTextDisplayed("Exam Mode")
    }

    // --- Back navigation ---

    @Test
    fun examQuiz_backNavigationReturnsHome() {
        navigateToExamQuiz()
        composeTestRule.onNodeWithContentDescription("Back").performClick()
        composeTestRule.waitForText("OpenAnchor")
    }
}
