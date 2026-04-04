package com.hiosdra.openanchor.network

import com.hiosdra.openanchor.domain.model.AlarmState
import com.hiosdra.openanchor.domain.model.AnchorZone
import com.hiosdra.openanchor.domain.model.Position
import org.junit.Assert.*
import org.junit.Test

class PairedStateTest {

    @Test
    fun `PairedState default values`() {
        val state = PairedModeManager.PairedState()
        assertFalse(state.isPaired)
        assertFalse(state.peerConnected)
        assertNull(state.anchorPosition)
        assertNull(state.zone)
        assertNull(state.chainLengthM)
        assertNull(state.depthM)
        assertNull(state.peerBoatPosition)
        assertEquals(0.0, state.peerDistanceToAnchor, 0.01)
        assertEquals(AlarmState.SAFE, state.peerAlarmState)
        assertEquals(0f, state.peerGpsAccuracy, 0.01f)
        assertNull(state.peerSog)
        assertNull(state.peerCog)
        assertNull(state.peerBatteryLevel)
        assertNull(state.peerIsCharging)
    }

    @Test
    fun `PairedState copy preserves values`() {
        val state = PairedModeManager.PairedState(
            isPaired = true,
            peerConnected = true
        )
        val copied = state.copy(peerConnected = false)
        assertTrue(copied.isPaired)
        assertFalse(copied.peerConnected)
    }

    @Test
    fun `PairedState with full zone info`() {
        val pos = Position(54.35, 18.65)
        val zone = AnchorZone.Circle(pos, 30.0, 50.0)
        val state = PairedModeManager.PairedState(
            isPaired = true,
            peerConnected = true,
            anchorPosition = pos,
            zone = zone,
            chainLengthM = 50.0,
            depthM = 10.0
        )
        assertEquals(pos, state.anchorPosition)
        assertEquals(zone, state.zone)
        assertEquals(50.0, state.chainLengthM!!, 0.01)
        assertEquals(10.0, state.depthM!!, 0.01)
    }

    @Test
    fun `PairedState with peer telemetry`() {
        val boatPos = Position(54.36, 18.66, 5.0f)
        val state = PairedModeManager.PairedState(
            peerBoatPosition = boatPos,
            peerDistanceToAnchor = 25.0,
            peerAlarmState = AlarmState.WARNING,
            peerGpsAccuracy = 5.0f,
            peerSog = 2.5,
            peerCog = 180.0,
            peerBatteryLevel = 0.85,
            peerIsCharging = true
        )
        assertEquals(boatPos, state.peerBoatPosition)
        assertEquals(25.0, state.peerDistanceToAnchor, 0.01)
        assertEquals(AlarmState.WARNING, state.peerAlarmState)
        assertEquals(5.0f, state.peerGpsAccuracy, 0.01f)
        assertEquals(2.5, state.peerSog!!, 0.01)
        assertEquals(180.0, state.peerCog!!, 0.01)
        assertEquals(0.85, state.peerBatteryLevel!!, 0.01)
        assertTrue(state.peerIsCharging!!)
    }

    @Test
    fun `PairedState equality`() {
        val state1 = PairedModeManager.PairedState(isPaired = true)
        val state2 = PairedModeManager.PairedState(isPaired = true)
        assertEquals(state1, state2)
    }

    @Test
    fun `PairedState inequality`() {
        val state1 = PairedModeManager.PairedState(isPaired = true)
        val state2 = PairedModeManager.PairedState(isPaired = false)
        assertNotEquals(state1, state2)
    }

    @Test
    fun `PairedEvent types`() {
        val pos = Position(54.35, 18.65)
        val zone = AnchorZone.Circle(pos, 30.0)

        val enter = PairedModeManager.PairedEvent.EnterPairedMode(zone, pos, 50.0, 10.0)
        assertEquals(zone, enter.zone)
        assertEquals(pos, enter.anchorPosition)
        assertEquals(50.0, enter.chainLengthM!!, 0.01)
        assertEquals(10.0, enter.depthM!!, 0.01)

        val exit = PairedModeManager.PairedEvent.ExitPairedMode
        assertTrue(exit is PairedModeManager.PairedEvent)

        val alarm = PairedModeManager.PairedEvent.AlarmTriggered("ZONE", "Outside", AlarmState.ALARM)
        assertEquals("ZONE", alarm.reason)
        assertEquals("Outside", alarm.message)
        assertEquals(AlarmState.ALARM, alarm.alarmState)

        val timeout = PairedModeManager.PairedEvent.HeartbeatTimeout
        assertTrue(timeout is PairedModeManager.PairedEvent)

        val ended = PairedModeManager.PairedEvent.SessionEnded("USER")
        assertEquals("USER", ended.reason)

        val battery = PairedModeManager.PairedEvent.LowBatteryWarning(0.05)
        assertEquals(0.05, battery.level, 0.01)
    }
}
