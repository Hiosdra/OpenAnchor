package com.hiosdra.openanchor.ui

import androidx.activity.ComponentActivity
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performScrollTo
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.hiosdra.openanchor.R
import com.hiosdra.openanchor.domain.model.AlarmState
import com.hiosdra.openanchor.ui.advisor.AdvisorScreen
import com.hiosdra.openanchor.ui.advisor.AdvisorUiState
import com.hiosdra.openanchor.ui.advisor.AdvisorViewModel
import com.hiosdra.openanchor.ui.advisor.ChatMessage
import com.hiosdra.openanchor.ui.client.ClientDashboardScreen
import com.hiosdra.openanchor.ui.client.ClientDashboardUiState
import com.hiosdra.openanchor.ui.client.ClientDashboardViewModel
import com.hiosdra.openanchor.ui.client.ScanQRCodeScreen
import com.hiosdra.openanchor.ui.client.ScanQRCodeUiState
import com.hiosdra.openanchor.ui.client.ScanQRCodeViewModel
import com.hiosdra.openanchor.ui.client.ScanStep
import com.hiosdra.openanchor.ui.crewwatch.CrewWatchScreen
import com.hiosdra.openanchor.ui.crewwatch.CrewWatchUiState
import com.hiosdra.openanchor.ui.crewwatch.CrewWatchViewModel
import com.hiosdra.openanchor.ui.history.HistoryScreen
import com.hiosdra.openanchor.ui.history.HistoryViewModel
import com.hiosdra.openanchor.ui.home.HomeScreen
import com.hiosdra.openanchor.ui.home.HomeViewModel
import com.hiosdra.openanchor.ui.logbook.LogbookScreen
import com.hiosdra.openanchor.ui.logbook.LogbookUiState
import com.hiosdra.openanchor.ui.logbook.LogbookViewModel
import com.hiosdra.openanchor.ui.monitor.MonitorScreen
import com.hiosdra.openanchor.ui.monitor.MonitorUiState
import com.hiosdra.openanchor.ui.monitor.MonitorViewMode
import com.hiosdra.openanchor.ui.monitor.MonitorViewModel
import com.hiosdra.openanchor.ui.paired.PairedDashboardScreen
import com.hiosdra.openanchor.ui.paired.PairedDashboardUiState
import com.hiosdra.openanchor.ui.paired.PairedDashboardViewModel
import com.hiosdra.openanchor.ui.pairing.PairingStep
import com.hiosdra.openanchor.ui.pairing.QRCodeScreen
import com.hiosdra.openanchor.ui.pairing.QRCodeUiState
import com.hiosdra.openanchor.ui.pairing.QRCodeViewModel
import com.hiosdra.openanchor.ui.settings.SettingsScreen
import com.hiosdra.openanchor.ui.settings.SettingsViewModel
import com.hiosdra.openanchor.ui.setup.ScopeRatio
import com.hiosdra.openanchor.ui.setup.SetupScreen
import com.hiosdra.openanchor.ui.setup.SetupState
import com.hiosdra.openanchor.ui.setup.SetupStep
import com.hiosdra.openanchor.ui.setup.SetupViewModel
import com.hiosdra.openanchor.ui.theme.OpenAnchorTheme
import com.hiosdra.openanchor.ui.weather.HourlyForecastItem
import com.hiosdra.openanchor.ui.weather.WeatherScreen
import com.hiosdra.openanchor.ui.weather.WeatherUiState
import com.hiosdra.openanchor.ui.weather.WeatherViewModel
import com.hiosdra.openanchor.ui.statistics.StatisticsScreen
import com.hiosdra.openanchor.ui.statistics.StatisticsUiState
import com.hiosdra.openanchor.ui.statistics.StatisticsViewModel
import com.hiosdra.openanchor.data.preferences.UserPreferences
import com.hiosdra.openanchor.domain.model.ThemeMode
import com.hiosdra.openanchor.domain.model.DepthUnit
import com.hiosdra.openanchor.domain.model.DistanceUnit
import com.hiosdra.openanchor.domain.model.LogbookEntry
import com.hiosdra.openanchor.domain.model.ZoneType
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.flow.MutableStateFlow
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config

