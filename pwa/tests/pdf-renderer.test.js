import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock pdfjs-dist module
const { mockGetDocument } = vi.hoisted(() => ({
  mockGetDocument: vi.fn(),
}));

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {},
  getDocument: mockGetDocument,
}));

import { PdfRenderer } from '../src/modules/egzamin/pdf-renderer';

// --- helpers ---

function mockCanvas() {
  const ctx = { drawImage: vi.fn() };
  return {
    width: 0,
    height: 0,
    getContext: vi.fn(() => ctx),
    toDataURL: vi.fn(() => 'data:image/png;base64,MOCK'),
    toBlob: vi.fn((cb) => cb(new Blob(['mock'], { type: 'image/png' }))),
    _ctx: ctx,
  };
}

function mockPage(w = 800, h = 600) {
  return {
    getViewport: vi.fn(({ scale }) => ({ width: w * scale, height: h * scale })),
    render: vi.fn(() => ({ promise: Promise.resolve() })),
  };
}

function mockPdfDoc(numPages = 5) {
  const page = mockPage();
  return {
    numPages,
    getPage: vi.fn(() => Promise.resolve(page)),
    destroy: vi.fn(),
    _page: page,
  };
}

describe('PdfRenderer', () => {
  let canvases;
  let origCreateElement;
  let origCreateObjectURL, origRevokeObjectURL;

  beforeEach(() => {
    PdfRenderer._pdfDoc = null;
    PdfRenderer._cache.clear();
    PdfRenderer._blobUrls = [];

    // Save originals before overwriting
    origCreateObjectURL = globalThis.URL.createObjectURL;
    origRevokeObjectURL = globalThis.URL.revokeObjectURL;

    // Mock URL.createObjectURL / revokeObjectURL
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    globalThis.URL.revokeObjectURL = vi.fn();

    canvases = [];
    origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'canvas') {
        const c = mockCanvas();
        canvases.push(c);
        return c;
      }
      return origCreateElement(tag);
    });

    mockGetDocument.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.URL.createObjectURL = origCreateObjectURL;
    globalThis.URL.revokeObjectURL = origRevokeObjectURL;
  });

  // --- loadFromBlob ---

  describe('loadFromBlob', () => {
    it('should load a PDF and return the page count', async () => {
      const doc = mockPdfDoc(10);
      mockGetDocument.mockReturnValue({ promise: Promise.resolve(doc) });

      const n = await PdfRenderer.loadFromBlob(new Blob(['pdf']));
      expect(n).toBe(10);
      expect(PdfRenderer._pdfDoc).toBe(doc);
    });

    it('should pass ArrayBuffer to mockGetDocument', async () => {
      const doc = mockPdfDoc();
      mockGetDocument.mockReturnValue({ promise: Promise.resolve(doc) });

      await PdfRenderer.loadFromBlob(new Blob(['data']));
      expect(mockGetDocument).toHaveBeenCalledWith({ data: expect.any(ArrayBuffer) });
    });

    it('should clear the cache on load', async () => {
      PdfRenderer._cache.set('old', 'val');
      const doc = mockPdfDoc();
      mockGetDocument.mockReturnValue({ promise: Promise.resolve(doc) });

      await PdfRenderer.loadFromBlob(new Blob(['pdf']));
      expect(PdfRenderer._cache.size).toBe(0);
    });
  });

  // --- _getScale ---

  describe('_getScale', () => {
    it('should return 1.5 for low-memory devices (<=4 GB)', () => {
      Object.defineProperty(navigator, 'deviceMemory', { value: 4, configurable: true });
      expect(PdfRenderer._getScale()).toBe(1.5);
    });

    it('should return 1.5 for very low-memory devices', () => {
      Object.defineProperty(navigator, 'deviceMemory', { value: 2, configurable: true });
      expect(PdfRenderer._getScale()).toBe(1.5);
    });

    it('should return 2.0 for high-memory devices', () => {
      Object.defineProperty(navigator, 'deviceMemory', { value: 8, configurable: true });
      expect(PdfRenderer._getScale()).toBe(2.0);
    });

    it('should return 2.0 when deviceMemory is unavailable', () => {
      Object.defineProperty(navigator, 'deviceMemory', { value: undefined, configurable: true });
      expect(PdfRenderer._getScale()).toBe(2.0);
    });
  });

  // --- renderPage ---

  describe('renderPage', () => {
    let doc;

    beforeEach(async () => {
      doc = mockPdfDoc();
      mockGetDocument.mockReturnValue({ promise: Promise.resolve(doc) });
      await PdfRenderer.loadFromBlob(new Blob(['pdf']));
      canvases = [];
    });

    it('should render and return a canvas', async () => {
      const canvas = await PdfRenderer.renderPage(0, 2.0);
      expect(canvas).toBeTruthy();
      expect(doc.getPage).toHaveBeenCalledWith(1);
    });

    it('should set canvas dimensions from viewport', async () => {
      const canvas = await PdfRenderer.renderPage(0, 2.0);
      expect(canvas.width).toBe(1600);
      expect(canvas.height).toBe(1200);
    });

    it('should call page.render with correct args', async () => {
      await PdfRenderer.renderPage(0, 2.0);
      const page = doc._page;
      expect(page.render).toHaveBeenCalledWith(
        expect.objectContaining({ annotationMode: 0 })
      );
    });

    it('should return cached canvas on repeat call', async () => {
      const first = await PdfRenderer.renderPage(0, 2.0);
      const second = await PdfRenderer.renderPage(0, 2.0);
      expect(first).toBe(second);
      expect(doc.getPage).toHaveBeenCalledTimes(1);
    });

    it('should use separate cache entries for different scales', async () => {
      await PdfRenderer.renderPage(0, 1.5);
      await PdfRenderer.renderPage(0, 2.0);
      expect(doc.getPage).toHaveBeenCalledTimes(2);
    });

    it('should return null when no PDF is loaded', async () => {
      PdfRenderer._pdfDoc = null;
      expect(await PdfRenderer.renderPage(0, 2.0)).toBeNull();
    });

    it('should evict oldest entry when cache exceeds _MAX_CACHE', async () => {
      for (let i = 0; i < 32; i++) await PdfRenderer.renderPage(i, 2.0);
      expect(PdfRenderer._cache.size).toBe(32);

      await PdfRenderer.renderPage(32, 2.0);
      expect(PdfRenderer._cache.size).toBe(32);
      expect(PdfRenderer._cache.has('0_2')).toBe(false);
      expect(PdfRenderer._cache.has('32_2')).toBe(true);
    });

    it('should use _getScale when scale is omitted', async () => {
      vi.spyOn(PdfRenderer, '_getScale').mockReturnValue(1.5);
      await PdfRenderer.renderPage(0);
      expect(PdfRenderer._getScale).toHaveBeenCalled();
      expect(PdfRenderer._cache.has('0_1.5')).toBe(true);
    });
  });

  // --- renderQuestion ---

  describe('renderQuestion', () => {
    beforeEach(async () => {
      const doc = mockPdfDoc();
      mockGetDocument.mockReturnValue({ promise: Promise.resolve(doc) });
      await PdfRenderer.loadFromBlob(new Blob(['pdf']));
      canvases = [];
    });

    it('should return a blob URL', async () => {
      const result = await PdfRenderer.renderQuestion(0, 100, 300, 600, 2.0);
      expect(result).toBe('blob:mock-url');
      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    it('should track blob URLs for cleanup', async () => {
      await PdfRenderer.renderQuestion(0, 100, 300, 600, 2.0);
      expect(PdfRenderer._blobUrls).toContain('blob:mock-url');
    });

    it('should create a crop canvas with correct dimensions', async () => {
      await PdfRenderer.renderQuestion(0, 100, 300, 600, 2.0);
      // fullPage h=1200, pageHeight=600 → ratio=2, yStart=200, yEnd=600, crop=400
      const crop = canvases[canvases.length - 1];
      expect(crop.height).toBe(400);
    });

    it('should call drawImage on the crop context', async () => {
      await PdfRenderer.renderQuestion(0, 100, 300, 600, 2.0);
      const crop = canvases[canvases.length - 1];
      expect(crop._ctx.drawImage).toHaveBeenCalled();
    });

    it('should return null when no PDF is loaded', async () => {
      PdfRenderer._pdfDoc = null;
      expect(await PdfRenderer.renderQuestion(0, 0, 100, 600, 2.0)).toBeNull();
    });

    it('should default to scale 2.0', async () => {
      vi.spyOn(PdfRenderer, 'renderPage');
      await PdfRenderer.renderQuestion(0, 0, 100, 600);
      expect(PdfRenderer.renderPage).toHaveBeenCalledWith(0, 2.0);
    });
  });

  // --- isLoaded ---

  describe('isLoaded', () => {
    it('should return false initially', () => {
      expect(PdfRenderer.isLoaded()).toBe(false);
    });

    it('should return true after loading', async () => {
      mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockPdfDoc()) });
      await PdfRenderer.loadFromBlob(new Blob(['pdf']));
      expect(PdfRenderer.isLoaded()).toBe(true);
    });
  });

  // --- unload ---

  describe('unload', () => {
    it('should destroy the document and clear cache', async () => {
      const doc = mockPdfDoc();
      mockGetDocument.mockReturnValue({ promise: Promise.resolve(doc) });
      await PdfRenderer.loadFromBlob(new Blob(['pdf']));
      PdfRenderer._cache.set('k', 'v');
      PdfRenderer._blobUrls.push('blob:test1', 'blob:test2');

      PdfRenderer.unload();
      expect(doc.destroy).toHaveBeenCalled();
      expect(PdfRenderer._pdfDoc).toBeNull();
      expect(PdfRenderer._cache.size).toBe(0);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test1');
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test2');
      expect(PdfRenderer._blobUrls).toEqual([]);
    });

    it('should not throw when no PDF is loaded', () => {
      expect(() => PdfRenderer.unload()).not.toThrow();
    });

    it('should clear cache even when no PDF was loaded', () => {
      PdfRenderer._cache.set('k', 'v');
      PdfRenderer.unload();
      expect(PdfRenderer._cache.size).toBe(0);
    });
  });

  // --- visibilitychange ---

  describe('visibilitychange listener', () => {
    it('should clear cache when document becomes hidden', () => {
      PdfRenderer._cache.set('k', 'v');
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
      expect(PdfRenderer._cache.size).toBe(0);
    });

    it('should not clear cache when document is visible', () => {
      PdfRenderer._cache.set('k', 'v');
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
      expect(PdfRenderer._cache.size).toBe(1);
    });

    it('should not clear when cache is already empty and hidden', () => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
      expect(PdfRenderer._cache.size).toBe(0);
    });
  });
});
