package com.hiosdra.openanchor.wear.service

import android.util.Log
import com.google.android.gms.wearable.DataMap
import com.hiosdra.openanchor.wear.data.DataPaths
import com.hiosdra.openanchor.wear.data.WearAlarmState
import io.mockk.every
import io.mockk.mockk
import io.mockk.mockkStatic
import io.mockk.unmockkAll
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class WearDataParserTest {

    private lateinit var parser: WearDataParser

    @Before
    fun setup() {
        mockkStatic(Log::class)
        every { Log.d(any(), any()) } returns 0
        every { Log.w(any<String>(), any<String>()) } returns 0
        every { Log.e(any(), any(), any()) } returns 0

        parser = WearDataParser()
    }

    @After
    fun tearDown() {
        unmockkAll()
    }

    @Test
    fun `should parse valid DataMap to WearMonitorState`() {
        val dataMap = mockk<DataMap>()
        every { dataMap.getBoolean(DataPaths.KEY_IS_ACTIVE, false) } returns true
        every { dataMap.getString(DataPaths.KEY_ALARM_STATE, "SAFE") } returns "CAUTION"
        every { dataMap.getFloat(DataPaths.KEY_DISTANCE, 0f) } returns 42.5f
        every { dataMap.getFloat(DataPaths.KEY_GPS_ACCURACY, 0f) } returns 8.0f
        every { dataMap.getBoolean(DataPaths.KEY_GPS_SIGNAL_LOST, false) } returns false
        every { dataMap.getLong(DataPaths.KEY_TIMESTAMP, 0L) } returns 1234567890L

        val result = parser.parse(dataMap)

        assertNotNull(result)
        assertTrue(result!!.isActive)
        assertEquals(WearAlarmState.CAUTION, result.alarmState)
        assertEquals(42.5, result.distanceMeters, 0.01)
        assertEquals(8.0f, result.gpsAccuracyMeters, 0.01f)
        assertFalse(result.gpsSignalLost)
        assertEquals(1234567890L, result.timestamp)
    }

    @Test
    fun `should parse DataMap with default values for missing fields`() {
        val dataMap = mockk<DataMap>()
        every { dataMap.getBoolean(DataPaths.KEY_IS_ACTIVE, false) } returns false
        every { dataMap.getString(DataPaths.KEY_ALARM_STATE, "SAFE") } returns "SAFE"
        every { dataMap.getFloat(DataPaths.KEY_DISTANCE, 0f) } returns 0f
        every { dataMap.getFloat(DataPaths.KEY_GPS_ACCURACY, 0f) } returns 0f
        every { dataMap.getBoolean(DataPaths.KEY_GPS_SIGNAL_LOST, false) } returns false
        every { dataMap.getLong(DataPaths.KEY_TIMESTAMP, 0L) } returns 0L

        val result = parser.parse(dataMap)

        assertNotNull(result)
        assertFalse(result!!.isActive)
        assertEquals(WearAlarmState.SAFE, result.alarmState)
        assertEquals(0.0, result.distanceMeters, 0.01)
        assertEquals(0.0f, result.gpsAccuracyMeters, 0.01f)
        assertFalse(result.gpsSignalLost)
        assertEquals(0L, result.timestamp)
    }

    @Test
    fun `should handle unknown alarm state gracefully`() {
        val dataMap = mockk<DataMap>()
        every { dataMap.getBoolean(DataPaths.KEY_IS_ACTIVE, false) } returns true
        every { dataMap.getString(DataPaths.KEY_ALARM_STATE, "SAFE") } returns "UNKNOWN_STATE"
        every { dataMap.getFloat(DataPaths.KEY_DISTANCE, 0f) } returns 10f
        every { dataMap.getFloat(DataPaths.KEY_GPS_ACCURACY, 0f) } returns 5f
        every { dataMap.getBoolean(DataPaths.KEY_GPS_SIGNAL_LOST, false) } returns false
        every { dataMap.getLong(DataPaths.KEY_TIMESTAMP, 0L) } returns 100L

        val result = parser.parse(dataMap)

        assertNotNull(result)
        assertEquals(WearAlarmState.SAFE, result!!.alarmState) // defaults to SAFE
    }

    @Test
    fun `should return null when DataMap throws exception`() {
        val dataMap = mockk<DataMap>()
        every { dataMap.getBoolean(any(), any()) } throws RuntimeException("Corrupted data")

        val result = parser.parse(dataMap)

        assertNull(result)
    }

    @Test
    fun `should parse all alarm states correctly`() {
        for (alarmState in WearAlarmState.entries) {
            val dataMap = mockk<DataMap>()
            every { dataMap.getBoolean(DataPaths.KEY_IS_ACTIVE, false) } returns true
            every { dataMap.getString(DataPaths.KEY_ALARM_STATE, "SAFE") } returns alarmState.name
            every { dataMap.getFloat(DataPaths.KEY_DISTANCE, 0f) } returns 0f
            every { dataMap.getFloat(DataPaths.KEY_GPS_ACCURACY, 0f) } returns 0f
            every { dataMap.getBoolean(DataPaths.KEY_GPS_SIGNAL_LOST, false) } returns false
            every { dataMap.getLong(DataPaths.KEY_TIMESTAMP, 0L) } returns 0L

            val result = parser.parse(dataMap)
            assertNotNull(result)
            assertEquals(alarmState, result!!.alarmState)
        }
    }

    @Test
    fun `should parse GPS signal lost flag`() {
        val dataMap = mockk<DataMap>()
        every { dataMap.getBoolean(DataPaths.KEY_IS_ACTIVE, false) } returns true
        every { dataMap.getString(DataPaths.KEY_ALARM_STATE, "SAFE") } returns "SAFE"
        every { dataMap.getFloat(DataPaths.KEY_DISTANCE, 0f) } returns 20f
        every { dataMap.getFloat(DataPaths.KEY_GPS_ACCURACY, 0f) } returns 50f
        every { dataMap.getBoolean(DataPaths.KEY_GPS_SIGNAL_LOST, false) } returns true
        every { dataMap.getLong(DataPaths.KEY_TIMESTAMP, 0L) } returns 999L

        val result = parser.parse(dataMap)

        assertNotNull(result)
        assertTrue(result!!.gpsSignalLost)
    }

    @Test
    fun `should parse case-insensitive alarm state`() {
        val dataMap = mockk<DataMap>()
        every { dataMap.getBoolean(DataPaths.KEY_IS_ACTIVE, false) } returns true
        every { dataMap.getString(DataPaths.KEY_ALARM_STATE, "SAFE") } returns "warning"
        every { dataMap.getFloat(DataPaths.KEY_DISTANCE, 0f) } returns 0f
        every { dataMap.getFloat(DataPaths.KEY_GPS_ACCURACY, 0f) } returns 0f
        every { dataMap.getBoolean(DataPaths.KEY_GPS_SIGNAL_LOST, false) } returns false
        every { dataMap.getLong(DataPaths.KEY_TIMESTAMP, 0L) } returns 0L

        val result = parser.parse(dataMap)

        assertNotNull(result)
        assertEquals(WearAlarmState.WARNING, result!!.alarmState)
    }
}
