package com.hiosdra.openanchor.network

import org.junit.Assert.*
import org.junit.Test

class HotspotStateTest {

    @Test
    fun `default HotspotState has correct defaults`() {
        val state = HotspotManager.HotspotState()
        assertFalse(state.isActive)
        assertNull(state.ssid)
        assertNull(state.password)
        assertNull(state.ipAddress)
        assertNull(state.errorMessage)
    }

    @Test
    fun `HotspotState with active hotspot`() {
        val state = HotspotManager.HotspotState(
            isActive = true,
            ssid = "OpenAnchor-1234",
            password = "secret123",
            ipAddress = "192.168.43.1"
        )
        assertTrue(state.isActive)
        assertEquals("OpenAnchor-1234", state.ssid)
        assertEquals("secret123", state.password)
        assertEquals("192.168.43.1", state.ipAddress)
        assertNull(state.errorMessage)
    }

    @Test
    fun `HotspotState with error`() {
        val state = HotspotManager.HotspotState(
            errorMessage = "Permission denied"
        )
        assertFalse(state.isActive)
        assertEquals("Permission denied", state.errorMessage)
    }

    @Test
    fun `HotspotState copy modifies fields`() {
        val state = HotspotManager.HotspotState(
            isActive = true,
            ssid = "TestSSID"
        )
        val updated = state.copy(password = "newpass")
        assertTrue(updated.isActive)
        assertEquals("TestSSID", updated.ssid)
        assertEquals("newpass", updated.password)
    }

    @Test
    fun `HotspotState equality`() {
        val state1 = HotspotManager.HotspotState(isActive = true, ssid = "Test")
        val state2 = HotspotManager.HotspotState(isActive = true, ssid = "Test")
        assertEquals(state1, state2)
    }

    @Test
    fun `HotspotState inequality`() {
        val state1 = HotspotManager.HotspotState(ssid = "Test1")
        val state2 = HotspotManager.HotspotState(ssid = "Test2")
        assertNotEquals(state1, state2)
    }

    @Test
    fun `HotspotState with all null optional fields`() {
        val state = HotspotManager.HotspotState(isActive = true)
        assertTrue(state.isActive)
        assertNull(state.ssid)
        assertNull(state.password)
        assertNull(state.ipAddress)
        assertNull(state.errorMessage)
    }
}
