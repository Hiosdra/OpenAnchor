package com.hiosdra.openanchor.ui.weather

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hiosdra.openanchor.data.weather.CurrentWeather
import com.hiosdra.openanchor.data.weather.HourlyWeather
import com.hiosdra.openanchor.data.weather.WeatherRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HourlyForecastItem(
    val time: String,
    val waveHeight: Double?,
    val waveDirection: Double?,
    val wavePeriod: Double?,
    val windWaveHeight: Double?,
    val windWaveDirection: Double?,
    val swellWaveHeight: Double?,
    val swellWaveDirection: Double?,
    val oceanCurrentVelocity: Double?,
    val oceanCurrentDirection: Double?
)

data class WeatherUiState(
    val isLoading: Boolean = true,
    val error: String? = null,
    val latitude: Double = 0.0,
    val longitude: Double = 0.0,
    val current: CurrentWeather? = null,
    val hourlyForecast: List<HourlyForecastItem> = emptyList(),
    val lastUpdated: String? = null
)

@HiltViewModel
class WeatherViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val weatherRepository: WeatherRepository
) : ViewModel() {

    private val latitude: Double = savedStateHandle.get<Float>("latitude")?.toDouble() ?: 0.0
    private val longitude: Double = savedStateHandle.get<Float>("longitude")?.toDouble() ?: 0.0

    private val _uiState = MutableStateFlow(
        WeatherUiState(latitude = latitude, longitude = longitude)
    )
    val uiState: StateFlow<WeatherUiState> = _uiState.asStateFlow()

    init {
        fetchWeather()
    }

    fun fetchWeather(forceRefresh: Boolean = false) {
        if (latitude == 0.0 && longitude == 0.0) {
            _uiState.update { it.copy(isLoading = false, error = "No anchor position available") }
            return
        }

        _uiState.update { it.copy(isLoading = true, error = null) }

        viewModelScope.launch {
            val result = weatherRepository.getMarineWeather(
                latitude = latitude,
                longitude = longitude,
                forceRefresh = forceRefresh
            )

            result.onSuccess { response ->
                val hourlyItems = parseHourlyForecast(response.hourly)
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = null,
                        current = response.current,
                        hourlyForecast = hourlyItems,
                        lastUpdated = response.current?.time
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = error.message ?: "Failed to fetch weather data"
                    )
                }
            }
        }
    }

    private fun parseHourlyForecast(hourly: HourlyWeather?): List<HourlyForecastItem> {
        if (hourly == null) return emptyList()
        val times = hourly.time ?: return emptyList()

        return times.mapIndexed { index, time ->
            HourlyForecastItem(
                time = time,
                waveHeight = hourly.waveHeight?.getOrNull(index),
                waveDirection = hourly.waveDirection?.getOrNull(index),
                wavePeriod = hourly.wavePeriod?.getOrNull(index),
                windWaveHeight = hourly.windWaveHeight?.getOrNull(index),
                windWaveDirection = hourly.windWaveDirection?.getOrNull(index),
                swellWaveHeight = hourly.swellWaveHeight?.getOrNull(index),
                swellWaveDirection = hourly.swellWaveDirection?.getOrNull(index),
                oceanCurrentVelocity = hourly.oceanCurrentVelocity?.getOrNull(index),
                oceanCurrentDirection = hourly.oceanCurrentDirection?.getOrNull(index)
            )
        }
    }
}
