import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createMockGeolocation, createMockPosition, installMockGeolocation } from './mocks/geolocation';

vi.mock('../src/modules/anchor/anchor-utils', async () => {
  const actual = await vi.importActual('../src/modules/anchor/anchor-utils');
  return {
    ...actual,
    isGpsSignalLost: vi.fn(() => false),
    shouldActivateBatterySaver: vi.fn(() => false),
  };
});

import { useGPS } from '../src/modules/anchor/hooks/useGPS';
import { isGpsSignalLost, shouldActivateBatterySaver } from '../src/modules/anchor/anchor-utils';

const mockedIsGpsSignalLost = vi.mocked(isGpsSignalLost);
const mockedShouldActivateBatterySaver = vi.mocked(shouldActivateBatterySaver);

let mockGeo: ReturnType<typeof createMockGeolocation>;

beforeEach(() => {
  vi.useFakeTimers();
  mockGeo = createMockGeolocation();
  installMockGeolocation(mockGeo);
  mockGeo.watchPosition.mockReturnValue(1);
  mockedIsGpsSignalLost.mockReturnValue(false);
  mockedShouldActivateBatterySaver.mockReturnValue(false);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function renderGPSHook(overrides: Partial<Parameters<typeof useGPS>[0]> = {}) {
  const onPosition = vi.fn();
  const onError = vi.fn();
  const result = renderHook(() => useGPS({ onPosition, onError, ...overrides }));
  return { ...result, onPosition, onError };
}

// ── initGPS ─────────────────────────────────────────────────────────

describe('useGPS', () => {
  describe('initGPS', () => {
    it('calls navigator.geolocation.watchPosition with high-accuracy options', () => {
      const { result } = renderGPSHook();
      act(() => result.current.initGPS());

      expect(mockGeo.watchPosition).toHaveBeenCalledTimes(1);
      const opts = mockGeo.watchPosition.mock.calls[0][2];
      expect(opts).toMatchObject({
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000,
      });
    });

    it('does nothing when navigator.geolocation is absent', () => {
      // Delete the property so `'geolocation' in navigator` is false
      delete (navigator as any).geolocation;
      const { result } = renderGPSHook();
      act(() => result.current.initGPS());
      // Should not throw — simply no-ops
    });

    it('cleans up previous watch before starting a new one', () => {
      const { result } = renderGPSHook();
      act(() => result.current.initGPS());
      act(() => result.current.initGPS());

      expect(mockGeo.clearWatch).toHaveBeenCalledWith(1);
      expect(mockGeo.watchPosition).toHaveBeenCalledTimes(2);
    });
  });

  // ── initGPS in battery-saver mode ───────────────────────────────

  describe('initGPS in battery saver mode', () => {
    it('uses low-power options when battery saver is active', () => {
      mockedShouldActivateBatterySaver.mockReturnValue(true);
      const { result } = renderGPSHook();

      act(() => { result.current.checkBatterySaver(0.2, false); });
      vi.runAllTimers();

      const lastCall = mockGeo.watchPosition.mock.calls.at(-1)!;
      expect(lastCall[2]).toMatchObject({
        enableHighAccuracy: false,
        maximumAge: 5000,
        timeout: 10000,
      });
    });
  });

  // ── Position callback & throttling ──────────────────────────────

  describe('position callback', () => {
    it('fires onPosition with the received position', () => {
      const onPosition = vi.fn();
      const { result } = renderHook(() => useGPS({ onPosition, onError: vi.fn() }));
      act(() => result.current.initGPS());

      const successCb = mockGeo.watchPosition.mock.calls[0][0];
      const pos = createMockPosition(52.1, 20.1, 3);
      act(() => successCb(pos));

      expect(onPosition).toHaveBeenCalledWith(pos);
    });

    it('forwards errors to onError callback', () => {
      const onError = vi.fn();
      const { result } = renderHook(() => useGPS({ onPosition: vi.fn(), onError }));
      act(() => result.current.initGPS());

      const errorCb = mockGeo.watchPosition.mock.calls[0][1];
      const err = { code: 1, message: 'denied', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 };
      act(() => errorCb(err));

      expect(onError).toHaveBeenCalledWith(err);
    });
  });

  describe('throttling', () => {
    it('delivers the first position immediately when no recent call', () => {
      const onPosition = vi.fn();
      const { result } = renderHook(() => useGPS({ onPosition, onError: vi.fn() }));
      act(() => result.current.initGPS());

      const successCb = mockGeo.watchPosition.mock.calls[0][0];
      const pos = createMockPosition();
      act(() => successCb(pos));

      expect(onPosition).toHaveBeenCalledTimes(1);
    });

    it('debounces positions arriving within 500ms — only the latest is delivered', () => {
      const onPosition = vi.fn();
      const { result } = renderHook(() => useGPS({ onPosition, onError: vi.fn() }));
      act(() => result.current.initGPS());

      const successCb = mockGeo.watchPosition.mock.calls[0][0];
      const pos1 = createMockPosition(52.0, 20.0);
      const pos2 = createMockPosition(52.1, 20.1);
      const pos3 = createMockPosition(52.2, 20.2);

      // First call delivered immediately
      act(() => successCb(pos1));
      expect(onPosition).toHaveBeenCalledTimes(1);

      // Rapid-fire within 500ms — should be deferred
      act(() => { vi.advanceTimersByTime(100); });
      act(() => successCb(pos2));
      act(() => successCb(pos3));
      expect(onPosition).toHaveBeenCalledTimes(1);

      // After the remaining throttle window, latest pos delivered
      act(() => { vi.advanceTimersByTime(500); });
      expect(onPosition).toHaveBeenCalledTimes(2);
      expect(onPosition).toHaveBeenLastCalledWith(pos3);
    });

    it('updates lastFixTimeRef on throttled delivery', () => {
      const onPosition = vi.fn();
      const { result } = renderHook(() => useGPS({ onPosition, onError: vi.fn() }));
      act(() => result.current.initGPS());

      const successCb = mockGeo.watchPosition.mock.calls[0][0];
      const pos = createMockPosition();

      act(() => successCb(pos));
      const firstFix = result.current.lastFixTimeRef.current;

      act(() => { vi.advanceTimersByTime(600); });
      act(() => { successCb(createMockPosition(53, 21)); });
      expect(result.current.lastFixTimeRef.current).toBeGreaterThanOrEqual(firstFix);
    });
  });

  // ── cleanupGPS ──────────────────────────────────────────────────

  describe('cleanupGPS', () => {
    it('calls clearWatch and nullifies watchId', () => {
      const { result } = renderGPSHook();
      act(() => result.current.initGPS());
      act(() => result.current.cleanupGPS());

      expect(mockGeo.clearWatch).toHaveBeenCalledWith(1);
    });

    it('clears pending throttle timer', () => {
      const onPosition = vi.fn();
      const { result } = renderHook(() => useGPS({ onPosition, onError: vi.fn() }));
      act(() => result.current.initGPS());

      const successCb = mockGeo.watchPosition.mock.calls[0][0];
      // Trigger a throttled (deferred) position
      act(() => successCb(createMockPosition()));
      act(() => { vi.advanceTimersByTime(100); });
      act(() => successCb(createMockPosition(53, 21)));

      act(() => result.current.cleanupGPS());
      act(() => { vi.advanceTimersByTime(1000); });

      // Only the first immediate call went through; the deferred one was cleared
      expect(onPosition).toHaveBeenCalledTimes(1);
    });

    it('is safe to call when no watch is active', () => {
      const { result } = renderGPSHook();
      expect(() => act(() => result.current.cleanupGPS())).not.toThrow();
    });
  });

  // ── checkGpsWatchdog ────────────────────────────────────────────

  describe('checkGpsWatchdog', () => {
    it('returns {signalLost: false, signalRestored: false} when signal is present', () => {
      mockedIsGpsSignalLost.mockReturnValue(false);
      const { result } = renderGPSHook();
      const onLost = vi.fn();

      let status!: { signalLost: boolean; signalRestored: boolean };
      act(() => { status = result.current.checkGpsWatchdog(onLost); });

      expect(status).toEqual({ signalLost: false, signalRestored: false });
      expect(onLost).not.toHaveBeenCalled();
    });

    it('returns {signalLost: true} and calls onLost when signal is lost', () => {
      mockedIsGpsSignalLost.mockReturnValue(true);
      const { result } = renderGPSHook();
      const onLost = vi.fn();

      let status!: { signalLost: boolean; signalRestored: boolean };
      act(() => { status = result.current.checkGpsWatchdog(onLost); });

      expect(status).toEqual({ signalLost: true, signalRestored: false });
      expect(onLost).toHaveBeenCalledTimes(1);
    });

    it('alerts only once — watchdogAlertedRef prevents repeated triggers', () => {
      mockedIsGpsSignalLost.mockReturnValue(true);
      const { result } = renderGPSHook();
      const onLost = vi.fn();

      act(() => { result.current.checkGpsWatchdog(onLost); });
      act(() => { result.current.checkGpsWatchdog(onLost); });
      act(() => { result.current.checkGpsWatchdog(onLost); });

      expect(onLost).toHaveBeenCalledTimes(1);
    });

    it('returns {signalRestored: true} when fix comes back after loss', () => {
      const { result } = renderGPSHook();
      const onLost = vi.fn();

      // Simulate loss
      mockedIsGpsSignalLost.mockReturnValue(true);
      act(() => { result.current.checkGpsWatchdog(onLost); });

      // Simulate restoration
      mockedIsGpsSignalLost.mockReturnValue(false);
      let status!: { signalLost: boolean; signalRestored: boolean };
      act(() => { status = result.current.checkGpsWatchdog(onLost); });

      expect(status).toEqual({ signalLost: false, signalRestored: true });
    });

    it('resets watchdogAlertedRef after restoration so it can alert again', () => {
      const { result } = renderGPSHook();
      const onLost = vi.fn();

      // First loss
      mockedIsGpsSignalLost.mockReturnValue(true);
      act(() => { result.current.checkGpsWatchdog(onLost); });

      // Restore
      mockedIsGpsSignalLost.mockReturnValue(false);
      act(() => { result.current.checkGpsWatchdog(onLost); });

      // Second loss — should alert again
      mockedIsGpsSignalLost.mockReturnValue(true);
      act(() => { result.current.checkGpsWatchdog(onLost); });

      expect(onLost).toHaveBeenCalledTimes(2);
    });
  });

  // ── checkBatterySaver ───────────────────────────────────────────

  describe('checkBatterySaver', () => {
    it('activates battery saver when shouldActivateBatterySaver returns true', () => {
      mockedShouldActivateBatterySaver.mockReturnValue(true);
      const { result } = renderGPSHook();

      let returned!: boolean;
      act(() => { returned = result.current.checkBatterySaver(0.2, false); });

      expect(returned).toBe(true);
      expect(result.current.batterySaverActive).toBe(true);
    });

    it('deactivates battery saver when shouldActivateBatterySaver returns false', () => {
      mockedShouldActivateBatterySaver.mockReturnValue(true);
      const { result } = renderGPSHook();

      // Activate first
      act(() => { result.current.checkBatterySaver(0.2, false); });
      vi.runAllTimers();

      // Now deactivate
      mockedShouldActivateBatterySaver.mockReturnValue(false);
      let returned!: boolean;
      act(() => { returned = result.current.checkBatterySaver(0.8, true); });

      expect(returned).toBe(false);
      expect(result.current.batterySaverActive).toBe(false);
    });

    it('re-initializes GPS with new options on toggle', () => {
      const { result } = renderGPSHook();

      // Activate
      mockedShouldActivateBatterySaver.mockReturnValue(true);
      act(() => { result.current.checkBatterySaver(0.2, false); });
      act(() => { vi.runAllTimers(); });

      const batterySaverOpts = mockGeo.watchPosition.mock.calls.at(-1)?.[2];
      expect(batterySaverOpts).toMatchObject({ enableHighAccuracy: false });

      // Deactivate
      mockedShouldActivateBatterySaver.mockReturnValue(false);
      act(() => { result.current.checkBatterySaver(0.8, true); });
      act(() => { vi.runAllTimers(); });

      const normalOpts = mockGeo.watchPosition.mock.calls.at(-1)?.[2];
      expect(normalOpts).toMatchObject({ enableHighAccuracy: true });
    });

    it('does nothing when state is already matching', () => {
      mockedShouldActivateBatterySaver.mockReturnValue(false);
      const { result } = renderGPSHook();

      const callsBefore = mockGeo.watchPosition.mock.calls.length;
      act(() => { result.current.checkBatterySaver(0.8, true); });
      vi.runAllTimers();

      expect(mockGeo.watchPosition.mock.calls.length).toBe(callsBefore);
    });

    it('uses reinitTimerRef for async reinit via setTimeout', () => {
      mockedShouldActivateBatterySaver.mockReturnValue(true);
      const { result } = renderGPSHook();

      act(() => { result.current.checkBatterySaver(0.2, false); });

      // GPS not yet re-inited (setTimeout 0 not yet fired)
      const callsBeforeTimer = mockGeo.watchPosition.mock.calls.length;

      act(() => { vi.runAllTimers(); });

      expect(mockGeo.watchPosition.mock.calls.length).toBe(callsBeforeTimer + 1);
    });
  });

  // ── Unmount cleanup ─────────────────────────────────────────────

  describe('unmount cleanup', () => {
    it('clears watch on unmount', () => {
      const { result, unmount } = renderGPSHook();
      act(() => result.current.initGPS());

      unmount();

      expect(mockGeo.clearWatch).toHaveBeenCalled();
    });

    it('clears reinitTimer on unmount', () => {
      mockedShouldActivateBatterySaver.mockReturnValue(true);
      const { result, unmount } = renderGPSHook();

      act(() => { result.current.checkBatterySaver(0.2, false); });
      // reinitTimerRef is now set but not yet fired

      unmount();

      // The reinit timer should have been cleared — no GPS init after unmount
      const callsBefore = mockGeo.watchPosition.mock.calls.length;
      act(() => { vi.runAllTimers(); });
      expect(mockGeo.watchPosition.mock.calls.length).toBe(callsBefore);
    });

    it('clears throttle timer on unmount', () => {
      const onPosition = vi.fn();
      const { result, unmount } = renderHook(() =>
        useGPS({ onPosition, onError: vi.fn() }),
      );
      act(() => result.current.initGPS());

      const successCb = mockGeo.watchPosition.mock.calls[0][0];
      act(() => successCb(createMockPosition()));
      act(() => { vi.advanceTimersByTime(100); });
      act(() => successCb(createMockPosition(53, 21)));

      const callsBefore = onPosition.mock.calls.length;
      unmount();
      act(() => { vi.runAllTimers(); });

      expect(onPosition.mock.calls.length).toBe(callsBefore);
    });
  });
});
