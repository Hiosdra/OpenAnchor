package com.hiosdra.openanchor.ui.exam

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.NavigateBefore
import androidx.compose.material.icons.filled.NavigateNext
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.hiosdra.openanchor.R
import com.hiosdra.openanchor.ui.theme.AlarmRed
import com.hiosdra.openanchor.ui.theme.CautionYellow
import com.hiosdra.openanchor.ui.theme.NavyMedium
import com.hiosdra.openanchor.ui.theme.NavySurface
import com.hiosdra.openanchor.ui.theme.OceanBlue
import com.hiosdra.openanchor.ui.theme.SafeGreen
import com.hiosdra.openanchor.ui.theme.TextGrey
import com.hiosdra.openanchor.ui.theme.WarningOrange

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExamQuizScreen(
    onBack: () -> Unit,
    viewModel: ExamQuizViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    when (uiState.screen) {
        ExamScreenState.Menu -> ExamMenuContent(
            uiState = uiState,
            onStartLearn = viewModel::startLearnMode,
            onStartExam = viewModel::startExamMode,
            onStartLeitner = viewModel::openLeitner,
            onResetStats = viewModel::resetStats,
            onBack = onBack,
        )
        ExamScreenState.Learn -> LearnModeContent(
            uiState = uiState,
            onSelectAnswer = viewModel::selectAnswer,
            onNext = viewModel::nextQuestion,
            onPrevious = viewModel::previousQuestion,
            onToggleCategoryFilter = viewModel::toggleCategoryFilter,
            onToggleCategory = viewModel::toggleCategory,
            onSelectAll = viewModel::selectAllCategories,
            onDeselectAll = viewModel::deselectAllCategories,
            onBack = viewModel::goToMenu,
        )
        ExamScreenState.Exam -> ExamModeContent(
            uiState = uiState,
            onSelectAnswer = viewModel::selectExamAnswer,
            onGoToQuestion = viewModel::goToExamQuestion,
            onNext = viewModel::nextExamQuestion,
            onPrevious = viewModel::previousExamQuestion,
            onFinish = viewModel::finishExam,
            onBack = viewModel::goToMenu,
        )
        ExamScreenState.Results -> ResultsContent(
            uiState = uiState,
            onRetry = viewModel::startExamMode,
            onBack = viewModel::goToMenu,
        )
        ExamScreenState.Leitner -> LeitnerOverviewContent(
            uiState = uiState,
            onStartSession = viewModel::startLeitnerSession,
            onResetLeitner = viewModel::resetLeitner,
            onBack = viewModel::goToMenu,
        )
        ExamScreenState.LeitnerSession -> LeitnerSessionContent(
            uiState = uiState,
            onSelectAnswer = viewModel::selectLeitnerAnswer,
            onNext = viewModel::nextLeitnerQuestion,
            onFinishSession = viewModel::finishLeitnerSession,
            onBack = viewModel::openLeitner,
        )
        ExamScreenState.LeitnerSessionComplete -> LeitnerSessionCompleteContent(
            uiState = uiState,
            onNewSession = viewModel::startLeitnerSession,
            onBack = viewModel::openLeitner,
        )
    }
}

