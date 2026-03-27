package com.hiosdra.openanchor.ui.exam

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.School
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
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
// SHARED COMPONENTS
// ==========================================

internal enum class AnswerState { Default, Selected, Correct, Incorrect }

/**
 * Displays the question as a JPG image loaded from assets.
 */
@Composable
internal fun QuestionImageCard(question: ExamQuestion, pdfRenderer: ExamPdfRenderer) {
    val bitmap = remember(question.id) {
        try {
            pdfRenderer.renderQuestion(question)?.asImageBitmap()
        } catch (_: Exception) {
            null
        }
    }

    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(16.dp),
    ) {
        Column(modifier = Modifier.padding(4.dp)) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 8.dp),
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

            if (bitmap != null) {
                Image(
                    bitmap = bitmap,
                    contentDescription = "Pytanie #${question.id}",
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp)),
                    contentScale = ContentScale.FillWidth,
                )
            } else {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(120.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = "Nie udało się załadować obrazka",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextGrey,
                    )
                }
            }
        }
    }
}

/**
 * Row of A / B / C answer buttons with animated state feedback.
 */
@Composable
internal fun AnswerButtonsRow(
    answerCount: Int,
    correctAnswer: String,
    selectedAnswer: String?,
    onSelectAnswer: (String) -> Unit,
    showCorrect: Boolean,
) {
    val labels = listOf("A", "B", "C", "D").take(answerCount)

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        labels.forEach { label ->
            val state = when {
                selectedAnswer == null -> AnswerState.Default
                showCorrect && label == correctAnswer -> AnswerState.Correct
                !showCorrect && label == selectedAnswer -> AnswerState.Selected
                showCorrect && label == selectedAnswer && label != correctAnswer -> AnswerState.Incorrect
                else -> AnswerState.Default
            }

            AnswerButton(
                label = label,
                state = state,
                onClick = { onSelectAnswer(label) },
                enabled = selectedAnswer == null,
                modifier = Modifier.weight(1f),
            )
        }
    }
}

/**
 * Single answer button (A, B, or C) with animated color feedback.
 */
@Composable
internal fun AnswerButton(
    label: String,
    state: AnswerState,
    onClick: () -> Unit,
    enabled: Boolean,
    modifier: Modifier = Modifier,
) {
    val bgColor by animateColorAsState(
        targetValue = when (state) {
            AnswerState.Correct -> SafeGreen.copy(alpha = 0.2f)
            AnswerState.Incorrect -> AlarmRed.copy(alpha = 0.2f)
            AnswerState.Selected -> CautionYellow.copy(alpha = 0.2f)
            AnswerState.Default -> NavySurface
        },
        label = "answer_btn_bg",
    )

    val borderColor by animateColorAsState(
        targetValue = when (state) {
            AnswerState.Correct -> SafeGreen
            AnswerState.Incorrect -> AlarmRed
            AnswerState.Selected -> CautionYellow
            AnswerState.Default -> Color.White.copy(alpha = 0.15f)
        },
        label = "answer_btn_border",
    )

    val contentColor = when (state) {
        AnswerState.Correct -> SafeGreen
        AnswerState.Incorrect -> AlarmRed
        AnswerState.Selected -> CautionYellow
        AnswerState.Default -> Color.White
    }

    Box(
        modifier = modifier
            .height(56.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(bgColor)
            .border(2.dp, borderColor, RoundedCornerShape(16.dp))
            .clickable(enabled = enabled, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        when (state) {
            AnswerState.Correct -> Icon(
                Icons.Default.Check,
                contentDescription = label,
                modifier = Modifier.size(28.dp),
                tint = SafeGreen,
            )
            AnswerState.Incorrect -> Icon(
                Icons.Default.Close,
                contentDescription = label,
                modifier = Modifier.size(28.dp),
                tint = AlarmRed,
            )
            else -> Text(
                text = label,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = contentColor,
            )
        }
    }
}

@Composable
internal fun CategoryChip(category: ExamCategory) {
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
internal fun CategoryFilterSection(
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
internal fun StatItem(
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
internal fun EmptyState(message: String) {
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

internal fun getCategoryColor(category: ExamCategory): Color = when (category) {
    ExamCategory.JACHTY_ZAGLOWE -> CautionYellow
    ExamCategory.LOCJA -> OceanBlue
    ExamCategory.METEOROLOGIA -> Color(0xFF06B6D4) // Cyan
    ExamCategory.NAWIGACJA -> SafeGreen
    ExamCategory.PLANOWANIE -> WarningOrange
    ExamCategory.PRAWO -> Color(0xFF6366F1) // Indigo
    ExamCategory.RATOWNICTWO -> AlarmRed
    ExamCategory.SYGNALY -> Color(0xFFAB47BC) // Purple
}
