package com.hiosdra.openanchor.service

import android.content.Context
import com.google.android.gms.wearable.DataClient
import com.google.android.gms.wearable.MessageClient
import com.google.android.gms.wearable.NodeClient
import com.google.android.gms.wearable.Wearable
import com.hiosdra.openanchor.domain.model.AlarmState
import io.mockk.*
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class WearDataSenderTest {

    private lateinit var context: Context
    private lateinit var dataClient: DataClient
    private lateinit var messageClient: MessageClient
    private lateinit var nodeClient: NodeClient
    private lateinit var sender: WearDataSender

    @Before
    fun setUp() {
        context = mockk(relaxed = true)
        dataClient = mockk(relaxed = true)
        messageClient = mockk(relaxed = true)
        nodeClient = mockk(relaxed = true)

        mockkStatic(Wearable::class)
        every { Wearable.getDataClient(any<Context>()) } returns dataClient
        every { Wearable.getMessageClient(any<Context>()) } returns messageClient
        every { Wearable.getNodeClient(any<Context>()) } returns nodeClient

        sender = WearDataSender(context)
    }

    // ========== sendMonitorState ==========

    @Test
    fun `sendMonitorState does not throw on dataClient failure`() = runTest {
        every { dataClient.putDataItem(any()) } throws RuntimeException("No Wear device")

        val state = MonitorState(isActive = true, alarmState = AlarmState.SAFE)
        // Should catch exception internally
        sender.sendMonitorState(state)
    }

    @Test
    fun `sendMonitorState does not throw on ALARM state`() = runTest {
        every { dataClient.putDataItem(any()) } throws RuntimeException("No Wear device")

        val state = MonitorState(
            isActive = true,
            alarmState = AlarmState.ALARM,
            distanceToAnchor = 100.0,
            gpsAccuracyMeters = 5f,
            gpsSignalLost = true
        )
        sender.sendMonitorState(state)
    }

    // ========== sendAlarmTrigger ==========

    @Test
    fun `sendAlarmTrigger does not throw on failure`() = runTest {
        every { nodeClient.connectedNodes } throws RuntimeException("No nodes")
        // Should catch exception internally
        sender.sendAlarmTrigger()
    }

    // ========== clearMonitorState ==========

    @Test
    fun `clearMonitorState does not throw on failure`() = runTest {
        every { dataClient.putDataItem(any()) } throws RuntimeException("No Wear device")
        // Should catch exception internally
        sender.clearMonitorState()
    }
}
