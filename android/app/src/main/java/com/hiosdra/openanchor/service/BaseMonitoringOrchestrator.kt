package com.hiosdra.openanchor.service

import java.util.concurrent.CopyOnWriteArrayList
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

/**
 * Base class for monitoring orchestrators providing common job tracking
 * and alarm helpers. Mode-specific logic stays in concrete subclasses.
 */
abstract class BaseMonitoringOrchestrator(
    protected val alarmPlayer: AlarmPlayer,
    protected val wearDataSender: WearDataSender,
    protected val standaloneMonitorManager: StandaloneMonitorManager
) {
    private val trackedJobs = CopyOnWriteArrayList<Job>()

    /**
     * Launch a coroutine tracked for bulk cancellation via [cancelAll].
     */
    protected fun CoroutineScope.launchTracked(block: suspend CoroutineScope.() -> Unit): Job {
        return launch(block = block).also { job ->
            trackedJobs.add(job)
            job.invokeOnCompletion { trackedJobs.remove(job) }
        }
    }

    /**
     * Cancel all tracked jobs. Subclasses may override to add mode-specific cleanup
     * but must call super.
     */
    open fun cancelAll() {
        trackedJobs.forEach { it.cancel() }
        trackedJobs.clear()
    }

    protected fun stopAlarmIfPlaying() {
        if (alarmPlayer.isPlaying()) alarmPlayer.stopAlarm()
    }

    protected fun triggerAlarmAndNotifyWear(scope: CoroutineScope) {
        if (!alarmPlayer.isPlaying()) alarmPlayer.startAlarm()
        scope.launch { wearDataSender.sendAlarmTrigger() }
    }
}
