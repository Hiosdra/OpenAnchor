package com.hiosdra.openanchor.ui.client

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hiosdra.openanchor.network.AnchorWebSocketClient
import com.hiosdra.openanchor.network.ClientModeManager
import com.hiosdra.openanchor.service.ServiceBinder
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ScanQRCodeUiState(
    val step: ScanStep = ScanStep.SCANNING,
    val scannedUrl: String? = null,
    val serverSsid: String? = null,
    val serverPassword: String? = null,
    val isConnecting: Boolean = false,
    val isConnected: Boolean = false,
    val errorMessage: String? = null,
    /** Manual URL entry mode */
    val manualUrl: String = ""
)

enum class ScanStep {
    SCANNING,
    SCANNED,
    CONNECTING,
    CONNECTED,
    ERROR
}

@HiltViewModel
class ScanQRCodeViewModel @Inject constructor(
    private val wsClient: AnchorWebSocketClient,
    private val clientModeManager: ClientModeManager,
    private val serviceBinder: ServiceBinder
) : ViewModel() {

    companion object {
        private const val TAG = "ScanQRCodeVM"
    }

    private val _uiState = MutableStateFlow(ScanQRCodeUiState())
    val uiState: StateFlow<ScanQRCodeUiState> = _uiState.asStateFlow()

    init {
        // Observe connection state
        viewModelScope.launch {
            wsClient.clientState.collect { clientState ->
                _uiState.update { ui ->
                    when {
                        clientState.isConnected -> ui.copy(
                            step = ScanStep.CONNECTED,
                            isConnecting = false,
                            isConnected = true,
                            errorMessage = null
                        )
                        clientState.isConnecting -> ui.copy(
                            step = ScanStep.CONNECTING,
                            isConnecting = true
                        )
                        clientState.errorMessage != null -> ui.copy(
                            step = ScanStep.ERROR,
                            isConnecting = false,
                            errorMessage = clientState.errorMessage
                        )
                        else -> ui
                    }
                }
            }
        }
    }

    /**
     * Called when a QR code is scanned successfully.
     * Parses the JSON payload and extracts the WebSocket URL.
     */
    fun onQRCodeScanned(qrContent: String) {
        try {
            val json = com.google.gson.JsonParser.parseString(qrContent).asJsonObject
            val wsUrl = json.get("wsUrl")?.asString
            val ssid = json.get("ssid")?.asString
            val password = json.get("password")?.asString
            val protocol = json.get("protocol")?.asString

            if (wsUrl == null) {
                _uiState.update { it.copy(
                    step = ScanStep.ERROR,
                    errorMessage = "Invalid QR code: no WebSocket URL found"
                ) }
                return
            }

            if (protocol != null && !protocol.startsWith("openanchor")) {
                _uiState.update { it.copy(
                    step = ScanStep.ERROR,
                    errorMessage = "Unsupported protocol: $protocol"
                ) }
                return
            }

            _uiState.update { it.copy(
                step = ScanStep.SCANNED,
                scannedUrl = wsUrl,
                serverSsid = ssid,
                serverPassword = password
            ) }

            Log.i(TAG, "QR scanned: url=$wsUrl, ssid=$ssid")
        } catch (e: Exception) {
            // Try as plain URL
            if (qrContent.startsWith("ws://") || qrContent.startsWith("wss://")) {
                _uiState.update { it.copy(
                    step = ScanStep.SCANNED,
                    scannedUrl = qrContent
                ) }
            } else {
                _uiState.update { it.copy(
                    step = ScanStep.ERROR,
                    errorMessage = "Invalid QR code format"
                ) }
            }
        }
    }

    /**
     * Connect to the server using the scanned or manually entered URL.
     */
    fun connectToServer() {
        val url = _uiState.value.scannedUrl ?: return
        _uiState.update { it.copy(step = ScanStep.CONNECTING, isConnecting = true) }
        serviceBinder.startClientMode(url)
    }

    /**
     * Set a manual URL and treat it as if scanned.
     */
    fun setManualUrl(url: String) {
        _uiState.update { it.copy(manualUrl = url) }
    }

    /**
     * Connect using the manually entered URL.
     */
    fun connectManual() {
        val url = _uiState.value.manualUrl.trim()
        if (url.isBlank()) return
        val wsUrl = if (!url.startsWith("ws://") && !url.startsWith("wss://")) {
            "ws://$url"
        } else {
            url
        }
        _uiState.update { it.copy(
            scannedUrl = wsUrl,
            step = ScanStep.CONNECTING,
            isConnecting = true
        ) }
        serviceBinder.startClientMode(wsUrl)
    }

    fun resetToScanning() {
        _uiState.value = ScanQRCodeUiState()
    }

    fun cancelConnection() {
        wsClient.disconnect("USER_CANCEL")
        _uiState.value = ScanQRCodeUiState()
    }
}
