package com.hiosdra.openanchor.ui.setup

import android.location.Location
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hiosdra.openanchor.data.location.LocationProvider
import com.hiosdra.openanchor.data.repository.AnchorSessionRepository
import com.hiosdra.openanchor.data.preferences.PreferencesManager
import com.hiosdra.openanchor.domain.catenary.CatenaryCalculator
import com.hiosdra.openanchor.domain.geometry.GeoCalculations
import com.hiosdra.openanchor.domain.model.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class SetupStep {
    DROP_POINT,
    ZONE_TYPE,
    RADIUS,
    SECTOR_CONFIG,
    CONFIRM
}

enum class ScopeRatio(val ratio: Double, val labelKey: String) {
    RATIO_3(3.0, "scope_ratio_3"),   // Calm / lunch hook
    RATIO_5(5.0, "scope_ratio_5"),   // Moderate conditions
    RATIO_7(7.0, "scope_ratio_7"),   // Standard / overnight
    RATIO_10(10.0, "scope_ratio_10"), // Storm conditions
    CUSTOM(0.0, "scope_ratio_custom") // Manual entry
}

data class SetupState(
    val currentStep: SetupStep = SetupStep.DROP_POINT,
    val anchorLat: Double = 0.0,
    val anchorLng: Double = 0.0,
    val currentBoatLat: Double = 0.0,
    val currentBoatLng: Double = 0.0,
    val hasLocation: Boolean = false,
    val zoneType: ZoneType = ZoneType.CIRCLE,
    // Circle radius
    val radiusMeters: String = "30",
    val useCalculator: Boolean = false,
    val chainLengthM: String = "",
    val depthM: String = "",
    val calculatedRadius: Double? = null,
    // Buffer zone
    val useBufferZone: Boolean = false,
    val bufferRadiusMeters: String = "50",
    // Scope ratio
    val selectedScopeRatio: ScopeRatio = ScopeRatio.RATIO_7,
    val chainAutoFilled: Boolean = false,
    // Sector config
    val sectorRadiusMeters: String = "30",
    val sectorHalfAngleDeg: String = "60",
    val sectorBearingDeg: String = "0",
    val autoSectorBearing: Boolean = true,
    // Result
    val createdSessionId: Long? = null,
    val error: String? = null
)

