import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mock leaflet before importing the hook
// ---------------------------------------------------------------------------
const makeLatLng = (lat: number, lng: number, distanceValue = 50) => ({
  lat,
  lng,
  distanceTo: vi.fn(() => distanceValue),
});

vi.mock('leaflet', () => {
  const latLng = (lat: number, lng: number) => makeLatLng(lat, lng);
  return { default: { latLng }, latLng };
});

import { useAlarmState } from '../src/modules/anchor/hooks/useAlarmState';
import type { AlarmProcessResult } from '../src/modules/anchor/hooks/useAlarmState';
import { AlarmEngine } from '../src/modules/anchor/alarm-engine';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function defaultInput(overrides: Record<string, unknown> = {}) {
  return {
    isAnchored: true,
    anchorPos: makeLatLng(54.0, 18.0, 0) as any,
    currentPos: makeLatLng(54.0, 18.0, 0) as any,
    radius: 50,
    bufferRadius: null as number | null,
    sectorEnabled: false,
    sectorBearing: 0,
    sectorWidth: 0,
    dragHistory: [] as number[],
    dragWarningDismissed: false,
    alarmState: 'SAFE',
    maxDistanceSwing: 0,
    unit: 'm',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('useAlarmState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  // -----------------------------------------------------------------------
  // 1. Hook shape
  // -----------------------------------------------------------------------
  describe('hook shape', () => {
    it('returns processPosition, recalculateZone, resetEngine, alarmEngine, alarmCount', () => {
      const { result } = renderHook(() => useAlarmState());
      expect(result.current.processPosition).toBeTypeOf('function');
      expect(result.current.recalculateZone).toBeTypeOf('function');
      expect(result.current.resetEngine).toBeTypeOf('function');
      expect(result.current.alarmEngine).toBeDefined();
      expect(result.current.alarmCount).toBeDefined();
      expect(result.current.alarmCount.current).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // 2. Not anchored / null anchor
  // -----------------------------------------------------------------------
  describe('not anchored or null anchor', () => {
    it('returns SAFE defaults when not anchored', () => {
      const { result } = renderHook(() => useAlarmState());
      const input = defaultInput({ isAnchored: false });
      const newPos = makeLatLng(54.001, 18.001) as any;

      let res!: AlarmProcessResult;
      act(() => { res = result.current.processPosition(input, newPos); });

      expect(res.alarmState).toBe('SAFE');
      expect(res.distance).toBe(0);
      expect(res.dragDetected).toBe(false);
      expect(res.zoneResult).toBe('INSIDE');
    });

    it('returns SAFE defaults when anchorPos is null', () => {
      const { result } = renderHook(() => useAlarmState());
      const input = defaultInput({ anchorPos: null });
      const newPos = makeLatLng(54.001, 18.001) as any;

      let res!: AlarmProcessResult;
      act(() => { res = result.current.processPosition(input, newPos); });

      expect(res.alarmState).toBe('SAFE');
      expect(res.distance).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // 3. SAFE zone — position inside radius
  // -----------------------------------------------------------------------
  describe('position inside safe zone', () => {
    it('returns SAFE and correct distance when inside radius', () => {
      const { result } = renderHook(() => useAlarmState());
      const anchorPos = makeLatLng(54.0, 18.0, 20);
      // distanceTo returns 20 which is < radius 50
      anchorPos.distanceTo.mockReturnValue(20);
      const input = defaultInput({ anchorPos: anchorPos as any });
      const newPos = makeLatLng(54.0001, 18.0001) as any;

      let res!: AlarmProcessResult;
      act(() => { res = result.current.processPosition(input, newPos); });

      expect(res.alarmState).toBe('SAFE');
      expect(res.distance).toBe(20);
      expect(res.zoneResult).toBe('INSIDE');
    });

    it('returns SAFE at exactly the radius boundary', () => {
      const { result } = renderHook(() => useAlarmState());
      const anchorPos = makeLatLng(54.0, 18.0, 50);
      anchorPos.distanceTo.mockReturnValue(50);
      const input = defaultInput({ anchorPos: anchorPos as any });
      const newPos = makeLatLng(54.0004, 18.0) as any;

      let res!: AlarmProcessResult;
      act(() => { res = result.current.processPosition(input, newPos); });

      expect(res.alarmState).toBe('SAFE');
      expect(res.distance).toBe(50);
      expect(res.zoneResult).toBe('INSIDE');
    });
  });

  // -----------------------------------------------------------------------
  // 4. WARNING & ALARM transitions (OUTSIDE zone)
  // -----------------------------------------------------------------------
  describe('OUTSIDE zone → WARNING → ALARM', () => {
    it('first OUTSIDE reading returns WARNING', () => {
      const { result } = renderHook(() => useAlarmState());
      const anchorPos = makeLatLng(54.0, 18.0, 80);
      anchorPos.distanceTo.mockReturnValue(80);
      const input = defaultInput({ anchorPos: anchorPos as any });
      const newPos = makeLatLng(54.001, 18.0) as any;

      let res!: AlarmProcessResult;
      act(() => { res = result.current.processPosition(input, newPos); });

      expect(res.alarmState).toBe('WARNING');
      expect(res.zoneResult).toBe('OUTSIDE');
    });

    it('3 OUTSIDE readings over 3s trigger ALARM', () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useAlarmState());

      const anchorPos = makeLatLng(54.0, 18.0, 80);
      anchorPos.distanceTo.mockReturnValue(80);
      const newPos = makeLatLng(54.001, 18.0) as any;

      let state = defaultInput({ anchorPos: anchorPos as any });
      let res!: AlarmProcessResult;

      // Reading 1
      act(() => { res = result.current.processPosition(state, newPos); });
      state = { ...state, alarmState: res.alarmState, dragHistory: res.dragHistory };
      expect(res.alarmState).toBe('WARNING');

      vi.advanceTimersByTime(2000);

      // Reading 2
      act(() => { res = result.current.processPosition(state, newPos); });
      state = { ...state, alarmState: res.alarmState, dragHistory: res.dragHistory };

      vi.advanceTimersByTime(1500);

      // Reading 3
      act(() => { res = result.current.processPosition(state, newPos); });

      expect(res.alarmState).toBe('ALARM');
      vi.useRealTimers();
    });

    it('increments alarmCount on first ALARM transition', () => {
      vi.useFakeTimers();
      const onAlarmTriggered = vi.fn();
      const { result } = renderHook(() => useAlarmState({ onAlarmTriggered }));

      const anchorPos = makeLatLng(54.0, 18.0, 80);
      anchorPos.distanceTo.mockReturnValue(80);
      const newPos = makeLatLng(54.001, 18.0) as any;

      let state = defaultInput({ anchorPos: anchorPos as any });
      let res!: AlarmProcessResult;

      // 3 OUTSIDE readings with enough time
      act(() => { res = result.current.processPosition(state, newPos); });
      state = { ...state, alarmState: res.alarmState, dragHistory: res.dragHistory };
      vi.advanceTimersByTime(2000);

      act(() => { res = result.current.processPosition(state, newPos); });
      state = { ...state, alarmState: res.alarmState, dragHistory: res.dragHistory };
      vi.advanceTimersByTime(1500);

      act(() => { res = result.current.processPosition(state, newPos); });

      expect(result.current.alarmCount.current).toBe(1);
      expect(onAlarmTriggered).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('returns to SAFE when position moves back inside radius', () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useAlarmState());

      const anchorPos = makeLatLng(54.0, 18.0, 80);
      anchorPos.distanceTo.mockReturnValue(80);
      const newPos = makeLatLng(54.001, 18.0) as any;

      let state = defaultInput({ anchorPos: anchorPos as any });
      let res!: AlarmProcessResult;

      // Push into WARNING
      act(() => { res = result.current.processPosition(state, newPos); });
      state = { ...state, alarmState: res.alarmState, dragHistory: res.dragHistory };
      expect(res.alarmState).toBe('WARNING');

      // Move back inside
      anchorPos.distanceTo.mockReturnValue(20);
      act(() => { res = result.current.processPosition(state, newPos); });

      expect(res.alarmState).toBe('SAFE');
      expect(res.zoneResult).toBe('INSIDE');
      vi.useRealTimers();
    });
  });

  // -----------------------------------------------------------------------
  // 5. BUFFER / CAUTION zone
  // -----------------------------------------------------------------------
  describe('buffer radius → CAUTION', () => {
    it('returns CAUTION when in buffer zone', () => {
      const { result } = renderHook(() => useAlarmState());
      const anchorPos = makeLatLng(54.0, 18.0, 60);
      anchorPos.distanceTo.mockReturnValue(60);
      const input = defaultInput({
        anchorPos: anchorPos as any,
        bufferRadius: 70,
      });
      const newPos = makeLatLng(54.0005, 18.0) as any;

      let res!: AlarmProcessResult;
      act(() => { res = result.current.processPosition(input, newPos); });

      expect(res.alarmState).toBe('CAUTION');
      expect(res.zoneResult).toBe('BUFFER');
    });

    it('returns SAFE→CAUTION transition triggers STATE_UPDATE sync message', () => {
      const onSyncMessage = vi.fn();
      const { result } = renderHook(() => useAlarmState({ onSyncMessage }));
      const anchorPos = makeLatLng(54.0, 18.0, 60);
      anchorPos.distanceTo.mockReturnValue(60);
      const input = defaultInput({
        anchorPos: anchorPos as any,
        bufferRadius: 70,
        alarmState: 'SAFE',
      });
      const newPos = makeLatLng(54.0005, 18.0) as any;

      act(() => { result.current.processPosition(input, newPos); });

      expect(onSyncMessage).toHaveBeenCalledWith('STATE_UPDATE', {
        alarmState: 'CAUTION',
      });
    });
  });

  // -----------------------------------------------------------------------
  // 6. Sector mode
  // -----------------------------------------------------------------------
  describe('sector mode', () => {
    it('returns OUTSIDE when boat is outside sector bearing', () => {
      const { result } = renderHook(() => useAlarmState());
      // Anchor at 54,18 – boat due north at 54.001,18 → bearing ~0°
      // Sector centered on 180° with width 60°, so 0° is outside
      const anchorPos = makeLatLng(54.0, 18.0, 40);
      anchorPos.distanceTo.mockReturnValue(40);
      const input = defaultInput({
        anchorPos: anchorPos as any,
        sectorEnabled: true,
        sectorBearing: 180,
        sectorWidth: 60,
      });
      const boatPos = makeLatLng(54.001, 18.0) as any;

      let res!: AlarmProcessResult;
      act(() => { res = result.current.processPosition(input, boatPos); });

      expect(res.zoneResult).toBe('OUTSIDE');
      expect(res.alarmState).toBe('WARNING');
    });

    it('returns INSIDE when boat is within sector and radius', () => {
      const { result } = renderHook(() => useAlarmState());
      // distance 0 → always inside regardless of sector
      const anchorPos = makeLatLng(54.0, 18.0, 0);
      anchorPos.distanceTo.mockReturnValue(0);
      const input = defaultInput({
        anchorPos: anchorPos as any,
        sectorEnabled: true,
        sectorBearing: 180,
        sectorWidth: 60,
      });
      const boatPos = makeLatLng(54.0, 18.0) as any;

      let res!: AlarmProcessResult;
      act(() => { res = result.current.processPosition(input, boatPos); });

      expect(res.zoneResult).toBe('INSIDE');
      expect(res.alarmState).toBe('SAFE');
    });
  });

  // -----------------------------------------------------------------------
  // 7. Drag detection
  // -----------------------------------------------------------------------
  describe('drag detection', () => {
    it('detects drag with 5 strictly-increasing readings above 40% of radius', () => {
      const onSyncMessage = vi.fn();
      const { result } = renderHook(() => useAlarmState({ onSyncMessage }));

      const anchorPos = makeLatLng(54.0, 18.0, 0);
      const newPos = makeLatLng(54.001, 18.0) as any;

      // 5 strictly-increasing readings: 22, 24, 26, 28, 30
      // all > radius(50)*0.4 = 20, difference 30-22=8 > 2
      const distances = [22, 24, 26, 28, 30];
      let dragHistory: number[] = [];
      let res!: AlarmProcessResult;

      for (const d of distances) {
        anchorPos.distanceTo.mockReturnValue(d);
        const input = defaultInput({
          anchorPos: anchorPos as any,
          dragHistory,
          dragWarningDismissed: false,
        });
        act(() => { res = result.current.processPosition(input, newPos); });
        dragHistory = res.dragHistory;
      }

      expect(res.dragDetected).toBe(true);
      expect(res.dragWarningDismissed).toBe(true);
      expect(onSyncMessage).toHaveBeenCalledWith('TRIGGER_ALARM', expect.objectContaining({
        reason: 'OUT_OF_ZONE',
        message: 'Possible anchor drag detected!',
        alarmState: 'WARNING',
      }));
    });

    it('does not detect drag when readings are not strictly increasing', () => {
      const onSyncMessage = vi.fn();
      const { result } = renderHook(() => useAlarmState({ onSyncMessage }));

      const anchorPos = makeLatLng(54.0, 18.0, 0);
      const newPos = makeLatLng(54.001, 18.0) as any;

      // Not strictly increasing: 22, 24, 23, 28, 30
      const distances = [22, 24, 23, 28, 30];
      let dragHistory: number[] = [];
      let res!: AlarmProcessResult;

      for (const d of distances) {
        anchorPos.distanceTo.mockReturnValue(d);
        const input = defaultInput({
          anchorPos: anchorPos as any,
          dragHistory,
          dragWarningDismissed: false,
        });
        act(() => { res = result.current.processPosition(input, newPos); });
        dragHistory = res.dragHistory;
      }

      expect(res.dragDetected).toBe(false);
    });

    it('does not detect drag when distance is below 40% of radius', () => {
      const onSyncMessage = vi.fn();
      const { result } = renderHook(() => useAlarmState({ onSyncMessage }));

      const anchorPos = makeLatLng(54.0, 18.0, 0);
      const newPos = makeLatLng(54.001, 18.0) as any;

      // All below radius(50)*0.4 = 20
      const distances = [10, 12, 14, 16, 18];
      let dragHistory: number[] = [];
      let res!: AlarmProcessResult;

      for (const d of distances) {
        anchorPos.distanceTo.mockReturnValue(d);
        const input = defaultInput({
          anchorPos: anchorPos as any,
          dragHistory,
          dragWarningDismissed: false,
        });
        act(() => { res = result.current.processPosition(input, newPos); });
        dragHistory = res.dragHistory;
      }

      expect(res.dragDetected).toBe(false);
    });

    it('does not fire drag again once dragWarningDismissed is true', () => {
      const onSyncMessage = vi.fn();
      const { result } = renderHook(() => useAlarmState({ onSyncMessage }));

      const anchorPos = makeLatLng(54.0, 18.0, 0);
      const newPos = makeLatLng(54.001, 18.0) as any;

      const distances = [22, 24, 26, 28, 30];
      let dragHistory: number[] = [];
      let res!: AlarmProcessResult;

      for (const d of distances) {
        anchorPos.distanceTo.mockReturnValue(d);
        const input = defaultInput({
          anchorPos: anchorPos as any,
          dragHistory,
          dragWarningDismissed: true,
        });
        act(() => { res = result.current.processPosition(input, newPos); });
        dragHistory = res.dragHistory;
      }

      expect(res.dragDetected).toBe(false);
    });

    it('keeps dragHistory limited to 5 entries', () => {
      const { result } = renderHook(() => useAlarmState());
      const anchorPos = makeLatLng(54.0, 18.0, 0);
      const newPos = makeLatLng(54.001, 18.0) as any;

      const distances = [10, 15, 20, 25, 30, 35, 40];
      let dragHistory: number[] = [];
      let res!: AlarmProcessResult;

      for (const d of distances) {
        anchorPos.distanceTo.mockReturnValue(d);
        const input = defaultInput({
          anchorPos: anchorPos as any,
          dragHistory,
        });
        act(() => { res = result.current.processPosition(input, newPos); });
        dragHistory = res.dragHistory;
      }

      expect(res.dragHistory).toHaveLength(5);
      expect(res.dragHistory).toEqual([20, 25, 30, 35, 40]);
    });
  });

  // -----------------------------------------------------------------------
  // 8. maxDistanceSwing tracking
  // -----------------------------------------------------------------------
  describe('maxDistanceSwing', () => {
    it('updates maxDistanceSwing when new distance exceeds previous max', () => {
      const { result } = renderHook(() => useAlarmState());
      const anchorPos = makeLatLng(54.0, 18.0, 30);
      anchorPos.distanceTo.mockReturnValue(30);
      const input = defaultInput({
        anchorPos: anchorPos as any,
        maxDistanceSwing: 20,
      });
      const newPos = makeLatLng(54.0003, 18.0) as any;

      let res!: AlarmProcessResult;
      act(() => { res = result.current.processPosition(input, newPos); });

      expect(res.maxDistanceSwing).toBe(30);
    });

    it('preserves maxDistanceSwing when new distance is smaller', () => {
      const { result } = renderHook(() => useAlarmState());
      const anchorPos = makeLatLng(54.0, 18.0, 10);
      anchorPos.distanceTo.mockReturnValue(10);
      const input = defaultInput({
        anchorPos: anchorPos as any,
        maxDistanceSwing: 45,
      });
      const newPos = makeLatLng(54.0001, 18.0) as any;

      let res!: AlarmProcessResult;
      act(() => { res = result.current.processPosition(input, newPos); });

      expect(res.maxDistanceSwing).toBe(45);
    });
  });

  // -----------------------------------------------------------------------
  // 9. Callbacks
  // -----------------------------------------------------------------------
  describe('callbacks', () => {
    it('calls onZoneChanged on every processPosition call', () => {
      const onZoneChanged = vi.fn();
      const { result } = renderHook(() => useAlarmState({ onZoneChanged }));
      const anchorPos = makeLatLng(54.0, 18.0, 20);
      anchorPos.distanceTo.mockReturnValue(20);
      const input = defaultInput({ anchorPos: anchorPos as any });
      const newPos = makeLatLng(54.0001, 18.0) as any;

      act(() => { result.current.processPosition(input, newPos); });

      expect(onZoneChanged).toHaveBeenCalledWith(
        anchorPos,
        50,
        null,
        { enabled: false, bearing: 0, width: 0 },
        'SAFE',
      );
    });

    it('calls onAlarmTriggered on SAFE→WARNING→ALARM transitions', () => {
      vi.useFakeTimers();
      const onAlarmTriggered = vi.fn();
      const { result } = renderHook(() => useAlarmState({ onAlarmTriggered }));

      const anchorPos = makeLatLng(54.0, 18.0, 80);
      anchorPos.distanceTo.mockReturnValue(80);
      const newPos = makeLatLng(54.001, 18.0) as any;

      let state = defaultInput({ anchorPos: anchorPos as any });
      let res!: AlarmProcessResult;

      // SAFE → WARNING
      act(() => { res = result.current.processPosition(state, newPos); });
      state = { ...state, alarmState: res.alarmState, dragHistory: res.dragHistory };
      expect(onAlarmTriggered).toHaveBeenCalledWith('WARNING', 'SAFE', expect.any(String));

      vi.advanceTimersByTime(2000);
      act(() => { res = result.current.processPosition(state, newPos); });
      state = { ...state, alarmState: res.alarmState, dragHistory: res.dragHistory };
      vi.advanceTimersByTime(1500);

      // WARNING → ALARM
      act(() => { res = result.current.processPosition(state, newPos); });
      expect(onAlarmTriggered).toHaveBeenCalledWith('ALARM', 'WARNING', expect.any(String));

      vi.useRealTimers();
    });

    it('calls onAlarmTriggered when returning to SAFE from ALARM', () => {
      vi.useFakeTimers();
      const onAlarmTriggered = vi.fn();
      const { result } = renderHook(() => useAlarmState({ onAlarmTriggered }));

      const anchorPos = makeLatLng(54.0, 18.0, 80);
      anchorPos.distanceTo.mockReturnValue(80);
      const newPos = makeLatLng(54.001, 18.0) as any;

      let state = defaultInput({ anchorPos: anchorPos as any });
      let res!: AlarmProcessResult;

      // Push to ALARM
      act(() => { res = result.current.processPosition(state, newPos); });
      state = { ...state, alarmState: res.alarmState, dragHistory: res.dragHistory };
      vi.advanceTimersByTime(2000);
      act(() => { res = result.current.processPosition(state, newPos); });
      state = { ...state, alarmState: res.alarmState, dragHistory: res.dragHistory };
      vi.advanceTimersByTime(1500);
      act(() => { res = result.current.processPosition(state, newPos); });
      state = { ...state, alarmState: res.alarmState, dragHistory: res.dragHistory };
      expect(res.alarmState).toBe('ALARM');

      onAlarmTriggered.mockClear();

      // Move back inside
      anchorPos.distanceTo.mockReturnValue(20);
      act(() => { res = result.current.processPosition(state, newPos); });

      expect(res.alarmState).toBe('SAFE');
      expect(onAlarmTriggered).toHaveBeenCalledWith('SAFE', 'ALARM', '');

      vi.useRealTimers();
    });

    it('sends TRIGGER_ALARM sync message on ALARM state', () => {
      vi.useFakeTimers();
      const onSyncMessage = vi.fn();
      const { result } = renderHook(() => useAlarmState({ onSyncMessage }));

      const anchorPos = makeLatLng(54.0, 18.0, 80);
      anchorPos.distanceTo.mockReturnValue(80);
      const newPos = makeLatLng(54.001, 18.0) as any;

      let state = defaultInput({ anchorPos: anchorPos as any });
      let res!: AlarmProcessResult;

      act(() => { res = result.current.processPosition(state, newPos); });
      state = { ...state, alarmState: res.alarmState, dragHistory: res.dragHistory };
      vi.advanceTimersByTime(2000);
      act(() => { res = result.current.processPosition(state, newPos); });
      state = { ...state, alarmState: res.alarmState, dragHistory: res.dragHistory };
      vi.advanceTimersByTime(1500);
      act(() => { res = result.current.processPosition(state, newPos); });

      expect(onSyncMessage).toHaveBeenCalledWith('TRIGGER_ALARM', expect.objectContaining({
        reason: 'OUT_OF_ZONE',
        alarmState: 'ALARM',
      }));

      vi.useRealTimers();
    });

    it('does not call onAlarmTriggered for WARNING when previous state was ALARM', () => {
      // The hook only fires WARNING callback when previousState !== 'ALARM'
      const onAlarmTriggered = vi.fn();
      const { result } = renderHook(() => useAlarmState({ onAlarmTriggered }));

      const anchorPos = makeLatLng(54.0, 18.0, 80);
      anchorPos.distanceTo.mockReturnValue(80);
      const newPos = makeLatLng(54.001, 18.0) as any;

      // Start from ALARM state — engine won't actually transition to WARNING
      // from ALARM in one reading since INSIDE resets to SAFE.
      // But we can test the branch by setting alarmState to 'ALARM' in input
      // and having the engine return 'WARNING'. The engine doesn't produce
      // WARNING from a fresh processReading since INSIDE resets. So we verify
      // the condition by observing no spurious WARNING callback.
      const input = defaultInput({
        anchorPos: anchorPos as any,
        alarmState: 'ALARM',
      });

      act(() => { result.current.processPosition(input, newPos); });

      // Should NOT have been called with WARNING when prev was ALARM
      const warningCalls = onAlarmTriggered.mock.calls.filter(
        (c) => c[0] === 'WARNING' && c[1] === 'ALARM',
      );
      expect(warningCalls).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // 10. resetEngine
  // -----------------------------------------------------------------------
  describe('resetEngine', () => {
    it('resets the internal alarm engine and alarm count', () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useAlarmState());

      const anchorPos = makeLatLng(54.0, 18.0, 80);
      anchorPos.distanceTo.mockReturnValue(80);
      const newPos = makeLatLng(54.001, 18.0) as any;

      let state = defaultInput({ anchorPos: anchorPos as any });
      let res!: AlarmProcessResult;

      // Push to ALARM
      act(() => { res = result.current.processPosition(state, newPos); });
      state = { ...state, alarmState: res.alarmState, dragHistory: res.dragHistory };
      vi.advanceTimersByTime(2000);
      act(() => { res = result.current.processPosition(state, newPos); });
      state = { ...state, alarmState: res.alarmState, dragHistory: res.dragHistory };
      vi.advanceTimersByTime(1500);
      act(() => { res = result.current.processPosition(state, newPos); });
      expect(result.current.alarmCount.current).toBe(1);

      // Reset
      act(() => { result.current.resetEngine(); });

      expect(result.current.alarmCount.current).toBe(0);
      expect(result.current.alarmEngine.current.violationCount).toBe(0);

      vi.useRealTimers();
    });
  });

  // -----------------------------------------------------------------------
  // 11. recalculateZone
  // -----------------------------------------------------------------------
  describe('recalculateZone', () => {
    it('calls onZoneChanged when anchored', () => {
      const onZoneChanged = vi.fn();
      const { result } = renderHook(() => useAlarmState({ onZoneChanged }));

      const anchorPos = makeLatLng(54.0, 18.0, 0) as any;
      act(() => {
        result.current.recalculateZone({
          isAnchored: true,
          anchorPos,
          radius: 50,
          bufferRadius: 70,
          sectorEnabled: true,
          sectorBearing: 90,
          sectorWidth: 60,
          alarmState: 'SAFE',
        });
      });

      expect(onZoneChanged).toHaveBeenCalledWith(
        anchorPos,
        50,
        70,
        { enabled: true, bearing: 90, width: 60 },
        'SAFE',
      );
    });

    it('does nothing when not anchored', () => {
      const onZoneChanged = vi.fn();
      const { result } = renderHook(() => useAlarmState({ onZoneChanged }));

      act(() => {
        result.current.recalculateZone({
          isAnchored: false,
          anchorPos: null,
          radius: 50,
          bufferRadius: null,
          sectorEnabled: false,
          sectorBearing: 0,
          sectorWidth: 0,
          alarmState: 'SAFE',
        });
      });

      expect(onZoneChanged).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // 12. previousAlarmState tracking
  // -----------------------------------------------------------------------
  describe('previousAlarmState', () => {
    it('returns the previous alarm state from input', () => {
      const { result } = renderHook(() => useAlarmState());
      const anchorPos = makeLatLng(54.0, 18.0, 20);
      anchorPos.distanceTo.mockReturnValue(20);
      const input = defaultInput({
        anchorPos: anchorPos as any,
        alarmState: 'WARNING',
      });
      const newPos = makeLatLng(54.0001, 18.0) as any;

      let res!: AlarmProcessResult;
      act(() => { res = result.current.processPosition(input, newPos); });

      expect(res.previousAlarmState).toBe('WARNING');
    });
  });

  // -----------------------------------------------------------------------
  // 13. Edge case — zero radius
  // -----------------------------------------------------------------------
  describe('edge case — zero radius', () => {
    it('any positive distance is OUTSIDE with radius 0', () => {
      const { result } = renderHook(() => useAlarmState());
      const anchorPos = makeLatLng(54.0, 18.0, 5);
      anchorPos.distanceTo.mockReturnValue(5);
      const input = defaultInput({
        anchorPos: anchorPos as any,
        radius: 0,
      });
      const newPos = makeLatLng(54.0001, 18.0) as any;

      let res!: AlarmProcessResult;
      act(() => { res = result.current.processPosition(input, newPos); });

      expect(res.zoneResult).toBe('OUTSIDE');
      expect(res.alarmState).toBe('WARNING');
    });

    it('zero distance with zero radius is INSIDE', () => {
      const { result } = renderHook(() => useAlarmState());
      const anchorPos = makeLatLng(54.0, 18.0, 0);
      anchorPos.distanceTo.mockReturnValue(0);
      const input = defaultInput({
        anchorPos: anchorPos as any,
        radius: 0,
      });
      const newPos = makeLatLng(54.0, 18.0) as any;

      let res!: AlarmProcessResult;
      act(() => { res = result.current.processPosition(input, newPos); });

      expect(res.zoneResult).toBe('INSIDE');
      expect(res.alarmState).toBe('SAFE');
    });
  });

  // -----------------------------------------------------------------------
  // 14. Drag threshold — difference must be > 2
  // -----------------------------------------------------------------------
  describe('drag detection — difference threshold', () => {
    it('does not detect drag when total increase is <= 2', () => {
      const onSyncMessage = vi.fn();
      const { result } = renderHook(() => useAlarmState({ onSyncMessage }));
      const anchorPos = makeLatLng(54.0, 18.0, 0);
      const newPos = makeLatLng(54.001, 18.0) as any;

      // Strictly increasing but d5-d1 = 21.4-21 = 0.4 <= 2
      const distances = [21.0, 21.1, 21.2, 21.3, 21.4];
      let dragHistory: number[] = [];
      let res!: AlarmProcessResult;

      for (const d of distances) {
        anchorPos.distanceTo.mockReturnValue(d);
        const input = defaultInput({
          anchorPos: anchorPos as any,
          dragHistory,
          dragWarningDismissed: false,
        });
        act(() => { res = result.current.processPosition(input, newPos); });
        dragHistory = res.dragHistory;
      }

      expect(res.dragDetected).toBe(false);
    });
  });
});
