package com.hiosdra.openanchor.data.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface TrackPointDao {

    @Insert
    suspend fun insert(trackPoint: TrackPointEntity)

    @Insert
    suspend fun insertAll(trackPoints: List<TrackPointEntity>)

    @Query("SELECT * FROM track_points WHERE sessionId = :sessionId ORDER BY timestamp ASC")
    fun getTrackPointsForSession(sessionId: Long): Flow<List<TrackPointEntity>>

    @Query("SELECT * FROM track_points WHERE sessionId = :sessionId ORDER BY timestamp ASC")
    suspend fun getTrackPointsForSessionOnce(sessionId: Long): List<TrackPointEntity>

    @Query("SELECT * FROM track_points WHERE sessionId = :sessionId ORDER BY timestamp DESC LIMIT 1")
    suspend fun getLastTrackPoint(sessionId: Long): TrackPointEntity?

    @Query("SELECT COUNT(*) FROM track_points WHERE sessionId = :sessionId")
    suspend fun getTrackPointCount(sessionId: Long): Int

    @Query("DELETE FROM track_points WHERE sessionId = :sessionId")
    suspend fun deleteTrackPointsForSession(sessionId: Long)
}
