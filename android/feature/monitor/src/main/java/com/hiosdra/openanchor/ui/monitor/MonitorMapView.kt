package com.hiosdra.openanchor.ui.monitor

import android.content.Context
import android.content.Intent
import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.hiosdra.openanchor.core.ui.R
import com.hiosdra.openanchor.domain.model.AlarmState
import com.hiosdra.openanchor.domain.model.AnchorZone
import com.hiosdra.openanchor.ui.components.AlarmStatusBadge
import com.hiosdra.openanchor.ui.components.MapCircle
import com.hiosdra.openanchor.ui.components.MapMarker
import com.hiosdra.openanchor.ui.components.MapPolylineData
import com.hiosdra.openanchor.ui.components.OsmMapView
import com.hiosdra.openanchor.ui.theme.*
import org.osmdroid.util.GeoPoint

@Composable
internal fun MonitorMapView(
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
                        AlarmStatusBadge(alarmState = uiState.alarmState)
                        Spacer(modifier = Modifier.height(4.dp))
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
                        MonitorBatteryIndicator(
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
            MonitorDriftWarningBanner(uiState.driftAnalysis)
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

internal fun sharePosition(context: Context, uiState: MonitorUiState) {
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
