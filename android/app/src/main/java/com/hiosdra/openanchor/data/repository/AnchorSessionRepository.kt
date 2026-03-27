package com.hiosdra.openanchor.data.repository

import com.hiosdra.openanchor.domain.model.AnchorSession
import com.hiosdra.openanchor.domain.model.TrackPoint
import kotlinx.coroutines.flow.Flow

/**
 * Abstraction over anchor session persistence.
 *
 * ViewModels and services should depend on this interface rather than the
 * concrete [RoomAnchorSessionRepository] implementation, enabling easier
 * testing and potential future backend swaps (e.g., cloud sync).
 */
interface AnchorSessionRepository {

    // ── Session queries ─────────────────────────────────────────────

    fun observeAllSessions(): Flow<List<AnchorSession>>
    fun observeActiveSession(): Flow<AnchorSession?>
    fun observeSession(id: Long): Flow<AnchorSession?>
    suspend fun getSessionById(id: Long): AnchorSession?
    suspend fun getActiveSession(): AnchorSession?

    // ── Session mutations ───────────────────────────────────────────

    suspend fun insertSession(session: AnchorSession): Long
    suspend fun updateSession(session: AnchorSession)
    suspend fun deleteSession(id: Long)

    // ── Track point queries ─────────────────────────────────────────

    fun observeTrackPoints(sessionId: Long): Flow<List<TrackPoint>>
    fun observeRecentTrackPoints(sessionId: Long, limit: Int = 500): Flow<List<TrackPoint>>
    suspend fun getTrackPointsOnce(sessionId: Long): List<TrackPoint>
    suspend fun getTrackPointCount(sessionId: Long): Int

    // ── Track point mutations ───────────────────────────────────────

    suspend fun insertTrackPoint(trackPoint: TrackPoint)

    // ── Statistics ──────────────────────────────────────────────────

    suspend fun getCompletedSessionCount(): Int
    suspend fun getTotalAlarmCount(): Int
    suspend fun getTotalAnchoredMillis(): Long
    suspend fun getLongestSessionMillis(): Long
    suspend fun getAverageSessionMillis(): Long
    suspend fun getMaxRadiusUsed(): Double
    suspend fun getAverageRadius(): Double
}
