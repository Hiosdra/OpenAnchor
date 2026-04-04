plugins {
    id("openanchor.android.feature")
    id("openanchor.android.test")
}

android {
    namespace = "com.hiosdra.openanchor.feature.history"
}

dependencies {
    implementation(project(":core:domain"))
    implementation(project(":core:data"))
    implementation(project(":core:ui"))

    implementation(libs.osmdroid)

    testImplementation(project(":core:testing"))
}
