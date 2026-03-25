package com.hiosdra.openanchor.service

import com.hiosdra.openanchor.domain.model.AlarmState
import com.hiosdra.openanchor.domain.model.AnchorZone
import com.hiosdra.openanchor.domain.model.Position
import org.junit.Assert.*
import org.junit.Test

class MonitorStateTest {

    @Test
    fun `default MonitorState has expected values`() {
        val state = MonitorState()
        assertFalse(state.isActive)
        assertNull(state.sessionId)
        assertNull(state.anchorPosition)
        assertNull(state.boatPosition)
        assertNull(state.zone)
        assertEquals(0.0, state.distanceToAnchor, 0.001)
        assertEquals(AlarmState.SAFE, state.alarmState)
        assertEquals(0f, state.gpsAccuracyMeters, 0.001f)
        assertFalse(state.gpsSignalLost)
        assertFalse(state.isPairedMode)
        assertFalse(state.peerConnected)
        assertNull(state.peerBatteryLevel)
        assertNull(state.peerIsCharging)
        assertNull(state.sog)
        assertNull(state.cog)
        assertFalse(state.isClientMode)
        assertEquals(-1, state.localBatteryLevel)
        assertFalse(state.localBatteryCharging)
        assertNull(state.driftAnalysis)
    }

    @Test
    fun `MonitorState copy works correctly`() {
        val pos = Position(54.35, 18.65)
        val zone = AnchorZone.Circle(pos, 30.0)
        val state = MonitorState(
            isActive = true,
            sessionId = 42,
            anchorPosition = pos,
            boatPosition = pos,
            zone = zone,
            distanceToAnchor = 15.5,
            alarmState = AlarmState.WARNING,
            gpsAccuracyMeters = 5.0f,
            isPairedMode = true,
            peerConnected = true,
            localBatteryLevel = 85,
            localBatteryCharging = true
        )

        assertTrue(state.isActive)
        assertEquals(42L, state.sessionId)
        assertEquals(pos, state.anchorPosition)
        assertEquals(15.5, state.distanceToAnchor, 0.001)
        assertEquals(AlarmState.WARNING, state.alarmState)
        assertEquals(5.0f, state.gpsAccuracyMeters, 0.001f)
        assertTrue(state.isPairedMode)
        assertTrue(state.peerConnected)
        assertEquals(85, state.localBatteryLevel)
        assertTrue(state.localBatteryCharging)
    }

    @Test
    fun `MonitorState paired mode fields`() {
        val state = MonitorState(
            isPairedMode = true,
            peerConnected = true,
            peerBatteryLevel = 75.0,
            peerIsCharging = false,
            sog = 2.5,
            cog = 180.0
        )
        assertTrue(state.isPairedMode)
        assertTrue(state.peerConnected)
        assertEquals(75.0, state.peerBatteryLevel!!, 0.001)
        assertFalse(state.peerIsCharging!!)
        assertEquals(2.5, state.sog!!, 0.001)
        assertEquals(180.0, state.cog!!, 0.001)
    }

    @Test
    fun `MonitorState client mode fields`() {
        val state = MonitorState(isClientMode = true)
        assertTrue(state.isClientMode)
    }

    @Test
    fun `MonitorState GPS signal lost state`() {
        val state = MonitorState(gpsSignalLost = true, gpsAccuracyMeters = 100f)
        assertTrue(state.gpsSignalLost)
        assertEquals(100f, state.gpsAccuracyMeters, 0.001f)
    }
}
