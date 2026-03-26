package com.hiosdra.openanchor

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.hiosdra.openanchor.helpers.*
import dagger.hilt.android.testing.HiltAndroidRule
import dagger.hilt.android.testing.HiltAndroidTest
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import androidx.test.rule.GrantPermissionRule
import java.io.File

@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class ExamQuizScreenTest {

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

    // Minimal valid PDF so ExamPdfStorage.isPdfAvailable() returns true
    private val minimalPdf = "%PDF-1.0\n1 0 obj<</Pages 2 0 R>>endobj\n2 0 obj<</Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</MediaBox[0 0 612 792]>>endobj\ntrailer<</Root 1 0 R>>\n".toByteArray()

    private fun provisionDummyPdf() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val dir = File(context.filesDir, "exam_pdf")
        dir.mkdirs()
        File(dir, "questions.pdf").writeBytes(minimalPdf)
    }

    private fun cleanupDummyPdf() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val dir = File(context.filesDir, "exam_pdf")
        File(dir, "questions.pdf").delete()
        dir.delete()
    }

    @Before
    fun setUp() {
        provisionDummyPdf()
        hiltRule.inject()
        composeTestRule.skipOnboardingIfPresent()
        navigateToExamQuiz()
    }

    @After
    fun tearDown() {
        cleanupDummyPdf()
    }

    private fun navigateToExamQuiz() {
        composeTestRule.waitForText("OpenAnchor")
        composeTestRule.onNodeWithText("Exam Quiz").performScrollTo().performClick()
        composeTestRule.waitForText("Categories", timeoutMs = 10_000)
    }

    private fun scrollToTextInList(text: String) {
        composeTestRule.onNode(hasScrollToNodeAction())
            .performScrollToNode(hasText(text))
    }

    private fun navigateToLearnMode() {
        scrollToTextInList("Learn Mode")
        composeTestRule.onNodeWithText("Learn Mode").performClick()
        composeTestRule.waitUntil(10_000) {
            composeTestRule.onAllNodesWithText("#", substring = true).fetchSemanticsNodes().isNotEmpty()
        }
    }

    // --- Menu tests ---

    @Test
    fun examMenu_displaysTitle() {
        composeTestRule.assertTextDisplayed("Exam Quiz")
    }

    @Test
    fun examMenu_displaysProgressSection() {
        composeTestRule.assertTextDisplayed("Your Progress")
    }

    @Test
    fun examMenu_displaysCategoriesSection() {
        scrollToTextInList("Categories")
        composeTestRule.assertTextDisplayed("Categories")
    }

    @Test
    fun examMenu_displaysModeButtons() {
        scrollToTextInList("Learn Mode")
        composeTestRule.assertTextDisplayed("Learn Mode")
        scrollToTextInList("Leitner Mode")
        composeTestRule.assertTextDisplayed("Leitner Mode")
        scrollToTextInList("Exam Mode")
        composeTestRule.assertTextDisplayed("Exam Mode")
    }

    @Test
    fun examMenu_displaysProgressStats() {
        composeTestRule.assertTextDisplayed("Questions")
        composeTestRule.assertTextDisplayed("Correct")
        composeTestRule.assertTextDisplayed("Answered")
    }

    @Test
    fun examMenu_displaysInitialProgressValues() {
        composeTestRule.assertTextDisplayed("0%")
    }

    @Test
    fun examMenu_displaysCategoryNames() {
        scrollToTextInList("Categories")
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
        scrollToTextInList("Leitner Mode")
        composeTestRule.onNodeWithText("Leitner Mode").performClick()
        composeTestRule.waitForText("New / Failed", timeoutMs = 10_000)
        composeTestRule.assertTextDisplayed("Leitner Mode")
    }

    @Test
    fun leitnerMode_displaysBoxLabels() {
        scrollToTextInList("Leitner Mode")
        composeTestRule.onNodeWithText("Leitner Mode").performClick()
        composeTestRule.waitForText("New / Failed", timeoutMs = 10_000)
        composeTestRule.assertTextDisplayed("New / Failed")
    }

    @Test
    fun leitnerMode_displaysStartSession() {
        scrollToTextInList("Leitner Mode")
        composeTestRule.onNodeWithText("Leitner Mode").performClick()
        composeTestRule.waitForText("New / Failed", timeoutMs = 10_000)
        scrollToTextInList("Start Session")
        composeTestRule.assertTextDisplayed("Start Session")
    }

    @Test
    fun leitnerMode_backReturnsToMenu() {
        scrollToTextInList("Leitner Mode")
        composeTestRule.onNodeWithText("Leitner Mode").performClick()
        composeTestRule.waitForText("New / Failed", timeoutMs = 10_000)
        composeTestRule.onNodeWithContentDescription("Back").performClick()
        composeTestRule.waitForText("Categories")
        composeTestRule.assertTextDisplayed("Your Progress")
    }

    // --- Exam Mode tests ---

    @Test
    fun examMode_displaysTitle() {
        scrollToTextInList("Exam Mode")
        composeTestRule.onNodeWithText("Exam Mode").performClick()
        composeTestRule.waitForText("Exam Mode", timeoutMs = 10_000)
        composeTestRule.assertTextDisplayed("Exam Mode")
    }

    // --- Back navigation ---

    @Test
    fun examQuiz_backNavigationReturnsHome() {
        composeTestRule.onNodeWithContentDescription("Back").performClick()
        composeTestRule.waitForText("OpenAnchor")
    }
}
