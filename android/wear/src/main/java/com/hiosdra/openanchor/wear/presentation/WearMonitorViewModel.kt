package com.hiosdra.openanchor.wear.presentation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hiosdra.openanchor.wear.data.WearConnectionManager
import com.hiosdra.openanchor.wear.data.WearDataRepository
import com.hiosdra.openanchor.wear.data.WearMonitorState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class WearMonitorViewModel @Inject constructor(
    private val repository: WearDataRepository,
    private val connectionManager: WearConnectionManager
) : ViewModel() {

    val state: StateFlow<WearMonitorState> = repository.state

    val connected: StateFlow<Boolean> = repository.connected

    val authorizedPhoneNodeId: StateFlow<String?> = connectionManager.authorizedPhoneNodeIdFlow
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)

    fun clearPhoneAuthorization() {
        viewModelScope.launch {
            connectionManager.clearAuthorization()
        }
    }
}
