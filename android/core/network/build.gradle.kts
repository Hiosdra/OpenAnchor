plugins {
    id("openanchor.android.library")
    alias(libs.plugins.ksp)
    alias(libs.plugins.hilt.android)
}

android {
    namespace = "com.hiosdra.openanchor.core.network"
}

dependencies {
    api(project(":core:domain"))

    // Hilt
    implementation(libs.hilt.android)
    ksp(libs.hilt.android.compiler)

    // Coroutines
    implementation(libs.kotlinx.coroutines.android)

    // Ktor WebSocket Server
    implementation(libs.ktor.server.core)
    implementation(libs.ktor.server.cio)
    implementation(libs.ktor.server.websockets)

    // Gson for protocol messages
    implementation(libs.gson)

    // OkHttp for WebSocket client
    implementation(libs.okhttp)

    // Google Play Services (Wearable for Hotspot)
    implementation(libs.play.services.wearable)

    // Test
    testImplementation(libs.junit)
    testImplementation(libs.mockk)
    testImplementation(libs.kotlinx.coroutines.test)
    testImplementation(libs.turbine)
}
