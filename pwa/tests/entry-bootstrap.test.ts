import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ═══════════════════════════════════════════════════════════════════════════
// Mocks — declared before any dynamic imports
// ═══════════════════════════════════════════════════════════════════════════

// ── main.ts deps ─────────────────────────────────────────────────────────
const mockInitDashboard = vi.fn();
vi.mock('../src/modules/dashboard/dashboard-ui', () => ({
  initDashboard: mockInitDashboard,
}));

// ── anchor/entry deps ────────────────────────────────────────────────────
const mockI18NApplyToDOM = vi.fn();
const mockConnectionStatusInit = vi.fn();
const mockOnboardingController = vi.fn();
const mockAnchorApp = vi.fn();

vi.mock('../src/modules/anchor/i18n', () => ({
  I18N: { _applyToDOM: mockI18NApplyToDOM, init: vi.fn(), fmt: vi.fn(), t: {} },
}));
vi.mock('../src/modules/anchor/connection-status', () => ({
  ConnectionStatus: { init: mockConnectionStatusInit, _update: vi.fn() },
}));
vi.mock('../src/modules/anchor/ui-utils', () => ({
  OnboardingController: mockOnboardingController,
  UI: { init: vi.fn() },
  throttle: vi.fn((fn: Function) => fn),
}));
vi.mock('../src/modules/anchor/anchor-app', () => ({
  AnchorApp: mockAnchorApp,
}));

// ── egzamin/entry deps ──────────────────────────────────────────────────
const mockCreateRoot = vi.fn(() => ({ render: vi.fn() }));
vi.mock('react-dom/client', () => ({
  createRoot: mockCreateRoot,
}));
vi.mock('../src/modules/egzamin/constants', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    transformQuestion: vi.fn((q: any) => ({ ...q, id: q.id })),
  };
});
vi.mock('../src/modules/egzamin/App', () => ({
  App: () => null,
}));
vi.mock('../src/modules/egzamin/components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: any) => children,
}));
vi.mock('../../../modules/egzamin/exam_questions.json', () => ({
  default: [{ id: 'q1', category: 'nav', correct_answer: 'a', pdf_page: 1, crop_y_start: 0, crop_y_end: 100, page_height: 800 }],
}));

// ── wachtownik/entry deps ───────────────────────────────────────────────
vi.mock('../src/modules/wachtownik/App', () => ({
  default: () => null,
}));

// ── zeglowanie/entry deps ───────────────────────────────────────────────
const mockInitSections = vi.fn();
const mockInitPacking = vi.fn();
const mockInitBriefing = vi.fn();
const mockInitChecklists = vi.fn();
const mockSwitchSection = vi.fn();
const mockSwitchCruiseType = vi.fn();
const mockResetChecklist = vi.fn();
const mockSwitchBriefingType = vi.fn();
const mockResetBriefingChecklist = vi.fn();
const mockSwitchChecklistType = vi.fn();
const mockResetChecklistSection = vi.fn();

vi.mock('../src/modules/zeglowanie/sections', () => ({
  switchSection: mockSwitchSection,
  initSections: mockInitSections,
  getCurrentSection: vi.fn(() => 'packing'),
}));
vi.mock('../src/modules/zeglowanie/packing', () => ({
  switchCruiseType: mockSwitchCruiseType,
  resetChecklist: mockResetChecklist,
  renderChecklist: vi.fn(),
  initPacking: mockInitPacking,
  getCurrentCruiseType: vi.fn(() => 'baltic-autumn'),
}));
vi.mock('../src/modules/zeglowanie/briefing', () => ({
  switchBriefingType: mockSwitchBriefingType,
  resetBriefingChecklist: mockResetBriefingChecklist,
  renderBriefingChecklist: vi.fn(),
  initBriefing: mockInitBriefing,
  getCurrentBriefingType: vi.fn(() => 'zero'),
}));
vi.mock('../src/modules/zeglowanie/checklists', () => ({
  switchChecklistType: mockSwitchChecklistType,
  resetChecklistSection: mockResetChecklistSection,
  renderChecklistItems: vi.fn(),
  initChecklists: mockInitChecklists,
  getCurrentChecklistType: vi.fn(() => 'morning'),
}));

// ═══════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('main.ts entry', () => {
  beforeEach(() => {
    vi.resetModules();
    mockInitDashboard.mockClear();
  });

  it('calls initDashboard on import', async () => {
    await import('../src/main');
    expect(mockInitDashboard).toHaveBeenCalledOnce();
  });
});

