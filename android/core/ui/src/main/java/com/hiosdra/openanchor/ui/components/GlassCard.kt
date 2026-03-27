package com.hiosdra.openanchor.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.hiosdra.openanchor.ui.theme.NavyDark
import com.hiosdra.openanchor.ui.theme.NavyMedium
import com.hiosdra.openanchor.ui.theme.spacing

/**
 * A glassmorphism-style card matching the PWA's frosted glass aesthetic.
 * Features semi-transparent background, gradient border, and soft shadow.
 */
@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    cornerRadius: Dp = MaterialTheme.spacing.cardRadius,
    content: @Composable ColumnScope.() -> Unit
) {
    val shape = RoundedCornerShape(cornerRadius)
    val borderBrush = Brush.linearGradient(
        colors = listOf(
            Color.White.copy(alpha = 0.12f),
            Color.White.copy(alpha = 0.03f)
        )
    )

    Column(
        modifier = modifier
            .shadow(
                elevation = 8.dp,
                shape = shape,
                ambientColor = NavyDark,
                spotColor = NavyDark.copy(alpha = 0.5f)
            )
            .clip(shape)
            .background(NavyMedium.copy(alpha = 0.6f))
            .border(width = 1.dp, brush = borderBrush, shape = shape)
            .padding(MaterialTheme.spacing.cardPadding),
        content = content
    )
}

/**
 * A subtle glass surface for smaller elements (badges, chips, overlays).
 */
@Composable
fun GlassSurface(
    modifier: Modifier = Modifier,
    cornerRadius: Dp = 12.dp,
    alpha: Float = 0.4f,
    content: @Composable BoxScope.() -> Unit
) {
    val shape = RoundedCornerShape(cornerRadius)
    Box(
        modifier = modifier
            .clip(shape)
            .background(NavyMedium.copy(alpha = alpha))
            .border(
                width = 0.5.dp,
                color = Color.White.copy(alpha = 0.08f),
                shape = shape
            ),
        content = content
    )
}
