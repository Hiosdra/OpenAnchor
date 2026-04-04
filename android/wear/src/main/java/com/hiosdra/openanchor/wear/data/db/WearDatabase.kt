package com.hiosdra.openanchor.wear.data.db

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(
    entities = [
        WearCachedStateEntity::class,
        WearTrackPointEntity::class,
        WearConnectionHistoryEntity::class
    ],
    version = 1,
    exportSchema = true
)
abstract class WearDatabase : RoomDatabase() {
    abstract fun stateDao(): WearStateDao
    abstract fun trackPointDao(): WearTrackPointDao
    abstract fun connectionHistoryDao(): WearConnectionHistoryDao
}
