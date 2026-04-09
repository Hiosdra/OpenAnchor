import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ─── Mock Leaflet ─────────────────────────────────────────────────
vi.mock('leaflet', () => {
  const latLng = (lat: number, lng: number) => ({ lat, lng });
  return {
    default: { latLng },
    latLng,
  };
});

import L from 'leaflet';
import { useAnchorActions } from '../src/modules/anchor/hooks/useAnchorActions';

// ─── Helpers ──────────────────────────────────────────────────────

function makeDeps(overrides: Record<string, any> = {}) {
  const base = {
    stateRef: {
      current: {
        accuracy: 5,
        sog: 0,
        cog: 0,
        maxSogDuringAnchor: 0,
        isAnchored: false,
        anchorPos: null,
        track: [],
        sessionId: null,
        distance: 0,
        alarmState: 'SAFE',
        alarmCount: 0,
        currentPos: L.latLng(54, 18),
        hasGpsFix: false,
        gpsSignalLost: false,
        mapAutoCenter: true,
        radius: 50,
        bufferRadius: 60,
        sectorEnabled: false,
        sectorBearing: 0,
        sectorWidth: 90,
        dragHistory: [],
        dragWarningDismissed: false,
        maxDistanceSwing: 0,
        unit: 'm',
        chainLengthM: null,
        depthM: null,
        anchorStartTime: null,
        watchMinutes: 60,
        ...overrides.state,
      },
    } as any,
    updateState: vi.fn(),
    alarm: {
      processPosition: vi.fn(() => ({
        distance: 10,
        alarmState: 'SAFE',
        maxDistanceSwing: 10,
        dragHistory: [],
        dragWarningDismissed: false,
        dragDetected: false,
        previousAlarmState: 'SAFE',
      })),
      recalculateZone: vi.fn(),
      resetEngine: vi.fn(),
    },
    session: {
      bufferTrackPoint: vi.fn(),
      persistActiveState: vi.fn(),
      setAnchor: vi.fn().mockResolvedValue(42),
      liftAnchor: vi.fn().mockResolvedValue(undefined),
    },
    mapRef: {
      current: {
        updateBoat: vi.fn(),
        updateTrack: vi.fn(),
        getMap: vi.fn(() => ({ setView: vi.fn() })),
      },
    } as any,
    mapHook: {
      setAnchor: vi.fn(),
      clearAnchor: vi.fn(),
      drawSafeZone: vi.fn(),
      fitSafeZone: vi.fn(),
    },
    alertCtrl: {
      ensureAudioContext: vi.fn(),
      initPermissions: vi.fn(),
      requestWakeLock: vi.fn(),
      releaseWakeLock: vi.fn(),
      stopAlarm: vi.fn(),
    },
    sync: {
      isConnectedRef: { current: false },
      sendMessage: vi.fn(),
      sendFullSync: vi.fn(),
    },
    syncRef: {
      current: {
        isConnectedRef: { current: false },
        sendFullSync: vi.fn(),
      },
    } as any,
    openModal: vi.fn(),
  };

  // Set state alias
  base.stateRef.current = { ...base.stateRef.current, ...overrides.state };
  const state = base.stateRef.current;

  return {
    ...base,
    state,
    ...overrides,
    // Allow overriding nested values
    stateRef: overrides.stateRef ?? base.stateRef,
    alarm: { ...base.alarm, ...overrides.alarm },
    session: { ...base.session, ...overrides.session },
    mapRef: overrides.mapRef ?? base.mapRef,
    mapHook: { ...base.mapHook, ...overrides.mapHook },
    alertCtrl: { ...base.alertCtrl, ...overrides.alertCtrl },
    sync: { ...base.sync, ...overrides.sync },
    syncRef: overrides.syncRef ?? base.syncRef,
  };
}

