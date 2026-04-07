import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import 'fake-indexeddb/auto';

vi.mock('leaflet', () => ({
  default: { latLng: (lat: number, lng: number) => ({ lat, lng }) },
  latLng: (lat: number, lng: number) => ({ lat, lng }),
}));

import { useSession } from '../src/modules/anchor/hooks/useSession';
import { SessionDB } from '../src/modules/anchor/session-db';
import type { AnchorSession, TrackPoint, ActiveState } from '../src/modules/anchor/session-db';

// --- Helpers ---

function makeSessionState(overrides: Record<string, unknown> = {}) {
  return {
    isAnchored: true,
    anchorPos: { lat: 54.35, lng: 18.65 },
    radius: 50,
    bufferRadius: null as number | null,
    sectorEnabled: false,
    sectorBearing: 0,
    sectorWidth: 90,
    sessionId: null as number | null,
    anchorStartTime: 1000000,
    maxDistanceSwing: 0,
    maxSogDuringAnchor: 0,
    chainLengthM: null as number | null,
    depthM: null as number | null,
    unit: 'm',
    ...overrides,
  };
}

function makeTrackPoint(
  sessionId: number,
  overrides: Partial<TrackPoint> = {},
): Omit<TrackPoint, 'id'> {
  return {
    sessionId,
    lat: 54.35,
    lng: 18.65,
    accuracy: 5,
    timestamp: Date.now(),
    distance: 10,
    alarmState: 'SAFE',
    ...overrides,
  };
}

function makeActiveState(
  overrides: Partial<ActiveState> = {},
): Omit<ActiveState, 'key'> {
  return {
    isAnchored: true,
    anchorLat: 54.35,
    anchorLng: 18.65,
    radius: 50,
    bufferRadius: null,
    sectorEnabled: false,
    sectorBearing: 0,
    sectorWidth: 90,
    sessionId: 1,
    anchorStartTime: 1000000,
    maxDistanceSwing: 20,
    maxSogDuringAnchor: 1.2,
    chainLengthM: null,
    depthM: null,
    unit: 'm',
    ...overrides,
  };
}

const pos = { lat: 54.35, lng: 18.65 } as L.LatLng;

/** Track open DB connections so we can close them in afterEach. */
const openConnections: IDBDatabase[] = [];

function closeAllConnections() {
  for (const conn of openConnections) {
    try { conn.close(); } catch { /* already closed */ }
  }
  openConnections.length = 0;
}

