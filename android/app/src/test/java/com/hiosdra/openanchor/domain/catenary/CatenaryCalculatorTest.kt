package com.hiosdra.openanchor.domain.catenary

import org.junit.Test
import org.junit.Assert.*

/**
 * Comprehensive tests for CatenaryCalculator - anchor chain calculations.
 */
class CatenaryCalculatorTest {

    companion object {
        private const val TOLERANCE = 0.5 // meters
    }

    // ========== Basic Radius Calculations ==========

    @Test
    fun calculateRadius_validInputs_returnsPositiveValue() {
        val result = CatenaryCalculator.calculateRadius(
            chainLengthM = 50.0,
            depthM = 10.0,
            safetyMarginPercent = 0.0
        )
        assertNotNull(result)
        assertTrue(result!! > 0.0)
    }

    @Test
    fun calculateRadius_chainTooShort_returnsNull() {
        // Chain length equals depth - physically impossible
        val result = CatenaryCalculator.calculateRadius(
            chainLengthM = 10.0,
            depthM = 10.0,
            safetyMarginPercent = 0.0
        )
        assertNull(result)
    }

    @Test
    fun calculateRadius_chainShorterThanDepth_returnsNull() {
        // Chain length less than depth
        val result = CatenaryCalculator.calculateRadius(
            chainLengthM = 5.0,
            depthM = 10.0,
            safetyMarginPercent = 0.0
        )
        assertNull(result)
    }

    @Test
    fun calculateRadius_zeroChainLength_returnsNull() {
        val result = CatenaryCalculator.calculateRadius(
            chainLengthM = 0.0,
            depthM = 10.0,
            safetyMarginPercent = 0.0
        )
        assertNull(result)
    }

    @Test
    fun calculateRadius_negativeChainLength_returnsNull() {
        val result = CatenaryCalculator.calculateRadius(
            chainLengthM = -50.0,
            depthM = 10.0,
            safetyMarginPercent = 0.0
        )
        assertNull(result)
    }

    @Test
    fun calculateRadius_zeroDepth_returnsNull() {
        val result = CatenaryCalculator.calculateRadius(
            chainLengthM = 50.0,
            depthM = 0.0,
            safetyMarginPercent = 0.0
        )
        assertNull(result)
    }

    @Test
    fun calculateRadius_negativeDepth_returnsNull() {
        val result = CatenaryCalculator.calculateRadius(
            chainLengthM = 50.0,
            depthM = -10.0,
            safetyMarginPercent = 0.0
        )
        assertNull(result)
    }

    // ========== Pythagorean Approximation Tests ==========

    @Test
    fun calculateRadius_noSafetyMargin_usesPythagoreanTheorem() {
        // With 50m chain and 10m depth:
        // radius ≈ sqrt(50² - 10²) = sqrt(2500 - 100) = sqrt(2400) ≈ 49m
        val result = CatenaryCalculator.calculateRadius(
            chainLengthM = 50.0,
            depthM = 10.0,
            safetyMarginPercent = 0.0
        )
        assertNotNull(result)
        assertEquals(49.0, result!!, TOLERANCE)
    }

    @Test
    fun calculateRadius_perfectPythagorean_345Triangle() {
        // Classic 3-4-5 triangle scaled to 30-40-50
        // Chain = 50m, Depth = 30m → Horizontal = 40m
        val result = CatenaryCalculator.calculateRadius(
            chainLengthM = 50.0,
            depthM = 30.0,
            safetyMarginPercent = 0.0
        )
        assertNotNull(result)
        assertEquals(40.0, result!!, TOLERANCE)
    }

    @Test
    fun calculateRadius_perfectPythagorean_51213Triangle() {
        // 5-12-13 triangle scaled to 50-120-130
        // Chain = 130m, Depth = 50m → Horizontal = 120m
        val result = CatenaryCalculator.calculateRadius(
            chainLengthM = 130.0,
            depthM = 50.0,
            safetyMarginPercent = 0.0
        )
        assertNotNull(result)
        assertEquals(120.0, result!!, TOLERANCE)
    }

    // ========== Safety Margin Tests ==========

    @Test
    fun calculateRadius_with20PercentSafetyMargin_increasesRadius() {
        val noMargin = CatenaryCalculator.calculateRadius(
            chainLengthM = 50.0,
            depthM = 10.0,
            safetyMarginPercent = 0.0
        )
        val withMargin = CatenaryCalculator.calculateRadius(
            chainLengthM = 50.0,
            depthM = 10.0,
            safetyMarginPercent = 20.0
        )

        assertNotNull(noMargin)
        assertNotNull(withMargin)
        assertTrue(withMargin!! > noMargin!!)
    }

    @Test
    fun calculateRadius_defaultSafetyMargin_is20Percent() {
        val explicit = CatenaryCalculator.calculateRadius(
            chainLengthM = 50.0,
            depthM = 10.0,
            safetyMarginPercent = 20.0
        )
        val default = CatenaryCalculator.calculateRadius(
            chainLengthM = 50.0,
            depthM = 10.0
        )

        assertNotNull(explicit)
        assertNotNull(default)
        assertEquals(explicit!!, default!!, 0.01)
    }