@RunWith(AndroidJUnit4::class)
@Config(sdk = [35])
class UiScreenSmokeTest {

    @get:Rule
    val composeRule = createAndroidComposeRule<ComponentActivity>()

    @Test
    fun homeScreen_rendersResumeAndNavigationActions() {
        val viewModel = mockk<HomeViewModel>(relaxed = true)
        every { viewModel.activeSession } returns MutableStateFlow(sampleSession())
        every { viewModel.isClientModeActive } returns MutableStateFlow(true)

        composeRule.setContentWithTheme {
            HomeScreen(
                onStartSetup = {},
                onOpenHistory = {},
                onOpenSettings = {},
                onOpenStatistics = {},
                onPairWithTablet = {},
                onConnectToServer = {},
                onOpenCrewWatch = {},
                onOpenAdvisor = {},
                onOpenLogbook = {},
                onOpenExamQuiz = {},
                onResumeMonitoring = {},
                onResumeClientMode = {},
                viewModel = viewModel
            )
        }

        composeRule.onNodeWithText(composeRule.string(R.string.resume_monitoring)).assertIsDisplayed()
        composeRule.onNodeWithText(composeRule.string(R.string.resume_client_mode)).assertIsDisplayed()
    }

    @Test
    fun historyScreen_rendersSessionList() {
        val populatedViewModel = mockk<HistoryViewModel>(relaxed = true)
        every { populatedViewModel.sessions } returns MutableStateFlow(listOf(sampleSession(alarmTriggered = true)))
        every { populatedViewModel.searchQuery } returns MutableStateFlow("")
        every { populatedViewModel.deleteError } returns MutableStateFlow(false)

        composeRule.setContentWithTheme {
            HistoryScreen(
                onSessionClick = {},
                onBack = {},
                viewModel = populatedViewModel
            )
        }

        composeRule.onNodeWithText(composeRule.string(R.string.history)).assertIsDisplayed()
        composeRule.onNodeWithText("54.000000, 18.000000").assertIsDisplayed()
    }

    @Test
    fun historyScreen_rendersEmptyState() {
        val emptyViewModel = mockk<HistoryViewModel>(relaxed = true)
        every { emptyViewModel.sessions } returns MutableStateFlow(emptyList())
        every { emptyViewModel.searchQuery } returns MutableStateFlow("")
        every { emptyViewModel.deleteError } returns MutableStateFlow(false)

        composeRule.setContentWithTheme {
            HistoryScreen(
                onSessionClick = {},
                onBack = {},
                viewModel = emptyViewModel
            )
        }

        composeRule.onNodeWithText(composeRule.string(R.string.no_history)).assertIsDisplayed()
    }

    @Test
    fun settingsScreen_rendersConfiguredPreferences() {
        val viewModel = mockk<SettingsViewModel>(relaxed = true)
        every { viewModel.preferences } returns MutableStateFlow(
            UserPreferences(
                distanceUnit = DistanceUnit.FEET,
                depthUnit = DepthUnit.METERS,
                language = "pl",
                gpsIntervalSeconds = 7,
                themeMode = ThemeMode.NIGHT_VISION
            )
        )

        composeRule.setContentWithTheme {
            SettingsScreen(onBack = {}, viewModel = viewModel)
        }

        composeRule.onNodeWithText("English").assertIsDisplayed()
        composeRule.onNodeWithText("Polski").assertIsDisplayed()
        composeRule.onNodeWithText(composeRule.string(R.string.distance_unit)).assertIsDisplayed()
    }

