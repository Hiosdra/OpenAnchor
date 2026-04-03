import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { SessionDB, calculateSessionStats } from '../src/modules/anchor/session-db';
import type { AnchorSession, TrackPoint, LogbookEntry, ActiveState } from '../src/modules/anchor/session-db';

// --- Helpers ---

function makeSession(overrides: Partial<AnchorSession> = {}): Omit<AnchorSession, 'id'> {
  return {
    anchorLat: 54.35,
    anchorLng: 18.65,
    radius: 50,
    bufferRadius: null,
    sectorEnabled: false,
    sectorBearing: 0,
    sectorWidth: 0,
    startTime: 1000000,
    endTime: 2000000,
    chainLengthM: null,
    depthM: null,
    alarmTriggered: false,
    alarmCount: 0,
    maxDistance: 30,
    maxSog: 1.5,
    ...overrides,
  };
}

function makeTrackPoint(sessionId: number, overrides: Partial<TrackPoint> = {}): Omit<TrackPoint, 'id'> {
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

function makeLogbookEntry(sessionId: number, overrides: Partial<LogbookEntry> = {}): Omit<LogbookEntry, 'id'> {
  return {
    sessionId,
    createdAt: Date.now(),
    summary: 'Test summary',
    logEntry: 'Test log entry',
    safetyNote: 'No issues',
    isAiGenerated: false,
    ...overrides,
  };
}

function makeActiveState(overrides: Partial<ActiveState> = {}): Omit<ActiveState, 'key'> {
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
    anchorStartTime: Date.now(),
    maxDistanceSwing: 20,
    maxSogDuringAnchor: 1.2,
    chainLengthM: null,
    depthM: null,
    unit: 'm',
    ...overrides,
  };
}

// --- Tests ---

