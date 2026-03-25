package com.hiosdra.openanchor.data.battery

import org.junit.Assert.*
import org.junit.Test

class BatteryStateTest {

    @Test
    fun `default BatteryState has correct defaults`() {
        val state = BatteryState()
        assertEquals(-1, state.level)
        assertFalse(state.isCharging)
        assertEquals(0f, state.temperature, 0.01f)
    }

    @Test
    fun `BatteryState with all fields set`() {
        val state = BatteryState(
            level = 85,
            isCharging = true,
            temperature = 25.5f
        )
        assertEquals(85, state.level)
        assertTrue(state.isCharging)
        assertEquals(25.5f, state.temperature, 0.01f)
    }

    @Test
    fun `BatteryState copy modifies specific fields`() {
        val state = BatteryState(level = 50, isCharging = false, temperature = 30f)
        val updated = state.copy(level = 75)
        assertEquals(75, updated.level)
        assertFalse(updated.isCharging)
        assertEquals(30f, updated.temperature, 0.01f)
    }

    @Test
    fun `BatteryState copy changes charging state`() {
        val state = BatteryState(level = 50, isCharging = false)
        val updated = state.copy(isCharging = true)
        assertTrue(updated.isCharging)
        assertEquals(50, updated.level)
    }

    @Test
    fun `BatteryState equality`() {
        val state1 = BatteryState(level = 50, isCharging = true, temperature = 25f)
        val state2 = BatteryState(level = 50, isCharging = true, temperature = 25f)
        assertEquals(state1, state2)
    }

    @Test
    fun `BatteryState inequality on level`() {
        val state1 = BatteryState(level = 50)
        val state2 = BatteryState(level = 75)
        assertNotEquals(state1, state2)
    }

    @Test
    fun `BatteryState with low battery level`() {
        val state = BatteryState(level = 5)
        assertEquals(5, state.level)
    }

    @Test
    fun `BatteryState with full battery`() {
        val state = BatteryState(level = 100, isCharging = true)
        assertEquals(100, state.level)
        assertTrue(state.isCharging)
    }

    @Test
    fun `BatteryState with zero temperature`() {
        val state = BatteryState(temperature = 0f)
        assertEquals(0f, state.temperature, 0.01f)
    }

    @Test
    fun `BatteryState with high temperature`() {
        val state = BatteryState(temperature = 45.5f)
        assertEquals(45.5f, state.temperature, 0.01f)
    }
}
