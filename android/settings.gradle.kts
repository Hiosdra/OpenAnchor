pluginManagement {
    includeBuild("build-logic")
    repositories {
        google {
            content {
                includeGroupByRegex("com\\.android.*")
                includeGroupByRegex("com\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}
plugins {
    id("org.gradle.toolchains.foojay-resolver-convention") version "1.0.0"
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "OpenAnchor"
include(":app")
include(":wear")

// Core modules
include(":core:domain")
include(":core:data")
include(":core:network")
include(":core:ui")
include(":core:testing")

// Feature modules
include(":feature:monitor")
include(":feature:history")
include(":feature:settings")
include(":feature:pairing")
include(":feature:crewwatch")
include(":feature:weather")
include(":feature:advisor")
include(":feature:logbook")
include(":feature:statistics")
include(":feature:home")
