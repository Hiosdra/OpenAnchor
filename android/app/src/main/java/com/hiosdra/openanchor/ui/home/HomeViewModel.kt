package com.hiosdra.openanchor.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hiosdra.openanchor.data.repository.AnchorSessionRepository
import com.hiosdra.openanchor.domain.model.AnchorSession
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import javax.inject.Inject

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val repository: AnchorSessionRepository
) : ViewModel() {

    val activeSession: StateFlow<AnchorSession?> = repository.observeActiveSession()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)
}
