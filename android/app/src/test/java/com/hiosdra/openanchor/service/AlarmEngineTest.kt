package com.hiosdra.openanchor.service

import com.hiosdra.openanchor.domain.geometry.ZoneCheckResult
import com.hiosdra.openanchor.domain.model.AlarmState
import com.hiosdra.openanchor.domain.time.TestClock
import org.junit.Before
import org.junit.Test
import org.junit.Assert.*

/**
 * Comprehensive tests for AlarmEngine - alarm state management with debouncing.
 */
class AlarmEngineTest {

    private lateinit var alarmEngine: AlarmEngine
    private lateinit var testClock: TestClock

    @Before
    fun setup() {
        testClock = TestClock(1000000L) // Start at some arbitrary time
        alarmEngine = AlarmEngine(testClock)
    }

    private fun advanceTime(millis: Long) {
        testClock.advanceTime(millis)
    }

    // ========== Initial State ==========

    @Test
    fun initialState_isSafe() {
        assertEquals(AlarmState.SAFE, alarmEngine.currentState)
    }

    // ========== INSIDE Zone Processing ==========

    @Test
    fun processReading_inside_returnsSafe() {
        val result = alarmEngine.processReading(ZoneCheckResult.INSIDE)
        assertEquals(AlarmState.SAFE, result)
        assertEquals(AlarmState.SAFE, alarmEngine.currentState)
    }

    @Test
    fun processReading_inside_resetsViolations() {
        // First create some violations
        alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
        alarmEngine.processReading(ZoneCheckResult.OUTSIDE)

        // Then go back inside
        val result = alarmEngine.processReading(ZoneCheckResult.INSIDE)

        assertEquals(AlarmState.SAFE, result)
        assertEquals(AlarmState.SAFE, alarmEngine.currentState)
    }

    @Test
    fun processReading_multipleInside_staysSafe() {
        repeat(10) {
            val result = alarmEngine.processReading(ZoneCheckResult.INSIDE)
            assertEquals(AlarmState.SAFE, result)
        }
        assertEquals(AlarmState.SAFE, alarmEngine.currentState)
    }

    // ========== BUFFER Zone Processing ==========

    @Test
    fun processReading_buffer_returnsCaution() {
        val result = alarmEngine.processReading(ZoneCheckResult.BUFFER)
        assertEquals(AlarmState.CAUTION, result)
    }

    @Test
    fun processReading_buffer_resetsViolations() {
        // First create some violations
        alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
        alarmEngine.processReading(ZoneCheckResult.OUTSIDE)

        // Then enter buffer zone
        val result = alarmEngine.processReading(ZoneCheckResult.BUFFER)

        assertEquals(AlarmState.CAUTION, result)
        assertEquals(AlarmState.CAUTION, alarmEngine.currentState)
    }

    @Test
    fun processReading_bufferAfterInside_returnsCaution() {
        alarmEngine.processReading(ZoneCheckResult.INSIDE)
        val result = alarmEngine.processReading(ZoneCheckResult.BUFFER)
        assertEquals(AlarmState.CAUTION, result)
    }

    @Test
    fun processReading_insideAfterBuffer_returnsSafe() {
        alarmEngine.processReading(ZoneCheckResult.BUFFER)
        val result = alarmEngine.processReading(ZoneCheckResult.INSIDE)
        assertEquals(AlarmState.SAFE, result)
    }

    // ========== OUTSIDE Zone Processing - WARNING State ==========

    @Test
    fun processReading_firstOutside_returnsWarning() {
        val result = alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
        assertEquals(AlarmState.WARNING, result)
        assertEquals(AlarmState.WARNING, alarmEngine.currentState)
    }

    @Test
    fun processReading_secondOutside_returnsWarning() {
        alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
        advanceTime(500)
        val result = alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
        assertEquals(AlarmState.WARNING, result)
    }

    @Test
    fun processReading_twoOutside_lessThan3Seconds_returnsWarning() {
        alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
        advanceTime(2000) // 2 seconds
        val result = alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
        assertEquals(AlarmState.WARNING, result)
        assertEquals(AlarmState.WARNING, alarmEngine.currentState)
    }

