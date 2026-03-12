package com.hiosdra.openanchor.domain.time

class TestClock(private var time: Long = 0L) : Clock {
    override fun currentTimeMillis(): Long = time

    fun setTime(millis: Long) {
        time = millis
    }

    fun advanceTime(millis: Long) {
        time += millis
    }
}
