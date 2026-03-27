plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.ksp)
    alias(libs.plugins.hilt.android)
    jacoco
}

android {
    namespace = "com.hiosdra.openanchor"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.hiosdra.openanchor"
        minSdk = 30
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"

        testInstrumentationRunner = "com.hiosdra.openanchor.HiltTestRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    kotlin {
        compilerOptions {
            jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_11)
        }
    }
    testOptions {
        unitTests.isIncludeAndroidResources = true
        unitTests.isReturnDefaultValues = true
        unitTests.all {
            it.configure<JacocoTaskExtension> {
                isIncludeNoLocationClasses = true
                excludes = listOf("jdk.internal.*")
            }
        }
    }
    buildFeatures {
        compose = true
    }
    packaging {
        resources {
            excludes += setOf(
                "META-INF/INDEX.LIST",
                "META-INF/io.netty.versions.properties",
                "META-INF/DEPENDENCIES",
                "META-INF/AL2.0",
                "META-INF/LGPL2.1",
                "META-INF/LICENSE.md",
                "META-INF/LICENSE-notice.md"
            )
        }
    }
}

ksp {
    arg("room.schemaLocation", "$projectDir/schemas")
}

dependencies {
    // Module dependencies
    implementation(project(":core:domain"))
    implementation(project(":core:data"))
    implementation(project(":core:network"))
    implementation(project(":core:ui"))
    implementation(project(":feature:exam"))
    implementation(project(":feature:monitor"))
    implementation(project(":feature:history"))
    implementation(project(":feature:settings"))
    implementation(project(":feature:pairing"))
    implementation(project(":feature:crewwatch"))
    implementation(project(":feature:weather"))
    implementation(project(":feature:advisor"))
    implementation(project(":feature:logbook"))
    implementation(project(":feature:statistics"))
    implementation(project(":feature:home"))

    // Core
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.lifecycle.service)

    // Compose
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.material.icons.extended)

    // Navigation
    implementation(libs.androidx.navigation.compose)

    // Room
    implementation(libs.androidx.room.runtime)
    implementation(libs.androidx.room.ktx)
    ksp(libs.androidx.room.compiler)

    // Hilt
    implementation(libs.hilt.android)
    ksp(libs.hilt.android.compiler)
    implementation(libs.androidx.hilt.navigation.compose)

    // DataStore
    implementation(libs.androidx.datastore.preferences)

    // Google Play Services
    implementation(libs.play.services.location)
    implementation(libs.play.services.wearable)

    // OpenStreetMap
    implementation(libs.osmdroid)

    // Coroutines
    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.kotlinx.coroutines.play.services)

    // Networking (Open-Meteo weather API)
    implementation(libs.retrofit)
    implementation(libs.retrofit.converter.gson)
    implementation(libs.okhttp)
    implementation(libs.gson)

    // Ktor WebSocket Server (Paired mode)
    implementation(libs.ktor.server.core)
    implementation(libs.ktor.server.cio)
    implementation(libs.ktor.server.websockets)

    // QR Code Generation & Scanning
    implementation(libs.zxing.core)

    // CameraX (QR Scanner for client mode)
    implementation(libs.camerax.core)
    implementation(libs.camerax.camera2)
    implementation(libs.camerax.lifecycle)
    implementation(libs.camerax.view)

    // Gemini AI (Advisor & Logbook)
    implementation(libs.google.generativeai)

    // Test
    testImplementation(libs.junit)
    testImplementation(libs.mockk)
    testImplementation(libs.kotlinx.coroutines.test)
    testImplementation(libs.robolectric)
    testImplementation(platform(libs.androidx.compose.bom))
    testImplementation(libs.androidx.compose.ui.test.junit4)
    testImplementation(libs.androidx.room.testing)
    testImplementation(libs.turbine)
    testImplementation(libs.androidx.arch.core.testing)
    testImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(libs.androidx.test.rules)
    androidTestImplementation(libs.mockk.android)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
    androidTestImplementation(libs.hilt.android.testing)
    kspAndroidTest(libs.hilt.android.compiler)
    debugImplementation(libs.androidx.compose.ui.tooling)
    debugImplementation(libs.androidx.compose.ui.test.manifest)
}

jacoco {
    toolVersion = "0.8.12"
}

