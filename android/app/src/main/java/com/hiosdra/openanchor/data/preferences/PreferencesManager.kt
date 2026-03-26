package com.hiosdra.openanchor.data.preferences

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import com.hiosdra.openanchor.domain.model.DepthUnit
import com.hiosdra.openanchor.domain.model.DistanceUnit
import com.hiosdra.openanchor.domain.model.ThemeMode
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "settings")

data class UserPreferences(
    val distanceUnit: DistanceUnit = DistanceUnit.METERS,
    val depthUnit: DepthUnit = DepthUnit.METERS,
    val language: String = "en",
    val gpsIntervalSeconds: Int = 3,
    val themeMode: ThemeMode = ThemeMode.DARK,
    val geminiApiKey: String? = null
)

@Singleton
class PreferencesManager @Inject constructor(
    @ApplicationContext private val context: Context
) {

    private object Keys {
        val DISTANCE_UNIT = stringPreferencesKey("distance_unit")
        val DEPTH_UNIT = stringPreferencesKey("depth_unit")
        val LANGUAGE = stringPreferencesKey("language")
        val GPS_INTERVAL = intPreferencesKey("gps_interval_seconds")
        val NIGHT_FILTER = booleanPreferencesKey("night_filter_enabled")
        val THEME_MODE = stringPreferencesKey("theme_mode")
        val GEMINI_API_KEY = stringPreferencesKey("gemini_api_key")
        val HAS_SEEN_PERMISSION_ONBOARDING = booleanPreferencesKey("has_seen_permission_onboarding")
    }

    val hasSeenPermissionOnboarding: Flow<Boolean> = context.dataStore.data.map { prefs ->
        prefs[Keys.HAS_SEEN_PERMISSION_ONBOARDING] ?: false
    }

    val preferences: Flow<UserPreferences> = context.dataStore.data.map { prefs ->
        // Migrate legacy night_filter_enabled → themeMode
        val themeMode = prefs[Keys.THEME_MODE]?.let {
            try { ThemeMode.valueOf(it) } catch (_: Exception) { ThemeMode.DARK }
        } ?: if (prefs[Keys.NIGHT_FILTER] == true) ThemeMode.NIGHT_VISION else ThemeMode.DARK

        UserPreferences(
            distanceUnit = prefs[Keys.DISTANCE_UNIT]?.let {
                try { DistanceUnit.valueOf(it) } catch (_: Exception) { DistanceUnit.METERS }
            } ?: DistanceUnit.METERS,
            depthUnit = prefs[Keys.DEPTH_UNIT]?.let {
                try { DepthUnit.valueOf(it) } catch (_: Exception) { DepthUnit.METERS }
            } ?: DepthUnit.METERS,
            language = prefs[Keys.LANGUAGE] ?: "en",
            gpsIntervalSeconds = prefs[Keys.GPS_INTERVAL] ?: 3,
            themeMode = themeMode,
            geminiApiKey = prefs[Keys.GEMINI_API_KEY]
        )
    }

    suspend fun setDistanceUnit(unit: DistanceUnit) {
        context.dataStore.edit { it[Keys.DISTANCE_UNIT] = unit.name }
    }

    suspend fun setDepthUnit(unit: DepthUnit) {
        context.dataStore.edit { it[Keys.DEPTH_UNIT] = unit.name }
    }

    suspend fun setLanguage(language: String) {
        context.dataStore.edit { it[Keys.LANGUAGE] = language }
    }

    suspend fun setGpsInterval(seconds: Int) {
        context.dataStore.edit { it[Keys.GPS_INTERVAL] = seconds }
    }

    suspend fun setThemeMode(mode: ThemeMode) {
        context.dataStore.edit {
            it[Keys.THEME_MODE] = mode.name
            // Clear legacy key when migrating
            it.remove(Keys.NIGHT_FILTER)
        }
    }

    suspend fun setGeminiApiKey(key: String) {
        context.dataStore.edit { it[Keys.GEMINI_API_KEY] = key }
    }

    suspend fun setHasSeenPermissionOnboarding() {
        context.dataStore.edit { it[Keys.HAS_SEEN_PERMISSION_ONBOARDING] = true }
    }
}
