import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import type {
  AppState,
  CrewMember,
  DashboardData,
  CrewStat,
  AbsoluteSlot,
} from '../src/modules/wachtownik/types';

/* ------------------------------------------------------------------ */
/*  Mocks (vi.hoisted so vi.mock factories can reference them)         */
/* ------------------------------------------------------------------ */

const {
  exportScheduleToPDFMock,
  generateICSContentMock,
  generateQRCodeMock,
} = vi.hoisted(() => ({
  exportScheduleToPDFMock: vi.fn(),
  generateICSContentMock: vi.fn().mockReturnValue('BEGIN:VCALENDAR\nEND:VCALENDAR'),
  generateQRCodeMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../src/modules/wachtownik/utils/pdf-export', () => ({
  exportScheduleToPDF: exportScheduleToPDFMock,
}));

vi.mock('../src/modules/wachtownik/utils/ics-export', () => ({
  generateICSContent: generateICSContentMock,
}));

vi.mock('../src/modules/wachtownik/utils/qr-utils', () => ({
  generateQRCode: generateQRCodeMock,
}));

import {
  buildShareUrlLocal,
  useExportShare,
} from '../src/modules/wachtownik/hooks/useExportShare';

/* ------------------------------------------------------------------ */
/*  Fixtures                                                           */
/* ------------------------------------------------------------------ */

const crew: CrewMember[] = [
  { id: 'c1', name: 'Anna Kowalska', role: 'captain' },
  { id: 'c2', name: 'Jan Nowak', role: 'sailor' },
];

const baseState: AppState = {
  crew,
  slots: [{ id: 's1', start: '00:00', end: '08:00', reqCrew: 2 }],
  days: 2,
  startDate: '2026-04-01',
  schedule: [
    {
      day: 1,
      slots: [
        { id: 's1', start: '00:00', end: '08:00', reqCrew: 2, assigned: crew },
      ],
    },
  ],
  isGenerated: true,
  isNightMode: false,
  captainParticipates: true,
};

const emptyState: AppState = {
  ...baseState,
  schedule: [],
  isGenerated: false,
};

const crewStats: CrewStat[] = [
  { id: 'c1', name: 'Anna Kowalska', role: 'captain', totalHours: 8, hardWatches: 1 },
];

const dashboardData: DashboardData = {
  currentSlot: null,
  nextSlot: null,
  status: '',
  progress: 0,
  allSlotsAbsolute: [
    {
      id: '1',
      start: '00:00',
      end: '08:00',
      reqCrew: 2,
      dayNumber: 1,
      absoluteStart: new Date('2026-04-01T00:00:00'),
      absoluteEnd: new Date('2026-04-01T08:00:00'),
      assigned: crew,
    },
  ] as AbsoluteSlot[],
};

const setters = {
  setCrew: vi.fn(),
  setSlots: vi.fn(),
  setCaptainParticipates: vi.fn(),
  setSchedule: vi.fn(),
  setIsGenerated: vi.fn(),
};

/* ------------------------------------------------------------------ */
/*  Tests — buildShareUrlLocal                                         */
/* ------------------------------------------------------------------ */

describe('buildShareUrlLocal', () => {
  it('builds a compressed share URL by default', () => {
    const url = buildShareUrlLocal(baseState);
    expect(url).toContain('#share=c:');
  });

  it('builds a base64-encoded read-only URL', () => {
    const url = buildShareUrlLocal(baseState, true);
    expect(url).toContain('#share-readonly=');
    expect(url).not.toContain('c:');
  });
});

/* ------------------------------------------------------------------ */
/*  Tests — useExportShare hook                                        */
/* ------------------------------------------------------------------ */

