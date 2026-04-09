import { useState, useCallback, useEffect } from 'react';

import type { AnchorSession, TrackPoint, LogbookEntry } from '../session-db';

// ─── Types ─────────────────────────────────────────────────────────

interface SessionOps {
  getSessionHistory: () => Promise<AnchorSession[]>;
  getSessionReplay: (
    id: number,
  ) => Promise<{ session: AnchorSession | undefined; points: TrackPoint[] }>;
  deleteSession: (id: number) => Promise<void>;
  getStats: () => Promise<{
    totalSessions: number;
    totalAlarms: number;
    totalDuration: number;
    avgDuration: number;
    maxDistance: number;
    maxSog: number;
  }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: React.RefObject<any>;
}

interface UseSessionHistoryParams {
  session: SessionOps;
  isSessionModalOpen: boolean;
  isStatsModalOpen: boolean;
}

// ─── Hook ──────────────────────────────────────────────────────────

export function useSessionHistory({
  session,
  isSessionModalOpen,
  isStatsModalOpen,
}: UseSessionHistoryParams) {
  // ── Session history state ──
  const [sessions, setSessions] = useState<AnchorSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [replayData, setReplayData] = useState<{
    session: AnchorSession;
    points: TrackPoint[];
    logEntries: LogbookEntry[];
  } | null>(null);

  // ── Stats state ──
  const [statsData, setStatsData] = useState<{
    totalSessions: number;
    totalAlarms: number;
    totalTime: number;
    avgTime: number;
    maxDistance: number;
    maxSog: number;
  } | null>(null);

  // ── Session history handlers ──

  const loadHistory = useCallback(async () => {
    setSessionsLoading(true);
    setReplayData(null);
    try {
      const list = await session.getSessionHistory();
      setSessions(list);
    } catch {
      setSessions([]);
    }
    setSessionsLoading(false);
  }, [session]);

  const handleReplaySession = useCallback(
    async (sessionId: number) => {
      const { session: s, points } = await session.getSessionReplay(sessionId);
      if (!s) return;
      let logEntries: LogbookEntry[] = [];
      try {
        const db = session.db.current;
        if (db?.db) {
          logEntries = await db.db.getLogbookEntries(sessionId);
        }
      } catch {
        /* ignore */
      }
      setReplayData({ session: s, points, logEntries });
    },
    [session],
  );

  const handleExportGPX = useCallback(
    async (sessionId: number) => {
      const { session: s, points } = await session.getSessionReplay(sessionId);
      if (!s || points.length === 0) return;

      const gpxLines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<gpx version="1.1" creator="OpenAnchor">',
        '  <trk><name>Anchor Session</name><trkseg>',
      ];
      for (const pt of points) {
        gpxLines.push(
          `    <trkpt lat="${pt.lat}" lon="${pt.lng}"><time>${new Date(pt.timestamp).toISOString()}</time></trkpt>`,
        );
      }
      gpxLines.push('  </trkseg></trk>', '</gpx>');

      const blob = new Blob([gpxLines.join('\n')], { type: 'application/gpx+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `anchor-session-${sessionId}.gpx`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [session],
  );

  const handleExportCSV = useCallback(
    async (sessionId: number) => {
      const { points } = await session.getSessionReplay(sessionId);
      if (points.length === 0) return;

      const header = 'timestamp,lat,lng,accuracy,distance,alarmState';
      const rows = points.map(
        (pt) =>
          `${pt.timestamp},${pt.lat},${pt.lng},${pt.accuracy},${pt.distance},${pt.alarmState}`,
      );

      const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `anchor-session-${sessionId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [session],
  );

  const handleDeleteSession = useCallback(
    async (sessionId: number) => {
      await session.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (replayData?.session.id === sessionId) {
        setReplayData(null);
      }
    },
    [session, replayData],
  );

  // ── Stats handler ──

  const loadStats = useCallback(async () => {
    try {
      const s = await session.getStats();
      setStatsData({
        totalSessions: s.totalSessions,
        totalAlarms: s.totalAlarms,
        totalTime: s.totalDuration,
        avgTime: s.avgDuration,
        maxDistance: s.maxDistance,
        maxSog: s.maxSog,
      });
    } catch {
      setStatsData(null);
    }
  }, [session]);

  // ── Auto-load effects ──

  useEffect(() => {
    if (isSessionModalOpen) loadHistory();
  }, [isSessionModalOpen, loadHistory]);

  useEffect(() => {
    if (isStatsModalOpen) loadStats();
  }, [isStatsModalOpen, loadStats]);

  return {
    sessions,
    sessionsLoading,
    replayData,
    setReplayData,
    statsData,
    loadHistory,
    loadStats,
    handleReplaySession,
    handleExportGPX,
    handleExportCSV,
    handleDeleteSession,
  };
}
