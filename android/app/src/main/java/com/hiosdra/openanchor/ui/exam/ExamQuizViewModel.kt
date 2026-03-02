package com.hiosdra.openanchor.ui.exam

import android.app.Application
import android.content.Context
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ExamQuizUiState(
    val screen: ExamScreenState = ExamScreenState.Menu,
    val allQuestions: List<ExamQuestion> = emptyList(),
    val filteredQuestions: List<ExamQuestion> = emptyList(),
    val selectedCategories: Set<ExamCategory> = ExamCategory.entries.toSet(),
    val showCategoryFilter: Boolean = false,
    // Learn mode
    val currentIndex: Int = 0,
    val selectedAnswer: String? = null,
    val showCorrectAnswer: Boolean = false,
    val stats: ExamStats = ExamStats(),
    // Exam mode
    val examQuestions: List<ExamQuestion> = emptyList(),
    val examAnswers: Map<Int, String> = emptyMap(),
    val examTimeLeftSeconds: Int = 0,
    val examFinished: Boolean = false,
    val examResults: List<ExamResult> = emptyList(),
    val examTimeTakenSeconds: Int = 0,
    // Leitner mode
    val leitnerStats: LeitnerStats = LeitnerStats(),
    val leitnerDueQuestions: List<ExamQuestion> = emptyList(),
    val leitnerCurrentQuestion: ExamQuestion? = null,
    val leitnerSelectedAnswer: String? = null,
    val leitnerShowResult: Boolean = false,
    val leitnerLastCorrect: Boolean = false,
    val leitnerLastNewBox: Int = 1,
    val leitnerSessionCorrect: Int = 0,
    val leitnerSessionIncorrect: Int = 0,
    val leitnerSessionTotal: Int = 0,
    val leitnerSessionRemaining: Int = 0,
    val leitnerBoxCounts: Map<LeitnerBox, Int> = emptyMap(),
)

data class ExamResult(
    val question: ExamQuestion,
    val userAnswer: String?,
    val isCorrect: Boolean,
)

enum class ExamScreenState {
    Menu,
    Learn,
    Exam,
    Results,
    Leitner,
    LeitnerSession,
    LeitnerSessionComplete,
}

