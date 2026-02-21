package com.hiosdra.openanchor

import android.app.Application
import dagger.hilt.android.HiltAndroidApp
import org.osmdroid.config.Configuration

@HiltAndroidApp
class OpenAnchorApp : Application() {
    override fun onCreate() {
        super.onCreate()
        Configuration.getInstance().apply {
            userAgentValue = packageName
            load(this@OpenAnchorApp, getSharedPreferences("osmdroid", MODE_PRIVATE))
        }
    }
}
