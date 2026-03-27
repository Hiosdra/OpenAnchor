package com.hiosdra.openanchor.ui.exam

import androidx.activity.ComponentActivity
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.hasScrollToNodeAction
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onFirst
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollToNode
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.hiosdra.openanchor.core.ui.R
import com.hiosdra.openanchor.ui.theme.OpenAnchorTheme
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.flow.MutableStateFlow
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config

@RunWith(AndroidJUnit4::class)
@Config(sdk = [35])
class ExamQuizScreenTest {

    @get:Rule
    val composeRule = createAndroidComposeRule<ComponentActivity>()

    private lateinit var viewModel: ExamQuizViewModel
    private lateinit var pdfRenderer: ExamPdfRenderer
    private lateinit var state: MutableStateFlow<ExamQuizUiState>
    private var onBackCalled = false

    @Before
    fun setUp() {
        ExamQuestionsDb.init(composeRule.activity)
        pdfRenderer = mockk(relaxed = true)
        viewModel = mockk(relaxed = true)
        state = MutableStateFlow(menuState())
        every { viewModel.uiState } returns state
        every { viewModel.pdfRenderer } returns pdfRenderer
        onBackCalled = false
    }

    private fun setContent() {
        composeRule.setContent {
            OpenAnchorTheme {
                ExamQuizScreen(onBack = { onBackCalled = true }, viewModel = viewModel)
            }
        }
    }

    private fun str(id: Int) = composeRule.activity.getString(id)

    /** Scroll the first LazyColumn on screen until [text] is visible. */
    private fun scrollTo(text: String) {
        composeRule.onAllNodes(hasScrollToNodeAction())
            .onFirst()
            .performScrollToNode(hasText(text))
    }

    // ========================================================================
    // ORIGINAL SMOKE TEST (preserved)
    // ========================================================================

    @Test
    fun examQuizScreen_rendersMenuLearnExamResultsAndLeitnerStates() {
        setContent()
        composeRule.onNodeWithText("75%").assertIsDisplayed()

        state.value = learnState()
        composeRule.waitForIdle()
        composeRule.onNodeWithText("1 / 1").assertIsDisplayed()
        composeRule.onNodeWithText("A").assertIsDisplayed()

        state.value = examState()
        composeRule.waitForIdle()
        composeRule.onNodeWithText(str(R.string.exam_start)).assertIsDisplayed()
        composeRule.onNodeWithText("1 / 1").assertIsDisplayed()

        state.value = resultsState()
        composeRule.waitForIdle()
        composeRule.onNodeWithText(str(R.string.exam_results_title)).assertIsDisplayed()
        composeRule.onNodeWithText("100%").assertIsDisplayed()

        state.value = leitnerOverviewState()
        composeRule.waitForIdle()
        scrollTo("Box 1")
        composeRule.onNodeWithText("Box 1").assertIsDisplayed()

        state.value = leitnerSessionState()
        composeRule.waitForIdle()
        composeRule.onNodeWithText("1 / 1").assertIsDisplayed()

        state.value = leitnerCompleteState()
        composeRule.waitForIdle()
        composeRule.onNodeWithText("1").assertIsDisplayed()
    }

    // ========================================================================
    // MENU – rendering
    // ========================================================================

    @Test
    fun menu_displaysStatsAndProgress() {
        setContent()
        composeRule.onNodeWithText(str(R.string.exam_progress)).assertIsDisplayed()
        composeRule.onNodeWithText("75%").assertIsDisplayed()
    }

    @Test
    fun menu_displaysStatCounts() {
        setContent()
        composeRule.onNodeWithText("3").assertIsDisplayed()   // correctCount
        composeRule.onNodeWithText("4").assertIsDisplayed()   // totalAnswered
    }

    @Test
    fun menu_displaysCategories() {
        setContent()
        scrollTo(str(R.string.exam_categories))
        composeRule.onNodeWithText(str(R.string.exam_categories)).assertIsDisplayed()
    }

    @Test
    fun menu_withZeroAnswers_doesNotShowResetButton() {
        state.value = menuState().copy(stats = ExamStats())
        setContent()
        composeRule.onNodeWithText(str(R.string.exam_reset_progress)).assertDoesNotExist()
    }

    // ========================================================================
    // MENU – interactions
    // ========================================================================

    @Test
    fun menu_clickLearnMode_callsStartLearn() {
        setContent()
        scrollTo(str(R.string.exam_learn))
        composeRule.onNodeWithText(str(R.string.exam_learn)).performClick()
        verify { viewModel.startLearnMode() }
    }

