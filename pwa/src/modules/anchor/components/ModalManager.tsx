/**
 * ModalManager — renders all modals, manages modal-local state & handlers.
 *
 * Receives core hook results as props from App.tsx so that all hook
 * composition stays in one place. Owns state and logic that is only
 * relevant to modal UIs (weather data, AI chat, session history, etc.).
 */

import { useState, useCallback, useEffect } from 'react';
import L from 'leaflet';

import { useModalState, useModalActions } from '../contexts/ModalContext';
import { GeoUtils } from '../geo-utils';
import { AIController } from '../ai-controller';
import type { AnchorState } from '../hooks/useAnchorState';
import type { AnchorSession, TrackPoint, LogbookEntry } from '../session-db';

import { CalcModal } from './modals/CalcModal';
import { OffsetModal } from './modals/OffsetModal';
import { SectorModal } from './modals/SectorModal';
import { WatchModal } from './modals/WatchModal';
import { WeatherModal } from './modals/WeatherModal';
import { SyncModal } from './modals/SyncModal';
import { AIModal } from './modals/AIModal';
import { SessionModal } from './modals/SessionModal';
import { AlertModals } from './modals/AlertModals';
import { ApiKeyModal } from './modals/ApiKeyModal';
import { StatsModal } from './modals/StatsModal';
import { QRScanModal } from './modals/QRScanModal';
import { SimpleMonitor } from './SimpleMonitor';
import { Onboarding } from './Onboarding';

// ─── AI Controller singleton ───
const aiCtrl = new AIController();

// ─── Weather assessment helper ───
function assessWeather(
  windSpeed: number | null,
  windGust: number | null,
  waveHeight: number | null,
  windForecast: number[],
  gustForecast: number[],
): { level: string; text: string } | null {
  if (windSpeed === null) return null;
  const curGust = windGust ?? windSpeed;
  const curWaveH = waveHeight ?? 0;
  const maxFutureGust =
    gustForecast.length > 0 ? Math.max(...gustForecast.filter((v) => v != null)) : curGust;
  const maxFutureWind =
    windForecast.length > 0 ? Math.max(...windForecast.filter((v) => v != null)) : windSpeed;

  if (maxFutureGust > 35 || curWaveH > 2.5) {
    return {
      level: 'danger',
      text: `Dangerous: gusts to ${Math.round(maxFutureGust)} kn, waves ${curWaveH}m`,
    };
  }
  if (maxFutureGust > 25 || curWaveH > 1.5 || maxFutureWind > 20) {
    return { level: 'caution', text: `Caution: gusts forecast to ${Math.round(maxFutureGust)} kn` };
  }
  if (windSpeed > 15 || curGust > 20) {
    return { level: 'moderate', text: `Moderate: wind ${windSpeed} kn, gusts ${curGust} kn` };
  }
  return { level: 'good', text: `Good conditions: wind ${windSpeed} kn` };
}

// ─── Prop types ────────────────────────────────────────────────────

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
  persistActiveState: (state: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setAnchor: (pos: L.LatLng, state: any) => Promise<number | null>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: React.RefObject<any>;
}

interface MapOps {
  setAnchor: (pos: L.LatLng) => void;
  clearAnchor: () => void;
  drawSafeZone: (
    anchorPos: L.LatLng,
    radius: number,
    bufferRadius: number | null,
    sector: { enabled: boolean; bearing: number; width: number },
    alarmState: string,
  ) => void;
  fitSafeZone: () => void;
  getMap: () => L.Map | null;
}

interface AlarmOps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recalculateZone: (state: any) => void;
}

interface AlertOps {
  ensureAudioContext: () => AudioContext;
  initPermissions: () => void;
  requestWakeLock: () => Promise<void>;
}

