package com.hiosdra.openanchor.ui.monitor

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hiosdra.openanchor.data.compass.CompassProvider
import com.hiosdra.openanchor.domain.geometry.GeoCalculations
import com.hiosdra.openanchor.domain.model.AlarmState
import com.hiosdra.openanchor.domain.model.AnchorZone
import com.hiosdra.openanchor.domain.model.Position
import com.hiosdra.openanchor.service.MonitorState
import com.hiosdra.openanchor.service.ServiceBinder
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

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
    val compassAvailable: Boolean = false
)

@HiltViewModel
class MonitorViewModel @Inject constructor(
    private val serviceBinder: ServiceBinder,
    private val compassProvider: CompassProvider
) : ViewModel() {

    private val _uiState = MutableStateFlow(MonitorUiState())
    val uiState: StateFlow<MonitorUiState> = _uiState.asStateFlow()

    init {
        // Start compass updates
        if (compassProvider.isAvailable) {
            _uiState.update { it.copy(compassAvailable = true) }
            viewModelScope.launch {
                compassProvider.headingUpdates().collect { heading ->
                    _uiState.update { it.copy(compassHeading = heading) }
                }
            }
        }

        // Observe service instance and collect monitor state when connected
        viewModelScope.launch {
            serviceBinder.serviceInstance.filterNotNull().collectLatest { service ->
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
                            gpsSignalLost = monitorState.gpsSignalLost
                        )
                    }
                }
            }
        }
    }

    fun startMonitoring(sessionId: Long) {
        serviceBinder.startAndBind(sessionId)
    }

    private fun calculateBearing(state: MonitorState): Double {
        val boat = state.boatPosition ?: return 0.0
        val anchor = state.anchorPosition ?: return 0.0
        return GeoCalculations.bearingDegrees(boat, anchor)
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
