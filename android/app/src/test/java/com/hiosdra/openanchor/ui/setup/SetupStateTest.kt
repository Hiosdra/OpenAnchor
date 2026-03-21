package com.hiosdra.openanchor.ui.setup

import com.hiosdra.openanchor.domain.model.ZoneType
import org.junit.Assert.*
import org.junit.Test

class SetupStateTest {

    // ---- SetupStep ----

    @Test
    fun `SetupStep has all expected values`() {
        val steps = SetupStep.entries
        assertEquals(5, steps.size)
        assertTrue(steps.contains(SetupStep.DROP_POINT))
        assertTrue(steps.contains(SetupStep.ZONE_TYPE))
        assertTrue(steps.contains(SetupStep.RADIUS))
        assertTrue(steps.contains(SetupStep.SECTOR_CONFIG))
        assertTrue(steps.contains(SetupStep.CONFIRM))
    }

    @Test
    fun `SetupStep ordinal order is correct`() {
        assertTrue(SetupStep.DROP_POINT.ordinal < SetupStep.ZONE_TYPE.ordinal)
        assertTrue(SetupStep.ZONE_TYPE.ordinal < SetupStep.RADIUS.ordinal)
        assertTrue(SetupStep.RADIUS.ordinal < SetupStep.SECTOR_CONFIG.ordinal)
        assertTrue(SetupStep.SECTOR_CONFIG.ordinal < SetupStep.CONFIRM.ordinal)
    }

    // ---- ScopeRatio ----

    @Test
    fun `ScopeRatio RATIO_3 has correct values`() {
        assertEquals(3.0, ScopeRatio.RATIO_3.ratio, 0.01)
        assertEquals("scope_ratio_3", ScopeRatio.RATIO_3.labelKey)
    }

    @Test
    fun `ScopeRatio RATIO_5 has correct values`() {
        assertEquals(5.0, ScopeRatio.RATIO_5.ratio, 0.01)
        assertEquals("scope_ratio_5", ScopeRatio.RATIO_5.labelKey)
    }

    @Test
    fun `ScopeRatio RATIO_7 has correct values`() {
        assertEquals(7.0, ScopeRatio.RATIO_7.ratio, 0.01)
        assertEquals("scope_ratio_7", ScopeRatio.RATIO_7.labelKey)
    }

    @Test
    fun `ScopeRatio RATIO_10 has correct values`() {
        assertEquals(10.0, ScopeRatio.RATIO_10.ratio, 0.01)
        assertEquals("scope_ratio_10", ScopeRatio.RATIO_10.labelKey)
    }

    @Test
    fun `ScopeRatio CUSTOM has zero ratio`() {
        assertEquals(0.0, ScopeRatio.CUSTOM.ratio, 0.01)
        assertEquals("scope_ratio_custom", ScopeRatio.CUSTOM.labelKey)
    }

    @Test
    fun `ScopeRatio has 5 entries`() {
        assertEquals(5, ScopeRatio.entries.size)
    }

    // ---- SetupState ----

    @Test
    fun `SetupState default values`() {
        val state = SetupState()
        assertEquals(SetupStep.DROP_POINT, state.currentStep)
        assertEquals(0.0, state.anchorLat, 0.01)
        assertEquals(0.0, state.anchorLng, 0.01)
        assertEquals(0.0, state.currentBoatLat, 0.01)
        assertEquals(0.0, state.currentBoatLng, 0.01)
        assertFalse(state.hasLocation)
        assertEquals(ZoneType.CIRCLE, state.zoneType)
        assertEquals("30", state.radiusMeters)
        assertFalse(state.useCalculator)
        assertEquals("", state.chainLengthM)
        assertEquals("", state.depthM)
        assertNull(state.calculatedRadius)
        assertFalse(state.useBufferZone)
        assertEquals("50", state.bufferRadiusMeters)
        assertEquals(ScopeRatio.RATIO_7, state.selectedScopeRatio)
        assertFalse(state.chainAutoFilled)
        assertEquals("30", state.sectorRadiusMeters)
        assertEquals("60", state.sectorHalfAngleDeg)
        assertEquals("0", state.sectorBearingDeg)
        assertTrue(state.autoSectorBearing)
        assertNull(state.createdSessionId)
        assertNull(state.error)
    }

    @Test
    fun `SetupState copy modifies specified fields only`() {
        val state = SetupState()
        val modified = state.copy(
            anchorLat = 54.35,
            anchorLng = 18.65,
            hasLocation = true,
            currentStep = SetupStep.RADIUS
        )
        assertEquals(54.35, modified.anchorLat, 0.01)
        assertEquals(18.65, modified.anchorLng, 0.01)
        assertTrue(modified.hasLocation)
        assertEquals(SetupStep.RADIUS, modified.currentStep)
        assertEquals(ZoneType.CIRCLE, modified.zoneType) // unchanged
        assertEquals("30", modified.radiusMeters) // unchanged
    }

    @Test
    fun `SetupState with sector zone type`() {
        val state = SetupState(
            zoneType = ZoneType.SECTOR,
            sectorRadiusMeters = "40",
            sectorHalfAngleDeg = "45",
            sectorBearingDeg = "180"
        )
        assertEquals(ZoneType.SECTOR, state.zoneType)
        assertEquals("40", state.sectorRadiusMeters)
        assertEquals("45", state.sectorHalfAngleDeg)
        assertEquals("180", state.sectorBearingDeg)
    }

    @Test
    fun `SetupState with calculator enabled`() {
        val state = SetupState(
            useCalculator = true,
            chainLengthM = "50",
            depthM = "10",
            calculatedRadius = 42.5,
            selectedScopeRatio = ScopeRatio.RATIO_5
        )
        assertTrue(state.useCalculator)
        assertEquals("50", state.chainLengthM)
        assertEquals("10", state.depthM)
        assertEquals(42.5, state.calculatedRadius!!, 0.01)
        assertEquals(ScopeRatio.RATIO_5, state.selectedScopeRatio)
    }

    @Test
    fun `SetupState with buffer zone`() {
        val state = SetupState(
            useBufferZone = true,
            bufferRadiusMeters = "60"
        )
        assertTrue(state.useBufferZone)
        assertEquals("60", state.bufferRadiusMeters)
    }

    @Test
    fun `SetupState with created session`() {
        val state = SetupState(createdSessionId = 42L)
        assertEquals(42L, state.createdSessionId)
    }

    @Test
    fun `SetupState with error`() {
        val state = SetupState(error = "Invalid radius")
        assertEquals("Invalid radius", state.error)
    }

    @Test
    fun `SetupState equality`() {
        val state1 = SetupState(anchorLat = 54.35)
        val state2 = SetupState(anchorLat = 54.35)
        assertEquals(state1, state2)
    }

    @Test
    fun `SetupState inequality`() {
        val state1 = SetupState(anchorLat = 54.35)
        val state2 = SetupState(anchorLat = 55.0)
        assertNotEquals(state1, state2)
    }
}
