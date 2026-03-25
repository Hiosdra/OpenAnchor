package com.hiosdra.openanchor.ui.exam

import org.junit.Assert.*
import org.junit.Test

class ExamModelsTest {

    // ---- ExamCategory ----

    @Test
    fun `ExamCategory fromDisplayName maps known categories`() {
        assertEquals(ExamCategory.NAWIGACJA, ExamCategory.fromDisplayName("Nawigacja"))
        assertEquals(ExamCategory.METEOROLOGIA, ExamCategory.fromDisplayName("Meteorologia"))
        assertEquals(ExamCategory.PRAWO, ExamCategory.fromDisplayName("Prawo"))
        assertEquals(ExamCategory.RATOWNICTWO, ExamCategory.fromDisplayName("Ratownictwo"))
    }

    @Test
    fun `ExamCategory fromDisplayName is case insensitive`() {
        assertEquals(ExamCategory.NAWIGACJA, ExamCategory.fromDisplayName("NAWIGACJA"))
        assertEquals(ExamCategory.NAWIGACJA, ExamCategory.fromDisplayName("nawigacja"))
    }

    @Test
    fun `ExamCategory fromDisplayName maps full display names`() {
        assertEquals(ExamCategory.JACHTY_ZAGLOWE, ExamCategory.fromDisplayName("Jachty Żaglowe Morskie"))
        assertEquals(ExamCategory.SYGNALY, ExamCategory.fromDisplayName("Sygnały i Łączność"))
        assertEquals(ExamCategory.PLANOWANIE, ExamCategory.fromDisplayName("Planowanie Rejsów"))
    }

    @Test(expected = IllegalArgumentException::class)
    fun `ExamCategory fromDisplayName throws for unknown category`() {
        ExamCategory.fromDisplayName("Unknown Category")
    }

    @Test
    fun `ExamCategory has expected entry count`() {
        assertEquals(8, ExamCategory.entries.size)
    }

    @Test
    fun `ExamCategory each entry has displayName`() {
        for (cat in ExamCategory.entries) {
            assertTrue(cat.displayName.isNotBlank())
        }
    }

    // ---- LeitnerBox ----

    @Test
    fun `LeitnerBox next advances correctly`() {
        assertEquals(LeitnerBox.BOX_2, LeitnerBox.BOX_1.next())
        assertEquals(LeitnerBox.BOX_3, LeitnerBox.BOX_2.next())
        assertEquals(LeitnerBox.BOX_4, LeitnerBox.BOX_3.next())
        assertEquals(LeitnerBox.BOX_5, LeitnerBox.BOX_4.next())
        assertEquals(LeitnerBox.BOX_5, LeitnerBox.BOX_5.next()) // stays at max
    }

    @Test
    fun `LeitnerBox fromLevel returns correct box`() {
        assertEquals(LeitnerBox.BOX_1, LeitnerBox.fromLevel(1))
        assertEquals(LeitnerBox.BOX_2, LeitnerBox.fromLevel(2))
        assertEquals(LeitnerBox.BOX_3, LeitnerBox.fromLevel(3))
        assertEquals(LeitnerBox.BOX_4, LeitnerBox.fromLevel(4))
        assertEquals(LeitnerBox.BOX_5, LeitnerBox.fromLevel(5))
    }

    @Test
    fun `LeitnerBox fromLevel returns BOX_1 for unknown level`() {
        assertEquals(LeitnerBox.BOX_1, LeitnerBox.fromLevel(0))
        assertEquals(LeitnerBox.BOX_1, LeitnerBox.fromLevel(99))
    }

    @Test
    fun `LeitnerBox has 5 entries`() {
        assertEquals(5, LeitnerBox.entries.size)
    }

    @Test
    fun `LeitnerBox levels are sequential 1 to 5`() {
        val levels = LeitnerBox.entries.map { it.level }
        assertEquals(listOf(1, 2, 3, 4, 5), levels)
    }

    @Test
    fun `LeitnerBox each entry has label`() {
        for (box in LeitnerBox.entries) {
            assertTrue(box.label.isNotBlank())
        }
    }

    // ---- ExamStats ----

    @Test
    fun `ExamStats accuracy with zero answered`() {
        val stats = ExamStats(totalAnswered = 0, correctCount = 0, incorrectCount = 0)
        assertEquals(0f, stats.accuracy, 0.001f)
    }

    @Test
    fun `ExamStats accuracy calculates correctly`() {
        val stats = ExamStats(totalAnswered = 10, correctCount = 7, incorrectCount = 3)
        assertEquals(0.7f, stats.accuracy, 0.001f)
    }

    @Test
    fun `ExamStats accuracy with perfect score`() {
        val stats = ExamStats(totalAnswered = 5, correctCount = 5, incorrectCount = 0)
        assertEquals(1.0f, stats.accuracy, 0.001f)
    }

    @Test
    fun `ExamStats default values`() {
        val stats = ExamStats()
        assertEquals(0, stats.totalAnswered)
        assertEquals(0, stats.correctCount)
        assertEquals(0, stats.incorrectCount)
    }

