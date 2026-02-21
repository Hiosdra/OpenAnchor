package com.hiosdra.openanchor.domain.geometry

import com.hiosdra.openanchor.domain.model.AnchorZone
import com.hiosdra.openanchor.domain.model.Position
import kotlin.math.*

object GeoCalculations {

    private const val EARTH_RADIUS_METERS = 6_371_000.0

    /**
     * Haversine distance between two positions in meters.
     */
    fun distanceMeters(from: Position, to: Position): Double {
        val lat1 = Math.toRadians(from.latitude)
        val lat2 = Math.toRadians(to.latitude)
        val dLat = Math.toRadians(to.latitude - from.latitude)
        val dLng = Math.toRadians(to.longitude - from.longitude)

        val a = sin(dLat / 2).pow(2) + cos(lat1) * cos(lat2) * sin(dLng / 2).pow(2)
        val c = 2 * atan2(sqrt(a), sqrt(1 - a))

        return EARTH_RADIUS_METERS * c
    }

    /**
     * Bearing from [from] to [to] in degrees (0 = north, clockwise).
     */
    fun bearingDegrees(from: Position, to: Position): Double {
        val lat1 = Math.toRadians(from.latitude)
        val lat2 = Math.toRadians(to.latitude)
        val dLng = Math.toRadians(to.longitude - from.longitude)

        val y = sin(dLng) * cos(lat2)
        val x = cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(dLng)

        return (Math.toDegrees(atan2(y, x)) + 360) % 360
    }

    /**
     * Returns the smallest angle difference between two bearings in degrees (0..180).
     */
    fun angleDifference(bearing1: Double, bearing2: Double): Double {
        val diff = abs(bearing1 - bearing2) % 360
        return if (diff > 180) 360 - diff else diff
    }

    /**
     * Check if a boat position is within the safe zone.
     */
    fun isInsideZone(boatPosition: Position, zone: AnchorZone): Boolean {
        return checkZone(boatPosition, zone) == ZoneCheckResult.INSIDE
    }

    /**
     * Check zone status with multi-level support (INSIDE / BUFFER / OUTSIDE).
     */
    fun checkZone(boatPosition: Position, zone: AnchorZone): ZoneCheckResult {
        return when (zone) {
            is AnchorZone.Circle -> {
                val distance = distanceMeters(boatPosition, zone.anchorPosition)
                when {
                    distance <= zone.radiusMeters -> ZoneCheckResult.INSIDE
                    zone.bufferRadiusMeters != null && distance <= zone.bufferRadiusMeters -> ZoneCheckResult.BUFFER
                    else -> ZoneCheckResult.OUTSIDE
                }
            }

            is AnchorZone.SectorWithCircle -> {
                val distance = distanceMeters(boatPosition, zone.anchorPosition)

                // Inside small circle = always safe
                if (distance <= zone.radiusMeters) return ZoneCheckResult.INSIDE

                // Inside sector = safe if within sector radius AND within sector angle
                if (distance <= zone.sectorRadiusMeters) {
                    val bearing = bearingDegrees(zone.anchorPosition, boatPosition)
                    val angleDiff = angleDifference(bearing, zone.sectorBearingDeg)
                    if (angleDiff <= zone.sectorHalfAngleDeg) return ZoneCheckResult.INSIDE
                }

                // Check buffer zone: buffer applies to the outermost boundary
                val bufferR = zone.bufferRadiusMeters
                if (bufferR != null) {
                    // Buffer for sector: use sectorRadiusMeters + buffer margin as outer limit
                    val sectorBufferRadius = zone.sectorRadiusMeters + (bufferR - zone.radiusMeters)
                    if (distance <= zone.radiusMeters + (bufferR - zone.radiusMeters)) {
                        // Inside the circle's buffer
                        return ZoneCheckResult.BUFFER
                    }
                    if (distance <= sectorBufferRadius) {
                        val bearing = bearingDegrees(zone.anchorPosition, boatPosition)
                        val angleDiff = angleDifference(bearing, zone.sectorBearingDeg)
                        if (angleDiff <= zone.sectorHalfAngleDeg) return ZoneCheckResult.BUFFER
                    }
                }

                ZoneCheckResult.OUTSIDE
            }
        }
    }

    /**
     * Compute a destination point given a start position, bearing (degrees), and distance (meters).
     */
    fun destinationPoint(from: Position, bearingDeg: Double, distanceMeters: Double): Position {
        val lat1 = Math.toRadians(from.latitude)
        val lng1 = Math.toRadians(from.longitude)
        val bearing = Math.toRadians(bearingDeg)
        val angularDist = distanceMeters / EARTH_RADIUS_METERS

        val lat2 = asin(
            sin(lat1) * cos(angularDist) + cos(lat1) * sin(angularDist) * cos(bearing)
        )
        val lng2 = lng1 + atan2(
            sin(bearing) * sin(angularDist) * cos(lat1),
            cos(angularDist) - sin(lat1) * sin(lat2)
        )

        return Position(
            latitude = Math.toDegrees(lat2),
            longitude = Math.toDegrees(lng2)
        )
    }
}