// ==========================================
// MENU SCREEN
// ==========================================
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ExamMenuContent(
    uiState: ExamQuizUiState,
    onStartLearn: () -> Unit,
    onStartExam: () -> Unit,
    onStartLeitner: () -> Unit,
    onResetStats: () -> Unit,
    onBack: () -> Unit,
) {
    var showResetDialog by remember { mutableStateOf(false) }

    if (showResetDialog) {
        AlertDialog(
            onDismissRequest = { showResetDialog = false },
            title = { Text(stringResource(R.string.exam_reset_title)) },
            text = { Text(stringResource(R.string.exam_reset_message)) },
            confirmButton = {
                TextButton(onClick = {
                    onResetStats()
                    showResetDialog = false
                }) {
                    Text(stringResource(R.string.exam_reset_confirm))
                }
            },
            dismissButton = {
                TextButton(onClick = { showResetDialog = false }) {
                    Text(stringResource(R.string.cancel))
                }
            },
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.exam_title)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.exam_back))
                    }
                },
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item { Spacer(modifier = Modifier.height(8.dp)) }

            // Header icon
            item {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Icon(
                        imageVector = Icons.Default.School,
                        contentDescription = null,
                        modifier = Modifier.size(64.dp),
                        tint = CautionYellow,
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = stringResource(R.string.exam_title),
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        text = stringResource(R.string.exam_subtitle),
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextGrey,
                    )
                }
            }

            // Stats card
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = NavySurface),
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                text = stringResource(R.string.exam_progress),
                                style = MaterialTheme.typography.titleSmall,
                                color = TextGrey,
                            )
                            Text(
                                text = "${(uiState.stats.accuracy * 100).toInt()}%",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                                color = CautionYellow,
                            )
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        LinearProgressIndicator(
                            progress = { uiState.stats.accuracy },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(6.dp)
                                .clip(RoundedCornerShape(3.dp)),
                            color = CautionYellow,
                            trackColor = NavyMedium,
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceEvenly,
                        ) {
                            StatItem(
                                value = "${uiState.allQuestions.size}",
                                label = stringResource(R.string.exam_stat_questions),
                            )
                            StatItem(
                                value = "${uiState.stats.correctCount}",
                                label = stringResource(R.string.exam_stat_correct),
                                valueColor = SafeGreen,
                            )
                            StatItem(
                                value = "${uiState.stats.totalAnswered}",
                                label = stringResource(R.string.exam_stat_answered),
                                valueColor = CautionYellow,
                            )
                        }
                    }
                }
            }

            // Categories
            item {
                Text(
                    text = stringResource(R.string.exam_categories),
                    style = MaterialTheme.typography.titleSmall,
                    color = TextGrey,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }

            val categoryCounts = ExamQuestionsDb.getCategoryCounts()
            items(ExamCategory.entries) { category ->
                val count = categoryCounts[category] ?: 0
                Card(
                    colors = CardDefaults.cardColors(containerColor = NavySurface),
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(
                            modifier = Modifier
                                .size(10.dp)
                                .clip(CircleShape)
                                .background(getCategoryColor(category)),
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(
                            text = category.displayName,
                            style = MaterialTheme.typography.bodyMedium,
                            modifier = Modifier.weight(1f),
                        )
                        Text(
                            text = "$count ${stringResource(R.string.exam_stat_questions).lowercase()}",
                            style = MaterialTheme.typography.bodySmall,
                            color = TextGrey,
                        )
                    }
                }
            }

            // Action buttons
            item { Spacer(modifier = Modifier.height(8.dp)) }

            item {
                Button(
                    onClick = onStartLearn,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = CautionYellow),
                    shape = RoundedCornerShape(16.dp),
                ) {
                    Icon(Icons.AutoMirrored.Filled.MenuBook, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = stringResource(R.string.exam_learn),
                        style = MaterialTheme.typography.titleMedium,
                        color = Color.Black,
                    )
                }
            }

            // Leitner mode button
            item {
                Button(
                    onClick = onStartLeitner,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = OceanBlue),
                    shape = RoundedCornerShape(16.dp),
                ) {
                    Icon(Icons.Default.Inventory2, contentDescription = null, tint = Color.White)
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Text(
                            text = stringResource(R.string.leitner_title),
                            style = MaterialTheme.typography.titleMedium,
                            color = Color.White,
                        )
                        Text(
                            text = stringResource(R.string.leitner_subtitle),
                            style = MaterialTheme.typography.bodySmall,
                            color = Color.White.copy(alpha = 0.7f),
                        )
                    }
                }
            }

            item {
                OutlinedButton(
                    onClick = onStartExam,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    shape = RoundedCornerShape(16.dp),
                ) {
                    Icon(Icons.Default.Timer, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = stringResource(R.string.exam_start),
                        style = MaterialTheme.typography.titleMedium,
                    )
                }
            }

            if (uiState.stats.totalAnswered > 0) {
                item {
                    TextButton(
                        onClick = { showResetDialog = true },
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Icon(Icons.Default.Refresh, contentDescription = null, tint = TextGrey)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = stringResource(R.string.exam_reset_progress),
                            color = TextGrey,
                        )
                    }
                }
            }

            item { Spacer(modifier = Modifier.height(24.dp)) }
        }
    }
}

// ==========================================
// LEARN MODE
// ==========================================
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun LearnModeContent(
    uiState: ExamQuizUiState,
    onSelectAnswer: (String) -> Unit,
    onNext: () -> Unit,
    onPrevious: () -> Unit,
    onToggleCategoryFilter: () -> Unit,
    onToggleCategory: (ExamCategory) -> Unit,
    onSelectAll: () -> Unit,
    onDeselectAll: () -> Unit,
    onBack: () -> Unit,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.exam_learn)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.exam_back))
                    }
                },
                actions = {
                    IconButton(onClick = onToggleCategoryFilter) {
                        Icon(Icons.Default.FilterList, contentDescription = stringResource(R.string.exam_filter))
                    }
                },
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            // Progress
            val total = uiState.filteredQuestions.size
            val current = uiState.currentIndex + 1
            if (total > 0) {
                LinearProgressIndicator(
                    progress = { current.toFloat() / total },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                        .height(4.dp)
                        .clip(RoundedCornerShape(2.dp)),
                    color = CautionYellow,
                    trackColor = NavyMedium,
                )
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(
                        text = "$current / $total",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextGrey,
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text(
                            text = "${uiState.stats.correctCount} OK",
                            style = MaterialTheme.typography.bodySmall,
                            color = SafeGreen,
                        )
                        Text(
                            text = "${uiState.stats.incorrectCount} Err",
                            style = MaterialTheme.typography.bodySmall,
                            color = AlarmRed,
                        )
                    }
                }
            }

            // Category filter
            AnimatedVisibility(visible = uiState.showCategoryFilter) {
                CategoryFilterSection(
                    selectedCategories = uiState.selectedCategories,
                    onToggle = onToggleCategory,
                    onSelectAll = onSelectAll,
                    onDeselectAll = onDeselectAll,
                )
            }

            if (uiState.filteredQuestions.isEmpty()) {
                EmptyState(stringResource(R.string.exam_no_questions))
            } else {
                val question = uiState.filteredQuestions[uiState.currentIndex]

                LazyColumn(
                    modifier = Modifier
                        .weight(1f)
                        .padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    item { Spacer(modifier = Modifier.height(8.dp)) }

                    // Question card
                    item {
                        QuestionCard(question = question)
                    }

                    // Answers
                    items(question.answers) { answer ->
                        val state = when {
                            uiState.selectedAnswer == null -> AnswerState.Default
                            answer.label == question.correctAnswer -> AnswerState.Correct
                            answer.label == uiState.selectedAnswer -> AnswerState.Incorrect
                            else -> AnswerState.Default
                        }
                        AnswerOptionCard(
                            answer = answer,
                            state = state,
                            onClick = { onSelectAnswer(answer.label) },
                            enabled = uiState.selectedAnswer == null,
                        )
                    }

                    item { Spacer(modifier = Modifier.height(8.dp)) }
                }

                // Navigation buttons
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    OutlinedButton(
                        onClick = onPrevious,
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp),
                        enabled = uiState.currentIndex > 0,
                        shape = RoundedCornerShape(12.dp),
                    ) {
                        Icon(Icons.Default.NavigateBefore, contentDescription = null)
                        Text(stringResource(R.string.exam_previous))
                    }
                    Button(
                        onClick = onNext,
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = CautionYellow),
                        shape = RoundedCornerShape(12.dp),
                    ) {
                        Text(
                            text = if (uiState.selectedAnswer != null)
                                stringResource(R.string.exam_next)
                            else
                                stringResource(R.string.exam_skip),
                            color = Color.Black,
                        )
                        Icon(Icons.Default.NavigateNext, contentDescription = null, tint = Color.Black)
                    }
                }
            }
        }
    }
}

