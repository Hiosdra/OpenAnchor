package com.hiosdra.openanchor.data.backup

import com.hiosdra.openanchor.domain.model.AnchorSession
import com.hiosdra.openanchor.domain.model.TrackPoint
import com.hiosdra.openanchor.domain.result.AppResult

/**
 * Cloud backup manager interface for remote session storage.
 *
 * TODO: Implement concrete cloud backup provider. Candidates:
 *   - Google Drive API (user's personal Drive)
 *   - Firebase Cloud Firestore (shared backend)
 *   - Custom REST API with S3/GCS storage
 *
 * Responsibilities:
 *   1. Export all completed sessions + track points to cloud storage
 *   2. Import/restore sessions from cloud to local Room database
 *   3. Incremental sync — only upload sessions modified since last sync
 *   4. Conflict resolution — local wins (last-write-wins) for simplicity
 *   5. Progress reporting via Flow for UI integration
 *
 * Security requirements:
 *   - All data must be encrypted in transit (HTTPS) and at rest
 *   - User authentication required before any cloud operation
 *   - Session data contains GPS coordinates — handle as PII
 */
interface CloudBackupManager {

    /**
     * Check if cloud backup is configured and authenticated.
     */
    suspend fun isConfigured(): Boolean

    /**
     * Upload all sessions not yet backed up.
     * @return number of sessions uploaded, or failure
     */
    suspend fun backupAll(): AppResult<Int>

    /**
     * Upload a single session with its track points.
     */
    suspend fun backupSession(session: AnchorSession, trackPoints: List<TrackPoint>): AppResult<Unit>

    /**
     * Restore all sessions from cloud to local database.
     * @return number of sessions restored, or failure
     */
    suspend fun restoreAll(): AppResult<Int>

    /**
     * Get the timestamp of the last successful backup.
     */
    suspend fun lastBackupTime(): Long?
}
