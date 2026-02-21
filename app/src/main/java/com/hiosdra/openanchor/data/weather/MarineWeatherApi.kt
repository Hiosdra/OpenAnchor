package com.hiosdra.openanchor.data.weather

import retrofit2.http.GET
import retrofit2.http.Query

/**
 * Retrofit interface for the Open-Meteo Marine Weather API.
 * Base URL: https://marine-api.open-meteo.com/v1/
 * Free, no API key required.
 */
interface MarineWeatherApi {

    @GET("marine")
    suspend fun getMarineWeather(
        @Query("latitude") latitude: Double,
        @Query("longitude") longitude: Double,
        @Query("current") current: String = CURRENT_PARAMS,
        @Query("hourly") hourly: String = HOURLY_PARAMS,
        @Query("forecast_days") forecastDays: Int = 1,
        @Query("cell_selection") cellSelection: String = "sea"
    ): MarineWeatherResponse

    companion object {
        const val BASE_URL = "https://marine-api.open-meteo.com/v1/"

        private const val CURRENT_PARAMS =
            "wave_height,wave_direction,wave_period," +
            "wind_wave_height,wind_wave_direction,wind_wave_period," +
            "swell_wave_height,swell_wave_direction,swell_wave_period," +
            "ocean_current_velocity,ocean_current_direction"

        private const val HOURLY_PARAMS =
            "wave_height,wave_direction,wave_period," +
            "wind_wave_height,wind_wave_direction," +
            "swell_wave_height,swell_wave_direction," +
            "ocean_current_velocity,ocean_current_direction"
    }
}
