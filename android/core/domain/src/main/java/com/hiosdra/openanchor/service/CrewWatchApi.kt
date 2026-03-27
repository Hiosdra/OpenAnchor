package com.hiosdra.openanchor.service

import kotlinx.coroutines.flow.StateFlow

/**
 * Interface for crew watch management.
 * Implementation lives in :app module (CrewWatchManager).
 */
interface CrewWatchApi {
    val crewWatchState: StateFlow<CrewWatchState>
    fun startWatch(crewMembers: List<String>, durationMinutes: Int)
    fun stopWatch()
    fun acknowledgeAlarm()
}

data class CrewWatchState(
    val isActive: Boolean = false,
    val currentCrewMember: String = "",
    val remainingMinutes: Int = 0,
    val remainingSeconds: Int = 0,
    val totalDurationMinutes: Int = 0,
    val crewMembers: List<String> = emptyList(),
    val currentCrewIndex: Int = 0,
    val isAlarming: Boolean = false,
    val isWarning: Boolean = false,
)
