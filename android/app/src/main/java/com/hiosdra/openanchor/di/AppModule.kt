package com.hiosdra.openanchor.di

import com.hiosdra.openanchor.service.ServiceBinder
import com.hiosdra.openanchor.service.ServiceBinderApi
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import java.time.Clock
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideClock(): Clock = Clock.systemDefaultZone()
}

@Module
@InstallIn(SingletonComponent::class)
abstract class ServiceBindingsModule {
    @Binds
    @Singleton
    abstract fun bindServiceBinder(impl: ServiceBinder): ServiceBinderApi
}
