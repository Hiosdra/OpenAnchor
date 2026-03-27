package com.hiosdra.openanchor.ui.history

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hiosdra.openanchor.data.repository.AnchorSessionRepository
import com.hiosdra.openanchor.domain.model.AnchorSession
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

@OptIn(FlowPreview::class)
@HiltViewModel
class HistoryViewModel @Inject constructor(
    private val repository: AnchorSessionRepository
) : ViewModel() {

    private val dateFormat = SimpleDateFormat("dd MMM yyyy HH:mm", Locale.getDefault())

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val allSessions: Flow<List<AnchorSession>> = repository.observeAllSessions()
        .map { list -> list.filter { it.endTime != null } }

    val sessions: StateFlow<List<AnchorSession>> = combine(
        allSessions,
        _searchQuery.debounce(300).distinctUntilChanged()
    ) { list, query ->
        if (query.isBlank()) list
        else {
            val lowerQuery = query.lowercase()
            list.filter { session ->
                dateFormat.format(Date(session.startTime)).lowercase().contains(lowerQuery) ||
                "%.6f, %.6f".format(session.anchorPosition.latitude, session.anchorPosition.longitude).contains(lowerQuery)
            }
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _deleteError = MutableStateFlow(false)
    val deleteError: StateFlow<Boolean> = _deleteError.asStateFlow()

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

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
