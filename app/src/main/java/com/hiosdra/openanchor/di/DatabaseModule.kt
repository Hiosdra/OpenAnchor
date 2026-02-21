package com.hiosdra.openanchor.di

import android.content.Context
import androidx.room.Room
import com.hiosdra.openanchor.data.db.AnchorSessionDao
import com.hiosdra.openanchor.data.db.MIGRATION_1_2
import com.hiosdra.openanchor.data.db.OpenAnchorDatabase
import com.hiosdra.openanchor.data.db.TrackPointDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): OpenAnchorDatabase {
        return Room.databaseBuilder(
            context,
            OpenAnchorDatabase::class.java,
            "openanchor.db"
        )
            .addMigrations(MIGRATION_1_2)
            .build()
    }

    @Provides
    fun provideAnchorSessionDao(db: OpenAnchorDatabase): AnchorSessionDao {
        return db.anchorSessionDao()
    }

    @Provides
    fun provideTrackPointDao(db: OpenAnchorDatabase): TrackPointDao {
        return db.trackPointDao()
    }
}