    // ========== OUTSIDE Zone Processing - ALARM State ==========

    @Test
    fun processReading_threeOutside_lessThan3Seconds_returnsWarning() {
        alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
        advanceTime(1000)
        alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
        advanceTime(1000) // Total 2 seconds
        val result = alarmEngine.processReading(ZoneCheckResult.OUTSIDE)

        // 3 readings but only 2 seconds elapsed - should still be WARNING
        assertEquals(AlarmState.WARNING, result)
    }

    @Test
    fun processReading_threeOutside_3Seconds_triggersAlarm() {
        alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
        advanceTime(1500)
        alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
        advanceTime(1500) // Total 3 seconds
        val result = alarmEngine.processReading(ZoneCheckResult.OUTSIDE)

        // 3 readings AND 3 seconds elapsed - should be ALARM
        assertEquals(AlarmState.ALARM, result)
        assertEquals(AlarmState.ALARM, alarmEngine.currentState)
    }

    @Test
    fun processReading_threeOutside_moreThan3Seconds_triggersAlarm() {
        alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
        advanceTime(2000)
        alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
        advanceTime(2000) // Total 4 seconds
        val result = alarmEngine.processReading(ZoneCheckResult.OUTSIDE)

        assertEquals(AlarmState.ALARM, result)
    }

    @Test
    fun processReading_fourOutside_3Seconds_triggersAlarm() {
        alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
        advanceTime(1000)
        alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
        advanceTime(1000)
        alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
        advanceTime(1000) // Total 3 seconds
        val result = alarmEngine.processReading(ZoneCheckResult.OUTSIDE)

        assertEquals(AlarmState.ALARM, result)
    }

    @Test
    fun processReading_manyOutside_longTime_maintainsAlarm() {
        // Trigger alarm
        repeat(3) {
            alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
            advanceTime(1500)
        }

        // Continue with more readings
        repeat(5) {
            advanceTime(1000)
            val result = alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
            assertEquals(AlarmState.ALARM, result)
        }
    }

    // ========== ALARM Recovery ==========

    @Test
    fun processReading_alarmThenInside_returnsSafe() {
        // Trigger alarm
        repeat(3) {
            alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
            advanceTime(1500)
        }
        assertEquals(AlarmState.ALARM, alarmEngine.currentState)

        // Go back inside
        val result = alarmEngine.processReading(ZoneCheckResult.INSIDE)
        assertEquals(AlarmState.SAFE, result)
        assertEquals(AlarmState.SAFE, alarmEngine.currentState)
    }

    @Test
    fun processReading_alarmThenBuffer_returnsCaution() {
        // Trigger alarm
        repeat(3) {
            alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
            advanceTime(1500)
        }

        // Enter buffer zone
        val result = alarmEngine.processReading(ZoneCheckResult.BUFFER)
        assertEquals(AlarmState.CAUTION, result)
    }

    @Test
    fun processReading_alarmClearedThenOutsideAgain_startsNewCycle() {
        // Trigger alarm
        repeat(3) {
            alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
            advanceTime(1500)
        }

        // Clear it
        alarmEngine.processReading(ZoneCheckResult.INSIDE)

        // Start new violation cycle
        val result = alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
        assertEquals(AlarmState.WARNING, result) // Back to WARNING, not ALARM
    }

    // ========== Reset Functionality ==========

    @Test
    fun reset_clearsAlarmState() {
        // Trigger alarm
        repeat(3) {
            alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
            advanceTime(1500)
        }

        alarmEngine.reset()

        assertEquals(AlarmState.SAFE, alarmEngine.currentState)
    }

    @Test
    fun reset_afterReset_nextOutsideIsWarning() {
        // Create violations
        repeat(5) {
            alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
            advanceTime(1000)
        }

        alarmEngine.reset()

        // Next outside should start fresh WARNING
        val result = alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
        assertEquals(AlarmState.WARNING, result)
    }

