package com.hiosdra.openanchor.data.weather

import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class WeatherRepositoryTest {

    private lateinit var api: MarineWeatherApi
    private lateinit var repository: WeatherRepository

    @Before
    fun setup() {
        api = mockk()
        repository = WeatherRepository(api)
    }

    @Test
    fun `getMarineWeather fetches from API on first call`() = runTest {
        val response = createResponse()
        coEvery { api.getMarineWeather(any(), any()) } returns response

        val result = repository.getMarineWeather(54.35, 18.65)

        assertTrue(result.isSuccess)
        assertEquals(response, result.getOrNull())
        coVerify(exactly = 1) { api.getMarineWeather(54.35, 18.65) }
    }

    @Test
    fun `getMarineWeather returns cached data on subsequent call with same position`() = runTest {
        val response = createResponse()
        coEvery { api.getMarineWeather(any(), any()) } returns response

        repository.getMarineWeather(54.35, 18.65)
        val result = repository.getMarineWeather(54.35, 18.65)

        assertTrue(result.isSuccess)
        coVerify(exactly = 1) { api.getMarineWeather(any(), any()) }
    }

    @Test
    fun `getMarineWeather fetches fresh data with forceRefresh`() = runTest {
        val response = createResponse()
        coEvery { api.getMarineWeather(any(), any()) } returns response

        repository.getMarineWeather(54.35, 18.65)
        repository.getMarineWeather(54.35, 18.65, forceRefresh = true)

        coVerify(exactly = 2) { api.getMarineWeather(any(), any()) }
    }

    @Test
    fun `getMarineWeather fetches fresh data when position changes significantly`() = runTest {
        val response = createResponse()
        coEvery { api.getMarineWeather(any(), any()) } returns response

        repository.getMarineWeather(54.35, 18.65)
        repository.getMarineWeather(54.36, 18.66) // >0.001 degree change

        coVerify(exactly = 2) { api.getMarineWeather(any(), any()) }
    }

    @Test
    fun `getMarineWeather on API failure returns stale cache`() = runTest {
        val response = createResponse()
        coEvery { api.getMarineWeather(any(), any()) } returns response

        // First call succeeds
        repository.getMarineWeather(54.35, 18.65)

        // Second call fails but position changed
        coEvery { api.getMarineWeather(any(), any()) } throws Exception("Network error")
        val result = repository.getMarineWeather(55.0, 19.0)

        assertTrue(result.isSuccess) // Returns stale cache
    }

    @Test
    fun `getMarineWeather on API failure with no cache returns failure`() = runTest {
        coEvery { api.getMarineWeather(any(), any()) } throws Exception("Network error")

        val result = repository.getMarineWeather(54.35, 18.65)

        assertTrue(result.isFailure)
    }

    @Test
    fun `clearCache removes cached data`() = runTest {
        val response = createResponse()
        coEvery { api.getMarineWeather(any(), any()) } returns response

        repository.getMarineWeather(54.35, 18.65)
        repository.clearCache()
        repository.getMarineWeather(54.35, 18.65)

        coVerify(exactly = 2) { api.getMarineWeather(any(), any()) }
    }

    private fun createResponse() = MarineWeatherResponse(
        latitude = 54.35,
        longitude = 18.65,
        generationTimeMs = 1.0,
        utcOffsetSeconds = 0,
        current = null,
        currentUnits = null,
        hourly = null,
        hourlyUnits = null
    )
}
