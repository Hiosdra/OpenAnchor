package com.hiosdra.openanchor.network

import android.util.Log
import com.hiosdra.openanchor.domain.geometry.ZoneCheckResult
import com.hiosdra.openanchor.domain.model.AlarmState
import com.hiosdra.openanchor.domain.model.Position
import io.mockk.*
import kotlinx.coroutines.*
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class AnchorWebSocketServerTest {

    private lateinit var parser: ProtocolMessageParser
    private lateinit var server: AnchorWebSocketServer

    @Before
    fun setup() {
        mockkStatic(Log::class)
        every { Log.i(any(), any()) } returns 0
        every { Log.w(any(), any<String>()) } returns 0
        every { Log.w(any(), any<String>(), any()) } returns 0
        every { Log.e(any(), any()) } returns 0
        every { Log.e(any(), any(), any()) } returns 0
        every { Log.d(any(), any()) } returns 0

        parser = mockk(relaxed = true)
        server = AnchorWebSocketServer(parser)
    }

    @After
    fun tearDown() {
        server.stop()
        unmockkStatic(Log::class)
    }

    // --- ServerState data class ---

    @Test
    fun `ServerState defaults are correct`() {
        val state = AnchorWebSocketServer.ServerState()
        assertFalse(state.isRunning)
        assertEquals(AnchorWebSocketServer.DEFAULT_PORT, state.port)
        assertFalse(state.clientConnected)
        assertEquals(0L, state.lastHeartbeatAge)
    }

    @Test
    fun `ServerState with custom values`() {
        val state = AnchorWebSocketServer.ServerState(
            isRunning = true, port = 9090, clientConnected = true, lastHeartbeatAge = 5000L
        )
        assertTrue(state.isRunning)
        assertEquals(9090, state.port)
        assertTrue(state.clientConnected)
        assertEquals(5000L, state.lastHeartbeatAge)
    }

    @Test
    fun `ServerState copy preserves unchanged fields`() {
        val state = AnchorWebSocketServer.ServerState(isRunning = true, port = 9090)
        val copied = state.copy(clientConnected = true)
        assertTrue(copied.isRunning)
        assertEquals(9090, copied.port)
        assertTrue(copied.clientConnected)
        assertEquals(0L, copied.lastHeartbeatAge)
    }

    // --- ConnectionEvent enum ---

    @Test
    fun `ConnectionEvent has all expected values`() {
        val values = AnchorWebSocketServer.ConnectionEvent.values()
        assertEquals(3, values.size)
        assertNotNull(AnchorWebSocketServer.ConnectionEvent.CLIENT_CONNECTED)
        assertNotNull(AnchorWebSocketServer.ConnectionEvent.CLIENT_DISCONNECTED)
        assertNotNull(AnchorWebSocketServer.ConnectionEvent.HEARTBEAT_TIMEOUT)
    }

    // --- Constants ---

    @Test
    fun `DEFAULT_PORT is 8080`() {
        assertEquals(8080, AnchorWebSocketServer.DEFAULT_PORT)
    }

    // --- Initial state ---

    @Test
    fun `initial server state is not running and not connected`() {
        val state = server.serverState.value
        assertFalse(state.isRunning)
        assertFalse(state.clientConnected)
        assertEquals(AnchorWebSocketServer.DEFAULT_PORT, state.port)
        assertEquals(0L, state.lastHeartbeatAge)
    }

    @Test
    fun `isClientConnected returns false initially`() {
        assertFalse(server.isClientConnected)
    }

    // --- Flows are accessible ---

    @Test
    fun `serverState flow is exposed`() {
        assertNotNull(server.serverState)
    }

    @Test
    fun `inboundMessages flow is exposed`() {
        assertNotNull(server.inboundMessages)
    }

    @Test
    fun `connectionEvents flow is exposed`() {
        assertNotNull(server.connectionEvents)
    }

    // --- stop() ---

    @Test
    fun `stop on fresh server does not throw`() {
        server.stop()
        val state = server.serverState.value
        assertFalse(state.isRunning)
        assertFalse(state.clientConnected)
    }

    @Test
    fun `stop resets state to defaults`() {
        server.stop()
        val state = server.serverState.value
        assertEquals(AnchorWebSocketServer.ServerState(), state)
    }

    // --- send methods with no client ---

    @Test
    fun `send with no client does not throw`() = runTest {
        server.send("test message")
        // No crash = success
    }

    @Test
    fun `sendCommand calls parser buildActionCommand`() = runTest {
        every { parser.buildActionCommand("MUTE_ALARM") } returns """{"type":"ACTION_COMMAND"}"""
        server.sendCommand("MUTE_ALARM")
        verify { parser.buildActionCommand("MUTE_ALARM") }
    }

    @Test
    fun `sendCommand with DISMISS_ALARM`() = runTest {
        every { parser.buildActionCommand("DISMISS_ALARM") } returns """{"type":"ACTION_COMMAND"}"""
        server.sendCommand("DISMISS_ALARM")
        verify { parser.buildActionCommand("DISMISS_ALARM") }
    }

    @Test
    fun `sendGpsReport delegates to parser with all parameters`() = runTest {
        val pos = Position(54.35, 18.65)
        every {
            parser.buildAndroidGpsReport(any(), any(), any(), any(), any(), any(), any(), any(), any())
        } returns "{}"

        server.sendGpsReport(
            position = pos,
            distanceToAnchor = 15.0,
            zoneCheckResult = ZoneCheckResult.INSIDE,
            alarmState = AlarmState.SAFE,
            batteryLevel = 85,
            isCharging = false
        )

        verify {
            parser.buildAndroidGpsReport(
                pos, 15.0, ZoneCheckResult.INSIDE, AlarmState.SAFE,
                85, false, null, null, null
            )
        }
    }

    @Test
    fun `sendGpsReport with drift info`() = runTest {
        val pos = Position(54.35, 18.65)
        every {
            parser.buildAndroidGpsReport(any(), any(), any(), any(), any(), any(), any(), any(), any())
        } returns "{}"

        server.sendGpsReport(
            position = pos,
            distanceToAnchor = 20.0,
            zoneCheckResult = ZoneCheckResult.OUTSIDE,
            alarmState = AlarmState.ALARM,
            driftDetected = true,
            driftBearingDeg = 90.0,
            driftSpeedMps = 1.5
        )

        verify {
            parser.buildAndroidGpsReport(
                pos, 20.0, ZoneCheckResult.OUTSIDE, AlarmState.ALARM,
                null, null, true, 90.0, 1.5
            )
        }
    }

    @Test
    fun `sendGpsReport with buffer zone result`() = runTest {
        val pos = Position(54.35, 18.65)
        every {
            parser.buildAndroidGpsReport(any(), any(), any(), any(), any(), any(), any(), any(), any())
        } returns "{}"

        server.sendGpsReport(
            position = pos,
            distanceToAnchor = 35.0,
            zoneCheckResult = ZoneCheckResult.BUFFER,
            alarmState = AlarmState.WARNING,
            batteryLevel = 42,
            isCharging = true,
            driftDetected = false,
            driftBearingDeg = 0.0,
            driftSpeedMps = 0.0
        )

        verify {
            parser.buildAndroidGpsReport(
                pos, 35.0, ZoneCheckResult.BUFFER, AlarmState.WARNING,
                42, true, false, 0.0, 0.0
            )
        }
    }

    @Test
    fun `sendGpsReport with minimal parameters`() = runTest {
        val pos = Position(54.35, 18.65)
        every {
            parser.buildAndroidGpsReport(any(), any(), any(), any(), any(), any(), any(), any(), any())
        } returns "{}"

        server.sendGpsReport(
            position = pos,
            distanceToAnchor = 10.0,
            zoneCheckResult = ZoneCheckResult.INSIDE,
            alarmState = AlarmState.SAFE
        )

        verify {
            parser.buildAndroidGpsReport(
                pos, 10.0, ZoneCheckResult.INSIDE, AlarmState.SAFE,
                null, null, null, null, null
            )
        }
    }

    // --- start() with server already running ---

    @Test
    fun `start when server already running logs warning`() {
        val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
        try {
            server.start(port = 0, scope = scope)
            server.start(port = 0, scope = scope)
            verify { Log.w("AnchorWSServer", "Server already running") }
        } finally {
            server.stop()
            scope.cancel()
        }
    }

    // --- stop() with active internal state ---

    @Test
    fun `stop cancels heartbeat jobs`() {
        val heartbeatJob = mockk<Job>(relaxed = true)
        val watchdogJob = mockk<Job>(relaxed = true)

        setPrivateField("heartbeatJob", heartbeatJob)
        setPrivateField("heartbeatWatchdogJob", watchdogJob)

        server.stop()

        verify { heartbeatJob.cancel() }
        verify { watchdogJob.cancel() }
    }

    @Test
    fun `stop nullifies heartbeat jobs`() {
        setPrivateField("heartbeatJob", mockk<Job>(relaxed = true))
        setPrivateField("heartbeatWatchdogJob", mockk<Job>(relaxed = true))

        server.stop()

        assertNull(getPrivateField("heartbeatJob"))
        assertNull(getPrivateField("heartbeatWatchdogJob"))
    }

    @Test
    fun `stop nullifies server scope`() = runBlocking {
        setPrivateField("serverScope", CoroutineScope(SupervisorJob()))
        server.stop()
        delay(500)
        assertNull(getPrivateField("serverScope"))
    }

    @Test
    fun `stop nullifies server reference`() = runBlocking {
        val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
        server.start(port = 0, scope = scope)
        server.stop()
        delay(4000)
        assertNull(getPrivateField("server"))
        scope.cancel()
    }

    @Test
    fun `multiple stop calls do not throw`() {
        server.stop()
        server.stop()
        server.stop()
        assertFalse(server.serverState.value.isRunning)
    }

    // --- ServerState data class extended tests ---

    @Test
    fun `ServerState destructuring works`() {
        val state = AnchorWebSocketServer.ServerState(
            isRunning = true, port = 9090, clientConnected = true, lastHeartbeatAge = 1000L
        )
        val (isRunning, port, clientConnected, lastHeartbeatAge) = state
        assertTrue(isRunning)
        assertEquals(9090, port)
        assertTrue(clientConnected)
        assertEquals(1000L, lastHeartbeatAge)
    }

    @Test
    fun `ServerState equals and hashCode`() {
        val state1 = AnchorWebSocketServer.ServerState(isRunning = true, port = 8080)
        val state2 = AnchorWebSocketServer.ServerState(isRunning = true, port = 8080)
        assertEquals(state1, state2)
        assertEquals(state1.hashCode(), state2.hashCode())
    }

    @Test
    fun `ServerState not equal for different values`() {
        val state1 = AnchorWebSocketServer.ServerState(isRunning = true)
        val state2 = AnchorWebSocketServer.ServerState(isRunning = false)
        assertNotEquals(state1, state2)
    }

    // --- Reflection helpers ---

    private fun setPrivateField(name: String, value: Any?) {
        val field = AnchorWebSocketServer::class.java.getDeclaredField(name)
        field.isAccessible = true
        field.set(server, value)
    }

    private fun getPrivateField(name: String): Any? {
        val field = AnchorWebSocketServer::class.java.getDeclaredField(name)
        field.isAccessible = true
        return field.get(server)
    }
}
