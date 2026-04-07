/**
 * PdfRenderer - PDF page rendering singleton with in-memory FIFO page cache.
 *
 * Migrated from js/pdf-renderer.js
 */

import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';

// Configure pdf.js worker using the npm package (guard against duplicate init during HMR)
if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
}

export const PdfRenderer = {
  _pdfDoc: null as PDFDocumentProxy | null,
  _cache: new Map<string, HTMLCanvasElement>(),
  _MAX_CACHE: 32,
  _blobUrls: [] as string[],

  async loadFromBlob(blob: Blob): Promise<number> {
    const arrayBuffer = await blob.arrayBuffer();
    this._pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    this._cache.clear();
    return this._pdfDoc.numPages;
  },

  _getScale(): number {
    if (
      (navigator as unknown as { deviceMemory?: number }).deviceMemory &&
      (navigator as unknown as { deviceMemory: number }).deviceMemory <= 4
    )
      return 1.5;
    return 2.0;
  },

  async renderPage(pageIndex: number, scale?: number): Promise<HTMLCanvasElement | null> {
    if (scale === undefined) scale = this._getScale();
    const cacheKey = pageIndex + '_' + scale;
    if (this._cache.has(cacheKey)) return this._cache.get(cacheKey)!;

    if (!this._pdfDoc) return null;
    const page = await this._pdfDoc.getPage(pageIndex + 1);
    const viewport = page.getViewport({ scale: scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport: viewport, annotationMode: 0 } as Parameters<
      typeof page.render
    >[0]).promise;

    if (this._cache.size >= this._MAX_CACHE) {
      const firstKey = this._cache.keys().next().value;
      if (firstKey !== undefined) {
        this._cache.delete(firstKey);
      }
    }
    this._cache.set(cacheKey, canvas);
    return canvas;
  },

  async renderQuestion(
    pageIndex: number,
    cropYStart: number,
    cropYEnd: number,
    pageHeight: number,
    scale?: number,
  ): Promise<string | null> {
    if (scale === undefined) scale = 2.0;
    const fullPage = await this.renderPage(pageIndex, scale);
    if (!fullPage) return null;

    const scaleRatio = fullPage.height / pageHeight;
    const yStart = Math.floor(cropYStart * scaleRatio);
    const yEnd = Math.ceil(cropYEnd * scaleRatio);
    const cropHeight = yEnd - yStart;

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = fullPage.width;
    cropCanvas.height = cropHeight;
    const ctx = cropCanvas.getContext('2d')!;
    ctx.drawImage(
      fullPage,
      0,
      yStart,
      fullPage.width,
      cropHeight,
      0,
      0,
      fullPage.width,
      cropHeight,
    );

    return new Promise((resolve) => {
      cropCanvas.toBlob((blob) => {
        if (!blob) {
          resolve(null);
          return;
        }
        const url = URL.createObjectURL(blob);
        this._blobUrls.push(url);
        resolve(url);
      }, 'image/png');
    });
  },

  isLoaded(): boolean {
    return this._pdfDoc !== null;
  },

  unload(): void {
    this._blobUrls.forEach((url) => URL.revokeObjectURL(url));
    this._blobUrls = [];
    if (this._pdfDoc) {
      this._pdfDoc.destroy();
      this._pdfDoc = null;
    }
    this._cache.clear();
  },
};

// Clear PDF cache when tab is hidden to reduce memory pressure
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const w = window as unknown as {
    __pdfRendererVisibilityListenerRegistered?: boolean;
    __pdfRendererVisibilityListener?: () => void;
  };

  if (!w.__pdfRendererVisibilityListenerRegistered) {
    w.__pdfRendererVisibilityListener = () => {
      if (document.hidden && PdfRenderer._cache.size > 0) {
        PdfRenderer._cache.clear();
      }
    };
    document.addEventListener('visibilitychange', w.__pdfRendererVisibilityListener);
    w.__pdfRendererVisibilityListenerRegistered = true;

    if (import.meta.hot) {
      import.meta.hot.dispose(() => {
        if (w.__pdfRendererVisibilityListener) {
          document.removeEventListener('visibilitychange', w.__pdfRendererVisibilityListener);
        }
        w.__pdfRendererVisibilityListenerRegistered = false;
        w.__pdfRendererVisibilityListener = undefined;
      });
    }
  }
}
