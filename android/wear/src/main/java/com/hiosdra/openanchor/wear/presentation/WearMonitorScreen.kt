package com.hiosdra.openanchor.wear.presentation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material.Text
import com.hiosdra.openanchor.wear.R
import com.hiosdra.openanchor.wear.data.WearAlarmState
import com.hiosdra.openanchor.wear.data.WearConnectionManager
import com.hiosdra.openanchor.wear.data.WearMonitorState
import com.hiosdra.openanchor.wear.data.WearMonitorStateHolder

// Maritime dark colors (matching phone app)
private val NavyDark = Color(0xFF0A1628)
private val SafeGreen = Color(0xFF4CAF50)
private val CautionYellow = Color(0xFFFFC107)
private val WarningOrange = Color(0xFFFF9800)
private val AlarmRed = Color(0xFFF44336)
private val TextWhite = Color(0xFFECEFF1)
private val TextGrey = Color(0xFF90A4AE)

/** GPS accuracy hysteresis thresholds to prevent color flickering */
private const val GPS_BAD_THRESHOLD = 22f
private const val GPS_GOOD_THRESHOLD = 18f

@Composable
fun WearMonitorScreen() {
    // Collect flows at screen level; child composables use derived state
    val state by WearMonitorStateHolder.state.collectAsState()
    val isConnected by WearConnectionManager.connected.collectAsState()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(NavyDark),
        contentAlignment = Alignment.Center
    ) {
        when {
            !isConnected || !state.isActive -> {
                WaitingContent()
            }
            state.gpsSignalLost -> {
                GpsLostContent(state)
            }
            else -> {
                MonitoringContent(state)
            }
        }
    }
}

@Composable
private fun WaitingContent() {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
        modifier = Modifier.padding(16.dp)
    ) {
        Text(
            text = stringResource(R.string.wear_app_name),
            color = TextWhite,
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = stringResource(R.string.wear_waiting),
            color = TextGrey,
            fontSize = 12.sp,
            textAlign = TextAlign.Center
        )
    }
}

@Composable
private fun GpsLostContent(state: WearMonitorState) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
        modifier = Modifier.padding(16.dp)
    ) {
        Text(
            text = stringResource(R.string.wear_gps_lost),
            color = AlarmRed,
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(8.dp))
        AlarmStateChip(state.alarmState)
    }
}

@Composable
private fun MonitoringContent(state: WearMonitorState) {
    val stateColor = alarmStateColor(state.alarmState)

    // Cache formatted distance to avoid allocation on every recomposition
    val formattedDistance = remember(state.distanceMeters) {
        "%.0f".format(state.distanceMeters)
    }

    // Hysteresis for GPS accuracy color: turn red at 22m, green again at 18m
    var gpsBad by remember { mutableStateOf(false) }
    val isGpsBad by remember(state.gpsAccuracyMeters) {
        derivedStateOf {
            if (gpsBad) {
                state.gpsAccuracyMeters > GPS_GOOD_THRESHOLD
            } else {
                state.gpsAccuracyMeters > GPS_BAD_THRESHOLD
            }
        }
    }
    gpsBad = isGpsBad
    val gpsColor = if (isGpsBad) AlarmRed else TextGrey

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
    ) {
        // Alarm state label
        AlarmStateChip(state.alarmState)

        Spacer(modifier = Modifier.height(6.dp))

        // Big distance number
        Text(
            text = formattedDistance,
            color = stateColor,
            fontSize = 42.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center
        )
        Text(
            text = stringResource(R.string.wear_meters),
            color = TextGrey,
            fontSize = 12.sp,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(6.dp))

        // GPS accuracy
        Text(
            text = stringResource(R.string.wear_gps_accuracy, state.gpsAccuracyMeters.toInt()),
            color = gpsColor,
            fontSize = 11.sp,
            textAlign = TextAlign.Center
        )
    }
}

@Composable
private fun AlarmStateChip(alarmState: WearAlarmState) {
    val color = alarmStateColor(alarmState)
    val label = when (alarmState) {
        WearAlarmState.SAFE -> stringResource(R.string.wear_state_safe)
        WearAlarmState.CAUTION -> stringResource(R.string.wear_state_caution)
        WearAlarmState.WARNING -> stringResource(R.string.wear_state_warning)
        WearAlarmState.ALARM -> stringResource(R.string.wear_state_alarm)
    }

    Box(
        modifier = Modifier
            .background(color.copy(alpha = 0.2f), shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp))
            .padding(horizontal = 12.dp, vertical = 4.dp)
    ) {
        Text(
            text = label,
            color = color,
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center
        )
    }
}

private fun alarmStateColor(state: WearAlarmState): Color {
    return when (state) {
        WearAlarmState.SAFE -> SafeGreen
        WearAlarmState.CAUTION -> CautionYellow
        WearAlarmState.WARNING -> WarningOrange
        WearAlarmState.ALARM -> AlarmRed
    }
}
