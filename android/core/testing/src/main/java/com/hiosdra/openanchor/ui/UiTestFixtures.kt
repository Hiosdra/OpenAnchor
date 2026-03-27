package com.hiosdra.openanchor.ui

import com.hiosdra.openanchor.domain.model.AlarmState
import com.hiosdra.openanchor.domain.model.AnchorSession
import com.hiosdra.openanchor.domain.model.AnchorZone
import com.hiosdra.openanchor.domain.model.Position
import com.hiosdra.openanchor.domain.model.TrackPoint
import com.hiosdra.openanchor.network.AndroidGpsReportPayload
import com.hiosdra.openanchor.network.LatLng

internal fun samplePosition(
    latitude: Double = 54.0,
    longitude: Double = 18.0,
    accuracy: Float = 5f
) = Position(latitude = latitude, longitude = longitude, accuracy = accuracy, timestamp = 1L)

internal fun sampleZone() = AnchorZone.Circle(
    anchorPosition = samplePosition(),
    radiusMeters = 35.0,
    bufferRadiusMeters = 50.0
)

internal fun sampleSession(
    id: Long = 1L,
    alarmTriggered: Boolean = false
) = AnchorSession(
    id = id,
    anchorPosition = samplePosition(),
    zone = sampleZone(),
    startTime = 1_700_000_000_000L,
    endTime = 1_700_003_600_000L,
    alarmTriggered = alarmTriggered,
    alarmCount = if (alarmTriggered) 1 else 0
)

internal fun sampleTrackPoint(sessionId: Long = 1L, isAlarm: Boolean = false) = TrackPoint(
    id = 1L,
    sessionId = sessionId,
    position = samplePosition(54.01, 18.01),
    distanceToAnchor = 20f,
    isAlarm = isAlarm,
    alarmState = if (isAlarm) AlarmState.ALARM.name else AlarmState.SAFE.name
)

internal fun sampleServerGpsReport() = AndroidGpsReportPayload(
    pos = LatLng(54.01, 18.01),
    accuracy = 4.5f,
    distanceToAnchor = 22.0,
    zoneCheckResult = "INSIDE",
    alarmState = AlarmState.SAFE.name,
    batteryLevel = 87,
    isCharging = true,
    driftDetected = true,
    driftBearingDeg = 180.0,
    driftSpeedMps = 0.6
)
