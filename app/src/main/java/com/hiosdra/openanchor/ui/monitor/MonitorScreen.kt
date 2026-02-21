package com.hiosdra.openanchor.ui.monitor

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.animateColorAsState
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
import androidx.compose.ui.res.stringResource
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
                onOpenWeather = onOpenWeather
            )
            MonitorViewMode.SIMPLE -> SimpleMonitorView(
                uiState = uiState,
                onToggleView = { viewModel.toggleViewMode() },
                onStop = { showStopDialog = true },
                onDismissAlarm = { viewModel.dismissAlarm() },
                onOpenWeather = onOpenWeather
            )
        }
    }
}

@Composable
private fun MapMonitorView(
    uiState: MonitorUiState,
    onToggleView: () -> Unit,
    onStop: () -> Unit,
    onDismissAlarm: () -> Unit,
    onOpenWeather: (latitude: Float, longitude: Float) -> Unit
) {
    val anchorPos = uiState.anchorPosition
    val boatPos = uiState.boatPosition

    val statusColor by animateColorAsState(
        when (uiState.alarmState) {
            AlarmState.SAFE -> SafeGreen
            AlarmState.CAUTION -> CautionOrange
            AlarmState.WARNING -> WarningYellow
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
                        AlarmState.CAUTION -> CautionOrange
                        AlarmState.WARNING -> WarningYellow
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
                                strokeColor = CautionOrange.copy(alpha = 0.6f),
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

            OsmMapView(
                modifier = Modifier.fillMaxSize(),
                centerOn = anchorGeoPoint,
                zoomLevel = 17.0,
                markers = markers,
                circles = circles,
                polylines = anchorLine
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
                modifier = Modifier.fillMaxWidth(),
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
    onOpenWeather: (latitude: Float, longitude: Float) -> Unit
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
        AlarmState.CAUTION -> CautionOrange
        AlarmState.WARNING -> WarningYellow
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
                fontWeight = FontWeight.Bold
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

            // GPS accuracy
            val accuracyColor = if (uiState.gpsAccuracyMeters > 20f) AlarmRed else TextGrey
            Text(
                text = stringResource(R.string.gps_accuracy_format, "%.0f".format(uiState.gpsAccuracyMeters)),
                style = MaterialTheme.typography.bodySmall,
                color = accuracyColor
            )

            Spacer(modifier = Modifier.height(32.dp))

            // Distance - big number
            Text(
                text = "%.0f".format(uiState.distanceToAnchor),
                fontSize = 96.sp,
                fontWeight = FontWeight.Bold,
                color = statusColor
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
                    Icon(Icons.Default.Cloud, contentDescription = null, tint = OceanBlue)
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
 * Draws a directional arrow rotated to point toward the anchor.
 * 0° = up (north), rotated clockwise by [bearingDegrees].
 */
@Composable
private fun BearingArrow(
    bearingDegrees: Double,
    color: Color,
    modifier: Modifier = Modifier
) {
    Canvas(modifier = modifier) {
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