    @Test
    fun weatherScreen_rendersLoadingErrorAndSuccessStates() {
        val viewModel = mockk<WeatherViewModel>(relaxed = true)
        val weatherState = MutableStateFlow(WeatherUiState(isLoading = true))
        every { viewModel.uiState } returns weatherState

        composeRule.setContentWithTheme {
            WeatherScreen(onBack = {}, viewModel = viewModel)
        }
        composeRule.onNodeWithText(composeRule.string(R.string.weather_loading)).assertIsDisplayed()

        weatherState.value = WeatherUiState(
            isLoading = false,
            error = "No data",
            latitude = 54.0,
            longitude = 18.0
        )
        composeRule.waitForIdle()
        composeRule.onNodeWithText("No data").assertIsDisplayed()

        weatherState.value = WeatherUiState(
            isLoading = false,
            latitude = 54.0,
            longitude = 18.0,
            lastUpdated = "2026-03-21T12:00",
            current = com.hiosdra.openanchor.data.weather.CurrentWeather(
                time = "2026-03-21T12:00",
                waveHeight = 1.4,
                waveDirection = 180.0,
                wavePeriod = 5.0,
                windWaveHeight = 0.6,
                windWaveDirection = 200.0,
                windWavePeriod = 4.0,
                swellWaveHeight = 0.8,
                swellWaveDirection = 190.0,
                swellWavePeriod = 6.0,
                oceanCurrentVelocity = 0.5,
                oceanCurrentDirection = 170.0
            ),
            hourlyForecast = listOf(
                HourlyForecastItem(
                    time = "13:00",
                    waveHeight = 1.2,
                    waveDirection = 175.0,
                    wavePeriod = 5.0,
                    windWaveHeight = 0.5,
                    windWaveDirection = 180.0,
                    swellWaveHeight = 0.7,
                    swellWaveDirection = 185.0,
                    oceanCurrentVelocity = 0.4,
                    oceanCurrentDirection = 165.0
                )
            )
        )
        composeRule.waitForIdle()
        composeRule.onNodeWithText(composeRule.string(R.string.weather_current_conditions)).assertIsDisplayed()
        composeRule.onNodeWithText(composeRule.string(R.string.weather_last_updated, "2026-03-21T12:00")).assertIsDisplayed()
    }

    @Test
    fun crewWatchScreen_rendersIdleAndRunningStates() {
        val viewModel = mockk<CrewWatchViewModel>(relaxed = true)
        val state = MutableStateFlow(
            CrewWatchUiState(
                crewMembers = listOf("Alice", "Bob")
            )
        )
        every { viewModel.uiState } returns state

        composeRule.setContentWithTheme {
            CrewWatchScreen(onBack = {}, viewModel = viewModel)
        }
        composeRule.onNodeWithText(composeRule.string(R.string.crew_watch_subtitle)).assertIsDisplayed()

        state.value = CrewWatchUiState(
            isRunning = true,
            crewMembers = listOf("Alice", "Bob"),
            currentCrewMember = "Alice",
            nextCrewMember = "Bob",
            remainingMs = 3_600_000L,
            progress = 0.5f,
            showWatchChangeEvent = "Bob"
        )
        composeRule.waitForIdle()
        composeRule.onNodeWithText("Alice").assertIsDisplayed()
        composeRule.onNodeWithText("Watch Change").assertIsDisplayed()
    }

    @Test
    fun advisorScreen_rendersApiKeySetupAndChatStates() {
        val viewModel = mockk<AdvisorViewModel>(relaxed = true)
        val state = MutableStateFlow(AdvisorUiState())
        every { viewModel.uiState } returns state

        composeRule.setContentWithTheme {
            AdvisorScreen(onBack = {}, viewModel = viewModel)
        }
        composeRule.onNodeWithText(composeRule.string(R.string.ai_api_key)).assertIsDisplayed()

        state.value = AdvisorUiState(
            isConfigured = true,
            messages = listOf(
                ChatMessage(text = "How safe is this anchorage?", isUser = true),
                ChatMessage(text = "Conditions look stable.", isUser = false)
            ),
            error = "Low signal"
        )
        composeRule.waitForIdle()
        composeRule.onNodeWithText("How safe is this anchorage?").assertIsDisplayed()
        composeRule.onNodeWithText("Conditions look stable.").assertIsDisplayed()
        composeRule.onNodeWithText("Low signal").assertIsDisplayed()
    }

