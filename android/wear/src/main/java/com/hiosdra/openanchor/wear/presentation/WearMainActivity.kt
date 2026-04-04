package com.hiosdra.openanchor.wear.presentation

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.compositionLocalOf
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.google.android.horologist.compose.ambient.AmbientAware
import com.google.android.horologist.compose.ambient.AmbientState
import com.hiosdra.openanchor.wear.data.WearDataRepository
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

/** CompositionLocal providing the current ambient state to child composables. */
val LocalAmbientState = compositionLocalOf<AmbientState> { AmbientState.Interactive }

@AndroidEntryPoint
class WearMainActivity : ComponentActivity() {

    private val viewModel: WearMonitorViewModel by viewModels()

    @Inject
    lateinit var repository: WearDataRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)

        repository.loadCachedState()

        setContent {
            AmbientAware { ambientState ->
                CompositionLocalProvider(LocalAmbientState provides ambientState) {
                    WearMonitorScreen(viewModel = viewModel)
                }
            }
        }
    }
}