describe('SessionDB', () => {
  let db: SessionDB;

  beforeEach(async () => {
    db = new SessionDB();
    await db.open();
  });

  afterEach(async () => {
    if (db.db) {
      db.db.close();
      db.db = null;
    }
    // Wipe the database so tests are fully isolated
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase('AnchorAlertDB');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });

  // ── open() ──────────────────────────────────────────────

  describe('open()', () => {
    it('initializes the database and sets db reference', () => {
      expect(db.db).not.toBeNull();
      expect(db.db).toBeInstanceOf(IDBDatabase);
    });

    it('creates all expected object stores', () => {
      const names = db.db!.objectStoreNames;
      expect(names.contains('sessions')).toBe(true);
      expect(names.contains('trackpoints')).toBe(true);
      expect(names.contains('activeState')).toBe(true);
      expect(names.contains('logbook')).toBe(true);
    });
  });

  // ── createSession() / getSession() ──────────────────────

  describe('createSession() / getSession()', () => {
    it('creates a session and returns its auto-incremented id', async () => {
      const id = await db.createSession(makeSession());
      expect(typeof id).toBe('number');
      expect(id).toBeGreaterThan(0);
    });

    it('retrieves a created session by id', async () => {
      const input = makeSession({ anchorLat: 55.0, radius: 75 });
      const id = await db.createSession(input);
      const session = await db.getSession(id);

      expect(session).toBeDefined();
      expect(session!.id).toBe(id);
      expect(session!.anchorLat).toBe(55.0);
      expect(session!.radius).toBe(75);
    });

    it('returns undefined for non-existent session id', async () => {
      const session = await db.getSession(99999);
      expect(session).toBeUndefined();
    });

    it('assigns unique ids to multiple sessions', async () => {
      const id1 = await db.createSession(makeSession());
      const id2 = await db.createSession(makeSession());
      expect(id1).not.toBe(id2);
    });
  });

  // ── getAllSessions() ────────────────────────────────────

  describe('getAllSessions()', () => {
    it('returns empty array when no sessions exist', async () => {
      const sessions = await db.getAllSessions();
      expect(sessions).toEqual([]);
    });

    it('returns all created sessions', async () => {
      await db.createSession(makeSession({ startTime: 3000 }));
      await db.createSession(makeSession({ startTime: 1000 }));
      await db.createSession(makeSession({ startTime: 2000 }));

      const sessions = await db.getAllSessions();
      expect(sessions).toHaveLength(3);
    });

    it('returns sessions ordered by startTime index', async () => {
      await db.createSession(makeSession({ startTime: 3000 }));
      await db.createSession(makeSession({ startTime: 1000 }));
      await db.createSession(makeSession({ startTime: 2000 }));

      const sessions = await db.getAllSessions();
      const times = sessions.map((s) => s.startTime);
      expect(times).toEqual([1000, 2000, 3000]);
    });
  });

  // ── updateSession() ────────────────────────────────────

  describe('updateSession()', () => {
    it('updates specific fields of an existing session', async () => {
      const id = await db.createSession(makeSession({ radius: 50, alarmCount: 0 }));
      await db.updateSession(id, { radius: 100, alarmCount: 3 });

      const updated = await db.getSession(id);
      expect(updated!.radius).toBe(100);
      expect(updated!.alarmCount).toBe(3);
      // unchanged fields remain
      expect(updated!.anchorLat).toBe(54.35);
    });

    it('does nothing when session id does not exist', async () => {
      // Should not throw
      await db.updateSession(99999, { radius: 999 });
      const session = await db.getSession(99999);
      expect(session).toBeUndefined();
    });

    it('can set endTime on a previously open session', async () => {
      const id = await db.createSession(makeSession({ endTime: null }));
      await db.updateSession(id, { endTime: 5000000 });

      const updated = await db.getSession(id);
      expect(updated!.endTime).toBe(5000000);
    });
  });

  // ── deleteSession() ────────────────────────────────────

  describe('deleteSession()', () => {
    it('removes the session from the store', async () => {
      const id = await db.createSession(makeSession());
      await db.deleteSession(id);

      const session = await db.getSession(id);
      expect(session).toBeUndefined();
    });

    it('also removes associated track points', async () => {
      const sessionId = await db.createSession(makeSession());
      await db.addTrackPoint(makeTrackPoint(sessionId));
      await db.addTrackPoint(makeTrackPoint(sessionId));

      await db.deleteSession(sessionId);

      const points = await db.getTrackPoints(sessionId);
      expect(points).toHaveLength(0);
    });

    it('also removes associated logbook entries', async () => {
      const sessionId = await db.createSession(makeSession());
      await db.addLogbookEntry(makeLogbookEntry(sessionId));

      await db.deleteSession(sessionId);

      const entries = await db.getLogbookEntries(sessionId);
      expect(entries).toHaveLength(0);
    });

    it('does not affect other sessions or their data', async () => {
      const id1 = await db.createSession(makeSession());
      const id2 = await db.createSession(makeSession());
      await db.addTrackPoint(makeTrackPoint(id1));
      await db.addTrackPoint(makeTrackPoint(id2));
      await db.addLogbookEntry(makeLogbookEntry(id1));
      await db.addLogbookEntry(makeLogbookEntry(id2));

      await db.deleteSession(id1);

      expect(await db.getSession(id2)).toBeDefined();
      expect(await db.getTrackPoints(id2)).toHaveLength(1);
      expect(await db.getLogbookEntries(id2)).toHaveLength(1);
    });
  });

  // ── addTrackPoint() / getTrackPoints() ─────────────────

  describe('addTrackPoint() / getTrackPoints()', () => {
    it('adds a track point and returns its id', async () => {
      const sessionId = await db.createSession(makeSession());
      const pointId = await db.addTrackPoint(makeTrackPoint(sessionId));
      expect(typeof pointId).toBe('number');
      expect(pointId).toBeGreaterThan(0);
    });

    it('retrieves track points for a specific session', async () => {
      const sessionId = await db.createSession(makeSession());
      await db.addTrackPoint(makeTrackPoint(sessionId, { lat: 54.1 }));
      await db.addTrackPoint(makeTrackPoint(sessionId, { lat: 54.2 }));

      const points = await db.getTrackPoints(sessionId);
      expect(points).toHaveLength(2);
      expect(points.map((p) => p.lat)).toContain(54.1);
      expect(points.map((p) => p.lat)).toContain(54.2);
    });

    it('returns empty array for session with no track points', async () => {
      const points = await db.getTrackPoints(99999);
      expect(points).toEqual([]);
    });

    it('does not mix track points between sessions', async () => {
      const s1 = await db.createSession(makeSession());
      const s2 = await db.createSession(makeSession());
      await db.addTrackPoint(makeTrackPoint(s1, { lat: 1 }));
      await db.addTrackPoint(makeTrackPoint(s2, { lat: 2 }));

      const p1 = await db.getTrackPoints(s1);
      const p2 = await db.getTrackPoints(s2);
      expect(p1).toHaveLength(1);
      expect(p1[0].lat).toBe(1);
      expect(p2).toHaveLength(1);
      expect(p2[0].lat).toBe(2);
    });
  });

  // ── addTrackPointsBatch() ──────────────────────────────

  describe('addTrackPointsBatch()', () => {
    it('adds multiple track points in a single transaction', async () => {
      const sessionId = await db.createSession(makeSession());
      const points = [
        makeTrackPoint(sessionId, { lat: 54.1 }),
        makeTrackPoint(sessionId, { lat: 54.2 }),
        makeTrackPoint(sessionId, { lat: 54.3 }),
      ];

      await db.addTrackPointsBatch(points);

      const result = await db.getTrackPoints(sessionId);
      expect(result).toHaveLength(3);
    });

    it('handles empty batch without error', async () => {
      await db.addTrackPointsBatch([]);
      // no error thrown
    });
  });

  // ── addLogbookEntry() / getLogbookEntries() ────────────

  describe('addLogbookEntry() / getLogbookEntries()', () => {
    it('adds a logbook entry and returns its id', async () => {
      const sessionId = await db.createSession(makeSession());
      const entryId = await db.addLogbookEntry(makeLogbookEntry(sessionId));
      expect(typeof entryId).toBe('number');
      expect(entryId).toBeGreaterThan(0);
    });

    it('retrieves logbook entries for a specific session', async () => {
      const sessionId = await db.createSession(makeSession());
      await db.addLogbookEntry(makeLogbookEntry(sessionId, { summary: 'Entry 1' }));
      await db.addLogbookEntry(makeLogbookEntry(sessionId, { summary: 'Entry 2' }));

      const entries = await db.getLogbookEntries(sessionId);
      expect(entries).toHaveLength(2);
      expect(entries.map((e) => e.summary)).toContain('Entry 1');
      expect(entries.map((e) => e.summary)).toContain('Entry 2');
    });

    it('returns empty array for session with no entries', async () => {
      const entries = await db.getLogbookEntries(99999);
      expect(entries).toEqual([]);
    });

    it('does not mix entries between sessions', async () => {
      const s1 = await db.createSession(makeSession());
      const s2 = await db.createSession(makeSession());
      await db.addLogbookEntry(makeLogbookEntry(s1, { summary: 'S1' }));
      await db.addLogbookEntry(makeLogbookEntry(s2, { summary: 'S2' }));

      const e1 = await db.getLogbookEntries(s1);
      const e2 = await db.getLogbookEntries(s2);
      expect(e1).toHaveLength(1);
      expect(e1[0].summary).toBe('S1');
      expect(e2).toHaveLength(1);
      expect(e2[0].summary).toBe('S2');
    });
  });

  // ── getAllLogbookEntries() ──────────────────────────────

  describe('getAllLogbookEntries()', () => {
    it('returns all logbook entries across sessions', async () => {
      const s1 = await db.createSession(makeSession());
      const s2 = await db.createSession(makeSession());
      await db.addLogbookEntry(makeLogbookEntry(s1));
      await db.addLogbookEntry(makeLogbookEntry(s2));
      await db.addLogbookEntry(makeLogbookEntry(s1));

      const all = await db.getAllLogbookEntries();
      expect(all).toHaveLength(3);
    });

    it('returns empty array when none exist', async () => {
      const all = await db.getAllLogbookEntries();
      expect(all).toEqual([]);
    });
  });

  // ── deleteLogbookEntries() ─────────────────────────────

  describe('deleteLogbookEntries()', () => {
    it('removes all entries for a given session', async () => {
      const sessionId = await db.createSession(makeSession());
      await db.addLogbookEntry(makeLogbookEntry(sessionId));
      await db.addLogbookEntry(makeLogbookEntry(sessionId));

      await db.deleteLogbookEntries(sessionId);

      const entries = await db.getLogbookEntries(sessionId);
      expect(entries).toHaveLength(0);
    });

    it('does not remove entries from other sessions', async () => {
      const s1 = await db.createSession(makeSession());
      const s2 = await db.createSession(makeSession());
      await db.addLogbookEntry(makeLogbookEntry(s1));
      await db.addLogbookEntry(makeLogbookEntry(s2));

      await db.deleteLogbookEntries(s1);

      expect(await db.getLogbookEntries(s2)).toHaveLength(1);
    });
  });

  // ── saveActiveState() / getActiveState() / clearActiveState() ─

  describe('active state management', () => {
    it('saves and retrieves active state', async () => {
      const state = makeActiveState({ radius: 100, isAnchored: true });
      await db.saveActiveState(state);

      const loaded = await db.getActiveState();
      expect(loaded).toBeDefined();
      expect(loaded!.isAnchored).toBe(true);
      expect(loaded!.radius).toBe(100);
      expect(loaded!.key).toBe('current');
    });

    it('overwrites previous active state', async () => {
      await db.saveActiveState(makeActiveState({ radius: 50 }));
      await db.saveActiveState(makeActiveState({ radius: 200 }));

      const loaded = await db.getActiveState();
      expect(loaded!.radius).toBe(200);
    });

    it('returns undefined when no active state saved', async () => {
      const state = await db.getActiveState();
      expect(state).toBeUndefined();
    });

    it('clearActiveState removes the saved state', async () => {
      await db.saveActiveState(makeActiveState());
      await db.clearActiveState();

      const state = await db.getActiveState();
      expect(state).toBeUndefined();
    });

    it('clearActiveState is safe when nothing is saved', async () => {
      await db.clearActiveState();
      // no error thrown
    });
  });

  // ── getStats() ─────────────────────────────────────────

  describe('getStats()', () => {
    it('returns zero stats when no sessions exist', async () => {
      const stats = await db.getStats();
      expect(stats.totalSessions).toBe(0);
      expect(stats.totalAlarms).toBe(0);
      expect(stats.totalDuration).toBe(0);
      expect(stats.avgDuration).toBe(0);
    });

    it('computes stats from stored sessions', async () => {
      await db.createSession(makeSession({ startTime: 1000, endTime: 5000, alarmCount: 2, maxDistance: 40, maxSog: 2.0 }));
      await db.createSession(makeSession({ startTime: 2000, endTime: 8000, alarmCount: 1, maxDistance: 80, maxSog: 3.5 }));

      const stats = await db.getStats();
      expect(stats.totalSessions).toBe(2);
      expect(stats.totalAlarms).toBe(3);
      expect(stats.totalDuration).toBe(10000);
      expect(stats.maxDistance).toBe(80);
      expect(stats.maxSog).toBe(3.5);
      expect(stats.avgDuration).toBe(5000);
    });

    it('excludes incomplete sessions (endTime null)', async () => {
      await db.createSession(makeSession({ endTime: 2000000 }));
      await db.createSession(makeSession({ endTime: null }));

      const stats = await db.getStats();
      expect(stats.totalSessions).toBe(1);
    });
  });

  // ── Error handling: DB not open ────────────────────────

  describe('error handling when db is not open', () => {
    it('throws when calling createSession without open()', async () => {
      const closedDb = new SessionDB();
      await expect(closedDb.createSession(makeSession())).rejects.toThrow();
    });

    it('throws when calling getSession without open()', async () => {
      const closedDb = new SessionDB();
      await expect(closedDb.getSession(1)).rejects.toThrow();
    });

    it('throws when calling getAllSessions without open()', async () => {
      const closedDb = new SessionDB();
      await expect(closedDb.getAllSessions()).rejects.toThrow();
    });

    it('throws when calling addTrackPoint without open()', async () => {
      const closedDb = new SessionDB();
      await expect(closedDb.addTrackPoint(makeTrackPoint(1))).rejects.toThrow();
    });

    it('throws when calling addLogbookEntry without open()', async () => {
      const closedDb = new SessionDB();
      await expect(closedDb.addLogbookEntry(makeLogbookEntry(1))).rejects.toThrow();
    });
  });
});