    @Test
    fun clientDashboardScreen_rendersTelemetryAndWarnings() {
        val viewModel = mockk<ClientDashboardViewModel>(relaxed = true)
        every { viewModel.uiState } returns MutableStateFlow(
            ClientDashboardUiState(
                isConnected = true,
                distanceToAnchor = 42.0,
                alarmState = AlarmState.WARNING,
                gpsAccuracy = 4f,
                sog = 1.4,
                localBatteryLevel = 82,
                localBatteryCharging = true,
                serverGpsReport = sampleServerGpsReport(),
                serverDriftDetected = true
            )
        )

        composeRule.setContentWithTheme {
            ClientDashboardScreen(onDisconnected = {}, viewModel = viewModel)
        }

        composeRule.onNodeWithText("WARNING").assertIsDisplayed()
        composeRule.onNodeWithText(composeRule.string(R.string.dismiss_alarm)).performScrollTo().assertIsDisplayed()
    }

    @Test
    fun pairedDashboardScreen_rendersStatusCardsAndDisconnectDialog() {
        val viewModel = mockk<PairedDashboardViewModel>(relaxed = true)
        every { viewModel.uiState } returns MutableStateFlow(
            PairedDashboardUiState(
                isPaired = true,
                peerConnected = true,
                distanceToAnchor = 28.0,
                alarmState = AlarmState.ALARM,
                gpsAccuracy = 3f,
                batteryLevel = 0.82,
                isCharging = true,
                serverRunning = true,
                showDisconnectDialog = true
            )
        )

        composeRule.setContentWithTheme {
            PairedDashboardScreen(onDisconnected = {}, viewModel = viewModel)
        }

        composeRule.onNodeWithText("ALARM").assertIsDisplayed()
        composeRule.onNodeWithText(composeRule.string(R.string.paired_disconnect_title)).assertIsDisplayed()
        composeRule.onNodeWithText(composeRule.string(R.string.dismiss_alarm)).performScrollTo().assertIsDisplayed()
    }

    @Test
    fun setupScreen_rendersAllWizardStepsWithoutExclusions() {
        val viewModel = mockk<SetupViewModel>(relaxed = true)
        val state = MutableStateFlow(
            SetupState(
                currentStep = SetupStep.DROP_POINT,
                hasLocation = false
            )
        )
        every { viewModel.state } returns state

        composeRule.setContentWithTheme {
            SetupScreen(onSessionCreated = {}, onBack = {}, viewModel = viewModel)
        }
        composeRule.onNodeWithText(composeRule.string(R.string.waiting_for_gps)).assertIsDisplayed()

        state.value = SetupState(currentStep = SetupStep.ZONE_TYPE, zoneType = ZoneType.SECTOR)
        composeRule.waitForIdle()
        composeRule.onNodeWithText(composeRule.string(R.string.choose_zone_type)).assertIsDisplayed()

        state.value = SetupState(
            currentStep = SetupStep.RADIUS,
            zoneType = ZoneType.SECTOR,
            useCalculator = true,
            depthM = "5",
            chainLengthM = "35",
            calculatedRadius = 40.0,
            radiusMeters = "40",
            useBufferZone = true,
            bufferRadiusMeters = "60",
            selectedScopeRatio = ScopeRatio.RATIO_7,
            chainAutoFilled = true
        )
        composeRule.waitForIdle()
        composeRule.onNodeWithText(composeRule.string(R.string.scope_ratio_label)).assertIsDisplayed()

        state.value = SetupState(
            currentStep = SetupStep.SECTOR_CONFIG,
            sectorRadiusMeters = "70",
            sectorHalfAngleDeg = "45",
            sectorBearingDeg = "120"
        )
        composeRule.waitForIdle()
        composeRule.onNodeWithText(composeRule.string(R.string.sector_radius)).assertIsDisplayed()

        state.value = SetupState(
            currentStep = SetupStep.CONFIRM,
            anchorLat = 54.0,
            anchorLng = 18.0,
            zoneType = ZoneType.SECTOR,
            radiusMeters = "40",
            sectorRadiusMeters = "70",
            sectorHalfAngleDeg = "45",
            sectorBearingDeg = "120",
            useBufferZone = true,
            bufferRadiusMeters = "60"
        )
        composeRule.waitForIdle()
        composeRule.onNodeWithText("54.000000, 18.000000").assertIsDisplayed()
    }

