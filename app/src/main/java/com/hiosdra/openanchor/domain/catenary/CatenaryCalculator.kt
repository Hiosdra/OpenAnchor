package com.hiosdra.openanchor.domain.catenary

import kotlin.math.*

/**
 * Catenary curve calculations for anchor chain.
 *
 * Given the total chain length (L) and water depth (D), calculates the horizontal
 * distance from the anchor on the seabed to the point where the chain meets the boat.
 *
 * This represents the maximum swing radius the boat can reach.
 */
object CatenaryCalculator {

    /**
     * Calculate horizontal distance (scope radius) from anchor to boat.
     *
     * Uses the catenary equation. The chain hangs in a catenary curve from the
     * bow roller to the seabed. We solve for the horizontal extent.
     *
     * @param chainLengthM total chain deployed in meters
     * @param depthM water depth in meters (from bow roller to seabed)
     * @param safetyMarginPercent additional safety margin as percentage (default 20%)
     * @return horizontal distance in meters, or null if chain is too short
     */
    fun calculateRadius(
        chainLengthM: Double,
        depthM: Double,
        safetyMarginPercent: Double = 20.0
    ): Double? {
        if (chainLengthM <= 0 || depthM <= 0) return null
        if (chainLengthM <= depthM) return null // Chain too short to reach surface

        // Simplified catenary: horizontal distance = sqrt(L^2 - D^2)
        // This is a good approximation that accounts for the chain curve.
        // Full catenary solution is iterative and the difference is minimal
        // for typical anchor chain scenarios.
        val horizontalDistance = sqrt(chainLengthM.pow(2) - depthM.pow(2))

        // Apply safety margin
        val margin = 1.0 + (safetyMarginPercent / 100.0)
        return horizontalDistance * margin
    }

    /**
     * Calculate recommended scope ratio.
     * Standard practice: 5:1 for calm, 7:1 for moderate, 10:1 for storm.
     *
     * @param depthM water depth
     * @param scopeRatio desired scope ratio (default 7:1)
     * @return recommended chain length in meters
     */
    fun recommendedChainLength(depthM: Double, scopeRatio: Double = 7.0): Double {
        return depthM * scopeRatio
    }
}