// ==========================================
// EXAM MODE
// ==========================================
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
private fun ExamModeContent(
    uiState: ExamQuizUiState,
    onSelectAnswer: (Int, String) -> Unit,
    onGoToQuestion: (Int) -> Unit,
    onNext: () -> Unit,
    onPrevious: () -> Unit,
    onFinish: () -> Unit,
    onBack: () -> Unit,
) {
    var showQuitDialog by remember { mutableStateOf(false) }
    var showFinishDialog by remember { mutableStateOf(false) }

    if (showQuitDialog) {
        AlertDialog(
            onDismissRequest = { showQuitDialog = false },
            title = { Text(stringResource(R.string.exam_quit_title)) },
            text = { Text(stringResource(R.string.exam_quit_message)) },
            confirmButton = {
                TextButton(onClick = {
                    showQuitDialog = false
                    onBack()
                }) {
                    Text(stringResource(R.string.exam_quit_confirm))
                }
            },
            dismissButton = {
                TextButton(onClick = { showQuitDialog = false }) {
                    Text(stringResource(R.string.cancel))
                }
            },
        )
    }

    if (showFinishDialog) {
        val unanswered = uiState.examQuestions.size - uiState.examAnswers.size
        AlertDialog(
            onDismissRequest = { showFinishDialog = false },
            title = { Text(stringResource(R.string.exam_finish_title)) },
            text = {
                Text(
                    if (unanswered > 0)
                        stringResource(R.string.exam_finish_unanswered, unanswered)
                    else
                        stringResource(R.string.exam_finish_message)
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    showFinishDialog = false
                    onFinish()
                }) {
                    Text(stringResource(R.string.exam_finish_confirm))
                }
            },
            dismissButton = {
                TextButton(onClick = { showFinishDialog = false }) {
                    Text(stringResource(R.string.cancel))
                }
            },
        )
    }

    val timeWarning = uiState.examTimeLeftSeconds < 300
    val minutes = uiState.examTimeLeftSeconds / 60
    val seconds = uiState.examTimeLeftSeconds % 60
    val timeText = "%d:%02d".format(minutes, seconds)

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.exam_start)) },
                navigationIcon = {
                    IconButton(onClick = { showQuitDialog = true }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.exam_back))
                    }
                },
                actions = {
                    Text(
                        text = timeText,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = if (timeWarning) AlarmRed else TextGrey,
                        modifier = Modifier.padding(end = 16.dp),
                    )
                },
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            val total = uiState.examQuestions.size
            val current = uiState.currentIndex + 1

            if (total > 0) {
                LinearProgressIndicator(
                    progress = { current.toFloat() / total },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                        .height(4.dp)
                        .clip(RoundedCornerShape(2.dp)),
                    color = CautionYellow,
                    trackColor = NavyMedium,
                )
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text("$current / $total", style = MaterialTheme.typography.bodySmall, color = TextGrey)
                    Text(
                        "${uiState.examAnswers.size} ${stringResource(R.string.exam_stat_answered).lowercase()}",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextGrey,
                    )
                }
            }

            if (uiState.examQuestions.isNotEmpty()) {
                val question = uiState.examQuestions[uiState.currentIndex]
                val selectedAnswer = uiState.examAnswers[question.id]

                LazyColumn(
                    modifier = Modifier
                        .weight(1f)
                        .padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    item { Spacer(modifier = Modifier.height(8.dp)) }

                    // Question
                    item {
                        QuestionCard(question = question)
                    }

                    // Answers
                    items(question.answers) { answer ->
                        AnswerOptionCard(
                            answer = answer,
                            state = if (selectedAnswer == answer.label) AnswerState.Selected else AnswerState.Default,
                            onClick = { onSelectAnswer(question.id, answer.label) },
                            enabled = true,
                        )
                    }

                    // Question dots
                    item {
                        Spacer(modifier = Modifier.height(8.dp))
                        FlowRow(
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                            verticalArrangement = Arrangement.spacedBy(4.dp),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            uiState.examQuestions.forEachIndexed { i, q ->
                                val isCurrent = i == uiState.currentIndex
                                val isAnswered = uiState.examAnswers.containsKey(q.id)
                                val bgColor = when {
                                    isCurrent -> CautionYellow
                                    isAnswered -> NavySurface
                                    else -> NavyMedium.copy(alpha = 0.3f)
                                }
                                val textColor = when {
                                    isCurrent -> Color.Black
                                    isAnswered -> Color.White.copy(alpha = 0.6f)
                                    else -> Color.White.copy(alpha = 0.25f)
                                }
                                Box(
                                    modifier = Modifier
                                        .size(32.dp)
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(bgColor)
                                        .clickable { onGoToQuestion(i) },
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Text(
                                        text = "${i + 1}",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = textColor,
                                    )
                                }
                            }
                        }
                    }

                    item { Spacer(modifier = Modifier.height(8.dp)) }
                }

                // Navigation
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    OutlinedButton(
                        onClick = onPrevious,
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp),
                        enabled = uiState.currentIndex > 0,
                        shape = RoundedCornerShape(12.dp),
                    ) {
                        Icon(Icons.Default.NavigateBefore, contentDescription = null)
                        Text(stringResource(R.string.exam_previous))
                    }

                    if (uiState.currentIndex < uiState.examQuestions.size - 1) {
                        Button(
                            onClick = onNext,
                            modifier = Modifier
                                .weight(1f)
                                .height(48.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = CautionYellow),
                            shape = RoundedCornerShape(12.dp),
                        ) {
                            Text(stringResource(R.string.exam_next), color = Color.Black)
                            Icon(Icons.Default.NavigateNext, contentDescription = null, tint = Color.Black)
                        }
                    } else {
                        Button(
                            onClick = { showFinishDialog = true },
                            modifier = Modifier
                                .weight(1f)
                                .height(48.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = SafeGreen),
                            shape = RoundedCornerShape(12.dp),
                        ) {
                            Text(
                                "${stringResource(R.string.exam_finish)} (${uiState.examAnswers.size}/${uiState.examQuestions.size})",
                                color = Color.White,
                            )
                        }
                    }
                }
            }
        }
    }
}

