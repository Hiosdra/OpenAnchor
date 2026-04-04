package com.hiosdra.openanchor.data.repository

import com.hiosdra.openanchor.data.db.LogbookEntryDao
import com.hiosdra.openanchor.data.db.toDomain
import com.hiosdra.openanchor.data.db.toEntity
import com.hiosdra.openanchor.domain.model.LogbookEntry
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class LogbookRepository @Inject constructor(
    private val logbookDao: LogbookEntryDao
) {
    fun observeAllEntries(): Flow<List<LogbookEntry>> =
        logbookDao.getAllEntries().map { list -> list.map { it.toDomain() } }

    fun observeEntryForSession(sessionId: Long): Flow<LogbookEntry?> =
        logbookDao.observeEntryForSession(sessionId).map { it?.toDomain() }

    suspend fun getEntryForSession(sessionId: Long): LogbookEntry? =
        logbookDao.getEntryForSession(sessionId)?.toDomain()

    suspend fun insertEntry(entry: LogbookEntry): Long =
        logbookDao.insert(entry.toEntity())

    suspend fun updateEntry(entry: LogbookEntry) {
        logbookDao.update(entry.toEntity())
    }

    suspend fun deleteEntry(id: Long) {
        logbookDao.deleteEntry(id)
    }

    suspend fun getEntryCount(): Int =
        logbookDao.getEntryCount()
}
