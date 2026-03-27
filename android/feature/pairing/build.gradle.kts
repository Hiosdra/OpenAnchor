plugins {
    id("openanchor.android.feature")
    id("openanchor.android.test")
}

android {
    namespace = "com.hiosdra.openanchor.feature.pairing"
}

dependencies {
    implementation(project(":core:domain"))
    implementation(project(":core:data"))
    implementation(project(":core:ui"))
    implementation(project(":core:network"))

    // CameraX (QR Scanner)
    implementation(libs.camerax.core)
    implementation(libs.camerax.camera2)
    implementation(libs.camerax.lifecycle)
    implementation(libs.camerax.view)

    // QR Code
    implementation(libs.zxing.core)

    // OSM for paired dashboard map
    implementation(libs.osmdroid)

    // Gson for QR payload
    implementation(libs.gson)

    testImplementation(project(":core:testing"))
}
