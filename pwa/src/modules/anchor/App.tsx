/**
 * Anchor module — React App (Orchestrator)
 *
 * Composes all hooks, wires event handlers, and renders all components.
 * Replaces the old class-based anchor-app.ts orchestrator.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import L from 'leaflet';

import { I18nProvider, useI18n } from './hooks/useI18n';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useAnchorState, type AnchorState } from './hooks/useAnchorState';
import { useGPS } from './hooks/useGPS';
import { useSession } from './hooks/useSession';
import { useAlarmState, type AlarmProcessResult } from './hooks/useAlarmState';
import { useAlertController } from './hooks/useAlertController';
import { useSyncController } from './hooks/useSyncController';
import { useWatchSchedule } from './hooks/useWatchSchedule';
import { useMap } from './hooks/useMap';

import { GeoUtils } from './geo-utils';
import { AIController } from './ai-controller';
import type { AnchorSession, TrackPoint, LogbookEntry } from './session-db';

import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { MapContainer } from './components/MapContainer';
import { AlarmBar } from './components/AlarmBar';
import { Controls } from './components/Controls';
import { SimpleMonitor } from './components/SimpleMonitor';
import { Onboarding } from './components/Onboarding';

import { CalcModal } from './components/modals/CalcModal';
import { OffsetModal } from './components/modals/OffsetModal';
import { SectorModal } from './components/modals/SectorModal';
import { WatchModal } from './components/modals/WatchModal';
import { WeatherModal } from './components/modals/WeatherModal';
import { SyncModal } from './components/modals/SyncModal';
import { AIModal } from './components/modals/AIModal';
import { SessionModal } from './components/modals/SessionModal';
import { AlertModals } from './components/modals/AlertModals';
import { ApiKeyModal } from './components/modals/ApiKeyModal';
import { StatsModal } from './components/modals/StatsModal';
import { QRScanModal } from './components/modals/QRScanModal';

// ─── AI Controller singleton (stateless API wrapper, not a React hook) ───
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
  const maxFutureGust = gustForecast.length > 0 ? Math.max(...gustForecast.filter((v) => v != null)) : curGust;
  const maxFutureWind = windForecast.length > 0 ? Math.max(...windForecast.filter((v) => v != null)) : windSpeed;

  if (maxFutureGust > 35 || curWaveH > 2.5) {
    return { level: 'danger', text: `Dangerous: gusts to ${Math.round(maxFutureGust)} kn, waves ${curWaveH}m` };
  }
  if (maxFutureGust > 25 || curWaveH > 1.5 || maxFutureWind > 20) {
    return { level: 'caution', text: `Caution: gusts forecast to ${Math.round(maxFutureGust)} kn` };
  }
  if (windSpeed > 15 || curGust > 20) {
    return { level: 'moderate', text: `Moderate: wind ${windSpeed} kn, gusts ${curGust} kn` };
  }
  return { level: 'good', text: `Good conditions: wind ${windSpeed} kn` };
}

// ─── Max track points kept in-memory ───
const MAX_TRACK_POINTS = 500;

// ─── Persist state throttle ───
const PERSIST_INTERVAL_MS = 5000;

function AnchorApp() {
  const { t, lang, setLang } = useI18n();
  const { isOnline } = useOnlineStatus();
  const { state, setState, updateState, resetState, toggleUnit } = useAnchorState();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const replayMapRef = useRef<HTMLDivElement>(null);
  const lastPersistRef = useRef(0);

  // ─── STATE REFS (stable references for callbacks) ───
  const stateRef = useRef(state);
  stateRef.current = state;

  // ═══════════════════════════════════════════
  // MODAL STATE
  // ═══════════════════════════════════════════
  const [calcModalOpen, setCalcModalOpen] = useState(false);
  const [offsetModalOpen, setOffsetModalOpen] = useState(false);
  const [sectorModalOpen, setSectorModalOpen] = useState(false);
  const [watchModalOpen, setWatchModalOpen] = useState(false);
  const [weatherModalOpen, setWeatherModalOpen] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [simpleMonitorOpen, setSimpleMonitorOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  // Alert modals
  const [dragWarningOpen, setDragWarningOpen] = useState(false);
  const [gpsLostOpen, setGpsLostOpen] = useState(false);
  const [batteryLowOpen, setBatteryLowOpen] = useState(false);
  const [watchAlertOpen, setWatchAlertOpen] = useState(false);
  const [connLostOpen, setConnLostOpen] = useState(false);

  // Simple monitor extras
  const [nightRedFilter, setNightRedFilter] = useState(false);

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
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [logbookEntry, setLogbookEntry] = useState<{ summary: string; logEntry: string; safetyNote: string } | null>(null);
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
  // SYNC WS URL local state (for SyncModal editing)
  // ═══════════════════════════════════════════
  const [syncUrlInput, setSyncUrlInput] = useState(
    () => localStorage.getItem('anchor_ws_url') || '',
  );

  // ═══════════════════════════════════════════
  // HOOKS — ALERT CONTROLLER
  // ═══════════════════════════════════════════
  const alertCtrl = useAlertController({
    onLowBattery: useCallback((data) => {
      setBatteryLowOpen(true);
      // Also tell the peer
      syncRef.current?.sendTriggerAlarm(data.reason, data.message, data.alarmState);
    }, []),
    isAnchored: useCallback(() => stateRef.current.isAnchored, []),
  });

  // ═══════════════════════════════════════════
  // HOOKS — SYNC CONTROLLER
  // ═══════════════════════════════════════════
  const sync = useSyncController({
    onMessage: useCallback((type: string, data: Record<string, any>) => {
      if (type === 'ACTION_COMMAND') {
        if (data.action === 'MUTE' || data.action === 'DISMISS') {
          alertCtrl.stopAlarm();
        }
      }
      if (type === 'ANDROID_GPS_REPORT' && data.pos) {
        const pos = L.latLng(data.pos.lat, data.pos.lng);
        mapRef.current?.updatePhoneMarker(pos, data.gpsAccuracy ?? 10);
      }
    }, []),
  });

  // Stable ref so callbacks can access sync without dep changes
  const syncRef = useRef(sync);
  syncRef.current = sync;

  // ═══════════════════════════════════════════
  // HOOKS — ALARM STATE
  // ═══════════════════════════════════════════
  const alarm = useAlarmState({
    onAlarmTriggered: useCallback(
      (newState, previousState, distStr) => {
        if (newState === 'ALARM') {
          alertCtrl.startAlarm(1000);
          if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 500]);
          alertCtrl.sendNotification('⚠️ Anchor Alarm!', `Yacht outside safe zone! (${distStr})`);
        } else if (newState === 'WARNING' && previousState !== 'ALARM') {
          alertCtrl.playBeep('warning');
        } else if (newState === 'CAUTION' && previousState === 'SAFE') {
          alertCtrl.playBeep('warning');
          alertCtrl.sendNotification('⚠ Caution', 'Approaching safe zone boundary');
        } else if (newState === 'SAFE' && (previousState === 'ALARM' || previousState === 'WARNING')) {
          alertCtrl.stopAlarm();
        }
      },
      [alertCtrl],
    ),
    onZoneChanged: useCallback(
      (anchorPos, radius, bufferRadius, sector, alarmState) => {
        mapRef.current?.drawSafeZone(anchorPos, radius, bufferRadius, sector, alarmState);
      },
      [],
    ),
    onSyncMessage: useCallback(
      (type: string, payload: Record<string, unknown>) => {
        syncRef.current.sendMessage(type, payload as Record<string, any>);
      },
      [],
    ),
  });

  // ═══════════════════════════════════════════
  // HOOKS — MAP
  // ═══════════════════════════════════════════
  const mapHook = useMap({
    containerRef: mapContainerRef,
    onMapDragStart: useCallback(() => {
      updateState({ mapAutoCenter: false });
    }, [updateState]),
    onAnchorDragEnd: useCallback(
      (newPos: L.LatLng) => {
        updateState({ anchorPos: newPos });
        alarm.recalculateZone({
          isAnchored: stateRef.current.isAnchored,
          anchorPos: newPos,
          radius: stateRef.current.radius,
          bufferRadius: stateRef.current.bufferRadius,
          sectorEnabled: stateRef.current.sectorEnabled,
          sectorBearing: stateRef.current.sectorBearing,
          sectorWidth: stateRef.current.sectorWidth,
          alarmState: stateRef.current.alarmState,
        });
      },
      [updateState, alarm],
    ),
  });

  // Stable ref for map
  const mapRef = useRef(mapHook);
  mapRef.current = mapHook;

  // ═══════════════════════════════════════════
  // HOOKS — SESSION (IndexedDB)
  // ═══════════════════════════════════════════
  const session = useSession();

  // ═══════════════════════════════════════════
  // HOOKS — GPS
  // ═══════════════════════════════════════════
  const handleGpsPosition = useCallback(
    (position: GeolocationPosition) => {
      const s = stateRef.current;
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const pos = L.latLng(lat, lng);
      const rawAccuracy = position.coords.accuracy;
      const accuracy = rawAccuracy >= 0 && isFinite(rawAccuracy) ? rawAccuracy : s.accuracy;
      let sog = s.sog;
      let cog = s.cog;
      let maxSogDuringAnchor = s.maxSogDuringAnchor;

      if (position.coords.speed !== null) {
        sog = position.coords.speed * GeoUtils.MPS2KNOTS;
        if (s.isAnchored && sog > maxSogDuringAnchor) maxSogDuringAnchor = sog;
      }
      if (position.coords.heading !== null && !isNaN(position.coords.heading)) {
        cog = position.coords.heading;
      }

      // Update map boat
      mapRef.current.updateBoat(pos, accuracy, cog, !s.isAnchored && s.mapAutoCenter);

      // Run alarm processing if anchored
      let alarmResult: AlarmProcessResult | null = null;
      if (s.isAnchored && s.anchorPos) {
        alarmResult = alarm.processPosition(
          {
            isAnchored: s.isAnchored,
            anchorPos: s.anchorPos,
            currentPos: pos,
            radius: s.radius,
            bufferRadius: s.bufferRadius,
            sectorEnabled: s.sectorEnabled,
            sectorBearing: s.sectorBearing,
            sectorWidth: s.sectorWidth,
            dragHistory: s.dragHistory,
            dragWarningDismissed: s.dragWarningDismissed,
            alarmState: s.alarmState,
            maxDistanceSwing: s.maxDistanceSwing,
            unit: s.unit,
          },
          pos,
        );

        // Handle drag detection
        if (alarmResult.dragDetected) {
          setDragWarningOpen(true);
        }
      }

      // Track points
      const newTrack = [...s.track, pos];
      if (newTrack.length > MAX_TRACK_POINTS) newTrack.shift();
      mapRef.current.updateTrack(newTrack);

      // Buffer track point for DB persistence
      if (s.isAnchored && s.sessionId) {
        session.bufferTrackPoint({
          sessionId: s.sessionId,
          lat,
          lng,
          accuracy,
          timestamp: Date.now(),
          distance: alarmResult?.distance ?? s.distance,
          alarmState: alarmResult?.alarmState ?? s.alarmState,
        });
      }

      // Build state update
      const stateUpdates: Partial<AnchorState> = {
        currentPos: pos,
        accuracy,
        sog,
        cog,
        maxSogDuringAnchor,
        hasGpsFix: true,
        gpsSignalLost: false,
        track: newTrack,
      };

      if (alarmResult) {
        stateUpdates.distance = alarmResult.distance;
        stateUpdates.alarmState = alarmResult.alarmState;
        stateUpdates.maxDistanceSwing = alarmResult.maxDistanceSwing;
        stateUpdates.dragHistory = alarmResult.dragHistory;
        stateUpdates.dragWarningDismissed = alarmResult.dragWarningDismissed;
        if (alarmResult.alarmState === 'ALARM' && alarmResult.previousAlarmState !== 'ALARM') {
          stateUpdates.alarmCount = (s.alarmCount ?? 0) + 1;
        }
      }

      updateState(stateUpdates);

      // Periodic persistence
      const now = Date.now();
      if (s.isAnchored && now - lastPersistRef.current > PERSIST_INTERVAL_MS) {
        lastPersistRef.current = now;
        session.persistActiveState({
          ...s,
          ...stateUpdates,
          anchorPos: stateUpdates.anchorPos ?? s.anchorPos,
        } as any);
      }
    },
    [alarm, session, updateState],
  );

  const handleGpsError = useCallback(
    (_error: GeolocationPositionError) => {
      // GPS errors are handled via the watchdog timer
    },
    [],
  );

  const gps = useGPS({
    onPosition: handleGpsPosition,
    onError: handleGpsError,
  });

  // ═══════════════════════════════════════════
  // HOOKS — WATCH SCHEDULE
  // ═══════════════════════════════════════════
  const watchSchedule = useWatchSchedule();

  // ═══════════════════════════════════════════
  // GPS WATCHDOG HANDLER
  // ═══════════════════════════════════════════
  const handleGpsLost = useCallback(() => {
    updateState({ gpsSignalLost: true });
    setGpsLostOpen(true);
    alertCtrl.sendNotification('⚠ GPS Signal Lost', 'No GPS fix for 60 seconds');
  }, [updateState, alertCtrl]);

  // ═══════════════════════════════════════════
  // WATCH EXPIRED HANDLER
  // ═══════════════════════════════════════════
  const handleWatchExpired = useCallback(() => {
    alertCtrl.playBeep('sine');
    if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
    setWatchAlertOpen(true);
    syncRef.current.sendMessage('TRIGGER_ALARM', {
      reason: 'WATCH_EXPIRED',
      message: 'Watch timer expired!',
      alarmState: 'WARNING',
    });
  }, [alertCtrl]);

  // ═══════════════════════════════════════════
  // TICK INTERVAL (1s)
  // ═══════════════════════════════════════════
  useEffect(() => {
    const interval = setInterval(() => {
      gps.checkGpsWatchdog(handleGpsLost);
      gps.checkBatterySaver(
        alertCtrl.lastKnownBatteryLevelRef.current,
        alertCtrl.lastKnownChargingStateRef.current,
      );

      if (stateRef.current.watchActive) {
        const expired = watchSchedule.checkWatchTimer();
        if (expired) handleWatchExpired();
      }

      sync.checkHeartbeat();

      // Check schedule for auto-start
      const slot = watchSchedule.getActiveScheduleSlot();
      if (slot && !stateRef.current.watchActive) {
        watchSchedule.startWatch(stateRef.current.watchMinutes);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gps, alertCtrl, watchSchedule, sync, handleGpsLost, handleWatchExpired]);

  // ═══════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════
  useEffect(() => {
    let mounted = true;
    async function init() {
      const restoredState = await session.initDB();
      if (!mounted) return;

      if (restoredState) {
        updateState(restoredState);

        // Restore map state
        if (restoredState.anchorPos) {
          // Defer map operations to allow the map to mount first
          setTimeout(() => {
            mapRef.current.setAnchor(restoredState.anchorPos);
            mapRef.current.drawSafeZone(
              restoredState.anchorPos,
              restoredState.radius,
              restoredState.bufferRadius,
              {
                enabled: restoredState.sectorEnabled,
                bearing: restoredState.sectorBearing,
                width: restoredState.sectorWidth,
              },
              'SAFE',
            );
            if (restoredState.track.length > 0) {
              mapRef.current.updateTrack(restoredState.track);
            }
            mapRef.current.fitSafeZone();
          }, 500);
        }

        alertCtrl.requestWakeLock();
      }

      gps.initGPS();

      // Onboarding check
      if (!localStorage.getItem('anchor_onboarding_done')) {
        setOnboardingOpen(true);
      }
    }
    init();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ═══════════════════════════════════════════
  // BEFOREUNLOAD — flush track points
  // ═══════════════════════════════════════════
  useEffect(() => {
    const handler = () => {
      session.flushTrackPoints();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [session]);

  // ═══════════════════════════════════════════
  // CONNECTION LOST WARNING (sync)
  // ═══════════════════════════════════════════
  useEffect(() => {
    if (sync.connectionLostWarning) {
      setConnLostOpen(true);
    }
  }, [sync.connectionLostWarning]);

  // ═══════════════════════════════════════════
  // SYNC STATE UPDATE INTERVAL
  // ═══════════════════════════════════════════
  useEffect(() => {
    if (sync.isConnected && state.isAnchored) {
      sync.startStateUpdateInterval(() => ({
        currentPos: stateRef.current.currentPos,
        accuracy: stateRef.current.accuracy,
        distance: stateRef.current.distance,
        alarmState: stateRef.current.alarmState,
        sog: stateRef.current.sog,
        cog: stateRef.current.cog,
        batteryLevel: alertCtrl.lastKnownBatteryLevelRef.current,
        isCharging: alertCtrl.lastKnownChargingStateRef.current,
      }));
    }
  }, [sync.isConnected, state.isAnchored, sync, alertCtrl]);

  // ═══════════════════════════════════════════
  // ANCHOR TOGGLE
  // ═══════════════════════════════════════════
  const handleToggleAnchor = useCallback(async () => {
    alertCtrl.ensureAudioContext();

    if (state.isAnchored) {
      // ── Lift anchor ──
      const alarmTriggered = (state.alarmCount ?? 0) > 0;
      await session.liftAnchor({
        sessionId: state.sessionId,
        maxDistanceSwing: state.maxDistanceSwing,
        maxSogDuringAnchor: state.maxSogDuringAnchor,
        alarmTriggered,
      });
      alertCtrl.releaseWakeLock();
      alertCtrl.stopAlarm();
      mapHook.clearAnchor();
      alarm.resetEngine();

      updateState({
        isAnchored: false,
        anchorPos: null,
        sessionId: null,
        anchorStartTime: null,
        distance: 0,
        alarmState: 'SAFE',
        maxDistanceSwing: 0,
        maxSogDuringAnchor: 0,
        alarmCount: 0,
        dragHistory: [],
        dragWarningDismissed: false,
        track: [],
      });

      if (sync.isConnectedRef.current) {
        sync.sendMessage('DISCONNECT', { reason: 'session_end' });
      }
    } else {
      // ── Drop anchor ──
      if (!state.currentPos) return;
      alertCtrl.initPermissions();

      const anchorPos = state.currentPos;
      const anchorStartTime = Date.now();
      const bufferRadius = state.radius * 1.2;

      const sessionId = await session.setAnchor(anchorPos, {
        ...state,
        anchorPos,
        bufferRadius,
        anchorStartTime,
        sessionId: null,
      });

      alertCtrl.requestWakeLock();
      mapHook.setAnchor(anchorPos);
      mapHook.drawSafeZone(
        anchorPos,
        state.radius,
        bufferRadius,
        {
          enabled: state.sectorEnabled,
          bearing: state.sectorBearing,
          width: state.sectorWidth,
        },
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

      if (sync.isConnectedRef.current) {
        sync.sendFullSync({
          isAnchored: true,
          anchorPos,
          sectorEnabled: state.sectorEnabled,
          radius: state.radius,
          bufferRadius,
          unit: state.unit,
          sectorBearing: state.sectorBearing,
          sectorWidth: state.sectorWidth,
          chainLengthM: state.chainLengthM,
          depthM: state.depthM,
        });
      }
    }
  }, [state, session, alertCtrl, mapHook, alarm, sync, updateState]);

  // ═══════════════════════════════════════════
  // RADIUS CHANGE
  // ═══════════════════════════════════════════
  const handleRadiusChange = useCallback(
    (newRadius: number) => {
      const clamped = Math.max(5, Math.min(500, newRadius));
      const bufferRadius = clamped * 1.2;
      updateState({ radius: clamped, bufferRadius });

      if (stateRef.current.isAnchored && stateRef.current.anchorPos) {
        alarm.recalculateZone({
          ...stateRef.current,
          radius: clamped,
          bufferRadius,
        });
        session.persistActiveState({
          ...stateRef.current,
          radius: clamped,
          bufferRadius,
        });
      }

      if (syncRef.current.isConnectedRef.current) {
        syncRef.current.sendFullSync({
          ...stateRef.current,
          radius: clamped,
          bufferRadius,
        });
      }
    },
    [updateState, alarm, session],
  );

  // ═══════════════════════════════════════════
  // MUTE / DISMISS ALARM
  // ═══════════════════════════════════════════
  const handleMuteAlarm = useCallback(() => {
    alertCtrl.stopAlarm();
  }, [alertCtrl]);

  // ═══════════════════════════════════════════
  // CENTER MAP
  // ═══════════════════════════════════════════
  const handleCenterMap = useCallback(() => {
    updateState({ mapAutoCenter: true });
    const s = stateRef.current;
    const m = mapRef.current.getMap();
    if (m) {
      if (s.isAnchored && s.anchorPos) {
        m.setView(s.anchorPos);
      } else if (s.currentPos) {
        m.setView(s.currentPos, 18);
      }
    }
  }, [updateState]);

  // ═══════════════════════════════════════════
  // MAP LAYER TOGGLE
  // ═══════════════════════════════════════════
  const handleToggleMapLayer = useCallback(() => {
    mapHook.toggleLayer();
  }, [mapHook]);

  // ═══════════════════════════════════════════
  // NIGHT MODE TOGGLE
  // ═══════════════════════════════════════════
  const handleToggleNightMode = useCallback(() => {
    updateState((prev) => ({ nightMode: !prev.nightMode }));
  }, [updateState]);

  // Sync night-vision class to <body> for global CSS filter
  useEffect(() => {
    document.body.classList.toggle('night-vision', state.nightMode);
    return () => { document.body.classList.remove('night-vision'); };
  }, [state.nightMode]);

  // ═══════════════════════════════════════════
  // LANG TOGGLE
  // ═══════════════════════════════════════════
  const handleToggleLang = useCallback(() => {
    setLang(lang === 'pl' ? 'en' : 'pl');
  }, [lang, setLang]);

  // ═══════════════════════════════════════════
  // OFFSET HANDLER
  // ═══════════════════════════════════════════
  const handleOpenOffset = useCallback(() => {
    setOffsetModalOpen(true);
  }, []);

  const handleApplyOffset = useCallback(
    (distance: number, bearing: number) => {
      const s = stateRef.current;
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

      // If already anchored, update the anchor position
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
        if (syncRef.current.isConnectedRef.current) {
          syncRef.current.sendFullSync({ ...s, anchorPos, bufferRadius });
        }
      } else {
        // Drop anchor at offset position
        alertCtrl.initPermissions();
        session.setAnchor(anchorPos, {
          ...s,
          anchorPos,
          bufferRadius,
          anchorStartTime,
          sessionId: null,
        }).then((sessionId) => {
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

          if (syncRef.current.isConnectedRef.current) {
            syncRef.current.sendFullSync({
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
    [alertCtrl, mapHook, updateState, session],
  );

  // ═══════════════════════════════════════════
  // SECTOR SAVE
  // ═══════════════════════════════════════════
  const handleSaveSector = useCallback(
    (enabled: boolean, bearing: number, width: number) => {
      updateState({ sectorEnabled: enabled, sectorBearing: bearing, sectorWidth: width });

      if (stateRef.current.isAnchored && stateRef.current.anchorPos) {
        alarm.recalculateZone({
          ...stateRef.current,
          sectorEnabled: enabled,
          sectorBearing: bearing,
          sectorWidth: width,
        });
        session.persistActiveState({
          ...stateRef.current,
          sectorEnabled: enabled,
          sectorBearing: bearing,
          sectorWidth: width,
        });
      }

      if (syncRef.current.isConnectedRef.current) {
        syncRef.current.sendFullSync({
          ...stateRef.current,
          sectorEnabled: enabled,
          sectorBearing: bearing,
          sectorWidth: width,
        });
      }
    },
    [updateState, alarm, session],
  );

  // ═══════════════════════════════════════════
  // CALC MODAL APPLY
  // ═══════════════════════════════════════════
  const handleCalcApply = useCallback(
    (radius: number) => {
      handleRadiusChange(radius);
    },
    [handleRadiusChange],
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
  // WEATHER FETCH
  // ═══════════════════════════════════════════
  const fetchWeather = useCallback(async () => {
    const pos = stateRef.current.currentPos;
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
  }, []);

  // ═══════════════════════════════════════════
  // AI CHAT
  // ═══════════════════════════════════════════
  const handleAiSendMessage = useCallback(
    async (message: string) => {
      setChatMessages((prev) => [...prev, { role: 'user', content: message }]);
      setAiLoading(true);

      const s = stateRef.current;
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

      const response = await aiCtrl.askWithContext(message, systemInstruction, contextPrompt, weatherContext);

      setChatMessages((prev) => [...prev, { role: 'assistant', content: response }]);
      setAiLoading(false);

      // Check if the response contains a logbook-like structure
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
    [],
  );

  const handleAiClearChat = useCallback(() => {
    setChatMessages([]);
    setLogbookEntry(null);
    aiCtrl.clearChat();
  }, []);

  const handleSaveLogbook = useCallback(async () => {
    if (!logbookEntry || !stateRef.current.sessionId) return;
    try {
      const db = session.db.current;
      if (db?.db) {
        await db.addLogbookEntry({
          sessionId: stateRef.current.sessionId,
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
  }, [logbookEntry, session]);

  const checkAiKey = useCallback(() => {
    if (aiCtrl.apiKey) {
      setAiModalOpen(true);
    } else {
      setApiKeyModalOpen(true);
    }
  }, []);

  const handleSaveApiKey = useCallback((key: string) => {
    aiCtrl.setKey(key);
    setHasAiKey(true);
    setApiKeyModalOpen(false);
    setAiModalOpen(true);
  }, []);

  const handleClearApiKey = useCallback(() => {
    aiCtrl.clearKey();
    setHasAiKey(false);
  }, []);

  // ═══════════════════════════════════════════
  // SESSION HISTORY
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

  const handleReplaySession = useCallback(
    async (sessionId: number) => {
      const { session: s, points } = await session.getSessionReplay(sessionId);
      if (!s) return;
      let logEntries: LogbookEntry[] = [];
      try {
        const db = session.db.current;
        if (db?.db) {
          logEntries = await db.getLogbookEntries(sessionId);
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
        (pt) => `${pt.timestamp},${pt.lat},${pt.lng},${pt.accuracy},${pt.distance},${pt.alarmState}`,
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

  // ═══════════════════════════════════════════
  // SHARE POSITION
  // ═══════════════════════════════════════════
  const handleSharePosition = useCallback(() => {
    const pos = stateRef.current.currentPos;
    if (!pos) return;
    const url = `https://www.google.com/maps?q=${pos.lat},${pos.lng}`;
    if (navigator.share) {
      navigator.share({
        title: 'OpenAnchor',
        text: `Position: ${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`,
        url,
      }).catch(() => {});
    } else {
      window.open(url, '_blank');
    }
  }, []);

  // ═══════════════════════════════════════════
  // TOOL OPEN HANDLER
  // ═══════════════════════════════════════════
  const handleOpenTool = useCallback(
    (tool: string) => {
      switch (tool) {
        case 'calc':
          setCalcModalOpen(true);
          break;
        case 'sector':
          setSectorModalOpen(true);
          break;
        case 'watch':
          setWatchModalOpen(true);
          break;
        case 'weather':
          fetchWeather();
          setWeatherModalOpen(true);
          break;
        case 'monitor':
          setSimpleMonitorOpen(true);
          break;
        case 'history':
          loadHistory();
          setSessionModalOpen(true);
          break;
        case 'ai':
          checkAiKey();
          break;
        case 'share':
          handleSharePosition();
          break;
        case 'qr':
          setQrModalOpen(true);
          break;
        case 'stats':
          loadStats();
          setStatsModalOpen(true);
          break;
        case 'sync':
          setSyncModalOpen(true);
          break;
      }
    },
    [fetchWeather, loadHistory, checkAiKey, handleSharePosition, loadStats],
  );

  // ═══════════════════════════════════════════
  // ONBOARDING COMPLETE
  // ═══════════════════════════════════════════
  const handleOnboardingComplete = useCallback(() => {
    localStorage.setItem('anchor_onboarding_done', '1');
    setOnboardingOpen(false);
  }, []);

  // ═══════════════════════════════════════════
  // DRAG WARNING HANDLERS
  // ═══════════════════════════════════════════
  const handleDragDismiss = useCallback(() => {
    setDragWarningOpen(false);
  }, []);

  const handleDragCheck = useCallback(() => {
    setDragWarningOpen(false);
    const pos = stateRef.current.currentPos;
    const m = mapRef.current.getMap();
    if (pos && m) {
      m.setView(pos, 19);
    }
  }, []);

  // ═══════════════════════════════════════════
  // WATCH ALERT OK — restart timer
  // ═══════════════════════════════════════════
  const handleWatchAlertOk = useCallback(() => {
    setWatchAlertOpen(false);
    document.getElementById('watch-alert-modal')?.classList.add('hidden');
    watchSchedule.startWatch(stateRef.current.watchMinutes);
    updateState({ watchActive: true });
  }, [watchSchedule, updateState]);

  // ═══════════════════════════════════════════
  // SYNC HANDLERS
  // ═══════════════════════════════════════════
  const handleSyncConnect = useCallback(
    (url: string) => {
      sync.connect(url);
      setSyncUrlInput(url);
      setSyncModalOpen(false);
    },
    [sync],
  );

  const handleSyncDisconnect = useCallback(() => {
    sync.disconnect();
    setSyncModalOpen(false);
  }, [sync]);

  const handleQrConnect = useCallback(
    (url: string) => {
      sync.connect(url);
      setSyncUrlInput(url);
    },
    [sync],
  );

  // ═══════════════════════════════════════════
  // WEATHER ASSESSMENT (memoized)
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
    <div id="app-body" className={`app-container ${state.nightMode ? 'night-vision' : ''}`}>
      <Header
        isOnline={isOnline}
        nightMode={state.nightMode}
        onToggleNightMode={handleToggleNightMode}
        unit={state.unit === 'ft' ? 'feet' : 'meters'}
        onToggleUnit={toggleUnit}
        onToggleLang={handleToggleLang}
        wsConnected={sync.isConnected}
        peerBattery={sync.peerBattery}
        peerCharging={sync.peerCharging}
        hasGpsFix={state.hasGpsFix}
        gpsSignalLost={state.gpsSignalLost}
        batterySaverActive={gps.batterySaverActive}
      />

      <Dashboard
        distance={state.distance}
        sog={state.sog}
        cog={state.cog}
        accuracy={state.accuracy}
        unit={state.unit === 'ft' ? 'feet' : 'meters'}
        isAnchored={state.isAnchored}
      />

      <MapContainer
        mapRef={mapContainerRef}
        hasGpsFix={state.hasGpsFix}
        gpsSignalLost={state.gpsSignalLost}
      />

      <AlarmBar
        alarmState={state.alarmState}
        distance={state.distance}
        unit={state.unit === 'ft' ? 'feet' : 'meters'}
        isAnchored={state.isAnchored}
        onDismissAlarm={handleMuteAlarm}
      />

      <Controls
        isAnchored={state.isAnchored}
        radius={state.radius}
        unit={state.unit === 'ft' ? 'feet' : 'meters'}
        sectorEnabled={state.sectorEnabled}
        alarmState={state.alarmState}
        hasGpsFix={state.hasGpsFix}
        onToggleAnchor={handleToggleAnchor}
        onRadiusChange={handleRadiusChange}
        onOpenTool={handleOpenTool}
        onOffset={handleOpenOffset}
        onMuteAlarm={handleMuteAlarm}
        onCenterMap={handleCenterMap}
        onToggleMapLayer={handleToggleMapLayer}
        mapAutoCenter={state.mapAutoCenter}
      />

      {/* ═══ Modals ═══ */}

      <CalcModal
        open={calcModalOpen}
        onClose={() => setCalcModalOpen(false)}
        onApply={handleCalcApply}
        chainLengthM={state.chainLengthM}
        depthM={state.depthM}
        onChainChange={handleCalcChainChange}
        onDepthChange={handleCalcDepthChange}
      />

      <OffsetModal
        open={offsetModalOpen}
        onClose={() => setOffsetModalOpen(false)}
        cog={state.cog}
        onApply={handleApplyOffset}
      />

      <SectorModal
        open={sectorModalOpen}
        onClose={() => setSectorModalOpen(false)}
        sectorEnabled={state.sectorEnabled}
        sectorBearing={state.sectorBearing}
        sectorWidth={state.sectorWidth}
        onSave={handleSaveSector}
      />

      <WatchModal
        open={watchModalOpen}
        onClose={() => setWatchModalOpen(false)}
        watchActive={watchSchedule.watchActive}
        watchMinutes={watchSchedule.watchMinutes}
        schedule={watchSchedule.schedule as any}
        onStartWatch={watchSchedule.startWatch}
        onCancelWatch={watchSchedule.cancelWatch}
        onAddScheduleItem={watchSchedule.addScheduleItem as any}
        onRemoveScheduleItem={watchSchedule.removeScheduleItem}
        onWatchMinutesChange={watchSchedule.setWatchMinutes}
      />

      <WeatherModal
        open={weatherModalOpen}
        onClose={() => setWeatherModalOpen(false)}
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
        open={syncModalOpen}
        onClose={() => setSyncModalOpen(false)}
        wsConnected={sync.isConnected}
        wsUrl={syncUrlInput}
        onConnect={handleSyncConnect}
        onDisconnect={handleSyncDisconnect}
        onUrlChange={setSyncUrlInput}
      />

      <AIModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        chatMessages={chatMessages}
        loading={aiLoading}
        onSendMessage={handleAiSendMessage}
        onClearChat={handleAiClearChat}
        logbookEntry={logbookEntry}
        onSaveLogbook={handleSaveLogbook}
        hasApiKey={hasAiKey}
        onOpenApiKeyModal={() => setApiKeyModalOpen(true)}
      />

      <SessionModal
        open={sessionModalOpen}
        onClose={() => {
          setSessionModalOpen(false);
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
        dragWarningOpen={dragWarningOpen}
        onDragDismiss={handleDragDismiss}
        onDragCheck={handleDragCheck}
        gpsLostOpen={gpsLostOpen}
        onGpsLostClose={() => setGpsLostOpen(false)}
        batteryLowOpen={batteryLowOpen}
        onBatteryLowClose={() => setBatteryLowOpen(false)}
        watchAlertOpen={watchAlertOpen}
        onWatchAlertOk={handleWatchAlertOk}
        connLostOpen={connLostOpen}
        onConnLostClose={() => setConnLostOpen(false)}
      />

      <ApiKeyModal
        open={apiKeyModalOpen}
        onClose={() => setApiKeyModalOpen(false)}
        onSave={handleSaveApiKey}
        onClear={handleClearApiKey}
        hasKey={hasAiKey}
      />

      <StatsModal
        open={statsModalOpen}
        onClose={() => setStatsModalOpen(false)}
        stats={statsData}
      />

      <QRScanModal
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        onConnect={handleQrConnect}
      />

      {/* ═══ Overlays ═══ */}

      <SimpleMonitor
        visible={simpleMonitorOpen}
        distance={state.distance}
        sog={state.sog}
        cog={state.cog}
        accuracy={state.accuracy}
        unit={state.unit === 'ft' ? 'feet' : 'meters'}
        alarmState={state.alarmState}
        hasGpsFix={state.hasGpsFix}
        gpsSignalLost={state.gpsSignalLost}
        nightRedFilter={nightRedFilter}
        onClose={() => setSimpleMonitorOpen(false)}
        onDismissAlarm={handleMuteAlarm}
        onToggleNightRed={() => setNightRedFilter((prev) => !prev)}
        onOpenMap={() => setSimpleMonitorOpen(false)}
      />

      <Onboarding
        visible={onboardingOpen}
        onComplete={handleOnboardingComplete}
      />
    </div>
  );
}

export function App() {
  return (
    <I18nProvider>
      <AnchorApp />
    </I18nProvider>
  );
}
