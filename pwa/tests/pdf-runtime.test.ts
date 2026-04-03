import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFns = vi.hoisted(() => ({
  isPdfImported: vi.fn(),
  loadPdfBlob: vi.fn(),
  deletePdf: vi.fn(),
  loadFromBlob: vi.fn(),
  unload: vi.fn(),
  renderQuestion: vi.fn(),
}));

vi.mock('../src/shared/storage/indexed-db', () => ({
  isPdfImported: mockFns.isPdfImported,
  loadPdfBlob: mockFns.loadPdfBlob,
  deletePdf: mockFns.deletePdf,
}));

vi.mock('../src/modules/egzamin/pdf-renderer', () => ({
  PdfRenderer: {
    loadFromBlob: mockFns.loadFromBlob,
    unload: mockFns.unload,
    renderQuestion: mockFns.renderQuestion,
  },
}));

import { initializeEgzaminPdf, clearEgzaminPdf, renderEgzaminQuestion } from '../src/modules/egzamin/pdf-runtime';

type TestWindow = Window & {
  __OPENANCHOR_E2E_PDF__?: {
    forceReady?: boolean;
    renderQuestion?: (request: unknown) => Promise<string | null> | string | null;
  };
};

describe('egzamin pdf runtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as TestWindow).__OPENANCHOR_E2E_PDF__;

    mockFns.isPdfImported.mockResolvedValue(false);
    mockFns.loadPdfBlob.mockResolvedValue(null);
    mockFns.deletePdf.mockResolvedValue(undefined);
    mockFns.loadFromBlob.mockResolvedValue(42);
    mockFns.unload.mockReturnValue(undefined);
    mockFns.renderQuestion.mockResolvedValue('blob:rendered-question');
  });

  it('uses the test hook to skip PDF initialization', async () => {
    (window as TestWindow).__OPENANCHOR_E2E_PDF__ = { forceReady: true };

    await expect(initializeEgzaminPdf()).resolves.toBe(true);
    expect(mockFns.isPdfImported).not.toHaveBeenCalled();
    expect(mockFns.loadPdfBlob).not.toHaveBeenCalled();
    expect(mockFns.loadFromBlob).not.toHaveBeenCalled();
  });

  it('loads the persisted PDF when no test hook is present', async () => {
    const blob = new Blob(['pdf-data'], { type: 'application/pdf' });
    mockFns.isPdfImported.mockResolvedValue(true);
    mockFns.loadPdfBlob.mockResolvedValue(blob);

    await expect(initializeEgzaminPdf()).resolves.toBe(true);
    expect(mockFns.isPdfImported).toHaveBeenCalledOnce();
    expect(mockFns.loadPdfBlob).toHaveBeenCalledOnce();
    expect(mockFns.loadFromBlob).toHaveBeenCalledWith(blob);
  });

  it('uses the test hook to render question images', async () => {
    const renderQuestion = vi.fn().mockResolvedValue('data:image/png;base64,test');
    (window as TestWindow).__OPENANCHOR_E2E_PDF__ = { renderQuestion };

    await expect(renderEgzaminQuestion({
      questionId: 'q1',
      pageIndex: 1,
      cropYStart: 10,
      cropYEnd: 50,
      pageHeight: 100,
      scale: 2,
    })).resolves.toBe('data:image/png;base64,test');

    expect(renderQuestion).toHaveBeenCalledWith({
      questionId: 'q1',
      pageIndex: 1,
      cropYStart: 10,
      cropYEnd: 50,
      pageHeight: 100,
      scale: 2,
    });
    expect(mockFns.renderQuestion).not.toHaveBeenCalled();
  });

  it('falls back to PdfRenderer when no test hook is present', async () => {
    await expect(renderEgzaminQuestion({
      questionId: 'q2',
      pageIndex: 3,
      cropYStart: 15,
      cropYEnd: 75,
      pageHeight: 120,
      scale: 1.5,
    })).resolves.toBe('blob:rendered-question');

    expect(mockFns.renderQuestion).toHaveBeenCalledWith(3, 15, 75, 120, 1.5);
  });

  it('clears renderer state and deletes the persisted PDF', async () => {
    await clearEgzaminPdf();

    expect(mockFns.unload).toHaveBeenCalledOnce();
    expect(mockFns.deletePdf).toHaveBeenCalledOnce();
  });
});
