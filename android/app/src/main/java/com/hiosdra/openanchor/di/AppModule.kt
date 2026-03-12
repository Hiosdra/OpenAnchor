package com.hiosdra.openanchor.di

import com.hiosdra.openanchor.domain.time.Clock
import com.hiosdra.openanchor.domain.time.SystemClock
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class AppModule {

    @Binds
    @Singleton
    abstract fun bindClock(systemClock: SystemClock): Clock
}
