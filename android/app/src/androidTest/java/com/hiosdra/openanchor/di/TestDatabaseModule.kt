package com.hiosdra.openanchor.di

import android.content.Context
import androidx.room.Room
import com.hiosdra.openanchor.data.db.AnchorSessionDao
import com.hiosdra.openanchor.data.db.LogbookEntryDao
import com.hiosdra.openanchor.data.db.OpenAnchorDatabase
import com.hiosdra.openanchor.data.db.TrackPointDao
import dagger.Module
import dagger.Provides
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import dagger.hilt.testing.TestInstallIn
import javax.inject.Singleton

@Module
@TestInstallIn(
    components = [SingletonComponent::class],
    replaces = [DatabaseModule::class]
)
object TestDatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): OpenAnchorDatabase {
        return Room.inMemoryDatabaseBuilder(
            context,
            OpenAnchorDatabase::class.java,
        ).allowMainThreadQueries().build()
    }

    @Provides
    fun provideAnchorSessionDao(db: OpenAnchorDatabase): AnchorSessionDao {
        return db.anchorSessionDao()
    }

    @Provides
    fun provideTrackPointDao(db: OpenAnchorDatabase): TrackPointDao {
        return db.trackPointDao()
    }

    @Provides
    fun provideLogbookEntryDao(db: OpenAnchorDatabase): LogbookEntryDao {
        return db.logbookEntryDao()
    }
}
