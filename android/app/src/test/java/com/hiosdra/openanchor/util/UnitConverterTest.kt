package com.hiosdra.openanchor.util

import com.hiosdra.openanchor.domain.model.DepthUnit
import com.hiosdra.openanchor.domain.model.DistanceUnit
import org.junit.Test
import org.junit.Assert.*

/**
 * Comprehensive tests for UnitConverter - unit conversion utilities.
 */
class UnitConverterTest {

    companion object {
        private const val TOLERANCE = 0.01
        private const val METERS_PER_NAUTICAL_MILE = 1852.0
        private const val METERS_PER_FOOT = 0.3048
    }

    // ========== Distance Conversion: Meters To Other Units ==========

    @Test
    fun metersTo_meters_returnsSameValue() {
        assertEquals(100.0, UnitConverter.metersTo(100.0, DistanceUnit.METERS), TOLERANCE)
        assertEquals(0.0, UnitConverter.metersTo(0.0, DistanceUnit.METERS), TOLERANCE)
        assertEquals(1234.56, UnitConverter.metersTo(1234.56, DistanceUnit.METERS), TOLERANCE)
    }

    @Test
    fun metersTo_nauticalMiles_convertsCorrectly() {
        // 1852 meters = 1 nautical mile
        assertEquals(1.0, UnitConverter.metersTo(1852.0, DistanceUnit.NAUTICAL_MILES), TOLERANCE)

        // 0 meters = 0 nautical miles
        assertEquals(0.0, UnitConverter.metersTo(0.0, DistanceUnit.NAUTICAL_MILES), TOLERANCE)

        // 3704 meters = 2 nautical miles
        assertEquals(2.0, UnitConverter.metersTo(3704.0, DistanceUnit.NAUTICAL_MILES), TOLERANCE)

        // 926 meters = 0.5 nautical miles
        assertEquals(0.5, UnitConverter.metersTo(926.0, DistanceUnit.NAUTICAL_MILES), TOLERANCE)
    }

    @Test
    fun metersTo_feet_convertsCorrectly() {
        // 0.3048 meters = 1 foot
        assertEquals(1.0, UnitConverter.metersTo(0.3048, DistanceUnit.FEET), TOLERANCE)

        // 0 meters = 0 feet
        assertEquals(0.0, UnitConverter.metersTo(0.0, DistanceUnit.FEET), TOLERANCE)

        // 3.048 meters = 10 feet
        assertEquals(10.0, UnitConverter.metersTo(3.048, DistanceUnit.FEET), TOLERANCE)

        // 100 meters ≈ 328.08 feet
        assertEquals(328.08, UnitConverter.metersTo(100.0, DistanceUnit.FEET), 0.1)
    }

    @Test
    fun metersTo_largeDistance_handlesCorrectly() {
        // 185200 meters = 100 nautical miles
        assertEquals(100.0, UnitConverter.metersTo(185200.0, DistanceUnit.NAUTICAL_MILES), TOLERANCE)

        // 1000 meters ≈ 3280.84 feet
        assertEquals(3280.84, UnitConverter.metersTo(1000.0, DistanceUnit.FEET), 0.1)
    }

    @Test
    fun metersTo_smallDistance_handlesCorrectly() {
        // 0.1 meters to feet
        assertEquals(0.328, UnitConverter.metersTo(0.1, DistanceUnit.FEET), 0.01)

        // 1 meter to nautical miles
        assertEquals(0.00054, UnitConverter.metersTo(1.0, DistanceUnit.NAUTICAL_MILES), 0.00001)
    }

    // ========== Distance Conversion: Other Units To Meters ==========

    @Test
    fun toMeters_meters_returnsSameValue() {
        assertEquals(100.0, UnitConverter.toMeters(100.0, DistanceUnit.METERS), TOLERANCE)
        assertEquals(0.0, UnitConverter.toMeters(0.0, DistanceUnit.METERS), TOLERANCE)
        assertEquals(1234.56, UnitConverter.toMeters(1234.56, DistanceUnit.METERS), TOLERANCE)
    }

    @Test
    fun toMeters_nauticalMiles_convertsCorrectly() {
        // 1 nautical mile = 1852 meters
        assertEquals(1852.0, UnitConverter.toMeters(1.0, DistanceUnit.NAUTICAL_MILES), TOLERANCE)

        // 0 nautical miles = 0 meters
        assertEquals(0.0, UnitConverter.toMeters(0.0, DistanceUnit.NAUTICAL_MILES), TOLERANCE)

        // 2 nautical miles = 3704 meters
        assertEquals(3704.0, UnitConverter.toMeters(2.0, DistanceUnit.NAUTICAL_MILES), TOLERANCE)

        // 0.5 nautical miles = 926 meters
        assertEquals(926.0, UnitConverter.toMeters(0.5, DistanceUnit.NAUTICAL_MILES), TOLERANCE)
    }

