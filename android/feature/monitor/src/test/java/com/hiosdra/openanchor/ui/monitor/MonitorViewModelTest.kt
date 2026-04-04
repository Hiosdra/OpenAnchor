package com.hiosdra.openanchor.ui.monitor

import androidx.arch.core.executor.testing.InstantTaskExecutorRule
import app.cash.turbine.test
import com.hiosdra.openanchor.data.compass.CompassProvider
import com.hiosdra.openanchor.data.repository.AnchorSessionRepository
import com.hiosdra.openanchor.service.ServiceBinderApi
import com.hiosdra.openanchor.service.MonitorState
import com.hiosdra.openanchor.domain.model.AlarmState
import com.hiosdra.openanchor.domain.model.Position
import io.mockk.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.flowOf
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
class MonitorViewModelTest {

    @get:Rule
    val instantExecutorRule = InstantTaskExecutorRule()

    private lateinit var serviceBinder: ServiceBinderApi
    private lateinit var compassProvider: CompassProvider
    private lateinit var repository: AnchorSessionRepository
    private lateinit var monitorStateFlow: MutableStateFlow<MonitorState>

    @Before
    fun setup() {
        monitorStateFlow = MutableStateFlow(MonitorState())
        serviceBinder = mockk(relaxed = true)
        compassProvider = mockk(relaxed = true)
        repository = mockk(relaxed = true)

        every { serviceBinder.monitorState } returns monitorStateFlow
        every { compassProvider.isAvailable } returns false
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `initial state is default MonitorUiState`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = MonitorViewModel(serviceBinder, compassProvider, repository)
        advanceUntilIdle()

        vm.uiState.test {
            val state = awaitItem()
            assertFalse(state.isActive)
            assertNull(state.anchorPosition)
            assertNull(state.boatPosition)
            assertEquals(AlarmState.SAFE, state.alarmState)
            assertEquals(MonitorViewMode.MAP, state.viewMode)
            cancel()
        }
    }

    @Test
    fun `toggleViewMode switches between MAP and SIMPLE`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = MonitorViewModel(serviceBinder, compassProvider, repository)
        advanceUntilIdle()

        vm.toggleViewMode()
        advanceUntilIdle()

        vm.uiState.test {
            val state = awaitItem()
            assertEquals(MonitorViewMode.SIMPLE, state.viewMode)
            cancel()
        }
    }

    @Test
    fun `toggleViewMode twice returns to MAP`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = MonitorViewModel(serviceBinder, compassProvider, repository)
        advanceUntilIdle()

        vm.toggleViewMode()
        vm.toggleViewMode()
        advanceUntilIdle()

        vm.uiState.test {
            val state = awaitItem()
            assertEquals(MonitorViewMode.MAP, state.viewMode)
            cancel()
        }
    }

    @Test
    fun `startMonitoring calls serviceBinder startAndBind`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = MonitorViewModel(serviceBinder, compassProvider, repository)
        advanceUntilIdle()

        vm.startMonitoring(42L)

        verify { serviceBinder.startAndBind(42L) }
    }

    @Test
    fun `stopMonitoring calls serviceBinder stopMonitoring`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = MonitorViewModel(serviceBinder, compassProvider, repository)
        advanceUntilIdle()

        vm.stopMonitoring()

        verify { serviceBinder.stopMonitoring() }
    }

    @Test
    fun `dismissAlarm calls serviceBinder dismissAlarm`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = MonitorViewModel(serviceBinder, compassProvider, repository)
        advanceUntilIdle()

        vm.dismissAlarm()

        verify { serviceBinder.dismissAlarm() }
    }

    @Test
    fun `onCleared calls serviceBinder unbind`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = MonitorViewModel(serviceBinder, compassProvider, repository)
        advanceUntilIdle()

        // Call onCleared via reflection since it's protected
        val method = vm.javaClass.getDeclaredMethod("onCleared")
        method.isAccessible = true
        method.invoke(vm)

        verify { serviceBinder.unbind() }
    }

    @Test
    fun `compassAvailable set when compass is available`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        every { compassProvider.isAvailable } returns true
        every { compassProvider.headingUpdates() } returns flowOf(45f)

        val vm = MonitorViewModel(serviceBinder, compassProvider, repository)
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertTrue(state.compassAvailable)
            assertEquals(45f, state.compassHeading, 0.1f)
            cancel()
        }
    }

    @Test
    fun `compass not available leaves compassAvailable false`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = MonitorViewModel(serviceBinder, compassProvider, repository)
        advanceUntilIdle()

        vm.uiState.test {
            val state = awaitItem()
            assertFalse(state.compassAvailable)
            cancel()
        }
    }

    @Test
    fun `service state updates propagate to uiState`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))

        val vm = MonitorViewModel(serviceBinder, compassProvider, repository)
        advanceUntilIdle()

        val anchorPos = Position(54.35, 18.65)
        val boatPos = Position(54.36, 18.66)
        monitorStateFlow.value = MonitorState(
            isActive = true,
            anchorPosition = anchorPos,
            boatPosition = boatPos,
            distanceToAnchor = 100.0,
            alarmState = AlarmState.WARNING,
            gpsAccuracyMeters = 5.0f,
            localBatteryLevel = 85,
            localBatteryCharging = true
        )
        advanceUntilIdle()

        vm.uiState.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertTrue(state.isActive)
            assertEquals(anchorPos, state.anchorPosition)
            assertEquals(boatPos, state.boatPosition)
            assertEquals(100.0, state.distanceToAnchor, 0.01)
            assertEquals(AlarmState.WARNING, state.alarmState)
            assertEquals(5.0f, state.gpsAccuracyMeters, 0.01f)
            assertEquals(85, state.localBatteryLevel)
            assertTrue(state.localBatteryCharging)
            cancel()
        }
    }
}