    @Test
    fun menu_clickExamMode_callsStartExam() {
        setContent()
        scrollTo(str(R.string.exam_start))
        composeRule.onNodeWithText(str(R.string.exam_start)).performClick()
        verify { viewModel.startExamMode() }
    }

    @Test
    fun menu_clickLeitner_callsOpenLeitner() {
        setContent()
        scrollTo(str(R.string.leitner_title))
        composeRule.onAllNodesWithText(str(R.string.leitner_title)).onFirst().performClick()
        verify { viewModel.openLeitner() }
    }

    @Test
    fun menu_clickBack_callsOnBack() {
        setContent()
        composeRule.onNodeWithContentDescription(str(R.string.exam_back)).performClick()
        assert(onBackCalled)
    }

    @Test
    fun menu_resetProgress_confirmCallsResetStats() {
        setContent()
        scrollTo(str(R.string.exam_reset_progress))
        composeRule.onNodeWithText(str(R.string.exam_reset_progress)).performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithText(str(R.string.exam_reset_title)).assertIsDisplayed()
        composeRule.onNodeWithText(str(R.string.exam_reset_message)).assertIsDisplayed()
        composeRule.onNodeWithText(str(R.string.exam_reset_confirm)).performClick()
        verify { viewModel.resetStats() }
    }

    @Test
    fun menu_resetProgress_cancelDismissesDialog() {
        setContent()
        scrollTo(str(R.string.exam_reset_progress))
        composeRule.onNodeWithText(str(R.string.exam_reset_progress)).performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithText(str(R.string.cancel)).performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithText(str(R.string.exam_reset_title)).assertDoesNotExist()
    }

    // ========================================================================
    // LEARN MODE – rendering
    // ========================================================================

    @Test
    fun learn_rendersQuestionProgressAndAnswers() {
        state.value = learnState()
        setContent()
        composeRule.onNodeWithText(str(R.string.exam_learn)).assertIsDisplayed()
        composeRule.onNodeWithText("1 / 1").assertIsDisplayed()
        composeRule.onNodeWithText("A").assertIsDisplayed()
        composeRule.onNodeWithText("B").assertIsDisplayed()
        composeRule.onNodeWithText("C").assertIsDisplayed()
    }

    @Test
    fun learn_rendersLearnStats() {
        state.value = learnState()
        setContent()
        composeRule.onNodeWithText("1 OK").assertIsDisplayed()
        composeRule.onNodeWithText("0 Err").assertIsDisplayed()
    }

    @Test
    fun learn_withNoAnswer_showsSkipButton() {
        state.value = learnState()
        setContent()
        composeRule.onNodeWithText(str(R.string.exam_skip)).assertIsDisplayed()
    }

    @Test
    fun learn_withSelectedAnswer_showsNextButton() {
        state.value = learnState().copy(selectedAnswer = "A")
        setContent()
        composeRule.onNodeWithText(str(R.string.exam_next)).assertIsDisplayed()
    }

    @Test
    fun learn_emptyFilteredQuestions_showsEmptyState() {
        state.value = learnState().copy(filteredQuestions = emptyList())
        setContent()
        composeRule.onNodeWithText(str(R.string.exam_no_questions)).assertIsDisplayed()
    }

    @Test
    fun learn_withCategoryFilter_showsSelectAllAndDeselectAll() {
        state.value = learnState().copy(showCategoryFilter = true)
        setContent()
        composeRule.onNodeWithText(str(R.string.exam_select_all)).assertIsDisplayed()
        composeRule.onNodeWithText(str(R.string.exam_deselect_all)).assertIsDisplayed()
    }

    // ========================================================================
    // LEARN MODE – interactions
    // ========================================================================

    @Test
    fun learn_clickAnswer_callsSelectAnswer() {
        state.value = learnState()
        setContent()
        composeRule.onNodeWithText("B").performClick()
        verify { viewModel.selectAnswer("B") }
    }

    @Test
    fun learn_clickSkip_callsNextQuestion() {
        state.value = learnState()
        setContent()
        composeRule.onNodeWithText(str(R.string.exam_skip)).performClick()
        verify { viewModel.nextQuestion() }
    }

    @Test
    fun learn_clickNext_callsNextQuestion() {
        state.value = learnState().copy(selectedAnswer = "A")
        setContent()
        composeRule.onNodeWithText(str(R.string.exam_next)).performClick()
        verify { viewModel.nextQuestion() }
    }

