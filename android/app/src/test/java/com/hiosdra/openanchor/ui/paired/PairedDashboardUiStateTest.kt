package com.hiosdra.openanchor.ui.paired

import com.hiosdra.openanchor.domain.model.AlarmState
import com.hiosdra.openanchor.domain.model.AnchorZone
import com.hiosdra.openanchor.domain.model.Position
import org.junit.Assert.*
import org.junit.Test

class PairedDashboardUiStateTest {

    @Test
    fun `default state has correct defaults`() {
        val state = PairedDashboardUiState()
        assertFalse(state.isPaired)
        assertFalse(state.peerConnected)
        assertNull(state.anchorPosition)
        assertNull(state.zone)
        assertNull(state.boatPosition)
        assertEquals(0.0, state.distanceToAnchor, 0.01)
        assertEquals(AlarmState.SAFE, state.alarmState)
        assertEquals(0f, state.gpsAccuracy, 0.01f)
        assertNull(state.sog)
        assertNull(state.cog)
        assertNull(state.batteryLevel)
        assertNull(state.isCharging)
        assertFalse(state.serverRunning)
        assertFalse(state.showDisconnectDialog)
        assertFalse(state.connectionLostWarning)
    }

    @Test
    fun `state with paired info`() {
        val anchorPos = Position(54.35, 18.65)
        val zone = AnchorZone.Circle(anchorPos, 30.0)
        val boatPos = Position(54.36, 18.66)
        val state = PairedDashboardUiState(
            isPaired = true,
            peerConnected = true,
            anchorPosition = anchorPos,
            zone = zone,
            boatPosition = boatPos,
            distanceToAnchor = 25.0,
            alarmState = AlarmState.WARNING,
            gpsAccuracy = 5.0f,
            sog = 2.5,
            cog = 180.0,
            batteryLevel = 0.85,
            isCharging = false,
            serverRunning = true
        )
        assertTrue(state.isPaired)
        assertTrue(state.peerConnected)
        assertEquals(anchorPos, state.anchorPosition)
        assertEquals(zone, state.zone)
        assertEquals(boatPos, state.boatPosition)
        assertEquals(25.0, state.distanceToAnchor, 0.01)
        assertEquals(AlarmState.WARNING, state.alarmState)
        assertEquals(5.0f, state.gpsAccuracy, 0.01f)
        assertEquals(2.5, state.sog!!, 0.01)
        assertEquals(180.0, state.cog!!, 0.01)
        assertEquals(0.85, state.batteryLevel!!, 0.01)
        assertFalse(state.isCharging!!)
        assertTrue(state.serverRunning)
    }

    @Test
    fun `state with disconnect dialog`() {
        val state = PairedDashboardUiState(showDisconnectDialog = true)
        assertTrue(state.showDisconnectDialog)
    }

    @Test
    fun `state with connection lost warning`() {
        val state = PairedDashboardUiState(connectionLostWarning = true)
        assertTrue(state.connectionLostWarning)
    }

    @Test
    fun `copy modifies specified fields`() {
        val state = PairedDashboardUiState(isPaired = true)
        val updated = state.copy(peerConnected = true)
        assertTrue(updated.isPaired)
        assertTrue(updated.peerConnected)
    }

    @Test
    fun `state with sector zone`() {
        val anchorPos = Position(54.35, 18.65)
        val zone = AnchorZone.SectorWithCircle(
            anchorPos, 30.0, 50.0, 40.0, 45.0, 180.0
        )
        val state = PairedDashboardUiState(zone = zone)
        assertNotNull(state.zone)
        assertTrue(state.zone is AnchorZone.SectorWithCircle)
    }

    @Test
    fun `equality`() {
        val state1 = PairedDashboardUiState(isPaired = true)
        val state2 = PairedDashboardUiState(isPaired = true)
        assertEquals(state1, state2)
    }

    @Test
    fun `inequality`() {
        val state1 = PairedDashboardUiState(isPaired = true)
        val state2 = PairedDashboardUiState(isPaired = false)
        assertNotEquals(state1, state2)
    }
}
