package com.hiosdra.openanchor.ui.statistics

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.hiosdra.openanchor.R
import com.hiosdra.openanchor.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StatisticsScreen(
    onBack: () -> Unit,
    viewModel: StatisticsViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.statistics)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
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
        } else if (state.totalSessions == 0) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        Icons.Default.Analytics,
                        contentDescription = null,
                        modifier = Modifier.size(64.dp),
                        tint = TextGrey
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = stringResource(R.string.no_statistics),
                        style = MaterialTheme.typography.bodyLarge,
                        color = TextGrey
                    )
                }
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Total sessions
                StatCard(
                    icon = Icons.Default.Anchor,
                    label = stringResource(R.string.stat_total_sessions),
                    value = "${state.totalSessions}",
                    color = OceanBlue
                )

                // Total hours anchored
                StatCard(
                    icon = Icons.Default.Timer,
                    label = stringResource(R.string.stat_total_hours),
                    value = formatHours(state.totalAnchoredHours),
                    color = SafeGreen
                )

                // Total alarms
                StatCard(
                    icon = Icons.Default.Warning,
                    label = stringResource(R.string.stat_total_alarms),
                    value = "${state.totalAlarms}",
                    color = if (state.totalAlarms > 0) AlarmRed else SafeGreen
                )

                // Longest session
                StatCard(
                    icon = Icons.Default.Star,
                    label = stringResource(R.string.stat_longest_session),
                    value = formatHours(state.longestSessionHours),
                    color = CautionOrange
                )

                // Average session
                StatCard(
                    icon = Icons.Default.Schedule,
                    label = stringResource(R.string.stat_average_session),
                    value = formatHours(state.averageSessionHours),
                    color = OceanBlue
                )

                // Max radius
                StatCard(
                    icon = Icons.Default.RadioButtonUnchecked,
                    label = stringResource(R.string.stat_max_radius),
                    value = "%.0f m".format(state.maxRadiusMeters),
                    color = WarningYellow
                )

                // Average radius
                StatCard(
                    icon = Icons.Default.Adjust,
                    label = stringResource(R.string.stat_avg_radius),
                    value = "%.0f m".format(state.averageRadiusMeters),
                    color = TextGrey
                )
            }
        }
    }
}

@Composable
private fun StatCard(
    icon: ImageVector,
    label: String,
    value: String,
    color: Color
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = NavyMedium)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = color,
                modifier = Modifier.size(32.dp)
            )
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = label,
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextGrey
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = value,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = TextWhite
                )
            }
        }
    }
}

private fun formatHours(hours: Double): String {
    val h = hours.toLong()
    val m = ((hours - h) * 60).toLong()
    return if (h > 0) "${h}h ${m}min" else "${m}min"
}
