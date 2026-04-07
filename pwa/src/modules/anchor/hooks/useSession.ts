import { useRef, useCallback, useEffect } from 'react';
import L from 'leaflet';
import {
  SessionDB,
  type AnchorSession,
  type TrackPoint,
  type ActiveState,
  type SessionStats,
} from '../session-db';

const TRACK_BUFFER_MAX = 1000;
const TRACK_BUFFER_WARN = 800;
const FLUSH_INTERVAL_MS = 10000;

interface SessionState {
  isAnchored: boolean;
  anchorPos: L.LatLng | null;
  radius: number;
  bufferRadius: number | null;
  sectorEnabled: boolean;
  sectorBearing: number;
  sectorWidth: number;
  sessionId: number | null;
  anchorStartTime: number | null;
  maxDistanceSwing: number;
  maxSogDuringAnchor: number;
  chainLengthM: number | null;
  depthM: number | null;
  unit: string;
}

interface RestoredState {
  isAnchored: boolean;
  anchorPos: L.LatLng;
  radius: number;
  bufferRadius: number | null;
  sectorEnabled: boolean;
  sectorBearing: number;
  sectorWidth: number;
  sessionId: number | null;
  anchorStartTime: number;
  maxDistanceSwing: number;
  maxSogDuringAnchor: number;
  chainLengthM: number | null;
  depthM: number | null;
  unit: string;
  track: L.LatLng[];
}