    @Test
    fun calculateRadius_20PercentMargin_increases20Percent() {
        val baseRadius = 49.0 // sqrt(50² - 10²)
        val expectedWithMargin = baseRadius * 1.20

        val result = CatenaryCalculator.calculateRadius(
            chainLengthM = 50.0,
            depthM = 10.0,
            safetyMarginPercent = 20.0
        )

        assertNotNull(result)
        assertEquals(expectedWithMargin, result!!, TOLERANCE)
    }

    @Test
    fun calculateRadius_50PercentMargin_increases50Percent() {
        val result = CatenaryCalculator.calculateRadius(
            chainLengthM = 50.0,
            depthM = 10.0,
            safetyMarginPercent = 50.0
        )

        assertNotNull(result)
        // Base ≈ 49m, with 50% margin ≈ 73.5m
        assertEquals(73.5, result!!, TOLERANCE)
    }

    @Test
    fun calculateRadius_zeroMargin_doesNotAddMargin() {
        val result = CatenaryCalculator.calculateRadius(
            chainLengthM = 50.0,
            depthM = 10.0,
            safetyMarginPercent = 0.0
        )

        assertNotNull(result)
        assertEquals(49.0, result!!, TOLERANCE)
    }

    // ========== Realistic Anchoring Scenarios ==========

    @Test
    fun calculateRadius_typicalScenario_5to1Scope() {
        // 5:1 scope ratio (conservative for calm conditions)
        // Depth: 10m, Chain: 50m → Horizontal ≈ 49m
        val result = CatenaryCalculator.calculateRadius(
            chainLengthM = 50.0,
            depthM = 10.0,
            safetyMarginPercent = 20.0
        )

        assertNotNull(result)
        // Base ~49m + 20% margin = ~58.8m
        assertEquals(58.8, result!!, 1.0)
    }

    @Test
    fun calculateRadius_typicalScenario_7to1Scope() {
        // 7:1 scope ratio (standard for moderate conditions)
        // Depth: 10m, Chain: 70m → Horizontal ≈ 69.3m
        val result = CatenaryCalculator.calculateRadius(
            chainLengthM = 70.0,
            depthM = 10.0,
            safetyMarginPercent = 20.0
        )

        assertNotNull(result)
        // sqrt(70² - 10²) = sqrt(4800) ≈ 69.3m + 20% ≈ 83.1m
        assertEquals(83.1, result!!, 1.0)
    }

    @Test
    fun calculateRadius_deepWater_scenario() {
        // Deep water: 30m depth, 210m chain (7:1 scope)
        val result = CatenaryCalculator.calculateRadius(
            chainLengthM = 210.0,
            depthM = 30.0,
            safetyMarginPercent = 20.0
        )

        assertNotNull(result)
        // sqrt(210² - 30²) = sqrt(43200) ≈ 207.8m + 20% ≈ 249.4m
        assertEquals(249.4, result!!, 2.0)
    }

    @Test
    fun calculateRadius_shallowWater_scenario() {
        // Shallow water: 3m depth, 21m chain (7:1 scope)
        val result = CatenaryCalculator.calculateRadius(
            chainLengthM = 21.0,
            depthM = 3.0,
            safetyMarginPercent = 20.0
        )

        assertNotNull(result)
        // sqrt(21² - 3²) = sqrt(432) ≈ 20.8m + 20% ≈ 24.9m
        assertEquals(24.9, result!!, 1.0)
    }

    @Test
    fun calculateRadius_stormConditions_10to1Scope() {
        // Storm conditions: 10:1 scope
        // Depth: 15m, Chain: 150m
        val result = CatenaryCalculator.calculateRadius(
            chainLengthM = 150.0,
            depthM = 15.0,
            safetyMarginPercent = 20.0
        )

        assertNotNull(result)
        // sqrt(150² - 15²) = sqrt(22275) ≈ 149.2m + 20% ≈ 179m
        assertEquals(179.0, result!!, 2.0)
    }

    // ========== Recommended Chain Length ==========

    @Test
    fun recommendedChainLength_defaultScope7to1() {
        val recommended = CatenaryCalculator.recommendedChainLength(depthM = 10.0)
        assertEquals(70.0, recommended, 0.1)
    }

    @Test
    fun recommendedChainLength_customScope5to1() {
        val recommended = CatenaryCalculator.recommendedChainLength(
            depthM = 10.0,
            scopeRatio = 5.0
        )
        assertEquals(50.0, recommended, 0.1)
    }

    @Test
    fun recommendedChainLength_customScope10to1() {
        val recommended = CatenaryCalculator.recommendedChainLength(
            depthM = 10.0,
            scopeRatio = 10.0
        )
        assertEquals(100.0, recommended, 0.1)
    }