    @Test
    fun monitorScreen_rendersSimpleAndMapModes() {
        val viewModel = mockk<MonitorViewModel>(relaxed = true)
        val state = MutableStateFlow(
            MonitorUiState(
                viewMode = MonitorViewMode.SIMPLE,
                alarmState = AlarmState.ALARM,
                distanceToAnchor = 44.0,
                bearingToAnchor = 90.0,
                gpsAccuracyMeters = 25f,
                gpsSignalLost = true,
                localBatteryLevel = 75
            )
        )
        every { viewModel.uiState } returns state

        composeRule.setContentWithTheme {
            MonitorScreen(
                sessionId = 1L,
                onStopMonitoring = {},
                onOpenWeather = { _, _ -> },
                viewModel = viewModel
            )
        }
        composeRule.onNodeWithText(composeRule.string(R.string.gps_signal_lost)).assertIsDisplayed()
        composeRule.onNodeWithText("44").assertIsDisplayed()

        state.value = MonitorUiState(
            viewMode = MonitorViewMode.MAP,
            alarmState = AlarmState.WARNING,
            distanceToAnchor = 18.0,
            gpsAccuracyMeters = 6f
        )
        composeRule.waitForIdle()
        composeRule.onNodeWithText("WARNING").assertIsDisplayed()
    }

    @Test
    fun logbookScreen_rendersEmptyErrorAndEntryStates() {
        val viewModel = mockk<LogbookViewModel>(relaxed = true)
        val state = MutableStateFlow(
            LogbookUiState(
                sessions = listOf(sampleSession()),
                isAiConfigured = true
            )
        )
        every { viewModel.uiState } returns state

        composeRule.setContentWithTheme {
            LogbookScreen(onBack = {}, viewModel = viewModel)
        }
        composeRule.onNodeWithText(composeRule.string(R.string.logbook_empty)).assertIsDisplayed()
        composeRule.onNodeWithText(composeRule.string(R.string.logbook_generate)).assertIsDisplayed()

        state.value = LogbookUiState(
            entries = listOf(
                LogbookEntry(
                    id = 1L,
                    sessionId = 1L,
                    createdAt = 1_700_000_000_000L,
                    summary = "Quiet anchorage",
                    logEntry = "Anchored for the night.",
                    safetyNote = "Holding well."
                )
            ),
            sessions = listOf(sampleSession()),
            error = "AI offline",
            isAiConfigured = true
        )
        composeRule.waitForIdle()
        composeRule.onNodeWithText("Quiet anchorage").assertIsDisplayed()
        composeRule.onNodeWithText("AI offline").assertIsDisplayed()
    }

    @Test
    fun qrCodeScreen_rendersIdleWaitingAndErrorStates() {
        val viewModel = mockk<QRCodeViewModel>(relaxed = true)
        val state = MutableStateFlow(QRCodeUiState(step = PairingStep.IDLE))
        every { viewModel.uiState } returns state

        composeRule.setContentWithTheme {
            QRCodeScreen(onBack = {}, onPaired = {}, viewModel = viewModel)
        }
        composeRule.onNodeWithText(composeRule.string(R.string.pairing_title)).assertIsDisplayed()

        state.value = QRCodeUiState(
            step = PairingStep.WAITING_FOR_CLIENT,
            hotspotSsid = "BoatNet",
            hotspotPassword = "anchor123",
            wsUrl = "ws://192.168.1.10:8080",
            serverRunning = true
        )
        composeRule.waitForIdle()
        composeRule.onNodeWithText("BoatNet").assertIsDisplayed()

        state.value = QRCodeUiState(
            step = PairingStep.ERROR,
            errorMessage = "No hotspot"
        )
        composeRule.waitForIdle()
        composeRule.onNodeWithText("No hotspot").assertIsDisplayed()
    }

