package com.hiosdra.openanchor.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.hiosdra.openanchor.ui.advisor.AdvisorScreen
import com.hiosdra.openanchor.ui.client.ClientDashboardScreen
import com.hiosdra.openanchor.ui.client.ScanQRCodeScreen
import com.hiosdra.openanchor.ui.crewwatch.CrewWatchScreen
import com.hiosdra.openanchor.ui.exam.ExamQuizScreen
import com.hiosdra.openanchor.ui.history.HistoryScreen
import com.hiosdra.openanchor.ui.historydetail.HistoryDetailScreen
import com.hiosdra.openanchor.ui.home.HomeScreen
import com.hiosdra.openanchor.ui.logbook.LogbookScreen
import com.hiosdra.openanchor.ui.monitor.MonitorScreen
import com.hiosdra.openanchor.ui.paired.PairedDashboardScreen
import com.hiosdra.openanchor.ui.pairing.QRCodeScreen
import com.hiosdra.openanchor.ui.settings.SettingsScreen
import com.hiosdra.openanchor.ui.setup.SetupScreen
import com.hiosdra.openanchor.ui.statistics.StatisticsScreen
import com.hiosdra.openanchor.ui.weather.WeatherScreen

@Composable
fun OpenAnchorNavHost(
    navController: NavHostController,
    startDestination: String = Screen.Home.route
) {
    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        composable(Screen.Home.route) {
            HomeScreen(
                onStartSetup = { navController.navigate(Screen.Setup.route) },
                onOpenHistory = { navController.navigate(Screen.History.route) },
                onOpenSettings = { navController.navigate(Screen.Settings.route) },
                onOpenStatistics = { navController.navigate(Screen.Statistics.route) },
                onPairWithTablet = { navController.navigate(Screen.QRCode.route) },
                onConnectToServer = { navController.navigate(Screen.ScanQRCode.route) },
                onOpenCrewWatch = { navController.navigate(Screen.CrewWatch.route) },
                onOpenAdvisor = { navController.navigate(Screen.AIAdvisor.route) },
                onOpenLogbook = { navController.navigate(Screen.Logbook.route) },
                onOpenExamQuiz = { navController.navigate(Screen.ExamQuiz.route) },
                onResumeMonitoring = { sessionId ->
                    navController.navigate(Screen.Monitor.createRoute(sessionId)) {
                        popUpTo(Screen.Home.route) { inclusive = false }
                    }
                },
                onResumeClientMode = {
                    navController.navigate(Screen.ClientDashboard.route) {
                        popUpTo(Screen.Home.route) { inclusive = false }
                    }
                }
            )
        }

        composable(Screen.Setup.route) {
            SetupScreen(
                onSessionCreated = { sessionId ->
                    navController.navigate(Screen.Monitor.createRoute(sessionId)) {
                        popUpTo(Screen.Home.route) { inclusive = false }
                    }
                },
                onBack = { navController.popBackStack() }
            )
        }

        composable(
            route = Screen.Monitor.route,
            arguments = listOf(navArgument("sessionId") { type = NavType.LongType })
        ) { backStackEntry ->
            val sessionId = backStackEntry.arguments?.getLong("sessionId") ?: return@composable
            MonitorScreen(
                sessionId = sessionId,
                onStopMonitoring = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(0) { inclusive = true }
                    }
                },
                onOpenWeather = { lat, lon ->
                    navController.navigate(Screen.Weather.createRoute(lat, lon))
                }
            )
        }

        composable(Screen.History.route) {
            HistoryScreen(
                onSessionClick = { sessionId ->
                    navController.navigate(Screen.HistoryDetail.createRoute(sessionId))
                },
                onBack = { navController.popBackStack() }
            )
        }

        composable(
            route = Screen.HistoryDetail.route,
            arguments = listOf(navArgument("sessionId") { type = NavType.LongType })
        ) { backStackEntry ->
            val sessionId = backStackEntry.arguments?.getLong("sessionId") ?: return@composable
            HistoryDetailScreen(
                sessionId = sessionId,
                onBack = { navController.popBackStack() }
            )
        }

        composable(Screen.Settings.route) {
            SettingsScreen(
                onBack = { navController.popBackStack() }
            )
        }

        composable(Screen.Statistics.route) {
            StatisticsScreen(
                onBack = { navController.popBackStack() }
            )
        }

        composable(
            route = Screen.Weather.route,
            arguments = listOf(
                navArgument("latitude") { type = NavType.FloatType },
                navArgument("longitude") { type = NavType.FloatType }
            )
        ) {
            WeatherScreen(
                onBack = { navController.popBackStack() }
            )
        }

        composable(Screen.QRCode.route) {
            QRCodeScreen(
                onBack = { navController.popBackStack() },
                onPaired = {
                    navController.navigate(Screen.PairedDashboard.route) {
                        popUpTo(Screen.Home.route) { inclusive = false }
                    }
                }
            )
        }

        composable(Screen.CrewWatch.route) {
            CrewWatchScreen(
                onBack = { navController.popBackStack() }
            )
        }

        composable(Screen.PairedDashboard.route) {
            PairedDashboardScreen(
                onDisconnected = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.ScanQRCode.route) {
            ScanQRCodeScreen(
                onBack = { navController.popBackStack() },
                onConnected = {
                    navController.navigate(Screen.ClientDashboard.route) {
                        popUpTo(Screen.Home.route) { inclusive = false }
                    }
                }
            )
        }

        composable(Screen.ClientDashboard.route) {
            ClientDashboardScreen(
                onDisconnected = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.AIAdvisor.route) {
            AdvisorScreen(
                onBack = { navController.popBackStack() }
            )
        }

        composable(Screen.Logbook.route) {
            LogbookScreen(
                onBack = { navController.popBackStack() }
            )
        }

        composable(Screen.ExamQuiz.route) {
            ExamQuizScreen(
                onBack = { navController.popBackStack() }
            )
        }
    }
}
