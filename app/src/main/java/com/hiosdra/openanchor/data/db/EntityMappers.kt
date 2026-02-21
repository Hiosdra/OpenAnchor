package com.hiosdra.openanchor.data.db

import com.hiosdra.openanchor.domain.model.*

fun AnchorSessionEntity.toDomain(): AnchorSession {
    val anchorPos = Position(latitude = anchorLat, longitude = anchorLng)
    val zone: AnchorZone = when (zoneType) {
        "SECTOR" -> AnchorZone.SectorWithCircle(
            anchorPosition = anchorPos,
            radiusMeters = radiusMeters,
            bufferRadiusMeters = bufferRadiusMeters,
            sectorRadiusMeters = sectorRadiusMeters ?: radiusMeters,
            sectorHalfAngleDeg = sectorHalfAngleDeg ?: 60.0,
            sectorBearingDeg = sectorBearingDeg ?: 0.0
        )
        else -> AnchorZone.Circle(
            anchorPosition = anchorPos,
            radiusMeters = radiusMeters,
            bufferRadiusMeters = bufferRadiusMeters
        )
    }
    return AnchorSession(
        id = id,
        anchorPosition = anchorPos,
        zone = zone,
        startTime = startTime,
        endTime = endTime,
        chainLengthM = chainLengthM,
        depthM = depthM,
        alarmTriggered = alarmTriggered,
        alarmCount = alarmCount
    )
}

fun AnchorSession.toEntity(): AnchorSessionEntity {
    val zoneTypeStr: String
    val sectorRadius: Double?
    val sectorAngle: Double?
    val sectorBearing: Double?

    when (zone) {
        is AnchorZone.Circle -> {
            zoneTypeStr = "CIRCLE"
            sectorRadius = null
            sectorAngle = null
            sectorBearing = null
        }
        is AnchorZone.SectorWithCircle -> {
            zoneTypeStr = "SECTOR"
            sectorRadius = zone.sectorRadiusMeters
            sectorAngle = zone.sectorHalfAngleDeg
            sectorBearing = zone.sectorBearingDeg
        }
    }

    return AnchorSessionEntity(
        id = id,
        anchorLat = anchorPosition.latitude,
        anchorLng = anchorPosition.longitude,
        startTime = startTime,
        endTime = endTime,
        zoneType = zoneTypeStr,
        radiusMeters = zone.radiusMeters,
        bufferRadiusMeters = zone.bufferRadiusMeters,
        sectorRadiusMeters = sectorRadius,
        sectorHalfAngleDeg = sectorAngle,
        sectorBearingDeg = sectorBearing,
        chainLengthM = chainLengthM,
        depthM = depthM,
        alarmTriggered = alarmTriggered,
        alarmCount = alarmCount
    )
}

fun TrackPointEntity.toDomain(): TrackPoint {
    return TrackPoint(
        id = id,
        sessionId = sessionId,
        position = Position(
            latitude = lat,
            longitude = lng,
            accuracy = accuracy,
            timestamp = timestamp
        ),
        distanceToAnchor = distanceToAnchor,
        isAlarm = isAlarm
    )
}

fun TrackPoint.toEntity(): TrackPointEntity {
    return TrackPointEntity(
        id = id,
        sessionId = sessionId,
        lat = position.latitude,
        lng = position.longitude,
        accuracy = position.accuracy,
        timestamp = position.timestamp,
        distanceToAnchor = distanceToAnchor,
        isAlarm = isAlarm
    )
}
