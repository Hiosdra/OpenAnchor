/**
 * PdfRenderer - PDF page rendering singleton with LRU cache.
 * Requires pdf.js (pdfjsLib) to be loaded before this script.
 *
 * Loaded as a plain <script> in the browser (PdfRenderer is global).
 * In Vitest, the conditional module.exports makes named imports work.
 */

// Configure pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

var PdfRenderer = {
    _pdfDoc: null,
    _cache: new Map(),
    _MAX_CACHE: 32,
    _blobUrls: [],

    async loadFromBlob(blob) {
        var arrayBuffer = await blob.arrayBuffer();
        this._pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        this._cache.clear();
        return this._pdfDoc.numPages;
    },

    _getScale() {
        if (navigator.deviceMemory && navigator.deviceMemory <= 4) return 1.5;
        return 2.0;
    },

    async renderPage(pageIndex, scale) {
        if (scale === undefined) scale = this._getScale();
        var cacheKey = pageIndex + '_' + scale;
        if (this._cache.has(cacheKey)) return this._cache.get(cacheKey);

        if (!this._pdfDoc) return null;
        var page = await this._pdfDoc.getPage(pageIndex + 1);
        var viewport = page.getViewport({ scale: scale });
        var canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        var ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport: viewport, annotationMode: 0 }).promise;

        if (this._cache.size >= this._MAX_CACHE) {
            var firstKey = this._cache.keys().next().value;
            this._cache.delete(firstKey);
        }
        this._cache.set(cacheKey, canvas);
        return canvas;
    },

    async renderQuestion(pageIndex, cropYStart, cropYEnd, pageHeight, scale) {
        if (scale === undefined) scale = 2.0;
        var fullPage = await this.renderPage(pageIndex, scale);
        if (!fullPage) return null;

        var scaleRatio = fullPage.height / pageHeight;
        var yStart = Math.floor(cropYStart * scaleRatio);
        var yEnd = Math.ceil(cropYEnd * scaleRatio);
        var cropHeight = yEnd - yStart;

        var cropCanvas = document.createElement('canvas');
        cropCanvas.width = fullPage.width;
        cropCanvas.height = cropHeight;
        var ctx = cropCanvas.getContext('2d');
        ctx.drawImage(fullPage, 0, yStart, fullPage.width, cropHeight, 0, 0, fullPage.width, cropHeight);

        return new Promise((resolve) => {
            cropCanvas.toBlob((blob) => {
                var url = URL.createObjectURL(blob);
                this._blobUrls.push(url);
                resolve(url);
            }, 'image/png');
        });
    },

    isLoaded() {
        return this._pdfDoc !== null;
    },

    unload() {
        this._blobUrls.forEach(url => URL.revokeObjectURL(url));
        this._blobUrls = [];
        if (this._pdfDoc) {
            this._pdfDoc.destroy();
            this._pdfDoc = null;
        }
        this._cache.clear();
    }
};

// Clear PDF cache when tab is hidden to reduce memory pressure
document.addEventListener('visibilitychange', function () {
    if (document.hidden && PdfRenderer._cache.size > 0) {
        PdfRenderer._cache.clear();
    }
});

// Vitest compatibility
if (typeof module !== 'undefined') {
    module.exports = { PdfRenderer };
}
