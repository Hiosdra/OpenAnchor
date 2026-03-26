package com.hiosdra.openanchor.service

import com.hiosdra.openanchor.domain.geometry.ZoneCheckResult
import com.hiosdra.openanchor.domain.model.AlarmState
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.time.Clock
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicLong
import java.util.concurrent.atomic.AtomicReference
import javax.inject.Inject

/**
 * Alarm engine that tracks GPS violations with multi-level zone support.
 *
 * Zone states:
 * - SAFE: Inside the primary safe zone
 * - CAUTION: In the buffer zone (between primary and buffer radius)
 * - WARNING: Outside all zones, violation building (< 3 readings or < 3 seconds)
 * - ALARM: 3+ consecutive readings AND 3+ seconds outside all zones
 *
 * Thread safety: Uses AtomicReference/AtomicInteger for lock-free state management.
 */
class AlarmEngine @Inject constructor(
    private val clock: Clock
) {
    private val violationCount = AtomicInteger(0)
    private val firstViolationTime = AtomicLong(0L) // 0 means not set
    private val _currentState = AtomicReference(AlarmState.SAFE)

    val currentState: AlarmState
        get() = _currentState.get()

    /**
     * Process a new GPS reading with multi-level zone support.
     * @param zoneResult the result of checking position against the zone
     * @return the new alarm state after processing
     */
    fun processReading(zoneResult: ZoneCheckResult): AlarmState {
        return when (zoneResult) {
            ZoneCheckResult.INSIDE -> {
                reset()
                _currentState.get()
            }
            ZoneCheckResult.BUFFER -> {
                violationCount.set(0)
                firstViolationTime.set(0L)
                _currentState.set(AlarmState.CAUTION)
                AlarmState.CAUTION
            }
            ZoneCheckResult.OUTSIDE -> {
                val count = violationCount.incrementAndGet()
                firstViolationTime.compareAndSet(0L, clock.millis())
                updateState(count)
                _currentState.get()
            }
        }
    }

    private fun updateState(count: Int) {
        val elapsed = elapsedSinceFirstViolation()
        val newState = when {
            count >= 3 && elapsed >= 3000L -> AlarmState.ALARM
            count > 0 -> AlarmState.WARNING
            else -> AlarmState.SAFE
        }
        _currentState.set(newState)
    }

    /**
     * Legacy: Process a new GPS reading with simple inside/outside check.
     * @param isInsideZone whether the current position is inside the safe zone
     * @return the new alarm state after processing
     */
    fun processReading(isInsideZone: Boolean): AlarmState {
        return processReading(if (isInsideZone) ZoneCheckResult.INSIDE else ZoneCheckResult.OUTSIDE)
    }

    fun reset() {
        resetCounters()
        _currentState.set(AlarmState.SAFE)
    }

    private fun resetCounters() {
        violationCount.set(0)
        firstViolationTime.set(0L)
    }

    /**
     * Accept an external alarm state from the PWA (paired mode).
     * Bypasses local zone checking — the PWA is the authority.
     * @param externalState the alarm state determined by the PWA
     * @return the alarm state to use (same as input)
     */
    fun processExternalAlarm(externalState: AlarmState): AlarmState {
        _currentState.set(externalState)
        when (externalState) {
            AlarmState.SAFE -> reset()
            AlarmState.CAUTION -> resetCounters()
            AlarmState.WARNING, AlarmState.ALARM -> { /* keep state */ }
        }
        return externalState
    }

    private fun elapsedSinceFirstViolation(): Long {
        val time = firstViolationTime.get()
        return if (time > 0L) clock.millis() - time else 0L
    }
}
