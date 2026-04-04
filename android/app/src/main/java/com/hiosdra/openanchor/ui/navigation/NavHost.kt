package com.hiosdra.openanchor.ui.navigation

import androidx.compose.animation.AnimatedContentTransitionScope
import androidx.compose.animation.EnterTransition
import androidx.compose.animation.ExitTransition
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.runtime.Composable
import androidx.navigation.NavBackStackEntry
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.hiosdra.openanchor.ui.advisor.AdvisorScreen
import com.hiosdra.openanchor.ui.client.ClientDashboardScreen
import com.hiosdra.openanchor.ui.client.ScanQRCodeScreen
import com.hiosdra.openanchor.ui.crewwatch.CrewWatchScreen
import com.hiosdra.openanchor.ui.history.HistoryScreen
import com.hiosdra.openanchor.ui.historydetail.HistoryDetailScreen
import com.hiosdra.openanchor.ui.home.HomeScreen
import com.hiosdra.openanchor.ui.logbook.LogbookScreen
import com.hiosdra.openanchor.ui.monitor.MonitorScreen
import com.hiosdra.openanchor.ui.paired.PairedDashboardScreen
import com.hiosdra.openanchor.ui.pairing.QRCodeScreen
import com.hiosdra.openanchor.ui.permissions.PermissionOnboardingScreen
import com.hiosdra.openanchor.ui.settings.SettingsScreen
import com.hiosdra.openanchor.ui.setup.SetupScreen
import com.hiosdra.openanchor.ui.statistics.StatisticsScreen
import com.hiosdra.openanchor.ui.weather.WeatherScreen

private const val STANDARD_DURATION = 300
private const val SHEET_DURATION = 350
private const val MONITOR_DURATION = 400
private val NAV_EASING = FastOutSlowInEasing
private const val HORIZONTAL_OFFSET_DIVISOR = 4
private const val VERTICAL_OFFSET_DIVISOR = 3

private val sheetScreenRoutes = setOf(Screen.Setup.route, Screen.Monitor.route)

private fun NavBackStackEntry.isSheetScreen(): Boolean =
    destination.route in sheetScreenRoutes

private fun standardFade(duration: Int = STANDARD_DURATION): EnterTransition =
    fadeIn(tween(duration))

private fun standardFadeOut(duration: Int = STANDARD_DURATION): ExitTransition =
    fadeOut(tween(duration))

