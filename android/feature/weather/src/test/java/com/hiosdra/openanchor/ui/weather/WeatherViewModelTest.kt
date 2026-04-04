package com.hiosdra.openanchor.ui.weather

import androidx.arch.core.executor.testing.InstantTaskExecutorRule
import androidx.lifecycle.SavedStateHandle
import app.cash.turbine.test
import com.hiosdra.openanchor.data.weather.*
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class WeatherViewModelTest {

    @get:Rule
    val instantExecutorRule = InstantTaskExecutorRule()

    private lateinit var weatherRepository: WeatherRepository
    private lateinit var viewModel: WeatherViewModel

    @Before
    fun setup() {
        weatherRepository = mockk(relaxed = true)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun createViewModel(lat: Float = 54.35f, lng: Float = 18.65f): WeatherViewModel {
        val savedStateHandle = SavedStateHandle(mapOf("latitude" to lat, "longitude" to lng))
        return WeatherViewModel(savedStateHandle, weatherRepository)
    }

    @Test
    fun `initial state sets coordinates from saved state`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        coEvery { weatherRepository.getMarineWeather(any(), any(), any()) } returns
                Result.success(createTestResponse())
        viewModel = createViewModel(54.35f, 18.65f)

        viewModel.uiState.test {
            val state = awaitItem()
            assertEquals(54.35, state.latitude, 0.01)
            assertEquals(18.65, state.longitude, 0.01)
            cancel()
        }
    }

    @Test
    fun `fetchWeather with zero coordinates shows error`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        viewModel = createViewModel(0f, 0f)
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertFalse(state.isLoading)
            assertNotNull(state.error)
            cancel()
        }
    }

    @Test
    fun `fetchWeather success updates state with current weather`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val response = createTestResponse(
            current = CurrentWeather(
                time = "2024-01-01T12:00",
                waveHeight = 1.5,
                waveDirection = 180.0,
                wavePeriod = 6.0,
                windWaveHeight = 1.0,
                windWaveDirection = 200.0,
                windWavePeriod = 4.0,
                swellWaveHeight = 0.5,
                swellWaveDirection = 270.0,
                swellWavePeriod = 8.0,
                oceanCurrentVelocity = 0.3,
                oceanCurrentDirection = 90.0
            )
        )
        coEvery { weatherRepository.getMarineWeather(any(), any(), any()) } returns Result.success(response)
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertFalse(state.isLoading)
            assertNull(state.error)
            assertNotNull(state.current)
            assertEquals(1.5, state.current!!.waveHeight!!, 0.01)
            assertEquals("2024-01-01T12:00", state.lastUpdated)
            cancel()
        }
    }

    @Test
    fun `fetchWeather success parses hourly forecast`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val response = createTestResponse(
            hourly = HourlyWeather(
                time = listOf("2024-01-01T12:00", "2024-01-01T13:00"),
                waveHeight = listOf(1.5, 2.0),
                waveDirection = listOf(180.0, 190.0),
                wavePeriod = listOf(6.0, 7.0),
                windWaveHeight = listOf(1.0, 1.2),
                windWaveDirection = listOf(200.0, 210.0),
                swellWaveHeight = listOf(0.5, 0.6),
                swellWaveDirection = listOf(270.0, 280.0),
                oceanCurrentVelocity = listOf(0.3, 0.4),
                oceanCurrentDirection = listOf(90.0, 100.0)
            )
        )
        coEvery { weatherRepository.getMarineWeather(any(), any(), any()) } returns Result.success(response)
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertEquals(2, state.hourlyForecast.size)
            assertEquals("2024-01-01T12:00", state.hourlyForecast[0].time)
            assertEquals(1.5, state.hourlyForecast[0].waveHeight!!, 0.01)
            assertEquals(2.0, state.hourlyForecast[1].waveHeight!!, 0.01)
            cancel()
        }
    }

    @Test
    fun `fetchWeather failure sets error message`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        coEvery { weatherRepository.getMarineWeather(any(), any(), any()) } returns
                Result.failure(Exception("Network error"))
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertFalse(state.isLoading)
            assertEquals("Network error", state.error)
            cancel()
        }
    }

    @Test
    fun `fetchWeather with null hourly returns empty forecast`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val response = createTestResponse(hourly = null)
        coEvery { weatherRepository.getMarineWeather(any(), any(), any()) } returns Result.success(response)
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.uiState.test {
            val state = awaitItem()
            assertTrue(state.hourlyForecast.isEmpty())
            cancel()
        }
    }

    @Test
    fun `fetchWeather with null times returns empty forecast`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val response = createTestResponse(
            hourly = HourlyWeather(
                time = null, waveHeight = null, waveDirection = null,
                wavePeriod = null, windWaveHeight = null, windWaveDirection = null,
                swellWaveHeight = null, swellWaveDirection = null,
                oceanCurrentVelocity = null, oceanCurrentDirection = null
            )
        )
        coEvery { weatherRepository.getMarineWeather(any(), any(), any()) } returns Result.success(response)
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.uiState.test {
            assertTrue(awaitItem().hourlyForecast.isEmpty())
            cancel()
        }
    }

    private fun createTestResponse(
        current: CurrentWeather? = null,
        hourly: HourlyWeather? = null
    ) = MarineWeatherResponse(
        latitude = 54.35,
        longitude = 18.65,
        generationTimeMs = 1.0,
        utcOffsetSeconds = 0,
        current = current,
        currentUnits = null,
        hourly = hourly,
        hourlyUnits = null
    )
}
