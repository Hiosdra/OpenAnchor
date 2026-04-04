package com.hiosdra.openanchor.ui.logbook

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.hiosdra.openanchor.core.ui.R
import com.hiosdra.openanchor.domain.model.AnchorSession
import com.hiosdra.openanchor.domain.model.LogbookEntry
import com.hiosdra.openanchor.ui.theme.*
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LogbookScreen(
    onBack: () -> Unit,
    viewModel: LogbookViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var showGenerateDialog by remember { mutableStateOf(false) }
    var expandedEntryId by remember { mutableStateOf<Long?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.ai_logbook)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    if (uiState.isAiConfigured) {
                        IconButton(onClick = { showGenerateDialog = true }) {
                            Icon(Icons.Default.AutoAwesome, contentDescription = "Generate entry")
                        }
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Error banner
            uiState.error?.let { error ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    colors = CardDefaults.cardColors(containerColor = AlarmRed.copy(alpha = 0.1f))
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = error,
                            modifier = Modifier.weight(1f),
                            style = MaterialTheme.typography.bodySmall,
                            color = AlarmRed
                        )
                        IconButton(onClick = { viewModel.clearError() }) {
                            Icon(Icons.Default.Close, contentDescription = "Dismiss", tint = AlarmRed)
                        }
                    }
                }
            }

            if (uiState.entries.isEmpty() && !uiState.isGenerating) {
                // Empty state
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.MenuBook,
                            contentDescription = null,
                            modifier = Modifier.size(80.dp),
                            tint = TextGrey
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = stringResource(R.string.logbook_empty),
                            style = MaterialTheme.typography.bodyLarge,
                            color = TextGrey
                        )
                        if (uiState.isAiConfigured && uiState.sessions.isNotEmpty()) {
                            Spacer(modifier = Modifier.height(16.dp))
                            Button(onClick = { showGenerateDialog = true }) {
                                Icon(Icons.Default.AutoAwesome, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(stringResource(R.string.logbook_generate))
                            }
                        }
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(uiState.entries) { entry ->
                        LogbookEntryCard(
                            entry = entry,
                            isExpanded = expandedEntryId == entry.id,
                            onToggleExpand = {
                                expandedEntryId = if (expandedEntryId == entry.id) null else entry.id
                            },
                            onDelete = { viewModel.deleteEntry(entry.id) }
                        )
                    }
                }
            }
        }
    }

    // Generate dialog — pick session
    if (showGenerateDialog) {
        SessionPickerDialog(
            sessions = uiState.sessions,
            existingEntrySessionIds = uiState.entries.map { it.sessionId }.toSet(),
            isGenerating = uiState.isGenerating,
            generatingSessionId = uiState.generatingSessionId,
            onGenerate = { session -> viewModel.generateEntry(session) },
            onDismiss = { showGenerateDialog = false }
        )
    }
}

@Composable
private fun LogbookEntryCard(
    entry: LogbookEntry,
    isExpanded: Boolean,
    onToggleExpand: () -> Unit,
    onDelete: () -> Unit
) {
    val dateFormat = remember { SimpleDateFormat("dd MMM yyyy, HH:mm", Locale.getDefault()) }
    var showDeleteDialog by remember { mutableStateOf(false) }

    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text(stringResource(R.string.logbook_delete_title)) },
            text = { Text(stringResource(R.string.logbook_delete_message)) },
            confirmButton = {
                TextButton(onClick = {
                    onDelete()
                    showDeleteDialog = false
                }) {
                    Text(stringResource(R.string.delete), color = AlarmRed)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) {
                    Text(stringResource(R.string.cancel))
                }
            }
        )
    }

    Card(
        onClick = onToggleExpand,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = entry.summary,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        maxLines = if (isExpanded) Int.MAX_VALUE else 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = dateFormat.format(Date(entry.createdAt)),
                        style = MaterialTheme.typography.bodySmall,
                        color = TextGrey
                    )
                }
                Row {
                    if (entry.isAiGenerated) {
                        Icon(
                            Icons.Default.AutoAwesome,
                            contentDescription = "AI generated",
                            modifier = Modifier.size(16.dp),
                            tint = OceanBlue
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                    }
                    Icon(
                        if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                        contentDescription = "Toggle"
                    )
                }
            }

            if (isExpanded) {
                Spacer(modifier = Modifier.height(12.dp))
                HorizontalDivider()
                Spacer(modifier = Modifier.height(12.dp))

                Text(
                    text = entry.logEntry,
                    style = MaterialTheme.typography.bodyMedium
                )

                Spacer(modifier = Modifier.height(12.dp))

                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = SafeGreen.copy(alpha = 0.1f)
                    )
                ) {
                    Row(
                        modifier = Modifier.padding(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.Shield,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = SafeGreen
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = entry.safetyNote,
                            style = MaterialTheme.typography.bodySmall,
                            color = SafeGreen
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    TextButton(onClick = { showDeleteDialog = true }) {
                        Icon(
                            Icons.Default.Delete,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = AlarmRed
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(stringResource(R.string.delete), color = AlarmRed)
                    }
                }
            }
        }
    }
}

@Composable
private fun SessionPickerDialog(
    sessions: List<AnchorSession>,
    existingEntrySessionIds: Set<Long>,
    isGenerating: Boolean,
    generatingSessionId: Long?,
    onGenerate: (AnchorSession) -> Unit,
    onDismiss: () -> Unit
) {
    val dateFormat = remember { SimpleDateFormat("dd MMM yyyy, HH:mm", Locale.getDefault()) }

    AlertDialog(
        onDismissRequest = { if (!isGenerating) onDismiss() },
        title = { Text(stringResource(R.string.logbook_pick_session)) },
        text = {
            if (sessions.isEmpty()) {
                Text(stringResource(R.string.logbook_no_sessions))
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(sessions.take(20)) { session ->
                        val hasEntry = session.id in existingEntrySessionIds
                        val isThisGenerating = generatingSessionId == session.id
                        val durationMs = (session.endTime ?: 0L) - session.startTime
                        val hours = durationMs / 3600000
                        val mins = (durationMs % 3600000) / 60000

                        Card(
                            onClick = { if (!isGenerating) onGenerate(session) },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = dateFormat.format(Date(session.startTime)),
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text(
                                        text = "${hours}h ${mins}min — ${session.alarmCount} alarms",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = TextGrey
                                    )
                                }
                                when {
                                    isThisGenerating -> CircularProgressIndicator(
                                        modifier = Modifier.size(20.dp),
                                        strokeWidth = 2.dp
                                    )
                                    hasEntry -> Icon(
                                        Icons.Default.Check,
                                        contentDescription = "Has entry",
                                        tint = SafeGreen,
                                        modifier = Modifier.size(20.dp)
                                    )
                                    else -> Icon(
                                        Icons.Default.AutoAwesome,
                                        contentDescription = "Generate",
                                        tint = OceanBlue,
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss, enabled = !isGenerating) {
                Text(stringResource(R.string.cancel))
            }
        }
    )
}