// ==========================================
// RESULTS
// ==========================================
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ResultsContent(
    uiState: ExamQuizUiState,
    onRetry: () -> Unit,
    onBack: () -> Unit,
) {
    val correct = uiState.examResults.count { it.isCorrect }
    val total = uiState.examResults.size
    val pct = if (total > 0) (correct * 100) / total else 0
    val passed = pct >= 70
    val minutes = uiState.examTimeTakenSeconds / 60
    val seconds = uiState.examTimeTakenSeconds % 60

    var showDetails by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.exam_results_title)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.exam_back))
                    }
                },
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item { Spacer(modifier = Modifier.height(8.dp)) }

            // Score card
            item {
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = if (passed)
                            SafeGreen.copy(alpha = 0.1f)
                        else
                            AlarmRed.copy(alpha = 0.1f)
                    ),
                    shape = RoundedCornerShape(24.dp),
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Icon(
                            imageVector = if (passed) Icons.Default.CheckCircle else Icons.Default.Close,
                            contentDescription = null,
                            modifier = Modifier.size(56.dp),
                            tint = if (passed) SafeGreen else AlarmRed,
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = "$pct%",
                            style = MaterialTheme.typography.displaySmall,
                            fontWeight = FontWeight.Black,
                            color = if (passed) SafeGreen else AlarmRed,
                        )
                        Text(
                            text = if (passed)
                                stringResource(R.string.exam_passed)
                            else
                                stringResource(R.string.exam_failed),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "$correct / $total ${stringResource(R.string.exam_correct_answers)}",
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextGrey,
                        )
                        Text(
                            text = "${stringResource(R.string.exam_time)}: %d:%02d | ${stringResource(R.string.exam_required)}: 70%%".format(minutes, seconds),
                            style = MaterialTheme.typography.bodySmall,
                            color = TextGrey.copy(alpha = 0.7f),
                        )
                    }
                }
            }

            // Category breakdown
            item {
                Card(colors = CardDefaults.cardColors(containerColor = NavySurface)) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = stringResource(R.string.exam_results_by_category),
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold,
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        ExamCategory.entries.forEach { cat ->
                            val catResults = uiState.examResults.filter { it.question.category == cat }
                            if (catResults.isNotEmpty()) {
                                val catCorrect = catResults.count { it.isCorrect }
                                val catPct = (catCorrect * 100) / catResults.size
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 4.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(8.dp)
                                            .clip(CircleShape)
                                            .background(getCategoryColor(cat)),
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = cat.displayName,
                                        style = MaterialTheme.typography.bodySmall,
                                        modifier = Modifier.weight(1f),
                                    )
                                    Text(
                                        text = "$catCorrect/${catResults.size} ($catPct%)",
                                        style = MaterialTheme.typography.bodySmall,
                                        fontWeight = FontWeight.Bold,
                                        color = if (catPct >= 70) SafeGreen else AlarmRed,
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // Show details toggle
            item {
                OutlinedButton(
                    onClick = { showDetails = !showDetails },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                ) {
                    Text(
                        if (showDetails)
                            stringResource(R.string.exam_hide_details)
                        else
                            stringResource(R.string.exam_show_details)
                    )
                }
            }

            // Detail items
            if (showDetails) {
                itemsIndexed(uiState.examResults) { index, result ->
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = if (result.isCorrect)
                                SafeGreen.copy(alpha = 0.05f)
                            else
                                AlarmRed.copy(alpha = 0.05f)
                        ),
                        shape = RoundedCornerShape(16.dp),
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = if (result.isCorrect) "OK" else "ERR",
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = if (result.isCorrect) SafeGreen else AlarmRed,
                                    modifier = Modifier
                                        .background(
                                            if (result.isCorrect) SafeGreen.copy(alpha = 0.15f)
                                            else AlarmRed.copy(alpha = 0.15f),
                                            RoundedCornerShape(6.dp),
                                        )
                                        .padding(horizontal = 8.dp, vertical = 2.dp),
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "#${index + 1}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = TextGrey,
                                )
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = result.question.text,
                                style = MaterialTheme.typography.bodySmall,
                            )
                            if (!result.isCorrect) {
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "${stringResource(R.string.exam_your_answer)}: ${result.userAnswer ?: "-"}  |  ${stringResource(R.string.exam_correct_answer)}: ${result.question.correctAnswer}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = TextGrey,
                                )
                            }
                        }
                    }
                }
            }

            // Actions
            item {
                Button(
                    onClick = onRetry,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = CautionYellow),
                    shape = RoundedCornerShape(16.dp),
                ) {
                    Icon(Icons.Default.Refresh, contentDescription = null, tint = Color.Black)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(stringResource(R.string.exam_retry), color = Color.Black, fontWeight = FontWeight.Bold)
                }
            }

            item {
                OutlinedButton(
                    onClick = onBack,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    shape = RoundedCornerShape(16.dp),
                ) {
                    Text(stringResource(R.string.exam_back_to_menu))
                }
            }

            item { Spacer(modifier = Modifier.height(24.dp)) }
        }
    }
}

