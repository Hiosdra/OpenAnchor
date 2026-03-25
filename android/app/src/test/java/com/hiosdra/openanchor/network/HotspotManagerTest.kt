package com.hiosdra.openanchor.network

import android.content.Context
import android.net.wifi.WifiManager
import android.util.Log
import io.mockk.*
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class HotspotManagerTest {

    private lateinit var context: Context
    private lateinit var wifiManager: WifiManager
    private lateinit var hotspotManager: HotspotManager

    @Before
    fun setup() {
        mockkStatic(Log::class)
        every { Log.i(any(), any()) } returns 0
        every { Log.w(any(), any<String>()) } returns 0
        every { Log.e(any(), any()) } returns 0
        every { Log.e(any(), any(), any()) } returns 0

        wifiManager = mockk(relaxed = true)
        context = mockk {
            every { applicationContext } returns this
            every { getSystemService(Context.WIFI_SERVICE) } returns wifiManager
        }
        hotspotManager = HotspotManager(context)
    }

    @After
    fun tearDown() {
        unmockkStatic(Log::class)
    }

    // --- HotspotState data class ---

    @Test
    fun `HotspotState defaults`() {
        val state = HotspotManager.HotspotState()
        assertFalse(state.isActive)
        assertNull(state.ssid)
        assertNull(state.password)
        assertNull(state.ipAddress)
        assertNull(state.errorMessage)
    }

    @Test
    fun `HotspotState with full data`() {
        val state = HotspotManager.HotspotState(
            isActive = true,
            ssid = "OpenAnchor-AP",
            password = "testpass",
            ipAddress = "192.168.43.1",
            errorMessage = null
        )
        assertTrue(state.isActive)
        assertEquals("OpenAnchor-AP", state.ssid)
        assertEquals("testpass", state.password)
        assertEquals("192.168.43.1", state.ipAddress)
        assertNull(state.errorMessage)
    }

    @Test
    fun `HotspotState with error`() {
        val state = HotspotManager.HotspotState(errorMessage = "Permission denied")
        assertFalse(state.isActive)
        assertEquals("Permission denied", state.errorMessage)
    }

    @Test
    fun `HotspotState copy preserves unchanged fields`() {
        val state = HotspotManager.HotspotState(isActive = true, ssid = "AP")
        val copied = state.copy(password = "pass123")
        assertTrue(copied.isActive)
        assertEquals("AP", copied.ssid)
        assertEquals("pass123", copied.password)
    }

    // --- Initial state ---

    @Test
    fun `initial hotspot state is inactive`() {
        val state = hotspotManager.hotspotState.value
        assertFalse(state.isActive)
        assertNull(state.ssid)
        assertNull(state.password)
        assertNull(state.ipAddress)
        assertNull(state.errorMessage)
    }

    // --- Flows ---

    @Test
    fun `hotspotState flow is exposed`() {
        assertNotNull(hotspotManager.hotspotState)
    }

    // --- stopHotspot ---

    @Test
    fun `stopHotspot on fresh instance does not throw`() {
        hotspotManager.stopHotspot()
        val state = hotspotManager.hotspotState.value
        assertFalse(state.isActive)
        assertNull(state.ssid)
    }

    @Test
    fun `stopHotspot resets state to defaults`() {
        hotspotManager.stopHotspot()
        assertEquals(HotspotManager.HotspotState(), hotspotManager.hotspotState.value)
    }

    // --- startHotspot exception handling ---

    @Test
    fun `startHotspot SecurityException sets permission denied error`() {
        every { wifiManager.startLocalOnlyHotspot(any(), any()) } throws
                SecurityException("NEARBY_WIFI_DEVICES required")

        hotspotManager.startHotspot()

        val state = hotspotManager.hotspotState.value
        assertFalse(state.isActive)
        assertNotNull(state.errorMessage)
        assertTrue(state.errorMessage!!.contains("Permission denied"))
    }

    @Test
    fun `startHotspot generic exception sets failed error`() {
        every { wifiManager.startLocalOnlyHotspot(any(), any()) } throws
                RuntimeException("WiFi adapter not available")

        hotspotManager.startHotspot()

        val state = hotspotManager.hotspotState.value
        assertFalse(state.isActive)
        assertNotNull(state.errorMessage)
        assertTrue(state.errorMessage!!.contains("Failed"))
    }

    @Test
    fun `startHotspot invokes wifiManager startLocalOnlyHotspot`() {
        hotspotManager.startHotspot()
        verify { wifiManager.startLocalOnlyHotspot(any(), any()) }
    }

    // --- startHotspot callback: onFailed ---

    @Test
    fun `startHotspot callback onFailed ERROR_GENERIC sets error state`() {
        val callbackSlot = slot<WifiManager.LocalOnlyHotspotCallback>()
        every { wifiManager.startLocalOnlyHotspot(capture(callbackSlot), any()) } just Runs

        hotspotManager.startHotspot()
        callbackSlot.captured.onFailed(WifiManager.LocalOnlyHotspotCallback.ERROR_GENERIC)

        val state = hotspotManager.hotspotState.value
        assertFalse(state.isActive)
        assertNotNull(state.errorMessage)
        assertTrue(state.errorMessage!!.contains("Generic error"))
    }

    @Test
    fun `startHotspot callback onFailed ERROR_INCOMPATIBLE_MODE`() {
        val callbackSlot = slot<WifiManager.LocalOnlyHotspotCallback>()
        every { wifiManager.startLocalOnlyHotspot(capture(callbackSlot), any()) } just Runs

        hotspotManager.startHotspot()
        callbackSlot.captured.onFailed(WifiManager.LocalOnlyHotspotCallback.ERROR_INCOMPATIBLE_MODE)

        val state = hotspotManager.hotspotState.value
        assertTrue(state.errorMessage!!.contains("Incompatible mode"))
    }

    @Test
    fun `startHotspot callback onFailed ERROR_TETHERING_DISALLOWED`() {
        val callbackSlot = slot<WifiManager.LocalOnlyHotspotCallback>()
        every { wifiManager.startLocalOnlyHotspot(capture(callbackSlot), any()) } just Runs

        hotspotManager.startHotspot()
        callbackSlot.captured.onFailed(WifiManager.LocalOnlyHotspotCallback.ERROR_TETHERING_DISALLOWED)

        val state = hotspotManager.hotspotState.value
        assertTrue(state.errorMessage!!.contains("Tethering not allowed"))
    }

    @Test
    fun `startHotspot callback onFailed ERROR_NO_CHANNEL`() {
        val callbackSlot = slot<WifiManager.LocalOnlyHotspotCallback>()
        every { wifiManager.startLocalOnlyHotspot(capture(callbackSlot), any()) } just Runs

        hotspotManager.startHotspot()
        callbackSlot.captured.onFailed(WifiManager.LocalOnlyHotspotCallback.ERROR_NO_CHANNEL)

        val state = hotspotManager.hotspotState.value
        assertTrue(state.errorMessage!!.contains("No channel"))
    }

    @Test
    fun `startHotspot callback onFailed unknown reason`() {
        val callbackSlot = slot<WifiManager.LocalOnlyHotspotCallback>()
        every { wifiManager.startLocalOnlyHotspot(capture(callbackSlot), any()) } just Runs

        hotspotManager.startHotspot()
        callbackSlot.captured.onFailed(999)

        val state = hotspotManager.hotspotState.value
        assertTrue(state.errorMessage!!.contains("Unknown error"))
    }

    // --- startHotspot callback: onStopped ---

    @Test
    fun `startHotspot callback onStopped resets state`() {
        val callbackSlot = slot<WifiManager.LocalOnlyHotspotCallback>()
        every { wifiManager.startLocalOnlyHotspot(capture(callbackSlot), any()) } just Runs

        hotspotManager.startHotspot()
        callbackSlot.captured.onStopped()

        val state = hotspotManager.hotspotState.value
        assertFalse(state.isActive)
        assertNull(state.ssid)
        assertNull(state.password)
        assertNull(state.ipAddress)
    }

    // --- getLocalIpAddress ---

    @Test
    fun `getLocalIpAddress does not throw`() {
        val ip = hotspotManager.getLocalIpAddress()
        // May be null on machines without network interfaces
        if (ip != null) {
            assertTrue(ip.matches(Regex("\\d+\\.\\d+\\.\\d+\\.\\d+")))
        }
    }

    // --- getWebSocketUrl ---

    @Test
    fun `getWebSocketUrl with default port`() {
        val url = hotspotManager.getWebSocketUrl()
        if (url != null) {
            assertTrue(url.startsWith("ws://"))
            assertTrue(url.endsWith(":8080"))
        }
    }

    @Test
    fun `getWebSocketUrl with custom port`() {
        val url = hotspotManager.getWebSocketUrl(port = 9090)
        if (url != null) {
            assertTrue(url.startsWith("ws://"))
            assertTrue(url.endsWith(":9090"))
        }
    }
}
