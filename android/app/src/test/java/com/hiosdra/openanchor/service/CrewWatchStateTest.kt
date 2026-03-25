package com.hiosdra.openanchor.service

import com.hiosdra.openanchor.service.CrewWatchManager.CrewWatchState
import org.junit.Assert.*
import org.junit.Test

class CrewWatchStateTest {

    @Test
    fun `default state has correct values`() {
        val state = CrewWatchState()
        assertFalse(state.isRunning)
        assertTrue(state.crewMembers.isEmpty())
        assertEquals(0, state.currentWatchIndex)
        assertEquals(4 * 60 * 60 * 1000L, state.watchDurationMs)
        assertEquals(0L, state.watchStartTimeMs)
        assertEquals(0L, state.remainingMs)
        assertFalse(state.warningFired)
        assertEquals(0, state.totalWatchChanges)
    }

    @Test
    fun `currentCrewMember returns null when empty`() {
        val state = CrewWatchState()
        assertNull(state.currentCrewMember)
    }

    @Test
    fun `currentCrewMember returns correct member`() {
        val state = CrewWatchState(
            crewMembers = listOf("Alice", "Bob", "Charlie"),
            currentWatchIndex = 1
        )
        assertEquals("Bob", state.currentCrewMember)
    }

    @Test
    fun `nextCrewMember returns null when empty`() {
        val state = CrewWatchState()
        assertNull(state.nextCrewMember)
    }

    @Test
    fun `nextCrewMember returns next member`() {
        val state = CrewWatchState(
            crewMembers = listOf("Alice", "Bob", "Charlie"),
            currentWatchIndex = 0
        )
        assertEquals("Bob", state.nextCrewMember)
    }

    @Test
    fun `nextCrewMember wraps around at end`() {
        val state = CrewWatchState(
            crewMembers = listOf("Alice", "Bob", "Charlie"),
            currentWatchIndex = 2
        )
        assertEquals("Alice", state.nextCrewMember)
    }

    @Test
    fun `progress is zero when remaining equals duration`() {
        val state = CrewWatchState(
            watchDurationMs = 10000L,
            remainingMs = 10000L
        )
        assertEquals(0f, state.progress, 0.01f)
    }

    @Test
    fun `progress is 1 when remaining is zero`() {
        val state = CrewWatchState(
            watchDurationMs = 10000L,
            remainingMs = 0L
        )
        assertEquals(1f, state.progress, 0.01f)
    }

    @Test
    fun `progress is 0_5 at halfway`() {
        val state = CrewWatchState(
            watchDurationMs = 10000L,
            remainingMs = 5000L
        )
        assertEquals(0.5f, state.progress, 0.01f)
    }

    @Test
    fun `progress is zero when duration is zero`() {
        val state = CrewWatchState(
            watchDurationMs = 0L,
            remainingMs = 0L
        )
        assertEquals(0f, state.progress, 0.01f)
    }

    @Test
    fun `copy preserves values`() {
        val state = CrewWatchState(
            isRunning = true,
            crewMembers = listOf("Alice"),
            currentWatchIndex = 0,
            watchDurationMs = 3600000L,
            totalWatchChanges = 5
        )
        val copied = state.copy(isRunning = false)
        assertFalse(copied.isRunning)
        assertEquals(listOf("Alice"), copied.crewMembers)
        assertEquals(5, copied.totalWatchChanges)
    }

    @Test
    fun `currentCrewMember returns null for out of bounds index`() {
        val state = CrewWatchState(
            crewMembers = listOf("Alice"),
            currentWatchIndex = 5
        )
        assertNull(state.currentCrewMember)
    }
}
