plugins {
    id("openanchor.android.library")
}

android {
    namespace = "com.hiosdra.openanchor.core.ui"
}

dependencies {
    api(project(":core:domain"))

    // OSM
    implementation(libs.osmdroid)
}
