package com.hiosdra.openanchor.ui.monitor

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.hiosdra.openanchor.core.ui.R
import com.hiosdra.openanchor.domain.model.AlarmState
import com.hiosdra.openanchor.ui.theme.*

@Composable
fun MonitorScreen(
    sessionId: Long,
    onStopMonitoring: () -> Unit,
    onOpenWeather: (latitude: Float, longitude: Float) -> Unit,
    viewModel: MonitorViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var showStopDialog by remember { mutableStateOf(false) }
    val context = LocalContext.current

    // Announce alarm state changes to screen readers and provide haptic feedback
    val view = LocalView.current
    val haptic = LocalHapticFeedback.current
    LaunchedEffect(uiState.alarmState) {
        if (uiState.alarmState != AlarmState.SAFE) {
            view.announceForAccessibility(
                context.getString(R.string.a11y_alarm_state_announcement, uiState.alarmState.name)
            )
        }
        if (uiState.alarmState == AlarmState.WARNING || uiState.alarmState == AlarmState.ALARM) {
            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
        }
    }

    LaunchedEffect(sessionId) {
        viewModel.startMonitoring(sessionId)
    }

    if (showStopDialog) {
        AlertDialog(
            onDismissRequest = { showStopDialog = false },
            title = { Text(stringResource(R.string.stop_monitoring_title)) },
            text = { Text(stringResource(R.string.stop_monitoring_message)) },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.stopMonitoring()
                    showStopDialog = false
                    onStopMonitoring()
                }) {
                    Text(stringResource(R.string.stop))
                }
            },
            dismissButton = {
                TextButton(onClick = { showStopDialog = false }) {
                    Text(stringResource(R.string.cancel))
                }
            }
        )
    }

    // Connection status banner for paired/client mode
    Column {
        AnimatedVisibility(
            visible = uiState.isPairedMode && uiState.isActive && !uiState.peerConnected
        ) {
            Surface(
                color = WarningOrange,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Icon(
                        Icons.Default.WifiOff,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = stringResource(R.string.peer_disconnected),
                        color = Color.White,
                        style = MaterialTheme.typography.labelMedium
                    )
                }
            }
        }

        AnimatedContent(
        targetState = uiState.viewMode,
        label = "monitor_view"
    ) { mode ->
        when (mode) {
            MonitorViewMode.MAP -> MonitorMapView(
                uiState = uiState,
                onToggleView = { viewModel.toggleViewMode() },
                onStop = { showStopDialog = true },
                onDismissAlarm = { viewModel.dismissAlarm() },
                onOpenWeather = onOpenWeather,
                onSharePosition = { sharePosition(context, uiState) }
            )
            MonitorViewMode.SIMPLE -> MonitorControlPanel(
                uiState = uiState,
                onToggleView = { viewModel.toggleViewMode() },
                onStop = { showStopDialog = true },
                onDismissAlarm = { viewModel.dismissAlarm() },
                onOpenWeather = onOpenWeather,
                onSharePosition = { sharePosition(context, uiState) }
            )
        }
    }
    } // end Column
}
