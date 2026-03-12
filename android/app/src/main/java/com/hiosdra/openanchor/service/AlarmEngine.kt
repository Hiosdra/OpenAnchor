package com.hiosdra.openanchor.service

import com.hiosdra.openanchor.domain.geometry.ZoneCheckResult
import com.hiosdra.openanchor.domain.model.AlarmState
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
 */
class AlarmEngine @Inject constructor(
    private val clock: Clock
) {

    private var violationCount: Int = 0
    private var firstViolationTime: Long? = null

    val currentState: AlarmState
        get() = when {
            violationCount >= 3 && elapsedSinceFirstViolation() >= 3000L -> AlarmState.ALARM
            violationCount > 0 -> AlarmState.WARNING
            else -> AlarmState.SAFE
        }

    /**
     * Process a new GPS reading with multi-level zone support.
     * @param zoneResult the result of checking position against the zone
     * @return the new alarm state after processing
     */
    fun processReading(zoneResult: ZoneCheckResult): AlarmState {
        return when (zoneResult) {
            ZoneCheckResult.INSIDE -> {
                reset()
                AlarmState.SAFE
            }
            ZoneCheckResult.BUFFER -> {
                // In buffer zone: reset violation count but report CAUTION
                reset()
                AlarmState.CAUTION
            }
            ZoneCheckResult.OUTSIDE -> {
                violationCount++
                if (firstViolationTime == null) {
                    firstViolationTime = clock.millis()
                }
                currentState
            }
        }
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
        violationCount = 0
        firstViolationTime = null
    }

    /**
     * Accept an external alarm state from the PWA (paired mode).
     * Bypasses local zone checking — the PWA is the authority.
     * @param externalState the alarm state determined by the PWA
     * @return the alarm state to use (same as input)
     */
    fun processExternalAlarm(externalState: AlarmState): AlarmState {
        return when (externalState) {
            AlarmState.SAFE, AlarmState.CAUTION -> {
                reset()
                externalState
            }
            AlarmState.WARNING, AlarmState.ALARM -> {
                // Mirror the external state without local debouncing
                externalState
            }
        }
    }

    private fun elapsedSinceFirstViolation(): Long {
        return firstViolationTime?.let { clock.millis() - it } ?: 0L
    }
}