    @Test
    fun learn_clickPrevious_callsPreviousQuestion() {
        state.value = learnState().copy(
            currentIndex = 1,
            filteredQuestions = listOf(sampleQuestion(), sampleQuestion(id = 2)),
        )
        setContent()
        composeRule.onNodeWithText(str(R.string.exam_previous)).performClick()
        verify { viewModel.previousQuestion() }
    }

    @Test
    fun learn_clickBack_callsGoToMenu() {
        state.value = learnState()
        setContent()
        composeRule.onNodeWithContentDescription(str(R.string.exam_back)).performClick()
        verify { viewModel.goToMenu() }
    }

    @Test
    fun learn_clickFilter_callsToggleCategoryFilter() {
        state.value = learnState()
        setContent()
        composeRule.onNodeWithContentDescription(str(R.string.exam_filter)).performClick()
        verify { viewModel.toggleCategoryFilter() }
    }

    @Test
    fun learn_categoryFilter_clickSelectAll() {
        state.value = learnState().copy(showCategoryFilter = true)
        setContent()
        composeRule.onNodeWithText(str(R.string.exam_select_all)).performClick()
        verify { viewModel.selectAllCategories() }
    }

    @Test
    fun learn_categoryFilter_clickDeselectAll() {
        state.value = learnState().copy(showCategoryFilter = true)
        setContent()
        composeRule.onNodeWithText(str(R.string.exam_deselect_all)).performClick()
        verify { viewModel.deselectAllCategories() }
    }

    @Test
    fun learn_categoryFilter_clickCategory_callsToggleCategory() {
        // Use LOCJA to avoid ambiguity with the question's NAWIGACJA CategoryChip
        state.value = learnState().copy(showCategoryFilter = true)
        setContent()
        composeRule.onNodeWithText(ExamCategory.LOCJA.displayName).performClick()
        verify { viewModel.toggleCategory(ExamCategory.LOCJA) }
    }

    // ========================================================================
    // EXAM MODE – rendering
    // ========================================================================

    @Test
    fun exam_rendersTimerAndProgress() {
        state.value = examState()
        setContent()
        composeRule.onNodeWithText(str(R.string.exam_start)).assertIsDisplayed()
        composeRule.onNodeWithText("2:00").assertIsDisplayed()
        composeRule.onNodeWithText("1 / 1").assertIsDisplayed()
    }

    @Test
    fun exam_timeWarning_rendersCorrectTime() {
        state.value = examState().copy(examTimeLeftSeconds = 299)
        setContent()
        composeRule.onNodeWithText("4:59").assertIsDisplayed()
    }

    @Test
    fun exam_showsAnsweredCount() {
        state.value = examState()
        setContent()
        val answeredText = "1 ${str(R.string.exam_stat_answered).lowercase()}"
        composeRule.onNodeWithText(answeredText).assertIsDisplayed()
    }

    @Test
    fun exam_lastQuestion_showsFinishButton() {
        state.value = examState()
        setContent()
        val finishText = "${str(R.string.exam_finish)} (1/1)"
        composeRule.onNodeWithText(finishText).assertIsDisplayed()
    }

    @Test
    fun exam_notLastQuestion_showsNextButton() {
        state.value = examState().copy(
            examQuestions = listOf(sampleQuestion(), sampleQuestion(id = 2)),
            currentIndex = 0,
        )
        setContent()
        composeRule.onNodeWithText(str(R.string.exam_next)).assertIsDisplayed()
    }

    // ========================================================================
    // EXAM MODE – interactions
    // ========================================================================

    @Test
    fun exam_clickAnswer_callsSelectExamAnswer() {
        state.value = examState().copy(examAnswers = emptyMap())
        setContent()
        composeRule.onNodeWithText("A").performClick()
        verify { viewModel.selectExamAnswer(1, "A") }
    }

    @Test
    fun exam_clickNext_callsNextExamQuestion() {
        state.value = examState().copy(
            examQuestions = listOf(sampleQuestion(), sampleQuestion(id = 2)),
            currentIndex = 0,
        )
        setContent()
        composeRule.onNodeWithText(str(R.string.exam_next)).performClick()
        verify { viewModel.nextExamQuestion() }
    }

    @Test
    fun exam_clickPrevious_callsPreviousExamQuestion() {
        state.value = examState().copy(
            examQuestions = listOf(sampleQuestion(), sampleQuestion(id = 2)),
            currentIndex = 1,
        )
        setContent()
        composeRule.onNodeWithText(str(R.string.exam_previous)).performClick()
        verify { viewModel.previousExamQuestion() }
    }

