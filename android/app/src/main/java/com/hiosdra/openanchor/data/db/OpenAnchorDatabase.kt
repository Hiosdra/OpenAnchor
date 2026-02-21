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

@Database(
    entities = [
        AnchorSessionEntity::class,
        TrackPointEntity::class
    ],
    version = 2,
    exportSchema = true
)
abstract class OpenAnchorDatabase : RoomDatabase() {
    abstract fun anchorSessionDao(): AnchorSessionDao
    abstract fun trackPointDao(): TrackPointDao
}
