package com.hiosdra.openanchor.wear.presentation

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen

class WearMainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)

        setContent {
            // State collection moved into WearMonitorScreen and its children
            // to avoid full root recomposition on every state/connected change
            WearMonitorScreen()
        }
    }
}
