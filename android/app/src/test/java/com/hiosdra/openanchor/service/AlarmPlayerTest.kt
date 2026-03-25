package com.hiosdra.openanchor.service

import android.content.Context
import android.media.AudioManager
import android.media.MediaPlayer
import android.os.Vibrator
import io.mockk.*
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class AlarmPlayerTest {

    private lateinit var context: Context
    private lateinit var audioManager: AudioManager
    private lateinit var alarmPlayer: AlarmPlayer

    @Before
    fun setUp() {
        context = mockk(relaxed = true)
        audioManager = mockk(relaxed = true)

        every { context.getSystemService(Context.AUDIO_SERVICE) } returns audioManager
        every { audioManager.getStreamVolume(AudioManager.STREAM_ALARM) } returns 5
        every { audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM) } returns 7

        alarmPlayer = AlarmPlayer(context)
    }

    // ========== isPlaying ==========

    @Test
    fun `isPlaying returns false initially`() {
        assertFalse(alarmPlayer.isPlaying())
    }

    // ========== stopAlarm ==========

    @Test
    fun `stopAlarm with no active player does not crash`() {
        // Should handle null mediaPlayer gracefully
        alarmPlayer.stopAlarm()
        assertFalse(alarmPlayer.isPlaying())
    }

    @Test
    fun `stopAlarm restores previous volume when it was saved`() {
        // Simulate that startAlarm was called and saved previousVolume
        val previousVolumeField = AlarmPlayer::class.java.getDeclaredField("previousVolume")
        previousVolumeField.isAccessible = true
        previousVolumeField.setInt(alarmPlayer, 3)

        alarmPlayer.stopAlarm()

        verify {
            audioManager.setStreamVolume(AudioManager.STREAM_ALARM, 3, 0)
        }
    }

    @Test
    fun `stopAlarm does not restore volume when previousVolume is negative`() {
        // previousVolume defaults to -1
        alarmPlayer.stopAlarm()

        verify(exactly = 0) {
            audioManager.setStreamVolume(AudioManager.STREAM_ALARM, any(), any())
        }
    }

    @Test
    fun `stopAlarm cancels vibrator`() {
        val vibrator = mockk<Vibrator>(relaxed = true)
        val vibratorField = AlarmPlayer::class.java.getDeclaredField("vibrator")
        vibratorField.isAccessible = true
        vibratorField.set(alarmPlayer, vibrator)

        alarmPlayer.stopAlarm()

        verify { vibrator.cancel() }
    }

    @Test
    fun `stopAlarm releases and nulls mediaPlayer`() {
        val player = mockk<MediaPlayer>(relaxed = true)
        every { player.isPlaying } returns true
        val mpField = AlarmPlayer::class.java.getDeclaredField("mediaPlayer")
        mpField.isAccessible = true
        mpField.set(alarmPlayer, player)

        alarmPlayer.stopAlarm()

        verify { player.stop() }
        verify { player.release() }
        assertFalse(alarmPlayer.isPlaying())
    }

    @Test
    fun `stopAlarm does not call stop on non-playing mediaPlayer`() {
        val player = mockk<MediaPlayer>(relaxed = true)
        every { player.isPlaying } returns false
        val mpField = AlarmPlayer::class.java.getDeclaredField("mediaPlayer")
        mpField.isAccessible = true
        mpField.set(alarmPlayer, player)

        alarmPlayer.stopAlarm()

        verify(exactly = 0) { player.stop() }
        verify { player.release() }
    }

    // ========== startAlarm ==========

    @Test
    fun `startAlarm early returns when already playing`() {
        val player = mockk<MediaPlayer>(relaxed = true)
        every { player.isPlaying } returns true
        val mpField = AlarmPlayer::class.java.getDeclaredField("mediaPlayer")
        mpField.isAccessible = true
        mpField.set(alarmPlayer, player)

        alarmPlayer.startAlarm()

        // Should not set volume since we returned early
        verify(exactly = 0) { audioManager.getStreamVolume(AudioManager.STREAM_ALARM) }
    }

    @Test
    fun `startAlarm saves current volume and sets to max`() {
        // Make RingtoneManager.getDefaultUri throw to force the fallback path
        // which also tests volume saving
        try {
            alarmPlayer.startAlarm()
        } catch (_: Exception) {
            // Expected - RingtoneManager not available in unit tests
        }

        verify { audioManager.getStreamVolume(AudioManager.STREAM_ALARM) }
        verify { audioManager.setStreamVolume(AudioManager.STREAM_ALARM, 7, 0) }
    }

    // ========== Round-trip ==========

    @Test
    fun `stopAlarm after startAlarm attempt restores volume`() {
        // Even if startAlarm fails (no RingtoneManager), volume should have been saved
        try {
            alarmPlayer.startAlarm()
        } catch (_: Exception) {
            // Expected
        }

        alarmPlayer.stopAlarm()

        // Should restore the original volume (5)
        verify { audioManager.setStreamVolume(AudioManager.STREAM_ALARM, 5, 0) }
    }
}
