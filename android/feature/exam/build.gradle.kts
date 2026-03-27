plugins {
    id("openanchor.android.feature")
    id("openanchor.android.test")
}

android {
    namespace = "com.hiosdra.openanchor.feature.exam"
}

dependencies {
    implementation(project(":core:domain"))
    implementation(project(":core:data"))
    implementation(project(":core:ui"))

    // Gson for question bank JSON
    implementation(libs.gson)

    testImplementation(project(":core:testing"))
}
