package com.hiosdra.openanchor.wear.data.db

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert

@Dao
interface WearStateDao {

    @Upsert
    suspend fun upsert(state: WearCachedStateEntity)

    @Query("SELECT * FROM cached_monitor_state WHERE id = 1")
    suspend fun getLastState(): WearCachedStateEntity?
}
