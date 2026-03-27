package com.hiosdra.openanchor.data.weather

import com.google.gson.annotations.SerializedName

/**
 * Open-Meteo Marine Weather API response models.
 * API docs: https://open-meteo.com/en/docs/marine-weather-api
 */

data class MarineWeatherResponse(
    val latitude: Double,
    val longitude: Double,
    @SerializedName("generationtime_ms")
    val generationTimeMs: Double?,
    @SerializedName("utc_offset_seconds")
    val utcOffsetSeconds: Int?,
    val current: CurrentWeather?,
    @SerializedName("current_units")
    val currentUnits: CurrentUnits?,
    val hourly: HourlyWeather?,
    @SerializedName("hourly_units")
    val hourlyUnits: HourlyUnits?
)

data class CurrentWeather(
    val time: String?,
    @SerializedName("wave_height")
    val waveHeight: Double?,
    @SerializedName("wave_direction")
    val waveDirection: Double?,
    @SerializedName("wave_period")
    val wavePeriod: Double?,
    @SerializedName("wind_wave_height")
    val windWaveHeight: Double?,
    @SerializedName("wind_wave_direction")
    val windWaveDirection: Double?,
    @SerializedName("wind_wave_period")
    val windWavePeriod: Double?,
    @SerializedName("swell_wave_height")
    val swellWaveHeight: Double?,
    @SerializedName("swell_wave_direction")
    val swellWaveDirection: Double?,
    @SerializedName("swell_wave_period")
    val swellWavePeriod: Double?,
    @SerializedName("ocean_current_velocity")
    val oceanCurrentVelocity: Double?,
    @SerializedName("ocean_current_direction")
    val oceanCurrentDirection: Double?
)

data class CurrentUnits(
    @SerializedName("wave_height")
    val waveHeight: String?,
    @SerializedName("wave_direction")
    val waveDirection: String?,
    @SerializedName("wave_period")
    val wavePeriod: String?,
    @SerializedName("wind_wave_height")
    val windWaveHeight: String?,
    @SerializedName("swell_wave_height")
    val swellWaveHeight: String?,
    @SerializedName("ocean_current_velocity")
    val oceanCurrentVelocity: String?
)

data class HourlyWeather(
    val time: List<String>?,
    @SerializedName("wave_height")
    val waveHeight: List<Double?>?,
    @SerializedName("wave_direction")
    val waveDirection: List<Double?>?,
    @SerializedName("wave_period")
    val wavePeriod: List<Double?>?,
    @SerializedName("wind_wave_height")
    val windWaveHeight: List<Double?>?,
    @SerializedName("wind_wave_direction")
    val windWaveDirection: List<Double?>?,
    @SerializedName("swell_wave_height")
    val swellWaveHeight: List<Double?>?,
    @SerializedName("swell_wave_direction")
    val swellWaveDirection: List<Double?>?,
    @SerializedName("ocean_current_velocity")
    val oceanCurrentVelocity: List<Double?>?,
    @SerializedName("ocean_current_direction")
    val oceanCurrentDirection: List<Double?>?
)

data class HourlyUnits(
    @SerializedName("wave_height")
    val waveHeight: String?,
    @SerializedName("wave_direction")
    val waveDirection: String?,
    @SerializedName("wave_period")
    val wavePeriod: String?
)
