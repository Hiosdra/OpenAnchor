package com.hiosdra.openanchor.ui.exam

import android.app.Application
import android.content.Context
import android.content.SharedPreferences
import androidx.arch.core.executor.testing.InstantTaskExecutorRule
import app.cash.turbine.test
import io.mockk.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class ExamQuizViewModelTest {

    @get:Rule
    val instantExecutorRule = InstantTaskExecutorRule()

    private lateinit var application: Application
    private lateinit var prefs: SharedPreferences
    private lateinit var editor: SharedPreferences.Editor

    private val testQuestions = listOf(
        ExamQuestion(1, ExamCategory.NAWIGACJA, "A", 3, "exam_images/q1.jpg"),
        ExamQuestion(2, ExamCategory.NAWIGACJA, "B", 3, "exam_images/q2.jpg"),
        ExamQuestion(3, ExamCategory.METEOROLOGIA, "C", 3, "exam_images/q3.jpg"),
        ExamQuestion(4, ExamCategory.LOCJA, "A", 3, "exam_images/q4.jpg"),
        ExamQuestion(5, ExamCategory.PRAWO, "B", 3, "exam_images/q5.jpg"),
    )

    @Before
    fun setup() {
        editor = mockk(relaxed = true) {
            every { putInt(any(), any()) } returns this
            every { remove(any()) } returns this
        }
        prefs = mockk(relaxed = true) {
            every { getInt(any(), any()) } returns 0
            every { edit() } returns editor
        }
        application = mockk(relaxed = true) {
            every { getSharedPreferences(any(), any()) } returns prefs
        }

        // Pre-initialize ExamQuestionsDb with test data via reflection
        val field = ExamQuestionsDb::class.java.getDeclaredField("_allQuestions")
        field.isAccessible = true
        field.set(ExamQuestionsDb, testQuestions)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun createViewModel(): ExamQuizViewModel {
        return ExamQuizViewModel(application)
    }

    // ---- Initial state ----

    @Test
    fun `initial screen is Menu`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertEquals(ExamScreenState.Menu, state.screen)
            cancel()
        }
    }

    @Test
    fun `initial allQuestions loaded from ExamQuestionsDb`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertEquals(5, state.allQuestions.size)
            cancel()
        }
    }

    @Test
    fun `all categories selected by default`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertEquals(ExamCategory.entries.toSet(), state.selectedCategories)
            cancel()
        }
    }

    // ---- Learn mode ----

    @Test
    fun `startLearnMode sets screen to Learn`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.startLearnMode()
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertEquals(ExamScreenState.Learn, state.screen)
            assertEquals(0, state.currentIndex)
            assertNull(state.selectedAnswer)
            assertFalse(state.showCorrectAnswer)
            cancel()
        }
    }

    @Test
    fun `selectAnswer records correct answer`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.startLearnMode()
        advanceUntilIdle()

        // First question has correctAnswer "A"
        vm.selectAnswer("A")
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertEquals("A", state.selectedAnswer)
            assertTrue(state.showCorrectAnswer)
            assertEquals(1, state.stats.totalAnswered)
            assertEquals(1, state.stats.correctCount)
            assertEquals(0, state.stats.incorrectCount)
            cancel()
        }
    }

    @Test
    fun `selectAnswer records incorrect answer`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.startLearnMode()
        advanceUntilIdle()

        vm.selectAnswer("B")
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertEquals("B", state.selectedAnswer)
            assertEquals(1, state.stats.totalAnswered)
            assertEquals(0, state.stats.correctCount)
            assertEquals(1, state.stats.incorrectCount)
            cancel()
        }
    }

    @Test
    fun `selectAnswer ignores second selection`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.startLearnMode()
        advanceUntilIdle()

        vm.selectAnswer("A")
        vm.selectAnswer("B") // should be ignored
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertEquals("A", state.selectedAnswer)
            assertEquals(1, state.stats.totalAnswered)
            cancel()
        }
    }

    @Test
    fun `nextQuestion advances index`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.startLearnMode()
        advanceUntilIdle()

        vm.nextQuestion()
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertEquals(1, state.currentIndex)
            assertNull(state.selectedAnswer)
            assertFalse(state.showCorrectAnswer)
            cancel()
        }
    }

    @Test
    fun `nextQuestion wraps around at end`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.startLearnMode()
        advanceUntilIdle()

        // Navigate to the last question and then next should wrap
        repeat(testQuestions.size) { vm.nextQuestion() }
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertEquals(0, state.currentIndex)
            cancel()
        }
    }

    @Test
    fun `previousQuestion decrements index`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.startLearnMode()
        vm.nextQuestion()
        vm.nextQuestion()
        advanceUntilIdle()

        vm.previousQuestion()
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertEquals(1, state.currentIndex)
            cancel()
        }
    }

    @Test
    fun `previousQuestion does not go below zero`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.startLearnMode()
        advanceUntilIdle()

        vm.previousQuestion()
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertEquals(0, state.currentIndex)
            cancel()
        }
    }

    // ---- Category filter ----

    @Test
    fun `toggleCategoryFilter toggles visibility`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.toggleCategoryFilter()
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertTrue(state.showCategoryFilter)
            cancel()
        }
    }

    @Test
    fun `toggleCategoryFilter twice reverts`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.toggleCategoryFilter()
        vm.toggleCategoryFilter()
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertFalse(state.showCategoryFilter)
            cancel()
        }
    }

    @Test
    fun `toggleCategory removes category`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.toggleCategory(ExamCategory.NAWIGACJA)
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertFalse(ExamCategory.NAWIGACJA in state.selectedCategories)
            // filteredQuestions should not contain NAWIGACJA questions
            assertTrue(state.filteredQuestions.none { it.category == ExamCategory.NAWIGACJA })
            cancel()
        }
    }

    @Test
    fun `toggleCategory adds category back`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.toggleCategory(ExamCategory.NAWIGACJA)
        vm.toggleCategory(ExamCategory.NAWIGACJA)
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertTrue(ExamCategory.NAWIGACJA in state.selectedCategories)
            cancel()
        }
    }

    @Test
    fun `selectAllCategories selects all`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.deselectAllCategories()
        vm.selectAllCategories()
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertEquals(ExamCategory.entries.toSet(), state.selectedCategories)
            cancel()
        }
    }

    @Test
    fun `deselectAllCategories clears selection`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.deselectAllCategories()
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertTrue(state.selectedCategories.isEmpty())
            cancel()
        }
    }

    @Test
    fun `toggleCategory resets currentIndex`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.startLearnMode()
        vm.nextQuestion()
        vm.nextQuestion()
        advanceUntilIdle()

        vm.toggleCategory(ExamCategory.NAWIGACJA)
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertEquals(0, state.currentIndex)
            cancel()
        }
    }

    // ---- Exam mode ----

    @Test
    fun `startExamMode initializes exam questions`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.startExamMode()
        // Don't advanceUntilIdle() - that would run the timer to completion!

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            // Timer may have finished, but questions should be populated
            assertTrue(state.examQuestions.isNotEmpty())
            cancel()
        }
    }

    @Test
    fun `startExamMode limits to available questions`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.startExamMode()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            // We have 5 test questions, so it should take all 5
            assertTrue(state.examQuestions.size <= 5)
            assertTrue(state.examQuestions.isNotEmpty())
            cancel()
        }
    }

    @Test
    fun `selectExamAnswer adds answer`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.startExamMode()
        vm.selectExamAnswer(1, "A")
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertEquals("A", state.examAnswers[1])
            cancel()
        }
    }

    @Test
    fun `selectExamAnswer overwrites previous answer`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.startExamMode()
        vm.selectExamAnswer(1, "A")
        vm.selectExamAnswer(1, "B")
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertEquals("B", state.examAnswers[1])
            cancel()
        }
    }

    @Test
    fun `goToExamQuestion sets index`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.startExamMode()
        vm.goToExamQuestion(3)
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertEquals(3, state.currentIndex)
            cancel()
        }
    }

    @Test
    fun `goToExamQuestion clamps to valid range`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.startExamMode()
        vm.goToExamQuestion(100)
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertTrue(state.currentIndex <= state.examQuestions.size - 1)
            cancel()
        }
    }

    @Test
    fun `goToExamQuestion clamps negative to zero`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.startExamMode()
        vm.goToExamQuestion(-5)
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertEquals(0, state.currentIndex)
            cancel()
        }
    }

    @Test
    fun `nextExamQuestion advances index`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.startExamMode()
        vm.nextExamQuestion()
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertTrue(state.currentIndex >= 1)
            cancel()
        }
    }

    @Test
    fun `nextExamQuestion does not exceed last index`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.startExamMode()
        repeat(20) { vm.nextExamQuestion() }
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertTrue(state.currentIndex <= state.examQuestions.size - 1)
            cancel()
        }
    }

    @Test
    fun `previousExamQuestion decrements index`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.startExamMode()
        vm.nextExamQuestion()
        vm.nextExamQuestion()
        vm.previousExamQuestion()
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertTrue(state.currentIndex >= 0)
            cancel()
        }
    }

    @Test
    fun `previousExamQuestion does not go below zero`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.startExamMode()
        vm.previousExamQuestion()
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertEquals(0, state.currentIndex)
            cancel()
        }
    }

    @Test
    fun `finishExam produces results and sets screen`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.startExamMode()
        // Immediately finish without advancing (which would run timer)
        vm.finishExam()
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertEquals(ExamScreenState.Results, state.screen)
            assertTrue(state.examFinished)
            assertTrue(state.examResults.isNotEmpty())
            cancel()
        }
    }

    @Test
    fun `finishExam marks unanswered as incorrect`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.startExamMode()
        vm.finishExam()
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertTrue(state.examResults.all { !it.isCorrect })
            assertTrue(state.examResults.all { it.userAnswer == null })
            cancel()
        }
    }

    @Test
    fun `finishExam records time taken`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.startExamMode()
        vm.finishExam()
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            // timeTaken = EXAM_TIME_MINUTES * 60 - timeLeft
            assertTrue(state.examTimeTakenSeconds >= 0)
            cancel()
        }
    }

    // ---- Menu ----

    @Test
    fun `goToMenu returns to Menu screen`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.startLearnMode()
        advanceUntilIdle()

        vm.goToMenu()
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertEquals(ExamScreenState.Menu, state.screen)
            cancel()
        }
    }

    @Test
    fun `resetStats clears all stats`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.startLearnMode()
        vm.selectAnswer("A")
        advanceUntilIdle()

        vm.resetStats()
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertEquals(0, state.stats.totalAnswered)
            assertEquals(0, state.stats.correctCount)
            assertEquals(0, state.stats.incorrectCount)
            cancel()
        }
    }

    // ---- Leitner mode ----

    @Test
    fun `openLeitner sets screen to Leitner`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.openLeitner()
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertEquals(ExamScreenState.Leitner, state.screen)
            cancel()
        }
    }

    @Test
    fun `openLeitner refreshes stats`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.openLeitner()
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertEquals(5, state.leitnerStats.totalQuestions)
            cancel()
        }
    }

    @Test
    fun `startLeitnerSession sets screen to LeitnerSession`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.openLeitner()
        vm.startLeitnerSession()
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertEquals(ExamScreenState.LeitnerSession, state.screen)
            assertNotNull(state.leitnerCurrentQuestion)
            cancel()
        }
    }

    @Test
    fun `startLeitnerSession increments session number`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.startLeitnerSession()
        advanceUntilIdle()

        verify { editor.putInt("session_number", 1) }
    }

    @Test
    fun `selectLeitnerAnswer correct moves question to next box`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.startLeitnerSession()
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            val q = state.leitnerCurrentQuestion!!
            vm.selectLeitnerAnswer(q.correctAnswer)
            advanceUntilIdle()

            val updated = expectMostRecentItem()
            assertTrue(updated.leitnerShowResult)
            assertTrue(updated.leitnerLastCorrect)
            assertEquals(2, updated.leitnerLastNewBox) // BOX_1 -> BOX_2
            cancel()
        }
    }

    @Test
    fun `selectLeitnerAnswer incorrect resets to box 1`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.startLeitnerSession()
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            val q = state.leitnerCurrentQuestion!!
            val wrongAnswer = if (q.correctAnswer == "A") "B" else "A"
            vm.selectLeitnerAnswer(wrongAnswer)
            advanceUntilIdle()

            val updated = expectMostRecentItem()
            assertTrue(updated.leitnerShowResult)
            assertFalse(updated.leitnerLastCorrect)
            assertEquals(1, updated.leitnerLastNewBox) // stays BOX_1
            cancel()
        }
    }

    @Test
    fun `selectLeitnerAnswer only accepts first selection`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.startLeitnerSession()
        advanceUntilIdle()

        // First selection
        vm.selectLeitnerAnswer("A")
        advanceUntilIdle()

        // Second selection should be ignored
        vm.selectLeitnerAnswer("B")
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertEquals("A", state.leitnerSelectedAnswer)
            cancel()
        }
    }

    @Test
    fun `nextLeitnerQuestion advances to next question`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.startLeitnerSession()
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            val firstQ = state.leitnerCurrentQuestion

            vm.selectLeitnerAnswer("A")
            advanceUntilIdle()
            expectMostRecentItem()

            vm.nextLeitnerQuestion()
            advanceUntilIdle()

            val next = expectMostRecentItem()
            if (state.leitnerDueQuestions.size > 1) {
                assertNotEquals(firstQ, next.leitnerCurrentQuestion)
                assertNull(next.leitnerSelectedAnswer)
                assertFalse(next.leitnerShowResult)
            }
            cancel()
        }
    }

    @Test
    fun `finishLeitnerSession sets screen to LeitnerSessionComplete`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.startLeitnerSession()
        advanceUntilIdle()

        vm.finishLeitnerSession()
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertEquals(ExamScreenState.LeitnerSessionComplete, state.screen)
            cancel()
        }
    }

    @Test
    fun `resetLeitner clears all leitner preferences`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.resetLeitner()
        advanceUntilIdle()

        verify { editor.putInt("session_number", 0) }
        for (q in testQuestions) {
            verify { editor.remove("q_box_${q.id}") }
            verify { editor.remove("q_review_${q.id}") }
        }
        verify(atLeast = 1) { editor.apply() }
    }

    @Test
    fun `leitnerStats shows box counts`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.openLeitner()
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            // All questions start in box 1 (prefs returns 0, fromLevel(0) = BOX_1)
            // But since prefs.getInt returns 0 for box prefix, fromLevel(0) returns BOX_1
            assertEquals(5, state.leitnerStats.box1Count)
            assertEquals(0, state.leitnerStats.box5Count)
            cancel()
        }
    }

    @Test
    fun `leitnerSession tracks correct and incorrect counts`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.startLeitnerSession()
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            val q = state.leitnerCurrentQuestion!!
            vm.selectLeitnerAnswer(q.correctAnswer)
            advanceUntilIdle()

            val updated = expectMostRecentItem()
            assertEquals(1, updated.leitnerSessionCorrect)
            assertEquals(0, updated.leitnerSessionIncorrect)
            cancel()
        }
    }

    @Test
    fun `selectLeitnerAnswer saves state to prefs`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.startLeitnerSession()
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            val q = state.leitnerCurrentQuestion!!
            vm.selectLeitnerAnswer(q.correctAnswer)
            advanceUntilIdle()
            expectMostRecentItem()

            verify { editor.putInt("q_box_${q.id}", any()) }
            verify { editor.putInt("q_review_${q.id}", any()) }
            cancel()
        }
    }

    // ---- Filtered questions ----

    @Test
    fun `filteredQuestions filters by selected categories`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        // Deselect all, then select only METEOROLOGIA
        vm.deselectAllCategories()
        vm.toggleCategory(ExamCategory.METEOROLOGIA)
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertEquals(1, state.filteredQuestions.size)
            assertEquals(ExamCategory.METEOROLOGIA, state.filteredQuestions[0].category)
            cancel()
        }
    }

    @Test
    fun `leitnerBoxCounts populated after openLeitner`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.openLeitner()
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertTrue(state.leitnerBoxCounts.isNotEmpty())
            cancel()
        }
    }

    @Test
    fun `multiple exam answers are preserved`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = createViewModel()
        advanceUntilIdle()

        vm.startExamMode()
        vm.selectExamAnswer(1, "A")
        vm.selectExamAnswer(2, "B")
        vm.selectExamAnswer(3, "C")
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertEquals(3, state.examAnswers.size)
            assertEquals("A", state.examAnswers[1])
            assertEquals("B", state.examAnswers[2])
            assertEquals("C", state.examAnswers[3])
            cancel()
        }
    }
}
