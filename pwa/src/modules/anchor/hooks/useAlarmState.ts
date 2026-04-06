import { useRef, useCallback } from 'react';
import L from 'leaflet';
import { AlarmEngine, type ZoneCheckResult, type AlarmLevel } from '../alarm-engine';
import { GeoUtils } from '../geo-utils';

interface AlarmProcessInput {
  isAnchored: boolean;
  anchorPos: L.LatLng | null;
  currentPos: L.LatLng | null;
  radius: number;
  bufferRadius: number | null;
  sectorEnabled: boolean;
  sectorBearing: number;
  sectorWidth: number;
  dragHistory: number[];
  dragWarningDismissed: boolean;
  alarmState: string;
  maxDistanceSwing: number;
  unit: string;
}

export interface AlarmProcessResult {
  alarmState: AlarmLevel;
  distance: number;
  maxDistanceSwing: number;
  dragHistory: number[];
  dragDetected: boolean;
  dragWarningDismissed: boolean;
  zoneResult: ZoneCheckResult;
  previousAlarmState: string;
}

interface UseAlarmStateParams {
  onZoneChanged?: (
    anchorPos: L.LatLng,
    radius: number,
    bufferRadius: number | null,
    sector: { enabled: boolean; bearing: number; width: number },
    alarmState: string,
  ) => void;
  onAlarmTriggered?: (
    newState: AlarmLevel,
    previousState: string,
    distStr: string,
  ) => void;
  onSyncMessage?: (type: string, payload: Record<string, unknown>) => void;
}

export function useAlarmState({
  onZoneChanged,
  onAlarmTriggered,
  onSyncMessage,
}: UseAlarmStateParams = {}) {
  const alarmEngineRef = useRef(new AlarmEngine());
  const alarmCountRef = useRef(0);

  const resetEngine = useCallback(() => {
    alarmEngineRef.current.reset();
    alarmCountRef.current = 0;
  }, []);

  const processPosition = useCallback(
    (state: AlarmProcessInput, newPos: L.LatLng): AlarmProcessResult => {
      if (!state.isAnchored || !state.anchorPos) {
        return {
          alarmState: 'SAFE',
          distance: 0,
          maxDistanceSwing: state.maxDistanceSwing,
          dragHistory: state.dragHistory,
          dragDetected: false,
          dragWarningDismissed: state.dragWarningDismissed,
          zoneResult: 'INSIDE',
          previousAlarmState: state.alarmState,
        };
      }

      const distance = state.anchorPos.distanceTo(newPos);
      const maxDistanceSwing = Math.max(distance, state.maxDistanceSwing);

      // Drag detection: maintain last 5 distance readings
      const dragHistory = [...state.dragHistory, distance];
      if (dragHistory.length > 5) dragHistory.shift();

      let dragDetected = false;
      let dragWarningDismissed = state.dragWarningDismissed;

      if (
        !dragWarningDismissed &&
        dragHistory.length === 5 &&
        distance > state.radius * 0.4
      ) {
        const [d1, d2, d3, d4, d5] = dragHistory;
        if (d1 < d2 && d2 < d3 && d3 < d4 && d4 < d5 && d5 - d1 > 2) {
          dragDetected = true;
          dragWarningDismissed = true;
          onSyncMessage?.('TRIGGER_ALARM', {
            reason: 'OUT_OF_ZONE',
            message: 'Possible anchor drag detected!',
            alarmState: 'WARNING',
          });
        }
      }

      const zoneResult = AlarmEngine.checkZone(
        distance,
        state.radius,
        state.bufferRadius,
        state.sectorEnabled,
        state.sectorBearing,
        state.sectorWidth,
        state.anchorPos,
        newPos,
      );

      const previousAlarmState = state.alarmState;
      const newAlarmState = alarmEngineRef.current.processReading(zoneResult);

      if (newAlarmState !== previousAlarmState) {
        const distStr = String(GeoUtils.formatDist(distance, state.unit));

        if (newAlarmState === 'ALARM') {
          alarmCountRef.current++;
          onAlarmTriggered?.(newAlarmState, previousAlarmState, distStr);
          onSyncMessage?.('TRIGGER_ALARM', {
            reason: 'OUT_OF_ZONE',
            message: `Yacht outside safe zone! (${distStr})`,
            alarmState: 'ALARM',
          });
        } else if (newAlarmState === 'WARNING' && previousAlarmState !== 'ALARM') {
          onAlarmTriggered?.(newAlarmState, previousAlarmState, distStr);
          onSyncMessage?.('TRIGGER_ALARM', {
            reason: 'OUT_OF_ZONE',
            message: `Position verification in progress (${distStr})`,
            alarmState: 'WARNING',
          });
        } else if (newAlarmState === 'CAUTION' && previousAlarmState === 'SAFE') {
          onSyncMessage?.('STATE_UPDATE', {
            alarmState: 'CAUTION',
          });
        } else if (
          newAlarmState === 'SAFE' &&
          (previousAlarmState === 'ALARM' || previousAlarmState === 'WARNING')
        ) {
          onAlarmTriggered?.(newAlarmState, previousAlarmState, '');
        }
      }

      onZoneChanged?.(
        state.anchorPos,
        state.radius,
        state.bufferRadius,
        {
          enabled: state.sectorEnabled,
          bearing: state.sectorBearing,
          width: state.sectorWidth,
        },
        newAlarmState,
      );

      return {
        alarmState: newAlarmState,
        distance,
        maxDistanceSwing,
        dragHistory,
        dragDetected,
        dragWarningDismissed,
        zoneResult,
        previousAlarmState,
      };
    },
    [onZoneChanged, onAlarmTriggered, onSyncMessage],
  );

  const recalculateZone = useCallback(
    (state: {
      isAnchored: boolean;
      anchorPos: L.LatLng | null;
      radius: number;
      bufferRadius: number | null;
      sectorEnabled: boolean;
      sectorBearing: number;
      sectorWidth: number;
      alarmState: string;
    }) => {
      if (!state.isAnchored || !state.anchorPos) return;
      onZoneChanged?.(
        state.anchorPos,
        state.radius,
        state.bufferRadius,
        {
          enabled: state.sectorEnabled,
          bearing: state.sectorBearing,
          width: state.sectorWidth,
        },
        state.alarmState,
      );
    },
    [onZoneChanged],
  );

  return {
    processPosition,
    recalculateZone,
    resetEngine,
    alarmEngine: alarmEngineRef,
    alarmCount: alarmCountRef,
  };
}

export type { AlarmLevel, ZoneCheckResult };
