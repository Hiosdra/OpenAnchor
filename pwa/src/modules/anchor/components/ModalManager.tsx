/**
 * ModalManager — renders all modals, manages modal-local state & handlers.
 *
 * Receives core hook results as props from App.tsx so that all hook
 * composition stays in one place. Owns state and logic that is only
 * relevant to modal UIs (weather data, AI chat, session history, etc.).
 */

import { useState, useCallback } from 'react';
import L from 'leaflet';

import { useModalState, useModalActions } from '../contexts/ModalContext';
import { GeoUtils } from '../geo-utils';
import type { AnchorState } from '../hooks/useAnchorState';
import { useWeather } from '../hooks/useWeather';
import { useAIChat } from '../hooks/useAIChat';
import { useSessionHistory } from '../hooks/useSessionHistory';
import type { AnchorSession, TrackPoint } from '../session-db';

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
  // WEATHER (extracted hook)
  // ═══════════════════════════════════════════
  const { weatherData, fetchWeather, weatherAssessment } = useWeather({
    stateRef,
    isWeatherModalOpen: modals.weather,
  });

  // ═══════════════════════════════════════════
  // AI CHAT (extracted hook)
  // ═══════════════════════════════════════════
  const {
    chatMessages,
    aiLoading,
    logbookEntry,
    hasAiKey,
    handleAiSendMessage,
    handleAiClearChat,
    handleSaveLogbook,
    handleSaveApiKey,
    handleClearApiKey,
  } = useAIChat({
    stateRef,
    session,
    openModal,
    closeModal,
    isAiModalOpen: modals.ai,
  });

  // ═══════════════════════════════════════════
  // SESSION HISTORY (extracted hook)
  // ═══════════════════════════════════════════
  const {
    sessions,
    sessionsLoading,
    replayData,
    setReplayData,
    statsData,
    handleReplaySession,
    handleExportGPX,
    handleExportCSV,
    handleDeleteSession,
  } = useSessionHistory({
    session,
    isSessionModalOpen: modals.session,
    isStatsModalOpen: modals.stats,
  });

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
    // Imperatively re-hide in case the modal was shown via DOM manipulation (e2e tests)
    document.getElementById('watch-alert-modal')?.classList.add('hidden');
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
