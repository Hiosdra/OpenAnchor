package com.hiosdra.openanchor.wear.data

import android.util.Log
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.hiosdra.openanchor.wear.data.db.WearConnectionHistoryDao
import com.hiosdra.openanchor.wear.data.db.WearConnectionHistoryEntity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manages connection state between the watch and the phone.
 *
 * Tracks whether the phone is connected by monitoring data-layer activity.
 * Automatically marks as disconnected if no data arrives within [CONNECTION_TIMEOUT_MS].
 * Supports multi-watch pairing via authorized phone node tracking in DataStore.
 */
@Singleton
class WearConnectionManager @Inject constructor(
    private val connectionHistoryDao: WearConnectionHistoryDao,
    private val dataStore: DataStore<Preferences>
) {

    companion object {
        private const val TAG = "WearConnectionManager"
        internal const val CONNECTION_TIMEOUT_MS = 30_000L
        internal val AUTHORIZED_PHONE_NODE_ID_KEY =
            stringPreferencesKey("authorized_phone_node_id")
    }

    private val scope = CoroutineScope(Dispatchers.Main.immediate + SupervisorJob())

    private val _connected = MutableStateFlow(false)
    val connected: StateFlow<Boolean> = _connected.asStateFlow()

    private var watchdogJob: Job? = null

    @Volatile
    private var isLoaded = false

    @Volatile
    private var cachedAuthorizedNodeId: String? = null

    val authorizedPhoneNodeIdFlow: Flow<String?> =
        dataStore.data.map { it[AUTHORIZED_PHONE_NODE_ID_KEY] }

    init {
        scope.launch {
            cachedAuthorizedNodeId = dataStore.data.first()[AUTHORIZED_PHONE_NODE_ID_KEY]
            isLoaded = true
        }
    }

    /**
     * Check whether a phone node is authorized to send data.
     * Returns false until the cached authorization is loaded from DataStore.
     * Returns true if no phone is authorized yet (first-come) or if the node matches.
     */
    fun isNodeAuthorized(nodeId: String): Boolean {
        if (!isLoaded) return false // Don't accept data until we know who's authorized
        val authorized = cachedAuthorizedNodeId
        return authorized == null || authorized == nodeId
    }

    /**
     * Authorize a phone node to send data. Persists to DataStore and records connection history.
     * Idempotent: no-op if the same node is already authorized.
     * Closes the previous active connection when switching to a different node.
     */
    fun authorizeNode(nodeId: String, displayName: String) {
        if (cachedAuthorizedNodeId == nodeId) return // Already authorized

        cachedAuthorizedNodeId = nodeId
        scope.launch {
            val now = System.currentTimeMillis()

            dataStore.edit { it[AUTHORIZED_PHONE_NODE_ID_KEY] = nodeId }

            // Close any existing active connection from a different node
            connectionHistoryDao.getActiveConnection()?.let { active ->
                if (active.phoneNodeId != nodeId) {
                    connectionHistoryDao.updateDisconnectTime(active.id, now)
                }
            }

            connectionHistoryDao.insert(
                WearConnectionHistoryEntity(
                    phoneNodeId = nodeId,
                    phoneDisplayName = displayName,
                    connectedAt = now
                )
            )
        }
    }

    /** Clear phone authorization for re-pairing. */
    suspend fun clearAuthorization() {
        cachedAuthorizedNodeId = null
        dataStore.edit { it.remove(AUTHORIZED_PHONE_NODE_ID_KEY) }
        val active = connectionHistoryDao.getActiveConnection()
        if (active != null) {
            connectionHistoryDao.updateDisconnectTime(active.id, System.currentTimeMillis())
        }
    }

    /** Call when any valid data is received from the phone. */
    fun markDataReceived() {
        _connected.update { true }
        restartWatchdog()
    }

    fun setConnected(isConnected: Boolean) {
        _connected.update { isConnected }
        if (isConnected) restartWatchdog() else watchdogJob?.cancel()
    }

    private fun restartWatchdog() {
        watchdogJob?.cancel()
        watchdogJob = scope.launch {
            delay(CONNECTION_TIMEOUT_MS)
            _connected.update { false }
            Log.d(TAG, "Connection watchdog: no data in ${CONNECTION_TIMEOUT_MS}ms, marking disconnected")
        }
    }
}
