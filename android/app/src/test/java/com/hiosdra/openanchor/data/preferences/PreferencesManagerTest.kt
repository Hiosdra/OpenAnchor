package com.hiosdra.openanchor.data.preferences

import android.app.Application
import androidx.test.core.app.ApplicationProvider
import com.hiosdra.openanchor.domain.model.DepthUnit
import com.hiosdra.openanchor.domain.model.DistanceUnit
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(RobolectricTestRunner::class)
class PreferencesManagerTest {

    private lateinit var manager: PreferencesManager

    @Before
    fun setup() {
        val context = ApplicationProvider.getApplicationContext<Application>()
        manager = PreferencesManager(context)
    }

    // --- UserPreferences data class ---

    @Test
    fun `UserPreferences has correct defaults`() {
        val prefs = UserPreferences()
        assertEquals(DistanceUnit.METERS, prefs.distanceUnit)
        assertEquals(DepthUnit.METERS, prefs.depthUnit)
        assertEquals("en", prefs.language)
        assertEquals(3, prefs.gpsIntervalSeconds)
        assertFalse(prefs.nightFilterEnabled)
        assertNull(prefs.geminiApiKey)
    }

    @Test
    fun `UserPreferences with custom values`() {
        val prefs = UserPreferences(
            distanceUnit = DistanceUnit.NAUTICAL_MILES,
            depthUnit = DepthUnit.FEET,
            language = "pl",
            gpsIntervalSeconds = 10,
            nightFilterEnabled = true,
            geminiApiKey = "test-key"
        )
        assertEquals(DistanceUnit.NAUTICAL_MILES, prefs.distanceUnit)
        assertEquals(DepthUnit.FEET, prefs.depthUnit)
        assertEquals("pl", prefs.language)
        assertEquals(10, prefs.gpsIntervalSeconds)
        assertTrue(prefs.nightFilterEnabled)
        assertEquals("test-key", prefs.geminiApiKey)
    }

    @Test
    fun `UserPreferences copy works`() {
        val original = UserPreferences()
        val copied = original.copy(language = "de", nightFilterEnabled = true)
        assertEquals("de", copied.language)
        assertTrue(copied.nightFilterEnabled)
        assertEquals(DistanceUnit.METERS, copied.distanceUnit) // unchanged
    }

    // --- DataStore integration ---

    @Test
    fun `setDistanceUnit and read back`() = runBlocking {
        manager.setDistanceUnit(DistanceUnit.NAUTICAL_MILES)
        val prefs = manager.preferences.first()
        assertEquals(DistanceUnit.NAUTICAL_MILES, prefs.distanceUnit)
    }

    @Test
    fun `setDistanceUnit to FEET`() = runBlocking {
        manager.setDistanceUnit(DistanceUnit.FEET)
        val prefs = manager.preferences.first()
        assertEquals(DistanceUnit.FEET, prefs.distanceUnit)
    }

    @Test
    fun `setDepthUnit and read back`() = runBlocking {
        manager.setDepthUnit(DepthUnit.FEET)
        val prefs = manager.preferences.first()
        assertEquals(DepthUnit.FEET, prefs.depthUnit)
    }

    @Test
    fun `setLanguage and read back`() = runBlocking {
        manager.setLanguage("pl")
        val prefs = manager.preferences.first()
        assertEquals("pl", prefs.language)
    }

    @Test
    fun `setGpsInterval and read back`() = runBlocking {
        manager.setGpsInterval(10)
        val prefs = manager.preferences.first()
        assertEquals(10, prefs.gpsIntervalSeconds)
    }

    @Test
    fun `setNightFilterEnabled and read back`() = runBlocking {
        manager.setNightFilterEnabled(true)
        val prefs = manager.preferences.first()
        assertTrue(prefs.nightFilterEnabled)
    }

    @Test
    fun `setGeminiApiKey and read back`() = runBlocking {
        manager.setGeminiApiKey("my-api-key-123")
        val prefs = manager.preferences.first()
        assertEquals("my-api-key-123", prefs.geminiApiKey)
    }

    @Test
    fun `multiple preferences can be set sequentially`() = runBlocking {
        manager.setDistanceUnit(DistanceUnit.FEET)
        manager.setDepthUnit(DepthUnit.FEET)
        manager.setLanguage("de")
        manager.setGpsInterval(5)
        manager.setNightFilterEnabled(true)
        manager.setGeminiApiKey("key-abc")

        val prefs = manager.preferences.first()
        assertEquals(DistanceUnit.FEET, prefs.distanceUnit)
        assertEquals(DepthUnit.FEET, prefs.depthUnit)
        assertEquals("de", prefs.language)
        assertEquals(5, prefs.gpsIntervalSeconds)
        assertTrue(prefs.nightFilterEnabled)
        assertEquals("key-abc", prefs.geminiApiKey)
    }
}
