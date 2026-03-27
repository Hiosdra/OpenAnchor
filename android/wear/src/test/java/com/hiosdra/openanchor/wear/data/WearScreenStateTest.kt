package com.hiosdra.openanchor.wear.data

import org.junit.Assert.assertEquals
import org.junit.Test

class WearScreenStateTest {

    @Test
    fun `should return Connecting when not connected and no previous state`() {
        val state = WearMonitorState()
        val result = WearScreenState.from(state, isConnected = false)
        assertEquals(WearScreenState.Connecting, result)
    }

    @Test
    fun `should return Disconnected with last state when not connected but has history`() {
        val state = WearMonitorState(
            isActive = true,
            distanceMeters = 42.0,
            timestamp = 1000L
        )
        val result = WearScreenState.from(state, isConnected = false)
        assertTrue(result is WearScreenState.Disconnected)
        assertEquals(state, (result as WearScreenState.Disconnected).lastKnownState)
    }

    @Test
    fun `should return Connecting when connected but not active`() {
        val state = WearMonitorState(isActive = false)
        val result = WearScreenState.from(state, isConnected = true)
        assertEquals(WearScreenState.Connecting, result)
    }

    @Test
    fun `should return GpsLost when connected active but GPS lost`() {
        val state = WearMonitorState(
            isActive = true,
            alarmState = WearAlarmState.CAUTION,
            distanceMeters = 25.0,
            gpsSignalLost = true,
            timestamp = 5000L
        )
        val result = WearScreenState.from(state, isConnected = true)

        assertTrue(result is WearScreenState.GpsLost)
        val gpsLost = result as WearScreenState.GpsLost
        assertEquals(WearAlarmState.CAUTION, gpsLost.alarmState)
        assertEquals(25.0, gpsLost.lastKnownDistance, 0.01)
        assertEquals(5000L, gpsLost.timestamp)
    }

    @Test
    fun `should return Monitoring when connected active and GPS OK`() {
        val state = WearMonitorState(
            isActive = true,
            alarmState = WearAlarmState.SAFE,
            distanceMeters = 15.0,
            gpsAccuracyMeters = 5f,
            gpsSignalLost = false,
            timestamp = 6000L
        )
        val result = WearScreenState.from(state, isConnected = true)

        assertTrue(result is WearScreenState.Monitoring)
        val monitoring = result as WearScreenState.Monitoring
        assertEquals(WearAlarmState.SAFE, monitoring.alarmState)
        assertEquals(15.0, monitoring.distanceMeters, 0.01)
        assertEquals(5f, monitoring.gpsAccuracyMeters, 0.01f)
    }

    @Test
    fun `should return Monitoring for ALARM state`() {
        val state = WearMonitorState(
            isActive = true,
            alarmState = WearAlarmState.ALARM,
            distanceMeters = 80.0,
            gpsAccuracyMeters = 15f,
            timestamp = 7000L
        )
        val result = WearScreenState.from(state, isConnected = true)

        assertTrue(result is WearScreenState.Monitoring)
        assertEquals(WearAlarmState.ALARM, (result as WearScreenState.Monitoring).alarmState)
    }

    private fun assertTrue(condition: Boolean) {
        org.junit.Assert.assertTrue(condition)
    }
}