async function deleteDB() {
  return new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase('AnchorAlertDB');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/** Seed DB outside the hook (for restore tests). */
async function seedDB(activeState?: Omit<ActiveState, 'key'>) {
  const db = new SessionDB();
  await db.open();
  const sessionId = await db.createSession({
    anchorLat: 54.35,
    anchorLng: 18.65,
    radius: 50,
    bufferRadius: null,
    sectorEnabled: false,
    sectorBearing: 0,
    sectorWidth: 90,
    startTime: 1000000,
    endTime: null,
    chainLengthM: null,
    depthM: null,
    alarmTriggered: false,
    alarmCount: 0,
    maxDistance: 0,
    maxSog: 0,
  });
  await db.addTrackPoint(makeTrackPoint(sessionId, { lat: 54.351, lng: 18.651 }));
  await db.addTrackPoint(makeTrackPoint(sessionId, { lat: 54.352, lng: 18.652 }));
  await db.saveActiveState(activeState ?? makeActiveState({ sessionId }));
  // Close but track for safety
  db.db!.close();
  return sessionId;
}

/** Render the hook, open the DB, track the connection, and return. */
async function renderAndInit() {
  const hook = renderHook(() => useSession());
  await act(async () => {
    await hook.result.current.initDB();
  });
  const conn = hook.result.current.db.current.db;
  if (conn) openConnections.push(conn);
  return hook;
}

// --- Tests ---

describe('useSession', () => {
  afterEach(async () => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    closeAllConnections();
    await deleteDB();
  });

  // ── initDB ──────────────────────────────────────────────

  describe('initDB', () => {
    it('opens database and returns null when no active state saved', async () => {
      const { result } = renderHook(() => useSession());

      let restored: unknown;
      await act(async () => {
        restored = await result.current.initDB();
      });

      expect(restored).toBeNull();
      expect(result.current.db.current.db).not.toBeNull();
      openConnections.push(result.current.db.current.db!);
    });

    it('restores active state with correct fields', async () => {
      const sessionId = await seedDB();
      const { result } = renderHook(() => useSession());

      let restored: Awaited<ReturnType<typeof result.current.initDB>>;
      await act(async () => {
        restored = await result.current.initDB();
      });
      openConnections.push(result.current.db.current.db!);

      expect(restored).not.toBeNull();
      expect(restored!.isAnchored).toBe(true);
      expect(restored!.anchorPos).toEqual({ lat: 54.35, lng: 18.65 });
      expect(restored!.radius).toBe(50);
      expect(restored!.sectorEnabled).toBe(false);
      expect(restored!.sectorBearing).toBe(0);
      expect(restored!.sectorWidth).toBe(90);
      expect(restored!.sessionId).toBe(sessionId);
      expect(restored!.anchorStartTime).toBe(1000000);
      expect(restored!.maxDistanceSwing).toBe(20);
      expect(restored!.maxSogDuringAnchor).toBe(1.2);
      expect(restored!.unit).toBe('m');
    });

    it('restores track points as LatLng array', async () => {
      await seedDB();
      const { result } = renderHook(() => useSession());

      let restored: Awaited<ReturnType<typeof result.current.initDB>>;
      await act(async () => {
        restored = await result.current.initDB();
      });
      openConnections.push(result.current.db.current.db!);

      expect(restored!.track).toHaveLength(2);
      expect(restored!.track[0]).toEqual({ lat: 54.351, lng: 18.651 });
      expect(restored!.track[1]).toEqual({ lat: 54.352, lng: 18.652 });
    });

    it('returns null when saved state has isAnchored false', async () => {
      await seedDB(makeActiveState({ isAnchored: false }));
      const { result } = renderHook(() => useSession());

      let restored: unknown;
      await act(async () => {
        restored = await result.current.initDB();
      });
      openConnections.push(result.current.db.current.db!);

      expect(restored).toBeNull();
    });
  });

  // ── setAnchor ───────────────────────────────────────────

  describe('setAnchor', () => {
    it('creates session in DB and returns session ID', async () => {
      const { result } = await renderAndInit();

      let sessionId: number | null = null;
      await act(async () => {
        sessionId = await result.current.setAnchor(pos, makeSessionState());
      });

      expect(sessionId).toBeGreaterThan(0);
      const session = await result.current.db.current.getSession(sessionId!);
      expect(session).toBeDefined();
      expect(session!.anchorLat).toBe(54.35);
      expect(session!.anchorLng).toBe(18.65);
      expect(session!.radius).toBe(50);
      expect(session!.startTime).toBe(1000000);
      expect(session!.endTime).toBeNull();
    });

    it('returns null if DB not open', async () => {
      const { result } = renderHook(() => useSession());

      let sessionId: number | null = -1;
      await act(async () => {
        sessionId = await result.current.setAnchor(pos, makeSessionState());
      });

      expect(sessionId).toBeNull();
    });

    it('starts track flushing after creating session', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const { result } = await renderAndInit();

      let sessionId: number | null = null;
      await act(async () => {
        sessionId = await result.current.setAnchor(pos, makeSessionState());
      });

      act(() => {
        result.current.bufferTrackPoint(makeTrackPoint(sessionId!));
      });

      // Advance past the 10 s flush interval
      await act(async () => {
        vi.advanceTimersByTime(11_000);
      });

      const points = await result.current.db.current.getTrackPoints(sessionId!);
      expect(points.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── liftAnchor ──────────────────────────────────────────

  describe('liftAnchor', () => {
    it('flushes pending points, finalizes session, and clears active state', async () => {
      const { result } = await renderAndInit();

      let sessionId: number | null = null;
      await act(async () => {
        sessionId = await result.current.setAnchor(pos, makeSessionState());
      });

      act(() => {
        result.current.bufferTrackPoint(makeTrackPoint(sessionId!));
        result.current.bufferTrackPoint(makeTrackPoint(sessionId!));
      });

      // Persist state so clearActiveState has something to clear
      act(() => {
        result.current.persistActiveState(makeSessionState({ sessionId }));
      });
      await act(async () => {});

      const beforeLift = Date.now();
      await act(async () => {
        await result.current.liftAnchor({
          sessionId,
          maxDistanceSwing: 42,
          maxSogDuringAnchor: 2.5,
          alarmTriggered: true,
        });
      });

      const points = await result.current.db.current.getTrackPoints(sessionId!);
      expect(points.length).toBe(2);

      const session = await result.current.db.current.getSession(sessionId!);
      expect(session!.endTime).toBeGreaterThanOrEqual(beforeLift);
      expect(session!.maxDistance).toBe(42);
      expect(session!.maxSog).toBe(2.5);
      expect(session!.alarmTriggered).toBe(true);

      const active = await result.current.db.current.getActiveState();
      expect(active).toBeUndefined();
    });

    it('stops track flushing after lift', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const { result } = await renderAndInit();

      let sessionId: number | null = null;
      await act(async () => {
        sessionId = await result.current.setAnchor(pos, makeSessionState());
      });

      await act(async () => {
        await result.current.liftAnchor({
          sessionId,
          maxDistanceSwing: 0,
          maxSogDuringAnchor: 0,
          alarmTriggered: false,
        });
      });

      // Buffer a point AFTER lift and advance timer — should NOT auto-flush
      act(() => {
        result.current.bufferTrackPoint(makeTrackPoint(sessionId!));
      });

      await act(async () => {
        vi.advanceTimersByTime(15_000);
      });

      const points = await result.current.db.current.getTrackPoints(sessionId!);
      expect(points.length).toBe(0);
    });
  });

  // ── bufferTrackPoint ────────────────────────────────────

  describe('bufferTrackPoint', () => {
    it('adds points to buffer (not written until flush)', async () => {
      const { result } = await renderAndInit();

      let sessionId: number | null = null;
      await act(async () => {
        sessionId = await result.current.setAnchor(pos, makeSessionState());
      });

      act(() => {
        result.current.bufferTrackPoint(makeTrackPoint(sessionId!));
        result.current.bufferTrackPoint(makeTrackPoint(sessionId!));
        result.current.bufferTrackPoint(makeTrackPoint(sessionId!));
      });

      // Not yet in DB
      const points = await result.current.db.current.getTrackPoints(sessionId!);
      expect(points.length).toBe(0);

      // Manual flush writes them
      await act(async () => {
        await result.current.flushTrackPoints();
      });

      const flushed = await result.current.db.current.getTrackPoints(sessionId!);
      expect(flushed.length).toBe(3);
    });

    it('triggers emergency flush above TRACK_BUFFER_WARN (800)', async () => {
      const { result } = await renderAndInit();

      let sessionId: number | null = null;
      await act(async () => {
        sessionId = await result.current.setAnchor(pos, makeSessionState());
      });

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await act(async () => {
        for (let i = 0; i < 801; i++) {
          result.current.bufferTrackPoint(
            makeTrackPoint(sessionId!, { lat: 54.35 + i * 0.0001 }),
          );
        }
      });

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Track buffer at'),
      );
    });

    it('emergency flush drains buffer so it stays below TRACK_BUFFER_MAX', async () => {
      const { result } = await renderAndInit();

      let sessionId: number | null = null;
      await act(async () => {
        sessionId = await result.current.setAnchor(pos, makeSessionState());
      });

      vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Add 1050 points — emergency flush at 801 clears via splice(0),
      // so the buffer never actually reaches TRACK_BUFFER_MAX (1000).
      await act(async () => {
        for (let i = 0; i < 1050; i++) {
          result.current.bufferTrackPoint(
            makeTrackPoint(sessionId!, { lat: 54.35 + i * 0.0001 }),
          );
        }
      });

      // The 801 points were flushed to DB, remaining 249 are in the buffer.
      // Flush the rest and verify total.
      await act(async () => {
        await result.current.flushTrackPoints();
      });

      const points = await result.current.db.current.getTrackPoints(sessionId!);
      expect(points.length).toBe(1050);
    });
  });

  // ── flushTrackPoints ────────────────────────────────────

  describe('flushTrackPoints', () => {
    it('writes buffered points to DB and clears buffer', async () => {
      const { result } = await renderAndInit();

      let sessionId: number | null = null;
      await act(async () => {
        sessionId = await result.current.setAnchor(pos, makeSessionState());
      });

      act(() => {
        result.current.bufferTrackPoint(makeTrackPoint(sessionId!, { lat: 54.351 }));
        result.current.bufferTrackPoint(makeTrackPoint(sessionId!, { lat: 54.352 }));
      });

      await act(async () => {
        await result.current.flushTrackPoints();
      });

      const points = await result.current.db.current.getTrackPoints(sessionId!);
      expect(points.length).toBe(2);

      // Second flush is a no-op
      await act(async () => {
        await result.current.flushTrackPoints();
      });

      const pointsAfter = await result.current.db.current.getTrackPoints(sessionId!);
      expect(pointsAfter.length).toBe(2);
    });

    it('handles empty buffer gracefully', async () => {
      const { result } = await renderAndInit();

      await act(async () => {
        await result.current.flushTrackPoints();
      });
    });
  });

  // ── persistActiveState ──────────────────────────────────

  describe('persistActiveState', () => {
    it('saves state to DB with correct field mapping', async () => {
      const { result } = await renderAndInit();

      act(() => {
        result.current.persistActiveState(
          makeSessionState({
            sessionId: 42,
            anchorPos: { lat: 55.0, lng: 19.0 },
            radius: 75,
            sectorEnabled: true,
            sectorBearing: 180,
            sectorWidth: 45,
            chainLengthM: 30,
            depthM: 8,
            unit: 'ft',
          }),
        );
      });

      // Give the fire-and-forget async save a tick
      await act(async () => {});

      const active = await result.current.db.current.getActiveState();
      expect(active).toBeDefined();
      expect(active!.anchorLat).toBe(55.0);
      expect(active!.anchorLng).toBe(19.0);
      expect(active!.radius).toBe(75);
      expect(active!.sectorEnabled).toBe(true);
      expect(active!.sectorBearing).toBe(180);
      expect(active!.sectorWidth).toBe(45);
      expect(active!.sessionId).toBe(42);
      expect(active!.chainLengthM).toBe(30);
      expect(active!.depthM).toBe(8);
      expect(active!.unit).toBe('ft');
    });

    it('does nothing if DB not open', () => {
      const { result } = renderHook(() => useSession());

      act(() => {
        result.current.persistActiveState(makeSessionState());
      });
    });
  });

  // ── getSessionHistory ───────────────────────────────────

  describe('getSessionHistory', () => {
    it('returns all sessions', async () => {
      const { result } = await renderAndInit();

      await act(async () => {
        await result.current.setAnchor(pos, makeSessionState());
        await result.current.setAnchor(pos, makeSessionState({ anchorStartTime: 2000000 }));
      });

      let sessions: AnchorSession[] = [];
      await act(async () => {
        sessions = await result.current.getSessionHistory();
      });

      expect(sessions.length).toBe(2);
    });

    it('returns empty array if DB not open', async () => {
      const { result } = renderHook(() => useSession());

      let sessions: AnchorSession[] = [{ id: 999 } as AnchorSession];
      await act(async () => {
        sessions = await result.current.getSessionHistory();
      });

      expect(sessions).toEqual([]);
    });
  });

  // ── getSessionReplay ────────────────────────────────────

  describe('getSessionReplay', () => {
    it('returns session and its track points', async () => {
      const { result } = await renderAndInit();

      let sessionId: number | null = null;
      await act(async () => {
        sessionId = await result.current.setAnchor(pos, makeSessionState());
      });

      act(() => {
        result.current.bufferTrackPoint(makeTrackPoint(sessionId!, { lat: 54.351 }));
      });

      await act(async () => {
        await result.current.flushTrackPoints();
      });

      let replay!: { session: AnchorSession | undefined; points: TrackPoint[] };
      await act(async () => {
        replay = await result.current.getSessionReplay(sessionId!);
      });

      expect(replay.session).toBeDefined();
      expect(replay.session!.anchorLat).toBe(54.35);
      expect(replay.points.length).toBe(1);
      expect(replay.points[0].lat).toBe(54.351);
    });

    it('returns undefined session and empty points if DB not open', async () => {
      const { result } = renderHook(() => useSession());

      let replay!: { session: AnchorSession | undefined; points: TrackPoint[] };
      await act(async () => {
        replay = await result.current.getSessionReplay(1);
      });

      expect(replay.session).toBeUndefined();
      expect(replay.points).toEqual([]);
    });
  });

  // ── deleteSession ───────────────────────────────────────

  describe('deleteSession', () => {
    it('removes session and its track points from DB', async () => {
      const { result } = await renderAndInit();

      let sessionId: number | null = null;
      await act(async () => {
        sessionId = await result.current.setAnchor(pos, makeSessionState());
      });

      act(() => {
        result.current.bufferTrackPoint(makeTrackPoint(sessionId!));
      });
      await act(async () => {
        await result.current.flushTrackPoints();
      });

      await act(async () => {
        await result.current.deleteSession(sessionId!);
      });

      const session = await result.current.db.current.getSession(sessionId!);
      expect(session).toBeUndefined();
      const points = await result.current.db.current.getTrackPoints(sessionId!);
      expect(points.length).toBe(0);
    });

    it('does nothing if DB not open', async () => {
      const { result } = renderHook(() => useSession());

      await act(async () => {
        await result.current.deleteSession(999);
      });
    });
  });

  // ── getStats ────────────────────────────────────────────

  describe('getStats', () => {
    it('returns stats for completed sessions', async () => {
      const { result } = await renderAndInit();

      let sid1: number | null = null;
      let sid2: number | null = null;
      await act(async () => {
        sid1 = await result.current.setAnchor(pos, makeSessionState());
        sid2 = await result.current.setAnchor(pos, makeSessionState({ anchorStartTime: 2000000 }));
      });

      await act(async () => {
        await result.current.liftAnchor({
          sessionId: sid1,
          maxDistanceSwing: 30,
          maxSogDuringAnchor: 1.5,
          alarmTriggered: false,
        });
      });
      await act(async () => {
        await result.current.liftAnchor({
          sessionId: sid2,
          maxDistanceSwing: 50,
          maxSogDuringAnchor: 3.0,
          alarmTriggered: true,
        });
      });

      let stats!: Awaited<ReturnType<typeof result.current.getStats>>;
      await act(async () => {
        stats = await result.current.getStats();
      });

      expect(stats.totalSessions).toBe(2);
      expect(stats.maxDistance).toBe(50);
      expect(stats.maxSog).toBe(3.0);
    });

    it('returns zeroed stats if DB not open', async () => {
      const { result } = renderHook(() => useSession());

      let stats!: Awaited<ReturnType<typeof result.current.getStats>>;
      await act(async () => {
        stats = await result.current.getStats();
      });

      expect(stats.totalSessions).toBe(0);
      expect(stats.totalAlarms).toBe(0);
      expect(stats.totalDuration).toBe(0);
    });
  });

  // ── Cleanup ─────────────────────────────────────────────

  describe('cleanup', () => {
    it('stops flush interval on unmount', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const { result, unmount } = await renderAndInit();

      let sessionId: number | null = null;
      await act(async () => {
        sessionId = await result.current.setAnchor(pos, makeSessionState());
      });

      act(() => {
        result.current.bufferTrackPoint(makeTrackPoint(sessionId!));
      });

      const db = result.current.db.current;

      unmount();

      await act(async () => {
        vi.advanceTimersByTime(15_000);
      });

      const points = await db.getTrackPoints(sessionId!);
      expect(points.length).toBe(0);
    });
  });
});
