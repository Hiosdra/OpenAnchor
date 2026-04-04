plugins {
    id("openanchor.android.library")
}

android {
    namespace = "com.hiosdra.openanchor.core.testing"
}

dependencies {
    api(project(":core:domain"))
    api(project(":core:network"))

    api(libs.junit)
    api(libs.mockk)
    api(libs.kotlinx.coroutines.test)
    api(libs.robolectric)
    api(platform(libs.androidx.compose.bom))
    api(libs.androidx.compose.ui.test.junit4)
    api(libs.turbine)
    api(libs.androidx.arch.core.testing)
    api(libs.androidx.junit)
}
