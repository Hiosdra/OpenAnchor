package com.hiosdra.openanchor.data.weather

import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class WeatherRepositoryTest {

    private lateinit var api: MarineWeatherApi
    private lateinit var repository: WeatherRepository

    @Before
    fun setup() {
        api = mockk()
        repository = WeatherRepository(api)
    }

    @Test
    fun `getMarineWeather caches successful responses for unchanged coordinates`() = runTest {
        val response = sampleResponse(time = "2026-03-21T12:00")
        coEvery { api.getMarineWeather(54.0, 18.0) } returns response

        val first = repository.getMarineWeather(54.0, 18.0)
        val second = repository.getMarineWeather(54.0, 18.0)

        assertTrue(first.isSuccess)
        assertTrue(second.isSuccess)
        assertSame(response, first.getOrNull())
        assertSame(response, second.getOrNull())
        coVerify(exactly = 1) { api.getMarineWeather(54.0, 18.0) }
    }

    @Test
    fun `getMarineWeather forceRefresh bypasses cache`() = runTest {
        val firstResponse = sampleResponse(time = "2026-03-21T12:00")
        val refreshedResponse = sampleResponse(time = "2026-03-21T13:00")
        coEvery { api.getMarineWeather(54.0, 18.0) } returnsMany listOf(firstResponse, refreshedResponse)

        val first = repository.getMarineWeather(54.0, 18.0)
        val refreshed = repository.getMarineWeather(54.0, 18.0, forceRefresh = true)

        assertSame(firstResponse, first.getOrNull())
        assertSame(refreshedResponse, refreshed.getOrNull())
        coVerify(exactly = 2) { api.getMarineWeather(54.0, 18.0) }
    }

    @Test
    fun `getMarineWeather returns stale cache when refresh fails`() = runTest {
        val cachedResponse = sampleResponse(time = "2026-03-21T12:00")
        coEvery { api.getMarineWeather(54.0, 18.0) } returns cachedResponse
        coEvery { api.getMarineWeather(55.0, 19.0) } throws IllegalStateException("offline")

        repository.getMarineWeather(54.0, 18.0)
        val fallback = repository.getMarineWeather(55.0, 19.0, forceRefresh = true)

        assertTrue(fallback.isSuccess)
        assertSame(cachedResponse, fallback.getOrNull())
    }

    @Test
    fun `clearCache removes cached response`() = runTest {
        val firstResponse = sampleResponse(time = "2026-03-21T12:00")
        val secondResponse = sampleResponse(time = "2026-03-21T13:00")
        coEvery { api.getMarineWeather(54.0, 18.0) } returnsMany listOf(firstResponse, secondResponse)

        repository.getMarineWeather(54.0, 18.0)
        repository.clearCache()
        val refreshed = repository.getMarineWeather(54.0, 18.0)

        assertSame(secondResponse, refreshed.getOrNull())
        coVerify(exactly = 2) { api.getMarineWeather(54.0, 18.0) }
    }

    private fun sampleResponse(time: String) = MarineWeatherResponse(
        latitude = 54.0,
        longitude = 18.0,
        generationTimeMs = 1.0,
        utcOffsetSeconds = 0,
        current = CurrentWeather(
            time = time,
            waveHeight = 0.8,
            waveDirection = 180.0,
            wavePeriod = 5.5,
            windWaveHeight = 0.4,
            windWaveDirection = 190.0,
            windWavePeriod = 4.0,
            swellWaveHeight = 0.3,
            swellWaveDirection = 200.0,
            swellWavePeriod = 6.0,
            oceanCurrentVelocity = 0.2,
            oceanCurrentDirection = 210.0
        ),
        currentUnits = CurrentUnits(
            waveHeight = "m",
            waveDirection = "°",
            wavePeriod = "s",
            windWaveHeight = "m",
            swellWaveHeight = "m",
            oceanCurrentVelocity = "m/s"
        ),
        hourly = HourlyWeather(
            time = listOf(time),
            waveHeight = listOf(0.8),
            waveDirection = listOf(180.0),
            wavePeriod = listOf(5.5),
            windWaveHeight = listOf(0.4),
            windWaveDirection = listOf(190.0),
            swellWaveHeight = listOf(0.3),
            swellWaveDirection = listOf(200.0),
            oceanCurrentVelocity = listOf(0.2),
            oceanCurrentDirection = listOf(210.0)
        ),
        hourlyUnits = HourlyUnits(
            waveHeight = "m",
            waveDirection = "°",
            wavePeriod = "s"
        )
    )
}