describe('anchor/entry.ts', () => {
  let capturedDOMContentLoaded: EventListener | null = null;
  const origAddEventListener = window.addEventListener.bind(window);

  beforeEach(() => {
    vi.resetModules();
    mockConnectionStatusInit.mockClear();
    mockOnboardingController.mockClear();
    mockAnchorApp.mockClear();
    mockI18NApplyToDOM.mockClear();
    capturedDOMContentLoaded = null;

    // Intercept DOMContentLoaded registration so we can call it manually
    vi.spyOn(window, 'addEventListener').mockImplementation((type: string, listener: any, options?: any) => {
      if (type === 'DOMContentLoaded') {
        capturedDOMContentLoaded = listener;
      } else {
        origAddEventListener(type, listener, options);
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sets theme from localStorage on import', async () => {
    localStorage.setItem('openanchor-theme', 'light');
    await import('../src/modules/anchor/entry');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('defaults theme to dark when localStorage is empty', async () => {
    localStorage.clear();
    await import('../src/modules/anchor/entry');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('initializes ConnectionStatus on import', async () => {
    await import('../src/modules/anchor/entry');
    expect(mockConnectionStatusInit).toHaveBeenCalled();
  });

  it('creates AnchorApp and applies i18n on DOMContentLoaded', async () => {
    await import('../src/modules/anchor/entry');

    expect(capturedDOMContentLoaded).toBeTypeOf('function');
    // Invoke the captured handler directly (avoids duplicate handler issues)
    capturedDOMContentLoaded!(new Event('DOMContentLoaded'));

    expect(mockOnboardingController).toHaveBeenCalled();
    expect(mockAnchorApp).toHaveBeenCalled();
    expect(mockI18NApplyToDOM).toHaveBeenCalled();
  });
});

describe('egzamin/entry.tsx', () => {
  beforeEach(() => {
    vi.resetModules();
    mockCreateRoot.mockClear();
    // Ensure a root element exists
    if (!document.getElementById('root')) {
      const el = document.createElement('div');
      el.id = 'root';
      document.body.appendChild(el);
    }
  });

  afterEach(() => {
    const root = document.getElementById('root');
    if (root) root.remove();
  });

  it('creates a React root and renders into #root', async () => {
    const mockRender = vi.fn();
    mockCreateRoot.mockReturnValue({ render: mockRender });

    await import('../src/modules/egzamin/entry');

    expect(mockCreateRoot).toHaveBeenCalledOnce();
    expect(mockRender).toHaveBeenCalledOnce();
  });

  it('throws when #root is missing', async () => {
    const root = document.getElementById('root');
    if (root) root.remove();

    await expect(import('../src/modules/egzamin/entry')).rejects.toThrow('Root element not found');
  });
});

describe('wachtownik/entry.tsx', () => {
  let capturedLoad: EventListener | null = null;
  const origAddEventListener = window.addEventListener.bind(window);
  const originalServiceWorkerDescriptor = Object.getOwnPropertyDescriptor(window.navigator, 'serviceWorker');

  beforeEach(() => {
    vi.resetModules();
    mockCreateRoot.mockClear();
    capturedLoad = null;

    vi.spyOn(window, 'addEventListener').mockImplementation((type: string, listener: any, options?: any) => {
      if (type === 'load') {
        capturedLoad = listener;
      } else {
        origAddEventListener(type, listener, options);
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalServiceWorkerDescriptor) {
      Object.defineProperty(window.navigator, 'serviceWorker', originalServiceWorkerDescriptor);
    } else {
      delete (window.navigator as Partial<Navigator> & { serviceWorker?: unknown }).serviceWorker;
    }
    const root = document.getElementById('root');
    if (root) root.remove();
  });

  it('creates a React root and renders when container exists', async () => {
    const container = document.createElement('div');
    container.id = 'root';
    document.body.appendChild(container);

    const mockRender = vi.fn();
    mockCreateRoot.mockReturnValue({ render: mockRender });

    await import('../src/modules/wachtownik/entry');

    expect(mockCreateRoot).toHaveBeenCalledOnce();
    expect(mockRender).toHaveBeenCalledOnce();

    container.remove();
  });

  it('registers the service worker on window load and polls for updates', async () => {
    const update = vi.fn();
    const register = vi.fn().mockResolvedValue({
      scope: 'http://localhost/',
      update,
    });
    Object.defineProperty(window.navigator, 'serviceWorker', {
      configurable: true,
      value: { register },
    });
    const setIntervalSpy = vi.spyOn(window, 'setInterval');

    await import('../src/modules/wachtownik/entry');

    expect(capturedLoad).toBeTypeOf('function');
    capturedLoad!(new Event('load'));
    await Promise.resolve();

    expect(register).toHaveBeenCalledWith(import.meta.env.BASE_URL + 'sw.js');
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60_000);

    const refreshRegistration = setIntervalSpy.mock.calls[0]?.[0] as (() => void) | undefined;
    refreshRegistration?.();
    expect(update).toHaveBeenCalledOnce();
  });

  it('does not throw when container is missing', async () => {
    const root = document.getElementById('root');
    if (root) root.remove();

    // Should import without error (the if-guard prevents render)
    await expect(import('../src/modules/wachtownik/entry')).resolves.toBeDefined();
  });
});

describe('zeglowanie/entry.ts', () => {
  beforeEach(() => {
    vi.resetModules();
    mockInitSections.mockClear();
    mockInitPacking.mockClear();
    mockInitBriefing.mockClear();
    mockInitChecklists.mockClear();
    mockSwitchSection.mockClear();
    mockSwitchCruiseType.mockClear();
    mockResetChecklist.mockClear();
    mockSwitchBriefingType.mockClear();
    mockResetBriefingChecklist.mockClear();
    mockSwitchChecklistType.mockClear();
    mockResetChecklistSection.mockClear();
  });

  it('sets theme on documentElement from localStorage', async () => {
    localStorage.setItem('openanchor-theme', 'light');
    await import('../src/modules/zeglowanie/entry');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('initializes all modules on DOMContentLoaded', async () => {
    await import('../src/modules/zeglowanie/entry');

    const event = new Event('DOMContentLoaded');
    document.dispatchEvent(event);

    expect(mockInitSections).toHaveBeenCalled();
    expect(mockInitPacking).toHaveBeenCalled();
    expect(mockInitBriefing).toHaveBeenCalled();
    expect(mockInitChecklists).toHaveBeenCalled();
  });

  it('delegates click events via data-action attributes', async () => {
    await import('../src/modules/zeglowanie/entry');
    document.dispatchEvent(new Event('DOMContentLoaded'));

    const btn = document.createElement('button');
    btn.dataset.action = 'switchSection';
    btn.dataset.arg = 'briefing';
    document.body.appendChild(btn);

    btn.click();
    expect(mockSwitchSection).toHaveBeenCalledWith('briefing');
    btn.remove();
  });
});
