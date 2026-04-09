import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

import { useSessionHistory } from '../src/modules/anchor/hooks/useSessionHistory';

// ─── Helpers ──────────────────────────────────────────────────────

const mockSession = (sessionId = 1) => ({
  id: sessionId,
  anchorLat: 54,
  anchorLng: 18,
  radius: 50,
  bufferRadius: 60,
  sectorEnabled: false,
  sectorBearing: 0,
  sectorWidth: 90,
  startTime: Date.now() - 3600000,
  endTime: Date.now(),
  chainLengthM: null,
  depthM: null,
  alarmTriggered: false,
  alarmCount: 0,
  maxDistance: 20,
  maxSog: 0.5,
});

const mockTrackPoints = (n = 3) =>
  Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    sessionId: 1,
    lat: 54 + i * 0.0001,
    lng: 18 + i * 0.0001,
    accuracy: 5,
    timestamp: Date.now() - (n - i) * 1000,
    distance: i * 5,
    alarmState: 'SAFE',
  }));

function makeSessionOps(overrides: Record<string, any> = {}) {
  return {
    getSessionHistory: vi.fn().mockResolvedValue([mockSession(1), mockSession(2)]),
    getSessionReplay: vi.fn().mockResolvedValue({
      session: mockSession(1),
      points: mockTrackPoints(),
    }),
    deleteSession: vi.fn().mockResolvedValue(undefined),
    getStats: vi.fn().mockResolvedValue({
      totalSessions: 5,
      totalAlarms: 2,
      totalDuration: 36000000,
      avgDuration: 7200000,
      maxDistance: 45,
      maxSog: 2.1,
    }),
    db: {
      current: {
        db: {
          getLogbookEntries: vi
            .fn()
            .mockResolvedValue([
              {
                id: 1,
                sessionId: 1,
                createdAt: Date.now(),
                summary: 'test',
                logEntry: 'log',
                safetyNote: '',
                isAiGenerated: false,
              },
            ]),
        },
      },
    },
    ...overrides,
  };
}

// ─── Mock DOM APIs ────────────────────────────────────────────────

