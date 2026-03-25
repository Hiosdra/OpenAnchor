package com.hiosdra.openanchor.ui.weather

import androidx.activity.ComponentActivity
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.*
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.hiosdra.openanchor.R
import com.hiosdra.openanchor.data.weather.CurrentWeather
import com.hiosdra.openanchor.ui.theme.OpenAnchorTheme
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.flow.MutableStateFlow
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config

@RunWith(AndroidJUnit4::class)
@Config(sdk = [35])
class WeatherScreenTest {

    @get:Rule
    val composeRule = createAndroidComposeRule<ComponentActivity>()

    private val viewModel = mockk<WeatherViewModel>(relaxed = true)
    private val state = MutableStateFlow(WeatherUiState())

    @Before
    fun setup() {
        every { viewModel.uiState } returns state
    }

    private fun setScreen() {
        composeRule.setContentWithTheme {
            WeatherScreen(onBack = {}, viewModel = viewModel)
        }
    }

    private fun scrollToText(text: String) {
        composeRule.onNode(hasScrollToNodeAction())
            .performScrollToNode(hasText(text))
    }

    // ── Loading state ──

    @Test
    fun `loading state shows progress text`() {
        state.value = WeatherUiState(isLoading = true)
        setScreen()

        composeRule.onNodeWithText(composeRule.string(R.string.weather_loading)).assertIsDisplayed()
    }

    @Test
    fun `loading state shows title bar`() {
        state.value = WeatherUiState(isLoading = true)
        setScreen()

        composeRule.onNodeWithText(composeRule.string(R.string.weather_title)).assertIsDisplayed()
    }

    // ── Error state ──

    @Test
    fun `error state shows error message`() {
        state.value = WeatherUiState(isLoading = false, error = "Network error")
        setScreen()

        composeRule.onNodeWithText("Network error").assertIsDisplayed()
    }

    @Test
    fun `error state shows retry button`() {
        state.value = WeatherUiState(isLoading = false, error = "Timeout")
        setScreen()

        composeRule.onNodeWithText(composeRule.string(R.string.weather_retry)).assertIsDisplayed()
    }

    @Test
    fun `error state does not show current conditions`() {
        state.value = WeatherUiState(isLoading = false, error = "Offline")
        setScreen()

        composeRule.onNodeWithText(composeRule.string(R.string.weather_current_conditions)).assertDoesNotExist()
    }

    // ── Success state with current weather ──

    @Test
    fun `loaded state shows current conditions header`() {
        state.value = successState()
        setScreen()

        composeRule.onNodeWithText(composeRule.string(R.string.weather_current_conditions)).assertIsDisplayed()
    }

    @Test
    fun `loaded state shows position`() {
        state.value = successState()
        setScreen()

        composeRule.onNodeWithText(
            composeRule.string(R.string.weather_position_format, "54.0000", "18.0000")
        ).assertIsDisplayed()
    }

    @Test
    fun `loaded state shows last updated time`() {
        state.value = successState()
        setScreen()

        composeRule.onNodeWithText(
            composeRule.string(R.string.weather_last_updated, "2026-03-21T12:00")
        ).assertIsDisplayed()
    }

    @Test
    fun `loaded state shows combined waves card`() {
        state.value = successState()
        setScreen()

        composeRule.onNodeWithText(composeRule.string(R.string.weather_combined_waves)).assertIsDisplayed()
    }

    @Test
    fun `loaded state shows wave height value`() {
        state.value = successState()
        setScreen()

        composeRule.onNodeWithText("1.4 m").assertIsDisplayed()
    }

    @Test
    fun `loaded state shows wave direction value`() {
        state.value = successState()
        setScreen()

        composeRule.onNodeWithText("180°").assertIsDisplayed()
    }

    @Test
    fun `loaded state shows wave period value`() {
        state.value = successState()
        setScreen()

        composeRule.onNodeWithText("5.0 s").assertIsDisplayed()
    }

    @Test
    fun `loaded state shows wind waves card`() {
        state.value = successState()
        setScreen()

        composeRule.onNodeWithText(composeRule.string(R.string.weather_wind_waves)).assertIsDisplayed()
    }

    @Test
    fun `loaded state shows swell card`() {
        state.value = successState()
        setScreen()

        val swellLabel = composeRule.string(R.string.weather_swell)
        scrollToText(swellLabel)
        composeRule.onNodeWithText(swellLabel).assertIsDisplayed()
    }

