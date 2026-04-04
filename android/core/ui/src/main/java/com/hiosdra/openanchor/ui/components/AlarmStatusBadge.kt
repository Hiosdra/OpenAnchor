package com.hiosdra.openanchor.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Anchor
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material.icons.filled.Waves
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.hiosdra.openanchor.domain.model.AlarmState
import com.hiosdra.openanchor.ui.theme.*

fun AlarmState.icon(): ImageVector = when (this) {
    AlarmState.SAFE -> Icons.Filled.Anchor
    AlarmState.CAUTION -> Icons.Filled.Waves
    AlarmState.WARNING -> Icons.Filled.Warning
    AlarmState.ALARM -> Icons.Filled.NotificationsActive
}

fun AlarmState.color(): Color = when (this) {
    AlarmState.SAFE -> SafeGreen
    AlarmState.CAUTION -> CautionYellow
    AlarmState.WARNING -> WarningOrange
    AlarmState.ALARM -> AlarmRed
}

fun AlarmState.label(): String = when (this) {
    AlarmState.SAFE -> "SAFE"
    AlarmState.CAUTION -> "CAUTION"
    AlarmState.WARNING -> "WARNING"
    AlarmState.ALARM -> "ALARM"
}

/**
 * A pill-shaped status badge with icon, label, and optional pulsing glow.
 * Pulsing is enabled for WARNING and ALARM states to draw attention.
 */
@Composable
fun AlarmStatusBadge(
    alarmState: AlarmState,
    modifier: Modifier = Modifier,
    showLabel: Boolean = true,
) {
    val animatedColor by animateColorAsState(
        targetValue = alarmState.color(),
        animationSpec = tween(600, easing = FastOutSlowInEasing),
        label = "badge_color"
    )

    val isPulsing = alarmState == AlarmState.WARNING || alarmState == AlarmState.ALARM
    val pulseAlpha by rememberPulsingAlpha(
        enabled = isPulsing,
        minAlpha = 0.6f,
        maxAlpha = 1.0f,
        durationMillis = if (alarmState == AlarmState.ALARM) 600 else 1000
    )

    val shape = RoundedCornerShape(999.dp)
    val bgAlpha = if (isPulsing) 0.2f * pulseAlpha else 0.15f
    val borderAlpha = if (isPulsing) 0.4f * pulseAlpha else 0.3f

    Row(
        modifier = modifier
            .then(
                if (isPulsing) {
                    Modifier.shadow(
                        elevation = (8 * pulseAlpha).dp,
                        shape = shape,
                        ambientColor = animatedColor.copy(alpha = 0.3f),
                        spotColor = animatedColor.copy(alpha = 0.5f)
                    )
                } else Modifier
            )
            .clip(shape)
            .background(animatedColor.copy(alpha = bgAlpha))
            .border(1.dp, animatedColor.copy(alpha = borderAlpha), shape)
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = alarmState.icon(),
            contentDescription = alarmState.label(),
            tint = animatedColor,
            modifier = Modifier.size(20.dp)
        )
        if (showLabel) {
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = alarmState.label(),
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Bold,
                color = animatedColor
            )
        }
    }
}
