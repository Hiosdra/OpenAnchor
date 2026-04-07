import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createMockAudioContext } from './mocks/web-audio';
import { createMockWakeLock, createMockBattery } from './mocks/wake-lock';

// ---------------------------------------------------------------------------
// Globals
// ---------------------------------------------------------------------------
let mockAudioCtx: ReturnType<typeof createMockAudioContext>;
let mockWakeLock: ReturnType<typeof createMockWakeLock>;
let mockBattery: ReturnType<typeof createMockBattery>;

beforeEach(() => {
  vi.useFakeTimers();

  mockAudioCtx = createMockAudioContext();
  // Must use a regular function — arrow functions cannot be `new`-invoked
  (globalThis as any).AudioContext = vi.fn(function (this: any) {
    Object.assign(this, mockAudioCtx);
    return mockAudioCtx;
  });

  mockWakeLock = createMockWakeLock();
  Object.defineProperty(navigator, 'wakeLock', {
    value: mockWakeLock,
    configurable: true,
  });

  mockBattery = createMockBattery();
  (navigator as any).getBattery = vi.fn().mockResolvedValue(mockBattery);
  navigator.vibrate = vi.fn();

  // Notification stub
  (globalThis as any).Notification = {
    permission: 'granted',
    requestPermission: vi.fn().mockResolvedValue('granted'),
  };
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete (globalThis as any).AudioContext;
  delete (globalThis as any).Notification;
});

// Dynamic import so mocks are established before the module evaluates
async function importHook() {
  const mod = await import('../src/modules/anchor/hooks/useAlertController');
  return mod.useAlertController;
}

