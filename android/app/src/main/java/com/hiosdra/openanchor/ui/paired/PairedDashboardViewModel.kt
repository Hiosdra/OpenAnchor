package com.hiosdra.openanchor.ui.paired

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hiosdra.openanchor.domain.model.AlarmState
import com.hiosdra.openanchor.domain.model.AnchorZone
import com.hiosdra.openanchor.domain.model.Position
import com.hiosdra.openanchor.network.AnchorWebSocketServer
import com.hiosdra.openanchor.network.PairedModeManager
import com.hiosdra.openanchor.service.ServiceBinder
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PairedDashboardUiState(
    val isPaired: Boolean = false,
    val peerConnected: Boolean = false,
    // Zone
    val anchorPosition: Position? = null,
    val zone: AnchorZone? = null,
    // Peer telemetry
    val boatPosition: Position? = null,
    val distanceToAnchor: Double = 0.0,
    val alarmState: AlarmState = AlarmState.SAFE,
    val gpsAccuracy: Float = 0f,
    val sog: Double? = null,
    val cog: Double? = null,
    val batteryLevel: Double? = null,
    val isCharging: Boolean? = null,
    // Server info
    val serverRunning: Boolean = false,
    // Events
    val showDisconnectDialog: Boolean = false,
    val connectionLostWarning: Boolean = false
)

@HiltViewModel
class PairedDashboardViewModel @Inject constructor(
    private val pairedModeManager: PairedModeManager,
    private val wsServer: AnchorWebSocketServer,
    private val serviceBinder: ServiceBinder
) : ViewModel() {

    private val _showDisconnectDialog = MutableStateFlow(false)
    private val _connectionLostWarning = MutableStateFlow(false)

    val uiState: StateFlow<PairedDashboardUiState> = combine(
        pairedModeManager.pairedState,
        wsServer.serverState,
        _showDisconnectDialog,
        _connectionLostWarning
    ) { paired, server, showDisconnect, connLost ->
        PairedDashboardUiState(
            isPaired = paired.isPaired,
            peerConnected = paired.peerConnected,
            anchorPosition = paired.anchorPosition,
            zone = paired.zone,
            boatPosition = paired.peerBoatPosition,
            distanceToAnchor = paired.peerDistanceToAnchor,
            alarmState = paired.peerAlarmState,
            gpsAccuracy = paired.peerGpsAccuracy,
            sog = paired.peerSog,
            cog = paired.peerCog,
            batteryLevel = paired.peerBatteryLevel,
            isCharging = paired.peerIsCharging,
            serverRunning = server.isRunning,
            showDisconnectDialog = showDisconnect,
            connectionLostWarning = connLost
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), PairedDashboardUiState())

    init {
        // Watch for connection events
        viewModelScope.launch {
            pairedModeManager.events.collect { event ->
                when (event) {
                    is PairedModeManager.PairedEvent.HeartbeatTimeout -> {
                        _connectionLostWarning.value = true
                    }
                    is PairedModeManager.PairedEvent.SessionEnded -> {
                        // handled by navigate-back observation
                    }
                    else -> {}
                }
            }
        }
    }

    fun showDisconnectDialog() {
        _showDisconnectDialog.value = true
    }

    fun dismissDisconnectDialog() {
        _showDisconnectDialog.value = false
    }

    fun disconnect() {
        _showDisconnectDialog.value = false
        serviceBinder.stopWebSocketServer()
    }

    fun dismissAlarm() {
        viewModelScope.launch {
            pairedModeManager.sendDismissAlarm()
        }
        serviceBinder.dismissAlarm()
    }

    fun muteAlarm() {
        viewModelScope.launch {
            pairedModeManager.sendMuteAlarm()
        }
        serviceBinder.muteAlarm()
    }

    fun dismissConnectionWarning() {
        _connectionLostWarning.value = false
    }
}
