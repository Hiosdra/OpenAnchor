/**
 * useAnchorActions — core business-logic handlers extracted from App.tsx.
 *
 * Contains the GPS position handler, anchor set/lift toggle, and radius
 * change handler. These are the largest callback blocks and depend on
 * many hooks, so they live in their own hook to keep App.tsx lean.
 */

import { useCallback, useRef } from 'react';
import L from 'leaflet';

import { MessageType } from '@shared/constants/protocol';
import { GeoUtils } from '../geo-utils';
import type { AnchorState } from './useAnchorState';
import type { AlarmProcessInput, AlarmProcessResult } from './useAlarmState';
import type { TrackPoint } from '../session-db';
import type { ModalName } from '../contexts/ModalContext';

// ─── Max track points kept in-memory ───
const MAX_TRACK_POINTS = 500;

// ─── Persist state throttle ───
const PERSIST_INTERVAL_MS = 5000;

// ─── Dependency contracts (only what useAnchorActions actually uses) ───

interface AlarmActions {
  processPosition: (state: AlarmProcessInput, newPos: L.LatLng) => AlarmProcessResult;
  recalculateZone: (state: {
    isAnchored: boolean;
    anchorPos: L.LatLng | null;
    radius: number;
    bufferRadius: number | null;
    sectorEnabled: boolean;
    sectorBearing: number;
    sectorWidth: number;
    alarmState: string;
  }) => void;
  resetEngine: () => void;
}

interface SessionActions {
  bufferTrackPoint: (point: Omit<TrackPoint, 'id'>) => void;
  persistActiveState: (sessionState: {
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
  }) => void;
  setAnchor: (
    pos: L.LatLng,
    sessionState: {
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
    },
  ) => Promise<number | null>;
  liftAnchor: (sessionState: {
    sessionId: number | null;
    maxDistanceSwing: number;
    maxSogDuringAnchor: number;
    alarmTriggered: boolean;
  }) => Promise<void>;
}

interface MapActions {
  updateBoat: (pos: L.LatLng, accuracy: number, cog: number | null, autoCenter: boolean) => void;
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
  updateTrack: (positions: L.LatLng[]) => void;
}

interface AlertActions {
  ensureAudioContext: () => AudioContext;
  initPermissions: () => void;
  requestWakeLock: () => Promise<void>;
  releaseWakeLock: () => void;
  stopAlarm: () => void;
}

interface SyncActions {
  isConnectedRef: React.MutableRefObject<boolean>;
  sendMessage: (type: string, payload?: Record<string, unknown>) => void;
  sendFullSync: (state: {
    isAnchored: boolean;
    anchorPos: L.LatLng | null;
    sectorEnabled: boolean;
    radius: number;
    bufferRadius: number | null;
    unit: string;
    sectorBearing: number;
    sectorWidth: number;
    chainLengthM: number | null;
    depthM: number | null;
  }) => void;
}

interface AnchorActionsDeps {
  stateRef: React.RefObject<AnchorState>;
  updateState: (
    updates: Partial<AnchorState> | ((prev: AnchorState) => Partial<AnchorState>),
  ) => void;
  alarm: AlarmActions;
  session: SessionActions;
  mapRef: React.RefObject<MapActions>;
  mapHook: MapActions;
  alertCtrl: AlertActions;
  sync: SyncActions;
  syncRef: React.RefObject<SyncActions>;
  state: AnchorState;
  openModal: (name: ModalName) => void;
}

export function useAnchorActions({
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
}: AnchorActionsDeps) {
  const lastPersistRef = useRef(0);

  // ═══════════════════════════════════════════
  // GPS POSITION HANDLER
  // ═══════════════════════════════════════════
  const handleGpsPosition = useCallback(
    (position: GeolocationPosition) => {
      const s = stateRef.current!;
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

        if (alarmResult.dragDetected) {
          openModal('dragWarning');
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
        const merged = {
          ...s,
          ...stateUpdates,
          anchorPos: stateUpdates.anchorPos ?? s.anchorPos,
        };
        session.persistActiveState(merged);
      }
    },
    [alarm, session, updateState, stateRef, mapRef, openModal],
  );

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
        sync.sendMessage(MessageType.DISCONNECT, { reason: 'session_end' });
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

      if (stateRef.current!.isAnchored && stateRef.current!.anchorPos) {
        alarm.recalculateZone({
          ...stateRef.current,
          radius: clamped,
          bufferRadius,
        });
        session.persistActiveState({
          ...stateRef.current!,
          radius: clamped,
          bufferRadius,
        });
      }

      if (syncRef.current!.isConnectedRef.current) {
        syncRef.current!.sendFullSync({
          ...stateRef.current!,
          radius: clamped,
          bufferRadius,
        });
      }
    },
    [updateState, alarm, session, stateRef, syncRef],
  );

  return {
    handleGpsPosition,
    handleToggleAnchor,
    handleRadiusChange,
  };
}