// ---------------------------------------------------------------------------
// 1. ensureAudioContext
// ---------------------------------------------------------------------------
describe('ensureAudioContext', () => {
  it('creates an AudioContext on first call', async () => {
    const useAlertController = await importHook();
    const { result } = renderHook(() => useAlertController());

    act(() => {
      result.current.ensureAudioContext();
    });

    expect(globalThis.AudioContext).toHaveBeenCalledTimes(1);
  });

  it('reuses the same AudioContext on subsequent calls', async () => {
    const useAlertController = await importHook();
    const { result } = renderHook(() => useAlertController());

    act(() => {
      result.current.ensureAudioContext();
      result.current.ensureAudioContext();
    });

    // One from the hook + zero extra — constructor called only once
    expect(globalThis.AudioContext).toHaveBeenCalledTimes(1);
  });

  it('resumes a suspended AudioContext', async () => {
    mockAudioCtx.state = 'suspended';
    const useAlertController = await importHook();
    const { result } = renderHook(() => useAlertController());

    act(() => {
      result.current.ensureAudioContext();
    });

    expect(mockAudioCtx.resume).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 2. playBeep / startAlarm
// ---------------------------------------------------------------------------
describe('startAlarm & playBeep', () => {
  it('creates oscillator and gain, starts playback', async () => {
    const useAlertController = await importHook();
    const { result } = renderHook(() => useAlertController());

    act(() => {
      result.current.ensureAudioContext();
      result.current.startAlarm(1000);
    });

    expect(mockAudioCtx.createOscillator).toHaveBeenCalled();
    expect(mockAudioCtx.createGain).toHaveBeenCalled();
    expect(mockAudioCtx._oscillator.connect).toHaveBeenCalledWith(mockAudioCtx._gainNode);
    expect(mockAudioCtx._gainNode.connect).toHaveBeenCalledWith(mockAudioCtx.destination);
    expect(mockAudioCtx._oscillator.start).toHaveBeenCalled();
  });

  it('vibrates when starting alarm', async () => {
    const useAlertController = await importHook();
    const { result } = renderHook(() => useAlertController());

    act(() => {
      result.current.ensureAudioContext();
      result.current.startAlarm(1000);
    });

    expect(navigator.vibrate).toHaveBeenCalledWith([500, 200, 500]);
  });

  it('does not start a second alarm if already alarming', async () => {
    const useAlertController = await importHook();
    const { result } = renderHook(() => useAlertController());

    act(() => {
      result.current.ensureAudioContext();
      result.current.startAlarm(1000);
    });

    const callsBefore = mockAudioCtx.createOscillator.mock.calls.length;

    act(() => {
      result.current.startAlarm(1000);
    });

    // No additional oscillator created
    expect(mockAudioCtx.createOscillator).toHaveBeenCalledTimes(callsBefore);
  });

  it('repeats beep at the given interval', async () => {
    const useAlertController = await importHook();
    const { result } = renderHook(() => useAlertController());

    act(() => {
      result.current.ensureAudioContext();
      result.current.startAlarm(500);
    });

    const callsAfterStart = mockAudioCtx.createOscillator.mock.calls.length;

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(mockAudioCtx.createOscillator.mock.calls.length).toBeGreaterThan(callsAfterStart);
  });
});

// ---------------------------------------------------------------------------
// 3. stopAlarm
// ---------------------------------------------------------------------------
describe('stopAlarm', () => {
  it('stops the repeating alarm interval', async () => {
    const useAlertController = await importHook();
    const { result } = renderHook(() => useAlertController());

    act(() => {
      result.current.ensureAudioContext();
      result.current.startAlarm(500);
    });

    act(() => {
      result.current.stopAlarm();
    });

    const callsAfterStop = mockAudioCtx.createOscillator.mock.calls.length;

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(mockAudioCtx.createOscillator.mock.calls.length).toBe(callsAfterStop);
  });

  it('sets isAlarmingRef to false', async () => {
    const useAlertController = await importHook();
    const { result } = renderHook(() => useAlertController());

    act(() => {
      result.current.ensureAudioContext();
      result.current.startAlarm(1000);
    });

    expect(result.current.isAlarmingRef.current).toBe(true);

    act(() => {
      result.current.stopAlarm();
    });

    expect(result.current.isAlarmingRef.current).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. Different beep types
// ---------------------------------------------------------------------------
describe('playBeep types', () => {
  it('sets oscillator type to square for default beep', async () => {
    const useAlertController = await importHook();
    const { result } = renderHook(() => useAlertController());

    act(() => {
      result.current.ensureAudioContext();
      result.current.playBeep('square');
    });

    expect(mockAudioCtx._oscillator.type).toBe('square');
  });

  it('sets oscillator type to triangle for warning beep', async () => {
    const useAlertController = await importHook();
    const { result } = renderHook(() => useAlertController());

    act(() => {
      result.current.ensureAudioContext();
      result.current.playBeep('warning');
    });

    expect(mockAudioCtx._oscillator.type).toBe('triangle');
  });

  it('sets oscillator type to sine for sine beep', async () => {
    const useAlertController = await importHook();
    const { result } = renderHook(() => useAlertController());

    act(() => {
      result.current.ensureAudioContext();
      result.current.playBeep('sine');
    });

    expect(mockAudioCtx._oscillator.type).toBe('sine');
  });
});

// ---------------------------------------------------------------------------
// 5. requestWakeLock / releaseWakeLock
// ---------------------------------------------------------------------------
describe('wake lock', () => {
  it('acquires a wake lock sentinel', async () => {
    const useAlertController = await importHook();
    const { result } = renderHook(() => useAlertController());

    await act(async () => {
      await result.current.requestWakeLock();
    });

    expect(mockWakeLock.request).toHaveBeenCalledWith('screen');
  });

  it('releases the wake lock sentinel', async () => {
    const useAlertController = await importHook();
    const { result } = renderHook(() => useAlertController());

    await act(async () => {
      await result.current.requestWakeLock();
    });

    await act(async () => {
      result.current.releaseWakeLock();
      // Allow the .then() in releaseWakeLock to resolve
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(mockWakeLock._sentinel.release).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 6. Battery monitoring
// ---------------------------------------------------------------------------
describe('battery monitoring', () => {
  it('reads initial battery level and charging state', async () => {
    mockBattery.level = 0.65;
    mockBattery.charging = true;

    const useAlertController = await importHook();
    const { result } = renderHook(() => useAlertController());

    // Flush the getBattery() promise
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.lastKnownBatteryLevelRef.current).toBe(0.65);
    expect(result.current.lastKnownChargingStateRef.current).toBe(true);
  });

  it('registers levelchange and chargingchange listeners', async () => {
    const useAlertController = await importHook();
    renderHook(() => useAlertController());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(mockBattery.addEventListener).toHaveBeenCalledWith('levelchange', expect.any(Function));
    expect(mockBattery.addEventListener).toHaveBeenCalledWith(
      'chargingchange',
      expect.any(Function),
    );
  });

  it('fires onLowBattery when level ≤ 15% and not charging while anchored', async () => {
    const onLowBattery = vi.fn();
    mockBattery.level = 0.10;
    mockBattery.charging = false;

    const useAlertController = await importHook();
    renderHook(() =>
      useAlertController({
        onLowBattery,
        isAnchored: () => true,
      }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // Simulate the battery interval check
    const checkFn = mockBattery.addEventListener.mock.calls.find(
      (c: unknown[]) => c[0] === 'levelchange',
    )?.[1] as (() => void) | undefined;

    act(() => {
      checkFn?.();
    });

    expect(onLowBattery).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'LOW_BATTERY' }),
    );
  });
});

// ---------------------------------------------------------------------------
// 7. initPermissions
// ---------------------------------------------------------------------------
describe('initPermissions', () => {
  it('creates audio context and requests wake lock', async () => {
    const useAlertController = await importHook();
    const { result } = renderHook(() => useAlertController());

    await act(async () => {
      result.current.initPermissions();
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(globalThis.AudioContext).toHaveBeenCalled();
    expect(mockWakeLock.request).toHaveBeenCalledWith('screen');
  });

  it('requests notification permission when not yet granted', async () => {
    (globalThis as any).Notification = {
      permission: 'default',
      requestPermission: vi.fn().mockResolvedValue('granted'),
    };

    const useAlertController = await importHook();
    const { result } = renderHook(() => useAlertController());

    await act(async () => {
      result.current.initPermissions();
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(Notification.requestPermission).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 8. Cleanup on unmount
// ---------------------------------------------------------------------------
describe('cleanup on unmount', () => {
  it('stops alarm, releases wake lock, and removes battery listeners', async () => {
    const useAlertController = await importHook();
    const { result, unmount } = renderHook(() => useAlertController());

    await act(async () => {
      result.current.ensureAudioContext();
      result.current.startAlarm(500);
      await result.current.requestWakeLock();
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.isAlarmingRef.current).toBe(true);

    act(() => {
      unmount();
    });

    // Alarm stopped — no more oscillator calls
    const callsAfterUnmount = mockAudioCtx.createOscillator.mock.calls.length;
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(mockAudioCtx.createOscillator.mock.calls.length).toBe(callsAfterUnmount);

    // Wake lock released
    expect(mockWakeLock._sentinel.release).toHaveBeenCalled();

    // Battery listeners removed
    expect(mockBattery.removeEventListener).toHaveBeenCalledWith(
      'levelchange',
      expect.any(Function),
    );
    expect(mockBattery.removeEventListener).toHaveBeenCalledWith(
      'chargingchange',
      expect.any(Function),
    );
  });
});
