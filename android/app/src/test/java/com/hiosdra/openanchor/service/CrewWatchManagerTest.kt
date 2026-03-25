package com.hiosdra.openanchor.service

import android.content.Context
import io.mockk.*
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class CrewWatchManagerTest {

    private lateinit var context: Context
    private lateinit var manager: CrewWatchManager

    @Before
    fun setup() {
        context = mockk(relaxed = true)
        manager = CrewWatchManager(context)
    }

    @Test
    fun `initial state is not running with empty crew`() {
        val state = manager.state.value
        assertFalse(state.isRunning)
        assertTrue(state.crewMembers.isEmpty())
        assertEquals(0, state.currentWatchIndex)
    }

    @Test
    fun `setCrewMembers updates crew list`() {
        manager.setCrewMembers(listOf("Alice", "Bob", "Charlie"))
        assertEquals(listOf("Alice", "Bob", "Charlie"), manager.state.value.crewMembers)
    }

    @Test
    fun `addCrewMember appends member`() {
        manager.addCrewMember("Alice")
        manager.addCrewMember("Bob")
        assertEquals(listOf("Alice", "Bob"), manager.state.value.crewMembers)
    }

    @Test
    fun `addCrewMember trims whitespace`() {
        manager.addCrewMember("  Alice  ")
        assertEquals(listOf("Alice"), manager.state.value.crewMembers)
    }

    @Test
    fun `addCrewMember ignores blank names`() {
        manager.addCrewMember("")
        manager.addCrewMember("   ")
        assertTrue(manager.state.value.crewMembers.isEmpty())
    }

    @Test
    fun `removeCrewMember removes by index`() {
        manager.setCrewMembers(listOf("Alice", "Bob", "Charlie"))
        manager.removeCrewMember(1)
        assertEquals(listOf("Alice", "Charlie"), manager.state.value.crewMembers)
    }

    @Test
    fun `removeCrewMember ignores out of bounds`() {
        manager.setCrewMembers(listOf("Alice", "Bob"))
        manager.removeCrewMember(5)
        assertEquals(listOf("Alice", "Bob"), manager.state.value.crewMembers)
    }

    @Test
    fun `removeCrewMember adjusts current index if needed`() {
        manager.setCrewMembers(listOf("Alice", "Bob"))
        // Simulate currentWatchIndex being at index 1 by starting watch on second member
        manager.removeCrewMember(0)
        val state = manager.state.value
        assertEquals(listOf("Bob"), state.crewMembers)
        assertTrue(state.currentWatchIndex >= 0)
        assertTrue(state.currentWatchIndex < state.crewMembers.size)
    }

    @Test
    fun `setWatchDuration sets duration in milliseconds`() {
        manager.setWatchDuration(2)
        assertEquals(2 * 60 * 60 * 1000L, manager.state.value.watchDurationMs)
    }

    @Test
    fun `setWatchDuration for 6 hours`() {
        manager.setWatchDuration(6)
        assertEquals(6 * 60 * 60 * 1000L, manager.state.value.watchDurationMs)
    }

    @Test
    fun `startWatch does nothing with empty crew`() {
        manager.startWatch()
        assertFalse(manager.state.value.isRunning)
    }

    @Test
    fun `startWatch sets running state`() {
        manager.setCrewMembers(listOf("Alice", "Bob"))
        manager.startWatch()
        val state = manager.state.value
        assertTrue(state.isRunning)
        assertTrue(state.watchStartTimeMs > 0)
        assertEquals(state.watchDurationMs, state.remainingMs)
        assertFalse(state.warningFired)
    }

    @Test
    fun `stopWatch resets running state`() {
        manager.setCrewMembers(listOf("Alice", "Bob"))
        manager.startWatch()
        manager.stopWatch()
        val state = manager.state.value
        assertFalse(state.isRunning)
        assertEquals(0L, state.remainingMs)
        assertEquals(0L, state.watchStartTimeMs)
    }

    @Test
    fun `setCrewMembers replaces existing members`() {
        manager.setCrewMembers(listOf("Alice", "Bob"))
        manager.setCrewMembers(listOf("Charlie", "Dave", "Eve"))
        assertEquals(listOf("Charlie", "Dave", "Eve"), manager.state.value.crewMembers)
    }

    @Test
    fun `removeCrewMember from single member list`() {
        manager.setCrewMembers(listOf("Alice"))
        manager.removeCrewMember(0)
        assertTrue(manager.state.value.crewMembers.isEmpty())
        assertEquals(0, manager.state.value.currentWatchIndex)
    }

    @Test
    fun `default watch duration is 4 hours`() {
        assertEquals(4 * 60 * 60 * 1000L, manager.state.value.watchDurationMs)
    }

    @Test
    fun `removeCrewMember with negative index is safe`() {
        manager.setCrewMembers(listOf("Alice", "Bob"))
        manager.removeCrewMember(-1)
        assertEquals(listOf("Alice", "Bob"), manager.state.value.crewMembers)
    }
}
