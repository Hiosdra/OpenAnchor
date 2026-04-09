/**
 * Deep branch-coverage tests for useExportShare hook.
 *
 * Mocks heavy dependencies (pdf-export, ics-export, qr-utils) so the hook
 * can be imported without pulling in jsPDF, QRCode, etc.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import type {
  CrewMember,
  DaySchedule,
  DashboardData,
  AppState,
} from '../src/modules/wachtownik/types';

// ── Mock heavy dependencies BEFORE importing the hook ────────────────

vi.mock('../src/modules/wachtownik/utils/pdf-export', () => ({
  exportScheduleToPDF: vi.fn(),
}));

vi.mock('../src/modules/wachtownik/utils/ics-export', () => ({
  generateICSContent: vi.fn(() => 'BEGIN:VCALENDAR\nEND:VCALENDAR'),
}));

vi.mock('../src/modules/wachtownik/utils/qr-utils', () => ({
  generateQRCode: vi.fn(),
}));

// ── Fixtures ─────────────────────────────────────────────────────────

const crew: CrewMember[] = [
  { id: 'c1', name: 'Anna Kowalska', role: 'captain' },
  { id: 'c2', name: 'Michał', role: 'sailor' },
];

function makeSchedule(): DaySchedule[] {
  return [
    {
      day: 1,
      slots: [
        { id: 's1', start: '00:00', end: '06:00', reqCrew: 2, assigned: [crew[0], crew[1]] },
        { id: 's2', start: '06:00', end: '12:00', reqCrew: 2, assigned: [crew[0], crew[1]] },
      ],
    },
  ];
}

const baseState: AppState = {
  crew: [crew[0]],
  slots: [{ id: 's1', start: '00:00', end: '06:00', reqCrew: 1 }],
  days: 1,
  startDate: '2026-04-01',
  schedule: [],
  isGenerated: false,
  isNightMode: false,
  captainParticipates: true,
};

function makeSetters() {
  return {
    setCrew: vi.fn(),
    setSlots: vi.fn(),
    setCaptainParticipates: vi.fn(),
    setSchedule: vi.fn(),
    setIsGenerated: vi.fn(),
  };
}

// ── Tests ────────────────────────────────────────────────────────────

describe('useExportShare — deep branch coverage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    (globalThis as any).alert = vi.fn();
    (globalThis as any).URL.createObjectURL = vi.fn(() => 'blob:mock');
    (globalThis as any).URL.revokeObjectURL = vi.fn();
    // clipboard mock
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn(() => Promise.resolve()) },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ---- downloadICS -------------------------------------------------

  it('downloadICS early-returns when dashboardData is null', async () => {
    const { useExportShare } = await import('../src/modules/wachtownik/hooks/useExportShare');
    const setters = makeSetters();

    const { result } = renderHook(() =>
      useExportShare(baseState, null, [], 'pl-PL', false, setters),
    );

    act(() => {
      result.current.downloadICS(crew[0]);
    });
    // generateICSContent should NOT have been called
    const { generateICSContent } = await import('../src/modules/wachtownik/utils/ics-export');
    expect(generateICSContent).not.toHaveBeenCalled();
  });

  it('downloadICS creates ICS file when dashboardData is present', async () => {
    const { useExportShare } = await import('../src/modules/wachtownik/hooks/useExportShare');
    const { generateICSContent } = await import('../src/modules/wachtownik/utils/ics-export');
    vi.mocked(generateICSContent).mockClear();

    const setters = makeSetters();
    const dashboard: DashboardData = {
      currentSlot: null,
      nextSlot: null,
      status: 'W TRAKCIE',
      progress: 50,
      allSlotsAbsolute: [],
    };

    const { result } = renderHook(() =>
      useExportShare(baseState, dashboard, [], 'pl-PL', false, setters),
    );

    act(() => {
      result.current.downloadICS(crew[0]);
    });

    expect(generateICSContent).toHaveBeenCalledWith([], crew[0]);
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  });

  // ---- handleExportPDF ---------------------------------------------

  it('handleExportPDF alerts when not generated', async () => {
    const { useExportShare } = await import('../src/modules/wachtownik/hooks/useExportShare');
    const setters = makeSetters();

    const { result } = renderHook(() =>
      useExportShare(baseState, null, [], 'pl-PL', false, setters),
    );

    act(() => {
      result.current.handleExportPDF();
    });
    expect(globalThis.alert).toHaveBeenCalled();
  });

  it('handleExportPDF alerts when schedule is empty', async () => {
    const { useExportShare } = await import('../src/modules/wachtownik/hooks/useExportShare');
    const setters = makeSetters();
    const state = { ...baseState, isGenerated: true, schedule: [] };

    const { result } = renderHook(() => useExportShare(state, null, [], 'pl-PL', false, setters));

    act(() => {
      result.current.handleExportPDF();
    });
    expect(globalThis.alert).toHaveBeenCalled();
  });

  it('handleExportPDF succeeds with generated schedule', async () => {
    const { useExportShare } = await import('../src/modules/wachtownik/hooks/useExportShare');
    const { exportScheduleToPDF } = await import('../src/modules/wachtownik/utils/pdf-export');
    vi.mocked(exportScheduleToPDF).mockClear();

    const setters = makeSetters();
    const state = { ...baseState, isGenerated: true, schedule: makeSchedule() };

    const { result } = renderHook(() => useExportShare(state, null, [], 'pl-PL', false, setters));

    act(() => {
      result.current.handleExportPDF();
    });
    expect(exportScheduleToPDF).toHaveBeenCalled();
    expect(result.current.copyStatus).toContain('PDF');
  });

  it('handleExportPDF catches thrown error', async () => {
    const { useExportShare } = await import('../src/modules/wachtownik/hooks/useExportShare');
    const { exportScheduleToPDF } = await import('../src/modules/wachtownik/utils/pdf-export');
    vi.mocked(exportScheduleToPDF).mockImplementationOnce(() => {
      throw new Error('pdf boom');
    });

    const setters = makeSetters();
    const state = { ...baseState, isGenerated: true, schedule: makeSchedule() };

    const { result } = renderHook(() => useExportShare(state, null, [], 'pl-PL', false, setters));

    act(() => {
      result.current.handleExportPDF();
    });
    expect(globalThis.alert).toHaveBeenCalledWith(expect.stringContaining('Błąd'));
  });

  // ---- handleExportConfig ------------------------------------------

  it('handleExportConfig downloads config JSON', async () => {
    const { useExportShare } = await import('../src/modules/wachtownik/hooks/useExportShare');
    const setters = makeSetters();

    const { result } = renderHook(() =>
      useExportShare(baseState, null, [], 'pl-PL', false, setters),
    );

    const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((n) => n);
    const removeSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((n) => n);

    act(() => {
      result.current.handleExportConfig();
    });

    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(result.current.copyStatus).toContain('wyeksportowana');
    appendSpy.mockRestore();
    removeSpy.mockRestore();
  });

  // ---- handleImportConfig ------------------------------------------

  /**
   * Trigger handleImportConfig and simulate the File input + FileReader flow.
   * We mock FileReader so that .readAsText() synchronously invokes .onload().
   */
  function triggerImport(
    result: {
      current: ReturnType<
        typeof import('../src/modules/wachtownik/hooks/useExportShare').useExportShare
      >;
    },
    jsonContent: string,
  ) {
    // Mock FileReader to invoke onload synchronously
    const OrigReader = globalThis.FileReader;
    class MockFileReader {
      result: string | null = null;
      onload: ((ev: any) => void) | null = null;
      readAsText(_file: File) {
        this.result = jsonContent;
        if (this.onload) this.onload({ target: this } as any);
      }
    }
    (globalThis as any).FileReader = MockFileReader;

    const origCreate = document.createElement.bind(document);
    let capturedInput: HTMLInputElement | null = null;
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = origCreate(tag);
      if (tag === 'input') capturedInput = el as HTMLInputElement;
      return el;
    });

    act(() => {
      result.current.handleImportConfig();
    });

    if (!capturedInput) throw new Error('No input captured');

    const file = new File([jsonContent], 'config.json', { type: 'application/json' });
    Object.defineProperty(capturedInput, 'files', { value: [file] });

    const changeEvent = new Event('change');
    Object.defineProperty(changeEvent, 'target', { value: capturedInput });

    act(() => {
      capturedInput!.onchange?.(changeEvent);
    });

    // Restore FileReader
    globalThis.FileReader = OrigReader;
  }

  it('handleImportConfig blocks in read-only mode', async () => {
    const { useExportShare } = await import('../src/modules/wachtownik/hooks/useExportShare');
    const setters = makeSetters();

    const { result } = renderHook(() =>
      useExportShare(baseState, null, [], 'pl-PL', true, setters),
    );

    act(() => {
      result.current.handleImportConfig();
    });
    expect(globalThis.alert).toHaveBeenCalledWith(expect.stringContaining('odczytu'));
  });

  it('handleImportConfig processes valid config file', async () => {
    const { useExportShare } = await import('../src/modules/wachtownik/hooks/useExportShare');
    const setters = makeSetters();

    const { result } = renderHook(() =>
      useExportShare(baseState, null, [], 'pl-PL', false, setters),
    );

    const validConfig = JSON.stringify({
      crew: [{ id: 'c1', name: 'Test', role: 'sailor' }],
      slots: [{ id: 's1', start: '00:00', end: '06:00', reqCrew: 1 }],
      captainParticipates: true,
    });

    triggerImport(result, validConfig);

    expect(setters.setCrew).toHaveBeenCalled();
    expect(setters.setSlots).toHaveBeenCalled();
    expect(setters.setCaptainParticipates).toHaveBeenCalledWith(true);
    expect(setters.setSchedule).toHaveBeenCalledWith([]);
    expect(setters.setIsGenerated).toHaveBeenCalledWith(false);
  });

  it('handleImportConfig processes config without captainParticipates', async () => {
    const { useExportShare } = await import('../src/modules/wachtownik/hooks/useExportShare');
    const setters = makeSetters();

    const { result } = renderHook(() =>
      useExportShare(baseState, null, [], 'pl-PL', false, setters),
    );

    const config = JSON.stringify({
      crew: [{ id: 'c1', name: 'Test', role: 'sailor' }],
      slots: [{ id: 's1', start: '00:00', end: '06:00', reqCrew: 1 }],
    });

    triggerImport(result, config);

    expect(setters.setCrew).toHaveBeenCalled();
    expect(setters.setCaptainParticipates).not.toHaveBeenCalled();
  });

  it('handleImportConfig rejects non-object JSON', async () => {
    const { useExportShare } = await import('../src/modules/wachtownik/hooks/useExportShare');
    const setters = makeSetters();

    const { result } = renderHook(() =>
      useExportShare(baseState, null, [], 'pl-PL', false, setters),
    );

    triggerImport(result, '"just a string"');

    expect(globalThis.alert).toHaveBeenCalledWith(expect.stringContaining('Błąd'));
    expect(setters.setCrew).not.toHaveBeenCalled();
  });

  it('handleImportConfig rejects config with crew not an array', async () => {
    const { useExportShare } = await import('../src/modules/wachtownik/hooks/useExportShare');
    const setters = makeSetters();

    const { result } = renderHook(() =>
      useExportShare(baseState, null, [], 'pl-PL', false, setters),
    );

    triggerImport(result, JSON.stringify({ crew: 'not-array', slots: [] }));

    expect(globalThis.alert).toHaveBeenCalled();
    expect(setters.setCrew).not.toHaveBeenCalled();
  });

  it('handleImportConfig rejects crew with non-object items', async () => {
    const { useExportShare } = await import('../src/modules/wachtownik/hooks/useExportShare');
    const setters = makeSetters();

    const { result } = renderHook(() =>
      useExportShare(baseState, null, [], 'pl-PL', false, setters),
    );

    triggerImport(
      result,
      JSON.stringify({
        crew: ['string', 42, null],
        slots: [{ id: 's1', start: '00:00', end: '06:00', reqCrew: 1 }],
      }),
    );

    expect(globalThis.alert).toHaveBeenCalled();
    expect(setters.setCrew).not.toHaveBeenCalled();
  });

  it('handleImportConfig rejects slots with nested arrays', async () => {
    const { useExportShare } = await import('../src/modules/wachtownik/hooks/useExportShare');
    const setters = makeSetters();

    const { result } = renderHook(() =>
      useExportShare(baseState, null, [], 'pl-PL', false, setters),
    );

    triggerImport(
      result,
      JSON.stringify({
        crew: [{ id: 'c1', name: 'Test', role: 'sailor' }],
        slots: [[1, 2, 3]], // arrays are not valid objects
      }),
    );

    expect(globalThis.alert).toHaveBeenCalled();
    expect(setters.setCrew).not.toHaveBeenCalled();
  });

  it('handleImportConfig handles no file selected', async () => {
    const { useExportShare } = await import('../src/modules/wachtownik/hooks/useExportShare');
    const setters = makeSetters();

    const { result } = renderHook(() =>
      useExportShare(baseState, null, [], 'pl-PL', false, setters),
    );

    const origCreate = document.createElement.bind(document);
    let capturedInput: HTMLInputElement | null = null;
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = origCreate(tag);
      if (tag === 'input') capturedInput = el as HTMLInputElement;
      return el;
    });

    act(() => {
      result.current.handleImportConfig();
    });

    // Simulate change event with empty files
    Object.defineProperty(capturedInput!, 'files', { value: [] });
    const changeEvent = new Event('change');
    Object.defineProperty(changeEvent, 'target', { value: capturedInput });
    act(() => {
      capturedInput!.onchange?.(changeEvent);
    });

    expect(setters.setCrew).not.toHaveBeenCalled();
  });

  // ---- handleShare -------------------------------------------------

  it('handleShare copies editable URL', async () => {
    const { useExportShare } = await import('../src/modules/wachtownik/hooks/useExportShare');
    const setters = makeSetters();

    const { result } = renderHook(() =>
      useExportShare(baseState, null, [], 'pl-PL', false, setters),
    );

    await act(async () => {
      result.current.handleShare();
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  it('handleShare copies read-only URL', async () => {
    const { useExportShare } = await import('../src/modules/wachtownik/hooks/useExportShare');
    const setters = makeSetters();

    const { result } = renderHook(() =>
      useExportShare(baseState, null, [], 'pl-PL', false, setters),
    );

    await act(async () => {
      result.current.handleShare(true);
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  // ---- handleShowQR ------------------------------------------------

  it('handleShowQR opens QR modal', async () => {
    const { useExportShare } = await import('../src/modules/wachtownik/hooks/useExportShare');
    const setters = makeSetters();

    const { result } = renderHook(() =>
      useExportShare(baseState, null, [], 'pl-PL', false, setters),
    );

    act(() => {
      result.current.handleShowQR();
    });
    expect(result.current.showQRModal).toBe(true);
    expect(result.current.qrError).toBe('');
  });

  // ---- showToast ---------------------------------------------------

  it('showToast sets message and clears after timeout', async () => {
    const { useExportShare } = await import('../src/modules/wachtownik/hooks/useExportShare');
    const setters = makeSetters();

    const { result } = renderHook(() =>
      useExportShare(baseState, null, [], 'pl-PL', false, setters),
    );

    act(() => {
      result.current.showToast('Hello');
    });
    expect(result.current.copyStatus).toBe('Hello');
    expect(result.current.toastType).toBe('success');

    act(() => {
      vi.advanceTimersByTime(3100);
    });
    expect(result.current.copyStatus).toBe('');
  });

  it('showToast with error type replaces previous toast', async () => {
    const { useExportShare } = await import('../src/modules/wachtownik/hooks/useExportShare');
    const setters = makeSetters();

    const { result } = renderHook(() =>
      useExportShare(baseState, null, [], 'pl-PL', false, setters),
    );

    act(() => {
      result.current.showToast('First');
    });
    expect(result.current.copyStatus).toBe('First');

    // Replace before timeout
    act(() => {
      result.current.showToast('Second', 'error');
    });
    expect(result.current.copyStatus).toBe('Second');
    expect(result.current.toastType).toBe('error');
  });

  // ---- cleanup effect ----------------------------------------------

  it('cleans up toast timer on unmount', async () => {
    const { useExportShare } = await import('../src/modules/wachtownik/hooks/useExportShare');
    const setters = makeSetters();

    const { result, unmount } = renderHook(() =>
      useExportShare(baseState, null, [], 'pl-PL', false, setters),
    );

    act(() => {
      result.current.showToast('Active');
    });

    unmount();
    // Should not throw — cleanup clears the timer
  });

  // ---- handlePrint -------------------------------------------------

  it('handlePrint calls window.print', async () => {
    const { useExportShare } = await import('../src/modules/wachtownik/hooks/useExportShare');
    const setters = makeSetters();
    (window as any).print = vi.fn();

    const { result } = renderHook(() =>
      useExportShare(baseState, null, [], 'pl-PL', false, setters),
    );

    act(() => {
      result.current.handlePrint();
    });
    expect(window.print).toHaveBeenCalled();
  });
});
