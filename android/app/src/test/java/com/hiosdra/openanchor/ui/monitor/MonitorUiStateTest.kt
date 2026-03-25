package com.hiosdra.openanchor.ui.monitor

import com.hiosdra.openanchor.domain.model.AlarmState
import com.hiosdra.openanchor.domain.model.AnchorZone
import com.hiosdra.openanchor.domain.model.Position
import org.junit.Assert.*
import org.junit.Test

class MonitorUiStateTest {

    @Test
    fun `default MonitorUiState values`() {
        val state = MonitorUiState()
        assertEquals(MonitorViewMode.MAP, state.viewMode)
        assertFalse(state.isActive)
        assertNull(state.anchorPosition)
        assertNull(state.boatPosition)
        assertNull(state.zone)
        assertEquals(0.0, state.distanceToAnchor, 0.001)
        assertEquals(AlarmState.SAFE, state.alarmState)
        assertEquals(0.0, state.bearingToAnchor, 0.001)
        assertEquals(0f, state.gpsAccuracyMeters, 0.001f)
        assertFalse(state.gpsSignalLost)
        assertEquals(0f, state.compassHeading, 0.001f)
        assertFalse(state.compassAvailable)
        assertTrue(state.trackPoints.isEmpty())
        assertEquals(-1, state.localBatteryLevel)
        assertFalse(state.localBatteryCharging)
        assertNull(state.peerBatteryLevel)
        assertNull(state.peerIsCharging)
        assertFalse(state.isPairedMode)
        assertNull(state.driftAnalysis)
    }

    @Test
    fun `MonitorUiState copy with values`() {
        val pos = Position(54.35, 18.65)
        val zone = AnchorZone.Circle(pos, 30.0)
        val state = MonitorUiState(
            viewMode = MonitorViewMode.SIMPLE,
            isActive = true,
            anchorPosition = pos,
            boatPosition = pos,
            zone = zone,
            distanceToAnchor = 15.5,
            alarmState = AlarmState.WARNING,
            bearingToAnchor = 180.0,
            gpsAccuracyMeters = 5.0f,
            compassHeading = 90.0f,
            compassAvailable = true,
            localBatteryLevel = 85,
            localBatteryCharging = true,
            isPairedMode = true,
            peerBatteryLevel = 70.0,
            peerIsCharging = false
        )
        assertEquals(MonitorViewMode.SIMPLE, state.viewMode)
        assertTrue(state.isActive)
        assertEquals(pos, state.anchorPosition)
        assertEquals(15.5, state.distanceToAnchor, 0.001)
        assertEquals(AlarmState.WARNING, state.alarmState)
        assertEquals(180.0, state.bearingToAnchor, 0.001)
        assertEquals(85, state.localBatteryLevel)
        assertTrue(state.compassAvailable)
        assertTrue(state.isPairedMode)
        assertEquals(70.0, state.peerBatteryLevel!!, 0.001)
    }

    @Test
    fun `MonitorViewMode has two modes`() {
        assertEquals(2, MonitorViewMode.entries.size)
        assertTrue(MonitorViewMode.entries.contains(MonitorViewMode.MAP))
        assertTrue(MonitorViewMode.entries.contains(MonitorViewMode.SIMPLE))
    }
}
