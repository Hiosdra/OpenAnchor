package com.hiosdra.openanchor.data.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface LogbookEntryDao {

    @Insert
    suspend fun insert(entry: LogbookEntryEntity): Long

    @Update
    suspend fun update(entry: LogbookEntryEntity)

    @Query("SELECT * FROM logbook_entries ORDER BY createdAt DESC")
    fun getAllEntries(): Flow<List<LogbookEntryEntity>>

    @Query("SELECT * FROM logbook_entries WHERE sessionId = :sessionId")
    suspend fun getEntryForSession(sessionId: Long): LogbookEntryEntity?

    @Query("SELECT * FROM logbook_entries WHERE sessionId = :sessionId")
    fun observeEntryForSession(sessionId: Long): Flow<LogbookEntryEntity?>

    @Query("SELECT * FROM logbook_entries WHERE id = :id")
    suspend fun getEntryById(id: Long): LogbookEntryEntity?

    @Query("DELETE FROM logbook_entries WHERE id = :id")
    suspend fun deleteEntry(id: Long)

    @Query("SELECT COUNT(*) FROM logbook_entries")
    suspend fun getEntryCount(): Int
}