@HiltViewModel
class SetupViewModel @Inject constructor(
    private val locationProvider: LocationProvider,
    private val repository: AnchorSessionRepository,
    private val preferencesManager: PreferencesManager
) : ViewModel() {

    private val _state = MutableStateFlow(SetupState())
    val state: StateFlow<SetupState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            val pos = locationProvider.getLastKnownPosition()
            if (pos != null) {
                _state.update {
                    it.copy(
                        anchorLat = pos.latitude,
                        anchorLng = pos.longitude,
                        currentBoatLat = pos.latitude,
                        currentBoatLng = pos.longitude,
                        hasLocation = true
                    )
                }
            }
        }
    }

    fun setAnchorPosition(lat: Double, lng: Double) {
        _state.update { it.copy(anchorLat = lat, anchorLng = lng) }
    }

    fun useCurrentLocationAsAnchor() {
        _state.update { it.copy(anchorLat = it.currentBoatLat, anchorLng = it.currentBoatLng) }
    }

    fun setZoneType(type: ZoneType) {
        _state.update { it.copy(zoneType = type) }
    }

    fun setRadiusMeters(value: String) {
        _state.update { it.copy(radiusMeters = value) }
    }

    fun setUseCalculator(use: Boolean) {
        _state.update { it.copy(useCalculator = use, calculatedRadius = null) }
    }

    fun setChainLength(value: String) {
        _state.update { it.copy(chainLengthM = value, chainAutoFilled = false) }
        recalculateRadius()
    }

    fun setDepth(value: String) {
        _state.update { it.copy(depthM = value) }
        autoFillChainFromRatio()
        recalculateRadius()
    }

    fun setScopeRatio(ratio: ScopeRatio) {
        _state.update { it.copy(selectedScopeRatio = ratio) }
        if (ratio != ScopeRatio.CUSTOM) {
            autoFillChainFromRatio()
        }
        recalculateRadius()
    }

    private fun autoFillChainFromRatio() {
        val s = _state.value
        if (s.selectedScopeRatio == ScopeRatio.CUSTOM) return
        val depth = s.depthM.toDoubleOrNull() ?: return
        if (depth <= 0) return
        val chain = CatenaryCalculator.recommendedChainLength(depth, s.selectedScopeRatio.ratio)
        _state.update {
            it.copy(
                chainLengthM = "%.0f".format(chain),
                chainAutoFilled = true
            )
        }
    }

    private fun recalculateRadius() {
        val chain = _state.value.chainLengthM.toDoubleOrNull() ?: return
        val depth = _state.value.depthM.toDoubleOrNull() ?: return
        val radius = CatenaryCalculator.calculateRadius(chain, depth)
        _state.update {
            it.copy(
                calculatedRadius = radius,
                radiusMeters = radius?.let { r -> "%.0f".format(r) } ?: it.radiusMeters
            )
        }
    }

    fun setSectorRadius(value: String) {
        _state.update { it.copy(sectorRadiusMeters = value) }
    }

    fun setUseBufferZone(use: Boolean) {
        _state.update { it.copy(useBufferZone = use) }
    }

    fun setBufferRadius(value: String) {
        _state.update { it.copy(bufferRadiusMeters = value) }
    }

    fun setSectorHalfAngle(value: String) {
        _state.update { it.copy(sectorHalfAngleDeg = value) }
    }

    fun setSectorBearing(value: String) {
        _state.update { it.copy(sectorBearingDeg = value) }
    }

    fun setAutoSectorBearing(auto: Boolean) {
        _state.update { it.copy(autoSectorBearing = auto) }
        if (auto) {
            calculateAutoBearing()
        }
    }

    private fun calculateAutoBearing() {
        val s = _state.value
        if (!s.hasLocation) return
        val anchorPos = Position(s.anchorLat, s.anchorLng)
        val boatPos = Position(s.currentBoatLat, s.currentBoatLng)
        val bearing = GeoCalculations.bearingDegrees(anchorPos, boatPos)
        _state.update { it.copy(sectorBearingDeg = "%.0f".format(bearing)) }
    }

    fun nextStep() {
        _state.update { current ->
            val next = when (current.currentStep) {
                SetupStep.DROP_POINT -> SetupStep.ZONE_TYPE
                SetupStep.ZONE_TYPE -> SetupStep.RADIUS
                SetupStep.RADIUS -> {
                    if (current.zoneType == ZoneType.SECTOR) {
                        if (current.autoSectorBearing) calculateAutoBearing()
                        SetupStep.SECTOR_CONFIG
                    } else {
                        SetupStep.CONFIRM
                    }
                }
                SetupStep.SECTOR_CONFIG -> SetupStep.CONFIRM
                SetupStep.CONFIRM -> SetupStep.CONFIRM
            }
            current.copy(currentStep = next)
        }
    }

    fun previousStep() {
        _state.update { current ->
            val prev = when (current.currentStep) {
                SetupStep.DROP_POINT -> SetupStep.DROP_POINT
                SetupStep.ZONE_TYPE -> SetupStep.DROP_POINT
                SetupStep.RADIUS -> SetupStep.ZONE_TYPE
                SetupStep.SECTOR_CONFIG -> SetupStep.RADIUS
                SetupStep.CONFIRM -> {
                    if (current.zoneType == ZoneType.SECTOR) SetupStep.SECTOR_CONFIG
                    else SetupStep.RADIUS
                }
            }
            current.copy(currentStep = prev)
        }
    }

    fun confirmAndCreateSession() {
        viewModelScope.launch {
            val s = _state.value
            val radius = s.radiusMeters.toDoubleOrNull()
            if (radius == null || radius <= 0) {
                _state.update { it.copy(error = "Invalid radius") }
                return@launch
            }

            val bufferR = if (s.useBufferZone) s.bufferRadiusMeters.toDoubleOrNull() else null

            val anchorPos = Position(s.anchorLat, s.anchorLng)
            val zone: AnchorZone = when (s.zoneType) {
                ZoneType.CIRCLE -> AnchorZone.Circle(anchorPos, radius, bufferRadiusMeters = bufferR)
                ZoneType.SECTOR -> {
                    val sectorRadius = s.sectorRadiusMeters.toDoubleOrNull() ?: radius
                    val halfAngle = s.sectorHalfAngleDeg.toDoubleOrNull() ?: 60.0
                    val bearing = s.sectorBearingDeg.toDoubleOrNull() ?: 0.0
                    AnchorZone.SectorWithCircle(
                        anchorPosition = anchorPos,
                        radiusMeters = radius,
                        bufferRadiusMeters = bufferR,
                        sectorRadiusMeters = sectorRadius,
                        sectorHalfAngleDeg = halfAngle,
                        sectorBearingDeg = bearing
                    )
                }
            }

            val session = AnchorSession(
                anchorPosition = anchorPos,
                zone = zone,
                chainLengthM = s.chainLengthM.toDoubleOrNull(),
                depthM = s.depthM.toDoubleOrNull()
            )

            val id = repository.insertSession(session)
            _state.update { it.copy(createdSessionId = id) }
        }
    }
}
