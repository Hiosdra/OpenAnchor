package com.hiosdra.openanchor.service

import android.content.Context
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.os.Build
import android.util.Log
import com.google.android.gms.wearable.Wearable
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manages crew watch timer and schedule.
 *
 * Features:
 * - Configurable watch duration (1-6 hours)
 * - Crew member list with rotating schedule
 * - Countdown timer with 5-minute warning
 * - Phone vibration + Wear OS vibration alarm at watch change
 * - Persistent state across config changes
 */
// TODO: CrewWatchManager should implement CrewWatchApi (core/domain) and align
//  state/method signatures (CrewWatchState fields, startWatch params, acknowledgeAlarm).
//  Deferred to avoid behavior changes in this refactor PR.
@Singleton
class CrewWatchManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    companion object {
        private const val TAG = "CrewWatchManager"
        private const val WEAR_WATCH_CHANGE_PATH = "/openanchor/crew_watch_change"
        private const val WEAR_WATCH_WARNING_PATH = "/openanchor/crew_watch_warning"
        private const val WARNING_BEFORE_END_MS = 5 * 60 * 1000L // 5 minutes
    }

    private val messageClient by lazy { Wearable.getMessageClient(context) }
    private val nodeClient by lazy { Wearable.getNodeClient(context) }

    private var timerJob: Job? = null
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    private val _state = MutableStateFlow(CrewWatchState())
    val state: StateFlow<CrewWatchState> = _state.asStateFlow()

    private val _events = MutableSharedFlow<CrewWatchEvent>(
        replay = 0,
        extraBufferCapacity = 8
    )
    val events: SharedFlow<CrewWatchEvent> = _events.asSharedFlow()

    data class CrewWatchState(
        val isRunning: Boolean = false,
        val crewMembers: List<String> = emptyList(),
        val currentWatchIndex: Int = 0,
        val watchDurationMs: Long = 4 * 60 * 60 * 1000L, // 4 hours default
        val watchStartTimeMs: Long = 0L,
        val remainingMs: Long = 0L,
        val warningFired: Boolean = false,
        val totalWatchChanges: Int = 0
    ) {
        val currentCrewMember: String?
            get() = crewMembers.getOrNull(currentWatchIndex)

        val nextCrewMember: String?
            get() = if (crewMembers.isEmpty()) null
            else crewMembers[(currentWatchIndex + 1) % crewMembers.size]

        val progress: Float
            get() = if (watchDurationMs > 0) 1f - (remainingMs.toFloat() / watchDurationMs)
            else 0f
    }

    sealed class CrewWatchEvent {
        data object WatchWarning : CrewWatchEvent()
        data class WatchChange(val newCrewMember: String) : CrewWatchEvent()
        data object WatchStopped : CrewWatchEvent()
    }

    fun setCrewMembers(members: List<String>) {
        _state.update { it.copy(crewMembers = members) }
    }

    fun addCrewMember(name: String) {
        if (name.isBlank()) return
        _state.update { it.copy(crewMembers = it.crewMembers + name.trim()) }
    }

    fun removeCrewMember(index: Int) {
        _state.update { state ->
            val newMembers = state.crewMembers.toMutableList().apply {
                if (index in indices) removeAt(index)
            }
            // Adjust current watch index if needed
            val newIndex = if (state.currentWatchIndex >= newMembers.size)
                0.coerceAtMost(newMembers.size - 1).coerceAtLeast(0)
            else state.currentWatchIndex
            state.copy(crewMembers = newMembers, currentWatchIndex = newIndex)
        }
    }

    fun setWatchDuration(hours: Int) {
        val durationMs = hours.toLong() * 60 * 60 * 1000L
        _state.update { it.copy(watchDurationMs = durationMs) }
    }

    fun startWatch() {
        if (_state.value.crewMembers.isEmpty()) return

        // Always cancel any existing timer before starting a new one
        timerJob?.cancel()
        timerJob = null

        val now = System.currentTimeMillis()
        _state.update {
            it.copy(
                isRunning = true,
                watchStartTimeMs = now,
                remainingMs = it.watchDurationMs,
                warningFired = false
            )
        }

        timerJob = scope.launch {
            while (isActive && _state.value.isRunning) {
                delay(1000)
                val elapsed = System.currentTimeMillis() - _state.value.watchStartTimeMs
                val remaining = (_state.value.watchDurationMs - elapsed).coerceAtLeast(0)
                _state.update { it.copy(remainingMs = remaining) }

                // 5-minute warning
                if (remaining in 1..WARNING_BEFORE_END_MS && !_state.value.warningFired) {
                    _state.update { it.copy(warningFired = true) }
                    _events.emit(CrewWatchEvent.WatchWarning)
                    vibratePhone(pattern = longArrayOf(0, 300, 200, 300, 200, 300))
                    sendWearMessage(WEAR_WATCH_WARNING_PATH)
                    Log.i(TAG, "5-minute watch change warning")
                }

                // Watch change
                if (remaining == 0L) {
                    rotateWatch()
                }
            }
        }

        Log.i(TAG, "Watch started: ${_state.value.currentCrewMember}, duration=${_state.value.watchDurationMs}ms")
    }

    fun stopWatch() {
        timerJob?.cancel()
        timerJob = null
        _state.update {
            it.copy(
                isRunning = false,
                remainingMs = 0,
                watchStartTimeMs = 0
            )
        }
        scope.launch { _events.emit(CrewWatchEvent.WatchStopped) }
        Log.i(TAG, "Watch stopped")
    }

    private suspend fun rotateWatch() {
        val state = _state.value
        val nextIndex = if (state.crewMembers.isEmpty()) 0
        else (state.currentWatchIndex + 1) % state.crewMembers.size
        val nextMember = state.crewMembers.getOrElse(nextIndex) { "?" }

        _state.update {
            it.copy(
                currentWatchIndex = nextIndex,
                watchStartTimeMs = System.currentTimeMillis(),
                remainingMs = it.watchDurationMs,
                warningFired = false,
                totalWatchChanges = it.totalWatchChanges + 1
            )
        }

        _events.emit(CrewWatchEvent.WatchChange(nextMember))

        // Heavy vibration for watch change
        vibratePhone(pattern = longArrayOf(0, 500, 200, 500, 200, 500, 200, 800))
        sendWearMessage(WEAR_WATCH_CHANGE_PATH)
        Log.i(TAG, "Watch rotated to: $nextMember (index=$nextIndex)")
    }

    private fun vibratePhone(pattern: LongArray) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
                val vibrator = vibratorManager.defaultVibrator
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1))
            } else {
                @Suppress("DEPRECATION")
                val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to vibrate", e)
        }
    }

    private fun sendWearMessage(path: String) {
        scope.launch {
            try {
                val nodes = nodeClient.connectedNodes.await()
                for (node in nodes) {
                    messageClient.sendMessage(node.id, path, byteArrayOf()).await()
                    Log.d(TAG, "Wear message sent to ${node.displayName}: $path")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to send Wear message", e)
            }
        }
    }
}
