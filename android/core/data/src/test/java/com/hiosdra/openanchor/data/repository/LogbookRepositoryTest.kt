package com.hiosdra.openanchor.data.repository

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import app.cash.turbine.test
import com.hiosdra.openanchor.data.db.AnchorSessionEntity
import com.hiosdra.openanchor.data.db.OpenAnchorDatabase
import com.hiosdra.openanchor.domain.model.LogbookEntry
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config

@RunWith(AndroidJUnit4::class)
@Config(sdk = [34])
class LogbookRepositoryTest {

    private lateinit var database: OpenAnchorDatabase
    private lateinit var repository: LogbookRepository

    @Before
    fun setup() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        database = Room.inMemoryDatabaseBuilder(
            context,
            OpenAnchorDatabase::class.java
        ).allowMainThreadQueries().build()

        repository = LogbookRepository(database.logbookEntryDao())
    }

    @After
    fun tearDown() {
        database.close()
    }

    private suspend fun createTestSession(sessionId: Long): Long {
        val session = AnchorSessionEntity(
            id = sessionId,
            anchorLat = 0.0,
            anchorLng = 0.0,
            startTime = System.currentTimeMillis(),
            zoneType = "CIRCLE",
            radiusMeters = 100.0
        )
        return database.anchorSessionDao().insert(session)
    }

    private fun createTestEntry(
        id: Long = 0,
        sessionId: Long = 1,
        summary: String = "Test Summary",
        logEntry: String = "Test log entry",
        safetyNote: String = "Test safety note"
    ) = LogbookEntry(
        id = id,
        sessionId = sessionId,
        summary = summary,
        logEntry = logEntry,
        safetyNote = safetyNote
    )

    @Test
    fun `insertEntry returns generated ID`() = runTest {
        createTestSession(1)
        val entry = createTestEntry()
        val id = repository.insertEntry(entry)
        assertTrue(id > 0)
    }

    @Test
    fun `insertEntry persists entry to database`() = runTest {
        createTestSession(100)
        val entry = createTestEntry(sessionId = 100, summary = "My Anchor Log")
        val id = repository.insertEntry(entry)

        val retrieved = repository.getEntryForSession(100)
        assertNotNull(retrieved)
        assertEquals(id, retrieved!!.id)
        assertEquals("My Anchor Log", retrieved.summary)
    }

    @Test
    fun `updateEntry modifies existing entry`() = runTest {
        createTestSession(1)
        val entry = createTestEntry(summary = "Original")
        val id = repository.insertEntry(entry)

        val updated = entry.copy(id = id, summary = "Updated")
        repository.updateEntry(updated)

        val retrieved = repository.getEntryForSession(entry.sessionId)
        assertNotNull(retrieved)
        assertEquals("Updated", retrieved!!.summary)
    }

    @Test
    fun `deleteEntry removes entry from database`() = runTest {
        createTestSession(1)
        val entry = createTestEntry()
        val id = repository.insertEntry(entry)

        repository.deleteEntry(id)

        val retrieved = repository.getEntryForSession(entry.sessionId)
        assertNull(retrieved)
    }

    @Test
    fun `getEntryForSession returns null when not found`() = runTest {
        val entry = repository.getEntryForSession(999)
        assertNull(entry)
    }

    @Test
    fun `getEntryCount returns zero initially`() = runTest {
        val count = repository.getEntryCount()
        assertEquals(0, count)
    }

    @Test
    fun `getEntryCount returns correct count`() = runTest {
        createTestSession(1)
        createTestSession(2)
        createTestSession(3)
        repository.insertEntry(createTestEntry(sessionId = 1))
        repository.insertEntry(createTestEntry(sessionId = 2))
        repository.insertEntry(createTestEntry(sessionId = 3))

        val count = repository.getEntryCount()
        assertEquals(3, count)
    }

    @Test
    fun `observeAllEntries emits empty list initially`() = runTest {
        repository.observeAllEntries().test {
            val items = awaitItem()
            assertEquals(0, items.size)
            cancel()
        }
    }

    @Test
    fun `observeAllEntries emits updates after insert`() = runTest {
        createTestSession(1)
        createTestSession(2)
        repository.observeAllEntries().test {
            assertEquals(0, awaitItem().size)

            repository.insertEntry(createTestEntry(sessionId = 1))
            assertEquals(1, awaitItem().size)

            repository.insertEntry(createTestEntry(sessionId = 2))
            assertEquals(2, awaitItem().size)

            cancel()
        }
    }

    @Test
    fun `observeEntryForSession emits null initially`() = runTest {
        repository.observeEntryForSession(1).test {
            assertNull(awaitItem())
            cancel()
        }
    }

    @Test
    fun `observeEntryForSession emits entry after insert`() = runTest {
        createTestSession(1)
        repository.observeEntryForSession(1).test {
            assertNull(awaitItem())

            val entry = createTestEntry(sessionId = 1, summary = "My Log")
            val id = repository.insertEntry(entry)

            val emitted = awaitItem()
            assertNotNull(emitted)
            assertEquals(id, emitted!!.id)
            assertEquals("My Log", emitted.summary)

            cancel()
        }
    }

    @Test
    fun `observeEntryForSession emits updates after update`() = runTest {
        createTestSession(1)
        val entry = createTestEntry(sessionId = 1, summary = "Original")
        val id = repository.insertEntry(entry)

        repository.observeEntryForSession(1).test {
            val first = awaitItem()
            assertNotNull(first)
            assertEquals("Original", first!!.summary)

            repository.updateEntry(entry.copy(id = id, summary = "Updated"))

            val updated = awaitItem()
            assertNotNull(updated)
            assertEquals("Updated", updated!!.summary)

            cancel()
        }
    }

    @Test
    fun `observeEntryForSession emits null after delete`() = runTest {
        createTestSession(1)
        val entry = createTestEntry(sessionId = 1)
        val id = repository.insertEntry(entry)

        repository.observeEntryForSession(1).test {
            assertNotNull(awaitItem())

            repository.deleteEntry(id)
            assertNull(awaitItem())

            cancel()
        }
    }

    @Test
    fun `insert multiple entries for different sessions`() = runTest {
        createTestSession(1)
        createTestSession(2)
        createTestSession(3)
        repository.insertEntry(createTestEntry(sessionId = 1, summary = "Entry 1"))
        repository.insertEntry(createTestEntry(sessionId = 2, summary = "Entry 2"))
        repository.insertEntry(createTestEntry(sessionId = 3, summary = "Entry 3"))

        val entry1 = repository.getEntryForSession(1)
        val entry2 = repository.getEntryForSession(2)
        val entry3 = repository.getEntryForSession(3)

        assertNotNull(entry1)
        assertNotNull(entry2)
        assertNotNull(entry3)
        assertEquals("Entry 1", entry1!!.summary)
        assertEquals("Entry 2", entry2!!.summary)
        assertEquals("Entry 3", entry3!!.summary)
    }
}