    @Test
    fun exam_clickQuestionDot_callsGoToExamQuestion() {
        state.value = examState().copy(
            examQuestions = listOf(sampleQuestion(), sampleQuestion(id = 2)),
            examAnswers = emptyMap(),
            currentIndex = 0,
        )
        setContent()
        scrollTo("2")
        composeRule.onNodeWithText("2").performClick()
        verify { viewModel.goToExamQuestion(1) }
    }

    @Test
    fun exam_clickFinish_confirmCallsFinishExam() {
        state.value = examState()
        setContent()
        val finishText = "${str(R.string.exam_finish)} (1/1)"
        composeRule.onNodeWithText(finishText).performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithText(str(R.string.exam_finish_title)).assertIsDisplayed()
        composeRule.onNodeWithText(str(R.string.exam_finish_confirm)).performClick()
        verify { viewModel.finishExam() }
    }

    @Test
    fun exam_clickFinish_cancelDismissesDialog() {
        state.value = examState()
        setContent()
        val finishText = "${str(R.string.exam_finish)} (1/1)"
        composeRule.onNodeWithText(finishText).performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithText(str(R.string.cancel)).performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithText(str(R.string.exam_finish_title)).assertDoesNotExist()
    }

    @Test
    fun exam_finishDialog_showsUnansweredMessage() {
        state.value = examState().copy(
            examQuestions = listOf(sampleQuestion(), sampleQuestion(id = 2)),
            examAnswers = mapOf(1 to "A"),
            currentIndex = 1,
        )
        setContent()
        val finishText = "${str(R.string.exam_finish)} (1/2)"
        composeRule.onNodeWithText(finishText).performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithText(str(R.string.exam_finish_title)).assertIsDisplayed()
    }

    @Test
    fun exam_clickBack_showsQuitDialogAndConfirmQuits() {
        state.value = examState()
        setContent()
        composeRule.onNodeWithContentDescription(str(R.string.exam_back)).performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithText(str(R.string.exam_quit_title)).assertIsDisplayed()
        composeRule.onNodeWithText(str(R.string.exam_quit_message)).assertIsDisplayed()
        composeRule.onNodeWithText(str(R.string.exam_quit_confirm)).performClick()
        verify { viewModel.goToMenu() }
    }

    @Test
    fun exam_clickBack_cancelDismissesQuitDialog() {
        state.value = examState()
        setContent()
        composeRule.onNodeWithContentDescription(str(R.string.exam_back)).performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithText(str(R.string.cancel)).performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithText(str(R.string.exam_quit_title)).assertDoesNotExist()
    }

    // ========================================================================
    // RESULTS – rendering
    // ========================================================================

    @Test
    fun results_passed_displaysPassedMessage() {
        state.value = resultsState()
        setContent()
        composeRule.onNodeWithText(str(R.string.exam_results_title)).assertIsDisplayed()
        composeRule.onNodeWithText("100%").assertIsDisplayed()
        scrollTo(str(R.string.exam_passed))
        composeRule.onNodeWithText(str(R.string.exam_passed)).assertIsDisplayed()
    }

    @Test
    fun results_failed_displaysFailedMessage() {
        state.value = resultsState().copy(
            examResults = listOf(
                ExamResult(sampleQuestion(), "B", false),
                ExamResult(sampleQuestion(id = 2), "A", true),
                ExamResult(sampleQuestion(id = 3), "C", false),
            ),
        )
        setContent()
        composeRule.onNodeWithText("33%").assertIsDisplayed()
        scrollTo(str(R.string.exam_failed))
        composeRule.onNodeWithText(str(R.string.exam_failed)).assertIsDisplayed()
    }

    @Test
    fun results_displaysTimeTaken() {
        state.value = resultsState()
        setContent()
        // 90 seconds = 1:30
        composeRule.onNodeWithText("1:30", substring = true).assertIsDisplayed()
    }

    @Test
    fun results_displaysCategoryBreakdown() {
        state.value = resultsState()
        setContent()
        scrollTo(str(R.string.exam_results_by_category))
        composeRule.onNodeWithText(str(R.string.exam_results_by_category)).assertIsDisplayed()
    }

