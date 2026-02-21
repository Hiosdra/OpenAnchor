package com.hiosdra.openanchor.ui.weather

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.hiosdra.openanchor.R
import com.hiosdra.openanchor.data.weather.CurrentWeather
import com.hiosdra.openanchor.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WeatherScreen(
    onBack: () -> Unit,
    viewModel: WeatherViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.weather_title)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.weather_back))
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.fetchWeather(forceRefresh = true) }) {
                        Icon(Icons.Default.Refresh, contentDescription = stringResource(R.string.weather_refresh))
                    }
                }
            )
        }
    ) { padding ->
        when {
            uiState.isLoading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        CircularProgressIndicator()
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = stringResource(R.string.weather_loading),
                            style = MaterialTheme.typography.bodyLarge,
                            color = TextGrey
                        )
                    }
                }
            }

            uiState.error != null -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.CloudOff,
                            contentDescription = null,
                            modifier = Modifier.size(64.dp),
                            tint = TextGrey
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = uiState.error ?: "",
                            style = MaterialTheme.typography.bodyLarge,
                            color = TextGrey
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        OutlinedButton(onClick = { viewModel.fetchWeather(forceRefresh = true) }) {
                            Text(stringResource(R.string.weather_retry))
                        }
                    }
                }
            }

            else -> {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    contentPadding = PaddingValues(vertical = 16.dp)
                ) {
                    // Position info
                    item {
                        Text(
                            text = stringResource(
                                R.string.weather_position_format,
                                "%.4f".format(uiState.latitude),
                                "%.4f".format(uiState.longitude)
                            ),
                            style = MaterialTheme.typography.bodySmall,
                            color = TextGrey
                        )
                    }

                    // Last updated
                    uiState.lastUpdated?.let { time ->
                        item {
                            Text(
                                text = stringResource(R.string.weather_last_updated, time),
                                style = MaterialTheme.typography.bodySmall,
                                color = TextGrey
                            )
                        }
                    }

                    // Current conditions section
                    uiState.current?.let { current ->
                        item {
                            Text(
                                text = stringResource(R.string.weather_current_conditions),
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(top = 8.dp)
                            )
                        }

                        // Combined waves card
                        item {
                            CurrentWavesCard(current)
                        }

                        // Wind waves card
                        item {
                            WindWavesCard(current)
                        }

                        // Swell card
                        item {
                            SwellCard(current)
                        }

                        // Ocean current card
                        item {
                            OceanCurrentCard(current)
                        }
                    }

                    // Hourly forecast section
                    if (uiState.hourlyForecast.isNotEmpty()) {
                        item {
                            Text(
                                text = stringResource(R.string.weather_hourly_forecast),
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(top = 16.dp)
                            )
                        }

                        items(uiState.hourlyForecast) { item ->
                            HourlyForecastCard(item)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CurrentWavesCard(current: CurrentWeather) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = NavySurface)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.Waves,
                    contentDescription = null,
                    tint = OceanBlue,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = stringResource(R.string.weather_combined_waves),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                WeatherValueItem(
                    label = stringResource(R.string.weather_height),
                    value = current.waveHeight?.let { "%.1f m".format(it) } ?: "-",
                    highlight = (current.waveHeight ?: 0.0) > 1.5
                )
                WeatherValueItem(
                    label = stringResource(R.string.weather_direction),
                    value = current.waveDirection?.let { "%.0f\u00B0".format(it) } ?: "-"
                )
                WeatherValueItem(
                    label = stringResource(R.string.weather_period),
                    value = current.wavePeriod?.let { "%.1f s".format(it) } ?: "-"
                )
            }
        }
    }
}