    @Test
    fun toMeters_feet_convertsCorrectly() {
        // 1 foot = 0.3048 meters
        assertEquals(0.3048, UnitConverter.toMeters(1.0, DistanceUnit.FEET), TOLERANCE)

        // 0 feet = 0 meters
        assertEquals(0.0, UnitConverter.toMeters(0.0, DistanceUnit.FEET), TOLERANCE)

        // 10 feet = 3.048 meters
        assertEquals(3.048, UnitConverter.toMeters(10.0, DistanceUnit.FEET), TOLERANCE)

        // 100 feet ≈ 30.48 meters
        assertEquals(30.48, UnitConverter.toMeters(100.0, DistanceUnit.FEET), TOLERANCE)
    }

    @Test
    fun toMeters_largeDistance_handlesCorrectly() {
        // 100 nautical miles = 185200 meters
        assertEquals(185200.0, UnitConverter.toMeters(100.0, DistanceUnit.NAUTICAL_MILES), TOLERANCE)

        // 10000 feet ≈ 3048 meters
        assertEquals(3048.0, UnitConverter.toMeters(10000.0, DistanceUnit.FEET), TOLERANCE)
    }

    // ========== Depth Conversion: Meters To Other Units ==========

    @Test
    fun metersToDepth_meters_returnsSameValue() {
        assertEquals(10.0, UnitConverter.metersToDepth(10.0, DepthUnit.METERS), TOLERANCE)
        assertEquals(0.0, UnitConverter.metersToDepth(0.0, DepthUnit.METERS), TOLERANCE)
        assertEquals(123.45, UnitConverter.metersToDepth(123.45, DepthUnit.METERS), TOLERANCE)
    }

    @Test
    fun metersToDepth_feet_convertsCorrectly() {
        // 0.3048 meters = 1 foot
        assertEquals(1.0, UnitConverter.metersToDepth(0.3048, DepthUnit.FEET), TOLERANCE)

        // 0 meters = 0 feet
        assertEquals(0.0, UnitConverter.metersToDepth(0.0, DepthUnit.FEET), TOLERANCE)

        // 10 meters ≈ 32.808 feet
        assertEquals(32.808, UnitConverter.metersToDepth(10.0, DepthUnit.FEET), 0.01)

        // 30 meters ≈ 98.425 feet
        assertEquals(98.425, UnitConverter.metersToDepth(30.0, DepthUnit.FEET), 0.01)
    }

    // ========== Depth Conversion: Other Units To Meters ==========

    @Test
    fun depthToMeters_meters_returnsSameValue() {
        assertEquals(10.0, UnitConverter.depthToMeters(10.0, DepthUnit.METERS), TOLERANCE)
        assertEquals(0.0, UnitConverter.depthToMeters(0.0, DepthUnit.METERS), TOLERANCE)
        assertEquals(123.45, UnitConverter.depthToMeters(123.45, DepthUnit.METERS), TOLERANCE)
    }

    @Test
    fun depthToMeters_feet_convertsCorrectly() {
        // 1 foot = 0.3048 meters
        assertEquals(0.3048, UnitConverter.depthToMeters(1.0, DepthUnit.FEET), TOLERANCE)

        // 0 feet = 0 meters
        assertEquals(0.0, UnitConverter.depthToMeters(0.0, DepthUnit.FEET), TOLERANCE)

        // 10 feet = 3.048 meters
        assertEquals(3.048, UnitConverter.depthToMeters(10.0, DepthUnit.FEET), TOLERANCE)

        // 100 feet = 30.48 meters
        assertEquals(30.48, UnitConverter.depthToMeters(100.0, DepthUnit.FEET), TOLERANCE)
    }

    // ========== Format Distance ==========

    @Test
    fun formatDistance_meters_formatsCorrectly() {
        assertEquals("100 m", UnitConverter.formatDistance(100.0, DistanceUnit.METERS))
        assertEquals("0 m", UnitConverter.formatDistance(0.0, DistanceUnit.METERS))
        assertEquals("1234 m", UnitConverter.formatDistance(1234.56, DistanceUnit.METERS))
    }

    @Test
    fun formatDistance_nauticalMiles_formatsCorrectly() {
        assertEquals("1.00 nm", UnitConverter.formatDistance(1852.0, DistanceUnit.NAUTICAL_MILES))
        assertEquals("0.00 nm", UnitConverter.formatDistance(0.0, DistanceUnit.NAUTICAL_MILES))
        assertEquals("2.00 nm", UnitConverter.formatDistance(3704.0, DistanceUnit.NAUTICAL_MILES))
    }