    @Test
    fun results_emptyResults_showsZeroPercent() {
        state.value = resultsState().copy(examResults = emptyList())
        setContent()
        composeRule.onNodeWithText("0%").assertIsDisplayed()
    }

    @Test
    fun results_multipleCategories_showsAllCategoryNames() {
        state.value = resultsState().copy(
            examResults = listOf(
                ExamResult(sampleQuestion(), "A", true),
                ExamResult(
                    sampleQuestion(id = 2).copy(category = ExamCategory.LOCJA),
                    "B",
                    false,
                ),
            ),
        )
        setContent()
        scrollTo(ExamCategory.NAWIGACJA.displayName)
        composeRule.onNodeWithText(ExamCategory.NAWIGACJA.displayName).assertIsDisplayed()
        composeRule.onNodeWithText(ExamCategory.LOCJA.displayName).assertIsDisplayed()
    }

    // ========================================================================
    // RESULTS – interactions
    // ========================================================================

    @Test
    fun results_clickShowDetails_revealsResultItems() {
        state.value = resultsState()
        setContent()
        scrollTo(str(R.string.exam_show_details))
        composeRule.onNodeWithText(str(R.string.exam_show_details)).performClick()
        composeRule.waitForIdle()
        scrollTo("OK")
        composeRule.onNodeWithText("OK").assertIsDisplayed()
        scrollTo(str(R.string.exam_hide_details))
        composeRule.onNodeWithText(str(R.string.exam_hide_details)).assertIsDisplayed()
    }

    @Test
    fun results_clickHideDetails_collapses() {
        state.value = resultsState()
        setContent()
        scrollTo(str(R.string.exam_show_details))
        composeRule.onNodeWithText(str(R.string.exam_show_details)).performClick()
        composeRule.waitForIdle()
        scrollTo(str(R.string.exam_hide_details))
        composeRule.onNodeWithText(str(R.string.exam_hide_details)).performClick()
        composeRule.waitForIdle()
        scrollTo(str(R.string.exam_show_details))
        composeRule.onNodeWithText(str(R.string.exam_show_details)).assertIsDisplayed()
    }

    @Test
    fun results_detailsShowIncorrectWithErrLabel() {
        state.value = resultsState().copy(
            examResults = listOf(ExamResult(sampleQuestion(), "B", false)),
        )
        setContent()
        scrollTo(str(R.string.exam_show_details))
        composeRule.onNodeWithText(str(R.string.exam_show_details)).performClick()
        composeRule.waitForIdle()
        scrollTo("ERR")
        composeRule.onNodeWithText("ERR").assertIsDisplayed()
    }

    @Test
    fun results_detailsShowIncorrectAnswerVsCorrect() {
        state.value = resultsState().copy(
            examResults = listOf(ExamResult(sampleQuestion(), "B", false)),
        )
        setContent()
        scrollTo(str(R.string.exam_show_details))
        composeRule.onNodeWithText(str(R.string.exam_show_details)).performClick()
        composeRule.waitForIdle()
        val answerInfo = "${str(R.string.exam_your_answer)}: B  |  ${str(R.string.exam_correct_answer)}: A"
        scrollTo(answerInfo)
        composeRule.onNodeWithText(answerInfo).assertIsDisplayed()
    }

    @Test
    fun results_detailsShowQuestionId() {
        state.value = resultsState()
        setContent()
        scrollTo(str(R.string.exam_show_details))
        composeRule.onNodeWithText(str(R.string.exam_show_details)).performClick()
        composeRule.waitForIdle()
        scrollTo("#1")
        composeRule.onAllNodesWithText("#1").onFirst().assertIsDisplayed()
    }

    @Test
    fun results_clickRetry_callsStartExamMode() {
        state.value = resultsState()
        setContent()
        scrollTo(str(R.string.exam_retry))
        composeRule.onNodeWithText(str(R.string.exam_retry)).performClick()
        verify { viewModel.startExamMode() }
    }

    @Test
    fun results_clickBackToMenu_callsGoToMenu() {
        state.value = resultsState()
        setContent()
        scrollTo(str(R.string.exam_back_to_menu))
        composeRule.onNodeWithText(str(R.string.exam_back_to_menu)).performClick()
        verify { viewModel.goToMenu() }
    }

    @Test
    fun results_clickBackArrow_callsGoToMenu() {
        state.value = resultsState()
        setContent()
        composeRule.onNodeWithContentDescription(str(R.string.exam_back)).performClick()
        verify { viewModel.goToMenu() }
    }