@Composable
private fun WindWavesCard(current: CurrentWeather) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = NavySurface)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.Air,
                    contentDescription = null,
                    tint = CautionOrange,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = stringResource(R.string.weather_wind_waves),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                WeatherValueItem(
                    label = stringResource(R.string.weather_height),
                    value = current.windWaveHeight?.let { "%.1f m".format(it) } ?: "-"
                )
                WeatherValueItem(
                    label = stringResource(R.string.weather_direction),
                    value = current.windWaveDirection?.let { "%.0f\u00B0".format(it) } ?: "-"
                )
                WeatherValueItem(
                    label = stringResource(R.string.weather_period),
                    value = current.windWavePeriod?.let { "%.1f s".format(it) } ?: "-"
                )
            }
        }
    }
}

@Composable
private fun SwellCard(current: CurrentWeather) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = NavySurface)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.Water,
                    contentDescription = null,
                    tint = SafeGreen,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = stringResource(R.string.weather_swell),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                WeatherValueItem(
                    label = stringResource(R.string.weather_height),
                    value = current.swellWaveHeight?.let { "%.1f m".format(it) } ?: "-"
                )
                WeatherValueItem(
                    label = stringResource(R.string.weather_direction),
                    value = current.swellWaveDirection?.let { "%.0f\u00B0".format(it) } ?: "-"
                )
                WeatherValueItem(
                    label = stringResource(R.string.weather_period),
                    value = current.swellWavePeriod?.let { "%.1f s".format(it) } ?: "-"
                )
            }
        }
    }
}

@Composable
private fun OceanCurrentCard(current: CurrentWeather) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = NavySurface)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.Navigation,
                    contentDescription = null,
                    tint = OceanBlue,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = stringResource(R.string.weather_ocean_current),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                WeatherValueItem(
                    label = stringResource(R.string.weather_velocity),
                    value = current.oceanCurrentVelocity?.let { "%.2f m/s".format(it) } ?: "-"
                )
                WeatherValueItem(
                    label = stringResource(R.string.weather_direction),
                    value = current.oceanCurrentDirection?.let { "%.0f\u00B0".format(it) } ?: "-"
                )
            }
        }
    }
}

@Composable
private fun WeatherValueItem(
    label: String,
    value: String,
    highlight: Boolean = false
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = value,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = if (highlight) CautionOrange else MaterialTheme.colorScheme.onSurface
        )
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = TextGrey
        )
    }
}

@Composable
private fun HourlyForecastCard(item: HourlyForecastItem) {
    // Parse time to show just the hour part (e.g. "2025-01-15T14:00" → "14:00")
    val displayTime = item.time.substringAfter("T", item.time)

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = NavySurface.copy(alpha = 0.7f))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Time
            Text(
                text = displayTime,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.width(56.dp)
            )

            // Wave height
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = item.waveHeight?.let { "%.1f".format(it) } ?: "-",
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Bold,
                    color = when {
                        (item.waveHeight ?: 0.0) > 2.0 -> AlarmRed
                        (item.waveHeight ?: 0.0) > 1.5 -> CautionOrange
                        else -> SafeGreen
                    }
                )
                Text(
                    text = stringResource(R.string.weather_wave_m),
                    style = MaterialTheme.typography.labelSmall,
                    color = TextGrey
                )
            }

            // Wave direction
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = item.waveDirection?.let { "%.0f\u00B0".format(it) } ?: "-",
                    style = MaterialTheme.typography.bodyMedium
                )
                Text(
                    text = stringResource(R.string.weather_dir),
                    style = MaterialTheme.typography.labelSmall,
                    color = TextGrey
                )
            }

            // Swell
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = item.swellWaveHeight?.let { "%.1f".format(it) } ?: "-",
                    style = MaterialTheme.typography.bodyMedium
                )
                Text(
                    text = stringResource(R.string.weather_swell_short),
                    style = MaterialTheme.typography.labelSmall,
                    color = TextGrey
                )
            }

            // Current
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = item.oceanCurrentVelocity?.let { "%.1f".format(it) } ?: "-",
                    style = MaterialTheme.typography.bodyMedium
                )
                Text(
                    text = stringResource(R.string.weather_current_short),
                    style = MaterialTheme.typography.labelSmall,
                    color = TextGrey
                )
            }
        }
    }
}
