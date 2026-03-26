package com.hiosdra.openanchor.service

import com.hiosdra.openanchor.domain.drift.DriftAnalysis
import com.hiosdra.openanchor.domain.drift.DriftDetector
import com.hiosdra.openanchor.domain.geometry.GeoCalculations
import com.hiosdra.openanchor.domain.geometry.ZoneCheckResult
import com.hiosdra.openanchor.domain.model.*
import javax.inject.Inject
import javax.inject.Singleton

data class GpsProcessingResult(
    val distance: Double,
    val zoneCheckResult: ZoneCheckResult,
    val alarmState: AlarmState,
    val trackPoint: TrackPoint,
    val sog: Double?,
    val cog: Double?,
    val driftAnalysis: DriftAnalysis?,
    val maxDistance: Double,
    val maxSog: Double
)

@Singleton
class GpsProcessor @Inject constructor(
    private val alarmEngine: AlarmEngine,
    private val driftDetector: DriftDetector
) {
    private var previousPosition: Position? = null
    private var previousPositionTime: Long = 0L
    private var sessionMaxDistance: Double = 0.0
    private var sessionMaxSog: Double = 0.0
    private val recentTrackPoints = ArrayDeque<TrackPoint>(30)

    fun processPosition(
        position: Position,
        anchorPosition: Position,
        zone: AnchorZone,
        sessionId: Long
    ): GpsProcessingResult {
        val distance = GeoCalculations.distanceMeters(position, anchorPosition)
        val zoneResult = GeoCalculations.checkZone(position, zone, distance)
        val alarmState = alarmEngine.processReading(zoneResult)

        // Compute SOG and COG from consecutive positions
        var currentSog: Double? = null
        var currentCog: Double? = null
        val prevPos = previousPosition
        val prevTime = previousPositionTime
        if (prevPos != null && prevTime > 0L) {
            val dtSeconds = (position.timestamp - prevTime) / 1000.0
            if (dtSeconds > 0.5) {
                val distBetween = GeoCalculations.distanceMeters(prevPos, position)
                currentSog = distBetween / dtSeconds * 1.94384 // m/s -> knots
                currentCog = GeoCalculations.bearingDegrees(prevPos, position)
            }
        }
        previousPosition = position
        previousPositionTime = position.timestamp

        // Track session max values
        if (distance > sessionMaxDistance) sessionMaxDistance = distance
        if (currentSog != null && currentSog > sessionMaxSog) sessionMaxSog = currentSog

        // Create track point
        val trackPoint = TrackPoint(
            sessionId = sessionId,
            position = position,
            distanceToAnchor = distance.toFloat(),
            isAlarm = alarmState == AlarmState.ALARM,
            alarmState = alarmState.name
        )

        // Drift detection
        synchronized(recentTrackPoints) {
            recentTrackPoints.add(trackPoint)
            if (recentTrackPoints.size > 30) recentTrackPoints.removeFirst()
        }
        val trackPointsSnapshot = synchronized(recentTrackPoints) { recentTrackPoints.toList() }
        val driftAnalysis = driftDetector.analyze(trackPointsSnapshot, anchorPosition)

        return GpsProcessingResult(
            distance = distance,
            zoneCheckResult = zoneResult,
            alarmState = alarmState,
            trackPoint = trackPoint,
            sog = currentSog,
            cog = currentCog,
            driftAnalysis = driftAnalysis,
            maxDistance = sessionMaxDistance,
            maxSog = sessionMaxSog
        )
    }

    fun reset() {
        previousPosition = null
        previousPositionTime = 0L
        sessionMaxDistance = 0.0
        sessionMaxSog = 0.0
        synchronized(recentTrackPoints) {
            recentTrackPoints.clear()
        }
    }

    fun getSessionMaxDistance(): Double = sessionMaxDistance
    fun getSessionMaxSog(): Double = sessionMaxSog
}