    // ---- LeitnerStats ----

    @Test
    fun `LeitnerStats masteredCount returns box5Count`() {
        val stats = LeitnerStats(box5Count = 42, totalQuestions = 100)
        assertEquals(42, stats.masteredCount)
    }

    @Test
    fun `LeitnerStats masteredPercent with zero total`() {
        val stats = LeitnerStats(totalQuestions = 0)
        assertEquals(0f, stats.masteredPercent, 0.001f)
    }

    @Test
    fun `LeitnerStats masteredPercent calculates correctly`() {
        val stats = LeitnerStats(box5Count = 50, totalQuestions = 100)
        assertEquals(0.5f, stats.masteredPercent, 0.001f)
    }

    @Test
    fun `LeitnerStats default values`() {
        val stats = LeitnerStats()
        assertEquals(0, stats.sessionNumber)
        assertEquals(0, stats.box1Count)
        assertEquals(0, stats.box5Count)
        assertEquals(0, stats.totalQuestions)
    }

    // ---- QuizMode ----

    @Test
    fun `QuizMode has three modes`() {
        assertEquals(3, QuizMode.entries.size)
        assertTrue(QuizMode.entries.contains(QuizMode.LEARN))
        assertTrue(QuizMode.entries.contains(QuizMode.EXAM))
        assertTrue(QuizMode.entries.contains(QuizMode.LEITNER))
    }

    // ---- ExamQuestion ----

    @Test
    fun `ExamQuestion data class holds values`() {
        val q = ExamQuestion(
            id = 1,
            category = ExamCategory.NAWIGACJA,
            correctAnswer = "B",
            answerCount = 3,
            pdfPage = 0,
            cropYStart = 100f,
            cropYEnd = 200f,
            pageHeight = 842f,
        )
        assertEquals(1, q.id)
        assertEquals(ExamCategory.NAWIGACJA, q.category)
        assertEquals("B", q.correctAnswer)
        assertEquals(3, q.answerCount)
    }

    @Test
    fun `ExamQuestion default answerCount is 3`() {
        val q = ExamQuestion(
            id = 1,
            category = ExamCategory.LOCJA,
            correctAnswer = "A",
            pdfPage = 0,
            cropYStart = 100f,
            cropYEnd = 200f,
            pageHeight = 842f,
        )
        assertEquals(3, q.answerCount)
    }

    // ---- QuestionProgress ----

    @Test
    fun `QuestionProgress holds progress data`() {
        val p = QuestionProgress(questionId = 42, selectedAnswer = "C", isCorrect = true)
        assertEquals(42, p.questionId)
        assertEquals("C", p.selectedAnswer)
        assertTrue(p.isCorrect)
    }

    @Test
    fun `QuestionProgress with null answer`() {
        val p = QuestionProgress(questionId = 1, selectedAnswer = null, isCorrect = false)
        assertNull(p.selectedAnswer)
        assertFalse(p.isCorrect)
    }

    // ---- ExamQuestionJson ----

    @Test
    fun `ExamQuestionJson toDomain converts correctly`() {
        val json = ExamQuestionJson(
            id = 5,
            category = "Nawigacja",
            correctAnswer = "B",
            answerCount = 3,
            pdfPage = 2,
            cropYStart = 100f,
            cropYEnd = 200f,
            pageHeight = 842f,
        )
        val domain = json.toDomain()
        assertEquals(5, domain.id)
        assertEquals(ExamCategory.NAWIGACJA, domain.category)
        assertEquals("B", domain.correctAnswer)
        assertEquals(3, domain.answerCount)
        assertEquals(2, domain.pdfPage)
        assertEquals(100f, domain.cropYStart)
        assertEquals(200f, domain.cropYEnd)
        assertEquals(842f, domain.pageHeight)
    }

    @Test
    fun `ExamQuestionJson toDomain with null answer defaults to A`() {
        val json = ExamQuestionJson(
            id = 1,
            category = "Nawigacja",
            correctAnswer = null,
            answerCount = 3,
            pdfPage = 0,
            cropYStart = 100f,
            cropYEnd = 200f,
            pageHeight = 842f,
        )
        val domain = json.toDomain()
        assertEquals("A", domain.correctAnswer)
    }

    // ---- LeitnerQuestionState ----

    @Test
    fun `LeitnerQuestionState default values`() {
        val state = LeitnerQuestionState(questionId = 1)
        assertEquals(LeitnerBox.BOX_1, state.box)
        assertEquals(0, state.lastReviewedSession)
    }

    @Test
    fun `LeitnerQuestionState copy works`() {
        val state = LeitnerQuestionState(questionId = 1, box = LeitnerBox.BOX_3, lastReviewedSession = 5)
        val updated = state.copy(box = LeitnerBox.BOX_4, lastReviewedSession = 6)
        assertEquals(LeitnerBox.BOX_4, updated.box)
        assertEquals(6, updated.lastReviewedSession)
        assertEquals(1, updated.questionId) // unchanged
    }
}
