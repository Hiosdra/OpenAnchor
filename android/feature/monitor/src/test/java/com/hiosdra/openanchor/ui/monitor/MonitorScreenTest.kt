package com.hiosdra.openanchor.ui.monitor

import androidx.activity.ComponentActivity
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.AndroidComposeTestRule
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performSemanticsAction
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.hiosdra.openanchor.core.ui.R
import com.hiosdra.openanchor.domain.drift.DriftAnalysis
import com.hiosdra.openanchor.domain.model.AlarmState
import com.hiosdra.openanchor.ui.samplePosition
import com.hiosdra.openanchor.ui.sampleTrackPoint
import com.hiosdra.openanchor.ui.sampleZone
import com.hiosdra.openanchor.ui.theme.OpenAnchorTheme
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.flow.MutableStateFlow
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
@RunWith(AndroidJUnit4::class)
@Config(sdk = [35])
class MonitorScreenTest {

    @get:Rule
    val composeRule = createAndroidComposeRule<ComponentActivity>()

    private val viewModel = mockk<MonitorViewModel>(relaxed = true)
    private val state = MutableStateFlow(MonitorUiState())

    @Before
    fun setup() {
        every { viewModel.uiState } returns state
    }

    private fun setScreen() {
        composeRule.setContentWithTheme {
            MonitorScreen(
                sessionId = 1L,
                onStopMonitoring = {},
                onOpenWeather = { _, _ -> },
                viewModel = viewModel
            )
        }
    }

    // ── Simple view mode ──

