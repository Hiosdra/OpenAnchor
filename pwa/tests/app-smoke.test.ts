import { describe, it, expect, vi } from 'vitest';

// Mock heavy dependencies that App components import
vi.mock('../src/modules/egzamin/pdf-renderer', () => ({
  PdfRenderer: { loadFromBlob: vi.fn(), unload: vi.fn() },
}));
vi.mock('../src/shared/storage/indexed-db', () => ({
  isPdfImported: vi.fn().mockResolvedValue(false),
  loadPdfBlob: vi.fn().mockResolvedValue(null),
  deletePdf: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/modules/egzamin/components/ImportPdfScreen', () => ({
  ImportPdfScreen: () => null,
}));
vi.mock('../src/modules/egzamin/components/MenuScreen', () => ({
  MenuScreen: () => null,
}));
vi.mock('../src/modules/egzamin/components/LearnScreen', () => ({
  LearnScreen: () => null,
}));
vi.mock('../src/modules/egzamin/components/ExamScreen', () => ({
  ExamScreen: () => null,
}));
vi.mock('../src/modules/egzamin/components/ResultsScreen', () => ({
  ResultsScreen: () => null,
}));
vi.mock('../src/modules/egzamin/components/LeitnerOverviewScreen', () => ({
  LeitnerOverviewScreen: () => null,
}));
vi.mock('../src/modules/egzamin/components/LeitnerSessionScreen', () => ({
  LeitnerSessionScreen: () => null,
}));
vi.mock('../src/modules/egzamin/components/LeitnerCompleteScreen', () => ({
  LeitnerCompleteScreen: () => null,
}));

// Mock wachtownik heavy deps
vi.mock('lz-string', () => ({
  default: { compressToEncodedURIComponent: vi.fn(), decompressFromEncodedURIComponent: vi.fn() },
  compressToEncodedURIComponent: vi.fn(),
  decompressFromEncodedURIComponent: vi.fn(),
}));
vi.mock('../src/modules/wachtownik/utils/pdf-export', () => ({
  exportScheduleToPDF: vi.fn(),
}));
vi.mock('../src/modules/wachtownik/utils/qr-utils', () => ({
  buildShareUrl: vi.fn(),
  generateQRCode: vi.fn(),
}));
vi.mock('../src/modules/wachtownik/components/Icon', () => ({
  Icon: () => null,
}));
vi.mock('../src/modules/wachtownik/components/Dropdown', () => ({
  Dropdown: () => null,
  DropdownItem: () => null,
}));
vi.mock('../src/modules/wachtownik/components/ScheduleTableRow', () => ({
  ScheduleTableRow: () => null,
}));

describe('egzamin App smoke test', () => {
  it('can be imported without throwing', async () => {
    const mod = await import('../src/modules/egzamin/App');
    expect(mod).toHaveProperty('App');
    expect(typeof mod.App).toBe('function');
  });
});

describe('wachtownik App smoke test', () => {
  it('can be imported without throwing', async () => {
    const mod = await import('../src/modules/wachtownik/App');
    // default export
    expect(mod).toHaveProperty('default');
    expect(typeof mod.default).toBe('function');
  });
});