    @Test
    fun recommendedChainLength_deepWater() {
        val recommended = CatenaryCalculator.recommendedChainLength(
            depthM = 30.0,
            scopeRatio = 7.0
        )
        assertEquals(210.0, recommended, 0.1)
    }

    @Test
    fun recommendedChainLength_shallowWater() {
        val recommended = CatenaryCalculator.recommendedChainLength(
            depthM = 3.0,
            scopeRatio = 7.0
        )
        assertEquals(21.0, recommended, 0.1)
    }

    @Test
    fun recommendedChainLength_veryShallowWater() {
        val recommended = CatenaryCalculator.recommendedChainLength(
            depthM = 1.5,
            scopeRatio = 5.0
        )
        assertEquals(7.5, recommended, 0.1)
    }

    // ========== Edge Cases and Boundary Conditions ==========

    @Test
    fun calculateRadius_veryLongChain_handlesLargeNumbers() {
        // 1000m chain in 100m depth
        val result = CatenaryCalculator.calculateRadius(
            chainLengthM = 1000.0,
            depthM = 100.0,
            safetyMarginPercent = 0.0
        )

        assertNotNull(result)
        // sqrt(1000² - 100²) = sqrt(990000) ≈ 995m
        assertEquals(995.0, result!!, 5.0)
    }

    @Test
    fun calculateRadius_nearVerticalChain_smallHorizontal() {
        // Chain barely longer than depth
        val result = CatenaryCalculator.calculateRadius(
            chainLengthM = 10.1,
            depthM = 10.0,
            safetyMarginPercent = 0.0
        )

        assertNotNull(result)
        // sqrt(10.1² - 10²) = sqrt(2.01) ≈ 1.42m
        assertTrue(result!! > 0.0 && result < 2.0)
    }

    @Test
    fun calculateRadius_verySmallDepth_largeRadius() {
        // Shallow water with long chain
        val result = CatenaryCalculator.calculateRadius(
            chainLengthM = 100.0,
            depthM = 1.0,
            safetyMarginPercent = 0.0
        )

        assertNotNull(result)
        // sqrt(100² - 1²) = sqrt(9999) ≈ 99.99m
        assertEquals(100.0, result!!, 1.0)
    }

    @Test
    fun calculateRadius_fractionalValues_worksCorrectly() {
        val result = CatenaryCalculator.calculateRadius(
            chainLengthM = 25.5,
            depthM = 7.3,
            safetyMarginPercent = 15.0
        )

        assertNotNull(result)
        assertTrue(result!! > 0.0)
    }

    // ========== Integration Tests ==========

    @Test
    fun integration_recommendedChainGivesGoodSwingRadius() {
        val depth = 12.0
        val scopeRatio = 7.0

        val recommendedChain = CatenaryCalculator.recommendedChainLength(depth, scopeRatio)
        val swingRadius = CatenaryCalculator.calculateRadius(
            chainLengthM = recommendedChain,
            depthM = depth,
            safetyMarginPercent = 20.0
        )

        assertNotNull(swingRadius)
        // With 7:1 scope, swing radius should be roughly 6.8-7x depth (with safety margin)
        assertTrue(swingRadius!! > depth * 6.0)
        assertTrue(swingRadius < depth * 8.0)
    }

    @Test
    fun integration_increasingScopeIncreasesRadius() {
        val depth = 10.0
        val scopes = listOf(5.0, 7.0, 10.0)

        val radii = scopes.map { scope ->
            val chain = CatenaryCalculator.recommendedChainLength(depth, scope)
            CatenaryCalculator.calculateRadius(chain, depth, 0.0)!!
        }

        // Each radius should be larger than the previous
        assertTrue(radii[1] > radii[0])
        assertTrue(radii[2] > radii[1])
    }

    @Test
    fun integration_increasingSafetyMarginIncreasesRadius() {
        val margins = listOf(0.0, 10.0, 20.0, 30.0)

        val radii = margins.map { margin ->
            CatenaryCalculator.calculateRadius(
                chainLengthM = 50.0,
                depthM = 10.0,
                safetyMarginPercent = margin
            )!!
        }

        // Each radius should be larger than the previous
        for (i in 1 until radii.size) {
            assertTrue("Radius at index $i should be > previous", radii[i] > radii[i - 1])
        }
    }

    @Test
    fun integration_consistentResultsAcrossSimilarScenarios() {
        // Scaling: 10m depth vs 20m depth with proportional chain
        val radius1 = CatenaryCalculator.calculateRadius(
            chainLengthM = 70.0,
            depthM = 10.0,
            safetyMarginPercent = 0.0
        )
        val radius2 = CatenaryCalculator.calculateRadius(
            chainLengthM = 140.0,
            depthM = 20.0,
            safetyMarginPercent = 0.0
        )

        assertNotNull(radius1)
        assertNotNull(radius2)
        // Radius should scale proportionally
        assertEquals(radius1!! * 2.0, radius2!!, 2.0)
    }
}