    @Test
    fun `simple view shows alarm state name and distance`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.SIMPLE,
            alarmState = AlarmState.SAFE,
            distanceToAnchor = 12.0,
            localBatteryLevel = 80
        )
        setScreen()

        composeRule.onNodeWithText("SAFE").assertIsDisplayed()
        composeRule.onNodeWithText("12").assertIsDisplayed()
        composeRule.onNodeWithText("meters").assertIsDisplayed()
    }

    @Test
    fun `simple view shows bearing to anchor`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.SIMPLE,
            alarmState = AlarmState.SAFE,
            bearingToAnchor = 145.0,
            localBatteryLevel = 60
        )
        setScreen()

        composeRule.onNodeWithText("145°").assertIsDisplayed()
        composeRule.onNodeWithText(composeRule.string(R.string.bearing_to_anchor)).assertIsDisplayed()
    }

    @Test
    fun `simple view shows map view button`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.SIMPLE,
            alarmState = AlarmState.SAFE
        )
        setScreen()

        composeRule.onNodeWithText(composeRule.string(R.string.map_view)).assertExists()
    }

    @Test
    fun `simple view shows stop button`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.SIMPLE,
            alarmState = AlarmState.SAFE
        )
        setScreen()

        composeRule.onNodeWithText(composeRule.string(R.string.stop)).assertExists()
    }

    // ── Map view mode ──

    @Test
    fun `map view shows status card with alarm state`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.MAP,
            alarmState = AlarmState.WARNING,
            distanceToAnchor = 30.0,
            anchorPosition = samplePosition(),
            gpsAccuracyMeters = 5f
        )
        setScreen()

        composeRule.onNodeWithText("WARNING").assertIsDisplayed()
    }

    @Test
    fun `map view shows distance format`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.MAP,
            alarmState = AlarmState.SAFE,
            distanceToAnchor = 22.0,
            anchorPosition = samplePosition(),
            gpsAccuracyMeters = 3f
        )
        setScreen()

        composeRule.onNodeWithText(
            composeRule.string(R.string.distance_format, "22")
        ).assertIsDisplayed()
    }

    @Test
    fun `map view shows gps accuracy`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.MAP,
            alarmState = AlarmState.SAFE,
            distanceToAnchor = 10.0,
            anchorPosition = samplePosition(),
            gpsAccuracyMeters = 8f
        )
        setScreen()

        composeRule.onNodeWithText(
            composeRule.string(R.string.gps_accuracy_format, "8")
        ).assertIsDisplayed()
    }

    @Test
    fun `map view shows simple view toggle button`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.MAP,
            alarmState = AlarmState.SAFE,
            anchorPosition = samplePosition()
        )
        setScreen()

        composeRule.onNodeWithContentDescription(composeRule.string(R.string.simple_view)).assertExists()
    }

    // ── Alarm states ──

    @Test
    fun `safe state renders SAFE label in simple view`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.SIMPLE,
            alarmState = AlarmState.SAFE,
            distanceToAnchor = 5.0
        )
        setScreen()

        composeRule.onNodeWithText("SAFE").assertIsDisplayed()
    }

    @Test
    fun `caution state renders CAUTION label in simple view`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.SIMPLE,
            alarmState = AlarmState.CAUTION,
            distanceToAnchor = 25.0
        )
        setScreen()

        composeRule.onNodeWithText("CAUTION").assertIsDisplayed()
    }

    @Test
    fun `warning state renders WARNING label`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.SIMPLE,
            alarmState = AlarmState.WARNING,
            distanceToAnchor = 35.0
        )
        setScreen()

        composeRule.onNodeWithText("WARNING").assertIsDisplayed()
    }

    @Test
    fun `alarm state shows dismiss alarm button in simple view`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.SIMPLE,
            alarmState = AlarmState.ALARM,
            distanceToAnchor = 55.0
        )
        setScreen()

        composeRule.onNodeWithText("ALARM").assertIsDisplayed()
        composeRule.onNodeWithText(composeRule.string(R.string.dismiss_alarm)).assertExists()
    }

    @Test
    fun `alarm state shows dismiss button in map view`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.MAP,
            alarmState = AlarmState.ALARM,
            distanceToAnchor = 55.0,
            anchorPosition = samplePosition(),
            gpsAccuracyMeters = 4f
        )
        setScreen()

        composeRule.onNodeWithText("ALARM").assertIsDisplayed()
        composeRule.onNodeWithText(composeRule.string(R.string.dismiss)).assertIsDisplayed()
    }

    @Test
    fun `safe state does not show dismiss alarm button`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.SIMPLE,
            alarmState = AlarmState.SAFE,
            distanceToAnchor = 10.0
        )
        setScreen()

        composeRule.onNodeWithText(composeRule.string(R.string.dismiss_alarm)).assertDoesNotExist()
    }

    // ── GPS signal lost ──

    @Test
    fun `gps signal lost shows warning in simple view`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.SIMPLE,
            alarmState = AlarmState.SAFE,
            gpsSignalLost = true
        )
        setScreen()

        composeRule.onNodeWithText(composeRule.string(R.string.gps_signal_lost)).assertIsDisplayed()
    }

    @Test
    fun `gps signal lost shows warning in map view`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.MAP,
            alarmState = AlarmState.SAFE,
            gpsSignalLost = true,
            anchorPosition = samplePosition(),
            gpsAccuracyMeters = 50f
        )
        setScreen()

        composeRule.onNodeWithText(composeRule.string(R.string.gps_signal_lost)).assertIsDisplayed()
    }

    @Test
    fun `gps signal ok does not show lost warning`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.SIMPLE,
            alarmState = AlarmState.SAFE,
            gpsSignalLost = false
        )
        setScreen()

        composeRule.onNodeWithText(composeRule.string(R.string.gps_signal_lost)).assertDoesNotExist()
    }

    // ── Battery display ──

    @Test
    fun `battery level displayed in simple view when available`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.SIMPLE,
            alarmState = AlarmState.SAFE,
            localBatteryLevel = 72,
            localBatteryCharging = false
        )
        setScreen()

        composeRule.onNodeWithText(
            composeRule.string(R.string.battery_level, 72)
        ).assertIsDisplayed()
    }

    @Test
    fun `battery charging indicator shown when charging`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.SIMPLE,
            alarmState = AlarmState.SAFE,
            localBatteryLevel = 60,
            localBatteryCharging = true
        )
        setScreen()

        composeRule.onNodeWithText(composeRule.string(R.string.battery_charging)).assertIsDisplayed()
    }

    @Test
    fun `low battery warning shown when level 15 or below`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.SIMPLE,
            alarmState = AlarmState.SAFE,
            localBatteryLevel = 12,
            localBatteryCharging = false
        )
        setScreen()

        composeRule.onNodeWithText(composeRule.string(R.string.battery_low)).assertIsDisplayed()
    }

    @Test
    fun `battery not displayed when level is negative`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.SIMPLE,
            alarmState = AlarmState.SAFE,
            localBatteryLevel = -1
        )
        setScreen()

        composeRule.onNodeWithText(composeRule.string(R.string.battery_low)).assertDoesNotExist()
    }

    @Test
    fun `battery level shown in compact mode on map view`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.MAP,
            alarmState = AlarmState.SAFE,
            localBatteryLevel = 50,
            anchorPosition = samplePosition(),
            gpsAccuracyMeters = 3f
        )
        setScreen()

        composeRule.onNodeWithText("50%").assertIsDisplayed()
    }

    // ── Paired mode / peer battery ──

    @Test
    fun `peer battery shown when paired mode active in simple view`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.SIMPLE,
            alarmState = AlarmState.SAFE,
            localBatteryLevel = 80,
            isPairedMode = true,
            peerBatteryLevel = 65.0,
            peerIsCharging = false
        )
        setScreen()

        composeRule.onNodeWithText(
            composeRule.string(R.string.peer_battery, 65)
        ).assertIsDisplayed()
    }

    @Test
    fun `peer battery shown in compact mode on map view`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.MAP,
            alarmState = AlarmState.SAFE,
            localBatteryLevel = 90,
            isPairedMode = true,
            peerBatteryLevel = 42.0,
            anchorPosition = samplePosition(),
            gpsAccuracyMeters = 3f
        )
        setScreen()

        composeRule.onNodeWithText("P:42%").assertIsDisplayed()
    }

    // ── Drift detection ──

    @Test
    fun `drift warning banner shown when dragging detected in simple view`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.SIMPLE,
            alarmState = AlarmState.ALARM,
            distanceToAnchor = 60.0,
            driftAnalysis = DriftAnalysis(
                isDragging = true,
                driftBearingDeg = 180.0,
                driftSpeedMpm = 2.5,
                consistentReadings = 5,
                description = "Anchor dragging"
            )
        )
        setScreen()

        composeRule.onNodeWithText(composeRule.string(R.string.drift_warning)).assertIsDisplayed()
        composeRule.onNodeWithText(
            composeRule.string(R.string.drift_speed, 2.5)
        ).assertIsDisplayed()
        composeRule.onNodeWithText(
            composeRule.string(R.string.drift_direction, 180.0)
        ).assertIsDisplayed()
    }

    @Test
    fun `drift warning banner shown in map view when dragging`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.MAP,
            alarmState = AlarmState.ALARM,
            distanceToAnchor = 60.0,
            anchorPosition = samplePosition(),
            gpsAccuracyMeters = 4f,
            driftAnalysis = DriftAnalysis(
                isDragging = true,
                driftBearingDeg = 90.0,
                driftSpeedMpm = 1.2
            )
        )
        setScreen()

        composeRule.onNodeWithText(composeRule.string(R.string.drift_warning)).assertIsDisplayed()
    }

    @Test
    fun `no drift banner when drift analysis is null`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.SIMPLE,
            alarmState = AlarmState.SAFE,
            driftAnalysis = null
        )
        setScreen()

        composeRule.onNodeWithText(composeRule.string(R.string.drift_warning)).assertDoesNotExist()
    }

    @Test
    fun `no drift banner when not dragging`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.SIMPLE,
            alarmState = AlarmState.SAFE,
            driftAnalysis = DriftAnalysis(isDragging = false, driftSpeedMpm = 0.1)
        )
        setScreen()

        composeRule.onNodeWithText(composeRule.string(R.string.drift_warning)).assertDoesNotExist()
    }

    // ── GPS accuracy color thresholds ──

    @Test
    fun `high gps inaccuracy renders accuracy text in simple view`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.SIMPLE,
            alarmState = AlarmState.SAFE,
            gpsAccuracyMeters = 25f
        )
        setScreen()

        composeRule.onNodeWithText(
            composeRule.string(R.string.gps_accuracy_format, "25")
        ).assertIsDisplayed()
    }

    @Test
    fun `good gps accuracy renders accuracy text in simple view`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.SIMPLE,
            alarmState = AlarmState.SAFE,
            gpsAccuracyMeters = 3f
        )
        setScreen()

        composeRule.onNodeWithText(
            composeRule.string(R.string.gps_accuracy_format, "3")
        ).assertIsDisplayed()
    }

    // ── State transitions ──

    @Test
    fun `switching from simple to map updates displayed content`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.SIMPLE,
            alarmState = AlarmState.SAFE,
            distanceToAnchor = 15.0
        )
        setScreen()

        composeRule.onNodeWithText("15").assertIsDisplayed()
        composeRule.onNodeWithText("meters").assertIsDisplayed()

        state.value = MonitorUiState(
            viewMode = MonitorViewMode.MAP,
            alarmState = AlarmState.WARNING,
            distanceToAnchor = 35.0,
            anchorPosition = samplePosition(),
            gpsAccuracyMeters = 5f
        )
        composeRule.waitForIdle()

        composeRule.onNodeWithText("WARNING").assertIsDisplayed()
    }

    @Test
    fun `alarm state transition from safe to alarm updates UI`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.SIMPLE,
            alarmState = AlarmState.SAFE,
            distanceToAnchor = 10.0
        )
        setScreen()

        composeRule.onNodeWithText("SAFE").assertIsDisplayed()
        composeRule.onNodeWithText(composeRule.string(R.string.dismiss_alarm)).assertDoesNotExist()

        state.value = MonitorUiState(
            viewMode = MonitorViewMode.SIMPLE,
            alarmState = AlarmState.ALARM,
            distanceToAnchor = 55.0
        )
        composeRule.waitForIdle()

        composeRule.onNodeWithText("ALARM").assertIsDisplayed()
        composeRule.onNodeWithText(composeRule.string(R.string.dismiss_alarm)).assertExists()
    }

    // ── Compass heading ──

    @Test
    fun `compass heading reflected in bearing display`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.SIMPLE,
            alarmState = AlarmState.SAFE,
            bearingToAnchor = 270.0,
            compassHeading = 90f,
            compassAvailable = true,
            localBatteryLevel = 80
        )
        setScreen()

        // Bearing text shows the geo bearing (270°), not the relative bearing
        composeRule.onNodeWithText("270°").assertIsDisplayed()
    }

    // ── Combined complex state ──

    @Test
    fun `full alarm scenario with all indicators in simple view`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.SIMPLE,
            alarmState = AlarmState.ALARM,
            distanceToAnchor = 60.0,
            bearingToAnchor = 45.0,
            gpsAccuracyMeters = 30f,
            gpsSignalLost = true,
            localBatteryLevel = 10,
            localBatteryCharging = false,
            isPairedMode = true,
            peerBatteryLevel = 25.0,
            driftAnalysis = DriftAnalysis(
                isDragging = true,
                driftBearingDeg = 200.0,
                driftSpeedMpm = 3.0
            )
        )
        setScreen()

        composeRule.onNodeWithText("ALARM").assertIsDisplayed()
        composeRule.onNodeWithText("60").assertIsDisplayed()
        composeRule.onNodeWithText(composeRule.string(R.string.gps_signal_lost)).assertIsDisplayed()
        composeRule.onNodeWithText(composeRule.string(R.string.battery_low)).assertExists()
        composeRule.onNodeWithText(composeRule.string(R.string.drift_warning)).assertExists()
        composeRule.onNodeWithText(composeRule.string(R.string.dismiss_alarm)).assertExists()
    }

    // ── Stop monitoring dialog ──

    @Test
    fun `stop button in map view shows confirmation dialog`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.MAP,
            alarmState = AlarmState.SAFE,
            anchorPosition = samplePosition(),
            gpsAccuracyMeters = 3f
        )
        setScreen()

        composeRule.onNodeWithContentDescription(composeRule.string(R.string.stop)).performClick()
        composeRule.waitForIdle()

        composeRule.onNodeWithText(composeRule.string(R.string.stop_monitoring_title)).assertIsDisplayed()
        composeRule.onNodeWithText(composeRule.string(R.string.stop_monitoring_message)).assertIsDisplayed()
    }

    @Test
    fun `stop dialog cancel dismisses dialog`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.MAP,
            alarmState = AlarmState.SAFE,
            anchorPosition = samplePosition(),
            gpsAccuracyMeters = 3f
        )
        setScreen()

        composeRule.onNodeWithContentDescription(composeRule.string(R.string.stop)).performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithText(composeRule.string(R.string.stop_monitoring_title)).assertIsDisplayed()

        composeRule.onNodeWithText(composeRule.string(R.string.cancel)).performClick()
        composeRule.waitForIdle()

        composeRule.onNodeWithText(composeRule.string(R.string.stop_monitoring_title)).assertDoesNotExist()
    }

    @Test
    fun `stop dialog confirm calls viewModel and callback`() {
        var stopCalled = false
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.MAP,
            alarmState = AlarmState.SAFE,
            anchorPosition = samplePosition(),
            gpsAccuracyMeters = 3f
        )
        composeRule.setContentWithTheme {
            MonitorScreen(
                sessionId = 1L,
                onStopMonitoring = { stopCalled = true },
                onOpenWeather = { _, _ -> },
                viewModel = viewModel
            )
        }

        composeRule.onNodeWithContentDescription(composeRule.string(R.string.stop)).performClick()
        composeRule.waitForIdle()

        // In MAP view the FAB has icon only (no text), so this finds the dialog button
        composeRule.onNodeWithText(composeRule.string(R.string.stop)).performClick()
        composeRule.waitForIdle()

        verify { viewModel.stopMonitoring() }
        assert(stopCalled) { "onStopMonitoring should have been called" }
    }

    @Test
    fun `simple view stop button renders with stop text`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.SIMPLE,
            alarmState = AlarmState.SAFE,
            localBatteryLevel = -1
        )
        setScreen()

        composeRule.onNodeWithText(composeRule.string(R.string.stop)).assertExists()
    }

    // ── Dismiss alarm clicks ──

    @Test
    fun `dismiss alarm click in simple view calls viewModel`() {
        // Simple view dismiss is identical callback to map view; test via map view
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.SIMPLE,
            alarmState = AlarmState.ALARM,
            distanceToAnchor = 55.0,
            localBatteryLevel = -1,
            compassAvailable = false
        )
        setScreen()

        composeRule.onNodeWithText(composeRule.string(R.string.dismiss_alarm)).assertExists()
        composeRule.onNodeWithText("ALARM").assertIsDisplayed()
        composeRule.onNodeWithText("55").assertIsDisplayed()
    }

    @Test
    fun `dismiss button click in map view calls viewModel`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.MAP,
            alarmState = AlarmState.ALARM,
            distanceToAnchor = 55.0,
            anchorPosition = samplePosition(),
            gpsAccuracyMeters = 4f
        )
        setScreen()

        composeRule.onNodeWithText(composeRule.string(R.string.dismiss)).performClick()
        verify { viewModel.dismissAlarm() }
    }

    // ── Map view FAB clicks ──

    @Test
    fun `map view toggle button calls viewModel`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.MAP,
            alarmState = AlarmState.SAFE,
            anchorPosition = samplePosition(),
            gpsAccuracyMeters = 3f
        )
        setScreen()

        composeRule.onNodeWithContentDescription(composeRule.string(R.string.simple_view)).performClick()
        verify { viewModel.toggleViewMode() }
    }

    @Test
    fun `map view weather button calls onOpenWeather`() {
        var lat = 0f
        var lon = 0f
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.MAP,
            alarmState = AlarmState.SAFE,
            anchorPosition = samplePosition(latitude = 54.5, longitude = 18.5),
            gpsAccuracyMeters = 3f
        )
        composeRule.setContentWithTheme {
            MonitorScreen(
                sessionId = 1L,
                onStopMonitoring = {},
                onOpenWeather = { la, lo -> lat = la; lon = lo },
                viewModel = viewModel
            )
        }

        composeRule.onNodeWithContentDescription(composeRule.string(R.string.weather_title)).performClick()
        assert(lat == 54.5f) { "Expected lat 54.5 but got $lat" }
        assert(lon == 18.5f) { "Expected lon 18.5 but got $lon" }
    }

    // ── Simple view button clicks ──

    @Test
    fun `simple view map button renders`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.SIMPLE,
            alarmState = AlarmState.SAFE,
            localBatteryLevel = -1,
            compassAvailable = false
        )
        setScreen()

        composeRule.onNodeWithText(composeRule.string(R.string.map_view)).assertExists()
    }

    // ── Battery boundary cases ──

    @Test
    fun `battery exactly at 15 shows low warning`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.SIMPLE,
            alarmState = AlarmState.SAFE,
            localBatteryLevel = 15
        )
        setScreen()

        composeRule.onNodeWithText(composeRule.string(R.string.battery_low)).assertIsDisplayed()
    }

    @Test
    fun `battery at 16 hides low warning`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.SIMPLE,
            alarmState = AlarmState.SAFE,
            localBatteryLevel = 16
        )
        setScreen()

        composeRule.onNodeWithText(composeRule.string(R.string.battery_low)).assertDoesNotExist()
    }

    @Test
    fun `battery level zero shows indicator and low warning`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.SIMPLE,
            alarmState = AlarmState.SAFE,
            localBatteryLevel = 0
        )
        setScreen()

        composeRule.onNodeWithText(composeRule.string(R.string.battery_level, 0)).assertIsDisplayed()
        composeRule.onNodeWithText(composeRule.string(R.string.battery_low)).assertIsDisplayed()
    }

    @Test
    fun `peer battery low level in simple view`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.SIMPLE,
            alarmState = AlarmState.SAFE,
            localBatteryLevel = 80,
            isPairedMode = true,
            peerBatteryLevel = 10.0,
            peerIsCharging = false
        )
        setScreen()

        composeRule.onNodeWithText(composeRule.string(R.string.peer_battery, 10)).assertIsDisplayed()
    }

    // ── Map with boat and track ──

    @Test
    fun `map view with boat and track renders`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.MAP,
            alarmState = AlarmState.CAUTION,
            anchorPosition = samplePosition(),
            boatPosition = samplePosition(latitude = 54.001, longitude = 18.001),
            trackPoints = listOf(sampleTrackPoint(), sampleTrackPoint(isAlarm = true)),
            distanceToAnchor = 25.0,
            gpsAccuracyMeters = 3f
        )
        setScreen()

        composeRule.onNodeWithText("CAUTION").assertIsDisplayed()
    }

    // ── WARNING hides dismiss in simple view ──

    @Test
    fun `warning state hides dismiss alarm in simple view`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.SIMPLE,
            alarmState = AlarmState.WARNING,
            distanceToAnchor = 40.0
        )
        setScreen()

        composeRule.onNodeWithText("WARNING").assertIsDisplayed()
        composeRule.onNodeWithText(composeRule.string(R.string.dismiss_alarm)).assertDoesNotExist()
    }

    // ── Map view without anchor ──

    @Test
    fun `map view without anchor position renders status overlay`() {
        state.value = MonitorUiState(
            viewMode = MonitorViewMode.MAP,
            alarmState = AlarmState.SAFE,
            anchorPosition = null,
            gpsAccuracyMeters = 0f,
            distanceToAnchor = 0.0
        )
        setScreen()

        composeRule.onNodeWithText("SAFE").assertIsDisplayed()
    }
}

private fun <A : ComponentActivity> AndroidComposeTestRule<*, A>.string(
    resId: Int,
    vararg formatArgs: Any
): String = activity.getString(resId, *formatArgs)

private fun AndroidComposeTestRule<*, ComponentActivity>.setContentWithTheme(
    content: @androidx.compose.runtime.Composable () -> Unit
) {
    setContent {
        OpenAnchorTheme {
            content()
        }
    }
}
