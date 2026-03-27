package com.hiosdra.openanchor.ui.exam

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.NavigateBefore
import androidx.compose.material.icons.automirrored.filled.NavigateNext
import androidx.compose.material.icons.filled.FilterList
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
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.hiosdra.openanchor.core.ui.R
import com.hiosdra.openanchor.ui.theme.AlarmRed
import com.hiosdra.openanchor.ui.theme.CautionYellow
import com.hiosdra.openanchor.ui.theme.NavyMedium
import com.hiosdra.openanchor.ui.theme.SafeGreen
import com.hiosdra.openanchor.ui.theme.TextGrey

// ==========================================
// LEARN MODE
// ==========================================
@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun ExamLearnScreen(
    uiState: ExamQuizUiState,
    pdfRenderer: ExamPdfRenderer,
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

                    // Question image card
                    item {
                        QuestionImageCard(question = question, pdfRenderer = pdfRenderer)
                    }

                    // Answer buttons A / B / C
                    item {
                        AnswerButtonsRow(
                            answerCount = question.answerCount,
                            correctAnswer = question.correctAnswer,
                            selectedAnswer = uiState.selectedAnswer,
                            onSelectAnswer = onSelectAnswer,
                            showCorrect = uiState.selectedAnswer != null,
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
                        Icon(Icons.AutoMirrored.Filled.NavigateBefore, contentDescription = null)
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
                        Icon(Icons.AutoMirrored.Filled.NavigateNext, contentDescription = null, tint = Color.Black)
                    }
                }
            }
        }
    }
}
