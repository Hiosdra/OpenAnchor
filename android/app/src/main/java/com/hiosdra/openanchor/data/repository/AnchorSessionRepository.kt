package com.hiosdra.openanchor.data.repository

import com.hiosdra.openanchor.data.db.AnchorSessionDao
import com.hiosdra.openanchor.data.db.TrackPointDao
import com.hiosdra.openanchor.data.db.toDomain
import com.hiosdra.openanchor.data.db.toEntity
import com.hiosdra.openanchor.domain.model.AnchorSession
import com.hiosdra.openanchor.domain.model.TrackPoint
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Single source of truth for anchor session and track point data.
 * Wraps Room DAOs and handles entity ↔ domain mapping.
 */
@Singleton
class AnchorSessionRepository @Inject constructor(
    private val sessionDao: AnchorSessionDao,
    private val trackPointDao: TrackPointDao
) : IAnchorSessionRepository {
    // ── Session queries ─────────────────────────────────────────────

    override fun observeAllSessions(): Flow<List<AnchorSession>> =
        sessionDao.getAllSessions().map { list -> list.map { it.toDomain() } }

    override fun observeActiveSession(): Flow<AnchorSession?> =
        sessionDao.observeActiveSession().map { it?.toDomain() }

    override fun observeSession(id: Long): Flow<AnchorSession?> =
        sessionDao.observeSession(id).map { it?.toDomain() }

    override suspend fun getSessionById(id: Long): AnchorSession? =
        sessionDao.getSessionById(id)?.toDomain()

    override suspend fun getActiveSession(): AnchorSession? =
        sessionDao.getActiveSession()?.toDomain()

    // ── Session mutations ───────────────────────────────────────────

    override suspend fun insertSession(session: AnchorSession): Long =
        sessionDao.insert(session.toEntity())

    override suspend fun updateSession(session: AnchorSession) {
        sessionDao.update(session.toEntity())
    }

    override suspend fun deleteSession(id: Long) {
        sessionDao.deleteSession(id)
    }

    // ── Track point queries ─────────────────────────────────────────

    override fun observeTrackPoints(sessionId: Long): Flow<List<TrackPoint>> =
        trackPointDao.getTrackPointsForSession(sessionId).map { list -> list.map { it.toDomain() } }

    override suspend fun getTrackPointsOnce(sessionId: Long): List<TrackPoint> =
        trackPointDao.getTrackPointsForSessionOnce(sessionId).map { it.toDomain() }

    override suspend fun getTrackPointCount(sessionId: Long): Int =
        trackPointDao.getTrackPointCount(sessionId)

    // ── Track point mutations ───────────────────────────────────────

    override suspend fun insertTrackPoint(trackPoint: TrackPoint) {
        trackPointDao.insert(trackPoint.toEntity())
    }

    // ── Statistics (aggregate queries) ──────────────────────────────

    override suspend fun getCompletedSessionCount(): Int =
        sessionDao.getCompletedSessionCount()

    override suspend fun getTotalAlarmCount(): Int =
        sessionDao.getTotalAlarmCount()

    override suspend fun getTotalAnchoredMillis(): Long =
        sessionDao.getTotalAnchoredMillis()

    override suspend fun getLongestSessionMillis(): Long =
        sessionDao.getLongestSessionMillis()

    override suspend fun getAverageSessionMillis(): Long =
        sessionDao.getAverageSessionMillis()

    override suspend fun getMaxRadiusUsed(): Double =
        sessionDao.getMaxRadiusUsed()

    override suspend fun getAverageRadius(): Double =
        sessionDao.getAverageRadius()
}
