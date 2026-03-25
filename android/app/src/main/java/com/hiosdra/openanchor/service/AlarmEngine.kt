package com.hiosdra.openanchor.service

import com.hiosdra.openanchor.domain.geometry.ZoneCheckResult
import com.hiosdra.openanchor.domain.model.AlarmState
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.time.Clock
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
 * Thread safety: Uses kotlinx.coroutines Mutex for coroutine-safe state access.
 */
class AlarmEngine @Inject constructor(
    private val clock: Clock
) {
    private val mutex = Mutex()

    private var violationCount: Int = 0
    private var firstViolationTime: Long? = null
    private var _currentState: AlarmState = AlarmState.SAFE

    val currentState: AlarmState
        get() = _currentState

    /**
     * Process a new GPS reading with multi-level zone support.
     * @param zoneResult the result of checking position against the zone
     * @return the new alarm state after processing
     */
    suspend fun processReading(zoneResult: ZoneCheckResult): AlarmState = mutex.withLock {
        when (zoneResult) {
            ZoneCheckResult.INSIDE -> {
                resetInternal()
                _currentState
            }
            ZoneCheckResult.BUFFER -> {
                violationCount = 0
                firstViolationTime = null
                _currentState = AlarmState.CAUTION
                _currentState
            }
            ZoneCheckResult.OUTSIDE -> {
                violationCount++
                if (firstViolationTime == null) {
                    firstViolationTime = clock.millis()
                }
                updateState()
                _currentState
            }
        }
    }

    private fun updateState() {
        _currentState = when {
            violationCount >= 3 && elapsedSinceFirstViolation() >= 3000L -> AlarmState.ALARM
            violationCount > 0 -> AlarmState.WARNING
            else -> AlarmState.SAFE
        }
    }

    /**
     * Legacy: Process a new GPS reading with simple inside/outside check.
     * @param isInsideZone whether the current position is inside the safe zone
     * @return the new alarm state after processing
     */
    suspend fun processReading(isInsideZone: Boolean): AlarmState {
        return processReading(if (isInsideZone) ZoneCheckResult.INSIDE else ZoneCheckResult.OUTSIDE)
    }

    suspend fun reset() = mutex.withLock {
        resetInternal()
    }

    private fun resetInternal() {
        violationCount = 0
        firstViolationTime = null
        _currentState = AlarmState.SAFE
    }

    /**
     * Accept an external alarm state from the PWA (paired mode).
     * Bypasses local zone checking — the PWA is the authority.
     * @param externalState the alarm state determined by the PWA
     * @return the alarm state to use (same as input)
     */
    suspend fun processExternalAlarm(externalState: AlarmState): AlarmState = mutex.withLock {
        _currentState = externalState
        when (externalState) {
            AlarmState.SAFE, AlarmState.CAUTION -> {
                resetInternal()
                externalState
            }
            AlarmState.WARNING, AlarmState.ALARM -> {
                externalState
            }
        }
    }

    private fun elapsedSinceFirstViolation(): Long {
        return firstViolationTime?.let { clock.millis() - it } ?: 0L
    }
}
