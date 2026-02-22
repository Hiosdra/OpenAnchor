package com.hiosdra.openanchor.ui.crewwatch

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hiosdra.openanchor.service.CrewWatchManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class CrewWatchUiState(
    val isRunning: Boolean = false,
    val crewMembers: List<String> = emptyList(),
    val currentCrewMember: String? = null,
    val nextCrewMember: String? = null,
    val remainingMs: Long = 0L,
    val progress: Float = 0f,
    val watchDurationHours: Int = 4,
    val totalWatchChanges: Int = 0,
    val newMemberName: String = "",
    val showWarningEvent: Boolean = false,
    val showWatchChangeEvent: String? = null
)

@HiltViewModel
class CrewWatchViewModel @Inject constructor(
    private val crewWatchManager: CrewWatchManager
) : ViewModel() {

    private val _newMemberName = MutableStateFlow("")
    private val _showWarning = MutableStateFlow(false)
    private val _showWatchChange = MutableStateFlow<String?>(null)

    val uiState: StateFlow<CrewWatchUiState> = combine(
        crewWatchManager.state,
        _newMemberName,
        _showWarning,
        _showWatchChange
    ) { watchState, memberName, warning, watchChange ->
        CrewWatchUiState(
            isRunning = watchState.isRunning,
            crewMembers = watchState.crewMembers,
            currentCrewMember = watchState.currentCrewMember,
            nextCrewMember = watchState.nextCrewMember,
            remainingMs = watchState.remainingMs,
            progress = watchState.progress,
            watchDurationHours = (watchState.watchDurationMs / (60 * 60 * 1000L)).toInt(),
            totalWatchChanges = watchState.totalWatchChanges,
            newMemberName = memberName,
            showWarningEvent = warning,
            showWatchChangeEvent = watchChange
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), CrewWatchUiState())

    init {
        // Collect events
        viewModelScope.launch {
            crewWatchManager.events.collect { event ->
                when (event) {
                    is CrewWatchManager.CrewWatchEvent.WatchWarning -> {
                        _showWarning.value = true
                    }
                    is CrewWatchManager.CrewWatchEvent.WatchChange -> {
                        _showWarning.value = false
                        _showWatchChange.value = event.newCrewMember
                    }
                    is CrewWatchManager.CrewWatchEvent.WatchStopped -> {
                        _showWarning.value = false
                        _showWatchChange.value = null
                    }
                }
            }
        }
    }

    fun updateNewMemberName(name: String) {
        _newMemberName.value = name
    }

    fun addCrewMember() {
        crewWatchManager.addCrewMember(_newMemberName.value)
        _newMemberName.value = ""
    }

    fun removeCrewMember(index: Int) {
        crewWatchManager.removeCrewMember(index)
    }

    fun setWatchDuration(hours: Int) {
        crewWatchManager.setWatchDuration(hours)
    }

    fun startWatch() {
        crewWatchManager.startWatch()
    }

    fun stopWatch() {
        crewWatchManager.stopWatch()
    }

    fun dismissWarning() {
        _showWarning.value = false
    }

    fun dismissWatchChange() {
        _showWatchChange.value = null
    }
}
