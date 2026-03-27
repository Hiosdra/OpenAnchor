package com.hiosdra.openanchor.ui.monitor

import android.content.Context
import android.content.Intent
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.hiosdra.openanchor.R
import com.hiosdra.openanchor.domain.model.AlarmState
import com.hiosdra.openanchor.domain.model.AnchorZone
import com.hiosdra.openanchor.ui.components.MapCircle
import com.hiosdra.openanchor.ui.components.MapMarker
import com.hiosdra.openanchor.ui.components.MapPolylineData
import com.hiosdra.openanchor.ui.components.OsmMapView
import com.hiosdra.openanchor.ui.theme.*
import org.osmdroid.util.GeoPoint

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

    // Announce alarm state changes to screen readers
    val view = LocalView.current
    LaunchedEffect(uiState.alarmState) {
        if (uiState.alarmState != AlarmState.SAFE) {
            view.announceForAccessibility(
                context.getString(R.string.a11y_alarm_state_announcement, uiState.alarmState.name)
            )
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
            MonitorViewMode.MAP -> MapMonitorView(
                uiState = uiState,
                onToggleView = { viewModel.toggleViewMode() },
                onStop = { showStopDialog = true },
                onDismissAlarm = { viewModel.dismissAlarm() },
                onOpenWeather = onOpenWeather,
                onSharePosition = { sharePosition(context, uiState) }
            )
            MonitorViewMode.SIMPLE -> SimpleMonitorView(
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

private fun sharePosition(context: Context, uiState: MonitorUiState) {
    val pos = uiState.boatPosition ?: uiState.anchorPosition ?: return
    val lat = pos.latitude
    val lon = pos.longitude
    val mapsLink = "https://maps.google.com/?q=$lat,$lon"
    val text = buildString {
        appendLine("OpenAnchor Position")
        appendLine("Lat: ${"%.6f".format(lat)}, Lon: ${"%.6f".format(lon)}")
        appendLine("Distance to anchor: ${"%.0f".format(uiState.distanceToAnchor)} m")
        appendLine("Status: ${uiState.alarmState.name}")
        appendLine(mapsLink)
    }
    val sendIntent = Intent().apply {
        action = Intent.ACTION_SEND
        putExtra(Intent.EXTRA_TEXT, text)
        type = "text/plain"
    }
    context.startActivity(Intent.createChooser(sendIntent, null))
}

@Composable
private fun MapMonitorView(
    uiState: MonitorUiState,
    onToggleView: () -> Unit,
    onStop: () -> Unit,
    onDismissAlarm: () -> Unit,
    onOpenWeather: (latitude: Float, longitude: Float) -> Unit,
    onSharePosition: () -> Unit
) {
    val anchorPos = uiState.anchorPosition
    val boatPos = uiState.boatPosition

    val statusColor by animateColorAsState(
        when (uiState.alarmState) {
            AlarmState.SAFE -> SafeGreen
            AlarmState.CAUTION -> CautionYellow
            AlarmState.WARNING -> WarningOrange
            AlarmState.ALARM -> AlarmRed
        },
        label = "status_color"
    )

    Box(modifier = Modifier.fillMaxSize()) {
        if (anchorPos != null) {
            val anchorGeoPoint = GeoPoint(anchorPos.latitude, anchorPos.longitude)

            val markers = buildList {
                add(MapMarker(position = anchorGeoPoint, title = "Anchor"))
                if (boatPos != null) {
                    add(
                        MapMarker(
                            position = GeoPoint(boatPos.latitude, boatPos.longitude),
                            title = "Boat",
                            snippet = "%.0f m".format(uiState.distanceToAnchor)
                        )
                    )
                }
            }

            val zone = uiState.zone
            val circles = buildList {
                if (zone != null) {
                    val zoneColor = when (uiState.alarmState) {
                        AlarmState.SAFE -> Color(0x4000FF00)
                        AlarmState.CAUTION -> Color(0x40FF9800)
                        AlarmState.WARNING -> Color(0x40FFFF00)
                        AlarmState.ALARM -> Color(0x40FF0000)
                    }
                    val strokeColor = when (uiState.alarmState) {
                        AlarmState.SAFE -> SafeGreen
                        AlarmState.CAUTION -> CautionYellow
                        AlarmState.WARNING -> WarningOrange
                        AlarmState.ALARM -> AlarmRed
                    }
                    add(
                        MapCircle(
                            center = anchorGeoPoint,
                            radiusMeters = zone.radiusMeters,
                            fillColor = zoneColor,
                            strokeColor = strokeColor,
                            strokeWidth = 3f
                        )
                    )
                    // Buffer zone circle (outer ring)
                    zone.bufferRadiusMeters?.let { bufferR ->
                        add(
                            MapCircle(
                                center = anchorGeoPoint,
                                radiusMeters = bufferR,
                                fillColor = Color(0x20FF9800),
                                strokeColor = CautionYellow.copy(alpha = 0.6f),
                                strokeWidth = 2f
                            )
                        )
                    }
                    if (zone is AnchorZone.SectorWithCircle) {
                        add(
                            MapCircle(
                                center = anchorGeoPoint,
                                radiusMeters = zone.sectorRadiusMeters,
                                fillColor = zoneColor.copy(alpha = 0.15f),
                                strokeColor = strokeColor.copy(alpha = 0.5f),
                                strokeWidth = 2f
                            )
                        )
                    }
                }
            }

            // Anchor line: real-time line from boat to anchor
            val anchorLine = if (boatPos != null) {
                listOf(
                    MapPolylineData(
                        points = listOf(
                            GeoPoint(boatPos.latitude, boatPos.longitude),
                            anchorGeoPoint
                        ),
                        color = Color.White.copy(alpha = 0.7f),
                        width = 3f
                    )
                )
            } else emptyList()

            // Track polyline: historical positions showing boat movement
            val trackLine = if (uiState.trackPoints.size >= 2) {
                val trackGeoPoints = uiState.trackPoints.map { tp ->
                    GeoPoint(tp.position.latitude, tp.position.longitude)
                }
                listOf(
                    MapPolylineData(
                        points = trackGeoPoints,
                        color = Color.Cyan.copy(alpha = 0.6f),
                        width = 4f
                    )
                )
            } else emptyList()

            OsmMapView(
                modifier = Modifier.fillMaxSize(),
                centerOn = anchorGeoPoint,
                zoomLevel = 17.0,
                markers = markers,
                circles = circles,
                polylines = trackLine + anchorLine,
                mapContentDescription = stringResource(R.string.a11y_map_description)
            )
        }

        // Status bar overlay
        Column(
            modifier = Modifier
                .align(Alignment.TopCenter)
                .fillMaxWidth()
                .padding(top = 48.dp, start = 16.dp, end = 16.dp)
        ) {
            Card(
                modifier = Modifier.fillMaxWidth().semantics {
                    liveRegion = LiveRegionMode.Polite
                },
                colors = CardDefaults.cardColors(containerColor = statusColor.copy(alpha = 0.9f))
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = uiState.alarmState.name,
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Text(
                            text = stringResource(R.string.distance_format, "%.0f".format(uiState.distanceToAnchor)),
                            style = MaterialTheme.typography.bodyLarge,
                            color = Color.White
                        )
                        // GPS accuracy indicator
                        val accuracyColor = if (uiState.gpsAccuracyMeters > 20f) AlarmRed else Color.White.copy(alpha = 0.7f)
                        Text(
                            text = stringResource(R.string.gps_accuracy_format, "%.0f".format(uiState.gpsAccuracyMeters)),
                            style = MaterialTheme.typography.bodySmall,
                            color = accuracyColor
                        )
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        // Battery indicator
                        BatteryIndicator(
                            localLevel = uiState.localBatteryLevel,
                            localCharging = uiState.localBatteryCharging,
                            peerLevel = uiState.peerBatteryLevel,
                            peerCharging = uiState.peerIsCharging,
                            compact = true
                        )
                        if (uiState.gpsSignalLost) {
                            Text(
                                text = stringResource(R.string.gps_signal_lost),
                                style = MaterialTheme.typography.labelLarge,
                                fontWeight = FontWeight.Bold,
                                color = AlarmRed
                            )
                        }
                        if (uiState.alarmState == AlarmState.ALARM) {
                            Button(
                                onClick = onDismissAlarm,
                                colors = ButtonDefaults.buttonColors(containerColor = Color.White)
                            ) {
                                Text(stringResource(R.string.dismiss), color = AlarmRed)
                            }
                        }
                    }
                }
            }

            // Drift warning banner
            DriftWarningBanner(uiState.driftAnalysis)
        }

        // Bottom controls
        Row(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            FloatingActionButton(
                onClick = onToggleView,
                containerColor = MaterialTheme.colorScheme.surface
            ) {
                Icon(Icons.Default.BatterySaver, contentDescription = stringResource(R.string.simple_view))
            }

            FloatingActionButton(
                onClick = {
                    uiState.anchorPosition?.let {
                        onOpenWeather(it.latitude.toFloat(), it.longitude.toFloat())
                    }
                },
                containerColor = MaterialTheme.colorScheme.surface
            ) {
                Icon(Icons.Default.Cloud, contentDescription = stringResource(R.string.weather_title))
            }

            FloatingActionButton(
                onClick = onSharePosition,
                containerColor = MaterialTheme.colorScheme.surface
            ) {
                Icon(Icons.Default.Share, contentDescription = stringResource(R.string.share_position))
            }

            FloatingActionButton(
                onClick = onStop,
                containerColor = AlarmRed
            ) {
                Icon(Icons.Default.Stop, contentDescription = stringResource(R.string.stop), tint = Color.White)
            }
        }
    }
}

@Composable
private fun SimpleMonitorView(
    uiState: MonitorUiState,
    onToggleView: () -> Unit,
    onStop: () -> Unit,
    onDismissAlarm: () -> Unit,
    onOpenWeather: (latitude: Float, longitude: Float) -> Unit,
    onSharePosition: () -> Unit
) {
    val bgColor by animateColorAsState(
        when (uiState.alarmState) {
            AlarmState.SAFE -> Color.Black
            AlarmState.CAUTION -> Color(0xFF1A1200)
            AlarmState.WARNING -> Color(0xFF1A1A00)
            AlarmState.ALARM -> Color(0xFF1A0000)
        },
        label = "bg_color"
    )

    val statusColor = when (uiState.alarmState) {
        AlarmState.SAFE -> SafeGreen
        AlarmState.CAUTION -> CautionYellow
        AlarmState.WARNING -> WarningOrange
        AlarmState.ALARM -> AlarmRed
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(bgColor)
            .clickable { /* keep screen alive */ }
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Status
            Text(
                text = uiState.alarmState.name,
                style = MaterialTheme.typography.headlineLarge,
                color = statusColor,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite }
            )

            // GPS signal lost warning
            if (uiState.gpsSignalLost) {
                Text(
                    text = stringResource(R.string.gps_signal_lost),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = AlarmRed
                )
            }

            // Drift warning
            DriftWarningBanner(uiState.driftAnalysis)

            // GPS accuracy
            val accuracyColor = if (uiState.gpsAccuracyMeters > 20f) AlarmRed else TextGrey
            Text(
                text = stringResource(R.string.gps_accuracy_format, "%.0f".format(uiState.gpsAccuracyMeters)),
                style = MaterialTheme.typography.bodySmall,
                color = accuracyColor
            )

            // Battery indicator
            BatteryIndicator(
                localLevel = uiState.localBatteryLevel,
                localCharging = uiState.localBatteryCharging,
                peerLevel = uiState.peerBatteryLevel,
                peerCharging = uiState.peerIsCharging,
                compact = false
            )

            Spacer(modifier = Modifier.height(32.dp))

            // Distance - big number
            Text(
                text = "%.0f".format(uiState.distanceToAnchor),
                fontSize = 96.sp,
                fontWeight = FontWeight.Bold,
                color = statusColor,
                modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite }
            )
            Text(
                text = "meters",
                style = MaterialTheme.typography.titleLarge,
                color = statusColor.copy(alpha = 0.7f)
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Arrow pointing toward anchor
            // Use compass-corrected bearing if available (works when stationary)
            val arrowBearing = if (uiState.compassAvailable) {
                // Geo bearing to anchor minus phone heading = relative direction to anchor
                (uiState.bearingToAnchor - uiState.compassHeading.toDouble() + 360.0) % 360.0
            } else {
                uiState.bearingToAnchor
            }

            BearingArrow(
                bearingDegrees = arrowBearing,
                color = statusColor,
                modifier = Modifier.size(120.dp)
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "%.0f\u00B0".format(uiState.bearingToAnchor),
                style = MaterialTheme.typography.titleMedium,
                color = TextGrey
            )
            Text(
                text = stringResource(R.string.bearing_to_anchor),
                style = MaterialTheme.typography.bodyMedium,
                color = TextGrey
            )

            Spacer(modifier = Modifier.height(48.dp))

            if (uiState.alarmState == AlarmState.ALARM) {
                Button(
                    onClick = onDismissAlarm,
                    colors = ButtonDefaults.buttonColors(containerColor = AlarmRed),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp)
                ) {
                    Text(
                        stringResource(R.string.dismiss_alarm),
                        style = MaterialTheme.typography.titleLarge,
                        color = Color.White
                    )
                }
                Spacer(modifier = Modifier.height(16.dp))
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                OutlinedButton(onClick = onToggleView) {
                    Icon(Icons.Default.Map, contentDescription = null, tint = TextGrey)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(stringResource(R.string.map_view), color = TextGrey)
                }
                OutlinedButton(onClick = {
                    uiState.anchorPosition?.let {
                        onOpenWeather(it.latitude.toFloat(), it.longitude.toFloat())
                    }
                }) {
                    Icon(Icons.Default.Cloud, contentDescription = stringResource(R.string.weather_title), tint = OceanBlue)
                }
                OutlinedButton(onClick = onSharePosition) {
                    Icon(Icons.Default.Share, contentDescription = stringResource(R.string.share_position), tint = TextGrey)
                }
                OutlinedButton(
                    onClick = onStop,
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = AlarmRed)
                ) {
                    Icon(Icons.Default.Stop, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(stringResource(R.string.stop))
                }
            }
        }
    }
}

