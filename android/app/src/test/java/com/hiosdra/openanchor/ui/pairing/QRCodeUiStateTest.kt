package com.hiosdra.openanchor.ui.pairing

import org.junit.Assert.*
import org.junit.Test

class QRCodeUiStateTest {

    @Test
    fun `default state has correct defaults`() {
        val state = QRCodeUiState()
        assertEquals(PairingStep.IDLE, state.step)
        assertNull(state.hotspotSsid)
        assertNull(state.hotspotPassword)
        assertNull(state.wsUrl)
        assertNull(state.qrBitmap)
        assertFalse(state.serverRunning)
        assertFalse(state.clientConnected)
        assertNull(state.errorMessage)
        assertFalse(state.useExistingNetwork)
    }

    @Test
    fun `state with hotspot info`() {
        val state = QRCodeUiState(
            step = PairingStep.HOTSPOT_READY,
            hotspotSsid = "OpenAnchor-1234",
            hotspotPassword = "secret123"
        )
        assertEquals(PairingStep.HOTSPOT_READY, state.step)
        assertEquals("OpenAnchor-1234", state.hotspotSsid)
        assertEquals("secret123", state.hotspotPassword)
    }

    @Test
    fun `state with server running`() {
        val state = QRCodeUiState(
            step = PairingStep.WAITING_FOR_CLIENT,
            serverRunning = true,
            wsUrl = "ws://192.168.43.1:8080"
        )
        assertTrue(state.serverRunning)
        assertEquals("ws://192.168.43.1:8080", state.wsUrl)
    }

    @Test
    fun `state with client connected`() {
        val state = QRCodeUiState(
            step = PairingStep.PAIRED,
            serverRunning = true,
            clientConnected = true
        )
        assertEquals(PairingStep.PAIRED, state.step)
        assertTrue(state.clientConnected)
    }

    @Test
    fun `state with error`() {
        val state = QRCodeUiState(
            step = PairingStep.ERROR,
            errorMessage = "Failed to start hotspot"
        )
        assertEquals(PairingStep.ERROR, state.step)
        assertEquals("Failed to start hotspot", state.errorMessage)
    }

    @Test
    fun `state with existing network`() {
        val state = QRCodeUiState(useExistingNetwork = true)
        assertTrue(state.useExistingNetwork)
    }

    @Test
    fun `PairingStep has all expected values`() {
        val steps = PairingStep.entries
        assertEquals(7, steps.size)
        assertTrue(steps.contains(PairingStep.IDLE))
        assertTrue(steps.contains(PairingStep.STARTING_HOTSPOT))
        assertTrue(steps.contains(PairingStep.HOTSPOT_READY))
        assertTrue(steps.contains(PairingStep.STARTING_SERVER))
        assertTrue(steps.contains(PairingStep.WAITING_FOR_CLIENT))
        assertTrue(steps.contains(PairingStep.PAIRED))
        assertTrue(steps.contains(PairingStep.ERROR))
    }

    @Test
    fun `copy modifies specified fields`() {
        val state = QRCodeUiState(step = PairingStep.IDLE)
        val updated = state.copy(step = PairingStep.PAIRED)
        assertEquals(PairingStep.PAIRED, updated.step)
    }

    @Test
    fun `equality`() {
        val state1 = QRCodeUiState(step = PairingStep.PAIRED)
        val state2 = QRCodeUiState(step = PairingStep.PAIRED)
        assertEquals(state1, state2)
    }
}
