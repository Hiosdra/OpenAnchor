package com.hiosdra.openanchor.ui.client

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.hiosdra.openanchor.R
import com.hiosdra.openanchor.domain.model.AlarmState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClientDashboardScreen(
    onDisconnected: () -> Unit,
    viewModel: ClientDashboardViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    // Navigate back when disconnected and not active
    LaunchedEffect(uiState.isConnected) {
        // Only navigate if we were previously connected and are now fully disconnected
    }

    val alarmColor = when (uiState.alarmState) {
        AlarmState.SAFE -> Color(0xFF4CAF50)
        AlarmState.CAUTION -> Color(0xFFFFC107)
        AlarmState.WARNING -> Color(0xFFFF9800)
        AlarmState.ALARM -> Color(0xFFF44336)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.client_dashboard_title)) },
                actions = {
                    // Connection indicator
                    Box(
                        modifier = Modifier
                            .padding(end = 8.dp)
                            .size(12.dp)
                            .clip(CircleShape)
                            .background(
                                if (uiState.isConnected) Color(0xFF4CAF50)
                                else Color(0xFFF44336)
                            )
                    )
                    IconButton(onClick = { viewModel.showDisconnectDialog() }) {
                        Icon(Icons.Default.LinkOff, contentDescription = stringResource(R.string.paired_disconnect))
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // === Alarm State Banner ===
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = alarmColor.copy(alpha = 0.15f))
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = uiState.alarmState.name,
                        style = MaterialTheme.typography.headlineLarge.copy(
                            fontWeight = FontWeight.Bold,
                            fontSize = 36.sp
                        ),
                        color = alarmColor
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = "%.0f m".format(uiState.distanceToAnchor),
                        style = MaterialTheme.typography.displaySmall.copy(
                            fontWeight = FontWeight.Bold
                        )
                    )

                    Text(
                        text = stringResource(R.string.paired_distance),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // === Alarm controls ===
            AnimatedVisibility(
                visible = uiState.alarmState == AlarmState.ALARM || uiState.alarmState == AlarmState.WARNING
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(
                        onClick = { viewModel.muteAlarm() },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFFFF9800)
                        )
                    ) {
                        Icon(Icons.Default.VolumeOff, contentDescription = null)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(stringResource(R.string.dismiss))
                    }

                    Button(
                        onClick = { viewModel.dismissAlarm() },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFFF44336)
                        )
                    ) {
                        Icon(Icons.Default.AlarmOff, contentDescription = null)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(stringResource(R.string.dismiss_alarm))
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // === Telemetry Grid ===
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                TelemetryCard(
                    modifier = Modifier.weight(1f),
                    label = stringResource(R.string.paired_gps),
                    value = "\u00B1%.0f m".format(uiState.gpsAccuracy),
                    icon = Icons.Default.GpsFixed
                )
                TelemetryCard(
                    modifier = Modifier.weight(1f),
                    label = "SOG",
                    value = uiState.sog?.let { "%.1f kn".format(it) } ?: "--",
                    icon = Icons.Default.Speed
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                TelemetryCard(
                    modifier = Modifier.weight(1f),
                    label = stringResource(R.string.paired_battery),
                    value = if (uiState.localBatteryLevel >= 0) "${uiState.localBatteryLevel}%" else "--",
                    icon = if (uiState.localBatteryCharging) Icons.Default.BatteryChargingFull
                    else Icons.Default.Battery5Bar
                )
                TelemetryCard(
                    modifier = Modifier.weight(1f),
                    label = stringResource(R.string.paired_connection),
                    value = if (uiState.isConnected) stringResource(R.string.paired_connection_ok)
                    else stringResource(R.string.paired_connection_lost),
                    icon = if (uiState.isConnected) Icons.Default.Wifi else Icons.Default.WifiOff,
                    valueColor = if (uiState.isConnected) Color(0xFF4CAF50) else Color(0xFFF44336)
                )
            }

            // === Server GPS Verification ===
            uiState.serverGpsReport?.let { report ->
                Spacer(modifier = Modifier.height(16.dp))

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.secondaryContainer
                    )
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = stringResource(R.string.client_server_gps),
                            style = MaterialTheme.typography.titleSmall,
                            color = MaterialTheme.colorScheme.onSecondaryContainer
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Distance: %.0f m".format(report.distanceToAnchor))
                            Text("Zone: ${report.zoneCheckResult}")
                        }
                        if (report.batteryLevel != null) {
                            Text(
                                text = stringResource(R.string.peer_battery, report.batteryLevel),
                                style = MaterialTheme.typography.bodySmall
                            )
                        }
                    }
                }
            }

            // === Drift Warning ===
            AnimatedVisibility(visible = uiState.serverDriftDetected) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 8.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = Color(0xFFF44336).copy(alpha = 0.15f)
                    )
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.Warning,
                            contentDescription = null,
                            tint = Color(0xFFF44336)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                text = stringResource(R.string.drift_warning),
                                style = MaterialTheme.typography.titleSmall,
                                color = Color(0xFFF44336),
                                fontWeight = FontWeight.Bold
                            )
                            uiState.serverGpsReport?.let { report ->
                                if (report.driftBearingDeg != null) {
                                    Text(
                                        stringResource(R.string.drift_direction, report.driftBearingDeg),
                                        style = MaterialTheme.typography.bodySmall
                                    )
                                }
                                if (report.driftSpeedMps != null) {
                                    Text(
                                        stringResource(R.string.drift_speed, report.driftSpeedMps * 60),
                                        style = MaterialTheme.typography.bodySmall
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // Disconnect dialog
        if (uiState.showDisconnectDialog) {
            AlertDialog(
                onDismissRequest = { viewModel.hideDisconnectDialog() },
                title = { Text(stringResource(R.string.client_disconnect_title)) },
                text = { Text(stringResource(R.string.client_disconnect_message)) },
                confirmButton = {
                    TextButton(
                        onClick = {
                            viewModel.disconnect()
                            onDisconnected()
                        }
                    ) {
                        Text(stringResource(R.string.paired_disconnect))
                    }
                },
                dismissButton = {
                    TextButton(onClick = { viewModel.hideDisconnectDialog() }) {
                        Text(stringResource(R.string.cancel))
                    }
                }
            )
        }
    }
}

@Composable
private fun TelemetryCard(
    modifier: Modifier = Modifier,
    label: String,
    value: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    valueColor: Color = MaterialTheme.colorScheme.onSurface
) {
    Card(modifier = modifier) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                icon,
                contentDescription = null,
                modifier = Modifier.size(20.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = value,
                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                color = valueColor
            )
            Text(
                text = label,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
