package com.hiosdra.openanchor.network

import android.util.Log
import com.hiosdra.openanchor.domain.model.AlarmState
import com.hiosdra.openanchor.domain.model.AnchorZone
import com.hiosdra.openanchor.domain.model.Position
import io.mockk.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.StandardTestDispatcher
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
class ClientModeManagerTest {

    private lateinit var wsClient: AnchorWebSocketClient
    private lateinit var parser: ProtocolMessageParser
    private lateinit var manager: ClientModeManager

    private lateinit var clientStateFlow: MutableStateFlow<AnchorWebSocketClient.ClientState>
    private lateinit var inboundMessages: MutableSharedFlow<AnchorWebSocketClient.ServerMessage>
    private lateinit var connectionEvents: MutableSharedFlow<AnchorWebSocketClient.ClientConnectionEvent>

    @Before
    fun setup() {
        clientStateFlow = MutableStateFlow(AnchorWebSocketClient.ClientState())
        inboundMessages = MutableSharedFlow(extraBufferCapacity = 64)
        connectionEvents = MutableSharedFlow(extraBufferCapacity = 16)

        wsClient = mockk(relaxed = true) {
            every { clientState } returns clientStateFlow
            every { this@mockk.inboundMessages } returns this@ClientModeManagerTest.inboundMessages
            every { this@mockk.connectionEvents } returns this@ClientModeManagerTest.connectionEvents
            every { isConnected } returns false
        }
        parser = mockk(relaxed = true)
        manager = ClientModeManager(wsClient, parser)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `initial state is inactive`() {
        val state = manager.clientModeState.value
        assertFalse(state.isActive)
        assertFalse(state.isConnected)
        assertNull(state.serverUrl)
        assertNull(state.anchorPosition)
        assertNull(state.zone)
    }

    @Test
    fun `connect sets active state and calls wsClient`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        manager.connect("ws://192.168.1.1:8080", backgroundScope)
        advanceUntilIdle()
        assertTrue(manager.clientModeState.value.isActive)
        verify { wsClient.connect("ws://192.168.1.1:8080", any()) }
    }