@Composable
fun OpenAnchorNavHost(
    navController: NavHostController,
    startDestination: String = Screen.Home.route
) {
    NavHost(
        navController = navController,
        startDestination = startDestination,
        enterTransition = {
            fadeIn(tween(STANDARD_DURATION, easing = NAV_EASING)) +
                slideIntoContainer(
                    towards = AnimatedContentTransitionScope.SlideDirection.Start,
                    animationSpec = tween(STANDARD_DURATION, easing = NAV_EASING),
                    initialOffset = { it / HORIZONTAL_OFFSET_DIVISOR }
                )
        },
        exitTransition = {
            fadeOut(tween(STANDARD_DURATION, easing = NAV_EASING)) +
                slideOutOfContainer(
                    towards = AnimatedContentTransitionScope.SlideDirection.Start,
                    animationSpec = tween(STANDARD_DURATION, easing = NAV_EASING),
                    targetOffset = { it / HORIZONTAL_OFFSET_DIVISOR }
                )
        },
        popEnterTransition = {
            fadeIn(tween(STANDARD_DURATION, easing = NAV_EASING)) +
                slideIntoContainer(
                    towards = AnimatedContentTransitionScope.SlideDirection.End,
                    animationSpec = tween(STANDARD_DURATION, easing = NAV_EASING),
                    initialOffset = { it / HORIZONTAL_OFFSET_DIVISOR }
                )
        },
        popExitTransition = {
            fadeOut(tween(STANDARD_DURATION, easing = NAV_EASING)) +
                slideOutOfContainer(
                    towards = AnimatedContentTransitionScope.SlideDirection.End,
                    animationSpec = tween(STANDARD_DURATION, easing = NAV_EASING),
                    targetOffset = { it / HORIZONTAL_OFFSET_DIVISOR }
                )
        }
    ) {
        composable(Screen.PermissionOnboarding.route) {
            PermissionOnboardingScreen(
                onComplete = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.PermissionOnboarding.route) { inclusive = true }
                    }
                }
            )
        }

        composable(
            route = Screen.Home.route,
            enterTransition = { standardFade() },
            exitTransition = { standardFadeOut() },
            popEnterTransition = { standardFade() },
            popExitTransition = { standardFadeOut() }
        ) {
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

        composable(
            route = Screen.Setup.route,
            enterTransition = {
                fadeIn(tween(SHEET_DURATION)) + slideIntoContainer(
                    towards = AnimatedContentTransitionScope.SlideDirection.Up,
                    animationSpec = tween(SHEET_DURATION, easing = NAV_EASING),
                    initialOffset = { it / VERTICAL_OFFSET_DIVISOR }
                )
            },
            exitTransition = { standardFadeOut(SHEET_DURATION) },
            popEnterTransition = { standardFade(SHEET_DURATION) },
            popExitTransition = {
                fadeOut(tween(SHEET_DURATION)) + slideOutOfContainer(
                    towards = AnimatedContentTransitionScope.SlideDirection.Down,
                    animationSpec = tween(SHEET_DURATION, easing = NAV_EASING),
                    targetOffset = { it / VERTICAL_OFFSET_DIVISOR }
                )
            }
        ) {
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
            arguments = listOf(navArgument("sessionId") { type = NavType.LongType }),
            enterTransition = {
                if (initialState.isSheetScreen()) {
                    fadeIn(tween(MONITOR_DURATION)) + slideIntoContainer(
                        towards = AnimatedContentTransitionScope.SlideDirection.Up,
                        animationSpec = tween(MONITOR_DURATION, easing = NAV_EASING),
                        initialOffset = { it / VERTICAL_OFFSET_DIVISOR }
                    )
                } else {
                    fadeIn(tween(STANDARD_DURATION, easing = NAV_EASING)) + slideIntoContainer(
                        towards = AnimatedContentTransitionScope.SlideDirection.Start,
                        animationSpec = tween(STANDARD_DURATION, easing = NAV_EASING),
                        initialOffset = { it / HORIZONTAL_OFFSET_DIVISOR }
                    )
                }
            },
            exitTransition = {
                if (targetState.isSheetScreen()) {
                    fadeOut(tween(MONITOR_DURATION)) + slideOutOfContainer(
                        towards = AnimatedContentTransitionScope.SlideDirection.Down,
                        animationSpec = tween(MONITOR_DURATION, easing = NAV_EASING),
                        targetOffset = { it / VERTICAL_OFFSET_DIVISOR }
                    )
                } else {
                    fadeOut(tween(STANDARD_DURATION, easing = NAV_EASING)) + slideOutOfContainer(
                        towards = AnimatedContentTransitionScope.SlideDirection.Start,
                        animationSpec = tween(STANDARD_DURATION, easing = NAV_EASING),
                        targetOffset = { it / HORIZONTAL_OFFSET_DIVISOR }
                    )
                }
            },
            popEnterTransition = {
                if (initialState.isSheetScreen()) {
                    fadeIn(tween(MONITOR_DURATION)) + slideIntoContainer(
                        towards = AnimatedContentTransitionScope.SlideDirection.Up,
                        animationSpec = tween(MONITOR_DURATION, easing = NAV_EASING),
                        initialOffset = { it / VERTICAL_OFFSET_DIVISOR }
                    )
                } else {
                    fadeIn(tween(STANDARD_DURATION, easing = NAV_EASING)) + slideIntoContainer(
                        towards = AnimatedContentTransitionScope.SlideDirection.End,
                        animationSpec = tween(STANDARD_DURATION, easing = NAV_EASING),
                        initialOffset = { it / HORIZONTAL_OFFSET_DIVISOR }
                    )
                }
            },
            popExitTransition = {
                if (targetState.isSheetScreen()) {
                    fadeOut(tween(MONITOR_DURATION)) + slideOutOfContainer(
                        towards = AnimatedContentTransitionScope.SlideDirection.Down,
                        animationSpec = tween(MONITOR_DURATION, easing = NAV_EASING),
                        targetOffset = { it / VERTICAL_OFFSET_DIVISOR }
                    )
                } else {
                    fadeOut(tween(STANDARD_DURATION, easing = NAV_EASING)) + slideOutOfContainer(
                        towards = AnimatedContentTransitionScope.SlideDirection.End,
                        animationSpec = tween(STANDARD_DURATION, easing = NAV_EASING),
                        targetOffset = { it / HORIZONTAL_OFFSET_DIVISOR }
                    )
                }
            }
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

    }
}