/**
 * Battery level indicator for local and optional peer device.
 */
@Composable
private fun BatteryIndicator(
    localLevel: Int,
    localCharging: Boolean,
    peerLevel: Double?,
    peerCharging: Boolean?,
    compact: Boolean
) {
    if (localLevel < 0) return

    val batteryColor = when {
        localLevel <= 15 -> AlarmRed
        localLevel <= 30 -> CautionYellow
        else -> if (compact) Color.White.copy(alpha = 0.8f) else TextGrey
    }

    val batteryIcon = when {
        localCharging -> Icons.Default.BatteryChargingFull
        localLevel <= 15 -> Icons.Default.BatteryAlert
        else -> Icons.Default.Battery5Bar
    }

    if (compact) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                batteryIcon,
                contentDescription = null,
                tint = batteryColor,
                modifier = Modifier.size(16.dp)
            )
            Spacer(modifier = Modifier.width(2.dp))
            Text(
                text = "$localLevel%",
                style = MaterialTheme.typography.labelSmall,
                color = batteryColor
            )
            if (peerLevel != null) {
                Spacer(modifier = Modifier.width(6.dp))
                val peerColor = when {
                    peerLevel <= 15 -> AlarmRed
                    peerLevel <= 30 -> CautionYellow
                    else -> Color.White.copy(alpha = 0.6f)
                }
                Text(
                    text = "P:${peerLevel.toInt()}%",
                    style = MaterialTheme.typography.labelSmall,
                    color = peerColor
                )
            }
        }
    } else {
        Spacer(modifier = Modifier.height(4.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                batteryIcon,
                contentDescription = null,
                tint = batteryColor,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = stringResource(R.string.battery_level, localLevel),
                style = MaterialTheme.typography.bodySmall,
                color = batteryColor
            )
            if (localCharging) {
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = stringResource(R.string.battery_charging),
                    style = MaterialTheme.typography.bodySmall,
                    color = SafeGreen
                )
            }
        }
        if (peerLevel != null) {
            val peerColor = when {
                peerLevel <= 15 -> AlarmRed
                peerLevel <= 30 -> CautionYellow
                else -> TextGrey
            }
            Text(
                text = stringResource(R.string.peer_battery, peerLevel.toInt()),
                style = MaterialTheme.typography.bodySmall,
                color = peerColor
            )
        }
        if (localLevel <= 15) {
            Text(
                text = stringResource(R.string.battery_low),
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Bold,
                color = AlarmRed
            )
        }
    }
}

