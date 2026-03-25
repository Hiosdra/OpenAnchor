package com.hiosdra.openanchor.ui.exam

import com.google.gson.annotations.SerializedName

/**
 * Exam question categories matching PZŻ JSM exam structure.
 * 8 categories extracted from the official question bank (330 questions).
 */
enum class ExamCategory(val displayName: String) {
    JACHTY_ZAGLOWE("Jachty Żaglowe Morskie"),
    LOCJA("Locja"),
    METEOROLOGIA("Meteorologia"),
    NAWIGACJA("Nawigacja"),
    PLANOWANIE("Planowanie Rejsów"),
    PRAWO("Prawo"),
    RATOWNICTWO("Ratownictwo"),
    SYGNALY("Sygnały i Łączność"),
    ;

    companion object {
        private val displayNameMap = entries.associateBy { it.displayName.uppercase() }

        /**
         * Maps a JSON category string (e.g. "JACHTY ŻAGLOWE MORSKIE") to an ExamCategory enum.
         */
        fun fromDisplayName(name: String): ExamCategory =
            displayNameMap[name.uppercase()]
                ?: entries.firstOrNull { it.name.equals(name.replace(" ", "_"), ignoreCase = true) }
                ?: throw IllegalArgumentException("Unknown exam category: $name")
    }
}

/**
 * An exam question rendered from a PDF page crop with A/B/C answer buttons.
 * The question text, options, and any diagrams are all baked into the PDF image.
 */
data class ExamQuestion(
    val id: Int,
    val category: ExamCategory,
    val correctAnswer: String,       // "A", "B", or "C"
    val answerCount: Int = 3,        // Number of answer options (always 3 for JSM)
    val pdfPage: Int,                // 0-based page index in the PDF
    val cropYStart: Float,           // Y coordinate where the question starts (in PDF points)
    val cropYEnd: Float,             // Y coordinate where the question ends (in PDF points)
    val pageHeight: Float,           // Total page height in PDF points (e.g. 842.0 for A4)
)

// ============================================================
// JSON deserialization models (matching exam_questions.json format)
// ============================================================

/**
 * Raw JSON representation of a single exam question.
 * Used by Gson to deserialize exam_questions.json from assets.
 */
data class ExamQuestionJson(
    val id: Int,
    val category: String,
    @SerializedName("correct_answer") val correctAnswer: String?,
    @SerializedName("answer_count") val answerCount: Int,
    @SerializedName("pdf_page") val pdfPage: Int,
    @SerializedName("crop_y_start") val cropYStart: Float,
    @SerializedName("crop_y_end") val cropYEnd: Float,
    @SerializedName("page_height") val pageHeight: Float,
) {
    /**
     * Convert this JSON model to the domain [ExamQuestion] used throughout the app.
     */
    fun toDomain(): ExamQuestion = ExamQuestion(
        id = id,
        category = ExamCategory.fromDisplayName(category),
        correctAnswer = correctAnswer ?: "A", // fallback if answer unknown
        answerCount = answerCount,
        pdfPage = pdfPage,
        cropYStart = cropYStart,
        cropYEnd = cropYEnd,
        pageHeight = pageHeight,
    )
}

/**
 * Quiz mode selection.
 */
enum class QuizMode {
    LEARN,    // Browse questions, see correct answers immediately
    EXAM,     // Timed exam simulation
    LEITNER,  // Spaced repetition with Leitner boxes
}

/**
 * Tracks user progress for a specific question.
 */
data class QuestionProgress(
    val questionId: Int,
    val selectedAnswer: String?,
    val isCorrect: Boolean,
)

/**
 * Overall exam session statistics.
 */
data class ExamStats(
    val totalAnswered: Int = 0,
    val correctCount: Int = 0,
    val incorrectCount: Int = 0,
) {
    val accuracy: Float
        get() = if (totalAnswered > 0) correctCount.toFloat() / totalAnswered else 0f
}

// ============================================================
// Leitner Spaced Repetition System
// ============================================================

/**
 * Leitner box levels (1-5). Questions start in Box 1 and advance
 * when answered correctly. Incorrect answers send questions back to Box 1.
 *
 * Box 1: Every session (new / failed questions)
 * Box 2: Every 2nd session
 * Box 3: Every 4th session
 * Box 4: Every 8th session
 * Box 5: Mastered (review occasionally)
 */
enum class LeitnerBox(val level: Int, val label: String) {
    BOX_1(1, "Box 1"),
    BOX_2(2, "Box 2"),
    BOX_3(3, "Box 3"),
    BOX_4(4, "Box 4"),
    BOX_5(5, "Box 5"),
    ;

    fun next(): LeitnerBox = when (this) {
        BOX_1 -> BOX_2
        BOX_2 -> BOX_3
        BOX_3 -> BOX_4
        BOX_4 -> BOX_5
        BOX_5 -> BOX_5
    }

    companion object {
        fun fromLevel(level: Int): LeitnerBox =
            entries.firstOrNull { it.level == level } ?: BOX_1
    }
}

/**
 * Persistent state for a single question in the Leitner system.
 */
data class LeitnerQuestionState(
    val questionId: Int,
    val box: LeitnerBox = LeitnerBox.BOX_1,
    val lastReviewedSession: Int = 0,
)

/**
 * Overall Leitner session statistics.
 */
data class LeitnerStats(
    val sessionNumber: Int = 0,
    val box1Count: Int = 0,
    val box2Count: Int = 0,
    val box3Count: Int = 0,
    val box4Count: Int = 0,
    val box5Count: Int = 0,
    val totalQuestions: Int = 0,
) {
    val masteredCount: Int get() = box5Count
    val masteredPercent: Float
        get() = if (totalQuestions > 0) masteredCount.toFloat() / totalQuestions else 0f
}