    // ========================================================================
    // LEITNER OVERVIEW – rendering
    // ========================================================================

    @Test
    fun leitnerOverview_rendersHeaderAndBoxes() {
        state.value = leitnerOverviewState()
        setContent()
        composeRule.onAllNodesWithText(str(R.string.leitner_title)).onFirst().assertIsDisplayed()
        scrollTo("Box 1")
        composeRule.onNodeWithText("Box 1").assertIsDisplayed()
        scrollTo("Box 2")
        composeRule.onNodeWithText("Box 2").assertIsDisplayed()
    }

    @Test
    fun leitnerOverview_showsSessionNumber() {
        state.value = leitnerOverviewState()
        setContent()
        val sessionText = composeRule.activity.getString(R.string.leitner_session, 3)
        scrollTo(sessionText)
        composeRule.onNodeWithText(sessionText).assertIsDisplayed()
    }

    @Test
    fun leitnerOverview_showsDueQuestionCount() {
        state.value = leitnerOverviewState()
        setContent()
        scrollTo(str(R.string.leitner_due_today))
        composeRule.onNodeWithText(str(R.string.leitner_due_today)).assertIsDisplayed()
    }

    @Test
    fun leitnerOverview_noSessions_resetNotShown() {
        state.value = leitnerOverviewState().copy(
            leitnerStats = LeitnerStats(sessionNumber = 0, totalQuestions = 2),
        )
        setContent()
        composeRule.onNodeWithText(str(R.string.leitner_reset)).assertDoesNotExist()
    }

    @Test
    fun leitnerOverview_showsMasteryProgress() {
        state.value = leitnerOverviewState()
        setContent()
        scrollTo(str(R.string.leitner_progress))
        composeRule.onNodeWithText(str(R.string.leitner_progress)).assertIsDisplayed()
    }

    // ========================================================================
    // LEITNER OVERVIEW – interactions
    // ========================================================================

    @Test
    fun leitnerOverview_clickStartSession_callsStartLeitnerSession() {
        state.value = leitnerOverviewState()
        setContent()
        scrollTo(str(R.string.leitner_start))
        composeRule.onNodeWithText(str(R.string.leitner_start)).performClick()
        verify { viewModel.startLeitnerSession() }
    }

    @Test
    fun leitnerOverview_clickBackToMenu_callsGoToMenu() {
        state.value = leitnerOverviewState()
        setContent()
        scrollTo(str(R.string.exam_back_to_menu))
        composeRule.onNodeWithText(str(R.string.exam_back_to_menu)).performClick()
        verify { viewModel.goToMenu() }
    }

    @Test
    fun leitnerOverview_clickBackArrow_callsGoToMenu() {
        state.value = leitnerOverviewState()
        setContent()
        composeRule.onNodeWithContentDescription(str(R.string.exam_back)).performClick()
        verify { viewModel.goToMenu() }
    }

    @Test
    fun leitnerOverview_resetDialog_confirmResetsLeitner() {
        state.value = leitnerOverviewState()
        setContent()
        scrollTo(str(R.string.leitner_reset))
        composeRule.onNodeWithText(str(R.string.leitner_reset)).performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithText(str(R.string.leitner_reset_title)).assertIsDisplayed()
        composeRule.onNodeWithText(str(R.string.leitner_reset_message)).assertIsDisplayed()
        composeRule.onNodeWithText(str(R.string.exam_reset_confirm)).performClick()
        verify { viewModel.resetLeitner() }
    }

    @Test
    fun leitnerOverview_resetDialog_cancelDismisses() {
        state.value = leitnerOverviewState()
        setContent()
        scrollTo(str(R.string.leitner_reset))
        composeRule.onNodeWithText(str(R.string.leitner_reset)).performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithText(str(R.string.cancel)).performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithText(str(R.string.leitner_reset_title)).assertDoesNotExist()
    }

    // ========================================================================
    // LEITNER SESSION – rendering
    // ========================================================================

    @Test
    fun leitnerSession_rendersQuestionAndAnswers() {
        state.value = leitnerSessionState()
        setContent()
        composeRule.onAllNodesWithText(str(R.string.leitner_title)).onFirst().assertIsDisplayed()
        composeRule.onNodeWithText("1 / 1").assertIsDisplayed()
        composeRule.onNodeWithText("A").assertIsDisplayed()
        composeRule.onNodeWithText("B").assertIsDisplayed()
        composeRule.onNodeWithText("C").assertIsDisplayed()
    }

