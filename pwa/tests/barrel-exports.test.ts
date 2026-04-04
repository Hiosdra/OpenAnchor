import { describe, it, expect, vi } from 'vitest';

// ── anchor/index barrel ──────────────────────────────────────────────────
// anchor/index re-exports from many DOM-dependent modules; mock the heavy ones.
vi.mock('../src/modules/anchor/anchor-app', () => ({ AnchorApp: class {} }));
vi.mock('../src/modules/anchor/map-controller', () => ({ MapController: class {} }));
vi.mock('../src/modules/anchor/alert-controller', () => ({ AlertController: class {} }));
vi.mock('../src/modules/anchor/ai-controller', () => ({ AiController: class {} }));
vi.mock('../src/modules/anchor/sync-controller', () => ({ SyncController: class {} }));
vi.mock('../src/modules/anchor/connection-status', () => ({ ConnectionStatus: { init: vi.fn(), _update: vi.fn() } }));
vi.mock('../src/modules/anchor/ui-utils', () => ({
  UI: { init: vi.fn() },
  OnboardingController: class {},
  throttle: vi.fn((fn: Function) => fn),
}));
vi.mock('../src/modules/anchor/session-db', () => ({
  SessionDB: class {},
}));
vi.mock('leaflet', () => ({
  default: { marker: vi.fn(), map: vi.fn(), tileLayer: vi.fn(), LatLng: class { constructor(public lat: number, public lng: number) {} } },
  marker: vi.fn(),
  map: vi.fn(),
  tileLayer: vi.fn(),
  LatLng: class { constructor(public lat: number, public lng: number) {} },
}));

describe('anchor barrel (src/modules/anchor/index.ts)', () => {
  it('re-exports geo-utils symbols', async () => {
    const mod = await import('../src/modules/anchor/index');
    expect(mod).toHaveProperty('calculateDistance');
    expect(mod).toHaveProperty('GeoUtils');
  });

  it('re-exports alarm-engine symbols', async () => {
    const mod = await import('../src/modules/anchor/index');
    expect(mod).toHaveProperty('AlarmEngine');
    expect(mod).toHaveProperty('SimpleAlarmEngine');
  });

  it('re-exports i18n', async () => {
    const mod = await import('../src/modules/anchor/index');
    expect(mod).toHaveProperty('I18N');
  });

  it('re-exports types', async () => {
    const mod = await import('../src/modules/anchor/index');
    // Types are erased at runtime, but the module should load without error
    expect(mod).toBeDefined();
  });
});

