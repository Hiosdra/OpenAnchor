package com.hiosdra.openanchor.ui.setup

import androidx.arch.core.executor.testing.InstantTaskExecutorRule
import app.cash.turbine.test
import com.hiosdra.openanchor.data.location.LocationProvider
import com.hiosdra.openanchor.data.preferences.PreferencesManager
import com.hiosdra.openanchor.data.repository.AnchorSessionRepository
import com.hiosdra.openanchor.domain.model.ZoneType
import com.hiosdra.openanchor.domain.scope.AnchorScopeCalculator
import io.mockk.coEvery
import io.mockk.coVerify
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
class SetupViewModelTest {

    @get:Rule
    val instantExecutorRule = InstantTaskExecutorRule()

    private lateinit var locationProvider: LocationProvider
    private lateinit var repository: AnchorSessionRepository
    private lateinit var preferencesManager: PreferencesManager
    private lateinit var viewModel: SetupViewModel

    @Before
    fun setup() {
        locationProvider = mockk(relaxed = true)
        repository = mockk(relaxed = true)
        preferencesManager = mockk(relaxed = true)
        coEvery { locationProvider.getLastKnownPosition() } returns null
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun createViewModel(): SetupViewModel {
        return SetupViewModel(locationProvider, repository, preferencesManager, AnchorScopeCalculator())
    }

    @Test
    fun `initial state has default values`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.state.test {
            val state = awaitItem()
            assertEquals(SetupStep.DROP_POINT, state.currentStep)
            assertEquals(ZoneType.CIRCLE, state.zoneType)
            assertEquals("30", state.radiusMeters)
            assertFalse(state.useCalculator)
            assertFalse(state.useBufferZone)
            assertEquals("50", state.bufferRadiusMeters)
            assertNull(state.createdSessionId)
            assertNull(state.error)
            cancel()
        }
    }

    @Test
    fun `setAnchorPosition updates state`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.setAnchorPosition(54.35, 18.65)

