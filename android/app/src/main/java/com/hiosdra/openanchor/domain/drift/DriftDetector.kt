package com.hiosdra.openanchor.domain.drift

import com.hiosdra.openanchor.domain.geometry.GeoCalculations
import com.hiosdra.openanchor.domain.model.Position
import com.hiosdra.openanchor.domain.model.TrackPoint
import java.time.Clock
import javax.inject.Inject
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.sin

/**
 * Result of drift analysis on recent track points.
 */
data class DriftAnalysis(
    /** Whether an anchor drag is detected */
    val isDragging: Boolean = false,
    /** Consistent drift direction in degrees (0-360), null if no clear pattern */
    val driftBearingDeg: Double? = null,
    /** Drift speed in meters per minute */
    val driftSpeedMpm: Double = 0.0,
    /** How many consecutive readings show the drift pattern */
    val consistentReadings: Int = 0,
    /** Human-readable description */
    val description: String = ""
)

/**
 * Detects anchor drag by analyzing a pattern of consistent directional movement
 * away from the anchor point.
 *
 * Heuristic: If the last N track points show consistent movement in the same
 * direction (bearing spread < 45°) AND the distance from anchor is increasing,
 * flag as potential drag.
 *
 * Requires at least 5 track points within the last 5 minutes.
 */
class DriftDetector @Inject constructor(
    private val clock: Clock
) {

    companion object {
        /** Minimum track points needed for analysis */
        private const val MIN_POINTS = 5

        /** Maximum age of oldest point to consider (5 minutes) */
        private const val MAX_WINDOW_MS = 5 * 60 * 1000L

        /** Maximum bearing spread to be considered "consistent direction" */
        private const val MAX_BEARING_SPREAD_DEG = 45.0

        /** Minimum total drift distance to flag (meters) */
        private const val MIN_DRIFT_DISTANCE_M = 3.0

        /** Minimum consecutive increasing-distance readings */
        private const val MIN_INCREASING_READINGS = 4
    }

    /**
     * Analyze recent track points for anchor drag patterns.
     *
     * @param recentPoints track points sorted by timestamp ascending
     * @param anchorPosition the anchor's position
     * @return drift analysis result
     */
    fun analyze(recentPoints: List<TrackPoint>, anchorPosition: Position): DriftAnalysis {
        if (recentPoints.size < MIN_POINTS) {
            return DriftAnalysis(description = "Not enough data (${recentPoints.size}/$MIN_POINTS points)")
        }

        val now = clock.millis()
        // Filter to recent window
        val windowPoints = recentPoints.filter { (now - it.position.timestamp) <= MAX_WINDOW_MS }
        if (windowPoints.size < MIN_POINTS) {
            return DriftAnalysis(description = "Not enough recent data")
        }

        // Check for consistently increasing distance from anchor
        val distances = windowPoints.map { it.distanceToAnchor.toDouble() }
        var consecutiveIncreasing = 0
        var maxConsecutive = 0
        for (i in 1 until distances.size) {
            if (distances[i] > distances[i - 1]) {
                consecutiveIncreasing++
                if (consecutiveIncreasing > maxConsecutive) maxConsecutive = consecutiveIncreasing
            } else {
                consecutiveIncreasing = 0
            }
        }

        if (maxConsecutive < MIN_INCREASING_READINGS) {
            return DriftAnalysis(
                description = "No consistent distance increase ($maxConsecutive consecutive)"
            )
        }

        // Calculate movement bearings between consecutive points
        val bearings = mutableListOf<Double>()
        for (i in 1 until windowPoints.size) {
            val bearing = GeoCalculations.bearingDegrees(
                windowPoints[i - 1].position,
                windowPoints[i].position
            )
            bearings.add(bearing)
        }

        // Check bearing consistency using circular mean
        val meanBearing = circularMean(bearings)
        val bearingSpread = bearings.maxOf { angleDiff(it, meanBearing) }

        if (bearingSpread > MAX_BEARING_SPREAD_DEG) {
            return DriftAnalysis(
                description = "Movement direction inconsistent (spread: %.0f°)".format(bearingSpread)
            )
        }

        // Calculate total drift distance
        val totalDrift = GeoCalculations.distanceMeters(
            windowPoints.first().position,
            windowPoints.last().position
        )

        if (totalDrift < MIN_DRIFT_DISTANCE_M) {
            return DriftAnalysis(
                description = "Drift too small (%.1f m)".format(totalDrift)
            )
        }

        // Calculate drift speed
        val timeSpanMs = windowPoints.last().position.timestamp - windowPoints.first().position.timestamp
        val driftSpeedMpm = if (timeSpanMs > 0) {
            totalDrift / (timeSpanMs / 60000.0)
        } else 0.0

        return DriftAnalysis(
            isDragging = true,
            driftBearingDeg = meanBearing,
            driftSpeedMpm = driftSpeedMpm,
            consistentReadings = maxConsecutive,
            description = "Anchor drag detected! Direction: %.0f°, Speed: %.1f m/min".format(
                meanBearing, driftSpeedMpm
            )
        )
    }

    private fun circularMean(angles: List<Double>): Double {
        val sinSum = angles.sumOf { sin(Math.toRadians(it)) }
        val cosSum = angles.sumOf { cos(Math.toRadians(it)) }
        val mean = Math.toDegrees(kotlin.math.atan2(sinSum, cosSum))
        return (mean + 360) % 360
    }

    private fun angleDiff(a: Double, b: Double): Double {
        val diff = abs(a - b) % 360
        return if (diff > 180) 360 - diff else diff
    }
}
