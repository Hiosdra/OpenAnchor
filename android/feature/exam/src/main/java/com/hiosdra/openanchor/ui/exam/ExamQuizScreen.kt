package com.hiosdra.openanchor.ui.exam

import androidx.compose.foundation.background
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.NavigateBefore
import androidx.compose.material.icons.automirrored.filled.NavigateNext
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.hiosdra.openanchor.core.ui.R
import com.hiosdra.openanchor.ui.theme.AlarmRed
import com.hiosdra.openanchor.ui.theme.CautionYellow
import com.hiosdra.openanchor.ui.theme.NavyMedium
import com.hiosdra.openanchor.ui.theme.NavySurface
import com.hiosdra.openanchor.ui.theme.SafeGreen
import com.hiosdra.openanchor.ui.theme.TextGrey

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExamQuizScreen(
    onBack: () -> Unit,
    viewModel: ExamQuizViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    when (uiState.screen) {
        ExamScreenState.NoPdfImported -> ExamImportScreen(
            onImportPdf = viewModel::importPdf,
            isImporting = uiState.isImporting,
            importProgress = uiState.importProgress,
            hashWarning = uiState.hashWarning,
            onAcceptHashWarning = viewModel::acceptHashWarning,
            onRejectHashWarning = viewModel::rejectHashWarning,
            onBack = onBack,
        )
        ExamScreenState.Menu -> ExamMenuScreen(
            uiState = uiState,
            onStartLearn = viewModel::startLearnMode,
            onStartExam = viewModel::startExamMode,
            onStartLeitner = viewModel::openLeitner,
            onResetStats = viewModel::resetStats,
            onBack = onBack,
        )
        ExamScreenState.Learn -> ExamLearnScreen(
            uiState = uiState,
            pdfRenderer = viewModel.pdfRenderer,
            onSelectAnswer = viewModel::selectAnswer,
            onNext = viewModel::nextQuestion,
            onPrevious = viewModel::previousQuestion,
            onToggleCategoryFilter = viewModel::toggleCategoryFilter,
            onToggleCategory = viewModel::toggleCategory,
            onSelectAll = viewModel::selectAllCategories,
            onDeselectAll = viewModel::deselectAllCategories,
            onBack = viewModel::goToMenu,
        )
        ExamScreenState.Exam -> ExamQuizContent(
            uiState = uiState,
            pdfRenderer = viewModel.pdfRenderer,
            onSelectAnswer = viewModel::selectExamAnswer,
            onGoToQuestion = viewModel::goToExamQuestion,
            onNext = viewModel::nextExamQuestion,
            onPrevious = viewModel::previousExamQuestion,
            onFinish = viewModel::finishExam,
            onBack = viewModel::goToMenu,
        )
        ExamScreenState.Results -> ExamResultsScreen(
            uiState = uiState,
            pdfRenderer = viewModel.pdfRenderer,
            onRetry = viewModel::startExamMode,
            onBack = viewModel::goToMenu,
        )
        ExamScreenState.Leitner -> LeitnerOverviewScreen(
            uiState = uiState,
            onStartSession = viewModel::startLeitnerSession,
            onResetLeitner = viewModel::resetLeitner,
            onBack = viewModel::goToMenu,
        )
        ExamScreenState.LeitnerSession -> LeitnerSessionScreen(
            uiState = uiState,
            pdfRenderer = viewModel.pdfRenderer,
            onSelectAnswer = viewModel::selectLeitnerAnswer,
            onNext = viewModel::nextLeitnerQuestion,
            onFinishSession = viewModel::finishLeitnerSession,
            onBack = viewModel::openLeitner,
        )
        ExamScreenState.LeitnerSessionComplete -> LeitnerSessionCompleteScreen(
            uiState = uiState,
            onNewSession = viewModel::startLeitnerSession,
            onBack = viewModel::openLeitner,
        )
    }
}

// ==========================================
// EXAM MODE (timed quiz)
// ==========================================
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
internal fun ExamQuizContent(
    uiState: ExamQuizUiState,
    pdfRenderer: ExamPdfRenderer,
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

                    // Question image
                    item {
                        QuestionImageCard(question = question, pdfRenderer = pdfRenderer)
                    }

                    // Answer buttons (exam mode - no correct answer shown)
                    item {
                        AnswerButtonsRow(
                            answerCount = question.answerCount,
                            correctAnswer = question.correctAnswer,
                            selectedAnswer = selectedAnswer,
                            onSelectAnswer = { label -> onSelectAnswer(question.id, label) },
                            showCorrect = false, // Don't show correct answer during exam
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
                        Icon(Icons.AutoMirrored.Filled.NavigateBefore, contentDescription = null)
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
                            Icon(Icons.AutoMirrored.Filled.NavigateNext, contentDescription = null, tint = Color.Black)
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
