package com.hiosdra.openanchor.service

import io.mockk.*
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class BaseMonitoringOrchestratorTest {

    private lateinit var alarmPlayer: AlarmPlayer
    private lateinit var wearDataSender: WearDataSender
    private lateinit var standaloneMonitorManager: StandaloneMonitorManager

    private lateinit var orchestrator: TestOrchestrator

    /** Concrete subclass for testing the abstract base. */
    private class TestOrchestrator(
        alarmPlayer: AlarmPlayer,
        wearDataSender: WearDataSender,
        standaloneMonitorManager: StandaloneMonitorManager
    ) : BaseMonitoringOrchestrator(alarmPlayer, wearDataSender, standaloneMonitorManager) {

        fun exposeStopAlarmIfPlaying() = stopAlarmIfPlaying()
        fun exposeTriggerAlarmAndNotifyWear(scope: kotlinx.coroutines.CoroutineScope) =
            triggerAlarmAndNotifyWear(scope)
        fun exposeLaunchTracked(scope: kotlinx.coroutines.CoroutineScope, block: suspend kotlinx.coroutines.CoroutineScope.() -> Unit) =
            scope.launchTracked(block)
    }

    @Before
    fun setUp() {
        alarmPlayer = mockk(relaxed = true)
        wearDataSender = mockk(relaxed = true)
        standaloneMonitorManager = mockk(relaxed = true)
        orchestrator = TestOrchestrator(alarmPlayer, wearDataSender, standaloneMonitorManager)
    }

    @After
    fun tearDown() {
        unmockkAll()
    }

    @Test
    fun `stopAlarmIfPlaying stops alarm when playing`() {
        every { alarmPlayer.isPlaying() } returns true
        orchestrator.exposeStopAlarmIfPlaying()
        verify(exactly = 1) { alarmPlayer.stopAlarm() }
    }

    @Test
    fun `stopAlarmIfPlaying does nothing when not playing`() {
        every { alarmPlayer.isPlaying() } returns false
        orchestrator.exposeStopAlarmIfPlaying()
        verify(exactly = 0) { alarmPlayer.stopAlarm() }
    }

    @Test
    fun `triggerAlarmAndNotifyWear starts alarm and sends wear trigger`() = runTest {
        every { alarmPlayer.isPlaying() } returns false
        coEvery { wearDataSender.sendAlarmTrigger() } just Runs

        orchestrator.exposeTriggerAlarmAndNotifyWear(this)
        advanceUntilIdle()

        verify(exactly = 1) { alarmPlayer.startAlarm() }
        coVerify(exactly = 1) { wearDataSender.sendAlarmTrigger() }
    }

    @Test
    fun `triggerAlarmAndNotifyWear does not start alarm if already playing`() = runTest {
        every { alarmPlayer.isPlaying() } returns true
        coEvery { wearDataSender.sendAlarmTrigger() } just Runs

        orchestrator.exposeTriggerAlarmAndNotifyWear(this)
        advanceUntilIdle()

        verify(exactly = 0) { alarmPlayer.startAlarm() }
        coVerify(exactly = 1) { wearDataSender.sendAlarmTrigger() }
    }

    @Test
    fun `cancelAll cancels tracked jobs`() = runTest {
        var completed = false
        val job = orchestrator.exposeLaunchTracked(this) {
            kotlinx.coroutines.delay(10_000)
            completed = true
        }

        assertTrue(job.isActive)
        orchestrator.cancelAll()
        advanceUntilIdle()

        assertTrue(job.isCancelled)
        assertFalse(completed)
    }

    @Test
    fun `cancelAll can be called multiple times safely`() {
        orchestrator.cancelAll()
        orchestrator.cancelAll()
        // No exception thrown
    }

    @Test
    fun `launchTracked jobs are tracked and cancelled together`() = runTest {
        val job1 = orchestrator.exposeLaunchTracked(this) { kotlinx.coroutines.delay(10_000) }
        val job2 = orchestrator.exposeLaunchTracked(this) { kotlinx.coroutines.delay(10_000) }

        orchestrator.cancelAll()
        advanceUntilIdle()

        assertTrue(job1.isCancelled)
        assertTrue(job2.isCancelled)
    }
}
