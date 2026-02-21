package com.hiosdra.openanchor.ui.crewwatch

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.hiosdra.openanchor.R
import com.hiosdra.openanchor.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CrewWatchScreen(
    onBack: () -> Unit,
    viewModel: CrewWatchViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    // Warning snackbar
    val snackbarHostState = remember { SnackbarHostState() }
    LaunchedEffect(uiState.showWarningEvent) {
        if (uiState.showWarningEvent) {
            snackbarHostState.showSnackbar(
                message = "Watch change in 5 minutes!",
                duration = SnackbarDuration.Long
            )
            viewModel.dismissWarning()
        }
    }

    // Watch change dialog
    if (uiState.showWatchChangeEvent != null) {
        AlertDialog(
            onDismissRequest = { viewModel.dismissWatchChange() },
            icon = { Icon(Icons.Default.SwapHoriz, contentDescription = null, tint = OceanBlue) },
            title = { Text("Watch Change") },
            text = {
                Text(
                    text = "It's now ${uiState.showWatchChangeEvent}'s watch!",
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
            },
            confirmButton = {
                Button(onClick = { viewModel.dismissWatchChange() }) {
                    Text("OK")
                }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.crew_watch)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = stringResource(R.string.cancel))
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Timer section
            item {
                Spacer(modifier = Modifier.height(8.dp))
                TimerCard(uiState = uiState)
            }

            // Controls
            item {
                ControlsCard(
                    uiState = uiState,
                    onSetDuration = { viewModel.setWatchDuration(it) },
                    onStart = { viewModel.startWatch() },
                    onStop = { viewModel.stopWatch() }
                )
            }

            // Crew member list header
            item {
                Text(
                    text = stringResource(R.string.crew_watch_schedule),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }

            // Crew members
            itemsIndexed(uiState.crewMembers) { index, member ->
                CrewMemberRow(
                    name = member,
                    isCurrent = index == uiState.crewMembers.indexOf(uiState.currentCrewMember),
                    isNext = member == uiState.nextCrewMember && uiState.isRunning,
                    onRemove = { viewModel.removeCrewMember(index) },
                    isRunning = uiState.isRunning
                )
            }

            // Add crew member
            item {
                AddCrewMemberRow(
                    name = uiState.newMemberName,
                    onNameChange = { viewModel.updateNewMemberName(it) },
                    onAdd = { viewModel.addCrewMember() },
                    isRunning = uiState.isRunning
                )
            }

            item { Spacer(modifier = Modifier.height(16.dp)) }
        }
    }
}

@Composable
private fun TimerCard(uiState: CrewWatchUiState) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = if (uiState.isRunning) NavySurface else MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            if (uiState.isRunning) {
                // Current watch member
                Text(
                    text = uiState.currentCrewMember ?: "—",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = OceanBlue
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = stringResource(R.string.crew_watch_timer),
                    style = MaterialTheme.typography.bodySmall,
                    color = TextGrey
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Big countdown timer
                val hours = uiState.remainingMs / (60 * 60 * 1000)
                val minutes = (uiState.remainingMs % (60 * 60 * 1000)) / (60 * 1000)
                val seconds = (uiState.remainingMs % (60 * 1000)) / 1000

                val timerColor = when {
                    uiState.remainingMs <= 5 * 60 * 1000 -> AlarmRed
                    uiState.remainingMs <= 15 * 60 * 1000 -> CautionYellow
                    else -> TextWhite
                }

                Text(
                    text = String.format(java.util.Locale.US, "%02d:%02d:%02d", hours, minutes, seconds),
                    fontSize = 56.sp,
                    fontWeight = FontWeight.Bold,
                    color = timerColor
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Progress bar
                LinearProgressIndicator(
                    progress = { uiState.progress },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(8.dp)
                        .clip(RoundedCornerShape(4.dp)),
                    color = OceanBlue,
                    trackColor = NavyDark,
                )

                Spacer(modifier = Modifier.height(12.dp))

                // Next watch info
                uiState.nextCrewMember?.let { next ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.SkipNext,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = TextGrey
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "${stringResource(R.string.crew_watch_next)}: $next",
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextGrey
                        )
                    }
                }
            } else {
                // Idle state
                Icon(
                    imageVector = Icons.Default.AccessTime,
                    contentDescription = null,
                    modifier = Modifier.size(64.dp),
                    tint = OceanBlue
                )

                Spacer(modifier = Modifier.height(12.dp))

                Text(
                    text = stringResource(R.string.crew_watch),
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(4.dp))

                Text(
                    text = stringResource(R.string.crew_watch_subtitle),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}

@Composable
private fun ControlsCard(
    uiState: CrewWatchUiState,
    onSetDuration: (Int) -> Unit,
    onStart: () -> Unit,
    onStop: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            // Duration selector
            Text(
                text = stringResource(R.string.crew_watch_duration),
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf(1, 2, 3, 4, 6).forEach { hours ->
                    FilterChip(
                        selected = uiState.watchDurationHours == hours,
                        onClick = { if (!uiState.isRunning) onSetDuration(hours) },
                        label = { Text(stringResource(R.string.crew_watch_duration_hours, hours)) },
                        enabled = !uiState.isRunning,
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Watch alarm hint
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Default.Vibration,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = stringResource(R.string.crew_watch_alarm_5min),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Start / Stop button
            if (uiState.isRunning) {
                Button(
                    onClick = onStop,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = AlarmRed)
                ) {
                    Icon(Icons.Default.Stop, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(stringResource(R.string.crew_watch_stop))
                }
            } else {
                Button(
                    onClick = onStart,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    enabled = uiState.crewMembers.isNotEmpty(),
                    colors = ButtonDefaults.buttonColors(containerColor = SafeGreen)
                ) {
                    Icon(Icons.Default.PlayArrow, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(stringResource(R.string.crew_watch_start))
                }
            }
        }
    }
}

@Composable
private fun CrewMemberRow(
    name: String,
    isCurrent: Boolean,
    isNext: Boolean,
    onRemove: () -> Unit,
    isRunning: Boolean
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = when {
                isCurrent && isRunning -> OceanBlue.copy(alpha = 0.15f)
                isNext -> CautionYellow.copy(alpha = 0.1f)
                else -> MaterialTheme.colorScheme.surfaceVariant
            }
        ),
        border = if (isCurrent && isRunning) CardDefaults.outlinedCardBorder().copy(
            width = 2.dp
        ) else null
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Avatar circle
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(
                        when {
                            isCurrent && isRunning -> OceanBlue
                            isNext -> CautionYellow
                            else -> NavySurface
                        }
                    ),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = name.firstOrNull()?.uppercase() ?: "?",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = name,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = if (isCurrent && isRunning) FontWeight.Bold else FontWeight.Normal
                )
                if (isCurrent && isRunning) {
                    Text(
                        text = "On watch",
                        style = MaterialTheme.typography.bodySmall,
                        color = OceanBlue
                    )
                } else if (isNext) {
                    Text(
                        text = stringResource(R.string.crew_watch_next),
                        style = MaterialTheme.typography.bodySmall,
                        color = CautionYellow
                    )
                }
            }

            if (!isRunning) {
                IconButton(onClick = onRemove) {
                    Icon(
                        Icons.Default.Close,
                        contentDescription = stringResource(R.string.crew_watch_remove),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

@Composable
private fun AddCrewMemberRow(
    name: String,
    onNameChange: (String) -> Unit,
    onAdd: () -> Unit,
    isRunning: Boolean
) {
    if (isRunning) return

    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        OutlinedTextField(
            value = name,
            onValueChange = onNameChange,
            modifier = Modifier.weight(1f),
            placeholder = { Text(stringResource(R.string.crew_watch_crew_member)) },
            singleLine = true,
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
            keyboardActions = KeyboardActions(onDone = { if (name.isNotBlank()) onAdd() })
        )

        Spacer(modifier = Modifier.width(8.dp))

        FilledIconButton(
            onClick = onAdd,
            enabled = name.isNotBlank()
        ) {
            Icon(Icons.Default.Add, contentDescription = stringResource(R.string.crew_watch_add_crew))
        }
    }
}
