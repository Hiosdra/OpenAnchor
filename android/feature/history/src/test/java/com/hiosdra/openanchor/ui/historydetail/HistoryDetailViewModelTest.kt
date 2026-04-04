package com.hiosdra.openanchor.ui.historydetail

import android.content.Context
import androidx.arch.core.executor.testing.InstantTaskExecutorRule
import androidx.lifecycle.SavedStateHandle
import app.cash.turbine.test
import com.hiosdra.openanchor.data.repository.AnchorSessionRepository
import com.hiosdra.openanchor.domain.model.AnchorSession
import com.hiosdra.openanchor.domain.model.AnchorZone
import com.hiosdra.openanchor.domain.model.Position
import com.hiosdra.openanchor.domain.model.TrackPoint
import io.mockk.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class HistoryDetailViewModelTest {

    @get:Rule
    val instantExecutorRule = InstantTaskExecutorRule()

    private lateinit var repository: AnchorSessionRepository
    private lateinit var context: Context
    private lateinit var savedStateHandle: SavedStateHandle

    private val testSession = AnchorSession(
        id = 42,
        anchorPosition = Position(54.35, 18.65),
        zone = AnchorZone.Circle(Position(54.35, 18.65), 30.0)
    )

    private val testTrackPoints = listOf(
        TrackPoint(1, 42, Position(54.351, 18.651), 10f),
        TrackPoint(2, 42, Position(54.352, 18.652), 20f)
    )

    @Before
    fun setup() {
        repository = mockk(relaxed = true)
        context = mockk(relaxed = true)
        savedStateHandle = SavedStateHandle(mapOf("sessionId" to 42L))

        coEvery { repository.getSessionById(42L) } returns testSession
        coEvery { repository.getTrackPointsOnce(42L) } returns testTrackPoints
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `loads session and track points on init`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = HistoryDetailViewModel(savedStateHandle, repository, context)
        advanceUntilIdle()

        vm.state.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertNotNull(state.session)
            assertEquals(42L, state.session!!.id)
            assertEquals(2, state.trackPoints.size)
            assertFalse(state.isLoading)
            cancel()
        }
    }

    @Test
    fun `clearExportState resets export fields`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val vm = HistoryDetailViewModel(savedStateHandle, repository, context)
        advanceUntilIdle()

        vm.clearExportState()
        advanceUntilIdle()

        vm.state.test {
            val state = awaitItem()
            assertNull(state.gpxExportUri)
            assertNull(state.gpxExportFilename)
            assertFalse(state.exportError)
            cancel()
        }
    }

    @Test
    fun `missing sessionId defaults to -1`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val handle = SavedStateHandle()
        coEvery { repository.getSessionById(-1L) } returns null
        coEvery { repository.getTrackPointsOnce(-1L) } returns emptyList()

        val vm = HistoryDetailViewModel(handle, repository, context)
        advanceUntilIdle()

        vm.state.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertNull(state.session)
            assertTrue(state.trackPoints.isEmpty())
            assertFalse(state.isLoading)
            cancel()
        }
    }

    @Test
    fun `initial state has isLoading true`() {
        val state = HistoryDetailState()
        assertTrue(state.isLoading)
        assertNull(state.session)
        assertTrue(state.trackPoints.isEmpty())
        assertNull(state.gpxExportUri)
        assertNull(state.gpxExportFilename)
        assertFalse(state.exportError)
    }

    @Test
    fun `exportGpx does nothing when session is null`() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val handle = SavedStateHandle()
        coEvery { repository.getSessionById(-1L) } returns null
        coEvery { repository.getTrackPointsOnce(-1L) } returns emptyList()

        val vm = HistoryDetailViewModel(handle, repository, context)
        advanceUntilIdle()

        vm.exportGpx()
        advanceUntilIdle()

        vm.state.test {
            advanceUntilIdle()
            val state = expectMostRecentItem()
            assertNull(state.gpxExportUri)
            assertFalse(state.exportError)
            cancel()
        }
    }
}
