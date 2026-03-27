package com.hiosdra.openanchor.ui.exam

import android.content.Context
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.InputStream
import java.security.MessageDigest
import java.time.Instant
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ExamPdfStorage @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    companion object {
        private const val PDF_DIR = "exam_pdf"
        private const val PDF_FILENAME = "questions.pdf"
        private const val PREFS_NAME = "exam_pdf_prefs"
        private const val KEY_HASH = "pdf_hash"
        private const val KEY_FILENAME = "pdf_filename"
        private const val KEY_IMPORT_DATE = "pdf_import_date"
        private const val KEY_PAGE_COUNT = "pdf_page_count"
        const val EXPECTED_PDF_HASH =
            "967e36168e85a50fc551acbcea171939bad82c2de4872009044c67685c970c10"
    }

    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun isPdfAvailable(): Boolean = getPdfFile().exists()

    fun getPdfFile(): File {
        val dir = File(context.filesDir, PDF_DIR)
        return File(dir, PDF_FILENAME)
    }

    suspend fun savePdf(inputStream: InputStream, originalFilename: String): SaveResult {
        return withContext(Dispatchers.IO) {
            val dir = File(context.filesDir, PDF_DIR)
            dir.mkdirs()
            val file = File(dir, PDF_FILENAME)

            val tempFile = File(dir, "temp_$PDF_FILENAME")
            try {
                inputStream.use { input ->
                    tempFile.outputStream().use { output ->
                        input.copyTo(output)
                    }
                }

                val hash = computeSha256(tempFile)
                val valid = hash == EXPECTED_PDF_HASH

                if (!tempFile.renameTo(file)) {
                    tempFile.delete()
                    throw java.io.IOException("Failed to save PDF: rename from ${tempFile.path} to ${file.path} failed")
                }

                val pageCount = countPages(file)

                prefs.edit()
                    .putString(KEY_HASH, hash)
                    .putString(KEY_FILENAME, originalFilename)
                    .putString(KEY_IMPORT_DATE, Instant.now().toString())
                    .putInt(KEY_PAGE_COUNT, pageCount)
                    .apply()

                SaveResult(hashValid = valid, hash = hash, pageCount = pageCount)
            } catch (e: Exception) {
                tempFile.delete()
                throw e
            }
        }
    }

    fun deletePdf() {
        getPdfFile().delete()
        prefs.edit().clear().apply()
    }

    fun getMetadata(): PdfMetadata? {
        if (!isPdfAvailable()) return null
        return PdfMetadata(
            hash = prefs.getString(KEY_HASH, "") ?: "",
            filename = prefs.getString(KEY_FILENAME, "") ?: "",
            importDate = prefs.getString(KEY_IMPORT_DATE, "") ?: "",
            pageCount = prefs.getInt(KEY_PAGE_COUNT, 0),
        )
    }

    private fun computeSha256(file: File): String {
        val digest = MessageDigest.getInstance("SHA-256")
        file.inputStream().use { input ->
            val buffer = ByteArray(8192)
            var read: Int
            while (input.read(buffer).also { read = it } != -1) {
                digest.update(buffer, 0, read)
            }
        }
        return digest.digest().joinToString("") { "%02x".format(it) }
    }

    private fun countPages(file: File): Int {
        val fd = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
        val renderer = PdfRenderer(fd)
        val count = renderer.pageCount
        renderer.close()
        fd.close()
        return count
    }

    data class SaveResult(val hashValid: Boolean, val hash: String, val pageCount: Int)

    data class PdfMetadata(
        val hash: String,
        val filename: String,
        val importDate: String,
        val pageCount: Int,
    )
}
