package com.hiosdra.openanchor.ui.statistics

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hiosdra.openanchor.data.repository.AnchorSessionRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class StatisticsUiState(
    val isLoading: Boolean = true,
    val totalSessions: Int = 0,
    val totalAlarms: Int = 0,
    val totalAnchoredHours: Double = 0.0,
    val longestSessionHours: Double = 0.0,
    val averageSessionHours: Double = 0.0,
    val maxRadiusMeters: Double = 0.0,
    val averageRadiusMeters: Double = 0.0
)

@HiltViewModel
class StatisticsViewModel @Inject constructor(
    private val repository: AnchorSessionRepository
) : ViewModel() {

    private val _state = MutableStateFlow(StatisticsUiState())
    val state: StateFlow<StatisticsUiState> = _state.asStateFlow()

    init {
        loadStatistics()
    }

    private fun loadStatistics() {
        viewModelScope.launch {
            val totalSessions = repository.getCompletedSessionCount()
            val totalAlarms = repository.getTotalAlarmCount()
            val totalMillis = repository.getTotalAnchoredMillis()
            val longestMillis = repository.getLongestSessionMillis()
            val averageMillis = repository.getAverageSessionMillis()
            val maxRadius = repository.getMaxRadiusUsed()
            val avgRadius = repository.getAverageRadius()

            _state.value = StatisticsUiState(
                isLoading = false,
                totalSessions = totalSessions,
                totalAlarms = totalAlarms,
                totalAnchoredHours = totalMillis / 3_600_000.0,
                longestSessionHours = longestMillis / 3_600_000.0,
                averageSessionHours = averageMillis / 3_600_000.0,
                maxRadiusMeters = maxRadius,
                averageRadiusMeters = avgRadius
            )
        }
    }
}