    @Test
    fun formatDistance_feet_formatsCorrectly() {
        assertEquals("1 ft", UnitConverter.formatDistance(0.3048, DistanceUnit.FEET))
        assertEquals("0 ft", UnitConverter.formatDistance(0.0, DistanceUnit.FEET))
        assertEquals("328 ft", UnitConverter.formatDistance(100.0, DistanceUnit.FEET))
    }

    @Test
    fun formatDistance_meters_roundsToWholeNumber() {
        assertEquals("123 m", UnitConverter.formatDistance(123.4, DistanceUnit.METERS))
        assertEquals("124 m", UnitConverter.formatDistance(123.6, DistanceUnit.METERS))
    }

    @Test
    fun formatDistance_nauticalMiles_showsTwoDecimals() {
        val nm = UnitConverter.formatDistance(1000.0, DistanceUnit.NAUTICAL_MILES)
        assertTrue(nm.contains("."))
        assertTrue(nm.endsWith("nm"))
    }

    @Test
    fun formatDistance_feet_roundsToWholeNumber() {
        assertEquals("33 ft", UnitConverter.formatDistance(10.0, DistanceUnit.FEET))
    }

    // ========== Format Depth ==========

    @Test
    fun formatDepth_meters_formatsCorrectly() {
        assertEquals("10.0 m", UnitConverter.formatDepth(10.0, DepthUnit.METERS))
        assertEquals("0.0 m", UnitConverter.formatDepth(0.0, DepthUnit.METERS))
        assertEquals("123.5 m", UnitConverter.formatDepth(123.45, DepthUnit.METERS))
    }

    @Test
    fun formatDepth_feet_formatsCorrectly() {
        assertEquals("1.0 ft", UnitConverter.formatDepth(0.3048, DepthUnit.FEET))
        assertEquals("0.0 ft", UnitConverter.formatDepth(0.0, DepthUnit.FEET))
        assertEquals("32.8 ft", UnitConverter.formatDepth(10.0, DepthUnit.FEET))
    }

    @Test
    fun formatDepth_showsOneDecimal() {
        assertEquals("10.5 m", UnitConverter.formatDepth(10.5, DepthUnit.METERS))
        assertEquals("33.5 ft", UnitConverter.formatDepth(10.21, DepthUnit.FEET))
    }

    // ========== Round-Trip Conversions ==========

    @Test
    fun roundTrip_metersToNauticalMilesAndBack() {
        val original = 5000.0
        val converted = UnitConverter.metersTo(original, DistanceUnit.NAUTICAL_MILES)
        val backToMeters = UnitConverter.toMeters(converted, DistanceUnit.NAUTICAL_MILES)
        assertEquals(original, backToMeters, TOLERANCE)
    }

    @Test
    fun roundTrip_metersToFeetAndBack() {
        val original = 100.0
        val converted = UnitConverter.metersTo(original, DistanceUnit.FEET)
        val backToMeters = UnitConverter.toMeters(converted, DistanceUnit.FEET)
        assertEquals(original, backToMeters, TOLERANCE)
    }

    @Test
    fun roundTrip_depthMetersToFeetAndBack() {
        val original = 50.0
        val converted = UnitConverter.metersToDepth(original, DepthUnit.FEET)
        val backToMeters = UnitConverter.depthToMeters(converted, DepthUnit.FEET)
        assertEquals(original, backToMeters, TOLERANCE)
    }

    @Test
    fun roundTrip_allDistanceUnits() {
        val testValues = listOf(0.0, 1.0, 100.0, 1000.0, 5280.0)
        val units = DistanceUnit.entries

        testValues.forEach { original ->
            units.forEach { unit ->
                val converted = UnitConverter.metersTo(original, unit)
                val back = UnitConverter.toMeters(converted, unit)
                assertEquals("Round trip failed for $original meters to $unit", original, back, TOLERANCE)
            }
        }
    }

    // ========== Realistic Sailing Scenarios ==========

    @Test
    fun scenario_anchorRadius_100meters() {
        // Anchor radius: 100 meters
        assertEquals("100 m", UnitConverter.formatDistance(100.0, DistanceUnit.METERS))
        assertEquals("0.05 nm", UnitConverter.formatDistance(100.0, DistanceUnit.NAUTICAL_MILES))
        assertEquals("328 ft", UnitConverter.formatDistance(100.0, DistanceUnit.FEET))
    }

    @Test
    fun scenario_waterDepth_15meters() {
        // Water depth: 15 meters
        assertEquals("15.0 m", UnitConverter.formatDepth(15.0, DepthUnit.METERS))
        assertEquals("49.2 ft", UnitConverter.formatDepth(15.0, DepthUnit.FEET))
    }

    @Test
    fun scenario_driftDistance_50meters() {
        // Boat drifted 50 meters
        assertEquals("50 m", UnitConverter.formatDistance(50.0, DistanceUnit.METERS))
        assertEquals("0.03 nm", UnitConverter.formatDistance(50.0, DistanceUnit.NAUTICAL_MILES))
        assertEquals("164 ft", UnitConverter.formatDistance(50.0, DistanceUnit.FEET))
    }

