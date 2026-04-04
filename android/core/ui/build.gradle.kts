plugins {
    id("openanchor.android.library")
    id("openanchor.android.test")
}

android {
    namespace = "com.hiosdra.openanchor.core.ui"
}

dependencies {
    api(project(":core:domain"))

    // OSM
    implementation(libs.osmdroid)
}