    @Test
    fun leitnerSession_showsRemainingCount() {
        state.value = leitnerSessionState()
        setContent()
        val remaining = composeRule.activity.getString(R.string.leitner_remaining, 1)
        composeRule.onNodeWithText(remaining).assertIsDisplayed()
    }

    @Test
    fun leitnerSession_showsOkAndErrStats() {
        state.value = leitnerSessionState()
        setContent()
        composeRule.onNodeWithText("0 OK").assertIsDisplayed()
        composeRule.onNodeWithText("0 Err").assertIsDisplayed()
    }

    @Test
    fun leitnerSession_withCorrectResult_showsCorrectFeedback() {
        state.value = leitnerSessionState().copy(
            leitnerSelectedAnswer = "A",
            leitnerShowResult = true,
            leitnerLastCorrect = true,
            leitnerLastNewBox = 2,
        )
        setContent()
        val correctText = composeRule.activity.getString(R.string.leitner_correct_advance, 2)
        scrollTo(correctText)
        composeRule.onNodeWithText(correctText).assertIsDisplayed()
        composeRule.onNodeWithText(str(R.string.leitner_continue)).assertIsDisplayed()
    }

    @Test
    fun leitnerSession_withIncorrectResult_showsIncorrectFeedback() {
        state.value = leitnerSessionState().copy(
            leitnerSelectedAnswer = "B",
            leitnerShowResult = true,
            leitnerLastCorrect = false,
        )
        setContent()
        scrollTo(str(R.string.leitner_incorrect_back))
        composeRule.onNodeWithText(str(R.string.leitner_incorrect_back)).assertIsDisplayed()
    }

    @Test
    fun leitnerSession_noQuestion_showsEmptyState() {
        state.value = leitnerSessionState().copy(leitnerCurrentQuestion = null)
        setContent()
        composeRule.onNodeWithText(str(R.string.leitner_no_due)).assertIsDisplayed()
    }

    // ========================================================================
    // LEITNER SESSION – interactions
    // ========================================================================

    @Test
    fun leitnerSession_clickAnswer_callsSelectLeitnerAnswer() {
        state.value = leitnerSessionState()
        setContent()
        composeRule.onNodeWithText("A").performClick()
        verify { viewModel.selectLeitnerAnswer("A") }
    }

    @Test
    fun leitnerSession_clickContinue_callsNextLeitnerQuestion() {
        state.value = leitnerSessionState().copy(
            leitnerSelectedAnswer = "A",
            leitnerShowResult = true,
            leitnerLastCorrect = true,
            leitnerLastNewBox = 2,
        )
        setContent()
        composeRule.onNodeWithText(str(R.string.leitner_continue)).performClick()
        verify { viewModel.nextLeitnerQuestion() }
    }

    @Test
    fun leitnerSession_clickBack_showsQuitDialog() {
        state.value = leitnerSessionState()
        setContent()
        composeRule.onNodeWithContentDescription(str(R.string.exam_back)).performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithText(str(R.string.exam_quit_title)).assertIsDisplayed()
        composeRule.onNodeWithText(str(R.string.exam_quit_message)).assertIsDisplayed()
    }

    @Test
    fun leitnerSession_quitDialogConfirm_callsFinishLeitnerSession() {
        state.value = leitnerSessionState()
        setContent()
        composeRule.onNodeWithContentDescription(str(R.string.exam_back)).performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithText(str(R.string.exam_quit_confirm)).performClick()
        verify { viewModel.finishLeitnerSession() }
    }

    @Test
    fun leitnerSession_quitDialogCancel_dismisses() {
        state.value = leitnerSessionState()
        setContent()
        composeRule.onNodeWithContentDescription(str(R.string.exam_back)).performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithText(str(R.string.cancel)).performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithText(str(R.string.exam_quit_title)).assertDoesNotExist()
    }

    // ========================================================================
    // LEITNER SESSION COMPLETE – rendering
    // ========================================================================

    @Test
    fun leitnerComplete_rendersStats() {
        state.value = leitnerCompleteState()
        setContent()
        composeRule.onAllNodesWithText(str(R.string.leitner_session_complete)).onFirst().assertIsDisplayed()
        val statsText = composeRule.activity.getString(R.string.leitner_session_stats, 1, 0)
        scrollTo(statsText)
        composeRule.onNodeWithText(statsText).assertIsDisplayed()
    }

