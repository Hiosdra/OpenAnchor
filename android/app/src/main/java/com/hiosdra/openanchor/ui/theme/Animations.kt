package com.hiosdra.openanchor.ui.theme

import androidx.compose.animation.core.*
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback

// Standard spring specs for the app
object OaAnimations {
    val pressSpring = spring<Float>(
        dampingRatio = Spring.DampingRatioMediumBouncy,
        stiffness = Spring.StiffnessMedium
    )

    val quickSpring = spring<Float>(
        dampingRatio = Spring.DampingRatioNoBouncy,
        stiffness = Spring.StiffnessHigh
    )

    val gentleSpring = spring<Float>(
        dampingRatio = Spring.DampingRatioLowBouncy,
        stiffness = Spring.StiffnessLow
    )

    val colorTransitionSpec = tween<androidx.compose.ui.graphics.Color>(
        durationMillis = 600,
        easing = FastOutSlowInEasing
    )
}

/**
 * Modifier that scales down to 0.96 on press with a spring animation.
 * Provides a satisfying "push" feel on interactive elements.
 */
fun Modifier.pressEffect(
    enabled: Boolean = true,
    pressScale: Float = 0.96f,
): Modifier = composed {
    if (!enabled) return@composed this

    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()

    val scale by animateFloatAsState(
        targetValue = if (isPressed) pressScale else 1f,
        animationSpec = OaAnimations.pressSpring,
        label = "press_scale"
    )

    this
        .graphicsLayer {
            scaleX = scale
            scaleY = scale
        }
}

/**
 * Modifier that adds a press animation AND haptic feedback on click.
 */
fun Modifier.bounceClick(
    enabled: Boolean = true,
    pressScale: Float = 0.96f,
    onClick: () -> Unit
): Modifier = composed {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val haptic = LocalHapticFeedback.current

    val scale by animateFloatAsState(
        targetValue = if (isPressed) pressScale else 1f,
        animationSpec = OaAnimations.pressSpring,
        label = "bounce_scale"
    )

    this
        .graphicsLayer {
            scaleX = scale
            scaleY = scale
        }
        .clickable(
            interactionSource = interactionSource,
            indication = null,
            enabled = enabled
        ) {
            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
            onClick()
        }
}

/**
 * A pulsing glow effect for alarm states.
 * Returns an animated alpha value that pulses between minAlpha and maxAlpha.
 * When disabled, returns a static 1.0f without creating an InfiniteTransition.
 */
@Composable
fun rememberPulsingAlpha(
    enabled: Boolean = true,
    minAlpha: Float = 0.5f,
    maxAlpha: Float = 1.0f,
    durationMillis: Int = 1000
): State<Float> {
    if (!enabled) return remember { mutableFloatStateOf(1f) }
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    return infiniteTransition.animateFloat(
        initialValue = maxAlpha,
        targetValue = minAlpha,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse_alpha"
    )
}
