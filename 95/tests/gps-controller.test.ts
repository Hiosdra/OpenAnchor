import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GPSController } from '../src/modules/anchor/controllers/gps.controller';

function makeState(overrides = {}) {
  return {
    unit: 'm', isAnchored: false, anchorPos: null, currentPos: null,
    sog: 0, cog: null, accuracy: 0, distance: 25, radius: 50,
    alarmState: 'SAFE', hasGpsFix: true, gpsSignalLost: false,
    ...overrides,
  } as any;
}

function makeMockAlert() {
  return {
    playBeep: vi.fn(), stop: vi.fn(), initPermissions: vi.fn(),
    lastKnownBatteryLevel: 1, lastKnownChargingState: false,
    isAlarming: false,
  } as any;
}

function makeMockSync() {
  return { send: vi.fn() } as any;
}

function makeMockEls() {
  return {
    noSignalOverlay: document.createElement('div'),
    gpsStatusText: document.createElement('span'),
    gpsStatus: document.createElement('span'),
    warningText: document.createElement('span'),
    mainBtn: document.createElement('button') as HTMLButtonElement,
    offsetBtn: document.createElement('button') as HTMLButtonElement,
    alarmStateBar: null, alarmStateText: null, sectorBadge: null,
    activeWatchBanner: null, activeWatchName: null, watchBadge: null,
    simpleMonitorOverlay: document.createElement('div'),
    smDistance: document.createElement('span'),
    smUnitLabel: document.createElement('span'),
    smSog: document.createElement('span'),
    smCog: document.createElement('span'),
    smAccuracy: document.createElement('span'),
    smGpsLost: document.createElement('div'),
    smAlarmLabel: document.createElement('span'),
    smDismissAlarm: document.createElement('button'),
  } as any;
}

function setupDom() {
  ['gps-status-text', 'gps-status', 'no-signal-overlay', 'gps-lost-modal', 'battery-saver-badge'].forEach(id => {
    const el = document.createElement('div');
    el.id = id;
    el.classList.add('hidden');
    document.body.appendChild(el);
  });
}

function cleanDom() {
  ['gps-status-text', 'gps-status', 'no-signal-overlay', 'gps-lost-modal', 'battery-saver-badge'].forEach(id =>
    document.getElementById(id)?.remove()
  );
}