// ── egzamin/index barrel ─────────────────────────────────────────────────
// Mock heavy deps that egzamin barrel pulls in
vi.mock('../src/modules/egzamin/pdf-renderer', () => ({ PdfRenderer: { loadFromBlob: vi.fn(), unload: vi.fn() } }));
vi.mock('../src/shared/storage/indexed-db', () => ({
  isPdfImported: vi.fn().mockResolvedValue(false),
  loadPdfBlob: vi.fn().mockResolvedValue(null),
  deletePdf: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/modules/egzamin/App', () => ({ App: () => null }));
vi.mock('../src/modules/egzamin/components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: any) => children,
}));

describe('egzamin barrel (src/modules/egzamin/index.tsx)', () => {
  it('re-exports storage functions', async () => {
    const mod = await import('../src/modules/egzamin/index');
    expect(mod).toHaveProperty('loadProgress');
    expect(mod).toHaveProperty('saveProgress');
    expect(mod).toHaveProperty('EXAM_PROGRESS_KEY');
    expect(mod).toHaveProperty('LEARN_POSITION_KEY');
    expect(mod).toHaveProperty('LEITNER_STATE_KEY');
  });

  it('re-exports leitner functions', async () => {
    const mod = await import('../src/modules/egzamin/index');
    expect(mod).toHaveProperty('advanceQuestion');
    expect(mod).toHaveProperty('resetQuestion');
    expect(mod).toHaveProperty('isDueForReview');
    expect(mod).toHaveProperty('initializeLeitnerQuestion');
    expect(mod).toHaveProperty('LEITNER_INTERVALS');
  });

  it('re-exports PdfRenderer', async () => {
    const mod = await import('../src/modules/egzamin/index');
    expect(mod).toHaveProperty('PdfRenderer');
  });

  it('re-exports App', async () => {
    const mod = await import('../src/modules/egzamin/index');
    expect(mod).toHaveProperty('App');
  });

  it('re-exports constants', async () => {
    const mod = await import('../src/modules/egzamin/index');
    expect(mod).toHaveProperty('MODES');
    expect(mod).toHaveProperty('CATEGORIES');
  });
});

// ── wachtownik/index barrel ─────────────────────────────────────────────
vi.mock('../src/modules/wachtownik/utils/pdf-export', () => ({ exportScheduleToPDF: vi.fn() }));
vi.mock('../src/modules/wachtownik/utils/qr-utils', () => ({ buildShareUrl: vi.fn(), generateQRCode: vi.fn() }));
vi.mock('../src/modules/wachtownik/App', () => ({ default: () => null }));
vi.mock('../src/modules/wachtownik/components/Icon', () => ({ Icon: () => null }));
vi.mock('../src/modules/wachtownik/components/Dropdown', () => ({ Dropdown: () => null, DropdownItem: () => null }));
vi.mock('../src/modules/wachtownik/components/ScheduleTableRow', () => ({ ScheduleTableRow: () => null }));

describe('wachtownik barrel (src/modules/wachtownik/index.tsx)', () => {
  it('re-exports constants', async () => {
    const mod = await import('../src/modules/wachtownik/index');
    expect(mod).toHaveProperty('ROLES');
    expect(mod).toHaveProperty('WATCH_TEMPLATES');
    expect(mod).toHaveProperty('defaultCrew');
    expect(mod).toHaveProperty('defaultSlots');
    expect(mod).toHaveProperty('MAX_HISTORY_SIZE');
    expect(mod).toHaveProperty('t');
  });

  it('re-exports schedule-logic', async () => {
    const mod = await import('../src/modules/wachtownik/index');
    expect(mod).toHaveProperty('getActiveCrew');
    expect(mod).toHaveProperty('recommendWatchSystem');
    expect(mod).toHaveProperty('generateRecommendationReason');
    expect(mod).toHaveProperty('calculateCoverage');
  });

  it('re-exports component and utility symbols', async () => {
    const mod = await import('../src/modules/wachtownik/index');
    expect(mod).toHaveProperty('exportScheduleToPDF');
    expect(mod).toHaveProperty('buildShareUrl');
    expect(mod).toHaveProperty('generateQRCode');
    expect(mod).toHaveProperty('Icon');
    expect(mod).toHaveProperty('Dropdown');
    expect(mod).toHaveProperty('DropdownItem');
    expect(mod).toHaveProperty('ScheduleTableRow');
    expect(mod).toHaveProperty('App');
  });
});

// ── zeglowanie/index barrel ─────────────────────────────────────────────
describe('zeglowanie barrel (src/modules/zeglowanie/index.ts)', () => {
  it('re-exports data constants', async () => {
    const mod = await import('../src/modules/zeglowanie/index');
    expect(mod).toHaveProperty('packingLists');
    expect(mod).toHaveProperty('briefingLists');
    expect(mod).toHaveProperty('checklistData');
  });

  it('re-exports section functions', async () => {
    const mod = await import('../src/modules/zeglowanie/index');
    expect(mod).toHaveProperty('switchSection');
    expect(mod).toHaveProperty('initSections');
  });

  it('re-exports packing functions', async () => {
    const mod = await import('../src/modules/zeglowanie/index');
    expect(mod).toHaveProperty('switchCruiseType');
    expect(mod).toHaveProperty('resetChecklist');
    expect(mod).toHaveProperty('renderChecklist');
    expect(mod).toHaveProperty('initPacking');
  });

  it('re-exports briefing functions', async () => {
    const mod = await import('../src/modules/zeglowanie/index');
    expect(mod).toHaveProperty('switchBriefingType');
    expect(mod).toHaveProperty('resetBriefingChecklist');
    expect(mod).toHaveProperty('renderBriefingChecklist');
    expect(mod).toHaveProperty('initBriefing');
  });

  it('re-exports checklist functions', async () => {
    const mod = await import('../src/modules/zeglowanie/index');
    expect(mod).toHaveProperty('switchChecklistType');
    expect(mod).toHaveProperty('resetChecklistSection');
    expect(mod).toHaveProperty('renderChecklistItems');
    expect(mod).toHaveProperty('initChecklists');
  });
});
