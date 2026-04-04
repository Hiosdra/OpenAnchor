package com.hiosdra.openanchor.network

import android.util.Log
import com.hiosdra.openanchor.domain.model.AlarmState
import com.hiosdra.openanchor.domain.model.AnchorZone
import com.hiosdra.openanchor.domain.model.Position
import io.mockk.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
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

    private lateinit var inboundFlow: MutableSharedFlow<ProtocolMessageParser.InboundMessage>
    private lateinit var connectionEventsFlow: MutableSharedFlow<AnchorWebSocketServer.ConnectionEvent>

    @Before
    fun setup() {
        mockkStatic(Log::class)
        every { Log.i(any(), any()) } returns 0
        every { Log.w(any(), any<String>()) } returns 0
        every { Log.w(any(), any<String>(), any()) } returns 0
        every { Log.e(any(), any()) } returns 0
        every { Log.e(any(), any(), any()) } returns 0

        inboundFlow = MutableSharedFlow(extraBufferCapacity = 64)
        connectionEventsFlow = MutableSharedFlow(extraBufferCapacity = 16)

        wsServer = mockk(relaxed = true) {
            every { inboundMessages } returns inboundFlow
            every { connectionEvents } returns connectionEventsFlow
        }
        parser = mockk(relaxed = true)
        manager = PairedModeManager(wsServer, parser)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
        unmockkStatic(Log::class)
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

    // --- Message handling via inbound flow ---

    private fun TestScope.unconfinedScope(): CoroutineScope =
        CoroutineScope(UnconfinedTestDispatcher(testScheduler) + SupervisorJob())

    @Test
    fun `FULL_SYNC with anchored=true enters paired mode`() = runTest {
        val zone = AnchorZone.Circle(Position(54.35, 18.65), 30.0)
        every { parser.toAnchorZone(any()) } returns zone

        val scope = unconfinedScope()
        val events = mutableListOf<PairedModeManager.PairedEvent>()
        scope.launch { manager.events.collect { events.add(it) } }
        manager.startListening(scope)

        inboundFlow.emit(ProtocolMessageParser.InboundMessage.FullSync(
            FullSyncPayload(
                isAnchored = true,
                anchorPos = LatLng(54.35, 18.65),
                zoneType = "CIRCLE",
                radiusMeters = 30.0,
                chainLengthM = 50.0,
                depthM = 10.0
            )
        ))

        val state = manager.pairedState.value
        assertTrue(state.isPaired)
        assertTrue(state.peerConnected)
        assertEquals(54.35, state.anchorPosition!!.latitude, 0.001)
        assertEquals(18.65, state.anchorPosition!!.longitude, 0.001)
        assertEquals(zone, state.zone)
        assertEquals(50.0, state.chainLengthM!!, 0.01)
        assertEquals(10.0, state.depthM!!, 0.01)

        assertEquals(1, events.size)
        assertTrue(events[0] is PairedModeManager.PairedEvent.EnterPairedMode)
        val enterEvent = events[0] as PairedModeManager.PairedEvent.EnterPairedMode
        assertEquals(zone, enterEvent.zone)
        assertEquals(50.0, enterEvent.chainLengthM!!, 0.01)
        scope.cancel()
    }

    @Test
    fun `FULL_SYNC with anchored=false exits paired mode`() = runTest {
        val scope = unconfinedScope()
        val events = mutableListOf<PairedModeManager.PairedEvent>()
        scope.launch { manager.events.collect { events.add(it) } }
        manager.startListening(scope)

        inboundFlow.emit(ProtocolMessageParser.InboundMessage.FullSync(
            FullSyncPayload(
                isAnchored = false,
                anchorPos = LatLng(54.35, 18.65),
                zoneType = "CIRCLE",
                radiusMeters = 30.0
            )
        ))

        assertFalse(manager.pairedState.value.isPaired)
        assertEquals(1, events.size)
        assertTrue(events[0] is PairedModeManager.PairedEvent.SessionEnded)
        assertEquals("NOT_ANCHORED", (events[0] as PairedModeManager.PairedEvent.SessionEnded).reason)
        scope.cancel()
    }

    @Test
    fun `STATE_UPDATE updates peer telemetry`() = runTest {
        every { parser.parseAlarmState("WARNING") } returns AlarmState.WARNING

        val scope = unconfinedScope()
        manager.startListening(scope)

        inboundFlow.emit(ProtocolMessageParser.InboundMessage.StateUpdate(
            StateUpdatePayload(
                currentPos = LatLng(54.36, 18.66),
                gpsAccuracy = 5.0f,
                distanceToAnchor = 25.0,
                alarmState = "WARNING",
                sog = 2.5,
                cog = 180.0,
                batteryLevel = 0.85,
                isCharging = true
            )
        ))

        val state = manager.pairedState.value
        assertEquals(54.36, state.peerBoatPosition!!.latitude, 0.001)
        assertEquals(18.66, state.peerBoatPosition!!.longitude, 0.001)
        assertEquals(5.0f, state.peerGpsAccuracy, 0.01f)
        assertEquals(25.0, state.peerDistanceToAnchor, 0.01)
        assertEquals(AlarmState.WARNING, state.peerAlarmState)
        assertEquals(2.5, state.peerSog!!, 0.01)
        assertEquals(180.0, state.peerCog!!, 0.01)
        assertEquals(0.85, state.peerBatteryLevel!!, 0.01)
        assertTrue(state.peerIsCharging!!)
        scope.cancel()
    }

    @Test
    fun `STATE_UPDATE with low battery emits LowBatteryWarning`() = runTest {
        every { parser.parseAlarmState(any()) } returns AlarmState.SAFE

        val scope = unconfinedScope()
        val events = mutableListOf<PairedModeManager.PairedEvent>()
        scope.launch { manager.events.collect { events.add(it) } }
        manager.startListening(scope)

        inboundFlow.emit(ProtocolMessageParser.InboundMessage.StateUpdate(
            StateUpdatePayload(
                currentPos = LatLng(54.36, 18.66),
                gpsAccuracy = 5.0f,
                distanceToAnchor = 25.0,
                alarmState = "SAFE",
                batteryLevel = 0.05,
                isCharging = false
            )
        ))

        assertTrue(events.any { it is PairedModeManager.PairedEvent.LowBatteryWarning })
        val warning = events.first { it is PairedModeManager.PairedEvent.LowBatteryWarning }
                as PairedModeManager.PairedEvent.LowBatteryWarning
        assertEquals(0.05, warning.level, 0.01)
        scope.cancel()
    }

    @Test
    fun `STATE_UPDATE with low battery but charging does not emit warning`() = runTest {
        every { parser.parseAlarmState(any()) } returns AlarmState.SAFE

        val scope = unconfinedScope()
        val events = mutableListOf<PairedModeManager.PairedEvent>()
        scope.launch { manager.events.collect { events.add(it) } }
        manager.startListening(scope)

        inboundFlow.emit(ProtocolMessageParser.InboundMessage.StateUpdate(
            StateUpdatePayload(
                currentPos = LatLng(54.36, 18.66),
                gpsAccuracy = 5.0f,
                distanceToAnchor = 25.0,
                alarmState = "SAFE",
                batteryLevel = 0.05,
                isCharging = true
            )
        ))

        assertFalse(events.any { it is PairedModeManager.PairedEvent.LowBatteryWarning })
        scope.cancel()
    }

    @Test
    fun `STATE_UPDATE with normal battery does not emit warning`() = runTest {
        every { parser.parseAlarmState(any()) } returns AlarmState.SAFE

        val scope = unconfinedScope()
        val events = mutableListOf<PairedModeManager.PairedEvent>()
        scope.launch { manager.events.collect { events.add(it) } }
        manager.startListening(scope)

        inboundFlow.emit(ProtocolMessageParser.InboundMessage.StateUpdate(
            StateUpdatePayload(
                currentPos = LatLng(54.36, 18.66),
                gpsAccuracy = 5.0f,
                distanceToAnchor = 25.0,
                alarmState = "SAFE",
                batteryLevel = 0.5,
                isCharging = false
            )
        ))

        assertFalse(events.any { it is PairedModeManager.PairedEvent.LowBatteryWarning })
        scope.cancel()
    }

    @Test
    fun `TRIGGER_ALARM emits AlarmTriggered event`() = runTest {
        every { parser.parseAlarmState("ALARM") } returns AlarmState.ALARM

        val scope = unconfinedScope()
        val events = mutableListOf<PairedModeManager.PairedEvent>()
        scope.launch { manager.events.collect { events.add(it) } }
        manager.startListening(scope)

        inboundFlow.emit(ProtocolMessageParser.InboundMessage.TriggerAlarm(
            TriggerAlarmPayload(
                reason = "OUT_OF_ZONE",
                message = "Boat outside safe zone",
                alarmState = "ALARM"
            )
        ))

        assertEquals(1, events.size)
        val alarm = events[0] as PairedModeManager.PairedEvent.AlarmTriggered
        assertEquals("OUT_OF_ZONE", alarm.reason)
        assertEquals("Boat outside safe zone", alarm.message)
        assertEquals(AlarmState.ALARM, alarm.alarmState)
        scope.cancel()
    }

    @Test
    fun `DISCONNECT message unpairs and emits SessionEnded`() = runTest {
        val scope = unconfinedScope()
        val events = mutableListOf<PairedModeManager.PairedEvent>()
        scope.launch { manager.events.collect { events.add(it) } }
        manager.startListening(scope)

        inboundFlow.emit(ProtocolMessageParser.InboundMessage.Disconnect(
            DisconnectPayload(reason = "SESSION_ENDED")
        ))

        assertFalse(manager.pairedState.value.isPaired)
        assertFalse(manager.pairedState.value.peerConnected)
        assertEquals(1, events.size)
        assertEquals("SESSION_ENDED", (events[0] as PairedModeManager.PairedEvent.SessionEnded).reason)
        scope.cancel()
    }

    @Test
    fun `PING message is handled without crash`() = runTest {
        val scope = unconfinedScope()
        manager.startListening(scope)

        inboundFlow.emit(ProtocolMessageParser.InboundMessage.Ping(System.currentTimeMillis()))
        // No exception = pass; Ping is handled in WS server for heartbeat
        scope.cancel()
    }

    @Test
    fun `Unknown message is handled without crash`() = runTest {
        val scope = unconfinedScope()
        manager.startListening(scope)

        inboundFlow.emit(ProtocolMessageParser.InboundMessage.Unknown("WEIRD_TYPE"))
        // No exception = pass
        scope.cancel()
    }

    // --- Connection event handling ---

    @Test
    fun `CLIENT_CONNECTED event sets peerConnected`() = runTest {
        val scope = unconfinedScope()
        manager.startListening(scope)

        connectionEventsFlow.emit(AnchorWebSocketServer.ConnectionEvent.CLIENT_CONNECTED)

        assertTrue(manager.pairedState.value.peerConnected)
        scope.cancel()
    }

    @Test
    fun `CLIENT_DISCONNECTED when paired emits HeartbeatTimeout`() = runTest {
        val zone = AnchorZone.Circle(Position(54.35, 18.65), 30.0)
        every { parser.toAnchorZone(any()) } returns zone

        val scope = unconfinedScope()
        val events = mutableListOf<PairedModeManager.PairedEvent>()
        scope.launch { manager.events.collect { events.add(it) } }
        manager.startListening(scope)

        // First enter paired mode
        inboundFlow.emit(ProtocolMessageParser.InboundMessage.FullSync(
            FullSyncPayload(
                isAnchored = true,
                anchorPos = LatLng(54.35, 18.65),
                zoneType = "CIRCLE",
                radiusMeters = 30.0
            )
        ))
        assertTrue(manager.pairedState.value.isPaired)

        // Then client disconnects
        connectionEventsFlow.emit(AnchorWebSocketServer.ConnectionEvent.CLIENT_DISCONNECTED)

        assertFalse(manager.pairedState.value.peerConnected)
        assertTrue(events.any { it is PairedModeManager.PairedEvent.HeartbeatTimeout })
        scope.cancel()
    }

    @Test
    fun `CLIENT_DISCONNECTED when not paired does not emit HeartbeatTimeout`() = runTest {
        val scope = unconfinedScope()
        val events = mutableListOf<PairedModeManager.PairedEvent>()
        scope.launch { manager.events.collect { events.add(it) } }
        manager.startListening(scope)

        connectionEventsFlow.emit(AnchorWebSocketServer.ConnectionEvent.CLIENT_DISCONNECTED)

        assertFalse(manager.pairedState.value.peerConnected)
        assertFalse(events.any { it is PairedModeManager.PairedEvent.HeartbeatTimeout })
        scope.cancel()
    }

    @Test
    fun `HEARTBEAT_TIMEOUT event sets peerConnected false and emits event`() = runTest {
        val scope = unconfinedScope()
        val events = mutableListOf<PairedModeManager.PairedEvent>()
        scope.launch { manager.events.collect { events.add(it) } }
        manager.startListening(scope)

        connectionEventsFlow.emit(AnchorWebSocketServer.ConnectionEvent.HEARTBEAT_TIMEOUT)

        assertFalse(manager.pairedState.value.peerConnected)
        assertTrue(events.any { it is PairedModeManager.PairedEvent.HeartbeatTimeout })
        scope.cancel()
    }

    @Test
    fun `startListening twice cancels previous collection`() = runTest {
        val scope = unconfinedScope()
        manager.startListening(scope)

        // Start again - should cancel previous
        manager.startListening(scope)

        // Still works - emit and verify
        connectionEventsFlow.emit(AnchorWebSocketServer.ConnectionEvent.CLIENT_CONNECTED)
        assertTrue(manager.pairedState.value.peerConnected)
        scope.cancel()
    }
}
