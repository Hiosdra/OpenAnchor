package com.hiosdra.openanchor.data.weather

import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for fetching and caching marine weather data from Open-Meteo.
 * Caches the last successful response for 15 minutes to avoid redundant API calls.
 */
@Singleton
class WeatherRepository @Inject constructor(
    private val api: MarineWeatherApi
) {
    private val cacheMutex = Mutex()

    @Volatile private var cachedResponse: MarineWeatherResponse? = null
    @Volatile private var cachedLat: Double? = null
    @Volatile private var cachedLon: Double? = null
    @Volatile private var cacheTimestamp: Long = 0L

    companion object {
        /** Cache duration: 15 minutes */
        private const val CACHE_DURATION_MS = 15 * 60 * 1000L

        /** Minimum position change (in degrees, ~100m) to invalidate cache */
        private const val POSITION_THRESHOLD = 0.001
    }

    /**
     * Fetch marine weather for the given coordinates.
     * Returns cached data if still fresh and position hasn't moved significantly.
     */
    suspend fun getMarineWeather(
        latitude: Double,
        longitude: Double,
        forceRefresh: Boolean = false
    ): Result<MarineWeatherResponse> {
        // Check cache validity (reads are volatile, safe without lock)
        if (!forceRefresh) {
            val cached = cachedResponse
            val cLat = cachedLat
            val cLon = cachedLon
            if (cached != null && cLat != null && cLon != null) {
                val age = System.currentTimeMillis() - cacheTimestamp
                val positionMoved = Math.abs(latitude - cLat) > POSITION_THRESHOLD ||
                        Math.abs(longitude - cLon) > POSITION_THRESHOLD
                if (age < CACHE_DURATION_MS && !positionMoved) {
                    return Result.success(cached)
                }
            }
        }

        return cacheMutex.withLock {
            // Double-check inside lock to avoid redundant fetches
            if (!forceRefresh) {
                val cached = cachedResponse
                val cLat = cachedLat
                val cLon = cachedLon
                if (cached != null && cLat != null && cLon != null) {
                    val age = System.currentTimeMillis() - cacheTimestamp
                    val positionMoved = Math.abs(latitude - cLat) > POSITION_THRESHOLD ||
                            Math.abs(longitude - cLon) > POSITION_THRESHOLD
                    if (age < CACHE_DURATION_MS && !positionMoved) {
                        return@withLock Result.success(cached)
                    }
                }
            }

            try {
                val response = api.getMarineWeather(
                    latitude = latitude,
                    longitude = longitude
                )
                // Update cache
                cachedResponse = response
                cachedLat = latitude
                cachedLon = longitude
                cacheTimestamp = System.currentTimeMillis()
                Result.success(response)
            } catch (e: Exception) {
                // If we have stale cache, return it rather than failing
                val stale = cachedResponse
                if (stale != null) {
                    Result.success(stale)
                } else {
                    Result.failure(e)
                }
            }
        }
    }

    /** Clear cached data. */
    suspend fun clearCache() {
        cacheMutex.withLock {
            cachedResponse = null
            cachedLat = null
            cachedLon = null
            cacheTimestamp = 0L
        }
    }
}
