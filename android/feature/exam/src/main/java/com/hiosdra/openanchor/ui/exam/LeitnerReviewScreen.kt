package com.hiosdra.openanchor.ui.exam

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.NavigateNext
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.Refresh
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
import com.hiosdra.openanchor.core.ui.R
import com.hiosdra.openanchor.ui.theme.AlarmRed
import com.hiosdra.openanchor.ui.theme.CautionYellow
import com.hiosdra.openanchor.ui.theme.NavyMedium
import com.hiosdra.openanchor.ui.theme.NavySurface
import com.hiosdra.openanchor.ui.theme.OceanBlue
import com.hiosdra.openanchor.ui.theme.SafeGreen
import com.hiosdra.openanchor.ui.theme.TextGrey
import com.hiosdra.openanchor.ui.theme.WarningOrange

// ==========================================
// LEITNER OVERVIEW
// ==========================================
@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun LeitnerOverviewScreen(
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
                            val boxTotal = uiState.leitnerStats.totalQuestions
                            val fraction = if (boxTotal > 0) count.toFloat() / boxTotal else 0f

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
internal fun LeitnerSessionScreen(
    uiState: ExamQuizUiState,
    pdfRenderer: ExamPdfRenderer,
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
                        QuestionImageCard(question = question, pdfRenderer = pdfRenderer)
                    }

                    // Answer buttons with correct/incorrect feedback
                    item {
                        AnswerButtonsRow(
                            answerCount = question.answerCount,
                            correctAnswer = question.correctAnswer,
                            selectedAnswer = uiState.leitnerSelectedAnswer,
                            onSelectAnswer = onSelectAnswer,
                            showCorrect = uiState.leitnerSelectedAnswer != null,
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
                        Icon(Icons.AutoMirrored.Filled.NavigateNext, contentDescription = null, tint = Color.White)
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
internal fun LeitnerSessionCompleteScreen(
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
