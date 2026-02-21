package com.hiosdra.openanchor.ui.settings

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.hiosdra.openanchor.R
import com.hiosdra.openanchor.domain.model.DepthUnit
import com.hiosdra.openanchor.domain.model.DistanceUnit

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onBack: () -> Unit,
    viewModel: SettingsViewModel = hiltViewModel()
) {
    val prefs by viewModel.preferences.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.settings)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {
            // Distance Unit
            Text(
                text = stringResource(R.string.distance_unit),
                style = MaterialTheme.typography.titleMedium
            )
            Spacer(modifier = Modifier.height(8.dp))
            SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                DistanceUnit.entries.forEachIndexed { index, unit ->
                    SegmentedButton(
                        selected = prefs.distanceUnit == unit,
                        onClick = { viewModel.setDistanceUnit(unit) },
                        shape = SegmentedButtonDefaults.itemShape(index, DistanceUnit.entries.size)
                    ) {
                        Text(unit.label)
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Depth Unit
            Text(
                text = stringResource(R.string.depth_unit),
                style = MaterialTheme.typography.titleMedium
            )
            Spacer(modifier = Modifier.height(8.dp))
            SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                DepthUnit.entries.forEachIndexed { index, unit ->
                    SegmentedButton(
                        selected = prefs.depthUnit == unit,
                        onClick = { viewModel.setDepthUnit(unit) },
                        shape = SegmentedButtonDefaults.itemShape(index, DepthUnit.entries.size)
                    ) {
                        Text(unit.label)
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Language
            Text(
                text = stringResource(R.string.language),
                style = MaterialTheme.typography.titleMedium
            )
            Spacer(modifier = Modifier.height(8.dp))
            SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                val languages = listOf("en" to "English", "pl" to "Polski")
                languages.forEachIndexed { index, (code, name) ->
                    SegmentedButton(
                        selected = prefs.language == code,
                        onClick = { viewModel.setLanguage(code) },
                        shape = SegmentedButtonDefaults.itemShape(index, languages.size)
                    ) {
                        Text(name)
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // GPS Interval
            Text(
                text = stringResource(R.string.gps_interval),
                style = MaterialTheme.typography.titleMedium
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = stringResource(R.string.gps_interval_value, prefs.gpsIntervalSeconds),
                style = MaterialTheme.typography.bodyLarge
            )
            Slider(
                value = prefs.gpsIntervalSeconds.toFloat(),
                onValueChange = { viewModel.setGpsInterval(it.toInt()) },
                valueRange = 1f..10f,
                steps = 8
            )

            Spacer(modifier = Modifier.height(32.dp))

            // Night Filter
            Text(
                text = stringResource(R.string.night_filter),
                style = MaterialTheme.typography.titleMedium
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = stringResource(R.string.night_filter_desc),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = stringResource(R.string.night_filter_toggle),
                    style = MaterialTheme.typography.bodyLarge
                )
                Switch(
                    checked = prefs.nightFilterEnabled,
                    onCheckedChange = { viewModel.setNightFilterEnabled(it) },
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = Color(0xFFFF0000),
                        checkedTrackColor = Color(0xFF660000)
                    )
                )
            }

            Spacer(modifier = Modifier.height(32.dp))

            // App info
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "OpenAnchor v0.1.0",
                        style = MaterialTheme.typography.titleMedium
                    )
                    Text(
                        text = stringResource(R.string.open_source_notice),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}
