package com.hiosdra.openanchor.wear.data.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query

@Dao
interface WearConnectionHistoryDao {

    @Insert
    suspend fun insert(entry: WearConnectionHistoryEntity)

    @Query("SELECT * FROM connection_history ORDER BY connectedAt DESC LIMIT :count")
    suspend fun getRecent(count: Int): List<WearConnectionHistoryEntity>

    @Query("UPDATE connection_history SET disconnectedAt = :timestamp WHERE id = :id")
    suspend fun updateDisconnectTime(id: Long, timestamp: Long)

    @Query("SELECT * FROM connection_history WHERE disconnectedAt IS NULL ORDER BY connectedAt DESC LIMIT 1")
    suspend fun getActiveConnection(): WearConnectionHistoryEntity?
}
