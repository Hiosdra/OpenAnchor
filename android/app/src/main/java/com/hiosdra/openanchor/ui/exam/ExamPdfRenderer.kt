package com.hiosdra.openanchor.ui.exam

import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import android.util.LruCache
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ExamPdfRenderer @Inject constructor(
    private val pdfStorage: ExamPdfStorage,
) {
    private var pdfRenderer: PdfRenderer? = null
    private var fileDescriptor: ParcelFileDescriptor? = null
    private val cache = LruCache<Int, Bitmap>(10)

    @Synchronized
    fun open() {
        if (pdfRenderer != null) return
        val file = pdfStorage.getPdfFile()
        if (!file.exists()) return
        fileDescriptor = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
        pdfRenderer = PdfRenderer(fileDescriptor!!)
    }

    @Synchronized
    fun close() {
        pdfRenderer?.close()
        pdfRenderer = null
        fileDescriptor?.close()
        fileDescriptor = null
        cache.evictAll()
    }

    fun isOpen(): Boolean = pdfRenderer != null

    fun renderPage(pageIndex: Int, scale: Float = 2f): Bitmap? {
        cache.get(pageIndex)?.let { return it }

        val renderer = pdfRenderer ?: return null
        if (pageIndex < 0 || pageIndex >= renderer.pageCount) return null

        val page = renderer.openPage(pageIndex)
        val width = (page.width * scale).toInt()
        val height = (page.height * scale).toInt()
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        bitmap.eraseColor(Color.WHITE)
        page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_PRINT)
        page.close()

        cache.put(pageIndex, bitmap)
        return bitmap
    }

    fun renderQuestion(question: ExamQuestion, scale: Float = 2f): Bitmap? {
        // Render at reduced scale when only a portion is needed, to save memory
        val cropFraction = (question.cropYEnd - question.cropYStart) / question.pageHeight.toFloat()
        val effectiveScale = if (cropFraction < 0.5f) (scale * 0.75f).coerceAtLeast(1f) else scale

        val fullPage = renderPage(question.pdfPage, effectiveScale) ?: return null

        val scaleRatio = fullPage.height.toFloat() / question.pageHeight
        val yStart = (question.cropYStart * scaleRatio).toInt().coerceAtLeast(0)
        val yEnd = (question.cropYEnd * scaleRatio).toInt().coerceAtMost(fullPage.height)
        val cropHeight = (yEnd - yStart).coerceAtLeast(1)

        return Bitmap.createBitmap(fullPage, 0, yStart, fullPage.width, cropHeight)
    }
}