describe('GPSController', () => {
  let ctrl: GPSController;
  let state: ReturnType<typeof makeState>;
  let alertCtrl: ReturnType<typeof makeMockAlert>;
  let syncCtrl: ReturnType<typeof makeMockSync>;
  let onPosition: (position: GeolocationPosition) => void;
  let els: ReturnType<typeof makeMockEls>;

  beforeEach(() => {
    setupDom();
    state = makeState();
    alertCtrl = makeMockAlert();
    syncCtrl = makeMockSync();
    onPosition = vi.fn() as unknown as (position: GeolocationPosition) => void;
    els = makeMockEls();
    ctrl = new GPSController(state, alertCtrl, syncCtrl, els, onPosition);
  });

  afterEach(() => {
    cleanDom();
  });

  describe('checkGpsWatchdog', () => {
    it('does nothing when not anchored', () => {
      state.isAnchored = false;
      ctrl.checkGpsWatchdog();
      expect(alertCtrl.playBeep).not.toHaveBeenCalled();
    });

    it('does nothing when no GPS fix', () => {
      state.isAnchored = true;
      state.hasGpsFix = false;
      ctrl.checkGpsWatchdog();
      expect(alertCtrl.playBeep).not.toHaveBeenCalled();
    });

    it('triggers alarm when GPS signal lost', () => {
      state.isAnchored = true;
      state.hasGpsFix = true;
      ctrl.lastGpsFixTime = Date.now() - 70000; // > 60s

      ctrl.checkGpsWatchdog();

      expect(state.gpsSignalLost).toBe(true);
      expect(ctrl.gpsWatchdogAlerted).toBe(true);
      expect(alertCtrl.playBeep).toHaveBeenCalledWith('warning');
      expect(syncCtrl.send).toHaveBeenCalledWith('TRIGGER_ALARM', expect.objectContaining({ reason: 'GPS_LOST' }));
    });

    it('clears GPS lost state when signal returns', () => {
      state.isAnchored = true;
      state.hasGpsFix = true;
      state.gpsSignalLost = true;
      ctrl.lastGpsFixTime = Date.now() - 5000; // < 60s

      ctrl.checkGpsWatchdog();

      expect(state.gpsSignalLost).toBe(false);
      expect(ctrl.gpsWatchdogAlerted).toBe(false);
    });

    it('does not double-trigger when already lost', () => {
      state.isAnchored = true;
      state.hasGpsFix = true;
      state.gpsSignalLost = true;
      ctrl.lastGpsFixTime = Date.now() - 70000;

      ctrl.checkGpsWatchdog();
      expect(alertCtrl.playBeep).not.toHaveBeenCalled();
    });
  });

  describe('checkBatterySaver', () => {
    it('does nothing when battery is ok', () => {
      alertCtrl.lastKnownBatteryLevel = 0.8;
      alertCtrl.lastKnownChargingState = false;
      ctrl.checkBatterySaver();
      // No crash expected
    });

    it('activates battery saver when battery low and not charging', () => {
      alertCtrl.lastKnownBatteryLevel = 0.2;
      alertCtrl.lastKnownChargingState = false;
      // Mock geolocation
      const mockWatchId = 123;
      const origGeolocation = navigator.geolocation;
      Object.defineProperty(navigator, 'geolocation', {
        value: { watchPosition: vi.fn(() => mockWatchId), clearWatch: vi.fn() },
        configurable: true,
      });

      ctrl.checkBatterySaver();

      const badge = document.getElementById('battery-saver-badge')!;
      expect(badge.classList.contains('hidden')).toBe(false);

      Object.defineProperty(navigator, 'geolocation', { value: origGeolocation, configurable: true });
    });

    it('does not activate battery saver when charging', () => {
      alertCtrl.lastKnownBatteryLevel = 0.2;
      alertCtrl.lastKnownChargingState = true;
      ctrl.checkBatterySaver();
      const badge = document.getElementById('battery-saver-badge')!;
      expect(badge.classList.contains('hidden')).toBe(true);
    });
  });

  describe('updateSimpleMonitor', () => {
    it('does nothing when not active', () => {
      ctrl.updateSimpleMonitor(false);
      // Should not throw or update DOM
      expect(els.smDistance.textContent).toBe('');
    });

    it('updates display when active and anchored', async () => {
      state.isAnchored = true;
      state.distance = 25;
      state.sog = 1.5;
      state.cog = 180;
      state.accuracy = 5;
      state.alarmState = 'SAFE';

      ctrl.updateSimpleMonitor(true);

      // requestAnimationFrame is async in happy-dom
      await new Promise(r => setTimeout(r, 50));

      expect(els.smDistance.textContent).toBe('25');
      expect(els.smSog.textContent).toBe('1.5');
      expect(els.smCog.textContent).toBe('180°');
    });

    it('shows -- for distance when not anchored', async () => {
      state.isAnchored = false;
      ctrl.updateSimpleMonitor(true);
      await new Promise(r => setTimeout(r, 50));
      expect(els.smDistance.textContent).toBe('--');
    });

    it('shows GPS lost indicator when signal lost', async () => {
      state.gpsSignalLost = true;
      ctrl.updateSimpleMonitor(true);
      await new Promise(r => setTimeout(r, 50));
      expect(els.smGpsLost.classList.contains('hidden')).toBe(false);
    });

    it('shows ALARM dismiss button when in alarm state', async () => {
      state.alarmState = 'ALARM';
      ctrl.updateSimpleMonitor(true);
      await new Promise(r => setTimeout(r, 50));
      expect(els.smDismissAlarm.classList.contains('hidden')).toBe(false);
    });
  });

  describe('initGPS', () => {
    it('shows overlay when geolocation not available', () => {
      const origGeolocation = navigator.geolocation;
      // Delete geolocation entirely so 'geolocation' in navigator returns false
      els.noSignalOverlay.classList.add('hidden');
      const desc = Object.getOwnPropertyDescriptor(navigator, 'geolocation');
      Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true, enumerable: false });
      // We need 'geolocation' in navigator to return false
      // In happy-dom, deleting from prototype is tricky. Instead delete and re-add
      delete (navigator as any).geolocation;
      const ctrl2 = new GPSController(state, alertCtrl, syncCtrl, els, onPosition);
      ctrl2.initGPS();
      expect(els.noSignalOverlay.classList.contains('hidden')).toBe(false);
      // Restore
      if (desc) Object.defineProperty(navigator, 'geolocation', desc);
      else Object.defineProperty(navigator, 'geolocation', { value: origGeolocation, configurable: true });
    });
  });

  describe('cleanupGPS', () => {
    it('does not crash when no watch ID', () => {
      expect(() => ctrl.cleanupGPS()).not.toThrow();
    });
  });
});
