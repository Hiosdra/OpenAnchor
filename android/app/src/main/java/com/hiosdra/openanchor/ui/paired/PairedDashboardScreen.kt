package com.hiosdra.openanchor.ui.paired

import androidx.compose.animation.animateColorAsState
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.hiosdra.openanchor.R
import com.hiosdra.openanchor.ui.components.GlassCard
import com.hiosdra.openanchor.domain.model.AlarmState
import com.hiosdra.openanchor.domain.model.AnchorZone
import com.hiosdra.openanchor.ui.components.AlarmStatusBadge
import com.hiosdra.openanchor.ui.components.MapCircle
import com.hiosdra.openanchor.ui.components.MapMarker
import com.hiosdra.openanchor.ui.components.OsmMapView
import com.hiosdra.openanchor.ui.components.icon
import com.hiosdra.openanchor.ui.theme.*
import org.osmdroid.util.GeoPoint

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PairedDashboardScreen(
    onDisconnected: () -> Unit,
    viewModel: PairedDashboardViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    // Announce alarm state changes to screen readers
    val view = LocalView.current
    val context = LocalContext.current
    LaunchedEffect(uiState.alarmState) {
        if (uiState.alarmState != AlarmState.SAFE) {
            view.announceForAccessibility(
                context.getString(R.string.a11y_alarm_state_announcement, uiState.alarmState.name)
            )
        }
    }

    // Navigate back when disconnected
    LaunchedEffect(uiState.serverRunning) {
        if (!uiState.serverRunning && !uiState.isPaired) {
            kotlinx.coroutines.delay(500)
            onDisconnected()
        }
    }

    // Disconnect confirmation dialog
    if (uiState.showDisconnectDialog) {
        AlertDialog(
            onDismissRequest = { viewModel.dismissDisconnectDialog() },
            icon = { Icon(Icons.Default.LinkOff, contentDescription = null, tint = AlarmRed) },
            title = { Text(stringResource(R.string.paired_disconnect_title)) },
            text = { Text(stringResource(R.string.paired_disconnect_message)) },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.disconnect()
                        onDisconnected()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = AlarmRed)
                ) { Text(stringResource(R.string.paired_disconnect)) }
            },
            dismissButton = {
                OutlinedButton(onClick = { viewModel.dismissDisconnectDialog() }) {
                    Text(stringResource(R.string.cancel))
                }
            }
        )
    }

    // Connection lost snackbar
    val snackbarHostState = remember { SnackbarHostState() }
    LaunchedEffect(uiState.connectionLostWarning) {
        if (uiState.connectionLostWarning) {
            snackbarHostState.showSnackbar(
                message = "Connection to tablet lost!",
                duration = SnackbarDuration.Long
            )
            viewModel.dismissConnectionWarning()
        }
    }

    // Alarm state background color
    val alarmBgColor by animateColorAsState(
        targetValue = when (uiState.alarmState) {
            AlarmState.SAFE -> SafeGreen
            AlarmState.CAUTION -> CautionYellow
            AlarmState.WARNING -> WarningOrange
            AlarmState.ALARM -> AlarmRed
        },
        label = "alarm_bg"
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.paired_dashboard)) },
                actions = {
                    IconButton(onClick = { viewModel.showDisconnectDialog() }) {
                        Icon(Icons.Default.LinkOff, contentDescription = stringResource(R.string.paired_disconnect))
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
        ) {
            // Alarm state bar
            AlarmStateBar(alarmState = uiState.alarmState, bgColor = alarmBgColor)

            // Big distance display
            DistanceDisplay(
                distance = uiState.distanceToAnchor,
                alarmState = uiState.alarmState
            )

            // Map
            if (uiState.anchorPosition != null) {
                PairedMapSection(uiState = uiState)
            }

            // Status cards
            Column(
                modifier = Modifier.padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Connection status
                StatusCard(
                    icon = if (uiState.peerConnected) Icons.Default.Wifi else Icons.Default.WifiOff,
                    label = stringResource(R.string.paired_connection),
                    value = if (uiState.peerConnected) stringResource(R.string.paired_connection_ok)
                    else stringResource(R.string.paired_connection_lost),
                    valueColor = if (uiState.peerConnected) SafeGreen else AlarmRed,
                    modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite }
                )

                // GPS accuracy
                StatusCard(
                    icon = Icons.Default.GpsFixed,
                    label = stringResource(R.string.paired_gps),
                    value = if (uiState.gpsAccuracy > 0) "\u00B1${String.format(java.util.Locale.US, "%.0f", uiState.gpsAccuracy)} m"
                    else "—",
                    valueColor = when {
                        uiState.gpsAccuracy <= 5f -> SafeGreen
                        uiState.gpsAccuracy <= 15f -> CautionYellow
                        else -> AlarmRed
                    }
                )

                // Battery
                val batteryPct = uiState.batteryLevel?.let { (it * 100).toInt() }
                StatusCard(
                    icon = when {
                        uiState.isCharging == true -> Icons.Default.BatteryChargingFull
                        batteryPct != null && batteryPct < 20 -> Icons.Default.BatteryAlert
                        else -> Icons.Default.BatteryFull
                    },
                    label = stringResource(R.string.paired_battery),
                    value = if (batteryPct != null) "$batteryPct%" else "—",
                    valueColor = when {
                        batteryPct == null -> TextGrey
                        batteryPct < 10 -> AlarmRed
                        batteryPct < 20 -> CautionYellow
                        else -> SafeGreen
                    }
                )

                // SOG/COG
                if (uiState.sog != null || uiState.cog != null) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        uiState.sog?.let { sog ->
                            StatusCard(
                                icon = Icons.Default.Speed,
                                label = "SOG",
                                value = String.format(java.util.Locale.US, "%.1f kn", sog),
                                modifier = Modifier.weight(1f)
                            )
                        }
                        uiState.cog?.let { cog ->
                            StatusCard(
                                icon = Icons.Default.Explore,
                                label = "COG",
                                value = String.format(java.util.Locale.US, "%.0f\u00B0", cog),
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Dismiss alarm button (visible in alarm states)
                if (uiState.alarmState == AlarmState.WARNING || uiState.alarmState == AlarmState.ALARM) {
                    Button(
                        onClick = { viewModel.dismissAlarm() },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(56.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = AlarmRed)
                    ) {
                        Icon(Icons.Default.VolumeOff, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = stringResource(R.string.dismiss_alarm),
                            style = MaterialTheme.typography.titleMedium
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))
            }
        }
    }
}

@Composable
private fun AlarmStateBar(alarmState: AlarmState, bgColor: Color) {
    val label = when (alarmState) {
        AlarmState.SAFE -> "SAFE"
        AlarmState.CAUTION -> "CAUTION"
        AlarmState.WARNING -> "WARNING"
        AlarmState.ALARM -> "ALARM"
    }
    val textColor = if (alarmState == AlarmState.WARNING) Color.Black else Color.White
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(bgColor)
            .padding(vertical = 8.dp)
            .semantics { liveRegion = LiveRegionMode.Polite },
        contentAlignment = Alignment.Center
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = alarmState.icon(),
                contentDescription = null,
                tint = textColor,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = label,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = textColor
            )
        }
    }
}

