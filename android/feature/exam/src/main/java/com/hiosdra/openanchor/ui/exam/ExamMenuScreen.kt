package com.hiosdra.openanchor.ui.exam

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
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
import com.hiosdra.openanchor.ui.theme.CautionYellow
import com.hiosdra.openanchor.ui.theme.NavyMedium
import com.hiosdra.openanchor.ui.theme.NavySurface
import com.hiosdra.openanchor.ui.theme.OceanBlue
import com.hiosdra.openanchor.ui.theme.SafeGreen
import com.hiosdra.openanchor.ui.theme.TextGrey
import com.hiosdra.openanchor.ui.theme.WarningOrange

// ==========================================
// PDF IMPORT SCREEN
// ==========================================
@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun ExamImportScreen(
    onImportPdf: (android.net.Uri) -> Unit,
    isImporting: Boolean,
    importProgress: String,
    hashWarning: HashWarningState?,
    onAcceptHashWarning: () -> Unit,
    onRejectHashWarning: () -> Unit,
    onBack: () -> Unit,
) {
    val launcher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri -> uri?.let { onImportPdf(it) } }

    if (hashWarning != null) {
        AlertDialog(
            onDismissRequest = {},
            icon = {
                Icon(
                    Icons.Default.Warning,
                    contentDescription = null,
                    tint = WarningOrange,
                    modifier = Modifier.size(32.dp),
                )
            },
            title = { Text("Nieoczekiwany plik PDF") },
            text = {
                Text(
                    "Suma kontrolna pliku nie zgadza się z oczekiwaną. " +
                        "Plik może nie działać poprawnie z aplikacją.\n\n" +
                        "Czy chcesz kontynuować?",
                )
            },
            confirmButton = {
                TextButton(onClick = onAcceptHashWarning) {
                    Text("Kontynuuj")
                }
            },
            dismissButton = {
                TextButton(onClick = onRejectHashWarning) {
                    Text("Anuluj")
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
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.exam_back),
                        )
                    }
                },
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Icon(
                imageVector = Icons.Default.Description,
                contentDescription = null,
                modifier = Modifier.size(80.dp),
                tint = CautionYellow,
            )

            Spacer(modifier = Modifier.height(24.dp))

            Text(
                text = "Import bazy pytań",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
            )

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = "Aby korzystać z modułu egzaminacyjnego, zaimportuj plik PDF z bazą pytań egzaminacyjnych.",
                style = MaterialTheme.typography.bodyMedium,
                color = TextGrey,
                textAlign = TextAlign.Center,
            )

            Spacer(modifier = Modifier.height(32.dp))

            if (isImporting) {
                CircularProgressIndicator(color = CautionYellow)
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = importProgress,
                    style = MaterialTheme.typography.bodySmall,
                    color = TextGrey,
                )
            } else {
                Button(
                    onClick = { launcher.launch("application/pdf") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = CautionYellow),
                    shape = RoundedCornerShape(16.dp),
                ) {
                    Icon(
                        Icons.Default.Description,
                        contentDescription = null,
                        tint = Color.Black,
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Wybierz plik PDF",
                        color = Color.Black,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
        }
    }
}

// ==========================================
// MENU SCREEN
// ==========================================
@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun ExamMenuScreen(
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