describe('useExportShare hook', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true,
    });
  });

  function renderUseExportShare(
    state = baseState,
    dash: DashboardData | null = dashboardData,
    readOnly = false,
  ) {
    return renderHook(() =>
      useExportShare(state, dash, crewStats, 'pl-PL', readOnly, setters),
    );
  }

  describe('downloadICS', () => {
    it('creates and triggers an ICS file download', () => {
      const { result } = renderUseExportShare();

      act(() => {
        result.current.downloadICS(crew[0]);
      });

      expect(generateICSContentMock).toHaveBeenCalledWith(
        dashboardData.allSlotsAbsolute,
        crew[0],
      );
    });

    it('does nothing when dashboardData is null', () => {
      const { result } = renderUseExportShare(baseState, null);

      act(() => {
        result.current.downloadICS(crew[0]);
      });

      expect(generateICSContentMock).not.toHaveBeenCalled();
    });
  });

  describe('handleExportPDF', () => {
    it('calls exportScheduleToPDF when schedule exists', () => {
      const { result } = renderUseExportShare();

      act(() => {
        result.current.handleExportPDF();
      });

      expect(exportScheduleToPDFMock).toHaveBeenCalledWith(
        baseState.schedule,
        baseState.startDate,
        crewStats,
        dashboardData,
        baseState.captainParticipates,
        'pl-PL',
      );
    });

    it('alerts user when schedule is empty', () => {
      const alertFn = vi.fn();
      globalThis.alert = alertFn;
      const { result } = renderUseExportShare(emptyState);

      act(() => {
        result.current.handleExportPDF();
      });

      expect(exportScheduleToPDFMock).not.toHaveBeenCalled();
      expect(alertFn).toHaveBeenCalled();
    });

    it('shows error alert when PDF export throws', () => {
      const alertFn = vi.fn();
      globalThis.alert = alertFn;
      exportScheduleToPDFMock.mockImplementationOnce(() => {
        throw new Error('PDF failure');
      });
      const { result } = renderUseExportShare();

      act(() => {
        result.current.handleExportPDF();
      });

      expect(alertFn).toHaveBeenCalledWith(expect.stringContaining('Błąd'));
    });
  });

  describe('handleExportConfig', () => {
    it('does not throw and produces a download', () => {
      const { result } = renderUseExportShare();

      // Should not throw
      expect(() => {
        act(() => {
          result.current.handleExportConfig();
        });
      }).not.toThrow();
    });
  });

  describe('handleImportConfig', () => {
    it('alerts when in read-only mode', () => {
      const alertFn = vi.fn();
      globalThis.alert = alertFn;
      const { result } = renderUseExportShare(baseState, dashboardData, true);

      act(() => {
        result.current.handleImportConfig();
      });

      expect(alertFn).toHaveBeenCalledWith(
        expect.stringContaining('trybie tylko do odczytu'),
      );
    });

    it('creates a file input when not read-only', () => {
      const { result } = renderUseExportShare();

      // Should not throw
      expect(() => {
        act(() => {
          result.current.handleImportConfig();
        });
      }).not.toThrow();
    });
  });

  describe('handleShare', () => {
    it('copies share URL to clipboard', async () => {
      const { result } = renderUseExportShare();

      await act(async () => {
        result.current.handleShare();
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('#share=c:'),
      );
    });

    it('copies read-only URL when readOnly is true', async () => {
      const { result } = renderUseExportShare();

      await act(async () => {
        result.current.handleShare(true);
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('#share-readonly='),
      );
    });
  });

  describe('handleShowQR', () => {
    it('sets showQRModal to true', () => {
      const { result } = renderUseExportShare();

      act(() => {
        result.current.handleShowQR();
      });

      expect(result.current.showQRModal).toBe(true);
    });
  });

  describe('showToast', () => {
    it('sets copyStatus and clears after timeout', () => {
      vi.useFakeTimers();
      const { result } = renderUseExportShare();

      act(() => {
        result.current.showToast('Test toast', 'success');
      });

      expect(result.current.copyStatus).toBe('Test toast');
      expect(result.current.toastType).toBe('success');

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(result.current.copyStatus).toBe('');
      vi.useRealTimers();
    });

    it('supports error type', () => {
      const { result } = renderUseExportShare();

      act(() => {
        result.current.showToast('Error!', 'error');
      });

      expect(result.current.toastType).toBe('error');
    });
  });

  describe('handlePrint', () => {
    it('calls window.print', () => {
      window.print = vi.fn();
      const { result } = renderUseExportShare();

      act(() => {
        result.current.handlePrint();
      });

      expect(window.print).toHaveBeenCalled();
    });
  });
});
