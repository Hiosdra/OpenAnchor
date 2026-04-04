package com.hiosdra.openanchor.data.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface AnchorSessionDao {

    @Insert
    suspend fun insert(session: AnchorSessionEntity): Long

    @Update
    suspend fun update(session: AnchorSessionEntity)

    @Query("SELECT * FROM anchor_sessions ORDER BY startTime DESC")
    fun getAllSessions(): Flow<List<AnchorSessionEntity>>

    @Query("SELECT * FROM anchor_sessions WHERE id = :id")
    suspend fun getSessionById(id: Long): AnchorSessionEntity?

    @Query("SELECT * FROM anchor_sessions WHERE id = :id")
    fun observeSession(id: Long): Flow<AnchorSessionEntity?>

    @Query("SELECT * FROM anchor_sessions WHERE endTime IS NULL LIMIT 1")
    suspend fun getActiveSession(): AnchorSessionEntity?

    @Query("SELECT * FROM anchor_sessions WHERE endTime IS NULL LIMIT 1")
    fun observeActiveSession(): Flow<AnchorSessionEntity?>

    @Transaction
    @Query("DELETE FROM anchor_sessions WHERE id = :id")
    suspend fun deleteSession(id: Long)

    // --- Statistics aggregate queries ---

    @Query("SELECT COUNT(*) FROM anchor_sessions WHERE endTime IS NOT NULL")
    suspend fun getCompletedSessionCount(): Int

    @Query("SELECT COALESCE(SUM(alarmCount), 0) FROM anchor_sessions")
    suspend fun getTotalAlarmCount(): Int

    @Query("SELECT COALESCE(SUM(endTime - startTime), 0) FROM anchor_sessions WHERE endTime IS NOT NULL")
    suspend fun getTotalAnchoredMillis(): Long

    @Query("SELECT COALESCE(MAX(endTime - startTime), 0) FROM anchor_sessions WHERE endTime IS NOT NULL")
    suspend fun getLongestSessionMillis(): Long

    @Query("SELECT COALESCE(AVG(endTime - startTime), 0) FROM anchor_sessions WHERE endTime IS NOT NULL")
    suspend fun getAverageSessionMillis(): Long

    @Query("SELECT COALESCE(MAX(radiusMeters), 0) FROM anchor_sessions")
    suspend fun getMaxRadiusUsed(): Double

    @Query("SELECT COALESCE(AVG(radiusMeters), 0) FROM anchor_sessions WHERE endTime IS NOT NULL")
    suspend fun getAverageRadius(): Double
}
