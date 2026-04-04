package com.hiosdra.openanchor.ui.monitor

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.hiosdra.openanchor.core.ui.R
import com.hiosdra.openanchor.domain.drift.DriftAnalysis
import com.hiosdra.openanchor.ui.theme.*

/**
 * Battery level indicator for local and optional peer device.
 */
@Composable
internal fun MonitorBatteryIndicator(
    localLevel: Int,
    localCharging: Boolean,
    peerLevel: Double?,
    peerCharging: Boolean?,
    compact: Boolean
) {
    if (localLevel < 0) return

    val batteryColor = when {
        localLevel <= 15 -> AlarmRed
        localLevel <= 30 -> CautionYellow
        else -> if (compact) Color.White.copy(alpha = 0.8f) else TextGrey
    }

    val batteryIcon = when {
        localCharging -> Icons.Default.BatteryChargingFull
        localLevel <= 15 -> Icons.Default.BatteryAlert
        else -> Icons.Default.Battery5Bar
    }

    if (compact) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                batteryIcon,
                contentDescription = null,
                tint = batteryColor,
                modifier = Modifier.size(16.dp)
            )
            Spacer(modifier = Modifier.width(2.dp))
            Text(
                text = "$localLevel%",
                style = MaterialTheme.typography.labelSmall,
                color = batteryColor
            )
            if (peerLevel != null) {
                Spacer(modifier = Modifier.width(6.dp))
                val peerColor = when {
                    peerLevel <= 15 -> AlarmRed
                    peerLevel <= 30 -> CautionYellow
                    else -> Color.White.copy(alpha = 0.6f)
                }
                Text(
                    text = "P:${peerLevel.toInt()}%",
                    style = MaterialTheme.typography.labelSmall,
                    color = peerColor
                )
            }
        }
    } else {
        Spacer(modifier = Modifier.height(4.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                batteryIcon,
                contentDescription = null,
                tint = batteryColor,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = stringResource(R.string.battery_level, localLevel),
                style = MaterialTheme.typography.bodySmall,
                color = batteryColor
            )
            if (localCharging) {
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = stringResource(R.string.battery_charging),
                    style = MaterialTheme.typography.bodySmall,
                    color = SafeGreen
                )
            }
        }
        if (peerLevel != null) {
            val peerColor = when {
                peerLevel <= 15 -> AlarmRed
                peerLevel <= 30 -> CautionYellow
                else -> TextGrey
            }
            Text(
                text = stringResource(R.string.peer_battery, peerLevel.toInt()),
                style = MaterialTheme.typography.bodySmall,
                color = peerColor
            )
        }
        if (localLevel <= 15) {
            Text(
                text = stringResource(R.string.battery_low),
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Bold,
                color = AlarmRed
            )
        }
    }
}

/**
 * Animated drift/anchor drag warning banner.
 */
@Composable
internal fun MonitorDriftWarningBanner(
    driftAnalysis: DriftAnalysis?
) {
    val isDragging = driftAnalysis?.isDragging == true

    AnimatedVisibility(
        visible = isDragging,
        enter = slideInVertically() + fadeIn(),
        exit = slideOutVertically() + fadeOut()
    ) {
        if (driftAnalysis != null && driftAnalysis.isDragging) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp),
                colors = CardDefaults.cardColors(containerColor = AlarmRed.copy(alpha = 0.95f))
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.Warning,
                        contentDescription = stringResource(R.string.a11y_drift_warning_icon),
                        tint = Color.White,
                        modifier = Modifier.size(28.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = stringResource(R.string.drift_warning),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        driftAnalysis.driftBearingDeg?.let { bearing ->
                            Text(
                                text = stringResource(R.string.drift_direction, bearing),
                                style = MaterialTheme.typography.bodySmall,
                                color = Color.White.copy(alpha = 0.9f)
                            )
                        }
                        Text(
                            text = stringResource(R.string.drift_speed, driftAnalysis.driftSpeedMpm),
                            style = MaterialTheme.typography.bodySmall,
                            color = Color.White.copy(alpha = 0.9f)
                        )
                    }
                }
            }
        }
    }
}

/**
 * Draws a directional arrow rotated to point toward the anchor.
 * 0° = up (north), rotated clockwise by [bearingDegrees].
 */
@Composable
internal fun MonitorBearingArrow(
    bearingDegrees: Double,
    color: Color,
    modifier: Modifier = Modifier
) {
    val arrowDescription = stringResource(R.string.a11y_bearing_arrow_description, "%.0f".format(bearingDegrees))
    Canvas(modifier = modifier.semantics { contentDescription = arrowDescription }) {
        val w = size.width
        val h = size.height
        val cx = w / 2f
        val cy = h / 2f

        rotate(degrees = bearingDegrees.toFloat(), pivot = Offset(cx, cy)) {
            // Arrow body: triangle pointing up with a tail
            val arrowPath = Path().apply {
                // Tip (top center)
                moveTo(cx, h * 0.05f)
                // Bottom-right wing
                lineTo(cx + w * 0.25f, h * 0.65f)
                // Inner right notch
                lineTo(cx + w * 0.08f, h * 0.55f)
                // Tail right
                lineTo(cx + w * 0.08f, h * 0.90f)
                // Tail left
                lineTo(cx - w * 0.08f, h * 0.90f)
                // Inner left notch
                lineTo(cx - w * 0.08f, h * 0.55f)
                // Bottom-left wing
                lineTo(cx - w * 0.25f, h * 0.65f)
                close()
            }
            drawPath(arrowPath, color = color)

            // Small dot at the tip to emphasize anchor direction
            drawCircle(
                color = color.copy(alpha = 0.5f),
                radius = w * 0.05f,
                center = Offset(cx, h * 0.05f)
            )
        }
    }
}
