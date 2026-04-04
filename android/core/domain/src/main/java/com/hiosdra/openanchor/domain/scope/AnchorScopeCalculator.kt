package com.hiosdra.openanchor.domain.scope

import com.hiosdra.openanchor.domain.catenary.CatenaryCalculator
import javax.inject.Inject

/**
 * Domain-level calculator for anchor scope (chain length / radius) decisions.
 *
 * Encapsulates the business logic that was previously mixed into SetupViewModel,
 * making it testable and reusable across different UI entry points.
 */
class AnchorScopeCalculator @Inject constructor() {

    data class ScopeResult(
        val recommendedChainLength: Double,
        val calculatedRadius: Double?
    )

    /**
     * Calculate recommended chain length for the given depth and scope ratio.
     *
     * @param depthM water depth in meters
     * @param scopeRatio desired scope ratio (e.g. 7.0 for 7:1)
     * @return recommended chain length in meters
     */
    fun recommendedChainLength(depthM: Double, scopeRatio: Double): Double {
        return CatenaryCalculator.recommendedChainLength(depthM, scopeRatio)
    }

    /**
     * Calculate the swing radius from chain length and depth.
     *
     * @param chainLengthM total chain deployed in meters
     * @param depthM water depth in meters
     * @return horizontal radius in meters, or null if chain is too short
     */
    fun calculateRadius(chainLengthM: Double, depthM: Double): Double? {
        return CatenaryCalculator.calculateRadius(chainLengthM, depthM)
    }

    /**
     * Auto-fill chain length and compute radius in a single step.
     *
     * @param depthM water depth in meters
     * @param scopeRatio desired scope ratio
     * @return ScopeResult with recommended chain and computed radius
     */
    fun computeScope(depthM: Double, scopeRatio: Double): ScopeResult {
        val chain = recommendedChainLength(depthM, scopeRatio)
        val radius = calculateRadius(chain, depthM)
        return ScopeResult(recommendedChainLength = chain, calculatedRadius = radius)
    }
}
