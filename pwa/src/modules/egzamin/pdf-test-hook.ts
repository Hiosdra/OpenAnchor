export const EGZAMIN_PDF_TEST_HOOK = '__OPENANCHOR_E2E_PDF__' as const;

export interface EgzaminPdfRenderRequest {
  questionId: string;
  pageIndex: number;
  cropYStart: number;
  cropYEnd: number;
  pageHeight: number;
  scale?: number;
}

export interface EgzaminPdfTestHook {
  forceReady?: boolean;
  renderQuestion?: (request: EgzaminPdfRenderRequest) => Promise<string | null> | string | null;
}

declare global {
  interface Window {
    __OPENANCHOR_E2E_PDF__?: EgzaminPdfTestHook;
  }
}

export {};
