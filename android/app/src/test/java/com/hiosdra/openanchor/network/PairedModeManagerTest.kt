package com.hiosdra.openanchor.network

import com.hiosdra.openanchor.domain.model.AlarmState
import com.hiosdra.openanchor.domain.model.AnchorZone
import com.hiosdra.openanchor.domain.model.Position
import io.mockk.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class PairedModeManagerTest {

    private lateinit var wsServer: AnchorWebSocketServer
    private lateinit var parser: ProtocolMessageParser
    private lateinit var manager: PairedModeManager

    @Before
    fun setup() {
        wsServer = mockk(relaxed = true) {
            every { inboundMessages } returns MutableSharedFlow()
            every { connectionEvents } returns MutableSharedFlow()
        }
        parser = mockk(relaxed = true)
        manager = PairedModeManager(wsServer, parser)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `initial state is not paired`() {
        val state = manager.pairedState.value
        assertFalse(state.isPaired)
        assertFalse(state.peerConnected)
        assertNull(state.anchorPosition)
        assertNull(state.zone)
    }

    @Test
    fun `stopListening resets state`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        manager.startListening(backgroundScope)
        advanceUntilIdle()
        manager.stopListening()
        assertFalse(manager.pairedState.value.isPaired)
        assertFalse(manager.pairedState.value.peerConnected)
    }

    @Test
    fun `sendMuteAlarm calls server`() = runTest {
        manager.sendMuteAlarm()
        coVerify { wsServer.sendCommand("MUTE_ALARM") }
    }

    @Test
    fun `sendDismissAlarm calls server`() = runTest {
        manager.sendDismissAlarm()
        coVerify { wsServer.sendCommand("DISMISS_ALARM") }
    }

    @Test
    fun `sendGpsReport calls server`() = runTest {
        val pos = Position(54.35, 18.65)
        manager.sendGpsReport(
            position = pos,
            distanceToAnchor = 15.0,
            zoneCheckResult = com.hiosdra.openanchor.domain.geometry.ZoneCheckResult.INSIDE,
            alarmState = AlarmState.SAFE,
            batteryLevel = 85,
            isCharging = false,
            driftDetected = false
        )
        coVerify {
            wsServer.sendGpsReport(
                pos, 15.0,
                com.hiosdra.openanchor.domain.geometry.ZoneCheckResult.INSIDE,
                AlarmState.SAFE, 85, false, false, null, null
            )
        }
    }

    @Test
    fun `sendGpsReport with drift info`() = runTest {
        val pos = Position(54.35, 18.65)
        manager.sendGpsReport(
            position = pos,
            distanceToAnchor = 15.0,
            zoneCheckResult = com.hiosdra.openanchor.domain.geometry.ZoneCheckResult.OUTSIDE,
            alarmState = AlarmState.ALARM,
            driftDetected = true,
            driftBearingDeg = 180.0,
            driftSpeedMps = 0.5
        )
        coVerify {
            wsServer.sendGpsReport(
                pos, 15.0,
                com.hiosdra.openanchor.domain.geometry.ZoneCheckResult.OUTSIDE,
                AlarmState.ALARM, null, null, true, 180.0, 0.5
            )
        }
    }

    @Test
    fun `PairedState defaults`() {
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
    fun `PairedState with full data`() {
        val pos = Position(54.35, 18.65)
        val zone = AnchorZone.Circle(pos, 30.0)
        val state = PairedModeManager.PairedState(
            isPaired = true,
            peerConnected = true,
            anchorPosition = pos,
            zone = zone,
            chainLengthM = 50.0,
            depthM = 10.0,
            peerBoatPosition = Position(54.36, 18.66),
            peerDistanceToAnchor = 25.0,
            peerAlarmState = AlarmState.WARNING,
            peerGpsAccuracy = 5.0f,
            peerSog = 2.5,
            peerCog = 180.0,
            peerBatteryLevel = 0.85,
            peerIsCharging = true
        )
        assertTrue(state.isPaired)
        assertTrue(state.peerConnected)
        assertEquals(pos, state.anchorPosition)
        assertEquals(zone, state.zone)
        assertEquals(50.0, state.chainLengthM!!, 0.01)
        assertEquals(25.0, state.peerDistanceToAnchor, 0.01)
        assertEquals(AlarmState.WARNING, state.peerAlarmState)
        assertEquals(0.85, state.peerBatteryLevel!!, 0.01)
    }

    @Test
    fun `PairedState copy preserves values`() {
        val state = PairedModeManager.PairedState(isPaired = true, peerConnected = true)
        val copied = state.copy(peerConnected = false)
        assertTrue(copied.isPaired)
        assertFalse(copied.peerConnected)
    }

    @Test
    fun `PairedEvent types instantiation`() {
        val pos = Position(54.35, 18.65)
        val zone = AnchorZone.Circle(pos, 30.0)

        val enter = PairedModeManager.PairedEvent.EnterPairedMode(zone, pos, 50.0, 10.0)
        assertEquals(zone, enter.zone)
        assertEquals(pos, enter.anchorPosition)

        val exit = PairedModeManager.PairedEvent.ExitPairedMode
        assertTrue(exit is PairedModeManager.PairedEvent)

        val alarm = PairedModeManager.PairedEvent.AlarmTriggered("ZONE", "Outside", AlarmState.ALARM)
        assertEquals("ZONE", alarm.reason)
        assertEquals(AlarmState.ALARM, alarm.alarmState)

        val timeout = PairedModeManager.PairedEvent.HeartbeatTimeout
        assertTrue(timeout is PairedModeManager.PairedEvent)

        val ended = PairedModeManager.PairedEvent.SessionEnded("USER")
        assertEquals("USER", ended.reason)

        val battery = PairedModeManager.PairedEvent.LowBatteryWarning(0.05)
        assertEquals(0.05, battery.level, 0.01)
    }
}
