package com.hiosdra.openanchor.ui.client

import com.hiosdra.openanchor.domain.model.AlarmState
import org.junit.Assert.*
import org.junit.Test

class ClientDashboardUiStateTest {

    @Test
    fun `default state has correct defaults`() {
        val state = ClientDashboardUiState()
        assertFalse(state.isConnected)
        assertNull(state.serverUrl)
        assertEquals(0.0, state.anchorLat, 0.01)
        assertEquals(0.0, state.anchorLng, 0.01)
        assertEquals(0.0, state.boatLat, 0.01)
        assertEquals(0.0, state.boatLng, 0.01)
        assertEquals(0.0, state.distanceToAnchor, 0.01)
        assertEquals(AlarmState.SAFE, state.alarmState)
        assertEquals(0f, state.gpsAccuracy, 0.01f)
        assertNull(state.sog)
        assertNull(state.cog)
        assertEquals(-1, state.localBatteryLevel)
        assertFalse(state.localBatteryCharging)
        assertNull(state.serverGpsReport)
        assertFalse(state.serverDriftDetected)
        assertNull(state.serverBatteryLevel)
        assertNull(state.serverIsCharging)
        assertEquals(0, state.reconnectAttempt)
        assertEquals(0L, state.lastHeartbeatAge)
        assertFalse(state.showDisconnectDialog)
    }

    @Test
    fun `state with connection info`() {
        val state = ClientDashboardUiState(
            isConnected = true,
            serverUrl = "ws://192.168.1.1:8080",
            anchorLat = 54.35,
            anchorLng = 18.65,
            boatLat = 54.36,
            boatLng = 18.66,
            distanceToAnchor = 25.0,
            alarmState = AlarmState.CAUTION,
            gpsAccuracy = 3.5f
        )
        assertTrue(state.isConnected)
        assertEquals("ws://192.168.1.1:8080", state.serverUrl)
        assertEquals(54.35, state.anchorLat, 0.01)
        assertEquals(25.0, state.distanceToAnchor, 0.01)
        assertEquals(AlarmState.CAUTION, state.alarmState)
    }

    @Test
    fun `state with server peer info`() {
        val state = ClientDashboardUiState(
            serverBatteryLevel = 85,
            serverIsCharging = true,
            serverDriftDetected = true
        )
        assertEquals(85, state.serverBatteryLevel)
        assertTrue(state.serverIsCharging!!)
        assertTrue(state.serverDriftDetected)
    }

    @Test
    fun `state with disconnect dialog`() {
        val state = ClientDashboardUiState(showDisconnectDialog = true)
        assertTrue(state.showDisconnectDialog)
    }

    @Test
    fun `copy modifies specified fields`() {
        val state = ClientDashboardUiState()
        val updated = state.copy(isConnected = true, alarmState = AlarmState.ALARM)
        assertTrue(updated.isConnected)
        assertEquals(AlarmState.ALARM, updated.alarmState)
        assertNull(updated.serverUrl)
    }

    @Test
    fun `state with speed and course`() {
        val state = ClientDashboardUiState(sog = 5.5, cog = 270.0)
        assertEquals(5.5, state.sog!!, 0.01)
        assertEquals(270.0, state.cog!!, 0.01)
    }

    @Test
    fun `state with reconnect info`() {
        val state = ClientDashboardUiState(
            reconnectAttempt = 3,
            lastHeartbeatAge = 5000L
        )
        assertEquals(3, state.reconnectAttempt)
        assertEquals(5000L, state.lastHeartbeatAge)
    }

    @Test
    fun `equality`() {
        val state1 = ClientDashboardUiState(isConnected = true)
        val state2 = ClientDashboardUiState(isConnected = true)
        assertEquals(state1, state2)
    }
}