/**
 * Animated drift/anchor drag warning banner.
 */
@Composable
private fun DriftWarningBanner(
    driftAnalysis: com.hiosdra.openanchor.domain.drift.DriftAnalysis?
) {
    val isDragging = driftAnalysis?.isDragging == true

    AnimatedVisibility(
        visible = isDragging,
        enter = slideInVertically() + fadeIn(),
        exit = slideOutVertically() + fadeOut()
    ) {
        if (driftAnalysis != null && driftAnalysis.isDragging) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp),
                colors = CardDefaults.cardColors(containerColor = AlarmRed.copy(alpha = 0.95f))
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.Warning,
                        contentDescription = stringResource(R.string.a11y_drift_warning_icon),
                        tint = Color.White,
                        modifier = Modifier.size(28.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = stringResource(R.string.drift_warning),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        driftAnalysis.driftBearingDeg?.let { bearing ->
                            Text(
                                text = stringResource(R.string.drift_direction, bearing),
                                style = MaterialTheme.typography.bodySmall,
                                color = Color.White.copy(alpha = 0.9f)
                            )
                        }
                        Text(
                            text = stringResource(R.string.drift_speed, driftAnalysis.driftSpeedMpm),
                            style = MaterialTheme.typography.bodySmall,
                            color = Color.White.copy(alpha = 0.9f)
                        )
                    }
                }
            }
        }
    }
}

