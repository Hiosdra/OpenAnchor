package com.hiosdra.openanchor.ui.history

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hiosdra.openanchor.data.repository.AnchorSessionRepository
import com.hiosdra.openanchor.domain.model.AnchorSession
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class HistoryViewModel @Inject constructor(
    private val repository: AnchorSessionRepository
) : ViewModel() {

    val sessions: StateFlow<List<AnchorSession>> = repository.observeAllSessions()
        .map { list -> list.filter { it.endTime != null } }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _deleteError = MutableStateFlow(false)
    val deleteError: StateFlow<Boolean> = _deleteError.asStateFlow()

    fun deleteSession(id: Long) {
        viewModelScope.launch {
            try {
                repository.deleteSession(id)
            } catch (e: Exception) {
                _deleteError.value = true
            }
        }
    }

    fun clearDeleteError() {
        _deleteError.value = false
    }
}
