package com.hiosdra.openanchor.ui.navigation

sealed class Screen(val route: String) {
    data object Home : Screen("home")
    data object Setup : Screen("setup")
    data object Monitor : Screen("monitor/{sessionId}") {
        fun createRoute(sessionId: Long) = "monitor/$sessionId"
    }
    data object History : Screen("history")
    data object HistoryDetail : Screen("history/{sessionId}") {
        fun createRoute(sessionId: Long) = "history/$sessionId"
    }
    data object Settings : Screen("settings")
    data object Statistics : Screen("statistics")
    data object Weather : Screen("weather/{latitude}/{longitude}") {
        fun createRoute(latitude: Float, longitude: Float) = "weather/$latitude/$longitude"
    }
}
