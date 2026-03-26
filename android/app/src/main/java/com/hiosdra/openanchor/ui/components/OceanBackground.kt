package com.hiosdra.openanchor.ui.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.rotate
import kotlin.math.min

// Wave colors matching PWA theme.css
private val Wave1Color = Color(0xFF3B82F6) // Blue
private val Wave2Color = Color(0xFF0EA5E9) // Cyan
private val Wave3Color = Color(0xFF6366F1) // Indigo

private const val WAVE_OPACITY = 0.04f

/**
 * Animated ocean background with three rotating radial gradients.
 * Matches the PWA's wave-spin effect for visual consistency.
 * Very subtle (4% opacity) to not interfere with content readability.
 */
@Composable
fun OceanBackground(
    modifier: Modifier = Modifier,
    enabled: Boolean = true
) {
    if (!enabled) return

    val infiniteTransition = rememberInfiniteTransition(label = "ocean_waves")

    val rotation1 by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(18_000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "wave1_rotation"
    )

    val rotation2 by infiniteTransition.animateFloat(
        initialValue = 360f,
        targetValue = 0f, // Reverse direction like PWA
        animationSpec = infiniteRepeatable(
            animation = tween(24_000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "wave2_rotation"
    )

    val rotation3 by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(30_000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "wave3_rotation"
    )

    Canvas(modifier = modifier.fillMaxSize()) {
        val center = Offset(size.width / 2f, size.height / 2f)
        val radius = min(size.width, size.height) * 0.85f

        // Wave 1 - Blue
        rotate(rotation1, pivot = center) {
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        Wave1Color.copy(alpha = WAVE_OPACITY),
                        Color.Transparent
                    ),
                    center = Offset(center.x * 0.7f, center.y * 0.6f),
                    radius = radius
                ),
                center = center,
                radius = radius
            )
        }

        // Wave 2 - Cyan (reverse direction)
        rotate(rotation2, pivot = center) {
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        Wave2Color.copy(alpha = WAVE_OPACITY),
                        Color.Transparent
                    ),
                    center = Offset(center.x * 1.3f, center.y * 1.2f),
                    radius = radius
                ),
                center = center,
                radius = radius
            )
        }

        // Wave 3 - Indigo
        rotate(rotation3, pivot = center) {
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        Wave3Color.copy(alpha = WAVE_OPACITY),
                        Color.Transparent
                    ),
                    center = Offset(center.x * 1.1f, center.y * 0.8f),
                    radius = radius
                ),
                center = center,
                radius = radius
            )
        }
    }
}