export function useSession() {
  const dbRef = useRef<SessionDB>(new SessionDB());
  const trackPointBufferRef = useRef<Omit<TrackPoint, 'id'>[]>([]);
  const flushIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const flushTrackPoints = useCallback(async () => {
    if (trackPointBufferRef.current.length === 0) return;
    const batch = trackPointBufferRef.current.splice(0);
    try {
      await dbRef.current.addTrackPointsBatch(batch);
    } catch (err) {
      console.warn('Track flush failed:', err);
    }
  }, []);

  const startTrackFlushing = useCallback(() => {
    if (flushIntervalRef.current) clearInterval(flushIntervalRef.current);
    flushIntervalRef.current = setInterval(() => flushTrackPoints(), FLUSH_INTERVAL_MS);
  }, [flushTrackPoints]);

  const stopTrackFlushing = useCallback(() => {
    if (flushIntervalRef.current) {
      clearInterval(flushIntervalRef.current);
      flushIntervalRef.current = null;
    }
  }, []);

  const initDB = useCallback(async (): Promise<RestoredState | null> => {
    try {
      await dbRef.current.open();
      if (!mountedRef.current) return null;
      const saved = await dbRef.current.getActiveState();
      if (!saved || !saved.isAnchored) return null;

      let track: L.LatLng[] = [];
      if (saved.sessionId) {
        const points = await dbRef.current.getTrackPoints(saved.sessionId);
        if (!mountedRef.current) return null;
        track = points.map((p) => L.latLng(p.lat, p.lng));
      }

      if (!mountedRef.current) return null;
      startTrackFlushing();

      return {
        isAnchored: true,
        anchorPos: L.latLng(saved.anchorLat, saved.anchorLng),
        radius: saved.radius || 50,
        bufferRadius: saved.bufferRadius || null,
        sectorEnabled: saved.sectorEnabled || false,
        sectorBearing: saved.sectorBearing || 0,
        sectorWidth: saved.sectorWidth || 90,
        sessionId: saved.sessionId || null,
        anchorStartTime: saved.anchorStartTime || Date.now(),
        maxDistanceSwing: saved.maxDistanceSwing || 0,
        maxSogDuringAnchor: saved.maxSogDuringAnchor || 0,
        chainLengthM: saved.chainLengthM || null,
        depthM: saved.depthM || null,
        unit: saved.unit || 'm',
        track,
      };
    } catch (err) {
      console.error('IndexedDB init failed:', err);
      return null;
    }
  }, [startTrackFlushing]);

  const setAnchor = useCallback(
    async (
      pos: L.LatLng,
      sessionState: SessionState,
    ): Promise<number | null> => {
      if (!dbRef.current.db) return null;
      try {
        const sessionId = await dbRef.current.createSession({
          anchorLat: pos.lat,
          anchorLng: pos.lng,
          radius: sessionState.radius,
          bufferRadius: sessionState.bufferRadius,
          sectorEnabled: sessionState.sectorEnabled,
          sectorBearing: sessionState.sectorBearing,
          sectorWidth: sessionState.sectorWidth,
          startTime: sessionState.anchorStartTime ?? Date.now(),
          endTime: null,
          chainLengthM: sessionState.chainLengthM,
          depthM: sessionState.depthM,
          alarmTriggered: false,
          alarmCount: 0,
          maxDistance: 0,
          maxSog: 0,
        });
        startTrackFlushing();
        return sessionId;
      } catch (err) {
        console.warn('Failed to create session:', err);
        return null;
      }
    },
    [startTrackFlushing],
  );

  const liftAnchor = useCallback(
    async (sessionState: {
      sessionId: number | null;
      maxDistanceSwing: number;
      maxSogDuringAnchor: number;
      alarmTriggered: boolean;
    }) => {
      await flushTrackPoints();

      if (dbRef.current.db && sessionState.sessionId) {
        try {
          await dbRef.current.updateSession(sessionState.sessionId, {
            endTime: Date.now(),
            maxDistance: sessionState.maxDistanceSwing,
            maxSog: sessionState.maxSogDuringAnchor,
            alarmTriggered: sessionState.alarmTriggered,
          });
        } catch (err) {
          console.warn('Failed to finalize session:', err);
        }
      }

      if (dbRef.current.db) {
        dbRef.current.clearActiveState().catch(() => {});
      }
      stopTrackFlushing();
    },
    [flushTrackPoints, stopTrackFlushing],
  );

  const bufferTrackPoint = useCallback(
    (point: Omit<TrackPoint, 'id'>) => {
      trackPointBufferRef.current.push(point);

      if (trackPointBufferRef.current.length > TRACK_BUFFER_WARN) {
        console.warn(
          `[useSession] Track buffer at ${trackPointBufferRef.current.length}/${TRACK_BUFFER_MAX} — triggering emergency flush`,
        );
        flushTrackPoints();
      }
      if (trackPointBufferRef.current.length > TRACK_BUFFER_MAX) {
        const dropped = trackPointBufferRef.current.length - TRACK_BUFFER_MAX;
        console.warn(`[useSession] Dropping ${dropped} oldest track points`);
        trackPointBufferRef.current.splice(0, dropped);
      }
    },
    [flushTrackPoints],
  );

  const persistActiveState = useCallback((sessionState: SessionState) => {
    if (!dbRef.current.db) return;
    dbRef.current
      .saveActiveState({
        isAnchored: sessionState.isAnchored,
        anchorLat: sessionState.anchorPos?.lat ?? 0,
        anchorLng: sessionState.anchorPos?.lng ?? 0,
        radius: sessionState.radius,
        bufferRadius: sessionState.bufferRadius,
        sectorEnabled: sessionState.sectorEnabled,
        sectorBearing: sessionState.sectorBearing,
        sectorWidth: sessionState.sectorWidth,
        sessionId: sessionState.sessionId,
        anchorStartTime: sessionState.anchorStartTime ?? Date.now(),
        maxDistanceSwing: sessionState.maxDistanceSwing,
        maxSogDuringAnchor: sessionState.maxSogDuringAnchor,
        chainLengthM: sessionState.chainLengthM,
        depthM: sessionState.depthM,
        unit: sessionState.unit,
      })
      .catch((err: unknown) => console.warn('Failed to persist state:', err));
  }, []);

  const getSessionHistory = useCallback(async (): Promise<AnchorSession[]> => {
    if (!dbRef.current.db) return [];
    return dbRef.current.getAllSessions();
  }, []);

  const getSessionReplay = useCallback(
    async (id: number): Promise<{ session: AnchorSession | undefined; points: TrackPoint[] }> => {
      if (!dbRef.current.db) return { session: undefined, points: [] };
      const [session, points] = await Promise.all([
        dbRef.current.getSession(id),
        dbRef.current.getTrackPoints(id),
      ]);
      return { session, points };
    },
    [],
  );

  const deleteSession = useCallback(async (id: number): Promise<void> => {
    if (!dbRef.current.db) return;
    await dbRef.current.deleteSession(id);
  }, []);

  const getStats = useCallback(async (): Promise<SessionStats> => {
    if (!dbRef.current.db) {
      return {
        totalSessions: 0,
        totalAlarms: 0,
        totalDuration: 0,
        maxDistance: 0,
        maxSog: 0,
        avgDuration: 0,
      };
    }
    return dbRef.current.getStats();
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopTrackFlushing();
    };
  }, [stopTrackFlushing]);

  return {
    initDB,
    setAnchor,
    liftAnchor,
    bufferTrackPoint,
    flushTrackPoints,
    persistActiveState,
    getSessionHistory,
    getSessionReplay,
    deleteSession,
    getStats,
    db: dbRef,
  };
}
