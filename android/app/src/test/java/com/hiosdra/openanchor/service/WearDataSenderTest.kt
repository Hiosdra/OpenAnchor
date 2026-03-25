package com.hiosdra.openanchor.service

import android.content.Context
import android.util.Log
import com.google.android.gms.tasks.Task
import com.google.android.gms.wearable.*
import com.hiosdra.openanchor.domain.model.AlarmState
import io.mockk.*
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runTest
import org.junit.After
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

        mockkStatic(Log::class)
        every { Log.d(any(), any()) } returns 0
        every { Log.e(any(), any(), any()) } returns 0

        sender = WearDataSender(context)
    }

    @After
    fun tearDown() {
        unmockkAll()
    }

    // ========== sendMonitorState ==========

    @Test
    fun `sendMonitorState does not throw on dataClient failure`() = runTest {
        every { dataClient.putDataItem(any()) } throws RuntimeException("No Wear device")

        val state = MonitorState(isActive = true, alarmState = AlarmState.SAFE)
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

    @Test
    fun `sendMonitorState succeeds with active state`() = runTest {
        setupDataClientSuccess()

        sender.sendMonitorState(MonitorState(
            isActive = true,
            alarmState = AlarmState.SAFE,
            distanceToAnchor = 15.0,
            gpsAccuracyMeters = 3.5f
        ))

        verify { dataClient.putDataItem(any()) }
        verify { Log.d("WearDataSender", match { it.contains("Monitor state sent") }) }
    }

    @Test
    fun `sendMonitorState succeeds with WARNING state`() = runTest {
        setupDataClientSuccess()

        sender.sendMonitorState(MonitorState(
            isActive = true,
            alarmState = AlarmState.WARNING,
            distanceToAnchor = 45.0,
            gpsAccuracyMeters = 8f,
            gpsSignalLost = false
        ))

        verify { dataClient.putDataItem(any()) }
    }

    @Test
    fun `sendMonitorState succeeds with inactive state`() = runTest {
        setupDataClientSuccess()

        sender.sendMonitorState(MonitorState(isActive = false, alarmState = AlarmState.SAFE))

        verify { dataClient.putDataItem(any()) }
    }

    // ========== sendAlarmTrigger ==========

    @Test
    fun `sendAlarmTrigger does not throw on failure`() = runTest {
        every { nodeClient.connectedNodes } throws RuntimeException("No nodes")
        sender.sendAlarmTrigger()
    }

    @Test
    fun `sendAlarmTrigger succeeds with connected nodes`() = runTest {
        val node = mockk<Node> {
            every { id } returns "node1"
            every { displayName } returns "TestWatch"
        }
        setupNodeClientSuccess(listOf(node))
        setupMessageClientSuccess()

        sender.sendAlarmTrigger()

        verify { messageClient.sendMessage("node1", any(), any()) }
        verify { Log.d("WearDataSender", match { it.contains("Alarm trigger sent") }) }
    }

    @Test
    fun `sendAlarmTrigger with multiple nodes sends to all`() = runTest {
        val node1 = mockk<Node> {
            every { id } returns "node1"
            every { displayName } returns "Watch1"
        }
        val node2 = mockk<Node> {
            every { id } returns "node2"
            every { displayName } returns "Watch2"
        }
        setupNodeClientSuccess(listOf(node1, node2))
        setupMessageClientSuccess()

        sender.sendAlarmTrigger()

        verify { messageClient.sendMessage("node1", any(), any()) }
        verify { messageClient.sendMessage("node2", any(), any()) }
    }

    @Test
    fun `sendAlarmTrigger with no connected nodes skips send`() = runTest {
        setupNodeClientSuccess(emptyList())

        sender.sendAlarmTrigger()

        verify(exactly = 0) { messageClient.sendMessage(any(), any(), any()) }
    }

    // ========== clearMonitorState ==========

    @Test
    fun `clearMonitorState does not throw on failure`() = runTest {
        every { dataClient.putDataItem(any()) } throws RuntimeException("No Wear device")
        sender.clearMonitorState()
    }

    @Test
    fun `clearMonitorState succeeds`() = runTest {
        setupDataClientSuccess()

        sender.clearMonitorState()

        verify { dataClient.putDataItem(any()) }
        verify { Log.d("WearDataSender", "Monitor state cleared") }
    }

    // ========== helpers ==========

    private fun setupDataClientSuccess() {
        mockkStatic(PutDataMapRequest::class)
        val putDataMapReq = mockk<PutDataMapRequest>(relaxed = true)
        val putDataReq = mockk<PutDataRequest>(relaxed = true)
        every { PutDataMapRequest.create(any()) } returns putDataMapReq
        every { putDataMapReq.asPutDataRequest() } returns putDataReq
        every { putDataReq.setUrgent() } returns putDataReq

        @Suppress("UNCHECKED_CAST")
        val task = mockk<Task<DataItem>>()
        every { task.isComplete } returns true
        every { task.isCanceled } returns false
        every { task.exception } returns null
        every { task.result } returns mockk(relaxed = true)
        every { dataClient.putDataItem(any()) } returns task
    }

    @Suppress("UNCHECKED_CAST")
    private fun setupNodeClientSuccess(nodes: List<Node>) {
        val nodesTask = mockk<Task<List<Node>>>()
        every { nodesTask.isComplete } returns true
        every { nodesTask.isCanceled } returns false
        every { nodesTask.exception } returns null
        every { nodesTask.result } returns nodes
        every { nodeClient.connectedNodes } returns nodesTask as Task<MutableList<Node>>
    }

    private fun setupMessageClientSuccess() {
        val msgTask = mockk<Task<Int>>()
        every { msgTask.isComplete } returns true
        every { msgTask.isCanceled } returns false
        every { msgTask.exception } returns null
        every { msgTask.result } returns 0
        every { messageClient.sendMessage(any(), any(), any()) } returns msgTask
    }
}