/**
 * Draws a directional arrow rotated to point toward the anchor.
 * 0° = up (north), rotated clockwise by [bearingDegrees].
 */
@Composable
private fun BearingArrow(
    bearingDegrees: Double,
    color: Color,
    modifier: Modifier = Modifier
) {
    val arrowDescription = stringResource(R.string.a11y_bearing_arrow_description, "%.0f".format(bearingDegrees))
    Canvas(modifier = modifier.semantics { contentDescription = arrowDescription }) {
        val w = size.width
        val h = size.height
        val cx = w / 2f
        val cy = h / 2f

        rotate(degrees = bearingDegrees.toFloat(), pivot = Offset(cx, cy)) {
            // Arrow body: triangle pointing up with a tail
            val arrowPath = Path().apply {
                // Tip (top center)
                moveTo(cx, h * 0.05f)
                // Bottom-right wing
                lineTo(cx + w * 0.25f, h * 0.65f)
                // Inner right notch
                lineTo(cx + w * 0.08f, h * 0.55f)
                // Tail right
                lineTo(cx + w * 0.08f, h * 0.90f)
                // Tail left
                lineTo(cx - w * 0.08f, h * 0.90f)
                // Inner left notch
                lineTo(cx - w * 0.08f, h * 0.55f)
                // Bottom-left wing
                lineTo(cx - w * 0.25f, h * 0.65f)
                close()
            }
            drawPath(arrowPath, color = color)

            // Small dot at the tip to emphasize anchor direction
            drawCircle(
                color = color.copy(alpha = 0.5f),
                radius = w * 0.05f,
                center = Offset(cx, h * 0.05f)
            )
        }
    }
}
