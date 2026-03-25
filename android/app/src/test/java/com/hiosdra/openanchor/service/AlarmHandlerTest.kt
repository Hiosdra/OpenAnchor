package com.hiosdra.openanchor.service

import com.hiosdra.openanchor.domain.model.AlarmState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class AlarmHandlerTest {

    private lateinit var handler: AlarmHandler

    @Before
    fun setup() {
        handler = AlarmHandler()
    }

    // --- handleAlarmTransition ---

    @Test
    fun `ALARM state starts alarm when not playing`() {
        val result = handler.handleAlarmTransition(AlarmState.ALARM, AlarmState.SAFE, isAlarmPlaying = false)
        assertTrue(result.shouldStartAlarm)
        assertFalse(result.shouldStopAlarm)
        assertTrue(result.shouldIncrementAlarmCount)
    }

    @Test
    fun `ALARM state does not start alarm when already playing`() {
        val result = handler.handleAlarmTransition(AlarmState.ALARM, AlarmState.SAFE, isAlarmPlaying = true)
        assertFalse(result.shouldStartAlarm)
        assertFalse(result.shouldStopAlarm)
        assertFalse(result.shouldIncrementAlarmCount)
    }

    @Test
    fun `ALARM state sends wear trigger when transitioning from non-ALARM`() {
        val result = handler.handleAlarmTransition(AlarmState.ALARM, AlarmState.SAFE, isAlarmPlaying = false)
        assertTrue(result.shouldSendWearTrigger)
    }

    @Test
    fun `ALARM state sends wear trigger when transitioning from WARNING`() {
        val result = handler.handleAlarmTransition(AlarmState.ALARM, AlarmState.WARNING, isAlarmPlaying = false)
        assertTrue(result.shouldSendWearTrigger)
    }

    @Test
    fun `ALARM state does not send wear trigger when already in ALARM`() {
        val result = handler.handleAlarmTransition(AlarmState.ALARM, AlarmState.ALARM, isAlarmPlaying = false)
        assertFalse(result.shouldSendWearTrigger)
    }

    @Test
    fun `SAFE state stops alarm when playing`() {
        val result = handler.handleAlarmTransition(AlarmState.SAFE, AlarmState.ALARM, isAlarmPlaying = true)
        assertFalse(result.shouldStartAlarm)
        assertTrue(result.shouldStopAlarm)
        assertFalse(result.shouldSendWearTrigger)
        assertFalse(result.shouldIncrementAlarmCount)
    }

    @Test
    fun `WARNING state stops alarm when playing`() {
        val result = handler.handleAlarmTransition(AlarmState.WARNING, AlarmState.ALARM, isAlarmPlaying = true)
        assertTrue(result.shouldStopAlarm)
        assertFalse(result.shouldStartAlarm)
    }

    @Test
    fun `SAFE state does not stop alarm when not playing`() {
        val result = handler.handleAlarmTransition(AlarmState.SAFE, AlarmState.ALARM, isAlarmPlaying = false)
        assertFalse(result.shouldStopAlarm)
        assertFalse(result.shouldStartAlarm)
    }

    @Test
    fun `CAUTION state does not start or send wear trigger`() {
        val result = handler.handleAlarmTransition(AlarmState.CAUTION, AlarmState.SAFE, isAlarmPlaying = false)
        assertFalse(result.shouldStartAlarm)
        assertFalse(result.shouldSendWearTrigger)
        assertFalse(result.shouldIncrementAlarmCount)
    }

    // --- handlePairedAlarm: GPS_LOST ---

    @Test
    fun `GPS_LOST starts alarm and sets gpsSignalLost`() {
        val event = PairedAlarmEvent("GPS_LOST", "signal lost", AlarmState.ALARM)
        val result = handler.handlePairedAlarm(event, AlarmState.SAFE, isAlarmPlaying = false)
        assertTrue(result.shouldStartAlarm)
        assertFalse(result.shouldStopAlarm)
        assertTrue(result.shouldSendWearTrigger)
        assertEquals(AlarmState.ALARM, result.newAlarmState)
        assertTrue(result.gpsSignalLost)
        assertEquals("GPS lost on navigation station!", result.notificationText)
    }

    @Test
    fun `GPS_LOST does not start alarm when already playing`() {
        val event = PairedAlarmEvent("GPS_LOST", "signal lost", AlarmState.ALARM)
        val result = handler.handlePairedAlarm(event, AlarmState.ALARM, isAlarmPlaying = true)
        assertFalse(result.shouldStartAlarm)
        assertTrue(result.shouldSendWearTrigger)
        assertTrue(result.gpsSignalLost)
    }

    // --- handlePairedAlarm: LOW_BATTERY ---

    @Test
    fun `LOW_BATTERY starts alarm and sets WARNING state`() {
        val event = PairedAlarmEvent("LOW_BATTERY", "5%", AlarmState.WARNING)
        val result = handler.handlePairedAlarm(event, AlarmState.SAFE, isAlarmPlaying = false)
        assertTrue(result.shouldStartAlarm)
        assertTrue(result.shouldSendWearTrigger)
        assertEquals(AlarmState.WARNING, result.newAlarmState)
        assertFalse(result.gpsSignalLost)
        assertEquals("Tablet battery critical! 5%", result.notificationText)
    }

    @Test
    fun `LOW_BATTERY does not start alarm when already playing`() {
        val event = PairedAlarmEvent("LOW_BATTERY", "3%", AlarmState.WARNING)
        val result = handler.handlePairedAlarm(event, AlarmState.WARNING, isAlarmPlaying = true)
        assertFalse(result.shouldStartAlarm)
        assertFalse(result.shouldStopAlarm)
    }

    // --- handlePairedAlarm: WATCH_TIMER ---

    @Test
    fun `WATCH_TIMER keeps previous alarm state`() {
        val event = PairedAlarmEvent("WATCH_TIMER", "timer expired", AlarmState.SAFE)
        val result = handler.handlePairedAlarm(event, AlarmState.WARNING, isAlarmPlaying = false)
        assertTrue(result.shouldStartAlarm)
        assertTrue(result.shouldSendWearTrigger)
        assertEquals(AlarmState.WARNING, result.newAlarmState)
        assertFalse(result.gpsSignalLost)
        assertEquals("Watch timer: timer expired", result.notificationText)
    }

    @Test
    fun `WATCH_TIMER preserves SAFE state when previous was SAFE`() {
        val event = PairedAlarmEvent("WATCH_TIMER", "done", AlarmState.SAFE)
        val result = handler.handlePairedAlarm(event, AlarmState.SAFE, isAlarmPlaying = false)
        assertEquals(AlarmState.SAFE, result.newAlarmState)
    }

    // --- handlePairedAlarm: other reasons with ALARM state ---

    @Test
    fun `other reason with ALARM state starts alarm and sends wear on transition`() {
        val event = PairedAlarmEvent("ANCHOR_DRAG", "anchor moved", AlarmState.ALARM)
        val result = handler.handlePairedAlarm(event, AlarmState.SAFE, isAlarmPlaying = false)
        assertTrue(result.shouldStartAlarm)
        assertTrue(result.shouldSendWearTrigger)
        assertEquals(AlarmState.ALARM, result.newAlarmState)
        assertFalse(result.gpsSignalLost)
        assertEquals("ALARM: anchor moved", result.notificationText)
    }

    @Test
    fun `other reason with ALARM state does not send wear when already in ALARM`() {
        val event = PairedAlarmEvent("ANCHOR_DRAG", "still moving", AlarmState.ALARM)
        val result = handler.handlePairedAlarm(event, AlarmState.ALARM, isAlarmPlaying = true)
        assertFalse(result.shouldStartAlarm)
        assertFalse(result.shouldSendWearTrigger)
    }

    // --- handlePairedAlarm: other reasons with WARNING state ---

    @Test
    fun `other reason with WARNING state stops alarm when playing`() {
        val event = PairedAlarmEvent("DEPTH_CHANGE", "depth ok", AlarmState.WARNING)
        val result = handler.handlePairedAlarm(event, AlarmState.ALARM, isAlarmPlaying = true)
        assertFalse(result.shouldStartAlarm)
        assertTrue(result.shouldStopAlarm)
        assertFalse(result.shouldSendWearTrigger)
        assertEquals(AlarmState.WARNING, result.newAlarmState)
    }

    @Test
    fun `other reason with WARNING state does not stop alarm when not playing`() {
        val event = PairedAlarmEvent("DEPTH_CHANGE", "depth ok", AlarmState.WARNING)
        val result = handler.handlePairedAlarm(event, AlarmState.SAFE, isAlarmPlaying = false)
        assertFalse(result.shouldStopAlarm)
    }

    // --- handlePairedAlarm: other reasons with SAFE state ---

    @Test
    fun `other reason with SAFE state stops alarm when playing`() {
        val event = PairedAlarmEvent("STATUS_UPDATE", "all clear", AlarmState.SAFE)
        val result = handler.handlePairedAlarm(event, AlarmState.ALARM, isAlarmPlaying = true)
        assertTrue(result.shouldStopAlarm)
        assertFalse(result.shouldStartAlarm)
        assertFalse(result.shouldSendWearTrigger)
        assertEquals(AlarmState.SAFE, result.newAlarmState)
    }

    @Test
    fun `other reason with SAFE state does not stop alarm when not playing`() {
        val event = PairedAlarmEvent("STATUS_UPDATE", "all clear", AlarmState.SAFE)
        val result = handler.handlePairedAlarm(event, AlarmState.SAFE, isAlarmPlaying = false)
        assertFalse(result.shouldStopAlarm)
        assertFalse(result.shouldStartAlarm)
    }

    // --- handleClientEvent ---

    @Test
    fun `Connected sets peerConnected true with no alarm changes`() {
        val result = handler.handleClientEvent(ClientAlarmEvent.Connected("ws://host"), isAlarmPlaying = false)
        assertEquals(true, result.peerConnected)
        assertNull(result.alarmState)
        assertFalse(result.shouldStartAlarm)
        assertFalse(result.shouldStopAlarm)
        assertFalse(result.shouldSendWearTrigger)
        assertEquals("Connected to server", result.notificationText)
    }

    @Test
    fun `Disconnected sets peerConnected false with no alarm changes`() {
        val result = handler.handleClientEvent(ClientAlarmEvent.Disconnected, isAlarmPlaying = true)
        assertEquals(false, result.peerConnected)
        assertNull(result.alarmState)
        assertFalse(result.shouldStartAlarm)
        assertFalse(result.shouldStopAlarm)
        assertFalse(result.shouldSendWearTrigger)
    }

    @Test
    fun `HeartbeatTimeout triggers alarm and sets ALARM state`() {
        val result = handler.handleClientEvent(ClientAlarmEvent.HeartbeatTimeout, isAlarmPlaying = false)
        assertEquals(false, result.peerConnected)
        assertEquals(AlarmState.ALARM, result.alarmState)
        assertTrue(result.shouldStartAlarm)
        assertFalse(result.shouldStopAlarm)
        assertTrue(result.shouldSendWearTrigger)
        assertEquals("Connection lost with server!", result.notificationText)
    }

    @Test
    fun `MuteCommand stops alarm when playing`() {
        val result = handler.handleClientEvent(ClientAlarmEvent.MuteCommand, isAlarmPlaying = true)
        assertNull(result.peerConnected)
        assertNull(result.alarmState)
        assertFalse(result.shouldStartAlarm)
        assertTrue(result.shouldStopAlarm)
        assertNull(result.notificationText)
    }

    @Test
    fun `MuteCommand does not stop alarm when not playing`() {
        val result = handler.handleClientEvent(ClientAlarmEvent.MuteCommand, isAlarmPlaying = false)
        assertFalse(result.shouldStopAlarm)
        assertFalse(result.shouldStartAlarm)
    }

    @Test
    fun `DismissCommand sets SAFE state and stops alarm when playing`() {
        val result = handler.handleClientEvent(ClientAlarmEvent.DismissCommand, isAlarmPlaying = true)
        assertNull(result.peerConnected)
        assertEquals(AlarmState.SAFE, result.alarmState)
        assertFalse(result.shouldStartAlarm)
        assertTrue(result.shouldStopAlarm)
        assertFalse(result.shouldSendWearTrigger)
    }

    @Test
    fun `DismissCommand sets SAFE state and does not stop alarm when not playing`() {
        val result = handler.handleClientEvent(ClientAlarmEvent.DismissCommand, isAlarmPlaying = false)
        assertEquals(AlarmState.SAFE, result.alarmState)
        assertFalse(result.shouldStopAlarm)
    }
}