// ==========================================
// LEITNER OVERVIEW
// ==========================================
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun LeitnerOverviewContent(
    uiState: ExamQuizUiState,
    onStartSession: () -> Unit,
    onResetLeitner: () -> Unit,
    onBack: () -> Unit,
) {
    var showResetDialog by remember { mutableStateOf(false) }

    if (showResetDialog) {
        AlertDialog(
            onDismissRequest = { showResetDialog = false },
            title = { Text(stringResource(R.string.leitner_reset_title)) },
            text = { Text(stringResource(R.string.leitner_reset_message)) },
            confirmButton = {
                TextButton(onClick = {
                    onResetLeitner()
                    showResetDialog = false
                }) {
                    Text(stringResource(R.string.exam_reset_confirm))
                }
            },
            dismissButton = {
                TextButton(onClick = { showResetDialog = false }) {
                    Text(stringResource(R.string.cancel))
                }
            },
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.leitner_title)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.exam_back))
                    }
                },
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item { Spacer(modifier = Modifier.height(8.dp)) }

            // Header
            item {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Icon(
                        imageVector = Icons.Default.Inventory2,
                        contentDescription = null,
                        modifier = Modifier.size(64.dp),
                        tint = OceanBlue,
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = stringResource(R.string.leitner_title),
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        text = stringResource(R.string.leitner_subtitle),
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextGrey,
                    )
                    if (uiState.leitnerStats.sessionNumber > 0) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = stringResource(R.string.leitner_session, uiState.leitnerStats.sessionNumber),
                            style = MaterialTheme.typography.bodySmall,
                            color = TextGrey.copy(alpha = 0.7f),
                        )
                    }
                }
            }

            // Mastery progress
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = NavySurface),
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                text = stringResource(R.string.leitner_progress),
                                style = MaterialTheme.typography.titleSmall,
                                color = TextGrey,
                            )
                            Text(
                                text = "${(uiState.leitnerStats.masteredPercent * 100).toInt()}%",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                                color = SafeGreen,
                            )
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        LinearProgressIndicator(
                            progress = { uiState.leitnerStats.masteredPercent },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(6.dp)
                                .clip(RoundedCornerShape(3.dp)),
                            color = SafeGreen,
                            trackColor = NavyMedium,
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = stringResource(
                                R.string.leitner_mastered,
                                uiState.leitnerStats.masteredCount,
                                uiState.leitnerStats.totalQuestions,
                            ),
                            style = MaterialTheme.typography.bodySmall,
                            color = TextGrey,
                        )
                    }
                }
            }

            // Box breakdown
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = NavySurface),
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        val boxData = listOf(
                            Triple(LeitnerBox.BOX_1, R.string.leitner_box_1_desc, AlarmRed),
                            Triple(LeitnerBox.BOX_2, R.string.leitner_box_2_desc, WarningOrange),
                            Triple(LeitnerBox.BOX_3, R.string.leitner_box_3_desc, CautionYellow),
                            Triple(LeitnerBox.BOX_4, R.string.leitner_box_4_desc, OceanBlue),
                            Triple(LeitnerBox.BOX_5, R.string.leitner_box_5_desc, SafeGreen),
                        )
                        boxData.forEach { (box, descRes, color) ->
                            val count = uiState.leitnerBoxCounts[box] ?: 0
                            val total = uiState.leitnerStats.totalQuestions
                            val fraction = if (total > 0) count.toFloat() / total else 0f

                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(10.dp)
                                        .clip(CircleShape)
                                        .background(color),
                                )
                                Spacer(modifier = Modifier.width(10.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = stringResource(R.string.leitner_box, box.level),
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.SemiBold,
                                    )
                                    Text(
                                        text = stringResource(descRes),
                                        style = MaterialTheme.typography.bodySmall,
                                        color = TextGrey,
                                    )
                                }
                                Text(
                                    text = "$count",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = color,
                                )
                            }

                            LinearProgressIndicator(
                                progress = { fraction },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(4.dp)
                                    .clip(RoundedCornerShape(2.dp)),
                                color = color,
                                trackColor = NavyMedium.copy(alpha = 0.3f),
                            )
                        }
                    }
                }
            }

            // Due questions info
            item {
                val dueCount = uiState.leitnerDueQuestions.size
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = if (dueCount > 0) OceanBlue.copy(alpha = 0.1f)
                        else SafeGreen.copy(alpha = 0.1f)
                    ),
                    shape = RoundedCornerShape(16.dp),
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text(
                            text = stringResource(R.string.leitner_due_today),
                            style = MaterialTheme.typography.titleSmall,
                            color = TextGrey,
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "$dueCount",
                            style = MaterialTheme.typography.displaySmall,
                            fontWeight = FontWeight.Black,
                            color = if (dueCount > 0) OceanBlue else SafeGreen,
                        )
                        Text(
                            text = stringResource(R.string.leitner_questions_due, dueCount),
                            style = MaterialTheme.typography.bodySmall,
                            color = TextGrey,
                        )
                    }
                }
            }

            // Start session button
            item {
                Button(
                    onClick = onStartSession,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = OceanBlue),
                    shape = RoundedCornerShape(16.dp),
                    enabled = uiState.leitnerDueQuestions.isNotEmpty(),
                ) {
                    Icon(Icons.Default.Inventory2, contentDescription = null, tint = Color.White)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = stringResource(R.string.leitner_start),
                        style = MaterialTheme.typography.titleMedium,
                        color = Color.White,
                    )
                }
            }

            // Reset
            if (uiState.leitnerStats.sessionNumber > 0) {
                item {
                    TextButton(
                        onClick = { showResetDialog = true },
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Icon(Icons.Default.Refresh, contentDescription = null, tint = TextGrey)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = stringResource(R.string.leitner_reset),
                            color = TextGrey,
                        )
                    }
                }
            }

            // Back to menu
            item {
                OutlinedButton(
                    onClick = onBack,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    shape = RoundedCornerShape(16.dp),
                ) {
                    Text(stringResource(R.string.exam_back_to_menu))
                }
            }

            item { Spacer(modifier = Modifier.height(24.dp)) }
        }
    }
}