    @Test
    fun leitnerComplete_showsMasteryProgress() {
        state.value = leitnerCompleteState()
        setContent()
        scrollTo(str(R.string.leitner_progress))
        composeRule.onNodeWithText(str(R.string.leitner_progress)).assertIsDisplayed()
    }

    // ========================================================================
    // LEITNER SESSION COMPLETE – interactions
    // ========================================================================

    @Test
    fun leitnerComplete_clickNewSession_callsStartLeitnerSession() {
        state.value = leitnerCompleteState()
        setContent()
        scrollTo(str(R.string.leitner_start))
        composeRule.onNodeWithText(str(R.string.leitner_start)).performClick()
        verify { viewModel.startLeitnerSession() }
    }

    @Test
    fun leitnerComplete_clickBackToMenu_callsOpenLeitner() {
        state.value = leitnerCompleteState()
        setContent()
        scrollTo(str(R.string.exam_back_to_menu))
        composeRule.onNodeWithText(str(R.string.exam_back_to_menu)).performClick()
        verify { viewModel.openLeitner() }
    }

    @Test
    fun leitnerComplete_clickBackArrow_callsOpenLeitner() {
        state.value = leitnerCompleteState()
        setContent()
        composeRule.onNodeWithContentDescription(str(R.string.exam_back)).performClick()
        verify { viewModel.openLeitner() }
    }

    // ========================================================================
    // STATE FACTORIES
    // ========================================================================

    private fun menuState() = ExamQuizUiState(
        screen = ExamScreenState.Menu,
        allQuestions = listOf(sampleQuestion()),
        filteredQuestions = listOf(sampleQuestion()),
        stats = ExamStats(totalAnswered = 4, correctCount = 3, incorrectCount = 1),
    )

    private fun learnState() = ExamQuizUiState(
        screen = ExamScreenState.Learn,
        allQuestions = listOf(sampleQuestion()),
        filteredQuestions = listOf(sampleQuestion()),
        currentIndex = 0,
        stats = ExamStats(totalAnswered = 1, correctCount = 1, incorrectCount = 0),
    )

    private fun examState() = ExamQuizUiState(
        screen = ExamScreenState.Exam,
        allQuestions = listOf(sampleQuestion()),
        filteredQuestions = listOf(sampleQuestion()),
        examQuestions = listOf(sampleQuestion()),
        examAnswers = mapOf(1 to "A"),
        examTimeLeftSeconds = 120,
    )

    private fun resultsState() = ExamQuizUiState(
        screen = ExamScreenState.Results,
        allQuestions = listOf(sampleQuestion()),
        filteredQuestions = listOf(sampleQuestion()),
        examQuestions = listOf(sampleQuestion()),
        examResults = listOf(ExamResult(sampleQuestion(), "A", true)),
        examTimeTakenSeconds = 90,
    )

    private fun leitnerOverviewState() = ExamQuizUiState(
        screen = ExamScreenState.Leitner,
        allQuestions = listOf(sampleQuestion()),
        filteredQuestions = listOf(sampleQuestion()),
        leitnerStats = LeitnerStats(sessionNumber = 3, box1Count = 1, box2Count = 1, totalQuestions = 2),
        leitnerBoxCounts = mapOf(LeitnerBox.BOX_1 to 1, LeitnerBox.BOX_2 to 1),
        leitnerDueQuestions = listOf(sampleQuestion()),
    )

    private fun leitnerSessionState() = ExamQuizUiState(
        screen = ExamScreenState.LeitnerSession,
        allQuestions = listOf(sampleQuestion()),
        filteredQuestions = listOf(sampleQuestion()),
        leitnerCurrentQuestion = sampleQuestion(),
        leitnerSessionTotal = 1,
        leitnerSessionRemaining = 1,
    )

    private fun leitnerCompleteState() = ExamQuizUiState(
        screen = ExamScreenState.LeitnerSessionComplete,
        allQuestions = listOf(sampleQuestion()),
        filteredQuestions = listOf(sampleQuestion()),
        leitnerSessionTotal = 1,
        leitnerSessionCorrect = 1,
        leitnerSessionIncorrect = 0,
        leitnerBoxCounts = mapOf(LeitnerBox.BOX_1 to 1),
    )

    private fun sampleQuestion(id: Int = 1) = ExamQuestion(
        id = id,
        category = ExamCategory.NAWIGACJA,
        correctAnswer = "A",
        answerCount = 3,
        pdfPage = 0,
        cropYStart = 100f,
        cropYEnd = 200f,
        pageHeight = 842f,
    )
}