@Composable
private fun DistanceDisplay(distance: Double, alarmState: AlarmState) {
    val color by animateColorAsState(
        targetValue = when (alarmState) {
            AlarmState.SAFE -> SafeGreen
            AlarmState.CAUTION -> CautionYellow
            AlarmState.WARNING -> WarningOrange
            AlarmState.ALARM -> AlarmRed
        },
        label = "dist_color"
    )

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 16.dp)
            .semantics { liveRegion = LiveRegionMode.Polite },
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = String.format(java.util.Locale.US, "%.0f", distance),
            fontSize = 72.sp,
            fontWeight = FontWeight.Bold,
            color = color
        )
        Text(
            text = "m",
            style = MaterialTheme.typography.headlineSmall,
            color = TextGrey
        )
    }
}

@Composable
private fun PairedMapSection(uiState: PairedDashboardUiState) {
    val anchorPos = uiState.anchorPosition ?: return
    val anchorGeoPoint = GeoPoint(anchorPos.latitude, anchorPos.longitude)

    val markers = mutableListOf(
        MapMarker(
            position = anchorGeoPoint,
            title = "Anchor"
        )
    )

    uiState.boatPosition?.let { boat ->
        markers.add(
            MapMarker(
                position = GeoPoint(boat.latitude, boat.longitude),
                title = "Boat (Tablet)"
            )
        )
    }

    val circles = mutableListOf<MapCircle>()
    uiState.zone?.let { zone ->
        when (zone) {
            is AnchorZone.Circle -> {
                circles.add(
                    MapCircle(
                        center = anchorGeoPoint,
                        radiusMeters = zone.radiusMeters,
                        strokeColor = when (uiState.alarmState) {
                            AlarmState.SAFE -> SafeGreen
                            AlarmState.CAUTION -> CautionYellow
                            AlarmState.WARNING -> WarningOrange
                            AlarmState.ALARM -> AlarmRed
                        }
                    )
                )
                zone.bufferRadiusMeters?.let { buffer ->
                    circles.add(
                        MapCircle(
                            center = anchorGeoPoint,
                            radiusMeters = buffer,
                            strokeColor = CautionYellow.copy(alpha = 0.5f)
                        )
                    )
                }
            }
            is AnchorZone.SectorWithCircle -> {
                circles.add(
                    MapCircle(
                        center = anchorGeoPoint,
                        radiusMeters = zone.radiusMeters,
                        strokeColor = when (uiState.alarmState) {
                            AlarmState.SAFE -> SafeGreen
                            AlarmState.CAUTION -> CautionYellow
                            AlarmState.WARNING -> WarningOrange
                            AlarmState.ALARM -> AlarmRed
                        }
                    )
                )
            }
        }
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .padding(bottom = 16.dp)
            .height(250.dp),
        shape = RoundedCornerShape(12.dp)
    ) {
        OsmMapView(
            modifier = Modifier.fillMaxSize(),
            centerOn = anchorGeoPoint,
            zoomLevel = 17.0,
            markers = markers,
            circles = circles,
            polylines = emptyList(),
            mapContentDescription = stringResource(R.string.a11y_map_description)
        )
    }
}

@Composable
private fun StatusCard(
    icon: ImageVector,
    label: String,
    value: String,
    modifier: Modifier = Modifier,
    valueColor: Color = MaterialTheme.colorScheme.onSurface
) {
    GlassCard(modifier = modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(24.dp),
                tint = valueColor
            )

            Spacer(modifier = Modifier.width(12.dp))

            Text(
                text = label,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.weight(1f)
            )

            Text(
                text = value,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Bold,
                color = valueColor
            )
        }
    }
}