    // ========== Legacy Boolean API ==========

    @Test
    fun processReading_boolean_true_returnsSafe() {
        val result = alarmEngine.processReading(isInsideZone = true)
        assertEquals(AlarmState.SAFE, result)
    }

    @Test
    fun processReading_boolean_false_returnsWarning() {
        val result = alarmEngine.processReading(isInsideZone = false)
        assertEquals(AlarmState.WARNING, result)
    }

    @Test
    fun processReading_boolean_multipleFalse_canTriggerAlarm() {
        alarmEngine.processReading(isInsideZone = false)
        advanceTime(1500)
        alarmEngine.processReading(isInsideZone = false)
        advanceTime(1500)
        val result = alarmEngine.processReading(isInsideZone = false)

        assertEquals(AlarmState.ALARM, result)
    }

    @Test
    fun processReading_boolean_mixedWithZoneCheckResult() {
        // Can use both APIs together
        alarmEngine.processReading(isInsideZone = false)
        advanceTime(1500)
        alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
        advanceTime(1500)
        val result = alarmEngine.processReading(isInsideZone = false)

        assertEquals(AlarmState.ALARM, result)
    }

    // ========== External Alarm Processing ==========

    @Test
    fun processExternalAlarm_safe_returnsSafeAndResets() {
        // Create local violations
        alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
        alarmEngine.processReading(ZoneCheckResult.OUTSIDE)

        val result = alarmEngine.processExternalAlarm(AlarmState.SAFE)

        assertEquals(AlarmState.SAFE, result)
        assertEquals(AlarmState.SAFE, alarmEngine.currentState)
    }

    @Test
    fun processExternalAlarm_caution_returnsCautionAndResets() {
        alarmEngine.processReading(ZoneCheckResult.OUTSIDE)

        val result = alarmEngine.processExternalAlarm(AlarmState.CAUTION)

        assertEquals(AlarmState.CAUTION, result)
    }

    @Test
    fun processExternalAlarm_warning_returnsWarning() {
        val result = alarmEngine.processExternalAlarm(AlarmState.WARNING)
        assertEquals(AlarmState.WARNING, result)
    }

    @Test
    fun processExternalAlarm_alarm_returnsAlarm() {
        val result = alarmEngine.processExternalAlarm(AlarmState.ALARM)
        assertEquals(AlarmState.ALARM, result)
    }

    @Test
    fun processExternalAlarm_overridesLocalState() {
        // Trigger local alarm
        repeat(3) {
            alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
            advanceTime(1500)
        }
        assertEquals(AlarmState.ALARM, alarmEngine.currentState)

        // External says it's safe
        val result = alarmEngine.processExternalAlarm(AlarmState.SAFE)
        assertEquals(AlarmState.SAFE, result)
    }

    @Test
    fun processExternalAlarm_afterSafe_localReadingsStartFresh() {
        alarmEngine.processExternalAlarm(AlarmState.SAFE)

        // Local reading should start fresh
        val result = alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
        assertEquals(AlarmState.WARNING, result)
    }

    // ========== Complex Scenarios ==========

    @Test
    fun scenario_intermittentViolations_doesNotTriggerAlarm() {
        alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
        advanceTime(1000)
        alarmEngine.processReading(ZoneCheckResult.INSIDE) // Reset
        advanceTime(1000)
        alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
        advanceTime(1000)
        val result = alarmEngine.processReading(ZoneCheckResult.OUTSIDE)

        // Never had 3 consecutive with 3 seconds
        assertEquals(AlarmState.WARNING, result)
    }

    @Test
    fun scenario_slowDrift_triggersAlarmEventually() {
        // Simulate slow drift: readings every 2 seconds
        alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
        advanceTime(2000)
        alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
        advanceTime(2000) // Total 4 seconds
        val result = alarmEngine.processReading(ZoneCheckResult.OUTSIDE)

        assertEquals(AlarmState.ALARM, result)
    }

