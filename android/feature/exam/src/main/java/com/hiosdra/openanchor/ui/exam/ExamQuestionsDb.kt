package com.hiosdra.openanchor.ui.exam

import android.content.Context
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

/**
 * Loads the PZŻ JSM exam question bank from assets/exam_questions.json.
 *
 * The JSON file is the single source of truth for all exam questions.
 * Questions are deserialized using Gson and converted to domain [ExamQuestion] objects.
 */
object ExamQuestionsDb {

    private var _allQuestions: List<ExamQuestion>? = null

    /**
     * Lazily loaded list of all exam questions.
     * Must call [init] with a Context before accessing this property.
     */
    val allQuestions: List<ExamQuestion>
        get() = _allQuestions
            ?: throw IllegalStateException("ExamQuestionsDb not initialized. Call init(context) first.")

    /**
     * Initialize the question database by loading from assets/exam_questions.json.
     * Safe to call multiple times — subsequent calls are no-ops.
     */
    fun init(context: Context) {
        if (_allQuestions != null) return

        val json = context.assets
            .open("exam_questions.json")
            .bufferedReader()
            .use { it.readText() }

        val type = object : TypeToken<List<ExamQuestionJson>>() {}.type
        val rawQuestions: List<ExamQuestionJson> = Gson().fromJson(json, type)

        _allQuestions = rawQuestions.map { it.toDomain() }
    }

    /**
     * Returns a map of category -> question count.
     */
    fun getCategoryCounts(): Map<ExamCategory, Int> =
        allQuestions.groupBy { it.category }.mapValues { it.value.size }
}
