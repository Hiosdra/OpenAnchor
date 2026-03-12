package com.hiosdra.openanchor.domain.time

import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SystemClock @Inject constructor() : Clock {
    override fun currentTimeMillis(): Long {
        return System.currentTimeMillis()
    }
}
