package com.hiosdra.openanchor.wear.presentation

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.LinearProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
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
import kotlinx.coroutines.delay
import com.google.android.horologist.compose.ambient.AmbientState

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

/** Number of info modes to cycle through on tap */
private const val INFO_MODE_COUNT = 3

/** Default alarm radius used for progress visualization when not provided by phone */
private const val DEFAULT_MAX_RADIUS_METERS = 50.0

@Composable
fun WearMonitorScreen() {
    val state by WearMonitorStateHolder.state.collectAsState()
    val isConnected by WearConnectionManager.connected.collectAsState()
    val ambientState = LocalAmbientState.current
    val isAmbient = ambientState is AmbientState.Ambient

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black),
        contentAlignment = Alignment.Center
    ) {
        if (isAmbient) {
            // Ambient mode: simplified white-on-black layout
            AmbientContent(state, isConnected)
        } else {
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
    }
}

// Feature 2: Ambient mode — simplified white-on-black, essential info only
@Composable
private fun AmbientContent(state: WearMonitorState, isConnected: Boolean) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
        modifier = Modifier.padding(16.dp)
    ) {
        if (!isConnected || !state.isActive) {
            Text(
                text = "--",
                color = Color.White,
                fontSize = 42.sp,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center
            )
        } else {
            val distanceText = remember(state.distanceMeters) {
                "%.0f".format(state.distanceMeters)
            }
            Text(
                text = distanceText,
                color = Color.White,
                fontSize = 42.sp,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center
            )
            Text(
                text = stringResource(R.string.wear_meters),
                color = Color.Gray,
                fontSize = 12.sp,
                textAlign = TextAlign.Center
            )
        }
    }
}

// UX 1: Multi-phase waiting messages
@Composable
private fun WaitingContent() {
    var elapsedSeconds by remember { mutableLongStateOf(0L) }

    LaunchedEffect(Unit) {
        while (true) {
            delay(1_000L)
            elapsedSeconds++
        }
    }

    val waitingText = when {
        elapsedSeconds < 5 -> stringResource(R.string.wear_connecting)
        elapsedSeconds < 15 -> stringResource(R.string.wear_searching_phone)
        else -> stringResource(R.string.wear_no_connection)
    }

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
            text = waitingText,
            color = if (elapsedSeconds >= 15) AlarmRed else TextGrey,
            fontSize = 12.sp,
            textAlign = TextAlign.Center
        )
    }
}

// UX 5: Actionable GPS Lost screen with context
@Composable
private fun GpsLostContent(state: WearMonitorState) {
    val timeSinceGpsLost = remember(state.timestamp) {
        if (state.timestamp > 0L) {
            val elapsedSec = (System.currentTimeMillis() - state.timestamp) / 1000
            if (elapsedSec < 60) "${elapsedSec}s" else "${elapsedSec / 60}min"
        } else null
    }

    val lastDistance = remember(state.distanceMeters) {
        if (state.distanceMeters > 0) "%.0f".format(state.distanceMeters) else null
    }

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
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = stringResource(R.string.wear_check_phone),
            color = TextGrey,
            fontSize = 12.sp,
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(8.dp))
        AlarmStateChip(state.alarmState)

        if (lastDistance != null) {
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = stringResource(R.string.wear_last_distance, lastDistance),
                color = TextGrey,
                fontSize = 11.sp,
                textAlign = TextAlign.Center
            )
        }
        if (timeSinceGpsLost != null) {
            Text(
                text = stringResource(R.string.wear_gps_lost_ago, timeSinceGpsLost),
                color = TextGrey,
                fontSize = 10.sp,
                textAlign = TextAlign.Center
            )
        }
    }
}

// UX 2: Tappable monitoring content that cycles through info modes
// UX 3: Haptic feedback on GPS accuracy going bad
@Composable
private fun MonitoringContent(state: WearMonitorState) {
    val context = LocalContext.current
    val stateColor = alarmStateColor(state.alarmState)

    // UX 2: Tap to cycle info mode (0=distance, 1=accuracy, 2=combined)
    var infoMode by remember { mutableIntStateOf(0) }

    val formattedDistance = remember(state.distanceMeters) {
        "%.0f".format(state.distanceMeters)
    }

    // Hysteresis for GPS accuracy color
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

    // UX 3: Haptic feedback when GPS transitions from good to bad
    val wasGpsBad = remember { mutableStateOf(gpsBad) }
    LaunchedEffect(isGpsBad) {
        if (isGpsBad && !wasGpsBad.value) {
            triggerShortHaptic(context)
        }
        wasGpsBad.value = isGpsBad
    }

    gpsBad = isGpsBad
    val gpsColor = if (isGpsBad) AlarmRed else TextGrey

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
        modifier = Modifier
            .padding(horizontal = 16.dp, vertical = 8.dp)
            .clickable { infoMode = (infoMode + 1) % INFO_MODE_COUNT }
    ) {
        AlarmStateChip(state.alarmState)

        Spacer(modifier = Modifier.height(6.dp))

        when (infoMode) {
            0 -> {
                // Distance mode (default)
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
            }
            1 -> {
                // GPS accuracy mode
                Text(
                    text = "\u00B1${state.gpsAccuracyMeters.toInt()}",
                    color = gpsColor,
                    fontSize = 42.sp,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center
                )
                Text(
                    text = stringResource(R.string.wear_gps_accuracy_label),
                    color = TextGrey,
                    fontSize = 12.sp,
                    textAlign = TextAlign.Center
                )
            }
            2 -> {
                // Combined detail mode
                Text(
                    text = formattedDistance,
                    color = stateColor,
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center
                )
                Text(
                    text = stringResource(R.string.wear_meters),
                    color = TextGrey,
                    fontSize = 12.sp,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = stringResource(R.string.wear_gps_accuracy, state.gpsAccuracyMeters.toInt()),
                    color = gpsColor,
                    fontSize = 11.sp,
                    textAlign = TextAlign.Center
                )
            }
        }

        // Show secondary GPS info in default distance mode
        if (infoMode == 0) {
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = stringResource(R.string.wear_gps_accuracy, state.gpsAccuracyMeters.toInt()),
                color = gpsColor,
                fontSize = 11.sp,
                textAlign = TextAlign.Center
            )
        }

        // Feature 5: Alarm zone visualization — progress bar showing distance/radius ratio
        Spacer(modifier = Modifier.height(6.dp))
        AlarmZoneIndicator(
            distanceMeters = state.distanceMeters,
            alarmColor = stateColor
        )
    }
}

// Feature 5: Simple progress bar showing how close the boat is to alarm threshold
@Composable
private fun AlarmZoneIndicator(
    distanceMeters: Double,
    alarmColor: Color
) {
    val progress = remember(distanceMeters) {
        (distanceMeters / DEFAULT_MAX_RADIUS_METERS).coerceIn(0.0, 1.0).toFloat()
    }

    LinearProgressIndicator(
        progress = progress,
        modifier = Modifier
            .fillMaxWidth(0.7f)
            .height(4.dp),
        color = alarmColor,
        backgroundColor = TextGrey.copy(alpha = 0.3f)
    )
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

// UX 3: Short haptic pulse for GPS accuracy degradation
private fun triggerShortHaptic(context: Context) {
    val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val manager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
        manager?.defaultVibrator
    } else {
        @Suppress("DEPRECATION")
        context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
    }
    vibrator?.vibrate(VibrationEffect.createOneShot(50, VibrationEffect.DEFAULT_AMPLITUDE))
}
