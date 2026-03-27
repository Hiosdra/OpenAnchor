plugins {
    id("openanchor.android.feature")
    id("openanchor.android.test")
}

android {
    namespace = "com.hiosdra.openanchor.feature.monitor"
}

dependencies {
    implementation(project(":core:domain"))
    implementation(project(":core:data"))
    implementation(project(":core:ui"))
    implementation(project(":core:network"))

    // OSM for map
    implementation(libs.osmdroid)

    testImplementation(project(":core:testing"))
}
