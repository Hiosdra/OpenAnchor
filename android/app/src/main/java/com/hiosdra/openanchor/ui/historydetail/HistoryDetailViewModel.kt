package com.hiosdra.openanchor.ui.historydetail

import android.content.Context
import android.net.Uri
import androidx.core.content.FileProvider
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hiosdra.openanchor.data.repository.AnchorSessionRepository
import com.hiosdra.openanchor.domain.model.AnchorSession
import com.hiosdra.openanchor.domain.model.TrackPoint
import com.hiosdra.openanchor.util.GpxExporter
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import javax.inject.Inject

data class HistoryDetailState(
    val session: AnchorSession? = null,
    val trackPoints: List<TrackPoint> = emptyList(),
    val isLoading: Boolean = true,
    val isExporting: Boolean = false,
    val gpxExportUri: Uri? = null,
    val gpxExportFilename: String? = null,
    val exportError: Boolean = false,
    val exportSuccess: Boolean = false,
    // Per-session analytics
    val analytics: SessionAnalytics? = null
)

data class SessionAnalytics(
    val totalDurationMs: Long,
    val maxDriftMeters: Float,
    val alarmCount: Int,
    val averageAccuracy: Float,
    val alarmEvents: List<AlarmEvent>
)

data class AlarmEvent(
    val timestampMs: Long,
    val distanceMeters: Float,
    val alarmState: String
)

@HiltViewModel
class HistoryDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val repository: AnchorSessionRepository,
    @ApplicationContext private val context: Context
) : ViewModel() {

    private val sessionId: Long = savedStateHandle["sessionId"] ?: -1L

    private val _state = MutableStateFlow(HistoryDetailState())
    val state: StateFlow<HistoryDetailState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            val session = repository.getSessionById(sessionId)
            val points = repository.getTrackPointsOnce(sessionId)
            val analytics = if (session != null && points.isNotEmpty()) {
                computeAnalytics(session, points)
            } else null
            _state.value = HistoryDetailState(
                session = session,
                trackPoints = points,
                isLoading = false,
                analytics = analytics
            )
        }
    }

    private fun computeAnalytics(session: AnchorSession, points: List<TrackPoint>): SessionAnalytics {
        val totalDuration = (session.endTime ?: System.currentTimeMillis()) - session.startTime
        val maxDrift = points.maxOfOrNull { it.distanceToAnchor } ?: 0f
        val alarmCount = session.alarmCount
        val averageAccuracy = if (points.isNotEmpty()) {
            points.map { it.position.accuracy }.average().toFloat()
        } else 0f
        val alarmEvents = points.filter { it.isAlarm }.map { point ->
            AlarmEvent(
                timestampMs = point.position.timestamp,
                distanceMeters = point.distanceToAnchor,
                alarmState = point.alarmState
            )
        }
        return SessionAnalytics(
            totalDurationMs = totalDuration,
            maxDriftMeters = maxDrift,
            alarmCount = alarmCount,
            averageAccuracy = averageAccuracy,
            alarmEvents = alarmEvents
        )
    }

    fun exportGpx() {
        if (_state.value.isExporting) return
        // Copy data before launching coroutine to avoid race with session deletion
        val session = _state.value.session ?: return
        val points = _state.value.trackPoints.toList()

        _state.update { it.copy(isExporting = true, exportError = false, exportSuccess = false) }

        viewModelScope.launch {
            try {
                val uri = withContext(Dispatchers.IO) {
                    val gpxDir = File(context.cacheDir, "gpx_exports")
                    gpxDir.mkdirs()
                    val filename = GpxExporter.suggestedFilename(session)
                    val file = File(gpxDir, filename)
                    file.outputStream().use { outputStream ->
                        GpxExporter.export(session, points, outputStream)
                    }
                    FileProvider.getUriForFile(
                        context,
                        "${context.packageName}.fileprovider",
                        file
                    )
                }
                val filename = GpxExporter.suggestedFilename(session)
                _state.update {
                    it.copy(
                        gpxExportUri = uri,
                        gpxExportFilename = filename,
                        exportError = false,
                        exportSuccess = true,
                        isExporting = false
                    )
                }
            } catch (e: Exception) {
                _state.update { it.copy(exportError = true, isExporting = false) }
            }
        }
    }

    fun clearExportState() {
        _state.update {
            it.copy(gpxExportUri = null, gpxExportFilename = null, exportError = false, exportSuccess = false)
        }
    }
}
