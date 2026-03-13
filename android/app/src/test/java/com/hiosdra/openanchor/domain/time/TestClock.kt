package com.hiosdra.openanchor.domain.time

import java.time.Clock
import java.time.Instant
import java.time.ZoneId

/**
 * A mutable Clock implementation for testing that allows controlling time.
 * Extends java.time.Clock to be compatible with standard Java time APIs.
 */
class TestClock(private var millis: Long = 0L) : Clock() {

    override fun instant(): Instant = Instant.ofEpochMilli(millis)

    override fun getZone(): ZoneId = ZoneId.systemDefault()

    override fun withZone(zone: ZoneId): Clock = this

    fun setTime(newMillis: Long) {
        millis = newMillis
    }

    fun advanceTime(deltaMillis: Long) {
        millis += deltaMillis
    }
}
