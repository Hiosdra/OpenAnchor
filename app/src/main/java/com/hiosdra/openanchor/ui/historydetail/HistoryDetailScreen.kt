package com.hiosdra.openanchor.ui.historydetail

import android.content.Intent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.hiosdra.openanchor.R
import com.hiosdra.openanchor.domain.model.AnchorZone
import com.hiosdra.openanchor.ui.components.MapCircle
import com.hiosdra.openanchor.ui.components.MapMarker
import com.hiosdra.openanchor.ui.components.MapPolylineData
import com.hiosdra.openanchor.ui.components.OsmMapView
import com.hiosdra.openanchor.ui.theme.*
import org.osmdroid.util.GeoPoint
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HistoryDetailScreen(
    sessionId: Long,
    onBack: () -> Unit,
    viewModel: HistoryDetailViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current

    // Launch share intent when GPX export is ready
    LaunchedEffect(state.gpxExportUri) {
        state.gpxExportUri?.let { uri ->
            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                type = "application/gpx+xml"
                putExtra(Intent.EXTRA_STREAM, uri)
                putExtra(Intent.EXTRA_SUBJECT, state.gpxExportFilename ?: "track.gpx")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            context.startActivity(Intent.createChooser(shareIntent, null))
            viewModel.clearExportState()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.session_details)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    if (!state.isLoading && state.session != null) {
                        IconButton(onClick = { viewModel.exportGpx() }) {
                            Icon(
                                Icons.Default.Share,
                                contentDescription = stringResource(R.string.export_gpx)
                            )
                        }
                    }
                }
            )
        }
    ) { padding ->
        if (state.isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else {
            val session = state.session
            if (session == null) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center
                ) {
                    Text(stringResource(R.string.session_not_found))
                }
            } else {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                ) {
                    // Map with track
                    val anchorGeoPoint = GeoPoint(
                        session.anchorPosition.latitude,
                        session.anchorPosition.longitude
                    )

                    val markers = buildList {
                        add(MapMarker(position = anchorGeoPoint, title = "Anchor"))
                    }

                    val circles = buildList {
                        add(
                            MapCircle(
                                center = anchorGeoPoint,
                                radiusMeters = session.zone.radiusMeters,
                                fillColor = Color(0x4000FF00),
                                strokeColor = SafeGreen,
                                strokeWidth = 2f
                            )
                        )
                        if (session.zone is AnchorZone.SectorWithCircle) {
                            add(
                                MapCircle(
                                    center = anchorGeoPoint,
                                    radiusMeters = (session.zone as AnchorZone.SectorWithCircle).sectorRadiusMeters,
                                    fillColor = Color(0x2000FF00),
                                    strokeColor = SafeGreen.copy(alpha = 0.5f),
                                    strokeWidth = 1f
                                )
                            )
                        }
                        // Alarm points as small red circles
                        state.trackPoints.filter { it.isAlarm }.forEach { point ->
                            add(
                                MapCircle(
                                    center = GeoPoint(point.position.latitude, point.position.longitude),
                                    radiusMeters = 2.0,
                                    fillColor = AlarmRed,
                                    strokeColor = AlarmRed,
                                    strokeWidth = 1f
                                )
                            )
                        }
                    }

                    val polylines = buildList {
                        val trackGeoPoints = state.trackPoints.map {
                            GeoPoint(it.position.latitude, it.position.longitude)
                        }
                        if (trackGeoPoints.isNotEmpty()) {
                            add(
                                MapPolylineData(
                                    points = trackGeoPoints,
                                    color = OceanBlue,
                                    width = 4f
                                )
                            )
                        }
                    }

                    OsmMapView(
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f),
                        centerOn = anchorGeoPoint,
                        zoomLevel = 17.0,
                        markers = markers,
                        circles = circles,
                        polylines = polylines
                    )

                    // Session info
                    val dateFormat = SimpleDateFormat("dd MMM yyyy HH:mm", Locale.getDefault())
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .verticalScroll(rememberScrollState())
                            .padding(16.dp)
                    ) {
                        InfoRow(stringResource(R.string.start_time), dateFormat.format(Date(session.startTime)))
                        session.endTime?.let {
                            InfoRow(stringResource(R.string.end_time), dateFormat.format(Date(it)))
                            val duration = it - session.startTime
                            val hours = duration / 3600000
                            val minutes = (duration % 3600000) / 60000
                            InfoRow(stringResource(R.string.duration), stringResource(R.string.duration_format, hours, minutes))
                        }
                        InfoRow(stringResource(R.string.radius_label), "%.0f m".format(session.zone.radiusMeters))
                        InfoRow(stringResource(R.string.track_points_count), "${state.trackPoints.size}")
                        InfoRow(stringResource(R.string.alarms_triggered), "${session.alarmCount}")

                        Spacer(modifier = Modifier.height(16.dp))

                        // GPX Export button
                        OutlinedButton(
                            onClick = { viewModel.exportGpx() },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(
                                Icons.Default.Share,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(stringResource(R.string.export_gpx))
                        }

                        if (state.exportError) {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = stringResource(R.string.export_gpx_error),
                                style = MaterialTheme.typography.bodySmall,
                                color = AlarmRed
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun InfoRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium
        )
    }
}