// ── calculateSessionStats (pure function) ────────────────

describe('calculateSessionStats', () => {
  it('returns zeros for empty array', () => {
    const stats = calculateSessionStats([]);
    expect(stats).toEqual({
      totalSessions: 0,
      totalAlarms: 0,
      totalDuration: 0,
      maxDistance: 0,
      maxSog: 0,
      avgDuration: 0,
    });
  });

  it('excludes incomplete sessions (endTime null)', () => {
    const sessions: AnchorSession[] = [
      { ...makeSession({ endTime: 2000000 }), id: 1 },
      { ...makeSession({ endTime: null }), id: 2 },
    ];
    expect(calculateSessionStats(sessions).totalSessions).toBe(1);
  });

  it('sums alarm counts from completed sessions only', () => {
    const sessions: AnchorSession[] = [
      { ...makeSession({ alarmCount: 3, endTime: 2000000 }), id: 1 },
      { ...makeSession({ alarmCount: 5, endTime: null }), id: 2 },
      { ...makeSession({ alarmCount: 2, endTime: 3000000 }), id: 3 },
    ];
    expect(calculateSessionStats(sessions).totalAlarms).toBe(5);
  });

  it('calculates total and average duration', () => {
    const sessions: AnchorSession[] = [
      { ...makeSession({ startTime: 0, endTime: 6000 }), id: 1 },
      { ...makeSession({ startTime: 0, endTime: 4000 }), id: 2 },
    ];
    const stats = calculateSessionStats(sessions);
    expect(stats.totalDuration).toBe(10000);
    expect(stats.avgDuration).toBe(5000);
  });

  it('finds max distance and max SOG across sessions', () => {
    const sessions: AnchorSession[] = [
      { ...makeSession({ maxDistance: 10, maxSog: 1.0 }), id: 1 },
      { ...makeSession({ maxDistance: 80, maxSog: 3.5 }), id: 2 },
      { ...makeSession({ maxDistance: 45, maxSog: 2.0 }), id: 3 },
    ];
    const stats = calculateSessionStats(sessions);
    expect(stats.maxDistance).toBe(80);
    expect(stats.maxSog).toBe(3.5);
  });

  it('handles single session', () => {
    const sessions: AnchorSession[] = [
      { ...makeSession({ startTime: 1000, endTime: 4000, alarmCount: 1, maxDistance: 20, maxSog: 0.5 }), id: 1 },
    ];
    const stats = calculateSessionStats(sessions);
    expect(stats.totalSessions).toBe(1);
    expect(stats.totalDuration).toBe(3000);
    expect(stats.avgDuration).toBe(3000);
  });

  it('treats undefined/falsy maxDistance and maxSog as 0', () => {
    const sessions: AnchorSession[] = [
      { ...makeSession({ maxDistance: undefined as any, maxSog: undefined as any }), id: 1 },
    ];
    const stats = calculateSessionStats(sessions);
    expect(stats.maxDistance).toBe(0);
    expect(stats.maxSog).toBe(0);
  });
});
