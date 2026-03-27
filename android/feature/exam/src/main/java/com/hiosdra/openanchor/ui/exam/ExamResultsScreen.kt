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
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
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
import com.hiosdra.openanchor.core.ui.R
import com.hiosdra.openanchor.ui.theme.AlarmRed
import com.hiosdra.openanchor.ui.theme.CautionYellow
import com.hiosdra.openanchor.ui.theme.NavySurface
import com.hiosdra.openanchor.ui.theme.SafeGreen
import com.hiosdra.openanchor.ui.theme.TextGrey

// ==========================================
// RESULTS
// ==========================================
@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun ExamResultsScreen(
    uiState: ExamQuizUiState,
    pdfRenderer: ExamPdfRenderer,
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
                                    text = "#${result.question.id}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = TextGrey,
                                )
                                Spacer(modifier = Modifier.weight(1f))
                                CategoryChip(category = result.question.category)
                            }
                            if (!result.isCorrect) {
                                Spacer(modifier = Modifier.height(8.dp))
                                // Show the question image in review
                                QuestionImageCard(question = result.question, pdfRenderer = pdfRenderer)
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