    @Test
    fun scanQrCodeScreen_rendersScannedConnectingErrorAndConnectedStates() {
        val viewModel = mockk<ScanQRCodeViewModel>(relaxed = true)
        val state = MutableStateFlow(
            ScanQRCodeUiState(
                step = ScanStep.SCANNED,
                scannedUrl = "ws://192.168.1.10:8080",
                serverSsid = "BoatNet",
                serverPassword = "anchor123"
            )
        )
        every { viewModel.uiState } returns state

        composeRule.setContentWithTheme {
            ScanQRCodeScreen(onBack = {}, onConnected = {}, viewModel = viewModel)
        }
        composeRule.onNodeWithText(composeRule.string(R.string.client_scanned_title)).assertIsDisplayed()
        composeRule.onNodeWithText("BoatNet").assertIsDisplayed()

        state.value = ScanQRCodeUiState(
            step = ScanStep.CONNECTING,
            scannedUrl = "ws://192.168.1.10:8080",
            isConnecting = true
        )
        composeRule.waitForIdle()
        composeRule.onNodeWithText(composeRule.string(R.string.client_connecting)).assertIsDisplayed()

        state.value = ScanQRCodeUiState(
            step = ScanStep.ERROR,
            errorMessage = "Connection failed"
        )
        composeRule.waitForIdle()
        composeRule.onNodeWithText("Connection failed").assertIsDisplayed()

        state.value = ScanQRCodeUiState(
            step = ScanStep.CONNECTED,
            isConnected = true
        )
        composeRule.waitForIdle()
        composeRule.onNodeWithText(composeRule.string(R.string.client_connected)).assertIsDisplayed()
    }

    @Test
    fun statisticsScreen_rendersLoadingEmptyAndPopulatedStates() {
        val viewModel = mockk<StatisticsViewModel>(relaxed = true)
        val state = MutableStateFlow(StatisticsUiState(isLoading = true))
        every { viewModel.state } returns state

        composeRule.setContentWithTheme {
            StatisticsScreen(onBack = {}, viewModel = viewModel)
        }
        composeRule.onNodeWithText(composeRule.string(R.string.statistics)).assertIsDisplayed()

        state.value = StatisticsUiState(isLoading = false, totalSessions = 0)
        composeRule.waitForIdle()
        composeRule.onNodeWithText(composeRule.string(R.string.no_statistics)).assertIsDisplayed()

        state.value = StatisticsUiState(
            isLoading = false,
            totalSessions = 5,
            totalAlarms = 1,
            totalAnchoredHours = 12.5,
            longestSessionHours = 5.0,
            averageSessionHours = 2.5,
            maxRadiusMeters = 55.0,
            averageRadiusMeters = 40.0
        )
        composeRule.waitForIdle()
        composeRule.onNodeWithText(composeRule.string(R.string.stat_total_sessions)).assertIsDisplayed()
        composeRule.onNodeWithText("5").assertIsDisplayed()
    }
}

private fun <A : ComponentActivity> androidx.compose.ui.test.junit4.AndroidComposeTestRule<*, A>.string(
    resId: Int,
    vararg formatArgs: Any
): String = activity.getString(resId, *formatArgs)

private fun androidx.compose.ui.test.junit4.AndroidComposeTestRule<*, ComponentActivity>.setContentWithTheme(
    content: @androidx.compose.runtime.Composable () -> Unit
) {
    setContent {
        OpenAnchorTheme {
            content()
        }
    }
}
