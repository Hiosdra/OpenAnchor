package com.hiosdra.openanchor.ui.exam

import org.junit.Assert.*
import org.junit.Test

class ExamQuizUiStateTest {

    @Test
    fun `default ExamQuizUiState values`() {
        val state = ExamQuizUiState()
        assertEquals(ExamScreenState.Menu, state.screen)
        assertTrue(state.allQuestions.isEmpty())
        assertTrue(state.filteredQuestions.isEmpty())
        assertEquals(ExamCategory.entries.toSet(), state.selectedCategories)
        assertFalse(state.showCategoryFilter)
        assertEquals(0, state.currentIndex)
        assertNull(state.selectedAnswer)
        assertFalse(state.showCorrectAnswer)
        assertEquals(ExamStats(), state.stats)
        assertTrue(state.examQuestions.isEmpty())
        assertTrue(state.examAnswers.isEmpty())
        assertEquals(0, state.examTimeLeftSeconds)
        assertFalse(state.examFinished)
        assertTrue(state.examResults.isEmpty())
        assertEquals(0, state.examTimeTakenSeconds)
        assertEquals(LeitnerStats(), state.leitnerStats)
        assertTrue(state.leitnerDueQuestions.isEmpty())
        assertNull(state.leitnerCurrentQuestion)
        assertNull(state.leitnerSelectedAnswer)
        assertFalse(state.leitnerShowResult)
        assertFalse(state.leitnerLastCorrect)
        assertEquals(1, state.leitnerLastNewBox)
        assertEquals(0, state.leitnerSessionCorrect)
        assertEquals(0, state.leitnerSessionIncorrect)
        assertEquals(0, state.leitnerSessionTotal)
        assertEquals(0, state.leitnerSessionRemaining)
        assertTrue(state.leitnerBoxCounts.isEmpty())
    }

    @Test
    fun `ExamQuizUiState copy with values`() {
        val state = ExamQuizUiState(
            screen = ExamScreenState.Learn,
            currentIndex = 5,
            selectedAnswer = "B",
            showCorrectAnswer = true,
            examFinished = true,
            examTimeLeftSeconds = 120,
            leitnerLastCorrect = true,
            leitnerSessionCorrect = 3,
            leitnerSessionIncorrect = 1,
            leitnerSessionTotal = 4,
            leitnerSessionRemaining = 6
        )
        assertEquals(ExamScreenState.Learn, state.screen)
        assertEquals(5, state.currentIndex)
        assertEquals("B", state.selectedAnswer)
        assertTrue(state.showCorrectAnswer)
        assertTrue(state.examFinished)
        assertEquals(120, state.examTimeLeftSeconds)
        assertTrue(state.leitnerLastCorrect)
        assertEquals(3, state.leitnerSessionCorrect)
        assertEquals(1, state.leitnerSessionIncorrect)
        assertEquals(4, state.leitnerSessionTotal)
        assertEquals(6, state.leitnerSessionRemaining)
    }

    @Test
    fun `ExamResult holds correct data`() {
        val question = ExamQuestion(
            id = 1,
            category = ExamCategory.NAWIGACJA,
            correctAnswer = "A",
            imageAsset = "test.jpg"
        )
        val result = ExamResult(question = question, userAnswer = "B", isCorrect = false)
        assertEquals(question, result.question)
        assertEquals("B", result.userAnswer)
        assertFalse(result.isCorrect)
    }

    @Test
    fun `ExamResult with correct answer`() {
        val question = ExamQuestion(
            id = 2,
            category = ExamCategory.LOCJA,
            correctAnswer = "C",
            imageAsset = "test2.jpg"
        )
        val result = ExamResult(question = question, userAnswer = "C", isCorrect = true)
        assertTrue(result.isCorrect)
    }

    @Test
    fun `ExamScreenState has all expected values`() {
        assertEquals(7, ExamScreenState.entries.size)
        assertTrue(ExamScreenState.entries.contains(ExamScreenState.Menu))
        assertTrue(ExamScreenState.entries.contains(ExamScreenState.Learn))
        assertTrue(ExamScreenState.entries.contains(ExamScreenState.Exam))
        assertTrue(ExamScreenState.entries.contains(ExamScreenState.Results))
        assertTrue(ExamScreenState.entries.contains(ExamScreenState.Leitner))
        assertTrue(ExamScreenState.entries.contains(ExamScreenState.LeitnerSession))
        assertTrue(ExamScreenState.entries.contains(ExamScreenState.LeitnerSessionComplete))
    }
}