let mockAnchorElement: { href: string; download: string; click: ReturnType<typeof vi.fn> };
let revokeObjectURLSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockAnchorElement = { href: '', download: '', click: vi.fn() };
  const origCreateElement = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation((tag: string, options?: any) => {
    if (tag === 'a') return mockAnchorElement as any;
    return origCreateElement(tag, options);
  });
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
  revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(global, 'Blob').mockImplementation(function (parts?: any[], options?: any) {
    return { parts, options, size: 0, type: options?.type ?? '' } as any;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────

describe('useSessionHistory', () => {
  // ── loadHistory ──

  describe('loadHistory', () => {
    it('loads sessions on success', async () => {
      const ops = makeSessionOps();
      const { result } = renderHook(() =>
        useSessionHistory({ session: ops, isSessionModalOpen: true, isStatsModalOpen: false }),
      );

      await waitFor(() => expect(result.current.sessionsLoading).toBe(false));
      expect(result.current.sessions).toHaveLength(2);
    });

    it('sets empty array on error', async () => {
      const ops = makeSessionOps();
      ops.getSessionHistory.mockRejectedValue(new Error('DB error'));
      const { result } = renderHook(() =>
        useSessionHistory({ session: ops, isSessionModalOpen: true, isStatsModalOpen: false }),
      );

      await waitFor(() => expect(result.current.sessionsLoading).toBe(false));
      expect(result.current.sessions).toEqual([]);
    });

    it('clears replayData when loading', async () => {
      const ops = makeSessionOps();
      const { result } = renderHook(() =>
        useSessionHistory({ session: ops, isSessionModalOpen: true, isStatsModalOpen: false }),
      );

      await waitFor(() => expect(result.current.sessionsLoading).toBe(false));
      expect(result.current.replayData).toBeNull();
    });
  });

  // ── handleReplaySession ──

  describe('handleReplaySession', () => {
    it('sets replayData with session, points, and logEntries', async () => {
      const ops = makeSessionOps();
      const { result } = renderHook(() =>
        useSessionHistory({ session: ops, isSessionModalOpen: false, isStatsModalOpen: false }),
      );

      await act(async () => {
        await result.current.handleReplaySession(1);
      });

      expect(result.current.replayData).not.toBeNull();
      expect(result.current.replayData!.session.id).toBe(1);
      expect(result.current.replayData!.points).toHaveLength(3);
      expect(result.current.replayData!.logEntries).toHaveLength(1);
    });

    it('returns early when session is undefined', async () => {
      const ops = makeSessionOps();
      ops.getSessionReplay.mockResolvedValue({ session: undefined, points: [] });
      const { result } = renderHook(() =>
        useSessionHistory({ session: ops, isSessionModalOpen: false, isStatsModalOpen: false }),
      );

      await act(async () => {
        await result.current.handleReplaySession(999);
      });

      expect(result.current.replayData).toBeNull();
    });

    it('loads logEntries from db when db.db exists', async () => {
      const ops = makeSessionOps();
      const { result } = renderHook(() =>
        useSessionHistory({ session: ops, isSessionModalOpen: false, isStatsModalOpen: false }),
      );

      await act(async () => {
        await result.current.handleReplaySession(1);
      });

      expect(ops.db.current.db.getLogbookEntries).toHaveBeenCalledWith(1);
    });

    it('uses empty logEntries when db.db is null', async () => {
      const ops = makeSessionOps({ db: { current: { db: null } } });
      const { result } = renderHook(() =>
        useSessionHistory({ session: ops, isSessionModalOpen: false, isStatsModalOpen: false }),
      );

      await act(async () => {
        await result.current.handleReplaySession(1);
      });

      expect(result.current.replayData!.logEntries).toEqual([]);
    });

    it('uses empty logEntries when getLogbookEntries throws', async () => {
      const ops = makeSessionOps();
      ops.db.current.db.getLogbookEntries.mockRejectedValue(new Error('fail'));
      const { result } = renderHook(() =>
        useSessionHistory({ session: ops, isSessionModalOpen: false, isStatsModalOpen: false }),
      );

      await act(async () => {
        await result.current.handleReplaySession(1);
      });

      expect(result.current.replayData!.logEntries).toEqual([]);
    });
  });

  // ── handleExportGPX ──

  describe('handleExportGPX', () => {
    it('exports GPX file with track points', async () => {
      const ops = makeSessionOps();
      const { result } = renderHook(() =>
        useSessionHistory({ session: ops, isSessionModalOpen: false, isStatsModalOpen: false }),
      );

      await act(async () => {
        await result.current.handleExportGPX(1);
      });

      expect(mockAnchorElement.click).toHaveBeenCalled();
      expect(mockAnchorElement.download).toContain('anchor-session-1.gpx');
      expect(revokeObjectURLSpy).toHaveBeenCalled();
    });

    it('returns early when session is null/undefined', async () => {
      const ops = makeSessionOps();
      ops.getSessionReplay.mockResolvedValue({ session: undefined, points: mockTrackPoints() });
      const { result } = renderHook(() =>
        useSessionHistory({ session: ops, isSessionModalOpen: false, isStatsModalOpen: false }),
      );

      await act(async () => {
        await result.current.handleExportGPX(1);
      });

      expect(mockAnchorElement.click).not.toHaveBeenCalled();
    });

    it('returns early when points array is empty', async () => {
      const ops = makeSessionOps();
      ops.getSessionReplay.mockResolvedValue({ session: mockSession(1), points: [] });
      const { result } = renderHook(() =>
        useSessionHistory({ session: ops, isSessionModalOpen: false, isStatsModalOpen: false }),
      );

      await act(async () => {
        await result.current.handleExportGPX(1);
      });

      expect(mockAnchorElement.click).not.toHaveBeenCalled();
    });
  });

  // ── handleExportCSV ──

  describe('handleExportCSV', () => {
    it('exports CSV file with track points', async () => {
      const ops = makeSessionOps();
      const { result } = renderHook(() =>
        useSessionHistory({ session: ops, isSessionModalOpen: false, isStatsModalOpen: false }),
      );

      await act(async () => {
        await result.current.handleExportCSV(1);
      });

      expect(mockAnchorElement.click).toHaveBeenCalled();
      expect(mockAnchorElement.download).toContain('anchor-session-1.csv');
    });

    it('returns early when points array is empty', async () => {
      const ops = makeSessionOps();
      ops.getSessionReplay.mockResolvedValue({ session: mockSession(1), points: [] });
      const { result } = renderHook(() =>
        useSessionHistory({ session: ops, isSessionModalOpen: false, isStatsModalOpen: false }),
      );

      await act(async () => {
        await result.current.handleExportCSV(1);
      });

      expect(mockAnchorElement.click).not.toHaveBeenCalled();
    });
  });

  // ── handleDeleteSession ──

  describe('handleDeleteSession', () => {
    it('removes session from list', async () => {
      const ops = makeSessionOps();
      const { result } = renderHook(() =>
        useSessionHistory({ session: ops, isSessionModalOpen: true, isStatsModalOpen: false }),
      );

      await waitFor(() => expect(result.current.sessions).toHaveLength(2));

      await act(async () => {
        await result.current.handleDeleteSession(1);
      });

      expect(result.current.sessions).toHaveLength(1);
      expect(result.current.sessions[0].id).toBe(2);
    });

    it('clears replayData when deleted session matches current replay', async () => {
      const ops = makeSessionOps();
      const { result } = renderHook(() =>
        useSessionHistory({ session: ops, isSessionModalOpen: false, isStatsModalOpen: false }),
      );

      // First replay a session
      await act(async () => {
        await result.current.handleReplaySession(1);
      });
      expect(result.current.replayData).not.toBeNull();

      // Delete the same session
      await act(async () => {
        await result.current.handleDeleteSession(1);
      });

      expect(result.current.replayData).toBeNull();
    });

    it('does not clear replayData when deleted session does not match', async () => {
      const ops = makeSessionOps();
      const { result } = renderHook(() =>
        useSessionHistory({ session: ops, isSessionModalOpen: false, isStatsModalOpen: false }),
      );

      // Replay session 1
      await act(async () => {
        await result.current.handleReplaySession(1);
      });

      // Delete session 2 (different)
      await act(async () => {
        await result.current.handleDeleteSession(2);
      });

      expect(result.current.replayData).not.toBeNull();
    });
  });

  // ── loadStats ──

  describe('loadStats', () => {
    it('loads stats on success', async () => {
      const ops = makeSessionOps();
      const { result } = renderHook(() =>
        useSessionHistory({ session: ops, isSessionModalOpen: false, isStatsModalOpen: true }),
      );

      await waitFor(() => expect(result.current.statsData).not.toBeNull());
      expect(result.current.statsData!.totalSessions).toBe(5);
      expect(result.current.statsData!.maxDistance).toBe(45);
    });

    it('sets null on error', async () => {
      const ops = makeSessionOps();
      ops.getStats.mockRejectedValue(new Error('fail'));
      const { result } = renderHook(() =>
        useSessionHistory({ session: ops, isSessionModalOpen: false, isStatsModalOpen: true }),
      );

      await waitFor(() => {
        // After the error settles, statsData should be null
        expect(ops.getStats).toHaveBeenCalled();
      });
      // Give time for the catch block
      await new Promise((r) => setTimeout(r, 50));
      expect(result.current.statsData).toBeNull();
    });
  });

  // ── Auto-load effects ──

  describe('auto-load effects', () => {
    it('loads history when isSessionModalOpen becomes true', async () => {
      const ops = makeSessionOps();
      const { rerender } = renderHook(
        ({ open }) =>
          useSessionHistory({
            session: ops,
            isSessionModalOpen: open,
            isStatsModalOpen: false,
          }),
        { initialProps: { open: false } },
      );

      expect(ops.getSessionHistory).not.toHaveBeenCalled();

      rerender({ open: true });
      await waitFor(() => expect(ops.getSessionHistory).toHaveBeenCalled());
    });

    it('loads stats when isStatsModalOpen becomes true', async () => {
      const ops = makeSessionOps();
      const { rerender } = renderHook(
        ({ open }) =>
          useSessionHistory({
            session: ops,
            isSessionModalOpen: false,
            isStatsModalOpen: open,
          }),
        { initialProps: { open: false } },
      );

      expect(ops.getStats).not.toHaveBeenCalled();

      rerender({ open: true });
      await waitFor(() => expect(ops.getStats).toHaveBeenCalled());
    });

    it('does not load when modals stay closed', () => {
      const ops = makeSessionOps();
      renderHook(() =>
        useSessionHistory({
          session: ops,
          isSessionModalOpen: false,
          isStatsModalOpen: false,
        }),
      );

      expect(ops.getSessionHistory).not.toHaveBeenCalled();
      expect(ops.getStats).not.toHaveBeenCalled();
    });
  });
});