    @Test
    fun scenario_fastReadings_triggersAlarmAfter3Seconds() {
        // Readings every 500ms but need to wait for 3 second threshold
        alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
        advanceTime(500)
        alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
        advanceTime(500)
        alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
        advanceTime(500)
        alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
        advanceTime(500)
        alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
        advanceTime(500)
        alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
        advanceTime(500) // Total 3 seconds

        val result = alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
        assertEquals(AlarmState.ALARM, result)
    }

    @Test
    fun scenario_bufferThenOutside_restartsViolationCount() {
        alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
        advanceTime(1000)
        alarmEngine.processReading(ZoneCheckResult.BUFFER) // Reset via buffer
        advanceTime(1000)
        alarmEngine.processReading(ZoneCheckResult.OUTSIDE) // Start fresh
        advanceTime(1000)
        val result = alarmEngine.processReading(ZoneCheckResult.OUTSIDE)

        // Only 2 consecutive outside readings
        assertEquals(AlarmState.WARNING, result)
    }

    @Test
    fun scenario_multipleAlarmCycles() {
        // First alarm cycle
        repeat(3) {
            alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
            advanceTime(1500)
        }
        assertEquals(AlarmState.ALARM, alarmEngine.currentState)

        // Clear
        alarmEngine.processReading(ZoneCheckResult.INSIDE)
        advanceTime(5000)

        // Second alarm cycle
        repeat(3) {
            alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
            advanceTime(1500)
        }
        assertEquals(AlarmState.ALARM, alarmEngine.currentState)
    }

    @Test
    fun scenario_exactlyAt3SecondThreshold() {
        alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
        advanceTime(1500)
        alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
        advanceTime(1500) // Exactly 3000ms
        val result = alarmEngine.processReading(ZoneCheckResult.OUTSIDE)

        // Should trigger at exactly 3 seconds
        assertEquals(AlarmState.ALARM, result)
    }

    @Test
    fun scenario_justBefore3SecondThreshold() {
        alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
        advanceTime(1500)
        alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
        advanceTime(1499) // Just under 3000ms
        val result = alarmEngine.processReading(ZoneCheckResult.OUTSIDE)

        // Should not trigger yet
        assertEquals(AlarmState.WARNING, result)
    }

    // ========== State Transitions ==========

    @Test
    fun stateTransitions_safe_to_warning() {
        assertEquals(AlarmState.SAFE, alarmEngine.currentState)
        alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
        assertEquals(AlarmState.WARNING, alarmEngine.currentState)
    }

    @Test
    fun stateTransitions_safe_to_caution() {
        assertEquals(AlarmState.SAFE, alarmEngine.currentState)
        alarmEngine.processReading(ZoneCheckResult.BUFFER)
        assertEquals(AlarmState.CAUTION, alarmEngine.currentState)
    }

    @Test
    fun stateTransitions_warning_to_alarm() {
        alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
        assertEquals(AlarmState.WARNING, alarmEngine.currentState)

        advanceTime(1500)
        alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
        advanceTime(1500)
        alarmEngine.processReading(ZoneCheckResult.OUTSIDE)

        assertEquals(AlarmState.ALARM, alarmEngine.currentState)
    }

    @Test
    fun stateTransitions_allPossibleStates() {
        // SAFE
        assertEquals(AlarmState.SAFE, alarmEngine.currentState)

        // SAFE -> CAUTION
        alarmEngine.processReading(ZoneCheckResult.BUFFER)
        assertEquals(AlarmState.CAUTION, alarmEngine.currentState)

        // CAUTION -> WARNING
        alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
        assertEquals(AlarmState.WARNING, alarmEngine.currentState)

        // WARNING -> ALARM
        advanceTime(1500)
        alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
        advanceTime(1500)
        alarmEngine.processReading(ZoneCheckResult.OUTSIDE)
        assertEquals(AlarmState.ALARM, alarmEngine.currentState)

        // ALARM -> SAFE
        alarmEngine.processReading(ZoneCheckResult.INSIDE)
        assertEquals(AlarmState.SAFE, alarmEngine.currentState)
    }
}