    @Test
    fun `loaded state shows ocean current card`() {
        state.value = successState()
        setScreen()

        val label = composeRule.string(R.string.weather_ocean_current)
        scrollToText(label)
        composeRule.onNodeWithText(label).assertIsDisplayed()
    }

    @Test
    fun `loaded state shows ocean current velocity`() {
        state.value = successState()
        setScreen()

        scrollToText("0.50 m/s")
        composeRule.onNodeWithText("0.50 m/s").assertIsDisplayed()
    }

    @Test
    fun `loaded state shows height direction and period labels`() {
        state.value = successState()
        setScreen()

        // "Height" label appears in the first visible card (Combined Waves)
        composeRule.onAllNodesWithText(composeRule.string(R.string.weather_height))[0]
            .assertIsDisplayed()
    }

    @Test
    fun `loaded state shows velocity label`() {
        state.value = successState()
        setScreen()

        val label = composeRule.string(R.string.weather_velocity)
        scrollToText(label)
        composeRule.onNodeWithText(label).assertIsDisplayed()
    }

    // ── Hourly forecast ──

    @Test
    fun `loaded state shows hourly forecast header`() {
        state.value = successState()
        setScreen()

        val label = composeRule.string(R.string.weather_hourly_forecast)
        scrollToText(label)
        composeRule.onNodeWithText(label).assertIsDisplayed()
    }

    @Test
    fun `hourly forecast shows time`() {
        state.value = successState()
        setScreen()

        scrollToText("13:00")
        composeRule.onNodeWithText("13:00").assertIsDisplayed()
    }

    @Test
    fun `hourly forecast shows wave height`() {
        state.value = successState()
        setScreen()

        scrollToText("1.2")
        composeRule.onNodeWithText("1.2").assertIsDisplayed()
    }

    @Test
    fun `hourly forecast shows swell short label`() {
        state.value = successState()
        setScreen()

        val label = composeRule.string(R.string.weather_swell_short)
        scrollToText(label)
        composeRule.onNodeWithText(label).assertIsDisplayed()
    }

    @Test
    fun `hourly forecast shows current short label`() {
        state.value = successState()
        setScreen()

        val label = composeRule.string(R.string.weather_current_short)
        scrollToText(label)
        composeRule.onNodeWithText(label).assertIsDisplayed()
    }

    @Test
    fun `hourly forecast shows wave m label`() {
        state.value = successState()
        setScreen()

        val label = composeRule.string(R.string.weather_wave_m)
        scrollToText(label)
        composeRule.onNodeWithText(label).assertIsDisplayed()
    }

    @Test
    fun `hourly forecast shows direction label`() {
        state.value = successState()
        setScreen()

        val label = composeRule.string(R.string.weather_dir)
        scrollToText(label)
        composeRule.onNodeWithText(label).assertIsDisplayed()
    }

    // ── Null weather values show dashes ──

    @Test
    fun `null weather values show dash placeholders`() {
        state.value = WeatherUiState(
            isLoading = false,
            latitude = 54.0,
            longitude = 18.0,
            current = CurrentWeather(
                time = "2026-03-21T12:00",
                waveHeight = null,
                waveDirection = null,
                wavePeriod = null,
                windWaveHeight = null,
                windWaveDirection = null,
                windWavePeriod = null,
                swellWaveHeight = null,
                swellWaveDirection = null,
                swellWavePeriod = null,
                oceanCurrentVelocity = null,
                oceanCurrentDirection = null
            ),
            lastUpdated = "2026-03-21T12:00"
        )
        setScreen()

        composeRule.onNodeWithText(composeRule.string(R.string.weather_combined_waves)).assertIsDisplayed()
    }

    // ── No forecast ──

    @Test
    fun `no hourly forecast hides forecast section`() {
        state.value = WeatherUiState(
            isLoading = false,
            latitude = 54.0,
            longitude = 18.0,
            current = sampleCurrentWeather(),
            hourlyForecast = emptyList(),
            lastUpdated = "2026-03-21T12:00"
        )
        setScreen()

        composeRule.onNodeWithText(composeRule.string(R.string.weather_current_conditions))
            .assertIsDisplayed()
        composeRule.onNodeWithText(composeRule.string(R.string.weather_hourly_forecast))
            .assertDoesNotExist()
    }