    @Test
    fun `disconnect resets state`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        manager.connect("ws://192.168.1.1:8080", backgroundScope)
        advanceUntilIdle()
        manager.disconnect()
        advanceUntilIdle()
        assertFalse(manager.clientModeState.value.isActive)
        verify { wsClient.disconnect("USER_DISCONNECT") }
    }

    @Test
    fun `disconnect with custom reason`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        manager.connect("ws://test:8080", backgroundScope)
        advanceUntilIdle()
        manager.disconnect("SESSION_END")
        verify { wsClient.disconnect("SESSION_END") }
    }

    @Test
    fun `setZoneConfiguration updates state`() {
        val anchor = Position(54.35, 18.65)
        val zone = AnchorZone.Circle(anchor, 30.0)
        manager.setZoneConfiguration(anchor, zone, 50.0, 10.0)
        val state = manager.clientModeState.value
        assertEquals(anchor, state.anchorPosition)
        assertEquals(zone, state.zone)
        assertEquals(50.0, state.chainLengthM!!, 0.01)
        assertEquals(10.0, state.depthM!!, 0.01)
    }

    @Test
    fun `setZoneConfiguration sends fullSync when connected`() {
        every { wsClient.isConnected } returns true
        val anchor = Position(54.35, 18.65)
        val zone = AnchorZone.Circle(anchor, 30.0)
        manager.setZoneConfiguration(anchor, zone)
        verify { wsClient.sendFullSync(any()) }
    }

    @Test
    fun `setZoneConfiguration does not send when disconnected`() {
        every { wsClient.isConnected } returns false
        val anchor = Position(54.35, 18.65)
        val zone = AnchorZone.Circle(anchor, 30.0)
        manager.setZoneConfiguration(anchor, zone)
        verify(exactly = 0) { wsClient.sendFullSync(any()) }
    }

    @Test
    fun `setZoneConfiguration with SectorWithCircle zone`() {
        every { wsClient.isConnected } returns true
        val anchor = Position(54.35, 18.65)
        val zone = AnchorZone.SectorWithCircle(
            anchor, 30.0, bufferRadiusMeters = 50.0,
            sectorRadiusMeters = 40.0, sectorHalfAngleDeg = 45.0, sectorBearingDeg = 180.0
        )
        manager.setZoneConfiguration(anchor, zone, 60.0, 12.0)
        verify { wsClient.sendFullSync(match { it.zoneType == "SECTOR" && it.sector != null }) }
    }

    @Test
    fun `updateTelemetry updates local state`() {
        val pos = Position(54.36, 18.66, 5.0f)
        manager.updateTelemetry(pos, 25.0, AlarmState.WARNING, sog = 2.5, cog = 180.0)
        val state = manager.clientModeState.value
        assertEquals(pos, state.boatPosition)
        assertEquals(25.0, state.distanceToAnchor, 0.01)
        assertEquals(AlarmState.WARNING, state.alarmState)
        assertEquals(5.0f, state.gpsAccuracy, 0.01f)
        assertEquals(2.5, state.sog!!, 0.01)
        assertEquals(180.0, state.cog!!, 0.01)
    }

    @Test
    fun `updateTelemetry sends state update when connected`() {
        every { wsClient.isConnected } returns true
        manager.updateTelemetry(Position(54.36, 18.66), 25.0, AlarmState.SAFE)
        verify { wsClient.sendStateUpdate(any()) }
    }

    @Test
    fun `updateTelemetry does not send when disconnected`() {
        every { wsClient.isConnected } returns false
        manager.updateTelemetry(Position(54.36, 18.66), 25.0, AlarmState.SAFE)
        verify(exactly = 0) { wsClient.sendStateUpdate(any()) }
    }

    @Test
    fun `triggerAlarm sends when connected`() {
        every { wsClient.isConnected } returns true
        manager.triggerAlarm("ZONE_VIOLATION", "Boat outside zone", AlarmState.ALARM)
        verify { wsClient.sendTriggerAlarm(any()) }
    }

    @Test
    fun `triggerAlarm sends even when disconnected but returns false`() {
        every { wsClient.isConnected } returns false
        every { wsClient.sendTriggerAlarm(any()) } returns false
        manager.triggerAlarm("ZONE_VIOLATION", "Test", AlarmState.ALARM)
        verify { wsClient.sendTriggerAlarm(any()) }
    }

    @Test
    fun `setZoneConfiguration without optional params`() {
        val anchor = Position(54.35, 18.65)
        val zone = AnchorZone.Circle(anchor, 30.0)
        manager.setZoneConfiguration(anchor, zone)
        assertNull(manager.clientModeState.value.chainLengthM)
        assertNull(manager.clientModeState.value.depthM)
    }

    @Test
    fun `ClientModeState defaults`() {
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

    // --- handleServerMessage ---

    @Test
    fun `handles GpsReport from server`() = runTest {
        val unconfinedDispatcher = UnconfinedTestDispatcher(testScheduler)
        Dispatchers.setMain(unconfinedDispatcher)
        val scope = CoroutineScope(unconfinedDispatcher)

        manager.connect("ws://192.168.1.1:8080", scope)

        val gpsPayload = AndroidGpsReportPayload(
            pos = LatLng(54.35, 18.65),
            accuracy = 5f,
            distanceToAnchor = 20.0,
            zoneCheckResult = "INSIDE",
            alarmState = "SAFE",
            driftDetected = true
        )
        inboundMessages.emit(AnchorWebSocketClient.ServerMessage.GpsReport(gpsPayload))

        val state = manager.clientModeState.value
        assertEquals(gpsPayload, state.serverGpsReport)
        assertTrue(state.serverDriftDetected)
        scope.cancel()
    }

    @Test
    fun `handles ActionCommand from server`() = runTest {
        val unconfinedDispatcher = UnconfinedTestDispatcher(testScheduler)
        Dispatchers.setMain(unconfinedDispatcher)
        val scope = CoroutineScope(unconfinedDispatcher)

        val events = mutableListOf<ClientModeManager.ClientModeEvent>()
        val collectJob = scope.launch { manager.events.collect { events.add(it) } }

        manager.connect("ws://192.168.1.1:8080", scope)

        inboundMessages.emit(
            AnchorWebSocketClient.ServerMessage.ActionCommand(
                ActionCommandPayload("MUTE_ALARM")
            )
        )

        assertTrue(events.any { it is ClientModeManager.ClientModeEvent.ServerCommand && it.command == "MUTE_ALARM" })
        collectJob.cancel()
        scope.cancel()
    }

    @Test
    fun `handles Ping from server without state change`() = runTest {
        val unconfinedDispatcher = UnconfinedTestDispatcher(testScheduler)
        Dispatchers.setMain(unconfinedDispatcher)
        val scope = CoroutineScope(unconfinedDispatcher)

        manager.connect("ws://192.168.1.1:8080", scope)

        inboundMessages.emit(AnchorWebSocketClient.ServerMessage.Ping(System.currentTimeMillis()))

        assertNull(manager.clientModeState.value.serverGpsReport)
        scope.cancel()
    }

    // --- handleConnectionEvent ---

    @Test
    fun `CONNECTED event updates state and emits event`() = runTest {
        val unconfinedDispatcher = UnconfinedTestDispatcher(testScheduler)
        Dispatchers.setMain(unconfinedDispatcher)
        val scope = CoroutineScope(unconfinedDispatcher)

        val events = mutableListOf<ClientModeManager.ClientModeEvent>()
        val collectJob = scope.launch { manager.events.collect { events.add(it) } }

        manager.connect("ws://192.168.1.1:8080", scope)

        connectionEvents.emit(AnchorWebSocketClient.ClientConnectionEvent.CONNECTED)

        assertTrue(manager.clientModeState.value.isConnected)
        assertTrue(events.any { it is ClientModeManager.ClientModeEvent.Connected })
        collectJob.cancel()
        scope.cancel()
    }

    @Test
    fun `CONNECTED event sends fullSync when zone is configured`() = runTest {
        val unconfinedDispatcher = UnconfinedTestDispatcher(testScheduler)
        Dispatchers.setMain(unconfinedDispatcher)
        val scope = CoroutineScope(unconfinedDispatcher)

        val anchor = Position(54.35, 18.65)
        val zone = AnchorZone.Circle(anchor, 30.0)
        manager.setZoneConfiguration(anchor, zone)

        manager.connect("ws://192.168.1.1:8080", scope)

        connectionEvents.emit(AnchorWebSocketClient.ClientConnectionEvent.CONNECTED)

        verify { wsClient.sendFullSync(match { it.zoneType == "CIRCLE" }) }
        scope.cancel()
    }

    @Test
    fun `CONNECTED event does not send fullSync without zone`() = runTest {
        val unconfinedDispatcher = UnconfinedTestDispatcher(testScheduler)
        Dispatchers.setMain(unconfinedDispatcher)
        val scope = CoroutineScope(unconfinedDispatcher)

        manager.connect("ws://192.168.1.1:8080", scope)

        clearMocks(wsClient, answers = false, recordedCalls = true)
        connectionEvents.emit(AnchorWebSocketClient.ClientConnectionEvent.CONNECTED)

        verify(exactly = 0) { wsClient.sendFullSync(any()) }
        scope.cancel()
    }

    @Test
    fun `DISCONNECTED event updates state and emits event`() = runTest {
        val unconfinedDispatcher = UnconfinedTestDispatcher(testScheduler)
        Dispatchers.setMain(unconfinedDispatcher)
        val scope = CoroutineScope(unconfinedDispatcher)

        val events = mutableListOf<ClientModeManager.ClientModeEvent>()
        val collectJob = scope.launch { manager.events.collect { events.add(it) } }

        manager.connect("ws://192.168.1.1:8080", scope)

        connectionEvents.emit(AnchorWebSocketClient.ClientConnectionEvent.DISCONNECTED)

        assertFalse(manager.clientModeState.value.isConnected)
        assertTrue(events.any { it is ClientModeManager.ClientModeEvent.Disconnected })
        collectJob.cancel()
        scope.cancel()
    }

    @Test
    fun `HEARTBEAT_TIMEOUT event updates state and emits event`() = runTest {
        val unconfinedDispatcher = UnconfinedTestDispatcher(testScheduler)
        Dispatchers.setMain(unconfinedDispatcher)
        val scope = CoroutineScope(unconfinedDispatcher)

        val events = mutableListOf<ClientModeManager.ClientModeEvent>()
        val collectJob = scope.launch { manager.events.collect { events.add(it) } }

        manager.connect("ws://192.168.1.1:8080", scope)

        connectionEvents.emit(AnchorWebSocketClient.ClientConnectionEvent.HEARTBEAT_TIMEOUT)

        assertFalse(manager.clientModeState.value.isConnected)
        assertTrue(events.any { it is ClientModeManager.ClientModeEvent.HeartbeatTimeout })
        collectJob.cancel()
        scope.cancel()
    }

    @Test
    fun `RECONNECTING event does not change connected state`() = runTest {
        val unconfinedDispatcher = UnconfinedTestDispatcher(testScheduler)
        Dispatchers.setMain(unconfinedDispatcher)
        val scope = CoroutineScope(unconfinedDispatcher)

        manager.connect("ws://192.168.1.1:8080", scope)

        connectionEvents.emit(AnchorWebSocketClient.ClientConnectionEvent.RECONNECTING)

        assertFalse(manager.clientModeState.value.isConnected)
        scope.cancel()
    }

    // --- client state mirroring ---

    @Test
    fun `mirrors wsClient state changes`() = runTest {
        val unconfinedDispatcher = UnconfinedTestDispatcher(testScheduler)
        Dispatchers.setMain(unconfinedDispatcher)
        val scope = CoroutineScope(unconfinedDispatcher)

        manager.connect("ws://192.168.1.1:8080", scope)

        clientStateFlow.value = AnchorWebSocketClient.ClientState(
            isConnected = true,
            serverUrl = "ws://10.0.0.1:8080"
        )

        assertTrue(manager.clientModeState.value.isConnected)
        assertEquals("ws://10.0.0.1:8080", manager.clientModeState.value.serverUrl)
        scope.cancel()
    }

    // --- updateTelemetry with all params ---

    @Test
    fun `updateTelemetry sends with battery and charging info`() {
        every { wsClient.isConnected } returns true
        manager.updateTelemetry(
            position = Position(54.36, 18.66, 4.0f),
            distanceToAnchor = 30.0,
            alarmState = AlarmState.ALARM,
            sog = 3.0,
            cog = 270.0,
            batteryLevel = 85.0,
            isCharging = true
        )
        verify {
            wsClient.sendStateUpdate(match {
                it.batteryLevel == 85.0 && it.isCharging == true && it.alarmState == "ALARM"
            })
        }
    }

    // --- triggerAlarm payload ---

    @Test
    fun `triggerAlarm sends correct payload`() {
        every { wsClient.isConnected } returns true
        manager.triggerAlarm("GPS_LOST", "GPS signal lost for 60s", AlarmState.WARNING)
        verify {
            wsClient.sendTriggerAlarm(match {
                it.reason == "GPS_LOST" && it.message == "GPS signal lost for 60s" && it.alarmState == "WARNING"
            })
        }
    }

    // --- setZoneConfiguration with SectorWithCircle sends correct payload ---

    @Test
    fun `CONNECTED with SectorWithCircle zone sends correct fullSync`() = runTest {
        val unconfinedDispatcher = UnconfinedTestDispatcher(testScheduler)
        Dispatchers.setMain(unconfinedDispatcher)
        val scope = CoroutineScope(unconfinedDispatcher)

        val anchor = Position(54.35, 18.65)
        val zone = AnchorZone.SectorWithCircle(
            anchor, 30.0, bufferRadiusMeters = 50.0,
            sectorRadiusMeters = 40.0, sectorHalfAngleDeg = 45.0, sectorBearingDeg = 180.0
        )
        manager.setZoneConfiguration(anchor, zone, 60.0, 12.0)

        manager.connect("ws://192.168.1.1:8080", scope)

        connectionEvents.emit(AnchorWebSocketClient.ClientConnectionEvent.CONNECTED)

        verify {
            wsClient.sendFullSync(match {
                it.zoneType == "SECTOR" &&
                it.sector != null &&
                it.sector?.bearingDeg == 180.0 &&
                it.chainLengthM == 60.0 &&
                it.depthM == 12.0
            })
        }
        scope.cancel()
    }
}
