package com.hiosdra.openanchor.ui.crewwatch

import org.junit.Assert.*
import org.junit.Test

class CrewWatchUiStateTest {

    @Test
    fun `default state has correct defaults`() {
        val state = CrewWatchUiState()
        assertFalse(state.isRunning)
        assertTrue(state.crewMembers.isEmpty())
        assertNull(state.currentCrewMember)
        assertNull(state.nextCrewMember)
        assertEquals(0L, state.remainingMs)
        assertEquals(0f, state.progress, 0.01f)
        assertEquals(4, state.watchDurationHours)
        assertEquals(0, state.totalWatchChanges)
        assertEquals("", state.newMemberName)
        assertFalse(state.showWarningEvent)
        assertNull(state.showWatchChangeEvent)
    }

    @Test
    fun `state with crew members`() {
        val state = CrewWatchUiState(
            isRunning = true,
            crewMembers = listOf("Alice", "Bob", "Charlie"),
            currentCrewMember = "Alice",
            nextCrewMember = "Bob",
            remainingMs = 3600000L,
            progress = 0.5f,
            watchDurationHours = 2,
            totalWatchChanges = 3
        )
        assertTrue(state.isRunning)
        assertEquals(3, state.crewMembers.size)
        assertEquals("Alice", state.currentCrewMember)
        assertEquals("Bob", state.nextCrewMember)
        assertEquals(3600000L, state.remainingMs)
        assertEquals(0.5f, state.progress, 0.01f)
        assertEquals(2, state.watchDurationHours)
        assertEquals(3, state.totalWatchChanges)
    }

    @Test
    fun `copy modifies specified fields`() {
        val state = CrewWatchUiState(
            crewMembers = listOf("Alice"),
            watchDurationHours = 4
        )
        val updated = state.copy(watchDurationHours = 6)
        assertEquals(6, updated.watchDurationHours)
        assertEquals(listOf("Alice"), updated.crewMembers)
    }

    @Test
    fun `state with warning event`() {
        val state = CrewWatchUiState(showWarningEvent = true)
        assertTrue(state.showWarningEvent)
    }

    @Test
    fun `state with watch change event`() {
        val state = CrewWatchUiState(showWatchChangeEvent = "Bob")
        assertEquals("Bob", state.showWatchChangeEvent)
    }

    @Test
    fun `state with new member name`() {
        val state = CrewWatchUiState(newMemberName = "Dave")
        assertEquals("Dave", state.newMemberName)
    }

    @Test
    fun `equality`() {
        val state1 = CrewWatchUiState(watchDurationHours = 2)
        val state2 = CrewWatchUiState(watchDurationHours = 2)
        assertEquals(state1, state2)
    }

    @Test
    fun `inequality`() {
        val state1 = CrewWatchUiState(watchDurationHours = 2)
        val state2 = CrewWatchUiState(watchDurationHours = 4)
        assertNotEquals(state1, state2)
    }
}
