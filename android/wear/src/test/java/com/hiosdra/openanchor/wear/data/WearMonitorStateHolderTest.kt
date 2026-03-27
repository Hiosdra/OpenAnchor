package com.hiosdra.openanchor.wear.data

import app.cash.turbine.test
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class WearMonitorStateHolderTest {

    private lateinit var stateHolder: WearMonitorStateHolder

    @Before
    fun setup() {
        stateHolder = WearMonitorStateHolder()
    }

    @Test
    fun `should have default initial state`() = runTest {
        stateHolder.state.test {
            val initial = awaitItem()
            assertFalse(initial.isActive)
            assertEquals(WearAlarmState.SAFE, initial.alarmState)
            assertEquals(0.0, initial.distanceMeters, 0.01)
            assertEquals(0f, initial.gpsAccuracyMeters, 0.01f)
            assertFalse(initial.gpsSignalLost)
            assertEquals(0L, initial.timestamp)
        }
    }

    @Test
    fun `should emit updated state`() = runTest {
        val newState = WearMonitorState(
            isActive = true,
            alarmState = WearAlarmState.WARNING,
            distanceMeters = 30.0,
            gpsAccuracyMeters = 12f,
            timestamp = 5000L
        )

        stateHolder.state.test {
            awaitItem() // initial

            stateHolder.updateState(newState)
            assertEquals(newState, awaitItem())
        }
    }

    @Test
    fun `should emit multiple sequential updates`() = runTest {
        val state1 = WearMonitorState(isActive = true, distanceMeters = 10.0)
        val state2 = WearMonitorState(isActive = true, distanceMeters = 20.0)
        val state3 = WearMonitorState(isActive = true, distanceMeters = 30.0)

        stateHolder.state.test {
            awaitItem() // initial

            stateHolder.updateState(state1)
            assertEquals(10.0, awaitItem().distanceMeters, 0.01)

            stateHolder.updateState(state2)
            assertEquals(20.0, awaitItem().distanceMeters, 0.01)

            stateHolder.updateState(state3)
            assertEquals(30.0, awaitItem().distanceMeters, 0.01)
        }
    }

    @Test
    fun `should reset to default state`() = runTest {
        val activeState = WearMonitorState(
            isActive = true,
            alarmState = WearAlarmState.ALARM,
            distanceMeters = 100.0,
            gpsAccuracyMeters = 25f,
            gpsSignalLost = true,
            timestamp = 9999L
        )

        stateHolder.state.test {
            awaitItem() // initial default

            stateHolder.updateState(activeState)
            val active = awaitItem()
            assertTrue(active.isActive)
            assertEquals(WearAlarmState.ALARM, active.alarmState)

            stateHolder.reset()
            val reset = awaitItem()
            assertFalse(reset.isActive)
            assertEquals(WearAlarmState.SAFE, reset.alarmState)
            assertEquals(0.0, reset.distanceMeters, 0.01)
            assertEquals(0L, reset.timestamp)
        }
    }

    @Test
    fun `should reflect latest value immediately`() {
        val newState = WearMonitorState(
            isActive = true,
            distanceMeters = 55.0,
            alarmState = WearAlarmState.CAUTION
        )

        stateHolder.updateState(newState)

        assertEquals(newState, stateHolder.state.value)
    }

    @Test
    fun `should not emit when same state is set`() = runTest {
        val state = WearMonitorState(isActive = true, distanceMeters = 42.0)

        stateHolder.state.test {
            awaitItem() // initial

            stateHolder.updateState(state)
            assertEquals(42.0, awaitItem().distanceMeters, 0.01)

            // Setting the same state should not emit
            stateHolder.updateState(state)
            expectNoEvents()
        }
    }
}
