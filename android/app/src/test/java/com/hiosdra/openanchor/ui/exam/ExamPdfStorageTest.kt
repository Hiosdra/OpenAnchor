package com.hiosdra.openanchor.ui.exam

import android.content.Context
import android.content.SharedPreferences
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import io.mockk.*
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import java.io.InputStream

class ExamPdfStorageTest {

    private lateinit var storage: ExamPdfStorage
    private lateinit var testDir: java.io.File
    private val prefsMap = mutableMapOf<String, Any?>()

    @Before
    fun setup() {
        testDir = java.io.File(System.getProperty("user.dir"), "build/test-pdf-storage")
        testDir.deleteRecursively()
        testDir.mkdirs()

        val editor = mockk<SharedPreferences.Editor>()
        every { editor.putString(any(), any()) } answers {
            prefsMap[firstArg()] = secondArg<String?>()
            editor
        }
        every { editor.putInt(any(), any()) } answers {
            prefsMap[firstArg()] = secondArg<Int>()
            editor
        }
        every { editor.clear() } answers {
            prefsMap.clear()
            editor
        }
        every { editor.apply() } just Runs

        val prefs = mockk<SharedPreferences>()
        every { prefs.edit() } returns editor
        every { prefs.getString(any(), any()) } answers {
            prefsMap[firstArg()] as? String ?: secondArg()
        }
        every { prefs.getInt(any(), any()) } answers {
            prefsMap[firstArg()] as? Int ?: secondArg()
        }

        val context = mockk<Context> {
            every { filesDir } returns testDir
            every { getSharedPreferences(any(), any()) } returns prefs
        }

        mockkStatic(ParcelFileDescriptor::class)
        mockkConstructor(PdfRenderer::class)
        val mockFd = mockk<ParcelFileDescriptor>(relaxed = true)
        every { ParcelFileDescriptor.open(any(), any()) } returns mockFd
        every { anyConstructed<PdfRenderer>().pageCount } returns 1
        every { anyConstructed<PdfRenderer>().close() } just Runs

        storage = ExamPdfStorage(context)
    }

    @After
    fun tearDown() {
        testDir.deleteRecursively()
        unmockkAll()
    }

    // ---- isPdfAvailable ----

    @Test
    fun `isPdfAvailable returns false initially`() {
        assertFalse(storage.isPdfAvailable())
    }

    @Test
    fun `isPdfAvailable returns true after savePdf`() = runTest {
        assertFalse(storage.isPdfAvailable())
        storage.savePdf("content".byteInputStream(), "test.pdf")
        assertTrue(storage.isPdfAvailable())
    }

    // ---- getPdfFile ----

    @Test
    fun `getPdfFile returns path under exam_pdf directory`() {
        val file = storage.getPdfFile()
        assertTrue(file.path.contains("exam_pdf"))
        assertEquals("questions.pdf", file.name)
    }

    // ---- savePdf ----

    @Test
    fun `savePdf saves file and stores metadata`() = runTest {
        every { anyConstructed<PdfRenderer>().pageCount } returns 5

        val result = storage.savePdf("test pdf content".byteInputStream(), "exam.pdf")

        assertTrue(storage.isPdfAvailable())
        assertEquals(5, result.pageCount)
        assertTrue(result.hash.isNotEmpty())

        val metadata = storage.getMetadata()
        assertNotNull(metadata)
        assertEquals("exam.pdf", metadata!!.filename)
        assertEquals(5, metadata.pageCount)
        assertTrue(metadata.importDate.isNotEmpty())
    }

    @Test
    fun `savePdf returns invalid hash for non-matching content`() = runTest {
        val result = storage.savePdf("not the real pdf".byteInputStream(), "fake.pdf")

        assertFalse(result.hashValid)
        assertNotEquals(ExamPdfStorage.EXPECTED_PDF_HASH, result.hash)
    }

    @Test
    fun `savePdf computes consistent hash for same content`() = runTest {
        val content = "deterministic content"
        val result1 = storage.savePdf(content.byteInputStream(), "a.pdf")
        storage.deletePdf()
        val result2 = storage.savePdf(content.byteInputStream(), "b.pdf")

        assertEquals(result1.hash, result2.hash)
    }

    @Test
    fun `savePdf cleans up temp file on error`() = runTest {
        val failingStream = object : InputStream() {
            override fun read(): Int = throw java.io.IOException("read failed")
        }

        try {
            storage.savePdf(failingStream, "fail.pdf")
            fail("Expected IOException")
        } catch (_: java.io.IOException) {
            // expected
        }

        assertFalse(storage.isPdfAvailable())
        val dir = storage.getPdfFile().parentFile!!
        val tempFile = java.io.File(dir, "temp_questions.pdf")
        assertFalse(tempFile.exists())
    }

    // ---- deletePdf ----

    @Test
    fun `deletePdf removes file and clears metadata`() = runTest {
        every { anyConstructed<PdfRenderer>().pageCount } returns 3
        storage.savePdf("content".byteInputStream(), "test.pdf")
        assertTrue(storage.isPdfAvailable())

        storage.deletePdf()

        assertFalse(storage.isPdfAvailable())
        assertNull(storage.getMetadata())
    }

    @Test
    fun `deletePdf is safe when no file exists`() {
        storage.deletePdf()
        assertFalse(storage.isPdfAvailable())
    }

    // ---- getMetadata ----

    @Test
    fun `getMetadata returns null when no PDF`() {
        assertNull(storage.getMetadata())
    }

    @Test
    fun `getMetadata returns correct data after savePdf`() = runTest {
        every { anyConstructed<PdfRenderer>().pageCount } returns 7
        storage.savePdf("pdf bytes".byteInputStream(), "my_exam.pdf")

        val metadata = storage.getMetadata()
        assertNotNull(metadata)
        assertEquals("my_exam.pdf", metadata!!.filename)
        assertEquals(7, metadata.pageCount)
        assertTrue(metadata.hash.isNotEmpty())
        assertTrue(metadata.importDate.isNotEmpty())
    }
}
