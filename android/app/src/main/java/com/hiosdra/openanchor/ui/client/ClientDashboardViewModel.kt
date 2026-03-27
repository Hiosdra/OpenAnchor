package com.hiosdra.openanchor.ui.client

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hiosdra.openanchor.domain.model.AlarmState
import com.hiosdra.openanchor.domain.model.Position
import com.hiosdra.openanchor.network.AndroidGpsReportPayload
import com.hiosdra.openanchor.network.ClientModeManager
import com.hiosdra.openanchor.service.ServiceBinder
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ClientDashboardUiState(
    val isConnected: Boolean = false,
    val serverUrl: String? = null,
    // Local monitoring data
    val anchorLat: Double = 0.0,
    val anchorLng: Double = 0.0,
    val boatLat: Double = 0.0,
    val boatLng: Double = 0.0,
    val distanceToAnchor: Double = 0.0,
    val alarmState: AlarmState = AlarmState.SAFE,
    val gpsAccuracy: Float = 0f,
    val sog: Double? = null,
    val cog: Double? = null,
    val localBatteryLevel: Int = -1,
    val localBatteryCharging: Boolean = false,
    // Server (peer) GPS verification data
    val serverGpsReport: AndroidGpsReportPayload? = null,
    val serverDriftDetected: Boolean = false,
    val serverBatteryLevel: Int? = null,
    val serverIsCharging: Boolean? = null,
    // Connection info
    val reconnectAttempt: Int = 0,
    val lastHeartbeatAge: Long = 0L,
    // Dialog
    val showDisconnectDialog: Boolean = false
)

@HiltViewModel
class ClientDashboardViewModel @Inject constructor(
    private val clientModeManager: ClientModeManager,
    private val serviceBinder: ServiceBinder
) : ViewModel() {

    private val _uiState = MutableStateFlow(ClientDashboardUiState())
    val uiState: StateFlow<ClientDashboardUiState> = _uiState.asStateFlow()

    init {
        // Observe client mode state
        viewModelScope.launch {
            clientModeManager.clientModeState.collect { state ->
                _uiState.update { ui ->
                    ui.copy(
                        isConnected = state.isConnected,
                        serverUrl = state.serverUrl,
                        anchorLat = state.anchorPosition?.latitude ?: ui.anchorLat,
                        anchorLng = state.anchorPosition?.longitude ?: ui.anchorLng,
                        boatLat = state.boatPosition?.latitude ?: ui.boatLat,
                        boatLng = state.boatPosition?.longitude ?: ui.boatLng,
                        distanceToAnchor = state.distanceToAnchor,
                        alarmState = state.alarmState,
                        gpsAccuracy = state.gpsAccuracy,
                        sog = state.sog,
                        cog = state.cog,
                        serverGpsReport = state.serverGpsReport,
                        serverDriftDetected = state.serverDriftDetected
                    )
                }
            }
        }

        // Observe service monitor state for battery
        viewModelScope.launch {
            serviceBinder.serviceInstance.collectLatest { service ->
                if (service != null) {
                    service.monitorState.collect { monitorState ->
                        _uiState.update { ui ->
                            ui.copy(
                                localBatteryLevel = monitorState.localBatteryLevel,
                                localBatteryCharging = monitorState.localBatteryCharging
                            )
                        }
                    }
                }
            }
        }

        // Observe client mode events for server info
        viewModelScope.launch {
            clientModeManager.events.collect { event ->
                when (event) {
                    is ClientModeManager.ClientModeEvent.ServerGpsReport -> {
                        _uiState.update { ui ->
                            ui.copy(
                                serverBatteryLevel = event.payload.batteryLevel,
                                serverIsCharging = event.payload.isCharging
                            )
                        }
                    }
                    is ClientModeManager.ClientModeEvent.ServerCommand -> {
                        when (event.command) {
                            "MUTE_ALARM" -> serviceBinder.muteAlarm()
                            "DISMISS_ALARM" -> serviceBinder.dismissAlarm()
                        }
                    }
                    else -> { /* Handled by service */ }
                }
            }
        }
    }

    fun showDisconnectDialog() {
        _uiState.update { it.copy(showDisconnectDialog = true) }
    }

    fun hideDisconnectDialog() {
        _uiState.update { it.copy(showDisconnectDialog = false) }
    }

    fun disconnect() {
        serviceBinder.stopClientMode()
        _uiState.update { it.copy(showDisconnectDialog = false) }
    }

    fun dismissAlarm() {
        serviceBinder.dismissAlarm()
    }

    fun muteAlarm() {
        serviceBinder.muteAlarm()
    }
}
