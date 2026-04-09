/**
 * Anchor module — React App (Orchestrator)
 *
 * Composes all hooks, wires event handlers, and renders the main layout.
 * Modal rendering and modal-local state are delegated to ModalManager.
 */

import { useRef, useCallback, useEffect } from 'react';
import L from 'leaflet';

import { MessageType } from '@shared/constants/protocol';
import { I18nProvider, useI18n } from './hooks/useI18n';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useAnchorState } from './hooks/useAnchorState';
import { useGPS } from './hooks/useGPS';
import { useSession } from './hooks/useSession';
import { useAlarmState } from './hooks/useAlarmState';
import { useAlertController } from './hooks/useAlertController';
import { useSyncController } from './hooks/useSyncController';
import { useWatchSchedule } from './hooks/useWatchSchedule';
import { useMap } from './hooks/useMap';
import { useAnchorActions } from './hooks/useAnchorActions';

import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { MapContainer } from './components/MapContainer';
import { AlarmBar } from './components/AlarmBar';
import { Controls } from './components/Controls';
import { ModalManager } from './components/ModalManager';
import { ModalProvider, useModalActions, type ModalName } from './contexts/ModalContext';

const TOOL_MODAL_MAP: Record<string, ModalName> = {
  calc: 'calc',
  sector: 'sector',
  watch: 'watch',
  weather: 'weather',
  monitor: 'simpleMonitor',
  history: 'session',
  ai: 'ai',
  qr: 'qr',
  stats: 'stats',
  sync: 'sync',
};

