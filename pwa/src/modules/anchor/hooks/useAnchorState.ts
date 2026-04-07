import { useState, useCallback } from 'react';
import L from 'leaflet';
import { GeoUtils } from '../geo-utils';
import type { ScheduleItem } from '../anchor-utils';

export interface AnchorState {
  unit: string;
  isAnchored: boolean;
  anchorPos: L.LatLng | null;
  currentPos: L.LatLng | null;
  track: L.LatLng[];
  dragHistory: number[];
  dragWarningDismissed: boolean;
  sog: number;
  cog: number | null;
  accuracy: number;
  distance: number;
  radius: number;
  bufferRadius: number | null;
  mapAutoCenter: boolean;
  sectorEnabled: boolean;
  sectorBearing: number;
  sectorWidth: number;
  anchorStartTime: number | null;
  maxDistanceSwing: number;
  maxSogDuringAnchor: number;
  watchActive: boolean;
  watchEndTime: number | null;
  watchMinutes: number;
  schedule: ScheduleItem[];
  chainLengthM: number | null;
  depthM: number | null;
  alarmState: string;
  sessionId: number | null;
  hasGpsFix: boolean;
  gpsSignalLost: boolean;
  alarmCount: number;
  nightMode: boolean;
}

function loadScheduleFromStorage(): ScheduleItem[] {
  try {
    const raw = localStorage.getItem('anchor_schedule');
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    /* ignore */
  }
  return [];
}

function createDefaultState(): AnchorState {
  return {
    unit: 'm',
    isAnchored: false,
    anchorPos: null,
    currentPos: null,
    track: [],
    dragHistory: [],
    dragWarningDismissed: false,
    sog: 0,
    cog: null,
    accuracy: 0,
    distance: 0,
    radius: 50,
    bufferRadius: null,
    mapAutoCenter: true,
    sectorEnabled: false,
    sectorBearing: 0,
    sectorWidth: 90,
    anchorStartTime: null,
    maxDistanceSwing: 0,
    maxSogDuringAnchor: 0,
    watchActive: false,
    watchEndTime: null,
    watchMinutes: 10,
    schedule: loadScheduleFromStorage(),
    chainLengthM: null,
    depthM: null,
    alarmState: 'SAFE',
    sessionId: null,
    hasGpsFix: false,
    gpsSignalLost: false,
    alarmCount: 0,
    nightMode: false,
  };
}

export function useAnchorState() {
  const [state, setState] = useState<AnchorState>(createDefaultState);

  const updateState = useCallback(
    (partial: Partial<AnchorState> | ((prev: AnchorState) => Partial<AnchorState>)) => {
      setState((prev) => {
        const updates = typeof partial === 'function' ? partial(prev) : partial;
        return { ...prev, ...updates };
      });
    },
    [],
  );

  const resetState = useCallback(() => {
    setState(createDefaultState());
  }, []);

  const toggleUnit = useCallback(() => {
    setState((prev) => {
      const newUnit = prev.unit === 'm' ? 'ft' : 'm';
      const newRadius =
        newUnit === 'ft'
          ? Math.round(prev.radius * GeoUtils.M2FT)
          : Math.round(prev.radius / GeoUtils.M2FT);
      return { ...prev, unit: newUnit, radius: newRadius };
    });
  }, []);

  return {
    state,
    setState,
    updateState,
    resetState,
    toggleUnit,
  };
}

export type { ScheduleItem };
