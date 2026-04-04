package com.hiosdra.openanchor.ui.monitor

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.unit.sp
import com.hiosdra.openanchor.core.ui.R
import com.hiosdra.openanchor.domain.model.AlarmState
import com.hiosdra.openanchor.ui.components.AlarmStatusBadge
import com.hiosdra.openanchor.ui.theme.*

@Composable
internal fun MonitorControlPanel(
    uiState: MonitorUiState,
    onToggleView: () -> Unit,
    onStop: () -> Unit,
    onDismissAlarm: () -> Unit,
    onOpenWeather: (latitude: Float, longitude: Float) -> Unit,
    onSharePosition: () -> Unit
) {
    val bgColor by animateColorAsState(
        when (uiState.alarmState) {
            AlarmState.SAFE -> Color.Black
            AlarmState.CAUTION -> Color(0xFF1A1200)
            AlarmState.WARNING -> Color(0xFF1A1A00)
            AlarmState.ALARM -> Color(0xFF1A0000)
        },
        label = "bg_color"
    )

    val statusColor = when (uiState.alarmState) {
        AlarmState.SAFE -> SafeGreen
        AlarmState.CAUTION -> CautionYellow
        AlarmState.WARNING -> WarningOrange
        AlarmState.ALARM -> AlarmRed
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(bgColor)
            .clickable { /* keep screen alive */ }
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Status
            AlarmStatusBadge(
                alarmState = uiState.alarmState,
                modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite }
            )

            // GPS signal lost warning
            if (uiState.gpsSignalLost) {
                Text(
                    text = stringResource(R.string.gps_signal_lost),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = AlarmRed
                )
            }

            // Drift warning
            MonitorDriftWarningBanner(uiState.driftAnalysis)

            // GPS accuracy
            val accuracyColor = if (uiState.gpsAccuracyMeters > 20f) AlarmRed else TextGrey
            Text(
                text = stringResource(R.string.gps_accuracy_format, "%.0f".format(uiState.gpsAccuracyMeters)),
                style = MaterialTheme.typography.bodySmall,
                color = accuracyColor
            )

            // Battery indicator
            MonitorBatteryIndicator(
                localLevel = uiState.localBatteryLevel,
                localCharging = uiState.localBatteryCharging,
                peerLevel = uiState.peerBatteryLevel,
                peerCharging = uiState.peerIsCharging,
                compact = false
            )

            Spacer(modifier = Modifier.height(32.dp))

            // Distance - big number with animated counter
            val animatedDistance by animateFloatAsState(
                targetValue = uiState.distanceToAnchor.toFloat(),
                animationSpec = OaAnimations.quickSpring,
                label = "distance"
            )
            Text(
                text = "%.0f".format(animatedDistance.toDouble()),
                fontSize = 96.sp,
                fontWeight = FontWeight.Bold,
                color = statusColor,
                modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite }
            )
            Text(
                text = "meters",
                style = MaterialTheme.typography.titleLarge,
                color = statusColor.copy(alpha = 0.7f)
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Arrow pointing toward anchor
            // Use compass-corrected bearing if available (works when stationary)
            val arrowBearing = if (uiState.compassAvailable) {
                // Geo bearing to anchor minus phone heading = relative direction to anchor
                (uiState.bearingToAnchor - uiState.compassHeading.toDouble() + 360.0) % 360.0
            } else {
                uiState.bearingToAnchor
            }

            MonitorBearingArrow(
                bearingDegrees = arrowBearing,
                color = statusColor,
                modifier = Modifier.size(120.dp)
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "%.0f\u00B0".format(uiState.bearingToAnchor),
                style = MaterialTheme.typography.titleMedium,
                color = TextGrey
            )
            Text(
                text = stringResource(R.string.bearing_to_anchor),
                style = MaterialTheme.typography.bodyMedium,
                color = TextGrey
            )

            Spacer(modifier = Modifier.height(48.dp))

            if (uiState.alarmState == AlarmState.ALARM) {
                Button(
                    onClick = onDismissAlarm,
                    colors = ButtonDefaults.buttonColors(containerColor = AlarmRed),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp)
                ) {
                    Text(
                        stringResource(R.string.dismiss_alarm),
                        style = MaterialTheme.typography.titleLarge,
                        color = Color.White
                    )
                }
                Spacer(modifier = Modifier.height(16.dp))
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                OutlinedButton(onClick = onToggleView) {
                    Icon(Icons.Default.Map, contentDescription = null, tint = TextGrey)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(stringResource(R.string.map_view), color = TextGrey)
                }
                OutlinedButton(onClick = {
                    uiState.anchorPosition?.let {
                        onOpenWeather(it.latitude.toFloat(), it.longitude.toFloat())
                    }
                }) {
                    Icon(Icons.Default.Cloud, contentDescription = stringResource(R.string.weather_title), tint = OceanBlue)
                }
                OutlinedButton(onClick = onSharePosition) {
                    Icon(Icons.Default.Share, contentDescription = stringResource(R.string.share_position), tint = TextGrey)
                }
                OutlinedButton(
                    onClick = onStop,
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = AlarmRed)
                ) {
                    Icon(Icons.Default.Stop, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(stringResource(R.string.stop))
                }
            }
        }
    }
}
