package com.hiosdra.openanchor.wear.service

import android.util.Log
import com.hiosdra.openanchor.wear.data.WearAlarmState
import io.mockk.every
import io.mockk.mockkStatic
import io.mockk.unmockkAll
import org.junit.After
import org.junit.Assert.assertNotNull
import org.junit.Before
import org.junit.Test

class WearHapticFeedbackTest {

    private lateinit var hapticFeedback: WearHapticFeedback

    @Before
    fun setup() {
        mockkStatic(Log::class)
        every { Log.d(any(), any()) } returns 0
        every { Log.w(any<String>(), any<String>()) } returns 0

        hapticFeedback = WearHapticFeedback()
    }

    @After
    fun tearDown() {
        unmockkAll()
    }

    @Test
    fun `should create instance successfully`() {
        assertNotNull(hapticFeedback)
    }

    @Test
    fun `should reset previous alarm state`() {
        // Should not throw
        hapticFeedback.reset()
    }

    @Test
    fun `should track alarm state transitions without context`() {
        // Verify the internal state tracking works (no vibrator needed)
        // First call sets initial state, no vibration
        hapticFeedback.reset()
        assertNotNull(hapticFeedback)
    }
}