function AnchorApp() {
  const { t, lang, setLang } = useI18n();
  const { isOnline } = useOnlineStatus();
  const { state, setState, updateState, resetState, toggleUnit } = useAnchorState();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const replayMapRef = useRef<HTMLDivElement>(null);

  // ─── STATE REFS (stable references for callbacks) ───
  const stateRef = useRef(state);
  stateRef.current = state;

  // ─── MODAL ACTIONS (stable — no re-render on modal state changes) ───
  const { openModal } = useModalActions();

  // HOOKS — ALERT CONTROLLER
  const alertCtrl = useAlertController({
    onLowBattery: useCallback(
      (data) => {
        openModal('batteryLow');
        // Also tell the peer
        syncRef.current?.sendTriggerAlarm(data.reason, data.message, data.alarmState);
      },
      [openModal],
    ),
    isAnchored: useCallback(() => stateRef.current.isAnchored, []),
  });

  // HOOKS — SYNC CONTROLLER
  const sync = useSyncController({
    onMessage: useCallback((type: string, data: Record<string, any>) => {
      if (type === MessageType.ACTION_COMMAND) {
        if (data.action === 'MUTE' || data.action === 'DISMISS') {
          alertCtrl.stopAlarm();
        }
      }
      if (type === MessageType.ANDROID_GPS_REPORT && data.pos) {
        const pos = L.latLng(data.pos.lat, data.pos.lng);
        mapRef.current?.updatePhoneMarker(pos, data.gpsAccuracy ?? 10);
      }
    }, []),
  });

  // Stable ref so callbacks can access sync without dep changes
  const syncRef = useRef(sync);
  syncRef.current = sync;

  // HOOKS — ALARM STATE
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
        } else if (
          newState === 'SAFE' &&
          (previousState === 'ALARM' || previousState === 'WARNING')
        ) {
          alertCtrl.stopAlarm();
        }
      },
      [alertCtrl],
    ),
    onZoneChanged: useCallback((anchorPos, radius, bufferRadius, sector, alarmState) => {
      mapRef.current?.drawSafeZone(anchorPos, radius, bufferRadius, sector, alarmState);
    }, []),
    onSyncMessage: useCallback((type: string, payload: Record<string, unknown>) => {
      syncRef.current.sendMessage(type, payload as Record<string, any>);
    }, []),
  });

  // HOOKS — MAP
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

  // HOOKS — SESSION (IndexedDB)
  const session = useSession();

  // HOOKS — ANCHOR ACTIONS (GPS handler, toggle, radius)
  const { handleGpsPosition, handleToggleAnchor, handleRadiusChange } = useAnchorActions({
    stateRef,
    updateState,
    alarm,
    session,
    mapRef,
    mapHook,
    alertCtrl,
    sync,
    syncRef,
    state,
    openModal,
  });

  const handleGpsError = useCallback((_error: GeolocationPositionError) => {
    // GPS errors are handled via the watchdog timer
  }, []);

  const gps = useGPS({
    onPosition: handleGpsPosition,
    onError: handleGpsError,
  });

  // HOOKS — WATCH SCHEDULE
  const watchSchedule = useWatchSchedule();

  // GPS WATCHDOG HANDLER
  const handleGpsLost = useCallback(() => {
    updateState({ gpsSignalLost: true });
    openModal('gpsLost');
    alertCtrl.sendNotification('⚠ GPS Signal Lost', 'No GPS fix for 60 seconds');
  }, [updateState, alertCtrl, openModal]);

  // WATCH EXPIRED HANDLER
  const handleWatchExpired = useCallback(() => {
    alertCtrl.playBeep('sine');
    if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
    openModal('watchAlert');
    syncRef.current.sendMessage(MessageType.TRIGGER_ALARM, {
      reason: 'WATCH_EXPIRED',
      message: 'Watch timer expired!',
      alarmState: 'WARNING',
    });
  }, [alertCtrl, openModal]);

  // TICK INTERVAL (1s)
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

  // INIT
  useEffect(() => {
    let mounted = true;
    let mapRestoreTimeout: ReturnType<typeof setTimeout> | null = null;
    async function init() {
      const restoredState = await session.initDB();
      if (!mounted) return;

      if (restoredState) {
        updateState(restoredState);

        // Restore map state
        if (restoredState.anchorPos) {
          // Defer map operations to allow the map to mount first
          mapRestoreTimeout = setTimeout(() => {
            if (!mounted) return;
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
        openModal('onboarding');
      }
    }
    init();

    return () => {
      mounted = false;
      if (mapRestoreTimeout) clearTimeout(mapRestoreTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // BEFOREUNLOAD — flush track points
  useEffect(() => {
    const handler = () => {
      session.flushTrackPoints();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [session]);

  // CONNECTION LOST WARNING (sync)
  useEffect(() => {
    if (sync.connectionLostWarning) {
      openModal('connLost');
    }
  }, [sync.connectionLostWarning, openModal]);

  // SYNC STATE UPDATE INTERVAL
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
      return () => sync.stopStateUpdateInterval();
    }
  }, [sync.isConnected, state.isAnchored, sync, alertCtrl]);

  // MUTE / DISMISS ALARM
  const handleMuteAlarm = useCallback(() => {
    alertCtrl.stopAlarm();
  }, [alertCtrl]);

  // CENTER MAP
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

  // MAP LAYER TOGGLE
  const handleToggleMapLayer = useCallback(() => {
    mapHook.toggleLayer();
  }, [mapHook]);

  // NIGHT MODE TOGGLE
  const handleToggleNightMode = useCallback(() => {
    updateState((prev) => ({ nightMode: !prev.nightMode }));
  }, [updateState]);

  // Sync night-vision class to <body> for global CSS filter
  useEffect(() => {
    document.body.classList.toggle('night-vision', state.nightMode);
    return () => {
      document.body.classList.remove('night-vision');
    };
  }, [state.nightMode]);

  // LANG TOGGLE
  const handleToggleLang = useCallback(() => {
    setLang(lang === 'pl' ? 'en' : 'pl');
  }, [lang, setLang]);

  // SHARE POSITION
  const handleSharePosition = useCallback(() => {
    const pos = stateRef.current.currentPos;
    if (!pos) return;
    const url = `https://www.google.com/maps?q=${pos.lat},${pos.lng}`;
    if (navigator.share) {
      navigator
        .share({
          title: 'OpenAnchor',
          text: `Position: ${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`,
          url,
        })
        .catch(() => {});
    } else {
      window.open(url, '_blank');
    }
  }, []);

  const handleOpenTool = useCallback(
    (tool: string) => {
      if (tool === 'share') {
        handleSharePosition();
        return;
      }
      const modal = TOOL_MODAL_MAP[tool];
      if (modal) openModal(modal);
    },
    [openModal, handleSharePosition],
  );

  // RENDER
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
        onOffset={() => openModal('offset')}
        onMuteAlarm={handleMuteAlarm}
        onCenterMap={handleCenterMap}
        onToggleMapLayer={handleToggleMapLayer}
        mapAutoCenter={state.mapAutoCenter}
      />

      <ModalManager
        state={state}
        stateRef={stateRef}
        updateState={updateState}
        session={session}
        alarm={alarm}
        alertCtrl={alertCtrl}
        mapHook={mapHook}
        mapRef={mapRef}
        sync={sync}
        syncRef={syncRef}
        watchSchedule={watchSchedule}
        replayMapRef={replayMapRef}
        onRadiusChange={handleRadiusChange}
        onMuteAlarm={handleMuteAlarm}
      />
    </div>
  );
}

export function App() {
  return (
    <I18nProvider>
      <ModalProvider>
        <AnchorApp />
      </ModalProvider>
    </I18nProvider>
  );
}