    @Test
    fun scenario_deepWater_30meters() {
        // Deep water anchoring: 30 meters
        assertEquals("30.0 m", UnitConverter.formatDepth(30.0, DepthUnit.METERS))
        assertEquals("98.4 ft", UnitConverter.formatDepth(30.0, DepthUnit.FEET))
    }

    @Test
    fun scenario_longSwingRadius_200meters() {
        // Large swing radius in storm: 200 meters
        assertEquals("200 m", UnitConverter.formatDistance(200.0, DistanceUnit.METERS))
        assertEquals("0.11 nm", UnitConverter.formatDistance(200.0, DistanceUnit.NAUTICAL_MILES))
        assertEquals("656 ft", UnitConverter.formatDistance(200.0, DistanceUnit.FEET))
    }

    // ========== Edge Cases ==========

    @Test
    fun edgeCase_zeroValues() {
        // All conversions with zero should return zero
        assertEquals(0.0, UnitConverter.metersTo(0.0, DistanceUnit.NAUTICAL_MILES), TOLERANCE)
        assertEquals(0.0, UnitConverter.metersTo(0.0, DistanceUnit.FEET), TOLERANCE)
        assertEquals(0.0, UnitConverter.toMeters(0.0, DistanceUnit.NAUTICAL_MILES), TOLERANCE)
        assertEquals(0.0, UnitConverter.toMeters(0.0, DistanceUnit.FEET), TOLERANCE)
        assertEquals(0.0, UnitConverter.metersToDepth(0.0, DepthUnit.FEET), TOLERANCE)
        assertEquals(0.0, UnitConverter.depthToMeters(0.0, DepthUnit.FEET), TOLERANCE)
    }

    @Test
    fun edgeCase_verySmallValues() {
        val small = 0.001
        // Should handle very small values without errors
        assertTrue(UnitConverter.metersTo(small, DistanceUnit.NAUTICAL_MILES) > 0.0)
        assertTrue(UnitConverter.metersTo(small, DistanceUnit.FEET) > 0.0)
    }

    @Test
    fun edgeCase_veryLargeValues() {
        val large = 1_000_000.0 // 1000 km
        // Should handle very large values without overflow
        val nm = UnitConverter.metersTo(large, DistanceUnit.NAUTICAL_MILES)
        val ft = UnitConverter.metersTo(large, DistanceUnit.FEET)
        assertTrue(nm > 0.0 && nm < Double.POSITIVE_INFINITY)
        assertTrue(ft > 0.0 && ft < Double.POSITIVE_INFINITY)
    }

    @Test
    fun edgeCase_negativeValues_convertCorrectly() {
        // While negative distances don't make physical sense,
        // the converter should handle them mathematically
        assertEquals(-1.0, UnitConverter.metersTo(-1852.0, DistanceUnit.NAUTICAL_MILES), TOLERANCE)
        assertEquals(-10.0, UnitConverter.metersTo(-3.048, DistanceUnit.FEET), TOLERANCE)
    }

    // ========== Consistency Tests ==========

    @Test
    fun consistency_conversionConstants() {
        // Verify the constants match expected values
        assertEquals(METERS_PER_NAUTICAL_MILE, 1852.0, 0.0)
        assertEquals(METERS_PER_FOOT, 0.3048, 0.0)
    }

    @Test
    fun consistency_metersIdentity() {
        // Converting to meters and back should always work
        val testValue = 123.456
        assertEquals(testValue, UnitConverter.metersTo(testValue, DistanceUnit.METERS), TOLERANCE)
        assertEquals(testValue, UnitConverter.toMeters(testValue, DistanceUnit.METERS), TOLERANCE)
        assertEquals(testValue, UnitConverter.metersToDepth(testValue, DepthUnit.METERS), TOLERANCE)
        assertEquals(testValue, UnitConverter.depthToMeters(testValue, DepthUnit.METERS), TOLERANCE)
    }

    @Test
    fun consistency_depthAndDistanceFeetAreEqual() {
        // Feet conversion should be identical for depth and distance
        val meters = 10.0
        val distanceFeet = UnitConverter.metersTo(meters, DistanceUnit.FEET)
        val depthFeet = UnitConverter.metersToDepth(meters, DepthUnit.FEET)
        assertEquals(distanceFeet, depthFeet, TOLERANCE)

        val feet = 100.0
        val distanceMeters = UnitConverter.toMeters(feet, DistanceUnit.FEET)
        val depthMeters = UnitConverter.depthToMeters(feet, DepthUnit.FEET)
        assertEquals(distanceMeters, depthMeters, TOLERANCE)
    }
}
