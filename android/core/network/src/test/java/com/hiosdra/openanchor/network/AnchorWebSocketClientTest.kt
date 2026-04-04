package com.hiosdra.openanchor.network

import android.util.Log
import io.mockk.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import okhttp3.*
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class AnchorWebSocketClientTest {

    private lateinit var parser: ProtocolMessageParser
    private lateinit var okHttpClient: OkHttpClient
    private lateinit var client: AnchorWebSocketClient

    @Before
    fun setup() {
        mockkStatic(Log::class)
        every { Log.i(any(), any()) } returns 0
        every { Log.w(any(), any<String>()) } returns 0
        every { Log.w(any(), any<String>(), any()) } returns 0
        every { Log.e(any(), any()) } returns 0
        every { Log.e(any(), any(), any()) } returns 0

        parser = mockk(relaxed = true)
        okHttpClient = mockk(relaxed = true)
        client = AnchorWebSocketClient(parser, okHttpClient)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
        unmockkStatic(Log::class)
    }

    // --- ClientState data class ---

    @Test
    fun `ClientState defaults`() {
        val state = AnchorWebSocketClient.ClientState()
        assertFalse(state.isConnected)
        assertFalse(state.isConnecting)
        assertNull(state.serverUrl)
        assertEquals(0L, state.lastHeartbeatAge)
        assertEquals(0, state.reconnectAttempt)
        assertNull(state.errorMessage)
    }

    @Test
    fun `ClientState with full data`() {
        val state = AnchorWebSocketClient.ClientState(
            isConnected = true,
            isConnecting = false,
            serverUrl = "ws://test:8080",
            lastHeartbeatAge = 3000L,
            reconnectAttempt = 2,
            errorMessage = "timeout"
        )
        assertTrue(state.isConnected)
        assertEquals("ws://test:8080", state.serverUrl)
        assertEquals(3000L, state.lastHeartbeatAge)
        assertEquals(2, state.reconnectAttempt)
        assertEquals("timeout", state.errorMessage)
    }

    @Test
    fun `ClientState copy preserves unchanged fields`() {
        val state = AnchorWebSocketClient.ClientState(
            isConnected = true, serverUrl = "ws://test:8080"
        )
        val copied = state.copy(isConnected = false)
        assertFalse(copied.isConnected)
        assertEquals("ws://test:8080", copied.serverUrl)
    }

    // --- ClientConnectionEvent enum ---

    @Test
    fun `ClientConnectionEvent has all expected values`() {
        val values = AnchorWebSocketClient.ClientConnectionEvent.values()
        assertEquals(4, values.size)
        assertNotNull(AnchorWebSocketClient.ClientConnectionEvent.CONNECTED)
        assertNotNull(AnchorWebSocketClient.ClientConnectionEvent.DISCONNECTED)
        assertNotNull(AnchorWebSocketClient.ClientConnectionEvent.HEARTBEAT_TIMEOUT)
        assertNotNull(AnchorWebSocketClient.ClientConnectionEvent.RECONNECTING)
    }

    // --- ServerMessage sealed class ---

    @Test
    fun `ServerMessage GpsReport holds payload`() {
        val payload = AndroidGpsReportPayload(
            pos = LatLng(54.35, 18.65),
            accuracy = 5.0f,
            distanceToAnchor = 15.0,
            zoneCheckResult = "INSIDE",
            alarmState = "SAFE"
        )
        val msg = AnchorWebSocketClient.ServerMessage.GpsReport(payload)
        assertEquals(payload, msg.payload)
    }

    @Test
    fun `ServerMessage ActionCommand holds payload`() {
        val payload = ActionCommandPayload(command = "MUTE_ALARM")
        val msg = AnchorWebSocketClient.ServerMessage.ActionCommand(payload)
        assertEquals("MUTE_ALARM", msg.payload.command)
    }

    @Test
    fun `ServerMessage Ping holds timestamp`() {
        val msg = AnchorWebSocketClient.ServerMessage.Ping(123456789L)
        assertEquals(123456789L, msg.timestamp)
    }

    // --- Initial state ---

    @Test
    fun `initial client state is disconnected`() {
        val state = client.clientState.value
        assertFalse(state.isConnected)
        assertFalse(state.isConnecting)
        assertNull(state.serverUrl)
    }

    @Test
    fun `isConnected returns false initially`() {
        assertFalse(client.isConnected)
    }

    // --- Flows are accessible ---

    @Test
    fun `clientState flow is exposed`() {
        assertNotNull(client.clientState)
    }

    @Test
    fun `inboundMessages flow is exposed`() {
        assertNotNull(client.inboundMessages)
    }

    @Test
    fun `connectionEvents flow is exposed`() {
        assertNotNull(client.connectionEvents)
    }

    // --- send with no websocket ---

    @Test
    fun `send returns false when no websocket connected`() {
        assertFalse(client.send("test"))
    }

    // --- send* delegation to parser ---

    @Test
    fun `sendFullSync delegates to parser`() {
        val payload = FullSyncPayload(
            isAnchored = true,
            anchorPos = LatLng(54.35, 18.65),
            zoneType = "CIRCLE",
            radiusMeters = 30.0
        )
        client.sendFullSync(payload)
        verify { parser.buildFullSync(payload) }
    }

    @Test
    fun `sendStateUpdate delegates to parser`() {
        val payload = StateUpdatePayload(
            currentPos = LatLng(54.36, 18.66),
            gpsAccuracy = 5.0f,
            distanceToAnchor = 25.0,
            alarmState = "SAFE"
        )
        client.sendStateUpdate(payload)
        verify { parser.buildStateUpdate(payload) }
    }

    @Test
    fun `sendTriggerAlarm delegates to parser`() {
        val payload = TriggerAlarmPayload(
            reason = "ZONE_VIOLATION",
            message = "Outside zone",
            alarmState = "ALARM"
        )
        client.sendTriggerAlarm(payload)
        verify { parser.buildTriggerAlarm(payload) }
    }

    // --- connect ---

    @Test
    fun `connect sets connecting state and server url`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val mockWebSocket = mockk<WebSocket>(relaxed = true)
        every { okHttpClient.newWebSocket(any(), any()) } returns mockWebSocket

        client.connect("ws://192.168.1.1:8080", backgroundScope)

        val state = client.clientState.value
        assertEquals("ws://192.168.1.1:8080", state.serverUrl)
        assertTrue(state.isConnecting)
        assertNull(state.errorMessage)
    }

    @Test
    fun `connect creates websocket with correct url`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val mockWebSocket = mockk<WebSocket>(relaxed = true)
        val requestSlot = slot<Request>()
        every { okHttpClient.newWebSocket(capture(requestSlot), any()) } returns mockWebSocket

        client.connect("ws://10.0.0.1:8080", backgroundScope)

        val url = requestSlot.captured.url.toString()
        assertTrue("URL should contain ws://10.0.0.1:8080, was: $url",
            url.contains("10.0.0.1") && url.contains("8080"))
    }

    // --- disconnect ---

    @Test
    fun `disconnect resets all state`() {
        every { parser.buildDisconnect(any()) } returns """{"type":"DISCONNECT"}"""
        client.disconnect("USER_DISCONNECT")

        val state = client.clientState.value
        assertFalse(state.isConnected)
        assertFalse(state.isConnecting)
        assertNull(state.serverUrl)
        verify { parser.buildDisconnect("USER_DISCONNECT") }
    }

    @Test
    fun `disconnect with default reason`() {
        every { parser.buildDisconnect(any()) } returns "{}"
        client.disconnect()
        verify { parser.buildDisconnect("USER_DISCONNECT") }
    }

    @Test
    fun `disconnect with custom reason`() {
        every { parser.buildDisconnect(any()) } returns "{}"
        client.disconnect("SESSION_END")
        verify { parser.buildDisconnect("SESSION_END") }
    }

    // --- WebSocket listener callbacks ---

    private fun connectAndCaptureListener(): Pair<WebSocket, WebSocketListener> {
        val mockWebSocket = mockk<WebSocket>(relaxed = true)
        val listenerSlot = slot<WebSocketListener>()
        every { okHttpClient.newWebSocket(any(), capture(listenerSlot)) } returns mockWebSocket
        return mockWebSocket to listenerSlot.captured // captured after connect()
    }

    @Test
    fun `onOpen updates state to connected`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val mockWebSocket = mockk<WebSocket>(relaxed = true)
        val listenerSlot = slot<WebSocketListener>()
        every { okHttpClient.newWebSocket(any(), capture(listenerSlot)) } returns mockWebSocket

        client.connect("ws://test:8080", backgroundScope)
        listenerSlot.captured.onOpen(mockWebSocket, mockk(relaxed = true))

        val state = client.clientState.value
        assertTrue(state.isConnected)
        assertFalse(state.isConnecting)
        assertEquals(0, state.reconnectAttempt)
        assertNull(state.errorMessage)
    }

    @Test
    fun `onFailure updates state with error message`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val mockWebSocket = mockk<WebSocket>(relaxed = true)
        val listenerSlot = slot<WebSocketListener>()
        every { okHttpClient.newWebSocket(any(), capture(listenerSlot)) } returns mockWebSocket

        client.connect("ws://test:8080", backgroundScope)
        listenerSlot.captured.onFailure(mockWebSocket, Exception("Connection refused"), null)

        assertEquals("Connection refused", client.clientState.value.errorMessage)
        assertFalse(client.clientState.value.isConnected)
    }

    @Test
    fun `onFailure with null message uses fallback`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val mockWebSocket = mockk<WebSocket>(relaxed = true)
        val listenerSlot = slot<WebSocketListener>()
        every { okHttpClient.newWebSocket(any(), capture(listenerSlot)) } returns mockWebSocket

        client.connect("ws://test:8080", backgroundScope)
        listenerSlot.captured.onFailure(mockWebSocket, Exception(), null)

        assertEquals("Connection failed", client.clientState.value.errorMessage)
    }

    @Test
    fun `onClosing closes websocket with code 1000`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val mockWebSocket = mockk<WebSocket>(relaxed = true)
        val listenerSlot = slot<WebSocketListener>()
        every { okHttpClient.newWebSocket(any(), capture(listenerSlot)) } returns mockWebSocket

        client.connect("ws://test:8080", backgroundScope)
        listenerSlot.captured.onClosing(mockWebSocket, 1001, "Server shutting down")

        verify { mockWebSocket.close(1000, null) }
    }

    @Test
    fun `onClosed sets isConnected to false`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val mockWebSocket = mockk<WebSocket>(relaxed = true)
        val listenerSlot = slot<WebSocketListener>()
        every { okHttpClient.newWebSocket(any(), capture(listenerSlot)) } returns mockWebSocket

        client.connect("ws://test:8080", backgroundScope)
        // First connect
        listenerSlot.captured.onOpen(mockWebSocket, mockk(relaxed = true))
        assertTrue(client.clientState.value.isConnected)
        // Then close
        listenerSlot.captured.onClosed(mockWebSocket, 1000, "Normal")
        assertFalse(client.clientState.value.isConnected)
    }

    // --- Message parsing via onMessage ---

    private fun TestScope.unconfinedScope(): CoroutineScope =
        CoroutineScope(UnconfinedTestDispatcher(testScheduler) + SupervisorJob())

    @Test
    fun `onMessage PING emits Ping message`() = runTest {
        val scope = unconfinedScope()
        val mockWebSocket = mockk<WebSocket>(relaxed = true)
        val listenerSlot = slot<WebSocketListener>()
        every { okHttpClient.newWebSocket(any(), capture(listenerSlot)) } returns mockWebSocket

        val messages = mutableListOf<AnchorWebSocketClient.ServerMessage>()
        scope.launch { client.inboundMessages.collect { messages.add(it) } }

        client.connect("ws://test:8080", scope)

        listenerSlot.captured.onMessage(mockWebSocket, """{"type":"PING","timestamp":123456}""")

        assertEquals(1, messages.size)
        assertTrue(messages[0] is AnchorWebSocketClient.ServerMessage.Ping)
        assertEquals(123456L, (messages[0] as AnchorWebSocketClient.ServerMessage.Ping).timestamp)
        scope.cancel()
    }

    @Test
    fun `onMessage ANDROID_GPS_REPORT emits GpsReport message`() = runTest {
        val scope = unconfinedScope()
        val mockWebSocket = mockk<WebSocket>(relaxed = true)
        val listenerSlot = slot<WebSocketListener>()
        every { okHttpClient.newWebSocket(any(), capture(listenerSlot)) } returns mockWebSocket

        val messages = mutableListOf<AnchorWebSocketClient.ServerMessage>()
        scope.launch { client.inboundMessages.collect { messages.add(it) } }

        client.connect("ws://test:8080", scope)

        val json = """{"type":"ANDROID_GPS_REPORT","payload":{"pos":{"lat":54.35,"lng":18.65},"accuracy":5.0,"distanceToAnchor":15.0,"zoneCheckResult":"INSIDE","alarmState":"SAFE"}}"""
        listenerSlot.captured.onMessage(mockWebSocket, json)

        assertEquals(1, messages.size)
        val report = messages[0] as AnchorWebSocketClient.ServerMessage.GpsReport
        assertEquals(54.35, report.payload.pos.lat, 0.001)
        assertEquals(18.65, report.payload.pos.lng, 0.001)
        assertEquals("INSIDE", report.payload.zoneCheckResult)
        assertEquals("SAFE", report.payload.alarmState)
        scope.cancel()
    }

    @Test
    fun `onMessage ACTION_COMMAND emits ActionCommand message`() = runTest {
        val scope = unconfinedScope()
        val mockWebSocket = mockk<WebSocket>(relaxed = true)
        val listenerSlot = slot<WebSocketListener>()
        every { okHttpClient.newWebSocket(any(), capture(listenerSlot)) } returns mockWebSocket

        val messages = mutableListOf<AnchorWebSocketClient.ServerMessage>()
        scope.launch { client.inboundMessages.collect { messages.add(it) } }

        client.connect("ws://test:8080", scope)

        val json = """{"type":"ACTION_COMMAND","payload":{"command":"DISMISS_ALARM"}}"""
        listenerSlot.captured.onMessage(mockWebSocket, json)

        assertEquals(1, messages.size)
        val cmd = messages[0] as AnchorWebSocketClient.ServerMessage.ActionCommand
        assertEquals("DISMISS_ALARM", cmd.payload.command)
        scope.cancel()
    }

    @Test
    fun `onMessage with unknown type does not crash`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val mockWebSocket = mockk<WebSocket>(relaxed = true)
        val listenerSlot = slot<WebSocketListener>()
        every { okHttpClient.newWebSocket(any(), capture(listenerSlot)) } returns mockWebSocket

        client.connect("ws://test:8080", backgroundScope)
        advanceUntilIdle()

        listenerSlot.captured.onMessage(mockWebSocket, """{"type":"UNKNOWN_TYPE","payload":{}}""")
        advanceUntilIdle()
        // No exception = pass
    }

    @Test
    fun `onMessage with invalid json does not crash`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val mockWebSocket = mockk<WebSocket>(relaxed = true)
        val listenerSlot = slot<WebSocketListener>()
        every { okHttpClient.newWebSocket(any(), capture(listenerSlot)) } returns mockWebSocket

        client.connect("ws://test:8080", backgroundScope)
        advanceUntilIdle()

        listenerSlot.captured.onMessage(mockWebSocket, "not valid json")
        advanceUntilIdle()
        // No exception = pass
    }

    @Test
    fun `onMessage with missing type field does not crash`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val mockWebSocket = mockk<WebSocket>(relaxed = true)
        val listenerSlot = slot<WebSocketListener>()
        every { okHttpClient.newWebSocket(any(), capture(listenerSlot)) } returns mockWebSocket

        client.connect("ws://test:8080", backgroundScope)
        advanceUntilIdle()

        listenerSlot.captured.onMessage(mockWebSocket, """{"payload":{"foo":"bar"}}""")
        advanceUntilIdle()
    }

    // --- Intentional disconnect prevents reconnect ---

    @Test
    fun `intentional disconnect prevents auto-reconnect`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        every { parser.buildDisconnect(any()) } returns "{}"
        val mockWebSocket = mockk<WebSocket>(relaxed = true)
        val listenerSlot = slot<WebSocketListener>()
        every { okHttpClient.newWebSocket(any(), capture(listenerSlot)) } returns mockWebSocket

        client.connect("ws://test:8080", backgroundScope)
        client.disconnect()

        val state = client.clientState.value
        assertFalse(state.isConnected)
        assertFalse(state.isConnecting)
        assertNull(state.serverUrl)
    }
}
