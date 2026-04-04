package com.hiosdra.openanchor.ui.theme

import com.hiosdra.openanchor.domain.model.ThemeMode
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Color
import com.hiosdra.openanchor.ui.components.OceanBackground


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

private val LightColorScheme = lightColorScheme(
    primary = LightPrimary,
    onPrimary = Color.White,
    primaryContainer = LightPrimary.copy(alpha = 0.12f),
    onPrimaryContainer = LightPrimary,
    secondary = LightSecondary,
    onSecondary = Color.White,
    tertiary = LightTertiary,
    onTertiary = Color.White,
    background = LightBackground,
    onBackground = LightOnBackground,
    surface = LightSurface,
    onSurface = LightOnSurface,
    surfaceVariant = LightSurfaceVariant,
    onSurfaceVariant = Color(0xFF64748B),
    error = LightError,
    onError = Color.White,
    errorContainer = LightError.copy(alpha = 0.12f),
    onErrorContainer = LightError,
    outline = Color(0xFF94A3B8)
)

/**
 * CompositionLocal to indicate if the red night filter is active.
 * Child composables can read this to adapt if needed.
 */
val LocalNightFilterEnabled = compositionLocalOf { false }

@Composable
fun OpenAnchorTheme(
    themeMode: ThemeMode = ThemeMode.DARK,
    content: @Composable () -> Unit
) {
    val nightFilterEnabled = themeMode == ThemeMode.NIGHT_VISION
    val colorScheme = when (themeMode) {
        ThemeMode.LIGHT -> LightColorScheme
        ThemeMode.DARK, ThemeMode.NIGHT_VISION -> DarkColorScheme
    }

    CompositionLocalProvider(
        LocalNightFilterEnabled provides nightFilterEnabled,
        LocalSpacing provides Spacing()
    ) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = Typography
        ) {
            Box(modifier = Modifier.fillMaxSize()) {
                OceanBackground(enabled = !nightFilterEnabled)
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
}
