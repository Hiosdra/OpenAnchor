package com.hiosdra.openanchor.service

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.hiosdra.openanchor.domain.model.AlarmState
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class AnchorMonitorServiceTest {

    private lateinit var context: Context

    @Before
    fun setUp() {
        context = ApplicationProvider.getApplicationContext()
    }

    // ========== Companion object - intent factories ==========

    @Test
    fun `startIntent has ACTION_START action and session id`() {
        val intent = AnchorMonitorService.startIntent(context, 42L)
        assertEquals(AnchorMonitorService.ACTION_START, intent.action)
        assertEquals(42L, intent.getLongExtra(AnchorMonitorService.EXTRA_SESSION_ID, -1))
    }

    @Test
    fun `stopIntent has ACTION_STOP action`() {
        val intent = AnchorMonitorService.stopIntent(context)
        assertEquals(AnchorMonitorService.ACTION_STOP, intent.action)
    }

    @Test
    fun `startServerIntent has ACTION_START_SERVER action`() {
        val intent = AnchorMonitorService.startServerIntent(context)
        assertEquals(AnchorMonitorService.ACTION_START_SERVER, intent.action)
    }

    @Test
    fun `stopServerIntent has ACTION_STOP_SERVER action`() {
        val intent = AnchorMonitorService.stopServerIntent(context)
        assertEquals(AnchorMonitorService.ACTION_STOP_SERVER, intent.action)
    }

    @Test
    fun `startClientIntent has ACTION_START_CLIENT action and ws url`() {
        val intent = AnchorMonitorService.startClientIntent(context, "ws://192.168.1.1:8080")
        assertEquals(AnchorMonitorService.ACTION_START_CLIENT, intent.action)
        assertEquals("ws://192.168.1.1:8080", intent.getStringExtra(AnchorMonitorService.EXTRA_WS_URL))
    }

    @Test
    fun `stopClientIntent has ACTION_STOP_CLIENT action`() {
        val intent = AnchorMonitorService.stopClientIntent(context)
        assertEquals(AnchorMonitorService.ACTION_STOP_CLIENT, intent.action)
    }

    // ========== Companion object - constants ==========

    @Test
    fun `CHANNEL_ID constant value`() {
        assertEquals("anchor_monitor", AnchorMonitorService.CHANNEL_ID)
    }

    @Test
    fun `NOTIFICATION_ID constant value`() {
        assertEquals(1, AnchorMonitorService.NOTIFICATION_ID)
    }

    @Test
    fun `action constants are distinct`() {
        val actions = setOf(
            AnchorMonitorService.ACTION_START,
            AnchorMonitorService.ACTION_STOP,
            AnchorMonitorService.ACTION_START_SERVER,
            AnchorMonitorService.ACTION_STOP_SERVER,
            AnchorMonitorService.ACTION_START_CLIENT,
            AnchorMonitorService.ACTION_STOP_CLIENT
        )
        assertEquals(6, actions.size)
    }

    // ========== MonitorState defaults ==========

    @Test
    fun `default MonitorState is inactive and safe`() {
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
        assertFalse(state.isClientMode)
    }

    @Test
    fun `MonitorState copy updates specific fields`() {
        val state = MonitorState()
        val updated = state.copy(
            isActive = true,
            alarmState = AlarmState.ALARM,
            distanceToAnchor = 75.5,
            gpsSignalLost = true
        )
        assertTrue(updated.isActive)
        assertEquals(AlarmState.ALARM, updated.alarmState)
        assertEquals(75.5, updated.distanceToAnchor, 0.001)
        assertTrue(updated.gpsSignalLost)
        // Unchanged fields
        assertNull(updated.sessionId)
        assertFalse(updated.isPairedMode)
    }

    @Test
    fun `MonitorState paired mode fields`() {
        val state = MonitorState(
            isPairedMode = true,
            peerConnected = true,
            peerBatteryLevel = 0.85,
            peerIsCharging = false,
            sog = 2.5,
            cog = 180.0
        )
        assertTrue(state.isPairedMode)
        assertTrue(state.peerConnected)
        assertEquals(0.85, state.peerBatteryLevel!!, 0.001)
        assertEquals(false, state.peerIsCharging)
        assertEquals(2.5, state.sog!!, 0.001)
        assertEquals(180.0, state.cog!!, 0.001)
    }

    @Test
    fun `MonitorState client mode fields`() {
        val state = MonitorState(isClientMode = true, peerConnected = true)
        assertTrue(state.isClientMode)
        assertTrue(state.peerConnected)
    }

    @Test
    fun `MonitorState battery fields`() {
        val state = MonitorState(localBatteryLevel = 42, localBatteryCharging = true)
        assertEquals(42, state.localBatteryLevel)
        assertTrue(state.localBatteryCharging)
    }

    @Test
    fun `MonitorState battery defaults`() {
        val state = MonitorState()
        assertEquals(-1, state.localBatteryLevel)
        assertFalse(state.localBatteryCharging)
    }
}
