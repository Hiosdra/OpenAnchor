import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — must come BEFORE importing the module under test
// ---------------------------------------------------------------------------

vi.mock('../src/modules/anchor/i18n', () => ({
  I18N: {
    t: {
      notifTitle: 'Anchor Watch',
      notifWarning: 'Warning: {reason} {dist}',
    },
    fmt: (tpl: string, vars: Record<string, string | number>) =>
      tpl.replace(/{(\w+)}/g, (_, k: string) => String(vars[k] ?? '')),
    init: vi.fn(),
  },
}));

vi.mock('../src/modules/anchor/ui-utils', () => ({
  UI: { showModal: vi.fn() },
}));

import { AlertController } from '../src/modules/anchor/alert-controller';
import { UI } from '../src/modules/anchor/ui-utils';

// ---------------------------------------------------------------------------
// Helpers for Web Audio API mock
// ---------------------------------------------------------------------------
function createMockAudioContext() {
  const osc = {
    type: '',
    frequency: { setValueAtTime: vi.fn() },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };
  const gain = {
    gain: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
  };
  const ctx = {
    state: 'running',
    currentTime: 0,
    destination: {},
    resume: vi.fn(),
    createOscillator: vi.fn(() => osc),
    createGain: vi.fn(() => gain),
  };
  return { ctx, osc, gain };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
describe('AlertController', () => {
  let ctrl: AlertController;

  beforeEach(() => {
    vi.useFakeTimers();

    // Minimal DOM expected by start / stop / startForState
    document.body.innerHTML = `
      <div id="app-body"></div>
      <button id="stop-alarm-btn" class="hidden"></button>
      <div id="battery-modal" class="hidden"></div>
    `;

    // Mock navigator extensions used by the class
    Object.defineProperty(navigator, 'vibrate', { value: vi.fn(() => true), configurable: true });
    Object.defineProperty(navigator, 'wakeLock', {
      value: { request: vi.fn(() => Promise.resolve({ release: vi.fn(() => Promise.resolve()) })) },
      configurable: true,
    });

    // Ensure getBattery is NOT present by default (tested explicitly)
    Object.defineProperty(navigator, 'getBattery', { value: undefined, configurable: true, writable: true });
    delete (navigator as any).getBattery;

    // Stub Notification API
    (globalThis as any).Notification = { permission: 'default', requestPermission: vi.fn() };

    // Stub AudioContext with a real class so `new AudioContext()` works
    class MockAudioContext {
      state = 'running';
      currentTime = 0;
      destination = {};
      resume = vi.fn();
      createOscillator = vi.fn(() => ({
        type: '' as string,
        frequency: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      }));
      createGain = vi.fn(() => ({
        gain: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      }));
    }
    (globalThis as any).AudioContext = MockAudioContext;
    (window as any).AudioContext = MockAudioContext;

    ctrl = new AlertController();
  });

  afterEach(() => {
    ctrl.cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // initPermissions
  // -----------------------------------------------------------------------
  describe('initPermissions', () => {
    it('creates AudioContext and resumes if suspended', () => {
      ctrl.audioCtx = null;
      ctrl.initPermissions();
      expect(ctrl.audioCtx).toBeTruthy();
    });

    it('resumes suspended AudioContext', () => {
      const { ctx } = createMockAudioContext();
      ctx.state = 'suspended';
      ctrl.audioCtx = ctx as any;
      ctrl.initPermissions();
      expect(ctx.resume).toHaveBeenCalled();
    });

    it('does not resume running AudioContext', () => {
      const { ctx } = createMockAudioContext();
      ctx.state = 'running';
      ctrl.audioCtx = ctx as any;
      ctrl.initPermissions();
      expect(ctx.resume).not.toHaveBeenCalled();
    });

    it('requests Notification permission when permission is default', () => {
      (globalThis as any).Notification = { permission: 'default', requestPermission: vi.fn() };
      ctrl.initPermissions();
      expect(Notification.requestPermission).toHaveBeenCalled();
    });

    it('does not request Notification permission when already granted', () => {
      (globalThis as any).Notification = { permission: 'granted', requestPermission: vi.fn() };
      ctrl.initPermissions();
      expect(Notification.requestPermission).not.toHaveBeenCalled();
    });

    it('does not request Notification permission when denied', () => {
      (globalThis as any).Notification = { permission: 'denied', requestPermission: vi.fn() };
      ctrl.initPermissions();
      expect(Notification.requestPermission).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // requestWakeLock / releaseWakeLock
  // -----------------------------------------------------------------------
  describe('wakeLock', () => {
    it('acquires wake lock when API is available', async () => {
      await ctrl.requestWakeLock();
      expect(navigator.wakeLock.request).toHaveBeenCalledWith('screen');
      expect(ctrl['wakeLock']).toBeTruthy();
    });

    it('survives when wakeLock API is absent', async () => {
      Object.defineProperty(navigator, 'wakeLock', { value: undefined, configurable: true });
      await ctrl.requestWakeLock(); // should not throw
    });

    it('survives when wakeLock.request rejects', async () => {
      Object.defineProperty(navigator, 'wakeLock', {
        value: { request: vi.fn(() => Promise.reject(new Error('nope'))) },
        configurable: true,
      });
      await ctrl.requestWakeLock(); // should not throw
    });

    it('releaseWakeLock releases and nulls the sentinel', async () => {
      const releaseFn = vi.fn(() => Promise.resolve());
      ctrl['wakeLock'] = { release: releaseFn } as any;
      ctrl.releaseWakeLock();
      // Release is async, run microtasks
      await vi.advanceTimersByTimeAsync(1);
      expect(releaseFn).toHaveBeenCalled();
      expect(ctrl['wakeLock']).toBeNull();
    });

    it('releaseWakeLock is safe when no lock held', () => {
      ctrl['wakeLock'] = null;
      ctrl.releaseWakeLock(); // should not throw
    });
  });

  // -----------------------------------------------------------------------
  // playBeep
  // -----------------------------------------------------------------------
  describe('playBeep', () => {
    it('does nothing when audioCtx is null', () => {
      ctrl.audioCtx = null;
      ctrl.playBeep('square'); // should not throw
    });

    it.each(['square', 'warning', 'sine'] as const)('plays %s beep type', (type) => {
      const { ctx, osc, gain } = createMockAudioContext();
      ctrl.audioCtx = ctx as any;
      ctrl.playBeep(type);
      expect(osc.connect).toHaveBeenCalledWith(gain);
      expect(gain.connect).toHaveBeenCalledWith(ctx.destination);
      expect(osc.start).toHaveBeenCalled();
    });

    it('square type sets square oscillator', () => {
      const { ctx, osc } = createMockAudioContext();
      ctrl.audioCtx = ctx as any;
      ctrl.playBeep('square');
      expect(osc.type).toBe('square');
    });

    it('warning type sets triangle oscillator', () => {
      const { ctx, osc } = createMockAudioContext();
      ctrl.audioCtx = ctx as any;
      ctrl.playBeep('warning');
      expect(osc.type).toBe('triangle');
    });

    it('sine type sets sine oscillator', () => {
      const { ctx, osc } = createMockAudioContext();
      ctrl.audioCtx = ctx as any;
      ctrl.playBeep('sine');
      expect(osc.type).toBe('sine');
    });

    it('sine uses linearRampToValueAtTime', () => {
      const { ctx, gain } = createMockAudioContext();
      ctrl.audioCtx = ctx as any;
      ctrl.playBeep('sine');
      expect(gain.gain.linearRampToValueAtTime).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // triggerNotification
  // -----------------------------------------------------------------------
  describe('triggerNotification', () => {
    it('does nothing when Notification API is absent', () => {
      delete (globalThis as any).Notification;
      ctrl.triggerNotification('test'); // should not throw
    });

    it('does nothing when permission is not granted', () => {
      (globalThis as any).Notification = { permission: 'default' };
      ctrl.triggerNotification('test'); // should not throw
    });

    it('calls showNotification via service worker when granted', async () => {
      const showNotification = vi.fn(() => Promise.resolve());
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { ready: Promise.resolve({ showNotification }) },
        configurable: true,
      });
      (globalThis as any).Notification = vi.fn();
      (globalThis as any).Notification.permission = 'granted';

      ctrl.triggerNotification('hello');
      await vi.advanceTimersByTimeAsync(1);
      expect(showNotification).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // start
  // -----------------------------------------------------------------------
  describe('start', () => {
    it('sets isAlarming true and adds DOM classes', () => {
      ctrl.audioCtx = createMockAudioContext().ctx as any;
      ctrl.start('dragged', '100m');
      expect(ctrl.isAlarming).toBe(true);
      expect(document.getElementById('app-body')!.classList.contains('bg-alarm-active')).toBe(true);
      expect(document.getElementById('stop-alarm-btn')!.classList.contains('hidden')).toBe(false);
    });

    it('vibrates when navigator.vibrate is available', () => {
      ctrl.audioCtx = createMockAudioContext().ctx as any;
      ctrl.start('dragged', '100m');
      expect(navigator.vibrate).toHaveBeenCalled();
    });

    it('returns early if already alarming (no duplicate intervals)', () => {
      ctrl.audioCtx = createMockAudioContext().ctx as any;
      ctrl.start('dragged', '100m');
      const firstInterval = ctrl['alarmInterval'];
      ctrl.start('dragged', '200m'); // should be no-op
      expect(ctrl['alarmInterval']).toBe(firstInterval);
    });

    it('repeats beep and vibration every second', () => {
      const { ctx } = createMockAudioContext();
      ctrl.audioCtx = ctx as any;
      ctrl.start('dragged', '100m');

      const vibrateCalls = (navigator.vibrate as any).mock.calls.length;
      vi.advanceTimersByTime(3000);
      expect((navigator.vibrate as any).mock.calls.length).toBeGreaterThan(vibrateCalls);
    });
  });

  // -----------------------------------------------------------------------
  // stop
  // -----------------------------------------------------------------------
  describe('stop', () => {
    it('clears isAlarming and removes DOM classes', () => {
      ctrl.audioCtx = createMockAudioContext().ctx as any;
      ctrl.start('dragged', '100m');
      ctrl.stop();
      expect(ctrl.isAlarming).toBe(false);
      expect(document.getElementById('app-body')!.classList.contains('bg-alarm-active')).toBe(false);
      expect(document.getElementById('stop-alarm-btn')!.classList.contains('hidden')).toBe(true);
    });

    it('clears the alarm interval', () => {
      ctrl.audioCtx = createMockAudioContext().ctx as any;
      ctrl.start('dragged', '100m');
      expect(ctrl['alarmInterval']).not.toBeNull();
      ctrl.stop();
      // Verify interval was cleared by checking no more vibrate calls
      const count = (navigator.vibrate as any).mock.calls.length;
      vi.advanceTimersByTime(5000);
      expect((navigator.vibrate as any).mock.calls.length).toBe(count);
    });

    it('is safe when no alarm interval exists', () => {
      ctrl['alarmInterval'] = null;
      ctrl.stop(); // should not throw
    });
  });

  // -----------------------------------------------------------------------
  // startForState
  // -----------------------------------------------------------------------
  describe('startForState', () => {
    beforeEach(() => {
      ctrl.audioCtx = createMockAudioContext().ctx as any;
    });

    it('ALARM state delegates to start()', () => {
      ctrl.startForState('ALARM', 'dragged', '100m');
      expect(ctrl.isAlarming).toBe(true);
      expect(document.getElementById('app-body')!.classList.contains('bg-alarm-active')).toBe(true);
    });

    it('WARNING state: vibrates, plays warning beep, shows stop button', () => {
      ctrl.startForState('WARNING', 'drifting', '80m');
      expect(ctrl.isAlarming).toBe(true);
      expect(navigator.vibrate).toHaveBeenCalledWith([200, 100, 200]);
      expect(document.getElementById('stop-alarm-btn')!.classList.contains('hidden')).toBe(false);
    });

    it('WARNING state is skipped if already alarming', () => {
      ctrl.isAlarming = true;
      const vibrateBefore = (navigator.vibrate as any).mock.calls.length;
      ctrl.startForState('WARNING', 'drifting', '80m');
      expect((navigator.vibrate as any).mock.calls.length).toBe(vibrateBefore);
    });

    it('unknown state does nothing', () => {
      ctrl.startForState('SAFE', 'ok', '10m');
      expect(ctrl.isAlarming).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Battery monitor
  // -----------------------------------------------------------------------
  describe('battery monitor', () => {
    it('initializes when getBattery is available', async () => {
      const batteryListeners: Record<string, (() => void)[]> = {};
      const battery = {
        level: 0.5,
        charging: false,
        addEventListener: vi.fn((type: string, fn: () => void) => {
          (batteryListeners[type] ??= []).push(fn);
        }),
        removeEventListener: vi.fn(),
      };
      Object.defineProperty(navigator, 'getBattery', {
        value: vi.fn(() => Promise.resolve(battery)),
        configurable: true,
      });

      const c = new AlertController();
      await vi.advanceTimersByTimeAsync(1);

      expect(c.lastKnownBatteryLevel).toBe(0.5);
      expect(c.lastKnownChargingState).toBe(false);
      expect(battery.addEventListener).toHaveBeenCalledTimes(2);
    });

    it('triggers warning when battery ≤15%, not charging, and anchored', async () => {
      const batteryListeners: Record<string, (() => void)[]> = {};
      const battery = {
        level: 0.5,
        charging: false,
        addEventListener: vi.fn((type: string, fn: () => void) => {
          (batteryListeners[type] ??= []).push(fn);
        }),
        removeEventListener: vi.fn(),
      };
      Object.defineProperty(navigator, 'getBattery', {
        value: vi.fn(() => Promise.resolve(battery)),
        configurable: true,
      });

      const c = new AlertController();
      c.audioCtx = createMockAudioContext().ctx as any;
      await vi.advanceTimersByTimeAsync(1);

      const warnCb = vi.fn();
      c.configureBatteryCallbacks(() => true, warnCb);

      // Simulate battery drop
      battery.level = 0.10;
      batteryListeners['levelchange']?.forEach((fn) => fn());

      expect(c.batteryWarningShown).toBe(true);
      expect(UI.showModal).toHaveBeenCalledWith('battery-modal');
      expect(warnCb).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'LOW_BATTERY', alarmState: 'WARNING' }),
      );
    });

    it('does NOT warn when not anchored', async () => {
      const battery = {
        level: 0.10,
        charging: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
      Object.defineProperty(navigator, 'getBattery', {
        value: vi.fn(() => Promise.resolve(battery)),
        configurable: true,
      });

      const c = new AlertController();
      c.audioCtx = createMockAudioContext().ctx as any;
      await vi.advanceTimersByTimeAsync(1);

      const warnCb = vi.fn();
      c.configureBatteryCallbacks(() => false, warnCb);

      // Simulate periodic check
      vi.advanceTimersByTime(60000);
      expect(warnCb).not.toHaveBeenCalled();
    });

    it('resets batteryWarningShown when charging resumes', async () => {
      const batteryListeners: Record<string, (() => void)[]> = {};
      const battery = {
        level: 0.10,
        charging: false,
        addEventListener: vi.fn((type: string, fn: () => void) => {
          (batteryListeners[type] ??= []).push(fn);
        }),
        removeEventListener: vi.fn(),
      };
      Object.defineProperty(navigator, 'getBattery', {
        value: vi.fn(() => Promise.resolve(battery)),
        configurable: true,
      });

      const c = new AlertController();
      c.audioCtx = createMockAudioContext().ctx as any;
      await vi.advanceTimersByTimeAsync(1);
      c.configureBatteryCallbacks(() => true, vi.fn());

      // Trigger low battery warning
      batteryListeners['levelchange']?.forEach((fn) => fn());
      expect(c.batteryWarningShown).toBe(true);

      // Start charging
      battery.charging = true;
      batteryListeners['chargingchange']?.forEach((fn) => fn());
      expect(c.batteryWarningShown).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // cleanup
  // -----------------------------------------------------------------------
  describe('cleanup', () => {
    it('clears intervals and releases wake lock', async () => {
      const releaseFn = vi.fn(() => Promise.resolve());
      ctrl['wakeLock'] = { release: releaseFn } as any;
      ctrl.audioCtx = createMockAudioContext().ctx as any;
      ctrl.start('dragged', '100m');

      ctrl.cleanup();
      await vi.advanceTimersByTimeAsync(1);
      expect(releaseFn).toHaveBeenCalled();
    });

    it('removes battery event listeners', async () => {
      const removeFn = vi.fn();
      const battery = {
        level: 0.5,
        charging: false,
        addEventListener: vi.fn(),
        removeEventListener: removeFn,
      };
      Object.defineProperty(navigator, 'getBattery', {
        value: vi.fn(() => Promise.resolve(battery)),
        configurable: true,
      });

      const c = new AlertController();
      await vi.advanceTimersByTimeAsync(1);
      c.cleanup();

      expect(removeFn).toHaveBeenCalledTimes(2);
    });
  });

  // -----------------------------------------------------------------------
  // configureBatteryCallbacks
  // -----------------------------------------------------------------------
  describe('configureBatteryCallbacks', () => {
    it('stores callback references', () => {
      const isAnchored = () => true;
      const onWarning = vi.fn();
      ctrl.configureBatteryCallbacks(isAnchored, onWarning);
      expect(ctrl['_isAnchored']).toBe(isAnchored);
      expect(ctrl['_onBatteryWarning']).toBe(onWarning);
    });
  });
});