function makePosition(
  lat = 54.0,
  lng = 18.0,
  accuracy = 5,
  speed: number | null = null,
  heading: number | null = null,
): GeolocationPosition {
  return {
    coords: {
      latitude: lat,
      longitude: lng,
      accuracy,
      speed,
      heading,
      altitude: null,
      altitudeAccuracy: null,
    },
    timestamp: Date.now(),
  } as GeolocationPosition;
}

// ─── Tests ────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useAnchorActions', () => {
  // ═══════════════════════════════════════════
  // handleGpsPosition
  // ═══════════════════════════════════════════

  describe('handleGpsPosition', () => {
    it('uses rawAccuracy when valid (>= 0 and finite)', () => {
      const deps = makeDeps();
      const { result } = renderHook(() => useAnchorActions(deps));
      const pos = makePosition(54, 18, 3.5);

      act(() => result.current.handleGpsPosition(pos));

      expect(deps.updateState).toHaveBeenCalled();
      const update = deps.updateState.mock.calls[0][0];
      expect(update.accuracy).toBe(3.5);
    });

    it('falls back to state accuracy when rawAccuracy is negative', () => {
      const deps = makeDeps({ state: { accuracy: 7 } });
      const { result } = renderHook(() => useAnchorActions(deps));
      const pos = makePosition(54, 18, -1);

      act(() => result.current.handleGpsPosition(pos));

      const update = deps.updateState.mock.calls[0][0];
      expect(update.accuracy).toBe(7);
    });

    it('falls back to state accuracy when rawAccuracy is Infinity', () => {
      const deps = makeDeps({ state: { accuracy: 7 } });
      const { result } = renderHook(() => useAnchorActions(deps));
      const pos = makePosition(54, 18, Infinity);

      act(() => result.current.handleGpsPosition(pos));

      const update = deps.updateState.mock.calls[0][0];
      expect(update.accuracy).toBe(7);
    });

    it('falls back to state accuracy when rawAccuracy is NaN', () => {
      const deps = makeDeps({ state: { accuracy: 7 } });
      const { result } = renderHook(() => useAnchorActions(deps));
      const pos = makePosition(54, 18, NaN);

      act(() => result.current.handleGpsPosition(pos));

      const update = deps.updateState.mock.calls[0][0];
      expect(update.accuracy).toBe(7);
    });

    it('updates sog when speed is not null', () => {
      const deps = makeDeps();
      const { result } = renderHook(() => useAnchorActions(deps));
      const pos = makePosition(54, 18, 5, 2.0); // 2 m/s

      act(() => result.current.handleGpsPosition(pos));

      const update = deps.updateState.mock.calls[0][0];
      expect(update.sog).toBeGreaterThan(0);
    });

    it('does not update sog when speed is null', () => {
      const deps = makeDeps({ state: { sog: 1.5 } });
      const { result } = renderHook(() => useAnchorActions(deps));
      const pos = makePosition(54, 18, 5, null);

      act(() => result.current.handleGpsPosition(pos));

      const update = deps.updateState.mock.calls[0][0];
      expect(update.sog).toBe(1.5);
    });

    it('updates maxSogDuringAnchor when anchored and sog exceeds current max', () => {
      const deps = makeDeps({
        state: {
          isAnchored: true,
          maxSogDuringAnchor: 1.0,
          anchorPos: L.latLng(54, 18),
          sessionId: 1,
        },
      });
      const { result } = renderHook(() => useAnchorActions(deps));
      // 5 m/s ≈ 9.72 kn > maxSogDuringAnchor (1.0)
      const pos = makePosition(54, 18, 5, 5.0);

      act(() => result.current.handleGpsPosition(pos));

      const update = deps.updateState.mock.calls[0][0];
      expect(update.maxSogDuringAnchor).toBeGreaterThan(1.0);
    });

    it('does not update maxSogDuringAnchor when not anchored', () => {
      const deps = makeDeps({
        state: { isAnchored: false, maxSogDuringAnchor: 1.0 },
      });
      const { result } = renderHook(() => useAnchorActions(deps));
      const pos = makePosition(54, 18, 5, 5.0);

      act(() => result.current.handleGpsPosition(pos));

      const update = deps.updateState.mock.calls[0][0];
      expect(update.maxSogDuringAnchor).toBe(1.0);
    });

    it('updates cog when heading is valid', () => {
      const deps = makeDeps();
      const { result } = renderHook(() => useAnchorActions(deps));
      const pos = makePosition(54, 18, 5, null, 135);

      act(() => result.current.handleGpsPosition(pos));

      const update = deps.updateState.mock.calls[0][0];
      expect(update.cog).toBe(135);
    });

    it('does not update cog when heading is null', () => {
      const deps = makeDeps({ state: { cog: 90 } });
      const { result } = renderHook(() => useAnchorActions(deps));
      const pos = makePosition(54, 18, 5, null, null);

      act(() => result.current.handleGpsPosition(pos));

      const update = deps.updateState.mock.calls[0][0];
      expect(update.cog).toBe(90);
    });

    it('does not update cog when heading is NaN', () => {
      const deps = makeDeps({ state: { cog: 90 } });
      const { result } = renderHook(() => useAnchorActions(deps));
      const pos = makePosition(54, 18, 5, null, NaN);

      act(() => result.current.handleGpsPosition(pos));

      const update = deps.updateState.mock.calls[0][0];
      expect(update.cog).toBe(90);
    });

    it('runs alarm processing when anchored with anchorPos', () => {
      const deps = makeDeps({
        state: {
          isAnchored: true,
          anchorPos: L.latLng(54, 18),
          sessionId: 1,
        },
      });
      const { result } = renderHook(() => useAnchorActions(deps));

      act(() => result.current.handleGpsPosition(makePosition()));

      expect(deps.alarm.processPosition).toHaveBeenCalled();
    });

    it('does not run alarm when not anchored', () => {
      const deps = makeDeps({ state: { isAnchored: false } });
      const { result } = renderHook(() => useAnchorActions(deps));

      act(() => result.current.handleGpsPosition(makePosition()));

      expect(deps.alarm.processPosition).not.toHaveBeenCalled();
    });

    it('does not run alarm when anchorPos is null', () => {
      const deps = makeDeps({
        state: { isAnchored: true, anchorPos: null },
      });
      const { result } = renderHook(() => useAnchorActions(deps));

      act(() => result.current.handleGpsPosition(makePosition()));

      expect(deps.alarm.processPosition).not.toHaveBeenCalled();
    });

    it('opens dragWarning modal when dragDetected', () => {
      const deps = makeDeps({
        state: {
          isAnchored: true,
          anchorPos: L.latLng(54, 18),
          sessionId: 1,
        },
      });
      deps.alarm.processPosition.mockReturnValue({
        distance: 55,
        alarmState: 'ALARM',
        maxDistanceSwing: 55,
        dragHistory: [{ time: 1, bearing: 90, speed: 0.5 }],
        dragWarningDismissed: false,
        dragDetected: true,
        previousAlarmState: 'SAFE',
      });
      const { result } = renderHook(() => useAnchorActions(deps));

      act(() => result.current.handleGpsPosition(makePosition()));

      expect(deps.openModal).toHaveBeenCalledWith('dragWarning');
    });

    it('does not open dragWarning when dragDetected is false', () => {
      const deps = makeDeps({
        state: {
          isAnchored: true,
          anchorPos: L.latLng(54, 18),
          sessionId: 1,
        },
      });
      const { result } = renderHook(() => useAnchorActions(deps));

      act(() => result.current.handleGpsPosition(makePosition()));

      expect(deps.openModal).not.toHaveBeenCalled();
    });

    it('truncates track when exceeding MAX_TRACK_POINTS (500)', () => {
      const longTrack = Array.from({ length: 500 }, (_, i) => L.latLng(54 + i * 0.0001, 18));
      const deps = makeDeps({ state: { track: longTrack } });
      const { result } = renderHook(() => useAnchorActions(deps));

      act(() => result.current.handleGpsPosition(makePosition()));

      const update = deps.updateState.mock.calls[0][0];
      expect(update.track.length).toBe(500);
    });

    it('does not truncate track when under limit', () => {
      const deps = makeDeps({ state: { track: [L.latLng(54, 18)] } });
      const { result } = renderHook(() => useAnchorActions(deps));

      act(() => result.current.handleGpsPosition(makePosition()));

      const update = deps.updateState.mock.calls[0][0];
      expect(update.track.length).toBe(2);
    });

    it('buffers track point when anchored with sessionId', () => {
      const deps = makeDeps({
        state: {
          isAnchored: true,
          anchorPos: L.latLng(54, 18),
          sessionId: 42,
        },
      });
      const { result } = renderHook(() => useAnchorActions(deps));

      act(() => result.current.handleGpsPosition(makePosition()));

      expect(deps.session.bufferTrackPoint).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId: 42 }),
      );
    });

    it('does not buffer track point when not anchored', () => {
      const deps = makeDeps({ state: { isAnchored: false, sessionId: 42 } });
      const { result } = renderHook(() => useAnchorActions(deps));

      act(() => result.current.handleGpsPosition(makePosition()));

      expect(deps.session.bufferTrackPoint).not.toHaveBeenCalled();
    });

    it('does not buffer track point when sessionId is null', () => {
      const deps = makeDeps({
        state: { isAnchored: true, anchorPos: L.latLng(54, 18), sessionId: null },
      });
      const { result } = renderHook(() => useAnchorActions(deps));

      act(() => result.current.handleGpsPosition(makePosition()));

      expect(deps.session.bufferTrackPoint).not.toHaveBeenCalled();
    });

    it('increments alarmCount on first ALARM transition', () => {
      const deps = makeDeps({
        state: {
          isAnchored: true,
          anchorPos: L.latLng(54, 18),
          sessionId: 1,
          alarmCount: 0,
        },
      });
      deps.alarm.processPosition.mockReturnValue({
        distance: 55,
        alarmState: 'ALARM',
        maxDistanceSwing: 55,
        dragHistory: [],
        dragWarningDismissed: false,
        dragDetected: false,
        previousAlarmState: 'SAFE',
      });
      const { result } = renderHook(() => useAnchorActions(deps));

      act(() => result.current.handleGpsPosition(makePosition()));

      const update = deps.updateState.mock.calls[0][0];
      expect(update.alarmCount).toBe(1);
    });

    it('does not increment alarmCount on steady ALARM (was already ALARM)', () => {
      const deps = makeDeps({
        state: {
          isAnchored: true,
          anchorPos: L.latLng(54, 18),
          sessionId: 1,
          alarmCount: 1,
        },
      });
      deps.alarm.processPosition.mockReturnValue({
        distance: 55,
        alarmState: 'ALARM',
        maxDistanceSwing: 55,
        dragHistory: [],
        dragWarningDismissed: false,
        dragDetected: false,
        previousAlarmState: 'ALARM',
      });
      const { result } = renderHook(() => useAnchorActions(deps));

      act(() => result.current.handleGpsPosition(makePosition()));

      const update = deps.updateState.mock.calls[0][0];
      expect(update.alarmCount).toBeUndefined();
    });

    it('handles null alarmCount with nullish coalescing', () => {
      const deps = makeDeps({
        state: {
          isAnchored: true,
          anchorPos: L.latLng(54, 18),
          sessionId: 1,
          alarmCount: null,
        },
      });
      deps.alarm.processPosition.mockReturnValue({
        distance: 55,
        alarmState: 'ALARM',
        maxDistanceSwing: 55,
        dragHistory: [],
        dragWarningDismissed: false,
        dragDetected: false,
        previousAlarmState: 'SAFE',
      });
      const { result } = renderHook(() => useAnchorActions(deps));

      act(() => result.current.handleGpsPosition(makePosition()));

      const update = deps.updateState.mock.calls[0][0];
      expect(update.alarmCount).toBe(1);
    });

    it('persists state periodically when anchored (after PERSIST_INTERVAL)', () => {
      const deps = makeDeps({
        state: {
          isAnchored: true,
          anchorPos: L.latLng(54, 18),
          sessionId: 1,
        },
      });
      const { result } = renderHook(() => useAnchorActions(deps));

      // First call at time 0 - 0 > 5000 since lastPersistRef starts at 0
      vi.setSystemTime(new Date(6000));
      act(() => result.current.handleGpsPosition(makePosition()));

      expect(deps.session.persistActiveState).toHaveBeenCalled();
    });

    it('does not persist when not enough time has elapsed', () => {
      const deps = makeDeps({
        state: {
          isAnchored: true,
          anchorPos: L.latLng(54, 18),
          sessionId: 1,
        },
      });
      const { result } = renderHook(() => useAnchorActions(deps));

      // First call persists (lastPersistRef = 0, now = 6000)
      vi.setSystemTime(new Date(6000));
      act(() => result.current.handleGpsPosition(makePosition()));
      deps.session.persistActiveState.mockClear();

      // Second call within 5000ms should NOT persist
      vi.setSystemTime(new Date(10000));
      act(() => result.current.handleGpsPosition(makePosition()));

      expect(deps.session.persistActiveState).not.toHaveBeenCalled();
    });

    it('does not persist when not anchored', () => {
      const deps = makeDeps({ state: { isAnchored: false } });
      const { result } = renderHook(() => useAnchorActions(deps));

      vi.setSystemTime(new Date(6000));
      act(() => result.current.handleGpsPosition(makePosition()));

      expect(deps.session.persistActiveState).not.toHaveBeenCalled();
    });

    it('updates alarmResult fields in state when alarmResult is truthy', () => {
      const deps = makeDeps({
        state: {
          isAnchored: true,
          anchorPos: L.latLng(54, 18),
          sessionId: 1,
        },
      });
      deps.alarm.processPosition.mockReturnValue({
        distance: 22,
        alarmState: 'WARNING',
        maxDistanceSwing: 22,
        dragHistory: [{ a: 1 }],
        dragWarningDismissed: true,
        dragDetected: false,
        previousAlarmState: 'SAFE',
      });
      const { result } = renderHook(() => useAnchorActions(deps));

      act(() => result.current.handleGpsPosition(makePosition()));

      const update = deps.updateState.mock.calls[0][0];
      expect(update.distance).toBe(22);
      expect(update.alarmState).toBe('WARNING');
      expect(update.maxDistanceSwing).toBe(22);
      expect(update.dragHistory).toEqual([{ a: 1 }]);
      expect(update.dragWarningDismissed).toBe(true);
    });

    it('does not include alarm fields in update when not anchored (no alarmResult)', () => {
      const deps = makeDeps({ state: { isAnchored: false } });
      const { result } = renderHook(() => useAnchorActions(deps));

      act(() => result.current.handleGpsPosition(makePosition()));

      const update = deps.updateState.mock.calls[0][0];
      expect(update.distance).toBeUndefined();
      expect(update.alarmState).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════
  // handleToggleAnchor
  // ═══════════════════════════════════════════

  describe('handleToggleAnchor', () => {
    describe('lift anchor (isAnchored = true)', () => {
      it('lifts anchor, resets state, and stops alarm', async () => {
        const deps = makeDeps({
          state: {
            isAnchored: true,
            anchorPos: L.latLng(54, 18),
            sessionId: 1,
            alarmCount: 2,
            maxDistanceSwing: 30,
            maxSogDuringAnchor: 1.5,
          },
        });
        const { result } = renderHook(() => useAnchorActions(deps));

        await act(async () => {
          await result.current.handleToggleAnchor();
        });

        expect(deps.alertCtrl.ensureAudioContext).toHaveBeenCalled();
        expect(deps.session.liftAnchor).toHaveBeenCalled();
        expect(deps.alertCtrl.releaseWakeLock).toHaveBeenCalled();
        expect(deps.alertCtrl.stopAlarm).toHaveBeenCalled();
        expect(deps.mapHook.clearAnchor).toHaveBeenCalled();
        expect(deps.alarm.resetEngine).toHaveBeenCalled();
        expect(deps.updateState).toHaveBeenCalledWith(
          expect.objectContaining({
            isAnchored: false,
            anchorPos: null,
            alarmState: 'SAFE',
          }),
        );
      });

      it('sends disconnect message when sync is connected', async () => {
        const deps = makeDeps({
          state: { isAnchored: true, anchorPos: L.latLng(54, 18), sessionId: 1 },
        });
        deps.sync.isConnectedRef.current = true;
        const { result } = renderHook(() => useAnchorActions(deps));

        await act(async () => {
          await result.current.handleToggleAnchor();
        });

        expect(deps.sync.sendMessage).toHaveBeenCalled();
      });

      it('does not send disconnect when sync is not connected', async () => {
        const deps = makeDeps({
          state: { isAnchored: true, anchorPos: L.latLng(54, 18), sessionId: 1 },
        });
        deps.sync.isConnectedRef.current = false;
        const { result } = renderHook(() => useAnchorActions(deps));

        await act(async () => {
          await result.current.handleToggleAnchor();
        });

        expect(deps.sync.sendMessage).not.toHaveBeenCalled();
      });

      it('passes alarmTriggered based on alarmCount (nullish coalescing)', async () => {
        const deps = makeDeps({
          state: {
            isAnchored: true,
            anchorPos: L.latLng(54, 18),
            sessionId: 1,
            alarmCount: null,
          },
        });
        const { result } = renderHook(() => useAnchorActions(deps));

        await act(async () => {
          await result.current.handleToggleAnchor();
        });

        const liftArg = deps.session.liftAnchor.mock.calls[0][0];
        expect(liftArg.alarmTriggered).toBe(false);
      });
    });

    describe('drop anchor (isAnchored = false)', () => {
      it('returns early when currentPos is null', async () => {
        const deps = makeDeps({
          state: { isAnchored: false, currentPos: null },
        });
        const { result } = renderHook(() => useAnchorActions(deps));

        await act(async () => {
          await result.current.handleToggleAnchor();
        });

        expect(deps.session.setAnchor).not.toHaveBeenCalled();
      });

      it('drops anchor with session and map setup', async () => {
        const deps = makeDeps({
          state: { isAnchored: false, currentPos: L.latLng(54, 18), radius: 50 },
        });
        const { result } = renderHook(() => useAnchorActions(deps));

        await act(async () => {
          await result.current.handleToggleAnchor();
        });

        expect(deps.alertCtrl.ensureAudioContext).toHaveBeenCalled();
        expect(deps.alertCtrl.initPermissions).toHaveBeenCalled();
        expect(deps.session.setAnchor).toHaveBeenCalled();
        expect(deps.alertCtrl.requestWakeLock).toHaveBeenCalled();
        expect(deps.mapHook.setAnchor).toHaveBeenCalled();
        expect(deps.mapHook.drawSafeZone).toHaveBeenCalled();
        expect(deps.mapHook.fitSafeZone).toHaveBeenCalled();
        expect(deps.updateState).toHaveBeenCalledWith(
          expect.objectContaining({
            isAnchored: true,
            sessionId: 42,
            bufferRadius: 60,
          }),
        );
      });

      it('sends full sync when connected', async () => {
        const deps = makeDeps({
          state: { isAnchored: false, currentPos: L.latLng(54, 18) },
        });
        deps.sync.isConnectedRef.current = true;
        const { result } = renderHook(() => useAnchorActions(deps));

        await act(async () => {
          await result.current.handleToggleAnchor();
        });

        expect(deps.sync.sendFullSync).toHaveBeenCalled();
      });

      it('does not send sync when not connected', async () => {
        const deps = makeDeps({
          state: { isAnchored: false, currentPos: L.latLng(54, 18) },
        });
        deps.sync.isConnectedRef.current = false;
        const { result } = renderHook(() => useAnchorActions(deps));

        await act(async () => {
          await result.current.handleToggleAnchor();
        });

        expect(deps.sync.sendFullSync).not.toHaveBeenCalled();
      });
    });
  });

  // ═══════════════════════════════════════════
  // handleRadiusChange
  // ═══════════════════════════════════════════

  describe('handleRadiusChange', () => {
    it('clamps radius to minimum 5', () => {
      const deps = makeDeps();
      const { result } = renderHook(() => useAnchorActions(deps));

      act(() => result.current.handleRadiusChange(2));

      expect(deps.updateState).toHaveBeenCalledWith(
        expect.objectContaining({ radius: 5, bufferRadius: 6 }),
      );
    });

    it('clamps radius to maximum 500', () => {
      const deps = makeDeps();
      const { result } = renderHook(() => useAnchorActions(deps));

      act(() => result.current.handleRadiusChange(999));

      expect(deps.updateState).toHaveBeenCalledWith(
        expect.objectContaining({ radius: 500, bufferRadius: 600 }),
      );
    });

    it('passes through valid radius', () => {
      const deps = makeDeps();
      const { result } = renderHook(() => useAnchorActions(deps));

      act(() => result.current.handleRadiusChange(100));

      expect(deps.updateState).toHaveBeenCalledWith(
        expect.objectContaining({ radius: 100, bufferRadius: 120 }),
      );
    });

    it('recalculates zone when anchored with anchorPos', () => {
      const deps = makeDeps({
        state: {
          isAnchored: true,
          anchorPos: L.latLng(54, 18),
        },
      });
      const { result } = renderHook(() => useAnchorActions(deps));

      act(() => result.current.handleRadiusChange(100));

      expect(deps.alarm.recalculateZone).toHaveBeenCalled();
      expect(deps.session.persistActiveState).toHaveBeenCalled();
    });

    it('does not recalculate zone when not anchored', () => {
      const deps = makeDeps({ state: { isAnchored: false } });
      const { result } = renderHook(() => useAnchorActions(deps));

      act(() => result.current.handleRadiusChange(100));

      expect(deps.alarm.recalculateZone).not.toHaveBeenCalled();
      expect(deps.session.persistActiveState).not.toHaveBeenCalled();
    });

    it('does not recalculate zone when anchorPos is null', () => {
      const deps = makeDeps({ state: { isAnchored: true, anchorPos: null } });
      const { result } = renderHook(() => useAnchorActions(deps));

      act(() => result.current.handleRadiusChange(100));

      expect(deps.alarm.recalculateZone).not.toHaveBeenCalled();
    });

    it('sends full sync when connected (independent of anchored state)', () => {
      const deps = makeDeps({ state: { isAnchored: false } });
      deps.syncRef.current.isConnectedRef.current = true;
      const { result } = renderHook(() => useAnchorActions(deps));

      act(() => result.current.handleRadiusChange(100));

      expect(deps.syncRef.current.sendFullSync).toHaveBeenCalled();
    });

    it('does not send sync when not connected', () => {
      const deps = makeDeps();
      deps.syncRef.current.isConnectedRef.current = false;
      const { result } = renderHook(() => useAnchorActions(deps));

      act(() => result.current.handleRadiusChange(100));

      expect(deps.syncRef.current.sendFullSync).not.toHaveBeenCalled();
    });
  });
});
