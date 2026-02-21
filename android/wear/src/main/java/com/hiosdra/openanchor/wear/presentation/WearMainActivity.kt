package com.hiosdra.openanchor.wear.presentation

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.hiosdra.openanchor.wear.data.WearMonitorStateHolder

class WearMainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)

        setContent {
            val state by WearMonitorStateHolder.state.collectAsState()
            val connected by WearMonitorStateHolder.connected.collectAsState()

            WearMonitorScreen(
                state = state,
                isConnected = connected
            )
        }
    }
}