// ==========================================
// LEITNER SESSION
// ==========================================
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun LeitnerSessionContent(
    uiState: ExamQuizUiState,
    onSelectAnswer: (String) -> Unit,
    onNext: () -> Unit,
    onFinishSession: () -> Unit,
    onBack: () -> Unit,
) {
    var showQuitDialog by remember { mutableStateOf(false) }

    if (showQuitDialog) {
        AlertDialog(
            onDismissRequest = { showQuitDialog = false },
            title = { Text(stringResource(R.string.exam_quit_title)) },
            text = { Text(stringResource(R.string.exam_quit_message)) },
            confirmButton = {
                TextButton(onClick = {
                    showQuitDialog = false
                    onFinishSession()
                }) {
                    Text(stringResource(R.string.exam_quit_confirm))
                }
            },
            dismissButton = {
                TextButton(onClick = { showQuitDialog = false }) {
                    Text(stringResource(R.string.cancel))
                }
            },
        )
    }

    val question = uiState.leitnerCurrentQuestion

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.leitner_title)) },
                navigationIcon = {
                    IconButton(onClick = { showQuitDialog = true }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.exam_back))
                    }
                },
                actions = {
                    Text(
                        text = stringResource(R.string.leitner_remaining, uiState.leitnerSessionRemaining),
                        style = MaterialTheme.typography.bodySmall,
                        color = TextGrey,
                        modifier = Modifier.padding(end = 16.dp),
                    )
                },
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            // Progress bar
            val total = uiState.leitnerSessionTotal
            val done = uiState.leitnerSessionCorrect + uiState.leitnerSessionIncorrect
            if (total > 0) {
                LinearProgressIndicator(
                    progress = { done.toFloat() / total },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                        .height(4.dp)
                        .clip(RoundedCornerShape(2.dp)),
                    color = OceanBlue,
                    trackColor = NavyMedium,
                )
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(
                        text = "${done + 1} / $total",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextGrey,
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text(
                            text = "${uiState.leitnerSessionCorrect} OK",
                            style = MaterialTheme.typography.bodySmall,
                            color = SafeGreen,
                        )
                        Text(
                            text = "${uiState.leitnerSessionIncorrect} Err",
                            style = MaterialTheme.typography.bodySmall,
                            color = AlarmRed,
                        )
                    }
                }
            }

            if (question != null) {
                LazyColumn(
                    modifier = Modifier
                        .weight(1f)
                        .padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    item { Spacer(modifier = Modifier.height(8.dp)) }

                    item {
                        QuestionCard(question = question)
                    }

                    items(question.answers) { answer ->
                        val state = when {
                            uiState.leitnerSelectedAnswer == null -> AnswerState.Default
                            answer.label == question.correctAnswer -> AnswerState.Correct
                            answer.label == uiState.leitnerSelectedAnswer -> AnswerState.Incorrect
                            else -> AnswerState.Default
                        }
                        AnswerOptionCard(
                            answer = answer,
                            state = state,
                            onClick = { onSelectAnswer(answer.label) },
                            enabled = uiState.leitnerSelectedAnswer == null,
                        )
                    }

                    // Result feedback
                    if (uiState.leitnerShowResult) {
                        item {
                            Card(
                                colors = CardDefaults.cardColors(
                                    containerColor = if (uiState.leitnerLastCorrect)
                                        SafeGreen.copy(alpha = 0.1f)
                                    else
                                        AlarmRed.copy(alpha = 0.1f)
                                ),
                                shape = RoundedCornerShape(12.dp),
                            ) {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(12.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                ) {
                                    Text(
                                        text = if (uiState.leitnerLastCorrect)
                                            stringResource(R.string.leitner_correct_advance, uiState.leitnerLastNewBox)
                                        else
                                            stringResource(R.string.leitner_incorrect_back),
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.SemiBold,
                                        color = if (uiState.leitnerLastCorrect) SafeGreen else AlarmRed,
                                        textAlign = TextAlign.Center,
                                    )
                                }
                            }
                        }
                    }

                    item { Spacer(modifier = Modifier.height(8.dp)) }
                }

                // Next button
                if (uiState.leitnerShowResult) {
                    Button(
                        onClick = onNext,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp)
                            .height(48.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = OceanBlue),
                        shape = RoundedCornerShape(12.dp),
                    ) {
                        Text(
                            text = stringResource(R.string.leitner_continue),
                            color = Color.White,
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Icon(Icons.Default.NavigateNext, contentDescription = null, tint = Color.White)
                    }
                }
            } else {
                EmptyState(stringResource(R.string.leitner_no_due))
            }
        }
    }
}