        viewModel.state.test {
            val state = awaitItem()
            assertEquals(54.35, state.anchorLat, 0.001)
            assertEquals(18.65, state.anchorLng, 0.001)
            cancel()
        }
    }

    @Test
    fun `useCurrentLocationAsAnchor copies boat position`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.setAnchorPosition(0.0, 0.0)
        viewModel.useCurrentLocationAsAnchor()

        viewModel.state.test {
            val state = awaitItem()
            assertEquals(state.currentBoatLat, state.anchorLat, 0.001)
            assertEquals(state.currentBoatLng, state.anchorLng, 0.001)
            cancel()
        }
    }

    @Test
    fun `setZoneType updates state`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.setZoneType(ZoneType.SECTOR)

        viewModel.state.test {
            val state = awaitItem()
            assertEquals(ZoneType.SECTOR, state.zoneType)
            cancel()
        }
    }

    @Test
    fun `setRadiusMeters updates state`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.setRadiusMeters("50")

        viewModel.state.test {
            assertEquals("50", awaitItem().radiusMeters)
            cancel()
        }
    }

    @Test
    fun `setUseCalculator updates state`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.setUseCalculator(true)

        viewModel.state.test {
            val state = awaitItem()
            assertTrue(state.useCalculator)
            assertNull(state.calculatedRadius)
            cancel()
        }
    }

    @Test
    fun `setDepth triggers recalculation`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.setChainLength("50")
        viewModel.setDepth("10")

        viewModel.state.test {
            val state = awaitItem()
            assertEquals("10", state.depthM)
            assertNotNull(state.calculatedRadius)
            cancel()
        }
    }

    @Test
    fun `setScopeRatio updates state and auto-fills chain`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.setDepth("10")
        viewModel.setScopeRatio(ScopeRatio.RATIO_5)

        viewModel.state.test {
            val state = awaitItem()
            assertEquals(ScopeRatio.RATIO_5, state.selectedScopeRatio)
            assertTrue(state.chainAutoFilled)
            cancel()
        }
    }

    @Test
    fun `setScopeRatio CUSTOM does not auto-fill chain`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        viewModel = createViewModel()
        advanceUntilIdle()

        // Set CUSTOM first before setting depth - so auto-fill never triggers
        viewModel.setScopeRatio(ScopeRatio.CUSTOM)
        viewModel.setDepth("10")

        viewModel.state.test {
            val state = awaitItem()
            assertEquals(ScopeRatio.CUSTOM, state.selectedScopeRatio)
            assertFalse(state.chainAutoFilled)
            cancel()
        }
    }

    @Test
    fun `setUseBufferZone updates state`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.setUseBufferZone(true)

        viewModel.state.test {
            assertTrue(awaitItem().useBufferZone)
            cancel()
        }
    }

    @Test
    fun `setBufferRadius updates state`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.setBufferRadius("75")

        viewModel.state.test {
            assertEquals("75", awaitItem().bufferRadiusMeters)
            cancel()
        }
    }

    @Test
    fun `setSectorRadius updates state`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.setSectorRadius("40")

        viewModel.state.test {
            assertEquals("40", awaitItem().sectorRadiusMeters)
            cancel()
        }
    }

    @Test
    fun `setSectorHalfAngle updates state`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.setSectorHalfAngle("45")

        viewModel.state.test {
            assertEquals("45", awaitItem().sectorHalfAngleDeg)
            cancel()
        }
    }

    @Test
    fun `setSectorBearing updates state`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.setSectorBearing("180")

        viewModel.state.test {
            assertEquals("180", awaitItem().sectorBearingDeg)
            cancel()
        }
    }

    @Test
    fun `setAutoSectorBearing updates state`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.setAutoSectorBearing(false)

        viewModel.state.test {
            assertFalse(awaitItem().autoSectorBearing)
            cancel()
        }
    }

    @Test
    fun `nextStep from DROP_POINT goes to ZONE_TYPE`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.nextStep()

        viewModel.state.test {
            assertEquals(SetupStep.ZONE_TYPE, awaitItem().currentStep)
            cancel()
        }
    }

    @Test
    fun `nextStep from ZONE_TYPE goes to RADIUS`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.nextStep() // -> ZONE_TYPE
        viewModel.nextStep() // -> RADIUS

        viewModel.state.test {
            assertEquals(SetupStep.RADIUS, awaitItem().currentStep)
            cancel()
        }
    }

    @Test
    fun `nextStep from RADIUS with CIRCLE goes to CONFIRM`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.nextStep() // -> ZONE_TYPE
        viewModel.nextStep() // -> RADIUS
        viewModel.nextStep() // -> CONFIRM (circle mode)

        viewModel.state.test {
            assertEquals(SetupStep.CONFIRM, awaitItem().currentStep)
            cancel()
        }
    }

    @Test
    fun `nextStep from RADIUS with SECTOR goes to SECTOR_CONFIG`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.setZoneType(ZoneType.SECTOR)
        viewModel.nextStep() // -> ZONE_TYPE
        viewModel.nextStep() // -> RADIUS
        viewModel.nextStep() // -> SECTOR_CONFIG

        viewModel.state.test {
            assertEquals(SetupStep.SECTOR_CONFIG, awaitItem().currentStep)
            cancel()
        }
    }

    @Test
    fun `nextStep from SECTOR_CONFIG goes to CONFIRM`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.setZoneType(ZoneType.SECTOR)
        viewModel.nextStep() // -> ZONE_TYPE
        viewModel.nextStep() // -> RADIUS
        viewModel.nextStep() // -> SECTOR_CONFIG
        viewModel.nextStep() // -> CONFIRM

        viewModel.state.test {
            assertEquals(SetupStep.CONFIRM, awaitItem().currentStep)
            cancel()
        }
    }

    @Test
    fun `previousStep from ZONE_TYPE goes to DROP_POINT`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.nextStep() // -> ZONE_TYPE
        viewModel.previousStep() // -> DROP_POINT

        viewModel.state.test {
            assertEquals(SetupStep.DROP_POINT, awaitItem().currentStep)
            cancel()
        }
    }

    @Test
    fun `previousStep from CONFIRM with CIRCLE goes to RADIUS`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.nextStep() // -> ZONE_TYPE
        viewModel.nextStep() // -> RADIUS
        viewModel.nextStep() // -> CONFIRM
        viewModel.previousStep() // -> RADIUS

        viewModel.state.test {
            assertEquals(SetupStep.RADIUS, awaitItem().currentStep)
            cancel()
        }
    }

    @Test
    fun `previousStep from CONFIRM with SECTOR goes to SECTOR_CONFIG`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.setZoneType(ZoneType.SECTOR)
        viewModel.nextStep() // -> ZONE_TYPE
        viewModel.nextStep() // -> RADIUS
        viewModel.nextStep() // -> SECTOR_CONFIG
        viewModel.nextStep() // -> CONFIRM
        viewModel.previousStep() // -> SECTOR_CONFIG

        viewModel.state.test {
            assertEquals(SetupStep.SECTOR_CONFIG, awaitItem().currentStep)
            cancel()
        }
    }

    @Test
    fun `previousStep from DROP_POINT stays at DROP_POINT`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.previousStep()

        viewModel.state.test {
            assertEquals(SetupStep.DROP_POINT, awaitItem().currentStep)
            cancel()
        }
    }

    @Test
    fun `confirmAndCreateSession with valid radius creates session`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        coEvery { repository.insertSession(any()) } returns 42L
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.setAnchorPosition(54.35, 18.65)
        viewModel.setRadiusMeters("50")
        viewModel.confirmAndCreateSession()
        advanceUntilIdle()

        viewModel.state.test {
            val state = awaitItem()
            assertEquals(42L, state.createdSessionId)
            assertNull(state.error)
            cancel()
        }
    }

    @Test
    fun `confirmAndCreateSession with invalid radius sets error`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.setRadiusMeters("invalid")
        viewModel.confirmAndCreateSession()
        advanceUntilIdle()

        viewModel.state.test {
            val state = awaitItem()
            assertNull(state.createdSessionId)
            assertEquals("Invalid radius", state.error)
            cancel()
        }
    }

    @Test
    fun `confirmAndCreateSession with zero radius sets error`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.setRadiusMeters("0")
        viewModel.confirmAndCreateSession()
        advanceUntilIdle()

        viewModel.state.test {
            val state = awaitItem()
            assertNull(state.createdSessionId)
            assertEquals("Invalid radius", state.error)
            cancel()
        }
    }

    @Test
    fun `confirmAndCreateSession with sector zone creates session`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        coEvery { repository.insertSession(any()) } returns 99L
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.setZoneType(ZoneType.SECTOR)
        viewModel.setRadiusMeters("40")
        viewModel.setSectorRadius("35")
        viewModel.setSectorHalfAngle("45")
        viewModel.setSectorBearing("90")
        viewModel.confirmAndCreateSession()
        advanceUntilIdle()

        viewModel.state.test {
            assertEquals(99L, awaitItem().createdSessionId)
            cancel()
        }
    }

    @Test
    fun `confirmAndCreateSession with buffer zone creates session`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        coEvery { repository.insertSession(any()) } returns 77L
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.setUseBufferZone(true)
        viewModel.setBufferRadius("60")
        viewModel.setRadiusMeters("30")
        viewModel.confirmAndCreateSession()
        advanceUntilIdle()

        viewModel.state.test {
            assertEquals(77L, awaitItem().createdSessionId)
            cancel()
        }

        coVerify { repository.insertSession(any()) }
    }

    @Test
    fun `setChainLength manually clears auto-fill flag`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.setDepth("10")
        viewModel.setScopeRatio(ScopeRatio.RATIO_7)
        // Now auto-filled
        viewModel.setChainLength("100")

        viewModel.state.test {
            val state = awaitItem()
            assertFalse(state.chainAutoFilled)
            assertEquals("100", state.chainLengthM)
            cancel()
        }
    }
}
