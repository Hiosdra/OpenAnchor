package com.hiosdra.openanchor.ui.theme

import androidx.compose.runtime.Composable
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

data class Spacing(
    val xxs: Dp = 2.dp,
    val xs: Dp = 4.dp,
    val sm: Dp = 8.dp,
    val md: Dp = 12.dp,
    val lg: Dp = 16.dp,
    val xl: Dp = 24.dp,
    val xxl: Dp = 32.dp,
    val xxxl: Dp = 48.dp,
    val huge: Dp = 64.dp,
    // Component-specific tokens
    val cardPadding: Dp = 16.dp,
    val cardRadius: Dp = 16.dp,
    val buttonHeight: Dp = 56.dp,
    val iconSize: Dp = 24.dp,
    val iconSizeLarge: Dp = 32.dp,
    val statusBadgeHeight: Dp = 36.dp,
    val touchTarget: Dp = 48.dp,
)

val LocalSpacing = compositionLocalOf { Spacing() }

val MaterialTheme.spacing: Spacing
    @Composable
    @ReadOnlyComposable
    get() = LocalSpacing.current
