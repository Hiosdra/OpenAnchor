package com.hiosdra.openanchor.network

import com.hiosdra.openanchor.domain.model.AlarmState
import com.hiosdra.openanchor.domain.model.AnchorZone
import com.hiosdra.openanchor.domain.model.Position
import io.mockk.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
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
        inboundMessages = MutableSharedFlow()
        connectionEvents = MutableSharedFlow()

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
    fun `triggerAlarm does not send when disconnected`() {
        every { wsClient.isConnected } returns false
        manager.triggerAlarm("ZONE_VIOLATION", "Test", AlarmState.ALARM)
        verify(exactly = 0) { wsClient.sendTriggerAlarm(any()) }
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
}
