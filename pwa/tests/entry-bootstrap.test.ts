import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ═══════════════════════════════════════════════════════════════════════════
// Mocks — declared before any dynamic imports
// ═══════════════════════════════════════════════════════════════════════════

// ── main.ts deps ─────────────────────────────────────────────────────────
const mockInitDashboard = vi.fn();
vi.mock('../src/modules/dashboard/dashboard-ui', () => ({
  initDashboard: mockInitDashboard,
}));

// ── anchor/entry deps (React) ────────────────────────────────────────────
vi.mock('../src/modules/anchor/AnchorShell', () => ({
  AnchorShell: () => null,
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

// ── zeglowanie/entry deps (now React — mocks for App) ───────────────────
vi.mock('../src/modules/zeglowanie/App', () => ({
  default: () => null,
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

describe('anchor/entry.tsx', () => {
  beforeEach(() => {
    vi.resetModules();
    mockCreateRoot.mockClear();
  });

  afterEach(() => {
    const root = document.getElementById('root');
    if (root) root.remove();
  });

  it('creates a React root and renders into #root', async () => {
    const container = document.createElement('div');
    container.id = 'root';
    document.body.appendChild(container);

    const mockRender = vi.fn();
    mockCreateRoot.mockReturnValue({ render: mockRender });

    await import('../src/modules/anchor/entry');

    expect(mockCreateRoot).toHaveBeenCalledOnce();
    expect(mockRender).toHaveBeenCalledOnce();
  });

  it('throws when #root is missing', async () => {
    const root = document.getElementById('root');
    if (root) root.remove();

    await expect(import('../src/modules/anchor/entry')).rejects.toThrow('Root element not found');
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

describe('zeglowanie/entry.tsx', () => {
  beforeEach(() => {
    vi.resetModules();
    mockCreateRoot.mockClear();
  });

  it('sets theme on documentElement from localStorage', async () => {
    localStorage.setItem('openanchor-theme', 'light');
    await import('../src/modules/zeglowanie/entry');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('creates a React root and renders when #root exists', async () => {
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);
    const mockRender = vi.fn();
    mockCreateRoot.mockReturnValueOnce({ render: mockRender });

    await import('../src/modules/zeglowanie/entry');
    expect(mockCreateRoot).toHaveBeenCalledWith(root);
    expect(mockRender).toHaveBeenCalled();
    root.remove();
  });
});
