package com.hiosdra.openanchor.data.db

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

val MIGRATION_1_2 = object : Migration(1, 2) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("ALTER TABLE anchor_sessions ADD COLUMN bufferRadiusMeters REAL DEFAULT NULL")
    }
}

val MIGRATION_2_3 = object : Migration(2, 3) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("""
            CREATE TABLE IF NOT EXISTS logbook_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                sessionId INTEGER NOT NULL,
                createdAt INTEGER NOT NULL,
                summary TEXT NOT NULL,
                logEntry TEXT NOT NULL,
                safetyNote TEXT NOT NULL,
                isAiGenerated INTEGER NOT NULL DEFAULT 1,
                FOREIGN KEY (sessionId) REFERENCES anchor_sessions(id) ON DELETE CASCADE
            )
        """.trimIndent())
        db.execSQL("CREATE INDEX IF NOT EXISTS index_logbook_entries_sessionId ON logbook_entries(sessionId)")
    }
}

val MIGRATION_3_4 = object : Migration(3, 4) {
    override fun migrate(db: SupportSQLiteDatabase) {
        // 5.1a: Add alarmState to track_points (unified with PWA format)
        db.execSQL("ALTER TABLE track_points ADD COLUMN alarmState TEXT NOT NULL DEFAULT 'SAFE'")
        // 5.1b: Add maxDistance/maxSog to anchor_sessions (unified with PWA format)
        db.execSQL("ALTER TABLE anchor_sessions ADD COLUMN maxDistanceMeters REAL NOT NULL DEFAULT 0.0")
        db.execSQL("ALTER TABLE anchor_sessions ADD COLUMN maxSog REAL NOT NULL DEFAULT 0.0")
    }
}

@Database(
    entities = [
        AnchorSessionEntity::class,
        TrackPointEntity::class,
        LogbookEntryEntity::class
    ],
    version = 4,
    exportSchema = true
)
abstract class OpenAnchorDatabase : RoomDatabase() {
    abstract fun anchorSessionDao(): AnchorSessionDao
    abstract fun trackPointDao(): TrackPointDao
    abstract fun logbookEntryDao(): LogbookEntryDao
}
