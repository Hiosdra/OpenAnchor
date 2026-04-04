package com.hiosdra.openanchor.wear.data.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query

@Dao
interface WearTrackPointDao {

    @Insert
    suspend fun insert(point: WearTrackPointEntity)

    @Query("SELECT * FROM track_points ORDER BY timestamp DESC LIMIT :count")
    suspend fun getLastPoints(count: Int): List<WearTrackPointEntity>

    @Query("SELECT COUNT(*) FROM track_points")
    suspend fun count(): Int

    @Query(
        """DELETE FROM track_points WHERE id NOT IN 
           (SELECT id FROM track_points ORDER BY timestamp DESC LIMIT :maxCount)"""
    )
    suspend fun trimToMaxCount(maxCount: Int)
}
