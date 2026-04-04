package com.hiosdra.openanchor.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hiosdra.openanchor.data.repository.AnchorSessionRepository
import com.hiosdra.openanchor.domain.model.AnchorSession
import com.hiosdra.openanchor.network.AnchorWebSocketClient
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import javax.inject.Inject

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val repository: AnchorSessionRepository,
    private val wsClient: AnchorWebSocketClient
) : ViewModel() {

    val activeSession: StateFlow<AnchorSession?> = repository.observeActiveSession()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    /** True when client mode is active (connected or reconnecting to a server). */
    val isClientModeActive: StateFlow<Boolean> = wsClient.clientState
        .map { it.isConnected || it.isConnecting }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), false)
}