interface SyncOps {
  connect: (url: string) => void;
  disconnect: (reason?: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendFullSync: (state: any) => void;
  isConnected: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  isConnectedRef: React.RefObject<any>;
}

 
interface WatchScheduleOps {
  startWatch: (minutes: number) => void;
  cancelWatch: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addScheduleItem: (item: any) => void;
  removeScheduleItem: (index: number) => void;
  watchActive: boolean;
  watchMinutes: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schedule: any[];
  setWatchMinutes: React.Dispatch<React.SetStateAction<number>>;
}

export interface ModalManagerProps {
  state: AnchorState;
  stateRef: React.RefObject<AnchorState>;
  updateState: (
    updates: Partial<AnchorState> | ((prev: AnchorState) => Partial<AnchorState>),
  ) => void;
  session: SessionOps;
  alarm: AlarmOps;
  alertCtrl: AlertOps;
  mapHook: MapOps;
  mapRef: React.RefObject<MapOps>;
  sync: SyncOps;
  syncRef: React.RefObject<SyncOps>;
  watchSchedule: WatchScheduleOps;
  replayMapRef: React.RefObject<HTMLDivElement | null>;
  onRadiusChange: (radius: number) => void;
  onMuteAlarm: () => void;
}

// ─── Component ─────────────────────────────────────────────────────

export function ModalManager({
  state,
  stateRef,
  updateState,
  session,
  alarm,
  alertCtrl,
  mapHook,
  mapRef,
  sync,
  syncRef,
  watchSchedule,
  replayMapRef,
  onRadiusChange,
  onMuteAlarm,
}: ModalManagerProps) {
  const modals = useModalState();
  const { openModal, closeModal } = useModalActions();

  // ═══════════════════════════════════════════
  // WEATHER STATE
  // ═══════════════════════════════════════════
  const [weatherData, setWeatherData] = useState<{
    loading: boolean;
    error: string | null;
    windSpeed: number | null;
    windGust: number | null;
    windDir: number | null;
    waveHeight: number | null;
    wavePeriod: number | null;
    waveDir: number | null;
    windForecast: number[];
    waveForecast: number[];
    gustForecast: number[];
  }>({
    loading: false,
    error: null,
    windSpeed: null,
    windGust: null,
    windDir: null,
    waveHeight: null,
    wavePeriod: null,
    waveDir: null,
    windForecast: [],
    waveForecast: [],
    gustForecast: [],
  });

  // ═══════════════════════════════════════════
  // AI STATE
  // ═══════════════════════════════════════════
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: 'user' | 'assistant'; content: string }>
  >([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [logbookEntry, setLogbookEntry] = useState<{
    summary: string;
    logEntry: string;
    safetyNote: string;
  } | null>(null);
  const [hasAiKey, setHasAiKey] = useState(() => !!aiCtrl.apiKey);

  // ═══════════════════════════════════════════
  // SESSION HISTORY STATE
  // ═══════════════════════════════════════════
  const [sessions, setSessions] = useState<AnchorSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [replayData, setReplayData] = useState<{
    session: AnchorSession;
    points: TrackPoint[];
    logEntries: LogbookEntry[];
  } | null>(null);

  // ═══════════════════════════════════════════
  // STATS STATE
  // ═══════════════════════════════════════════
  const [statsData, setStatsData] = useState<{
    totalSessions: number;
    totalAlarms: number;
    totalTime: number;
    avgTime: number;
    maxDistance: number;
    maxSog: number;
  } | null>(null);

  // ═══════════════════════════════════════════
  // SYNC URL STATE
  // ═══════════════════════════════════════════
  const [syncUrlInput, setSyncUrlInput] = useState(
    () => localStorage.getItem('anchor_ws_url') || '',
  );

  // ═══════════════════════════════════════════
  // SIMPLE MONITOR EXTRAS
  // ═══════════════════════════════════════════
  const [nightRedFilter, setNightRedFilter] = useState(false);

  // ═══════════════════════════════════════════
  // WEATHER FETCH
  // ═══════════════════════════════════════════
  const fetchWeather = useCallback(async () => {
    const pos = stateRef.current!.currentPos;
    if (!pos) return;
    setWeatherData((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const lat = pos.lat;
      const lng = pos.lng;
      const [windRes, marineRes] = await Promise.all([
        fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m&forecast_hours=12&wind_speed_unit=kn`,
        ),
        fetch(
          `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&hourly=wave_height,wave_period,wave_direction&forecast_hours=12`,
        ),
      ]);

      const windJson = await windRes.json();
      const marineJson = marineRes.ok ? await marineRes.json() : null;

      const windSpeeds = windJson.hourly?.wind_speed_10m ?? [];
      const windGusts = windJson.hourly?.wind_gusts_10m ?? [];
      const windDirs = windJson.hourly?.wind_direction_10m ?? [];
      const waveHeights = marineJson?.hourly?.wave_height ?? [];
      const wavePeriods = marineJson?.hourly?.wave_period ?? [];
      const waveDirs = marineJson?.hourly?.wave_direction ?? [];

      setWeatherData({
        loading: false,
        error: null,
        windSpeed: windSpeeds[0] ?? null,
        windGust: windGusts[0] ?? null,
        windDir: windDirs[0] ?? null,
        waveHeight: waveHeights[0] ?? null,
        wavePeriod: wavePeriods[0] ?? null,
        waveDir: waveDirs[0] ?? null,
        windForecast: windSpeeds,
        waveForecast: waveHeights,
        gustForecast: windGusts,
      });
    } catch (e) {
      setWeatherData((prev) => ({
        ...prev,
        loading: false,
        error: String(e),
      }));
    }
  }, [stateRef]);

  // Auto-fetch weather when modal opens
  useEffect(() => {
    if (modals.weather) fetchWeather();
  }, [modals.weather, fetchWeather]);

  // ═══════════════════════════════════════════
  // AI HANDLERS
  // ═══════════════════════════════════════════

  // Redirect ai → apiKey if no key
  useEffect(() => {
    if (modals.ai && !aiCtrl.apiKey) {
      closeModal('ai');
      openModal('apiKey');
    }
  }, [modals.ai, closeModal, openModal]);

  const handleAiSendMessage = useCallback(
    async (message: string) => {
      setChatMessages((prev) => [...prev, { role: 'user', content: message }]);
      setAiLoading(true);

      const s = stateRef.current!;
      const contextPrompt = aiCtrl.buildContextPrompt({
        currentPos: s.currentPos ? { lat: s.currentPos.lat, lng: s.currentPos.lng } : null,
        isAnchored: s.isAnchored,
        anchorPos: s.anchorPos ? { lat: s.anchorPos.lat, lng: s.anchorPos.lng } : null,
        radius: s.radius,
        anchorStartTime: s.anchorStartTime,
        alarmCount: s.alarmCount,
        distance: s.distance,
        alarmState: s.alarmState,
        maxDistanceSwing: s.maxDistanceSwing,
        maxSogDuringAnchor: s.maxSogDuringAnchor,
        chainLengthM: s.chainLengthM,
        depthM: s.depthM,
        accuracy: s.accuracy,
      });

      let weatherContext = '';
      if (s.currentPos) {
        try {
          weatherContext = await aiCtrl.fetchWeather(s.currentPos.lat, s.currentPos.lng);
        } catch {
          /* ignore weather fetch errors */
        }
      }

      const systemInstruction =
        'You are a helpful maritime assistant for the OpenAnchor app. ' +
        'You help sailors with anchoring, weather conditions, navigation, and safety. ' +
        'Be concise, practical, and safety-focused. Always respond in the language of the question.';

      const response = await aiCtrl.askWithContext(
        message,
        systemInstruction,
        contextPrompt,
        weatherContext,
      );

      setChatMessages((prev) => [...prev, { role: 'assistant', content: response }]);
      setAiLoading(false);

      if (response.includes('SUMMARY:') && response.includes('LOG:')) {
        const summaryMatch = response.match(/SUMMARY:\s*(.+)/);
        const logMatch = response.match(/LOG:\s*(.+)/);
        const safetyMatch = response.match(/SAFETY:\s*(.+)/);
        if (summaryMatch && logMatch) {
          setLogbookEntry({
            summary: summaryMatch[1].trim(),
            logEntry: logMatch[1].trim(),
            safetyNote: safetyMatch?.[1]?.trim() ?? '',
          });
        }
      }
    },
    [stateRef],
  );

  const handleAiClearChat = useCallback(() => {
    setChatMessages([]);
    setLogbookEntry(null);
    aiCtrl.clearChat();
  }, []);

  const handleSaveLogbook = useCallback(async () => {
    if (!logbookEntry || !stateRef.current!.sessionId) return;
    try {
      const db = session.db.current;
      if (db?.db) {
        await db.db.addLogbookEntry({
          sessionId: stateRef.current!.sessionId,
          createdAt: Date.now(),
          summary: logbookEntry.summary,
          logEntry: logbookEntry.logEntry,
          safetyNote: logbookEntry.safetyNote,
          isAiGenerated: true,
        });
      }
    } catch (err) {
      console.warn('Failed to save logbook entry:', err);
    }
  }, [logbookEntry, session, stateRef]);

  const handleSaveApiKey = useCallback(
    (key: string) => {
      aiCtrl.setKey(key);
      setHasAiKey(true);
      closeModal('apiKey');
      openModal('ai');
    },
    [closeModal, openModal],
  );

  const handleClearApiKey = useCallback(() => {
    aiCtrl.clearKey();
    setHasAiKey(false);
  }, []);

  // ═══════════════════════════════════════════
  // SESSION HISTORY HANDLERS
  // ═══════════════════════════════════════════
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

  // Auto-load history when modal opens
  useEffect(() => {
    if (modals.session) loadHistory();
  }, [modals.session, loadHistory]);

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

  // ═══════════════════════════════════════════
  // STATS
  // ═══════════════════════════════════════════
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

  // Auto-load stats when modal opens
  useEffect(() => {
    if (modals.stats) loadStats();
  }, [modals.stats, loadStats]);

  // ═══════════════════════════════════════════
  // CALC MODAL HANDLERS
  // ═══════════════════════════════════════════
  const handleCalcApply = useCallback(
    (radius: number) => {
      onRadiusChange(radius);
    },
    [onRadiusChange],
  );

  const handleCalcChainChange = useCallback(
    (v: number) => updateState({ chainLengthM: v }),
    [updateState],
  );

  const handleCalcDepthChange = useCallback(
    (v: number) => updateState({ depthM: v }),
    [updateState],
  );

  // ═══════════════════════════════════════════
  // OFFSET HANDLER
  // ═══════════════════════════════════════════
  const handleApplyOffset = useCallback(
    (distance: number, bearing: number) => {
      const s = stateRef.current!;
      if (!s.currentPos) return;

      alertCtrl.ensureAudioContext();
      const dest = GeoUtils.getDestinationPoint(
        s.currentPos.lat,
        s.currentPos.lng,
        distance,
        bearing,
      );
      const anchorPos = L.latLng(dest.lat, dest.lng);
      const anchorStartTime = Date.now();
      const bufferRadius = s.radius * 1.2;

      if (s.isAnchored) {
        mapHook.clearAnchor();
        mapHook.setAnchor(anchorPos);
        mapHook.drawSafeZone(
          anchorPos,
          s.radius,
          bufferRadius,
          { enabled: s.sectorEnabled, bearing: s.sectorBearing, width: s.sectorWidth },
          s.alarmState,
        );
        updateState({ anchorPos, bufferRadius });
        session.persistActiveState({ ...s, anchorPos, bufferRadius });
        if (syncRef.current!.isConnectedRef.current) {
          syncRef.current!.sendFullSync({ ...s, anchorPos, bufferRadius });
        }
      } else {
        alertCtrl.initPermissions();
        session
          .setAnchor(anchorPos, {
            ...s,
            anchorPos,
            bufferRadius,
            anchorStartTime,
            sessionId: null,
          })
          .then((sessionId) => {
            alertCtrl.requestWakeLock();
            mapHook.setAnchor(anchorPos);
            mapHook.drawSafeZone(
              anchorPos,
              s.radius,
              bufferRadius,
              { enabled: s.sectorEnabled, bearing: s.sectorBearing, width: s.sectorWidth },
              'SAFE',
            );
            mapHook.fitSafeZone();

            updateState({
              isAnchored: true,
              anchorPos,
              sessionId,
              anchorStartTime,
              bufferRadius,
              distance: 0,
              alarmState: 'SAFE',
              maxDistanceSwing: 0,
              maxSogDuringAnchor: 0,
              alarmCount: 0,
              dragHistory: [],
              dragWarningDismissed: false,
            });

            if (syncRef.current!.isConnectedRef.current) {
              syncRef.current!.sendFullSync({
                isAnchored: true,
                anchorPos,
                sectorEnabled: s.sectorEnabled,
                radius: s.radius,
                bufferRadius,
                unit: s.unit,
                sectorBearing: s.sectorBearing,
                sectorWidth: s.sectorWidth,
                chainLengthM: s.chainLengthM,
                depthM: s.depthM,
              });
            }
          });
      }
    },
    [alertCtrl, mapHook, updateState, session, stateRef, syncRef],
  );

  // ═══════════════════════════════════════════
  // SECTOR SAVE
  // ═══════════════════════════════════════════
  const handleSaveSector = useCallback(
    (enabled: boolean, bearing: number, width: number) => {
      updateState({ sectorEnabled: enabled, sectorBearing: bearing, sectorWidth: width });

      if (stateRef.current!.isAnchored && stateRef.current!.anchorPos) {
        alarm.recalculateZone({
          ...stateRef.current,
          sectorEnabled: enabled,
          sectorBearing: bearing,
          sectorWidth: width,
        });
        session.persistActiveState({
          ...stateRef.current!,
          sectorEnabled: enabled,
          sectorBearing: bearing,
          sectorWidth: width,
        });
      }

      if (syncRef.current!.isConnectedRef.current) {
        syncRef.current!.sendFullSync({
          ...stateRef.current!,
          sectorEnabled: enabled,
          sectorBearing: bearing,
          sectorWidth: width,
        });
      }
    },
    [updateState, alarm, session, stateRef, syncRef],
  );

  // ═══════════════════════════════════════════
  // SYNC HANDLERS
  // ═══════════════════════════════════════════
  const handleSyncConnect = useCallback(
    (url: string) => {
      sync.connect(url);
      setSyncUrlInput(url);
      closeModal('sync');
    },
    [sync, closeModal],
  );

  const handleSyncDisconnect = useCallback(() => {
    sync.disconnect();
    closeModal('sync');
  }, [sync, closeModal]);

  const handleQrConnect = useCallback(
    (url: string) => {
      sync.connect(url);
      setSyncUrlInput(url);
    },
    [sync],
  );

  // ═══════════════════════════════════════════
  // DRAG WARNING HANDLERS
  // ═══════════════════════════════════════════
  const handleDragDismiss = useCallback(() => {
    closeModal('dragWarning');
  }, [closeModal]);

  const handleDragCheck = useCallback(() => {
    closeModal('dragWarning');
    const pos = stateRef.current!.currentPos;
    const m = mapRef.current!.getMap();
    if (pos && m) {
      m.setView(pos, 19);
    }
  }, [closeModal, stateRef, mapRef]);

  // ═══════════════════════════════════════════
  // WATCH ALERT — restart timer
  // ═══════════════════════════════════════════
  const handleWatchAlertOk = useCallback(() => {
    closeModal('watchAlert');
    watchSchedule.startWatch(stateRef.current!.watchMinutes);
    updateState({ watchActive: true });
  }, [closeModal, watchSchedule, stateRef, updateState]);

  // ═══════════════════════════════════════════
  // ONBOARDING COMPLETE
  // ═══════════════════════════════════════════
  const handleOnboardingComplete = useCallback(() => {
    localStorage.setItem('anchor_onboarding_done', '1');
    closeModal('onboarding');
  }, [closeModal]);

  // ═══════════════════════════════════════════
  // WEATHER ASSESSMENT
  // ═══════════════════════════════════════════
  const weatherAssessment = assessWeather(
    weatherData.windSpeed,
    weatherData.windGust,
    weatherData.waveHeight,
    weatherData.windForecast,
    weatherData.gustForecast,
  );

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════
  return (
    <>
      <CalcModal
        open={modals.calc}
        onClose={() => closeModal('calc')}
        onApply={handleCalcApply}
        chainLengthM={state.chainLengthM}
        depthM={state.depthM}
        onChainChange={handleCalcChainChange}
        onDepthChange={handleCalcDepthChange}
      />

      <OffsetModal
        open={modals.offset}
        onClose={() => closeModal('offset')}
        cog={state.cog}
        onApply={handleApplyOffset}
      />

      <SectorModal
        open={modals.sector}
        onClose={() => closeModal('sector')}
        sectorEnabled={state.sectorEnabled}
        sectorBearing={state.sectorBearing}
        sectorWidth={state.sectorWidth}
        onSave={handleSaveSector}
      />

      <WatchModal
        open={modals.watch}
        onClose={() => closeModal('watch')}
        watchActive={watchSchedule.watchActive}
        watchMinutes={watchSchedule.watchMinutes}
        schedule={watchSchedule.schedule}
        onStartWatch={watchSchedule.startWatch}
        onCancelWatch={watchSchedule.cancelWatch}
        onAddScheduleItem={watchSchedule.addScheduleItem}
        onRemoveScheduleItem={watchSchedule.removeScheduleItem}
        onWatchMinutesChange={watchSchedule.setWatchMinutes}
      />

      <WeatherModal
        open={modals.weather}
        onClose={() => closeModal('weather')}
        loading={weatherData.loading}
        error={weatherData.error}
        windSpeed={weatherData.windSpeed}
        windGust={weatherData.windGust}
        windDir={weatherData.windDir}
        waveHeight={weatherData.waveHeight}
        wavePeriod={weatherData.wavePeriod}
        waveDir={weatherData.waveDir}
        windForecast={weatherData.windForecast}
        waveForecast={weatherData.waveForecast}
        gustForecast={weatherData.gustForecast}
        assessment={weatherAssessment}
        onFetch={fetchWeather}
      />

      <SyncModal
        open={modals.sync}
        onClose={() => closeModal('sync')}
        wsConnected={sync.isConnected}
        wsUrl={syncUrlInput}
        onConnect={handleSyncConnect}
        onDisconnect={handleSyncDisconnect}
        onUrlChange={setSyncUrlInput}
      />

      <AIModal
        open={modals.ai}
        onClose={() => closeModal('ai')}
        chatMessages={chatMessages}
        loading={aiLoading}
        onSendMessage={handleAiSendMessage}
        onClearChat={handleAiClearChat}
        logbookEntry={logbookEntry}
        onSaveLogbook={handleSaveLogbook}
        hasApiKey={hasAiKey}
        onOpenApiKeyModal={() => openModal('apiKey')}
      />

      <SessionModal
        open={modals.session}
        onClose={() => {
          closeModal('session');
          setReplayData(null);
        }}
        sessions={sessions}
        loading={sessionsLoading}
        onReplay={handleReplaySession}
        onExportGPX={handleExportGPX}
        onExportCSV={handleExportCSV}
        onDelete={handleDeleteSession}
        replaySession={replayData}
        replayMapRef={replayMapRef}
      />

      <AlertModals
        dragWarningOpen={modals.dragWarning}
        onDragDismiss={handleDragDismiss}
        onDragCheck={handleDragCheck}
        gpsLostOpen={modals.gpsLost}
        onGpsLostClose={() => closeModal('gpsLost')}
        batteryLowOpen={modals.batteryLow}
        onBatteryLowClose={() => closeModal('batteryLow')}
        watchAlertOpen={modals.watchAlert}
        onWatchAlertOk={handleWatchAlertOk}
        connLostOpen={modals.connLost}
        onConnLostClose={() => closeModal('connLost')}
      />

      <ApiKeyModal
        open={modals.apiKey}
        onClose={() => closeModal('apiKey')}
        onSave={handleSaveApiKey}
        onClear={handleClearApiKey}
        hasKey={hasAiKey}
      />

      <StatsModal open={modals.stats} onClose={() => closeModal('stats')} stats={statsData} />

      <QRScanModal open={modals.qr} onClose={() => closeModal('qr')} onConnect={handleQrConnect} />

      <SimpleMonitor
        visible={modals.simpleMonitor}
        distance={state.distance}
        sog={state.sog}
        cog={state.cog}
        accuracy={state.accuracy}
        unit={state.unit === 'ft' ? 'feet' : 'meters'}
        alarmState={state.alarmState}
        hasGpsFix={state.hasGpsFix}
        gpsSignalLost={state.gpsSignalLost}
        nightRedFilter={nightRedFilter}
        onClose={() => closeModal('simpleMonitor')}
        onDismissAlarm={onMuteAlarm}
        onToggleNightRed={() => setNightRedFilter((prev) => !prev)}
        onOpenMap={() => closeModal('simpleMonitor')}
      />

      <Onboarding visible={modals.onboarding} onComplete={handleOnboardingComplete} />
    </>
  );
}
