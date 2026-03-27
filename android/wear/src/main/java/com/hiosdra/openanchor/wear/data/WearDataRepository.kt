package com.hiosdra.openanchor.wear.data

import android.util.Log
import com.hiosdra.openanchor.wear.data.db.WearCachedStateEntity
import com.hiosdra.openanchor.wear.data.db.WearStateDao
import com.hiosdra.openanchor.wear.data.db.WearTrackPointDao
import com.hiosdra.openanchor.wear.data.db.WearTrackPointEntity
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository layer between the data-listener service and the UI state holders.
 *
 * Responsibilities:
 * - Validate and transform incoming [WearMonitorState] data
 * - Coordinate updates to [WearMonitorStateHolder] and [WearConnectionManager]
 * - Persist state to Room for offline survival
 * - Provide a clean API for the service layer
 */
@Singleton
class WearDataRepository @Inject constructor(
    private val stateHolder: WearMonitorStateHolder,
    private val connectionManager: WearConnectionManager,
    private val stateDao: WearStateDao,
    private val trackPointDao: WearTrackPointDao
) {

    internal var ioDispatcher: CoroutineDispatcher = Dispatchers.IO
    private val scope: CoroutineScope
        get() = CoroutineScope(ioDispatcher + SupervisorJob())

    private companion object {
        const val TAG = "WearDataRepository"
        const val MAX_TRACK_POINTS = 100
    }

    /** Observe the current monitor state. */
    val state: StateFlow<WearMonitorState>
        get() = stateHolder.state

    /** Observe connection status. */
    val connected: StateFlow<Boolean>
        get() = connectionManager.connected

    /** Load last cached state from Room on startup. */
    fun loadCachedState() {
        scope.launch {
            try {
                val cached = stateDao.getLastState()
                if (cached != null) {
                    stateHolder.updateState(cached.toMonitorState())
                    Log.d(TAG, "Loaded cached state: ${cached.alarmState}")
                }
            } catch (e: Exception) {
                Log.w(TAG, "Failed to load cached state", e)
            }
        }
    }

    /**
     * Process a new monitor state received from the phone.
     * Validates the data before forwarding to the state holder and persisting.
     */
    fun onStateReceived(newState: WearMonitorState) {
        if (!validate(newState)) {
            Log.w(TAG, "Invalid state received, ignoring: $newState")
            return
        }
        stateHolder.updateState(newState)
        connectionManager.markDataReceived()

        scope.launch {
            try {
                stateDao.upsert(WearCachedStateEntity.from(newState))
                trackPointDao.insert(
                    WearTrackPointEntity(
                        distanceMeters = newState.distanceMeters,
                        timestamp = newState.timestamp,
                        alarmState = newState.alarmState.name
                    )
                )
                trackPointDao.trimToMaxCount(MAX_TRACK_POINTS)
            } catch (e: Exception) {
                Log.w(TAG, "Failed to persist state", e)
            }
        }
    }

    /** Mark the phone connection as active/inactive. */
    fun onConnectionChanged(isConnected: Boolean) {
        connectionManager.setConnected(isConnected)
    }

    /**
     * Derive the current [WearScreenState] from raw state + connection.
     */
    fun screenState(): WearScreenState {
        return WearScreenState.from(state.value, connected.value)
    }

    internal fun validate(state: WearMonitorState): Boolean {
        if (state.distanceMeters < 0) {
            Log.w(TAG, "Negative distance: ${state.distanceMeters}")
            return false
        }
        if (state.gpsAccuracyMeters < 0) {
            Log.w(TAG, "Negative GPS accuracy: ${state.gpsAccuracyMeters}")
            return false
        }
        return true
    }
}
