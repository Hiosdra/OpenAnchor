package com.hiosdra.openanchor.domain.model

/**
 * Domain model for AI-generated logbook entries.
 */
data class LogbookEntry(
    val id: Long = 0,
    val sessionId: Long,
    val createdAt: Long = System.currentTimeMillis(),
    val summary: String,
    val logEntry: String,
    val safetyNote: String,
    val isAiGenerated: Boolean = true
)
