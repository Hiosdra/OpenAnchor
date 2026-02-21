package com.hiosdra.openanchor.network

import android.content.Context
import android.net.wifi.WifiManager
import android.os.Build
import android.util.Log
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.net.Inet4Address
import java.net.NetworkInterface
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manages local Wi-Fi hotspot lifecycle and IP address discovery.
 *
 * On modern Android (10+), startLocalOnlyHotspot creates a local-only network
 * that doesn't require internet connectivity — perfect for boat/yacht use.
 *
 * The PWA connects to this hotspot and then opens a WebSocket to the IP:port.
 */
@Singleton
class HotspotManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    companion object {
        private const val TAG = "HotspotManager"
    }

    private val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
    private var hotspotReservation: WifiManager.LocalOnlyHotspotReservation? = null

    private val _hotspotState = MutableStateFlow(HotspotState())
    val hotspotState: StateFlow<HotspotState> = _hotspotState.asStateFlow()

    data class HotspotState(
        val isActive: Boolean = false,
        val ssid: String? = null,
        val password: String? = null,
        val ipAddress: String? = null,
        val errorMessage: String? = null
    )

    /**
     * Start a local-only hotspot.
     * The callback receives the SSID, password, and hotspot IP address.
     */
    fun startHotspot() {
        try {
            wifiManager.startLocalOnlyHotspot(object : WifiManager.LocalOnlyHotspotCallback() {
                override fun onStarted(reservation: WifiManager.LocalOnlyHotspotReservation?) {
                    hotspotReservation = reservation
                    val config = reservation?.softApConfiguration
                        ?: reservation?.wifiConfiguration?.let { legacy ->
                            null // Handled below
                        }

                    val ssid: String?
                    val password: String?

                    if (reservation?.softApConfiguration != null) {
                        val sac = reservation.softApConfiguration
                        ssid = sac.ssid
                        password = sac.passphrase
                    } else {
                        @Suppress("DEPRECATION")
                        val wifiConfig = reservation?.wifiConfiguration
                        ssid = wifiConfig?.SSID
                        password = wifiConfig?.preSharedKey
                    }

                    val ip = getLocalIpAddress()

                    _hotspotState.value = HotspotState(
                        isActive = true,
                        ssid = ssid,
                        password = password,
                        ipAddress = ip
                    )

                    Log.i(TAG, "Hotspot started: SSID=$ssid, IP=$ip")
                }

                override fun onStopped() {
                    hotspotReservation = null
                    _hotspotState.value = HotspotState()
                    Log.i(TAG, "Hotspot stopped")
                }

                override fun onFailed(reason: Int) {
                    val msg = when (reason) {
                        ERROR_GENERIC -> "Generic error"
                        ERROR_INCOMPATIBLE_MODE -> "Incompatible mode (WiFi might be off)"
                        ERROR_TETHERING_DISALLOWED -> "Tethering not allowed"
                        ERROR_NO_CHANNEL -> "No channel available"
                        else -> "Unknown error ($reason)"
                    }
                    _hotspotState.value = HotspotState(errorMessage = msg)
                    Log.e(TAG, "Hotspot failed: $msg")
                }
            }, null)
        } catch (e: SecurityException) {
            _hotspotState.value = HotspotState(errorMessage = "Permission denied: ${e.message}")
            Log.e(TAG, "Hotspot permission denied", e)
        } catch (e: Exception) {
            _hotspotState.value = HotspotState(errorMessage = "Failed: ${e.message}")
            Log.e(TAG, "Hotspot start failed", e)
        }
    }

    /**
     * Stop the local-only hotspot and release the reservation.
     */
    fun stopHotspot() {
        try {
            hotspotReservation?.close()
        } catch (e: Exception) {
            Log.e(TAG, "Error closing hotspot reservation", e)
        }
        hotspotReservation = null
        _hotspotState.value = HotspotState()
    }

    /**
     * Get the device's local IP address.
     * Scans network interfaces for a non-loopback IPv4 address.
     */
    fun getLocalIpAddress(): String? {
        try {
            val interfaces = NetworkInterface.getNetworkInterfaces()
            while (interfaces.hasMoreElements()) {
                val networkInterface = interfaces.nextElement()
                // Prefer hotspot/ap/wlan interfaces
                val name = networkInterface.name.lowercase()
                if (!networkInterface.isUp) continue
                if (networkInterface.isLoopback) continue

                val addresses = networkInterface.inetAddresses
                while (addresses.hasMoreElements()) {
                    val address = addresses.nextElement()
                    if (address is Inet4Address && !address.isLoopbackAddress) {
                        // Prefer swlan/ap/wlan interfaces for hotspot
                        if (name.startsWith("swlan") || name.startsWith("ap") ||
                            name.startsWith("wlan") || name.startsWith("eth")) {
                            return address.hostAddress
                        }
                    }
                }
            }
            // Fallback: return any non-loopback IPv4
            val interfaces2 = NetworkInterface.getNetworkInterfaces()
            while (interfaces2.hasMoreElements()) {
                val networkInterface = interfaces2.nextElement()
                if (!networkInterface.isUp || networkInterface.isLoopback) continue
                val addresses = networkInterface.inetAddresses
                while (addresses.hasMoreElements()) {
                    val address = addresses.nextElement()
                    if (address is Inet4Address && !address.isLoopbackAddress) {
                        return address.hostAddress
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get local IP", e)
        }
        return null
    }

    /**
     * Generate the full WebSocket URL for QR code display.
     */
    fun getWebSocketUrl(port: Int = AnchorWebSocketServer.DEFAULT_PORT): String? {
        val ip = _hotspotState.value.ipAddress ?: getLocalIpAddress() ?: return null
        return "ws://$ip:$port"
    }
}
