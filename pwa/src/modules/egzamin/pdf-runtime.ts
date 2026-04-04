import { isPdfImported, loadPdfBlob, deletePdf } from '../../shared/storage/indexed-db';
import { PdfRenderer } from './pdf-renderer';
import {
  EGZAMIN_PDF_TEST_HOOK,
  type EgzaminPdfRenderRequest,
  type EgzaminPdfTestHook,
} from './pdf-test-hook';

function getEgzaminPdfTestHook(): EgzaminPdfTestHook | null {
  if (typeof window === 'undefined') return null;
  return window[EGZAMIN_PDF_TEST_HOOK] ?? null;
}

export async function initializeEgzaminPdf(): Promise<boolean> {
  const testHook = getEgzaminPdfTestHook();
  if (testHook?.forceReady === true) {
    return true;
  }

  const imported = await isPdfImported();
  if (!imported) return false;

  const blob = await loadPdfBlob();
  if (!blob) return false;

  await PdfRenderer.loadFromBlob(blob);
  return true;
}

export async function clearEgzaminPdf(): Promise<void> {
  PdfRenderer.unload();
  await deletePdf();
}

export async function renderEgzaminQuestion(request: EgzaminPdfRenderRequest): Promise<string | null> {
  const testHook = getEgzaminPdfTestHook();
  if (testHook?.renderQuestion) {
    return await testHook.renderQuestion(request);
  }

  return PdfRenderer.renderQuestion(
    request.pageIndex,
    request.cropYStart,
    request.cropYEnd,
    request.pageHeight,
    request.scale,
  );
}
