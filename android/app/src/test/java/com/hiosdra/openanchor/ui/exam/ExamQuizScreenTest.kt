package com.hiosdra.openanchor.ui.exam

import androidx.activity.ComponentActivity
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.hiosdra.openanchor.R
import com.hiosdra.openanchor.ui.theme.OpenAnchorTheme
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.flow.MutableStateFlow
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config

@RunWith(AndroidJUnit4::class)
@Config(sdk = [35])
class ExamQuizScreenTest {

    @get:Rule
    val composeRule = createAndroidComposeRule<ComponentActivity>()

    @Test
    fun examQuizScreen_rendersMenuLearnExamResultsAndLeitnerStates() {
        ExamQuestionsDb.init(composeRule.activity)
        val viewModel = mockk<ExamQuizViewModel>(relaxed = true)
        val state = MutableStateFlow(menuState())
        every { viewModel.uiState } returns state

        composeRule.setContent {
            OpenAnchorTheme {
                ExamQuizScreen(onBack = {}, viewModel = viewModel)
            }
        }

        composeRule.onNodeWithText("75%").assertIsDisplayed()

        state.value = learnState()
        composeRule.waitForIdle()
        composeRule.onNodeWithText("1 / 1").assertIsDisplayed()
        composeRule.onNodeWithText("A").assertIsDisplayed()

        state.value = examState()
        composeRule.waitForIdle()
        composeRule.onNodeWithText(composeRule.activity.getString(R.string.exam_start)).assertIsDisplayed()
        composeRule.onNodeWithText("1 / 1").assertIsDisplayed()

        state.value = resultsState()
        composeRule.waitForIdle()
        composeRule.onNodeWithText(composeRule.activity.getString(R.string.exam_results_title)).assertIsDisplayed()
        composeRule.onNodeWithText("100%").assertIsDisplayed()

        state.value = leitnerOverviewState()
        composeRule.waitForIdle()
        composeRule.onNodeWithText("Box 1").assertIsDisplayed()

        state.value = leitnerSessionState()
        composeRule.waitForIdle()
        composeRule.onNodeWithText("1 / 1").assertIsDisplayed()

        state.value = leitnerCompleteState()
        composeRule.waitForIdle()
        composeRule.onNodeWithText("1").assertIsDisplayed()
    }

    private fun menuState() = ExamQuizUiState(
        screen = ExamScreenState.Menu,
        allQuestions = listOf(sampleQuestion()),
        filteredQuestions = listOf(sampleQuestion()),
        stats = ExamStats(totalAnswered = 4, correctCount = 3, incorrectCount = 1)
    )

    private fun learnState() = ExamQuizUiState(
        screen = ExamScreenState.Learn,
        allQuestions = listOf(sampleQuestion()),
        filteredQuestions = listOf(sampleQuestion()),
        currentIndex = 0,
        stats = ExamStats(totalAnswered = 1, correctCount = 1, incorrectCount = 0)
    )

    private fun examState() = ExamQuizUiState(
        screen = ExamScreenState.Exam,
        allQuestions = listOf(sampleQuestion()),
        filteredQuestions = listOf(sampleQuestion()),
        examQuestions = listOf(sampleQuestion()),
        examAnswers = mapOf(1 to "A"),
        examTimeLeftSeconds = 120
    )

    private fun resultsState() = ExamQuizUiState(
        screen = ExamScreenState.Results,
        allQuestions = listOf(sampleQuestion()),
        filteredQuestions = listOf(sampleQuestion()),
        examQuestions = listOf(sampleQuestion()),
        examResults = listOf(
            ExamResult(sampleQuestion(), "A", true)
        ),
        examTimeTakenSeconds = 90
    )

    private fun leitnerOverviewState() = ExamQuizUiState(
        screen = ExamScreenState.Leitner,
        allQuestions = listOf(sampleQuestion()),
        filteredQuestions = listOf(sampleQuestion()),
        leitnerStats = LeitnerStats(sessionNumber = 3, box1Count = 1, box2Count = 1, totalQuestions = 2),
        leitnerBoxCounts = mapOf(LeitnerBox.BOX_1 to 1, LeitnerBox.BOX_2 to 1),
        leitnerDueQuestions = listOf(sampleQuestion())
    )

    private fun leitnerSessionState() = ExamQuizUiState(
        screen = ExamScreenState.LeitnerSession,
        allQuestions = listOf(sampleQuestion()),
        filteredQuestions = listOf(sampleQuestion()),
        leitnerCurrentQuestion = sampleQuestion(),
        leitnerSessionTotal = 1,
        leitnerSessionRemaining = 1
    )

    private fun leitnerCompleteState() = ExamQuizUiState(
        screen = ExamScreenState.LeitnerSessionComplete,
        allQuestions = listOf(sampleQuestion()),
        filteredQuestions = listOf(sampleQuestion()),
        leitnerSessionTotal = 1,
        leitnerSessionCorrect = 1,
        leitnerSessionIncorrect = 0,
        leitnerBoxCounts = mapOf(LeitnerBox.BOX_1 to 1)
    )

    private fun sampleQuestion() = ExamQuestion(
        id = 1,
        category = ExamCategory.NAWIGACJA,
        correctAnswer = "A",
        answerCount = 3,
        imageAsset = "missing.jpg"
    )
}
