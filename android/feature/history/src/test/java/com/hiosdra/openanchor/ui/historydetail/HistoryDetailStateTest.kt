package com.hiosdra.openanchor.ui.historydetail

import org.junit.Assert.*
import org.junit.Test

class HistoryDetailStateTest {

    @Test
    fun `default state has correct defaults`() {
        val state = HistoryDetailState()
        assertNull(state.session)
        assertTrue(state.trackPoints.isEmpty())
        assertTrue(state.isLoading)
        assertNull(state.gpxExportUri)
        assertNull(state.gpxExportFilename)
        assertFalse(state.exportError)
    }

    @Test
    fun `copy modifies specific fields`() {
        val state = HistoryDetailState()
        val updated = state.copy(isLoading = false)
        assertFalse(updated.isLoading)
        assertNull(updated.session)
        assertTrue(updated.trackPoints.isEmpty())
    }

    @Test
    fun `copy with export error`() {
        val state = HistoryDetailState()
        val updated = state.copy(exportError = true)
        assertTrue(updated.exportError)
    }

    @Test
    fun `copy with export filename`() {
        val state = HistoryDetailState()
        val updated = state.copy(gpxExportFilename = "session_42.gpx")
        assertEquals("session_42.gpx", updated.gpxExportFilename)
    }

    @Test
    fun `equality`() {
        val state1 = HistoryDetailState(isLoading = false)
        val state2 = HistoryDetailState(isLoading = false)
        assertEquals(state1, state2)
    }

    @Test
    fun `inequality`() {
        val state1 = HistoryDetailState(isLoading = true)
        val state2 = HistoryDetailState(isLoading = false)
        assertNotEquals(state1, state2)
    }
}