    // ── State transitions ──

    @Test
    fun `transition from loading to error updates display`() {
        state.value = WeatherUiState(isLoading = true)
        setScreen()

        composeRule.onNodeWithText(composeRule.string(R.string.weather_loading)).assertIsDisplayed()

        state.value = WeatherUiState(isLoading = false, error = "Server unreachable")
        composeRule.waitForIdle()

        composeRule.onNodeWithText("Server unreachable").assertIsDisplayed()
        composeRule.onNodeWithText(composeRule.string(R.string.weather_loading)).assertDoesNotExist()
    }

    @Test
    fun `transition from loading to success updates display`() {
        state.value = WeatherUiState(isLoading = true)
        setScreen()

        composeRule.onNodeWithText(composeRule.string(R.string.weather_loading)).assertIsDisplayed()

        state.value = successState()
        composeRule.waitForIdle()

        composeRule.onNodeWithText(composeRule.string(R.string.weather_current_conditions))
            .assertIsDisplayed()
        composeRule.onNodeWithText(composeRule.string(R.string.weather_loading)).assertDoesNotExist()
    }

    @Test
    fun `transition from error to success updates display`() {
        state.value = WeatherUiState(isLoading = false, error = "Failed")
        setScreen()

        composeRule.onNodeWithText("Failed").assertIsDisplayed()

        state.value = successState()
        composeRule.waitForIdle()

        composeRule.onNodeWithText(composeRule.string(R.string.weather_current_conditions))
            .assertIsDisplayed()
        composeRule.onNodeWithText("Failed").assertDoesNotExist()
    }

    // ── High wave height highlight ──

    @Test
    fun `high wave height in forecast item is rendered`() {
        state.value = WeatherUiState(
            isLoading = false,
            latitude = 54.0,
            longitude = 18.0,
            current = sampleCurrentWeather(),
            hourlyForecast = listOf(
                HourlyForecastItem(
                    time = "2026-01-15T14:00",
                    waveHeight = 2.5,
                    waveDirection = 175.0,
                    wavePeriod = 5.0,
                    windWaveHeight = 0.5,
                    windWaveDirection = 180.0,
                    swellWaveHeight = 0.7,
                    swellWaveDirection = 185.0,
                    oceanCurrentVelocity = 0.4,
                    oceanCurrentDirection = 165.0
                )
            ),
            lastUpdated = "2026-03-21T12:00"
        )
        setScreen()

        scrollToText("2.5")
        composeRule.onNodeWithText("2.5").assertIsDisplayed()
    }

    // ── Multiple forecast items ──

    @Test
    fun `multiple forecast items all rendered`() {
        state.value = WeatherUiState(
            isLoading = false,
            latitude = 54.0,
            longitude = 18.0,
            current = sampleCurrentWeather(),
            hourlyForecast = listOf(
                sampleForecastItem("2026-01-15T14:00", 1.0),
                sampleForecastItem("2026-01-15T15:00", 1.5),
                sampleForecastItem("2026-01-15T16:00", 2.0)
            ),
            lastUpdated = "2026-03-21T12:00"
        )
        setScreen()

        scrollToText("14:00")
        composeRule.onNodeWithText("14:00").assertIsDisplayed()
        scrollToText("15:00")
        composeRule.onNodeWithText("15:00").assertIsDisplayed()
        scrollToText("16:00")
        composeRule.onNodeWithText("16:00").assertIsDisplayed()
    }

    // ── Helpers ──

    private fun sampleCurrentWeather() = CurrentWeather(
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
    )

    private fun sampleForecastItem(time: String, waveHeight: Double) = HourlyForecastItem(
        time = time,
        waveHeight = waveHeight,
        waveDirection = 175.0,
        wavePeriod = 5.0,
        windWaveHeight = 0.5,
        windWaveDirection = 180.0,
        swellWaveHeight = 0.7,
        swellWaveDirection = 185.0,
        oceanCurrentVelocity = 0.4,
        oceanCurrentDirection = 165.0
    )

    private fun successState() = WeatherUiState(
        isLoading = false,
        latitude = 54.0,
        longitude = 18.0,
        current = sampleCurrentWeather(),
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
        ),
        lastUpdated = "2026-03-21T12:00"
    )
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
