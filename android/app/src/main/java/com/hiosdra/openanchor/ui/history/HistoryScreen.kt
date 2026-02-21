package com.hiosdra.openanchor.ui.history

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.hiosdra.openanchor.R
import com.hiosdra.openanchor.domain.model.AnchorSession
import com.hiosdra.openanchor.ui.theme.AlarmRed
import com.hiosdra.openanchor.ui.theme.SafeGreen
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HistoryScreen(
    onSessionClick: (Long) -> Unit,
    onBack: () -> Unit,
    viewModel: HistoryViewModel = hiltViewModel()
) {
    val sessions by viewModel.sessions.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.history)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        if (sessions.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = stringResource(R.string.no_history),
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier.padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(sessions, key = { it.id }) { session ->
                    SessionCard(
                        session = session,
                        onClick = { onSessionClick(session.id) },
                        onDelete = { viewModel.deleteSession(session.id) }
                    )
                }
            }
        }
    }
}

@Composable
private fun SessionCard(
    session: AnchorSession,
    onClick: () -> Unit,
    onDelete: () -> Unit
) {
    val dateFormat = remember { SimpleDateFormat("dd MMM yyyy HH:mm", Locale.getDefault()) }
    var showDeleteDialog by remember { mutableStateOf(false) }

    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text(stringResource(R.string.delete_session_title)) },
            text = { Text(stringResource(R.string.delete_session_message)) },
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
        onClick = onClick,
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = dateFormat.format(Date(session.startTime)),
                    style = MaterialTheme.typography.titleMedium
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "%.6f, %.6f".format(
                        session.anchorPosition.latitude,
                        session.anchorPosition.longitude
                    ),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(4.dp))
                val duration = session.endTime?.let { it - session.startTime } ?: 0L
                val hours = duration / 3600000
                val minutes = (duration % 3600000) / 60000
                Text(
                    text = stringResource(R.string.duration_format, hours, minutes),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            if (session.alarmTriggered) {
                Icon(
                    Icons.Default.Warning,
                    contentDescription = "Alarm triggered",
                    tint = AlarmRed,
                    modifier = Modifier.padding(end = 8.dp)
                )
            } else {
                Icon(
                    Icons.Default.Warning,
                    contentDescription = "No alarms",
                    tint = SafeGreen,
                    modifier = Modifier.padding(end = 8.dp)
                )
            }

            IconButton(onClick = { showDeleteDialog = true }) {
                Icon(Icons.Default.Delete, contentDescription = "Delete", tint = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}