tasks.register<JacocoReport>("jacocoTestReport") {
    dependsOn("testDebugUnitTest")

    reports {
        xml.required.set(true)
        html.required.set(true)
        csv.required.set(false)
    }

    val fileFilter = listOf(
        "**/R.class",
        "**/R$*.class",
        "**/BuildConfig.*",
        "**/Manifest*.*",
        "**/*Test*.*",
        "android/**/*.*",
        // Hilt generated
        "**/*_Hilt*.class",
        "**/Hilt_*.class",
        "**/*_Factory.class",
        "**/*_MembersInjector.class",
        "**/*Module.class",
        "**/*Module$*.class",
        "**/*Component.class",
        "**/*Component$*.class",
        "**/*_ComponentImpl.class",
        "**/*_ComponentImpl$*.class",
        // Compose generated lambda holders
        "**/ComposableSingletons*.class",
        // Room generated DAO/DB implementations
        "**/*_Impl.class",
        "**/*_Impl$*.class",
        // Navigation graph definition
        "**/NavHostKt*.class",
        // Activity lifecycle + permissions (not unit-testable)
        "**/MainActivity*.class",
        // Bound service lifecycle (logic extracted to GpsProcessor/AlarmHandler)
        "**/AnchorMonitorService*.class",
        "**/ServiceBinder*.class",
        // PDF renderer uses system PdfRenderer + Bitmap (not unit-testable)
        "**/ExamPdfRenderer*.class",
        // Service orchestrators/managers extracted from AnchorMonitorService
        // (interact with Android services, GPS, alarms — not unit-testable)
        "**/StandaloneMonitorManager*.class",
        "**/PairedModeOrchestrator*.class",
        "**/ClientModeOrchestrator*.class",
        "**/BatteryMonitorManager*.class",
        // Hardware sensor providers (require Android system APIs)
        "**/LocationProvider*.class",
        "**/CompassProvider*.class",
        "**/BatteryProvider*.class",
        // Application class (Hilt setup only)
        "**/OpenAnchorApp*.class",
    )

    val debugTree = fileTree("${project.layout.buildDirectory.get()}/tmp/kotlin-classes/debug") {
        exclude(fileFilter)
    }
    val mainSrc = "${project.projectDir}/src/main/java"

    sourceDirectories.setFrom(files(mainSrc))
    classDirectories.setFrom(files(debugTree))
    executionData.setFrom(fileTree(project.layout.buildDirectory.get()) {
        include("jacoco/testDebugUnitTest.exec")
    })
}

tasks.register<JacocoCoverageVerification>("jacocoCoverageVerification") {
    dependsOn("testDebugUnitTest")

    val fileFilter = listOf(
        "**/R.class",
        "**/R$*.class",
        "**/BuildConfig.*",
        "**/Manifest*.*",
        "**/*Test*.*",
        "android/**/*.*",
        "**/*_Hilt*.class",
        "**/Hilt_*.class",
        "**/*_Factory.class",
        "**/*_MembersInjector.class",
        "**/*Module.class",
        "**/*Module$*.class",
        "**/*Component.class",
        "**/*Component$*.class",
        "**/*_ComponentImpl.class",
        "**/*_ComponentImpl$*.class",
        "**/ComposableSingletons*.class",
        "**/*_Impl.class",
        "**/*_Impl$*.class",
        "**/NavHostKt*.class",
        "**/MainActivity*.class",
        "**/AnchorMonitorService*.class",
        "**/ServiceBinder*.class",
        // PDF renderer uses system PdfRenderer + Bitmap (not unit-testable)
        "**/ExamPdfRenderer*.class",
        // Service orchestrators/managers extracted from AnchorMonitorService
        "**/StandaloneMonitorManager*.class",
        "**/PairedModeOrchestrator*.class",
        "**/ClientModeOrchestrator*.class",
        "**/BatteryMonitorManager*.class",
        // Hardware sensor providers (require Android system APIs)
        "**/LocationProvider*.class",
        "**/CompassProvider*.class",
        "**/BatteryProvider*.class",
        // Application class (Hilt setup only)
        "**/OpenAnchorApp*.class",
    )

    val debugTree = fileTree("${project.layout.buildDirectory.get()}/tmp/kotlin-classes/debug") {
        exclude(fileFilter)
    }

    classDirectories.setFrom(files(debugTree))
    executionData.setFrom(fileTree(project.layout.buildDirectory.get()) {
        include("jacoco/testDebugUnitTest.exec")
    })

    violationRules {
        rule {
            limit {
                counter = "LINE"
                value = "COVEREDRATIO"
                minimum = "0.90".toBigDecimal()
            }
        }
    }
}