@HiltViewModel
class ExamQuizViewModel @Inject constructor(
    application: Application,
) : AndroidViewModel(application) {

    companion object {
        private const val EXAM_QUESTION_COUNT = 30
        private const val EXAM_TIME_MINUTES = 45
        private const val PREFS_NAME = "leitner_prefs"
        private const val KEY_SESSION_NUMBER = "session_number"
        private const val KEY_BOX_PREFIX = "q_box_"
        private const val KEY_LAST_REVIEW_PREFIX = "q_review_"
    }

    private val prefs = application.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    private val _screen = MutableStateFlow(ExamScreenState.Menu)
    private val _selectedCategories = MutableStateFlow(ExamCategory.entries.toSet())
    private val _showCategoryFilter = MutableStateFlow(false)
    private val _currentIndex = MutableStateFlow(0)
    private val _selectedAnswer = MutableStateFlow<String?>(null)
    private val _showCorrectAnswer = MutableStateFlow(false)
    private val _stats = MutableStateFlow(ExamStats())

    // Exam mode state
    private val _examQuestions = MutableStateFlow<List<ExamQuestion>>(emptyList())
    private val _examAnswers = MutableStateFlow<Map<Int, String>>(emptyMap())
    private val _examTimeLeft = MutableStateFlow(EXAM_TIME_MINUTES * 60)
    private val _examFinished = MutableStateFlow(false)
    private val _examResults = MutableStateFlow<List<ExamResult>>(emptyList())
    private val _examTimeTaken = MutableStateFlow(0)

    // Leitner mode state
    private val _leitnerStats = MutableStateFlow(LeitnerStats())
    private val _leitnerDueQuestions = MutableStateFlow<List<ExamQuestion>>(emptyList())
    private val _leitnerCurrentQuestion = MutableStateFlow<ExamQuestion?>(null)
    private val _leitnerSelectedAnswer = MutableStateFlow<String?>(null)
    private val _leitnerShowResult = MutableStateFlow(false)
    private val _leitnerLastCorrect = MutableStateFlow(false)
    private val _leitnerLastNewBox = MutableStateFlow(1)
    private val _leitnerSessionCorrect = MutableStateFlow(0)
    private val _leitnerSessionIncorrect = MutableStateFlow(0)
    private val _leitnerSessionTotal = MutableStateFlow(0)
    private val _leitnerSessionRemaining = MutableStateFlow(0)
    private val _leitnerBoxCounts = MutableStateFlow<Map<LeitnerBox, Int>>(emptyMap())

    private val allQuestions: List<ExamQuestion>

    // In-memory Leitner state loaded from prefs
    private val leitnerStates = mutableMapOf<Int, LeitnerQuestionState>()

    init {
        ExamQuestionsDb.init(application)
        allQuestions = ExamQuestionsDb.allQuestions
        loadLeitnerState()
    }

    val uiState: StateFlow<ExamQuizUiState> = combine(
        _screen,
        _selectedCategories,
        _showCategoryFilter,
        _currentIndex,
        combine(_selectedAnswer, _showCorrectAnswer, _stats) { a, b, c -> Triple(a, b, c) },
        combine(_examQuestions, _examAnswers, _examTimeLeft, _examFinished) { q, a, t, f -> ExamState(q, a, t, f) },
        combine(_examResults, _examTimeTaken) { r, t -> Pair(r, t) },
        combine(
            _leitnerStats, _leitnerDueQuestions, _leitnerCurrentQuestion,
            _leitnerSelectedAnswer, _leitnerShowResult
        ) { stats, due, cur, ans, show -> LeitnerUiPart1(stats, due, cur, ans, show) },
        combine(
            _leitnerLastCorrect, _leitnerLastNewBox, _leitnerSessionCorrect,
            _leitnerSessionIncorrect, _leitnerSessionTotal
        ) { correct, box, sc, si, st -> LeitnerUiPart2(correct, box, sc, si, st) },
        combine(_leitnerSessionRemaining, _leitnerBoxCounts) { rem, counts -> Pair(rem, counts) },
    ) { values ->
        val screen = values[0] as ExamScreenState
        val selectedCats = values[1] as Set<*>
        val showFilter = values[2] as Boolean
        val idx = values[3] as Int

        @Suppress("UNCHECKED_CAST")
        val answerTriple = values[4] as Triple<String?, Boolean, ExamStats>

        val examState = values[5] as ExamState

        @Suppress("UNCHECKED_CAST")
        val resultsPair = values[6] as Pair<List<ExamResult>, Int>

        val lPart1 = values[7] as LeitnerUiPart1
        val lPart2 = values[8] as LeitnerUiPart2

        @Suppress("UNCHECKED_CAST")
        val lPart3 = values[9] as Pair<Int, Map<LeitnerBox, Int>>

        @Suppress("UNCHECKED_CAST")
        val typedCats = selectedCats as Set<ExamCategory>

        val filtered = allQuestions.filter { it.category in typedCats }

        ExamQuizUiState(
            screen = screen,
            allQuestions = allQuestions,
            filteredQuestions = filtered,
            selectedCategories = typedCats,
            showCategoryFilter = showFilter,
            currentIndex = idx,
            selectedAnswer = answerTriple.first,
            showCorrectAnswer = answerTriple.second,
            stats = answerTriple.third,
            examQuestions = examState.questions,
            examAnswers = examState.answers,
            examTimeLeftSeconds = examState.timeLeft,
            examFinished = examState.finished,
            examResults = resultsPair.first,
            examTimeTakenSeconds = resultsPair.second,
            leitnerStats = lPart1.stats,
            leitnerDueQuestions = lPart1.dueQuestions,
            leitnerCurrentQuestion = lPart1.currentQuestion,
            leitnerSelectedAnswer = lPart1.selectedAnswer,
            leitnerShowResult = lPart1.showResult,
            leitnerLastCorrect = lPart2.lastCorrect,
            leitnerLastNewBox = lPart2.lastNewBox,
            leitnerSessionCorrect = lPart2.sessionCorrect,
            leitnerSessionIncorrect = lPart2.sessionIncorrect,
            leitnerSessionTotal = lPart2.sessionTotal,
            leitnerSessionRemaining = lPart3.first,
            leitnerBoxCounts = lPart3.second,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), ExamQuizUiState(allQuestions = allQuestions))

    private data class ExamState(
        val questions: List<ExamQuestion>,
        val answers: Map<Int, String>,
        val timeLeft: Int,
        val finished: Boolean,
    )

    private data class LeitnerUiPart1(
        val stats: LeitnerStats,
        val dueQuestions: List<ExamQuestion>,
        val currentQuestion: ExamQuestion?,
        val selectedAnswer: String?,
        val showResult: Boolean,
    )

    private data class LeitnerUiPart2(
        val lastCorrect: Boolean,
        val lastNewBox: Int,
        val sessionCorrect: Int,
        val sessionIncorrect: Int,
        val sessionTotal: Int,
    )

    // ---- Menu actions ----

    fun startLearnMode() {
        _currentIndex.value = 0
        _selectedAnswer.value = null
        _showCorrectAnswer.value = false
        _screen.value = ExamScreenState.Learn
    }

    fun startExamMode() {
        val shuffled = allQuestions.shuffled()
        val examQs = shuffled.take(EXAM_QUESTION_COUNT.coerceAtMost(shuffled.size))
        _examQuestions.value = examQs
        _examAnswers.value = emptyMap()
        _examTimeLeft.value = EXAM_TIME_MINUTES * 60
        _examFinished.value = false
        _examResults.value = emptyList()
        _examTimeTaken.value = 0
        _currentIndex.value = 0
        _screen.value = ExamScreenState.Exam
        startExamTimer()
    }

    fun goToMenu() {
        _screen.value = ExamScreenState.Menu
        _examFinished.value = true // stop timer
        refreshLeitnerStats()
    }

    // ---- Category filter ----

    fun toggleCategoryFilter() {
        _showCategoryFilter.value = !_showCategoryFilter.value
    }

    fun toggleCategory(category: ExamCategory) {
        val current = _selectedCategories.value.toMutableSet()
        if (category in current) current.remove(category) else current.add(category)
        _selectedCategories.value = current
        _currentIndex.value = 0
        _selectedAnswer.value = null
        _showCorrectAnswer.value = false
    }

    fun selectAllCategories() {
        _selectedCategories.value = ExamCategory.entries.toSet()
        _currentIndex.value = 0
    }

    fun deselectAllCategories() {
        _selectedCategories.value = emptySet()
    }

    // ---- Learn mode actions ----

    fun selectAnswer(label: String) {
        if (_selectedAnswer.value != null) return
        _selectedAnswer.value = label
        _showCorrectAnswer.value = true

        val questions = allQuestions.filter { it.category in _selectedCategories.value }
        val currentQ = questions.getOrNull(_currentIndex.value) ?: return
        val isCorrect = label == currentQ.correctAnswer

        _stats.value = _stats.value.copy(
            totalAnswered = _stats.value.totalAnswered + 1,
            correctCount = _stats.value.correctCount + if (isCorrect) 1 else 0,
            incorrectCount = _stats.value.incorrectCount + if (!isCorrect) 1 else 0,
        )
    }

    fun nextQuestion() {
        val questions = allQuestions.filter { it.category in _selectedCategories.value }
        if (_currentIndex.value < questions.size - 1) {
            _currentIndex.value++
        } else {
            _currentIndex.value = 0
        }
        _selectedAnswer.value = null
        _showCorrectAnswer.value = false
    }

    fun previousQuestion() {
        if (_currentIndex.value > 0) {
            _currentIndex.value--
            _selectedAnswer.value = null
            _showCorrectAnswer.value = false
        }
    }

    // ---- Exam mode actions ----

    fun selectExamAnswer(questionId: Int, label: String) {
        _examAnswers.value = _examAnswers.value + (questionId to label)
    }

    fun goToExamQuestion(index: Int) {
        _currentIndex.value = index.coerceIn(0, (_examQuestions.value.size - 1).coerceAtLeast(0))
    }

    fun nextExamQuestion() {
        if (_currentIndex.value < _examQuestions.value.size - 1) {
            _currentIndex.value++
        }
    }

    fun previousExamQuestion() {
        if (_currentIndex.value > 0) {
            _currentIndex.value--
        }
    }

    fun finishExam() {
        val questions = _examQuestions.value
        val answers = _examAnswers.value
        val timeTaken = EXAM_TIME_MINUTES * 60 - _examTimeLeft.value

        val results = questions.map { q ->
            val userAnswer = answers[q.id]
            ExamResult(
                question = q,
                userAnswer = userAnswer,
                isCorrect = userAnswer == q.correctAnswer,
            )
        }

        _examResults.value = results
        _examTimeTaken.value = timeTaken
        _examFinished.value = true
        _screen.value = ExamScreenState.Results
    }

    fun resetStats() {
        _stats.value = ExamStats()
    }

    private fun startExamTimer() {
        viewModelScope.launch {
            while (_examTimeLeft.value > 0 && !_examFinished.value) {
                delay(1000)
                if (!_examFinished.value) {
                    _examTimeLeft.value = (_examTimeLeft.value - 1).coerceAtLeast(0)
                    if (_examTimeLeft.value == 0) {
                        finishExam()
                    }
                }
            }
        }
    }

    // ============================================================
    // Leitner Mode
    // ============================================================

    private fun loadLeitnerState() {
        leitnerStates.clear()
        val sessionNumber = prefs.getInt(KEY_SESSION_NUMBER, 0)
        for (q in allQuestions) {
            val box = prefs.getInt("$KEY_BOX_PREFIX${q.id}", 1)
            val lastReview = prefs.getInt("$KEY_LAST_REVIEW_PREFIX${q.id}", 0)
            leitnerStates[q.id] = LeitnerQuestionState(
                questionId = q.id,
                box = LeitnerBox.fromLevel(box),
                lastReviewedSession = lastReview,
            )
        }
        refreshLeitnerStats(sessionNumber)
    }

    private fun saveLeitnerState(questionId: Int, state: LeitnerQuestionState) {
        leitnerStates[questionId] = state
        prefs.edit()
            .putInt("$KEY_BOX_PREFIX$questionId", state.box.level)
            .putInt("$KEY_LAST_REVIEW_PREFIX$questionId", state.lastReviewedSession)
            .apply()
    }

    private fun saveSessionNumber(session: Int) {
        prefs.edit().putInt(KEY_SESSION_NUMBER, session).apply()
    }

    private fun refreshLeitnerStats(sessionNumber: Int? = null) {
        val session = sessionNumber ?: prefs.getInt(KEY_SESSION_NUMBER, 0)
        val counts = mutableMapOf<LeitnerBox, Int>()
        LeitnerBox.entries.forEach { counts[it] = 0 }
        for (state in leitnerStates.values) {
            counts[state.box] = (counts[state.box] ?: 0) + 1
        }
        _leitnerBoxCounts.value = counts
        _leitnerStats.value = LeitnerStats(
            sessionNumber = session,
            box1Count = counts[LeitnerBox.BOX_1] ?: 0,
            box2Count = counts[LeitnerBox.BOX_2] ?: 0,
            box3Count = counts[LeitnerBox.BOX_3] ?: 0,
            box4Count = counts[LeitnerBox.BOX_4] ?: 0,
            box5Count = counts[LeitnerBox.BOX_5] ?: 0,
            totalQuestions = allQuestions.size,
        )
        _leitnerDueQuestions.value = getDueQuestions(session)
    }

    /**
     * Get questions that are due for review in the current session.
     * Box 1: every session
     * Box 2: every 2 sessions
     * Box 3: every 4 sessions
     * Box 4: every 8 sessions
     * Box 5: every 16 sessions
     */
    private fun getDueQuestions(session: Int): List<ExamQuestion> {
        return allQuestions.filter { q ->
            val state = leitnerStates[q.id] ?: return@filter true
            val interval = when (state.box) {
                LeitnerBox.BOX_1 -> 1
                LeitnerBox.BOX_2 -> 2
                LeitnerBox.BOX_3 -> 4
                LeitnerBox.BOX_4 -> 8
                LeitnerBox.BOX_5 -> 16
            }
            (session - state.lastReviewedSession) >= interval
        }
    }

    fun openLeitner() {
        refreshLeitnerStats()
        _screen.value = ExamScreenState.Leitner
    }

    fun startLeitnerSession() {
        val session = prefs.getInt(KEY_SESSION_NUMBER, 0) + 1
        saveSessionNumber(session)

        val due = getDueQuestions(session).shuffled()
        _leitnerDueQuestions.value = due
        _leitnerSessionCorrect.value = 0
        _leitnerSessionIncorrect.value = 0
        _leitnerSessionTotal.value = due.size
        _leitnerSessionRemaining.value = due.size
        _leitnerSelectedAnswer.value = null
        _leitnerShowResult.value = false

        if (due.isNotEmpty()) {
            _leitnerCurrentQuestion.value = due.first()
            _screen.value = ExamScreenState.LeitnerSession
        }
    }

    fun selectLeitnerAnswer(label: String) {
        if (_leitnerSelectedAnswer.value != null) return
        val question = _leitnerCurrentQuestion.value ?: return
        val isCorrect = label == question.correctAnswer

        _leitnerSelectedAnswer.value = label
        _leitnerShowResult.value = true
        _leitnerLastCorrect.value = isCorrect

        val state = leitnerStates[question.id] ?: LeitnerQuestionState(question.id)
        val session = prefs.getInt(KEY_SESSION_NUMBER, 0)

        val newBox = if (isCorrect) state.box.next() else LeitnerBox.BOX_1
        _leitnerLastNewBox.value = newBox.level

        val newState = state.copy(
            box = newBox,
            lastReviewedSession = session,
        )
        saveLeitnerState(question.id, newState)

        if (isCorrect) {
            _leitnerSessionCorrect.value++
        } else {
            _leitnerSessionIncorrect.value++
        }
    }

    fun nextLeitnerQuestion() {
        val due = _leitnerDueQuestions.value
        val current = _leitnerCurrentQuestion.value
        val currentIdx = due.indexOf(current)
        val remaining = _leitnerSessionRemaining.value - 1
        _leitnerSessionRemaining.value = remaining.coerceAtLeast(0)

        if (currentIdx < due.size - 1) {
            _leitnerCurrentQuestion.value = due[currentIdx + 1]
            _leitnerSelectedAnswer.value = null
            _leitnerShowResult.value = false
        } else {
            // Session complete
            refreshLeitnerStats()
            _screen.value = ExamScreenState.LeitnerSessionComplete
        }
    }

    fun finishLeitnerSession() {
        refreshLeitnerStats()
        _screen.value = ExamScreenState.LeitnerSessionComplete
    }

    fun resetLeitner() {
        val editor = prefs.edit()
        editor.putInt(KEY_SESSION_NUMBER, 0)
        for (q in allQuestions) {
            editor.remove("$KEY_BOX_PREFIX${q.id}")
            editor.remove("$KEY_LAST_REVIEW_PREFIX${q.id}")
        }
        editor.apply()
        loadLeitnerState()
        refreshLeitnerStats(0)
    }
}
