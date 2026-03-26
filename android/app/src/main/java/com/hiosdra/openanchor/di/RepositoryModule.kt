package com.hiosdra.openanchor.di

import com.hiosdra.openanchor.data.repository.AnchorSessionRepository
import com.hiosdra.openanchor.data.repository.RoomAnchorSessionRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    @Binds
    @Singleton
    abstract fun bindAnchorSessionRepository(
        impl: RoomAnchorSessionRepository
    ): AnchorSessionRepository
}
