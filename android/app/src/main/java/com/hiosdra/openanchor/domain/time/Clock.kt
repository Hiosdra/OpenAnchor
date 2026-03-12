package com.hiosdra.openanchor.domain.time

interface Clock {
    fun currentTimeMillis(): Long
}
