package com.hiosdra.openanchor.network

import com.hiosdra.openanchor.domain.model.AlarmState
import com.hiosdra.openanchor.domain.model.Position
import org.junit.Assert.*
import org.junit.Test

class ClientModeStateTest {

    @Test
    fun `ClientModeState default values`() {
        val state = ClientModeManager.ClientModeState()
        assertFalse(state.isActive)
        assertFalse(state.isConnected)
        assertNull(state.serverUrl)
        assertNull(state.anchorPosition)
        assertNull(state.zone)
        assertNull(state.chainLengthM)
        assertNull(state.depthM)
        assertNull(state.boatPosition)
        assertEquals(0.0, state.distanceToAnchor, 0.01)
        assertEquals(AlarmState.SAFE, state.alarmState)
        assertEquals(0f, state.gpsAccuracy, 0.01f)
        assertNull(state.sog)
        assertNull(state.cog)
        assertNull(state.serverGpsReport)
        assertFalse(state.serverDriftDetected)
    }

    @Test
    fun `ClientModeState copy preserves values`() {
        val state = ClientModeManager.ClientModeState(
            isActive = true,
            isConnected = true,
            serverUrl = "ws://test:8080"
        )
        val copied = state.copy(isConnected = false)
        assertTrue(copied.isActive)
        assertFalse(copied.isConnected)
        assertEquals("ws://test:8080", copied.serverUrl)
    }

    @Test
    fun `ClientModeState with full telemetry`() {
        val pos = Position(54.35, 18.65)
        val state = ClientModeManager.ClientModeState(
            boatPosition = pos,
            distanceToAnchor = 25.0,
            alarmState = AlarmState.ALARM,
            gpsAccuracy = 3.5f,
            sog = 5.0,
            cog = 270.0
        )
        assertEquals(pos, state.boatPosition)
        assertEquals(25.0, state.distanceToAnchor, 0.01)
        assertEquals(AlarmState.ALARM, state.alarmState)
        assertEquals(3.5f, state.gpsAccuracy, 0.01f)
        assertEquals(5.0, state.sog!!, 0.01)
        assertEquals(270.0, state.cog!!, 0.01)
    }

    @Test
    fun `ClientModeState with server GPS report`() {
        val payload = AndroidGpsReportPayload(
            pos = LatLng(54.35, 18.65),
            accuracy = 3.0f,
            distanceToAnchor = 15.0,
            zoneCheckResult = "INSIDE",
            alarmState = "SAFE",
            driftDetected = true
        )
        val state = ClientModeManager.ClientModeState(
            serverGpsReport = payload,
            serverDriftDetected = true
        )
        assertEquals(payload, state.serverGpsReport)
        assertTrue(state.serverDriftDetected)
    }

    @Test
    fun `ClientModeState equality`() {
        val state1 = ClientModeManager.ClientModeState(isActive = true)
        val state2 = ClientModeManager.ClientModeState(isActive = true)
        assertEquals(state1, state2)
    }

    @Test
    fun `ClientModeEvent types`() {
        val connected = ClientModeManager.ClientModeEvent.Connected("ws://test:8080")
        assertTrue(connected is ClientModeManager.ClientModeEvent)
        assertEquals("ws://test:8080", connected.serverUrl)

        val disconnected = ClientModeManager.ClientModeEvent.Disconnected
        assertTrue(disconnected is ClientModeManager.ClientModeEvent)

        val timeout = ClientModeManager.ClientModeEvent.HeartbeatTimeout
        assertTrue(timeout is ClientModeManager.ClientModeEvent)

        val command = ClientModeManager.ClientModeEvent.ServerCommand("MUTE_ALARM")
        assertEquals("MUTE_ALARM", command.command)

        val gpsPayload = AndroidGpsReportPayload(
            pos = LatLng(54.35, 18.65),
            accuracy = 3.0f,
            distanceToAnchor = 15.0,
            zoneCheckResult = "INSIDE",
            alarmState = "SAFE"
        )
        val gpsReport = ClientModeManager.ClientModeEvent.ServerGpsReport(gpsPayload)
        assertEquals(gpsPayload, gpsReport.payload)
    }
}
