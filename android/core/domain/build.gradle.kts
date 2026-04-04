plugins {
    id("openanchor.android.library")
    id("openanchor.android.test")
}

android {
    namespace = "com.hiosdra.openanchor.core.domain"
}

dependencies {
    implementation(libs.kotlinx.coroutines.android)
    // Allow @Inject in domain classes
    implementation(libs.javax.inject)
}
