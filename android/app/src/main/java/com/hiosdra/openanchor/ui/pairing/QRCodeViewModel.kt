package com.hiosdra.openanchor.ui.pairing

import android.graphics.Bitmap
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.gson.Gson
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import com.hiosdra.openanchor.network.AnchorWebSocketServer
import com.hiosdra.openanchor.network.HotspotManager
import com.hiosdra.openanchor.service.ServiceBinder
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class QRCodeUiState(
    val step: PairingStep = PairingStep.IDLE,
    val hotspotSsid: String? = null,
    val hotspotPassword: String? = null,
    val wsUrl: String? = null,
    val qrBitmap: Bitmap? = null,
    val serverRunning: Boolean = false,
    val clientConnected: Boolean = false,
    val errorMessage: String? = null,
    /** True when user is on same network and doesn't need hotspot */
    val useExistingNetwork: Boolean = false
)

enum class PairingStep {
    IDLE,
    STARTING_HOTSPOT,
    HOTSPOT_READY,
    STARTING_SERVER,
    WAITING_FOR_CLIENT,
    PAIRED,
    ERROR
}

@HiltViewModel
class QRCodeViewModel @Inject constructor(
    private val hotspotManager: HotspotManager,
    private val wsServer: AnchorWebSocketServer,
    private val serviceBinder: ServiceBinder
) : ViewModel() {

    private val _uiState = MutableStateFlow(QRCodeUiState())
    val uiState: StateFlow<QRCodeUiState> = _uiState.asStateFlow()

    init {
        // Observe hotspot state
        viewModelScope.launch {
            hotspotManager.hotspotState.collect { hotspot ->
                _uiState.update { ui ->
                    if (hotspot.errorMessage != null) {
                        ui.copy(
                            step = PairingStep.ERROR,
                            errorMessage = hotspot.errorMessage
                        )
                    } else if (hotspot.isActive) {
                        ui.copy(
                            step = if (ui.serverRunning) PairingStep.WAITING_FOR_CLIENT
                            else PairingStep.HOTSPOT_READY,
                            hotspotSsid = hotspot.ssid,
                            hotspotPassword = hotspot.password
                        )
                    } else {
                        ui
                    }
                }
            }
        }

        // Observe WS server state
        viewModelScope.launch {
            wsServer.serverState.collect { server ->
                _uiState.update { ui ->
                    val newStep = when {
                        server.clientConnected -> PairingStep.PAIRED
                        server.isRunning -> PairingStep.WAITING_FOR_CLIENT
                        else -> ui.step
                    }
                    ui.copy(
                        serverRunning = server.isRunning,
                        clientConnected = server.clientConnected,
                        step = newStep
                    )
                }
            }
        }

        // Observe WS server connection events
        viewModelScope.launch {
            wsServer.connectionEvents.collect { event ->
                when (event) {
                    AnchorWebSocketServer.ConnectionEvent.CLIENT_CONNECTED -> {
                        _uiState.update { it.copy(step = PairingStep.PAIRED, clientConnected = true) }
                    }
                    AnchorWebSocketServer.ConnectionEvent.CLIENT_DISCONNECTED -> {
                        _uiState.update { it.copy(step = PairingStep.WAITING_FOR_CLIENT, clientConnected = false) }
                    }
                    AnchorWebSocketServer.ConnectionEvent.HEARTBEAT_TIMEOUT -> {
                        _uiState.update { it.copy(step = PairingStep.WAITING_FOR_CLIENT, clientConnected = false) }
                    }
                }
            }
        }
    }

    /**
     * Start pairing with hotspot: starts hotspot, then WS server, then shows QR.
     */
    fun startPairingWithHotspot() {
        _uiState.update { it.copy(step = PairingStep.STARTING_HOTSPOT, useExistingNetwork = false, errorMessage = null) }
        hotspotManager.startHotspot()

        // Watch for hotspot to come up, then start server
        viewModelScope.launch {
            hotspotManager.hotspotState
                .filter { it.isActive }
                .first()

            startServer()
        }
    }

    /**
     * Start pairing on existing network (same WiFi): just starts WS server + shows QR.
     */
    fun startPairingOnExistingNetwork() {
        _uiState.update { it.copy(
            step = PairingStep.STARTING_SERVER,
            useExistingNetwork = true,
            errorMessage = null
        ) }
        startServer()
    }

    private fun startServer() {
        _uiState.update { it.copy(step = PairingStep.STARTING_SERVER) }
        serviceBinder.startWebSocketServer()

        // Wait for server to start, then generate QR
        viewModelScope.launch {
            wsServer.serverState
                .filter { it.isRunning }
                .first()

            val wsUrl = hotspotManager.getWebSocketUrl()
            if (wsUrl != null) {
                val qrBitmap = generateQRCode(wsUrl)
                _uiState.update { ui ->
                    ui.copy(
                        step = PairingStep.WAITING_FOR_CLIENT,
                        wsUrl = wsUrl,
                        qrBitmap = qrBitmap
                    )
                }
            } else {
                _uiState.update { ui ->
                    ui.copy(
                        step = PairingStep.ERROR,
                        errorMessage = "Could not determine device IP address"
                    )
                }
            }
        }
    }

    fun stopPairing() {
        serviceBinder.stopWebSocketServer()
        if (!_uiState.value.useExistingNetwork) {
            hotspotManager.stopHotspot()
        }
        _uiState.value = QRCodeUiState()
    }

    /**
     * Generate a QR code bitmap from the WebSocket URL.
     * The QR payload is a JSON object with all connection info for the PWA to auto-configure.
     */
    private fun generateQRCode(wsUrl: String): Bitmap? {
        return try {
            val state = _uiState.value
            // Build JSON payload for the PWA scanner using Gson to properly escape values
            val payloadMap = mutableMapOf<String, String>(
                "wsUrl" to wsUrl,
                "protocol" to "openanchor-v2"
            )
            state.hotspotSsid?.let { payloadMap["ssid"] = it }
            state.hotspotPassword?.let { payloadMap["password"] = it }
            val payload = Gson().toJson(payloadMap)

            val writer = QRCodeWriter()
            val hints = mapOf(
                EncodeHintType.MARGIN to 1,
                EncodeHintType.CHARACTER_SET to "UTF-8"
            )
            val bitMatrix = writer.encode(payload, BarcodeFormat.QR_CODE, 512, 512, hints)
            val width = bitMatrix.width
            val height = bitMatrix.height
            val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.RGB_565)
            for (x in 0 until width) {
                for (y in 0 until height) {
                    bitmap.setPixel(x, y, if (bitMatrix.get(x, y)) 0xFF000000.toInt() else 0xFFFFFFFF.toInt())
                }
            }
            bitmap
        } catch (e: Exception) {
            null
        }
    }

    override fun onCleared() {
        // Don't stop pairing when navigating away — the service keeps running
        super.onCleared()
    }
}
