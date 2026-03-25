package com.hiosdra.openanchor.di

import dagger.Module
import dagger.Provides
import dagger.hilt.components.SingletonComponent
import dagger.hilt.testing.TestInstallIn
import java.time.Clock
import java.time.Instant
import java.time.ZoneId
import javax.inject.Singleton

@Module
@TestInstallIn(
    components = [SingletonComponent::class],
    replaces = [AppModule::class]
)
object TestAppModule {
    @Provides
    @Singleton
    fun provideClock(): Clock = Clock.fixed(Instant.parse("2024-01-15T12:00:00Z"), ZoneId.of("UTC"))
}