// ==========================================
// LEITNER SESSION COMPLETE
// ==========================================
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun LeitnerSessionCompleteContent(
    uiState: ExamQuizUiState,
    onNewSession: () -> Unit,
    onBack: () -> Unit,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.leitner_session_complete)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.exam_back))
                    }
                },
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item { Spacer(modifier = Modifier.height(16.dp)) }

            item {
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = OceanBlue.copy(alpha = 0.1f)
                    ),
                    shape = RoundedCornerShape(24.dp),
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            modifier = Modifier.size(56.dp),
                            tint = OceanBlue,
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = stringResource(R.string.leitner_session_complete),
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = stringResource(
                                R.string.leitner_session_stats,
                                uiState.leitnerSessionCorrect,
                                uiState.leitnerSessionIncorrect,
                            ),
                            style = MaterialTheme.typography.bodyLarge,
                            color = TextGrey,
                        )
                        Spacer(modifier = Modifier.height(12.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceEvenly,
                        ) {
                            StatItem(
                                value = "${uiState.leitnerSessionCorrect}",
                                label = stringResource(R.string.exam_stat_correct),
                                valueColor = SafeGreen,
                            )
                            StatItem(
                                value = "${uiState.leitnerSessionIncorrect}",
                                label = "Err",
                                valueColor = AlarmRed,
                            )
                            StatItem(
                                value = "${uiState.leitnerStats.masteredCount}",
                                label = stringResource(R.string.leitner_box_5_desc),
                                valueColor = OceanBlue,
                            )
                        }
                    }
                }
            }

            // Mastery progress
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = NavySurface),
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = stringResource(R.string.leitner_progress),
                            style = MaterialTheme.typography.titleSmall,
                            color = TextGrey,
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        LinearProgressIndicator(
                            progress = { uiState.leitnerStats.masteredPercent },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(8.dp)
                                .clip(RoundedCornerShape(4.dp)),
                            color = SafeGreen,
                            trackColor = NavyMedium,
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = stringResource(
                                R.string.leitner_mastered,
                                uiState.leitnerStats.masteredCount,
                                uiState.leitnerStats.totalQuestions,
                            ),
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextGrey,
                        )
                    }
                }
            }

            // Actions
            item {
                Button(
                    onClick = onNewSession,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = OceanBlue),
                    shape = RoundedCornerShape(16.dp),
                ) {
                    Icon(Icons.Default.Refresh, contentDescription = null, tint = Color.White)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = stringResource(R.string.leitner_start),
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }

            item {
                OutlinedButton(
                    onClick = onBack,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    shape = RoundedCornerShape(16.dp),
                ) {
                    Text(stringResource(R.string.exam_back_to_menu))
                }
            }

            item { Spacer(modifier = Modifier.height(24.dp)) }
        }
    }
}

// ==========================================
// SHARED COMPONENTS
// ==========================================

enum class AnswerState { Default, Selected, Correct, Incorrect }

@Composable
private fun QuestionCard(question: ExamQuestion) {
    Card(
        colors = CardDefaults.cardColors(containerColor = NavySurface),
        shape = RoundedCornerShape(16.dp),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                CategoryChip(category = question.category)
                Text(
                    text = "#${question.id}",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextGrey.copy(alpha = 0.5f),
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = question.text,
                style = MaterialTheme.typography.bodyLarge,
                lineHeight = 24.sp,
            )
            // Image placeholder - when imageResId or imageUrl is set, display image here
            // TODO: Add image loading support (Coil for URLs, painterResource for drawables)
        }
    }
}

