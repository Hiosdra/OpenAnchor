package com.hiosdra.openanchor.wear.presentation

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.compositionLocalOf
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.google.android.horologist.compose.ambient.AmbientAware
import com.google.android.horologist.compose.ambient.AmbientState

/** CompositionLocal providing the current ambient state to child composables. */
val LocalAmbientState = compositionLocalOf<AmbientState> { AmbientState.Interactive }

class WearMainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)

        setContent {
            AmbientAware { ambientState ->
                CompositionLocalProvider(LocalAmbientState provides ambientState) {
                    WearMonitorScreen()
                }
            }
        }
    }
}
