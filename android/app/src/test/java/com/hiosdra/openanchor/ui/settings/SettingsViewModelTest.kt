package com.hiosdra.openanchor.ui.settings

import androidx.arch.core.executor.testing.InstantTaskExecutorRule
import app.cash.turbine.test
import com.hiosdra.openanchor.data.preferences.PreferencesManager
import com.hiosdra.openanchor.data.preferences.UserPreferences
import com.hiosdra.openanchor.domain.model.DepthUnit
import com.hiosdra.openanchor.domain.model.DistanceUnit
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
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
class SettingsViewModelTest {

    @get:Rule
    val instantExecutorRule = InstantTaskExecutorRule()

    private lateinit var preferencesManager: PreferencesManager
    private lateinit var preferencesFlow: MutableStateFlow<UserPreferences>
    private lateinit var viewModel: SettingsViewModel

    @Before
    fun setup() {
        preferencesFlow = MutableStateFlow(UserPreferences())
        preferencesManager = mockk {
            coEvery { preferences } returns preferencesFlow
            coEvery { setDistanceUnit(any()) } returns Unit
            coEvery { setDepthUnit(any()) } returns Unit
            coEvery { setLanguage(any()) } returns Unit
            coEvery { setGpsInterval(any()) } returns Unit
            coEvery { setNightFilterEnabled(any()) } returns Unit
        }
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun createViewModel(): SettingsViewModel {
        return SettingsViewModel(preferencesManager)
    }

    @Test
    fun `preferences StateFlow emits initial default preferences`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.preferences.test {
            val prefs = awaitItem()
            assertEquals(DistanceUnit.METERS, prefs.distanceUnit)
            assertEquals(DepthUnit.METERS, prefs.depthUnit)
            assertEquals("en", prefs.language)
            assertEquals(3, prefs.gpsIntervalSeconds)
            assertEquals(false, prefs.nightFilterEnabled)
            cancel()
        }
    }

    @Test
    fun `preferences StateFlow emits updated preferences`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.preferences.test {
            awaitItem() // Initial

            preferencesFlow.value = UserPreferences(
                distanceUnit = DistanceUnit.FEET,
                depthUnit = DepthUnit.FEET,
                language = "pl",
                gpsIntervalSeconds = 10,
                nightFilterEnabled = true
            )

            val updated = awaitItem()
            assertEquals(DistanceUnit.FEET, updated.distanceUnit)
            assertEquals(DepthUnit.FEET, updated.depthUnit)
            assertEquals("pl", updated.language)
            assertEquals(10, updated.gpsIntervalSeconds)
            assertEquals(true, updated.nightFilterEnabled)
            cancel()
        }
    }

    @Test
    fun `setDistanceUnit calls preferencesManager`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.setDistanceUnit(DistanceUnit.METERS)
        advanceUntilIdle()

        coVerify { preferencesManager.setDistanceUnit(DistanceUnit.METERS) }
    }

    @Test
    fun `setDepthUnit calls preferencesManager`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.setDepthUnit(DepthUnit.FEET)
        advanceUntilIdle()

        coVerify { preferencesManager.setDepthUnit(DepthUnit.FEET) }
    }

    @Test
    fun `setLanguage calls preferencesManager`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.setLanguage("pl")
        advanceUntilIdle()

        coVerify { preferencesManager.setLanguage("pl") }
    }

    @Test
    fun `setGpsInterval calls preferencesManager`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.setGpsInterval(10)
        advanceUntilIdle()

        coVerify { preferencesManager.setGpsInterval(10) }
    }

    @Test
    fun `setNightFilterEnabled calls preferencesManager`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.setNightFilterEnabled(true)
        advanceUntilIdle()

        coVerify { preferencesManager.setNightFilterEnabled(true) }
    }

    @Test
    fun `multiple settings changes call correct methods`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.setDistanceUnit(DistanceUnit.FEET)
        viewModel.setDepthUnit(DepthUnit.FEET)
        viewModel.setLanguage("pl")
        viewModel.setGpsInterval(10)
        viewModel.setNightFilterEnabled(true)
        advanceUntilIdle()

        coVerify { preferencesManager.setDistanceUnit(DistanceUnit.FEET) }
        coVerify { preferencesManager.setDepthUnit(DepthUnit.FEET) }
        coVerify { preferencesManager.setLanguage("pl") }
        coVerify { preferencesManager.setGpsInterval(10) }
        coVerify { preferencesManager.setNightFilterEnabled(true) }
    }

    @Test
    fun `all distance units can be set`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        viewModel = createViewModel()
        advanceUntilIdle()

        for (unit in DistanceUnit.entries) {
            viewModel.setDistanceUnit(unit)
            advanceUntilIdle()
            coVerify { preferencesManager.setDistanceUnit(unit) }
        }
    }

    @Test
    fun `all depth units can be set`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        viewModel = createViewModel()
        advanceUntilIdle()

        for (unit in DepthUnit.entries) {
            viewModel.setDepthUnit(unit)
            advanceUntilIdle()
            coVerify { preferencesManager.setDepthUnit(unit) }
        }
    }
}
