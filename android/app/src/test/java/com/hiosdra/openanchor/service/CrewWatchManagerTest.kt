package com.hiosdra.openanchor.service

import android.content.Context
import io.mockk.*
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.first
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

    // --- CrewWatchState computed properties ---

    @Test
    fun `currentCrewMember returns correct member`() {
        val state = CrewWatchManager.CrewWatchState(
            crewMembers = listOf("Alice", "Bob", "Charlie"),
            currentWatchIndex = 1
        )
        assertEquals("Bob", state.currentCrewMember)
    }

    @Test
    fun `currentCrewMember returns null for empty crew`() {
        val state = CrewWatchManager.CrewWatchState(crewMembers = emptyList())
        assertNull(state.currentCrewMember)
    }

    @Test
    fun `currentCrewMember returns null for out of bounds index`() {
        val state = CrewWatchManager.CrewWatchState(
            crewMembers = listOf("Alice"),
            currentWatchIndex = 5
        )
        assertNull(state.currentCrewMember)
    }

    @Test
    fun `nextCrewMember wraps around`() {
        val state = CrewWatchManager.CrewWatchState(
            crewMembers = listOf("Alice", "Bob", "Charlie"),
            currentWatchIndex = 2
        )
        assertEquals("Alice", state.nextCrewMember)
    }

    @Test
    fun `nextCrewMember returns second member when at first`() {
        val state = CrewWatchManager.CrewWatchState(
            crewMembers = listOf("Alice", "Bob"),
            currentWatchIndex = 0
        )
        assertEquals("Bob", state.nextCrewMember)
    }

    @Test
    fun `nextCrewMember returns null for empty crew`() {
        val state = CrewWatchManager.CrewWatchState(crewMembers = emptyList())
        assertNull(state.nextCrewMember)
    }

    @Test
    fun `nextCrewMember with single member returns same member`() {
        val state = CrewWatchManager.CrewWatchState(
            crewMembers = listOf("Alice"),
            currentWatchIndex = 0
        )
        assertEquals("Alice", state.nextCrewMember)
    }

    @Test
    fun `progress is 0 when remaining equals duration`() {
        val state = CrewWatchManager.CrewWatchState(
            watchDurationMs = 10000L,
            remainingMs = 10000L
        )
        assertEquals(0f, state.progress, 0.001f)
    }

    @Test
    fun `progress is 1 when remaining is 0`() {
        val state = CrewWatchManager.CrewWatchState(
            watchDurationMs = 10000L,
            remainingMs = 0L
        )
        assertEquals(1f, state.progress, 0.001f)
    }

    @Test
    fun `progress is 0_5 at halfway`() {
        val state = CrewWatchManager.CrewWatchState(
            watchDurationMs = 10000L,
            remainingMs = 5000L
        )
        assertEquals(0.5f, state.progress, 0.001f)
    }

    @Test
    fun `progress is 0 when duration is 0`() {
        val state = CrewWatchManager.CrewWatchState(
            watchDurationMs = 0L,
            remainingMs = 0L
        )
        assertEquals(0f, state.progress, 0.001f)
    }

    // --- stopWatch event emission ---

    @Test
    fun `stopWatch emits WatchStopped event`() = runBlocking {
        manager.setCrewMembers(listOf("Alice", "Bob"))
        manager.startWatch()

        val eventDeferred = async {
            manager.events.first { it is CrewWatchManager.CrewWatchEvent.WatchStopped }
        }
        delay(50) // let collector subscribe

        manager.stopWatch()

        val event = withTimeout(2000) { eventDeferred.await() }
        assertTrue(event is CrewWatchManager.CrewWatchEvent.WatchStopped)
    }

    // --- setWatchDuration edge cases ---

    @Test
    fun `setWatchDuration with 1 hour`() {
        manager.setWatchDuration(1)
        assertEquals(1 * 60 * 60 * 1000L, manager.state.value.watchDurationMs)
    }

    // --- removeCrewMember index adjustment ---

    @Test
    fun `removeCrewMember adjusts index when it exceeds new list size`() {
        manager.setCrewMembers(listOf("Alice", "Bob", "Charlie"))
        // Simulate currentWatchIndex at last position via state
        val stateField = CrewWatchManager::class.java.getDeclaredField("_state")
        stateField.isAccessible = true
        @Suppress("UNCHECKED_CAST")
        val stateFlow = stateField.get(manager) as kotlinx.coroutines.flow.MutableStateFlow<CrewWatchManager.CrewWatchState>
        stateFlow.value = stateFlow.value.copy(currentWatchIndex = 2)

        manager.removeCrewMember(2) // remove Charlie, index 2 is now out of bounds
        val state = manager.state.value
        assertEquals(listOf("Alice", "Bob"), state.crewMembers)
        assertTrue(state.currentWatchIndex < state.crewMembers.size)
    }

    // --- startWatch idempotency ---

    @Test
    fun `startWatch twice replaces timer`() {
        manager.setCrewMembers(listOf("Alice"))
        manager.startWatch()
        val firstStartTime = manager.state.value.watchStartTimeMs
        Thread.sleep(10)
        manager.startWatch()
        val secondStartTime = manager.state.value.watchStartTimeMs
        assertTrue(secondStartTime >= firstStartTime)
        assertTrue(manager.state.value.isRunning)
        manager.stopWatch()
    }

    // --- CrewWatchState totalWatchChanges ---

    @Test
    fun `initial totalWatchChanges is 0`() {
        assertEquals(0, manager.state.value.totalWatchChanges)
    }

    @Test
    fun `CrewWatchState defaults`() {
        val state = CrewWatchManager.CrewWatchState()
        assertFalse(state.isRunning)
        assertTrue(state.crewMembers.isEmpty())
        assertEquals(0, state.currentWatchIndex)
        assertEquals(4 * 60 * 60 * 1000L, state.watchDurationMs)
        assertEquals(0L, state.watchStartTimeMs)
        assertEquals(0L, state.remainingMs)
        assertFalse(state.warningFired)
        assertEquals(0, state.totalWatchChanges)
    }
}
