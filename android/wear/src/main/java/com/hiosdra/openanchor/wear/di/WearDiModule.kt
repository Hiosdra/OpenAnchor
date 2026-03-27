package com.hiosdra.openanchor.wear.di

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.preferencesDataStoreFile
import androidx.room.Room
import com.hiosdra.openanchor.wear.data.db.WearConnectionHistoryDao
import com.hiosdra.openanchor.wear.data.db.WearDatabase
import com.hiosdra.openanchor.wear.data.db.WearStateDao
import com.hiosdra.openanchor.wear.data.db.WearTrackPointDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object WearDiModule {

    @Provides
    @Singleton
    fun provideWearDatabase(@ApplicationContext context: Context): WearDatabase {
        return Room.databaseBuilder(
            context,
            WearDatabase::class.java,
            "wear_database"
        ).build()
    }

    @Provides
    fun provideStateDao(db: WearDatabase): WearStateDao = db.stateDao()

    @Provides
    fun provideTrackPointDao(db: WearDatabase): WearTrackPointDao = db.trackPointDao()

    @Provides
    fun provideConnectionHistoryDao(db: WearDatabase): WearConnectionHistoryDao =
        db.connectionHistoryDao()

    @Provides
    @Singleton
    fun provideDataStore(@ApplicationContext context: Context): DataStore<Preferences> {
        return PreferenceDataStoreFactory.create {
            context.preferencesDataStoreFile("wear_settings")
        }
    }
}
