package com.hiosdra.openanchor.data.weather

import org.junit.Assert.*
import org.junit.Test

class WeatherModelsTest {

    @Test
    fun `MarineWeatherResponse holds all fields`() {
        val response = MarineWeatherResponse(
            latitude = 54.35,
            longitude = 18.65,
            generationTimeMs = 1.5,
            utcOffsetSeconds = 3600,
            current = null,
            currentUnits = null,
            hourly = null,
            hourlyUnits = null
        )
        assertEquals(54.35, response.latitude, 0.001)
        assertEquals(18.65, response.longitude, 0.001)
        assertEquals(1.5, response.generationTimeMs!!, 0.001)
        assertEquals(3600, response.utcOffsetSeconds)
    }

    @Test
    fun `CurrentWeather holds all wave data`() {
        val current = CurrentWeather(
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
        assertEquals("2024-01-01T12:00", current.time)
        assertEquals(1.5, current.waveHeight!!, 0.001)
        assertEquals(180.0, current.waveDirection!!, 0.001)
        assertEquals(6.0, current.wavePeriod!!, 0.001)
        assertEquals(1.0, current.windWaveHeight!!, 0.001)
        assertEquals(0.5, current.swellWaveHeight!!, 0.001)
        assertEquals(0.3, current.oceanCurrentVelocity!!, 0.001)
    }

    @Test
    fun `CurrentWeather with all null values`() {
        val current = CurrentWeather(
            time = null,
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
        )
        assertNull(current.time)
        assertNull(current.waveHeight)
        assertNull(current.waveDirection)
    }

    @Test
    fun `CurrentUnits holds unit strings`() {
        val units = CurrentUnits(
            waveHeight = "m",
            waveDirection = "°",
            wavePeriod = "s",
            windWaveHeight = "m",
            swellWaveHeight = "m",
            oceanCurrentVelocity = "m/s"
        )
        assertEquals("m", units.waveHeight)
        assertEquals("°", units.waveDirection)
        assertEquals("s", units.wavePeriod)
    }

    @Test
    fun `HourlyWeather holds lists of data`() {
        val hourly = HourlyWeather(
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
        assertEquals(2, hourly.time!!.size)
        assertEquals(1.5, hourly.waveHeight!![0]!!, 0.001)
        assertEquals(2.0, hourly.waveHeight!![1]!!, 0.001)
    }

    @Test
    fun `HourlyWeather with null lists`() {
        val hourly = HourlyWeather(
            time = null,
            waveHeight = null,
            waveDirection = null,
            wavePeriod = null,
            windWaveHeight = null,
            windWaveDirection = null,
            swellWaveHeight = null,
            swellWaveDirection = null,
            oceanCurrentVelocity = null,
            oceanCurrentDirection = null
        )
        assertNull(hourly.time)
        assertNull(hourly.waveHeight)
    }

    @Test
    fun `HourlyUnits holds unit strings`() {
        val units = HourlyUnits(
            waveHeight = "m",
            waveDirection = "°",
            wavePeriod = "s"
        )
        assertEquals("m", units.waveHeight)
        assertEquals("°", units.waveDirection)
        assertEquals("s", units.wavePeriod)
    }
}
