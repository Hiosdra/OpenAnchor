package com.hiosdra.openanchor.ui.monitor

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hiosdra.openanchor.data.compass.CompassProvider
import com.hiosdra.openanchor.data.repository.AnchorSessionRepository
import com.hiosdra.openanchor.domain.geometry.GeoCalculations
import com.hiosdra.openanchor.domain.drift.DriftAnalysis
import com.hiosdra.openanchor.domain.model.AlarmState
import com.hiosdra.openanchor.domain.model.AnchorZone
import com.hiosdra.openanchor.domain.model.Position
import com.hiosdra.openanchor.domain.model.TrackPoint
import com.hiosdra.openanchor.service.MonitorState
import com.hiosdra.openanchor.service.ServiceBinder
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject
import kotlin.math.abs

enum class MonitorViewMode {
    MAP,
    SIMPLE
}

data class MonitorUiState(
    val viewMode: MonitorViewMode = MonitorViewMode.MAP,
    val isActive: Boolean = false,
    val anchorPosition: Position? = null,
    val boatPosition: Position? = null,
    val zone: AnchorZone? = null,
    val distanceToAnchor: Double = 0.0,
    val alarmState: AlarmState = AlarmState.SAFE,
    val bearingToAnchor: Double = 0.0,
    val gpsAccuracyMeters: Float = 0f,
    val gpsSignalLost: Boolean = false,
    val compassHeading: Float = 0f,
    val compassAvailable: Boolean = false,
    val trackPoints: List<TrackPoint> = emptyList(),
    // Battery (Faza 4.4)
    val localBatteryLevel: Int = -1,
    val localBatteryCharging: Boolean = false,
    val peerBatteryLevel: Double? = null,
    val peerIsCharging: Boolean? = null,
    val isPairedMode: Boolean = false,
    val peerConnected: Boolean = false,
    // Drift detection (Faza 4.5)
    val driftAnalysis: DriftAnalysis? = null
)

@HiltViewModel
class MonitorViewModel @Inject constructor(
    private val serviceBinder: ServiceBinder,
    private val compassProvider: CompassProvider,
    private val repository: AnchorSessionRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(MonitorUiState())
    val uiState: StateFlow<MonitorUiState> = _uiState.asStateFlow()

    /** Tracks which session ID we're currently observing track points for */
    private var currentTrackSessionId: Long? = null
    /** Job for the current track points collection, cancelled when session changes */
    private var trackPointsJob: Job? = null
    /** Cached positions for bearing calculation to avoid redundant computation */
    private var lastBoatPosition: Position? = null
    private var lastAnchorPosition: Position? = null
    private var cachedBearing: Double = 0.0

    init {
        // Start compass updates with debounce to avoid excessive recompositions
        if (compassProvider.isAvailable) {
            _uiState.update { it.copy(compassAvailable = true) }
            viewModelScope.launch {
                compassProvider.headingUpdates()
                    .distinctUntilChanged { old, new -> abs(old - new) < 1.0f }
                    .collect { heading ->
                        _uiState.update { it.copy(compassHeading = heading) }
                    }
            }
        }

        // Observe service instance and collect monitor state when connected
        viewModelScope.launch {
            serviceBinder.serviceInstance.filterNotNull().collectLatest { service ->
                // StateFlow already deduplicates values, no need for distinctUntilChanged()
                service.monitorState.collect { monitorState ->
                    _uiState.update { ui ->
                        ui.copy(
                            isActive = monitorState.isActive,
                            anchorPosition = monitorState.anchorPosition,
                            boatPosition = monitorState.boatPosition,
                            zone = monitorState.zone,
                            distanceToAnchor = monitorState.distanceToAnchor,
                            alarmState = monitorState.alarmState,
                            bearingToAnchor = calculateBearing(monitorState),
                            gpsAccuracyMeters = monitorState.gpsAccuracyMeters,
                            gpsSignalLost = monitorState.gpsSignalLost,
                            localBatteryLevel = monitorState.localBatteryLevel,
                            localBatteryCharging = monitorState.localBatteryCharging,
                            peerBatteryLevel = monitorState.peerBatteryLevel,
                            peerIsCharging = monitorState.peerIsCharging,
                            isPairedMode = monitorState.isPairedMode,
                            peerConnected = monitorState.peerConnected,
                            driftAnalysis = monitorState.driftAnalysis
                        )
                    }
                    // Start observing track points when session ID becomes available
                    val sessionId = monitorState.sessionId
                    if (sessionId != null && sessionId != currentTrackSessionId) {
                        currentTrackSessionId = sessionId
                        observeTrackPoints(sessionId)
                    }
                }
            }
        }
    }

    private fun observeTrackPoints(sessionId: Long) {
        trackPointsJob?.cancel()
        trackPointsJob = viewModelScope.launch {
            repository.observeTrackPoints(sessionId).collect { points ->
                _uiState.update { it.copy(trackPoints = points) }
            }
        }
    }

    fun startMonitoring(sessionId: Long) {
        serviceBinder.startAndBind(sessionId)
    }

    private fun calculateBearing(state: MonitorState): Double {
        val boat = state.boatPosition ?: return 0.0
        val anchor = state.anchorPosition ?: return 0.0
        // Only recalculate when positions actually change
        if (boat == lastBoatPosition && anchor == lastAnchorPosition) return cachedBearing
        lastBoatPosition = boat
        lastAnchorPosition = anchor
        cachedBearing = GeoCalculations.bearingDegrees(boat, anchor)
        return cachedBearing
    }

    fun toggleViewMode() {
        _uiState.update { current ->
            current.copy(
                viewMode = if (current.viewMode == MonitorViewMode.MAP) MonitorViewMode.SIMPLE
                else MonitorViewMode.MAP
            )
        }
    }

    fun stopMonitoring() {
        serviceBinder.stopMonitoring()
    }

    fun dismissAlarm() {
        serviceBinder.dismissAlarm()
    }

    override fun onCleared() {
        serviceBinder.unbind()
        super.onCleared()
    }
}
