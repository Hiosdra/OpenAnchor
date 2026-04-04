package com.hiosdra.openanchor.ui.navigation

import org.junit.Assert.*
import org.junit.Test

class ScreenTest {

    @Test
    fun `Home screen has correct route`() {
        assertEquals("home", Screen.Home.route)
    }

    @Test
    fun `Setup screen has correct route`() {
        assertEquals("setup", Screen.Setup.route)
    }

    @Test
    fun `Monitor screen has parameterized route`() {
        assertEquals("monitor/{sessionId}", Screen.Monitor.route)
    }

    @Test
    fun `Monitor createRoute generates correct route`() {
        assertEquals("monitor/42", Screen.Monitor.createRoute(42))
        assertEquals("monitor/0", Screen.Monitor.createRoute(0))
        assertEquals("monitor/999", Screen.Monitor.createRoute(999))
    }

    @Test
    fun `History screen has correct route`() {
        assertEquals("history", Screen.History.route)
    }

    @Test
    fun `HistoryDetail screen has parameterized route`() {
        assertEquals("history/{sessionId}", Screen.HistoryDetail.route)
    }

    @Test
    fun `HistoryDetail createRoute generates correct route`() {
        assertEquals("history/42", Screen.HistoryDetail.createRoute(42))
    }

    @Test
    fun `Settings screen has correct route`() {
        assertEquals("settings", Screen.Settings.route)
    }

    @Test
    fun `Statistics screen has correct route`() {
        assertEquals("statistics", Screen.Statistics.route)
    }

    @Test
    fun `Weather screen has parameterized route`() {
        assertEquals("weather/{latitude}/{longitude}", Screen.Weather.route)
    }

    @Test
    fun `Weather createRoute generates correct route`() {
        val route = Screen.Weather.createRoute(54.35f, 18.65f)
        assertTrue(route.startsWith("weather/"))
        assertTrue(route.contains("54.35"))
        assertTrue(route.contains("18.65"))
    }

    @Test
    fun `QRCode screen has correct route`() {
        assertEquals("pairing/qrcode", Screen.QRCode.route)
    }

    @Test
    fun `PairedDashboard screen has correct route`() {
        assertEquals("paired/dashboard", Screen.PairedDashboard.route)
    }

    @Test
    fun `ScanQRCode screen has correct route`() {
        assertEquals("client/scan", Screen.ScanQRCode.route)
    }

    @Test
    fun `ClientDashboard screen has correct route`() {
        assertEquals("client/dashboard", Screen.ClientDashboard.route)
    }

    @Test
    fun `CrewWatch screen has correct route`() {
        assertEquals("crewwatch", Screen.CrewWatch.route)
    }

    @Test
    fun `AIAdvisor screen has correct route`() {
        assertEquals("ai/advisor", Screen.AIAdvisor.route)
    }

    @Test
    fun `Logbook screen has correct route`() {
        assertEquals("ai/logbook", Screen.Logbook.route)
    }

}
