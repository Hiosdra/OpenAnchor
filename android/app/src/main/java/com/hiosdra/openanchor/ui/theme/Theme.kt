package com.hiosdra.openanchor.ui.theme

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary = OceanBlue,
    onPrimary = TextWhite,
    primaryContainer = OceanBlueDark,
    onPrimaryContainer = TextWhite,
    secondary = SafeGreen,
    onSecondary = TextWhite,
    tertiary = WarningOrange,
    onTertiary = NavyDark,
    background = NavyDark,
    onBackground = TextWhite,
    surface = NavyMedium,
    onSurface = TextWhite,
    surfaceVariant = SurfaceLight,
    onSurfaceVariant = TextGrey,
    error = AlarmRed,
    onError = TextWhite,
    errorContainer = AlarmRedDark,
    onErrorContainer = TextWhite,
    outline = TextGrey
)

/**
 * CompositionLocal to indicate if the red night filter is active.
 * Child composables can read this to adapt if needed.
 */
val LocalNightFilterEnabled = compositionLocalOf { false }

@Composable
fun OpenAnchorTheme(
    nightFilterEnabled: Boolean = false,
    content: @Composable () -> Unit
) {
    CompositionLocalProvider(LocalNightFilterEnabled provides nightFilterEnabled) {
        MaterialTheme(
            colorScheme = DarkColorScheme,
            typography = Typography
        ) {
            if (nightFilterEnabled) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .drawWithContent {
                            drawContent()
                            // Red overlay: draws a dark red layer with Color blend mode.
                            // This maps all hues to red tones while preserving luminance.
                            drawRect(
                                color = Color(0xFFCC0000),
                                blendMode = BlendMode.Color
                            )
                            // Slight darkening to reduce brightness further for night vision
                            drawRect(
                                color = Color.Black.copy(alpha = 0.3f),
                                blendMode = BlendMode.Darken
                            )
                        }
                ) {
                    content()
                }
            } else {
                content()
            }
        }
    }
}