@Composable
private fun AnswerOptionCard(
    answer: AnswerOption,
    state: AnswerState,
    onClick: () -> Unit,
    enabled: Boolean,
) {
    val bgColor by animateColorAsState(
        targetValue = when (state) {
            AnswerState.Correct -> SafeGreen.copy(alpha = 0.15f)
            AnswerState.Incorrect -> AlarmRed.copy(alpha = 0.15f)
            AnswerState.Selected -> CautionYellow.copy(alpha = 0.15f)
            AnswerState.Default -> NavySurface.copy(alpha = 0.5f)
        },
        label = "answer_bg",
    )

    val borderColor by animateColorAsState(
        targetValue = when (state) {
            AnswerState.Correct -> SafeGreen.copy(alpha = 0.5f)
            AnswerState.Incorrect -> AlarmRed.copy(alpha = 0.5f)
            AnswerState.Selected -> CautionYellow.copy(alpha = 0.5f)
            AnswerState.Default -> Color.White.copy(alpha = 0.08f)
        },
        label = "answer_border",
    )

    val labelBg = when (state) {
        AnswerState.Correct -> SafeGreen.copy(alpha = 0.3f)
        AnswerState.Incorrect -> AlarmRed.copy(alpha = 0.3f)
        AnswerState.Selected -> CautionYellow.copy(alpha = 0.3f)
        AnswerState.Default -> Color.White.copy(alpha = 0.08f)
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(bgColor)
            .border(1.dp, borderColor, RoundedCornerShape(16.dp))
            .clickable(enabled = enabled, onClick = onClick)
            .padding(14.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Box(
            modifier = Modifier
                .size(32.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(labelBg),
            contentAlignment = Alignment.Center,
        ) {
            if (state == AnswerState.Correct) {
                Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(18.dp), tint = SafeGreen)
            } else if (state == AnswerState.Incorrect) {
                Icon(Icons.Default.Close, contentDescription = null, modifier = Modifier.size(18.dp), tint = AlarmRed)
            } else {
                Text(
                    text = answer.label,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = when (state) {
                        AnswerState.Selected -> CautionYellow
                        else -> Color.White.copy(alpha = 0.6f)
                    },
                )
            }
        }
        Spacer(modifier = Modifier.width(12.dp))
        Text(
            text = answer.text,
            style = MaterialTheme.typography.bodyMedium,
            lineHeight = 20.sp,
            modifier = Modifier.padding(top = 4.dp),
        )
    }
}

@Composable
private fun CategoryChip(category: ExamCategory) {
    val color = getCategoryColor(category)
    Row(
        modifier = Modifier
            .background(color.copy(alpha = 0.1f), RoundedCornerShape(8.dp))
            .border(1.dp, color.copy(alpha = 0.2f), RoundedCornerShape(8.dp))
            .padding(horizontal = 8.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Box(
            modifier = Modifier
                .size(6.dp)
                .clip(CircleShape)
                .background(color),
        )
        Text(
            text = category.displayName,
            style = MaterialTheme.typography.labelSmall,
            color = color,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

@Composable
private fun CategoryFilterSection(
    selectedCategories: Set<ExamCategory>,
    onToggle: (ExamCategory) -> Unit,
    onSelectAll: () -> Unit,
    onDeselectAll: () -> Unit,
) {
    Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            TextButton(onClick = onSelectAll) {
                Text(stringResource(R.string.exam_select_all), style = MaterialTheme.typography.bodySmall, color = CautionYellow)
            }
            TextButton(onClick = onDeselectAll) {
                Text(stringResource(R.string.exam_deselect_all), style = MaterialTheme.typography.bodySmall, color = TextGrey)
            }
        }
        ExamCategory.entries.forEach { cat ->
            val isSelected = cat in selectedCategories
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(if (isSelected) NavySurface else NavyMedium.copy(alpha = 0.3f))
                    .clickable { onToggle(cat) }
                    .padding(horizontal = 12.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    modifier = Modifier
                        .size(18.dp)
                        .clip(RoundedCornerShape(4.dp))
                        .background(
                            if (isSelected) getCategoryColor(cat) else Color.Transparent
                        )
                        .border(
                            1.dp,
                            if (isSelected) getCategoryColor(cat) else Color.White.copy(alpha = 0.2f),
                            RoundedCornerShape(4.dp),
                        ),
                    contentAlignment = Alignment.Center,
                ) {
                    if (isSelected) {
                        Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(12.dp), tint = Color.White)
                    }
                }
                Spacer(modifier = Modifier.width(10.dp))
                Text(
                    text = cat.displayName,
                    style = MaterialTheme.typography.bodyMedium,
                    color = if (isSelected) Color.White else Color.White.copy(alpha = 0.5f),
                )
            }
            Spacer(modifier = Modifier.height(4.dp))
        }
    }
}

@Composable
private fun StatItem(
    value: String,
    label: String,
    valueColor: Color = Color.White,
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = value,
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = valueColor,
        )
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = TextGrey,
        )
    }
}

@Composable
private fun EmptyState(message: String) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(
            imageVector = Icons.Default.School,
            contentDescription = null,
            modifier = Modifier.size(64.dp),
            tint = TextGrey.copy(alpha = 0.3f),
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = message,
            style = MaterialTheme.typography.bodyLarge,
            color = TextGrey,
            textAlign = TextAlign.Center,
        )
    }
}

private fun getCategoryColor(category: ExamCategory): Color = when (category) {
    ExamCategory.JACHTY_ZAGLOWE -> CautionYellow
    ExamCategory.LOCJA -> OceanBlue
    ExamCategory.METEOROLOGIA -> Color(0xFF06B6D4) // Cyan
    ExamCategory.NAWIGACJA -> SafeGreen
    ExamCategory.PLANOWANIE -> WarningOrange
    ExamCategory.PRAWO -> Color(0xFF6366F1) // Indigo
    ExamCategory.RATOWNICTWO -> AlarmRed
    ExamCategory.SYGNALY -> Color(0xFFAB47BC) // Purple
}
