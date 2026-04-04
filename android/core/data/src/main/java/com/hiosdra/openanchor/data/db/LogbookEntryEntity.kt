package com.hiosdra.openanchor.data.db

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "logbook_entries",
    foreignKeys = [
        ForeignKey(
            entity = AnchorSessionEntity::class,
            parentColumns = ["id"],
            childColumns = ["sessionId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index("sessionId")]
)
data class LogbookEntryEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val sessionId: Long,
    val createdAt: Long = System.currentTimeMillis(),
    val summary: String,       // One-line summary
    val logEntry: String,      // Detailed log text
    val safetyNote: String,    // Safety assessment
    val isAiGenerated: Boolean = true
)
