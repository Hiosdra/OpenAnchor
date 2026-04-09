package com.hiosdra.openanchor.service

import com.hiosdra.openanchor.network.AnchorWebSocketServer
import com.hiosdra.openanchor.network.PairedModeManager
import io.mockk.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.TestScope
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class WebSocketLifecycleManagerTest {

    private lateinit var wsServer: AnchorWebSocketServer
    private lateinit var pairedModeManager: PairedModeManager
    private lateinit var manager: WebSocketLifecycleManager

    @Before
    fun setUp() {
        wsServer = mockk(relaxed = true)
        pairedModeManager = mockk(relaxed = true)
        every { wsServer.serverState } returns MutableStateFlow(
            AnchorWebSocketServer.ServerState(isRunning = false)
        )
        manager = WebSocketLifecycleManager(wsServer, pairedModeManager)
    }

    @After
    fun tearDown() {
        unmockkAll()
    }

    @Test
    fun `start delegates to wsServer and pairedModeManager`() {
        val scope = TestScope()
        manager.start(scope)

        verify(exactly = 1) { wsServer.start(scope = scope) }
        verify(exactly = 1) { pairedModeManager.startListening(scope) }
    }

    @Test
    fun `stop delegates to pairedModeManager then wsServer`() {
        manager.stop()

        verifyOrder {
            pairedModeManager.stopListening()
            wsServer.stop()
        }
    }

    @Test
    fun `isRunning returns false when server not running`() {
        every { wsServer.serverState } returns MutableStateFlow(
            AnchorWebSocketServer.ServerState(isRunning = false)
        )
        val mgr = WebSocketLifecycleManager(wsServer, pairedModeManager)
        assertFalse(mgr.isRunning)
    }

    @Test
    fun `isRunning returns true when server is running`() {
        every { wsServer.serverState } returns MutableStateFlow(
            AnchorWebSocketServer.ServerState(isRunning = true)
        )
        val mgr = WebSocketLifecycleManager(wsServer, pairedModeManager)
        assertTrue(mgr.isRunning)
    }

    @Test
    fun `pairedModeManager is accessible`() {
        assertSame(pairedModeManager, manager.pairedModeManager)
    }
}
