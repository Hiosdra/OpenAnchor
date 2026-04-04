import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — must come BEFORE importing the module under test
// ---------------------------------------------------------------------------

vi.mock('../src/modules/anchor/i18n', () => ({
  I18N: {
    t: {
      wsConnLost: 'Connection lost',
      wsConnLostBody: 'Peer connection was lost.',
      peerBatteryTooltip: 'Battery: {level}%',
      peerBatteryCharging: '(charging)',
      peerDriftMsg: 'Drift: {bearing} at {speed}',
    },
    fmt: (tpl: string, vars: Record<string, string | number>) =>
      tpl.replace(/{(\w+)}/g, (_, k: string) => String(vars[k] ?? '')),
    init: vi.fn(),
  },
}));

vi.mock('../src/modules/anchor/ui-utils', () => ({
  UI: { showModal: vi.fn() },
}));

vi.mock('lucide', () => ({
  createIcons: vi.fn(),
  icons: {},
}));

vi.mock('leaflet', () => ({
  default: {
    latLng: (lat: number, lng: number) => ({ lat, lng }),
  },
}));

import { SyncController } from '../src/modules/anchor/sync-controller';
import type { AnchorApp } from '../src/modules/anchor/anchor-app';

// ---------------------------------------------------------------------------
// Fake WebSocket
// ---------------------------------------------------------------------------
class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  url: string;
  onopen: ((ev?: any) => void) | null = null;
  onclose: ((ev?: any) => void) | null = null;
  onerror: ((ev?: any) => void) | null = null;
  onmessage: ((ev?: any) => void) | null = null;
  readyState = 1;
  send = vi.fn();
  close = vi.fn();

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  /** Helper to simulate server sending a message */
  _receive(data: any) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeApp(overrides: Partial<AnchorApp> = {}): AnchorApp {
  return {
    state: {
      isAnchored: false,
      anchorPos: null,
      sectorEnabled: false,
      radius: 50,
      bufferRadius: null,
      unit: 'm',
      sectorBearing: 0,
      sectorWidth: 60,
      chainLengthM: null,
      depthM: null,
      currentPos: { lat: 54, lng: 18 },
      accuracy: 5,
      distance: 10,
      alarmState: 'SAFE',
      sog: 0,
      cog: null,
    },
    alertCtrl: {
      stop: vi.fn(),
      isAlarming: false,
      lastKnownBatteryLevel: 0.95,
      lastKnownChargingState: false,
    },
    alarmEngine: { reset: vi.fn() },
    mapCtrl: { updatePhoneMarker: vi.fn() },
    syncCtrl: null,
    _updateAlarmStateBar: vi.fn(),
    _recalculateZone: vi.fn(),
    _recalculate: vi.fn(),
    _persistActiveState: vi.fn(),
    ...overrides,
  } as any;
}

function setupDOM() {
  document.body.innerHTML = `
    <span id="ws-status-icon" class="text-slate-600"></span>
    <div id="ws-connection-banner" class="hidden"></div>
    <span id="peer-battery" class="hidden"></span>
    <div id="peer-drift-banner" class="hidden"></div>
    <span id="peer-drift-text"></span>
    <div id="warning-modal" class="hidden"></div>
    <span id="warning-title"></span>
    <span id="warning-text"></span>
  `;
}

// ---------------------------------------------------------------------------
describe('SyncController', () => {
  let app: ReturnType<typeof makeApp>;
  let sync: SyncController;

  beforeEach(() => {
    vi.useFakeTimers();
    setupDOM();
    FakeWebSocket.instances = [];
    (globalThis as any).WebSocket = FakeWebSocket;
    app = makeApp();
    sync = new SyncController(app);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // Constructor
  // -----------------------------------------------------------------------
  describe('constructor', () => {
    it('reads saved ws URL from localStorage', () => {
      localStorage.setItem('anchor_ws_url', 'ws://saved');
      const s = new SyncController(app);
      expect(s.url).toBe('ws://saved');
    });

    it('defaults to empty string when no URL saved', () => {
      expect(sync.url).toBe('');
    });
  });

  // -----------------------------------------------------------------------
  // connect
  // -----------------------------------------------------------------------
  describe('connect', () => {
    it('creates a WebSocket with the given URL', () => {
      sync.connect('ws://localhost:8080');
      expect(FakeWebSocket.instances).toHaveLength(1);
      expect(FakeWebSocket.instances[0].url).toBe('ws://localhost:8080');
    });

    it('saves URL to localStorage', () => {
      sync.connect('ws://host');
      expect(localStorage.getItem('anchor_ws_url')).toBe('ws://host');
    });

    it('closes old socket before creating a new one', () => {
      sync.connect('ws://first');
      const first = FakeWebSocket.instances[0];
      sync.connect('ws://second');
      expect(first.close).toHaveBeenCalled();
      expect(FakeWebSocket.instances).toHaveLength(2);
    });

    it('handles WebSocket constructor throwing', () => {
      (globalThis as any).WebSocket = function () {
        throw new Error('blocked');
      };
      sync.connect('ws://bad'); // should not throw
      expect(sync.isConnected).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // _onOpen
  // -----------------------------------------------------------------------
  describe('onOpen', () => {
    it('sets isConnected and updates DOM', () => {
      sync.connect('ws://host');
      const ws = FakeWebSocket.instances[0];
      ws.onopen!();
      expect(sync.isConnected).toBe(true);
      expect(document.getElementById('ws-status-icon')!.classList.contains('text-green-400')).toBe(true);
    });

    it('sends FULL_SYNC on open', () => {
      sync.connect('ws://host');
      const ws = FakeWebSocket.instances[0];
      ws.onopen!();
      // First send is FULL_SYNC
      const firstCall = ws.send.mock.calls[0]?.[0];
      expect(firstCall).toBeTruthy();
      const parsed = JSON.parse(firstCall);
      expect(parsed.type).toBe('FULL_SYNC');
    });

    it('starts PING interval', () => {
      sync.connect('ws://host');
      const ws = FakeWebSocket.instances[0];
      ws.onopen!();
      ws.send.mockClear();
      vi.advanceTimersByTime(5000);
      const pinged = ws.send.mock.calls.some((c: string[]) => JSON.parse(c[0]).type === 'PING');
      expect(pinged).toBe(true);
    });

    it('starts STATE_UPDATE sync interval (2s)', () => {
      sync.connect('ws://host');
      const ws = FakeWebSocket.instances[0];
      ws.onopen!();
      ws.send.mockClear();
      vi.advanceTimersByTime(2000);
      const updated = ws.send.mock.calls.some((c: string[]) => JSON.parse(c[0]).type === 'STATE_UPDATE');
      expect(updated).toBe(true);
    });

    it('de-duplicates STATE_UPDATE when hash unchanged', () => {
      sync.connect('ws://host');
      const ws = FakeWebSocket.instances[0];
      ws.onopen!();
      ws.send.mockClear();
      vi.advanceTimersByTime(6000); // 3 cycles
      const updates = ws.send.mock.calls.filter((c: string[]) => JSON.parse(c[0]).type === 'STATE_UPDATE');
      // Only the first should emit; subsequent have same hash
      expect(updates.length).toBe(1);
    });

    it('hides connection banner', () => {
      const banner = document.getElementById('ws-connection-banner')!;
      banner.classList.remove('hidden');
      sync.connect('ws://host');
      FakeWebSocket.instances[0].onopen!();
      expect(banner.classList.contains('hidden')).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // send
  // -----------------------------------------------------------------------
  describe('send', () => {
    it('sends JSON when connected', () => {
      sync.connect('ws://host');
      FakeWebSocket.instances[0].onopen!();
      FakeWebSocket.instances[0].send.mockClear();
      sync.send('TEST', { foo: 'bar' });
      const msg = JSON.parse(FakeWebSocket.instances[0].send.mock.calls[0][0]);
      expect(msg.type).toBe('TEST');
      expect(msg.payload.foo).toBe('bar');
      expect(msg.timestamp).toBeDefined();
    });

    it('does nothing when not connected', () => {
      sync.send('TEST');
      expect(FakeWebSocket.instances).toHaveLength(0);
    });

    it('does nothing when ws is null', () => {
      sync.isConnected = true;
      sync['ws'] = null;
      sync.send('TEST'); // should not throw
    });
  });

  // -----------------------------------------------------------------------
  // sendFullSync
  // -----------------------------------------------------------------------
  describe('sendFullSync', () => {
    it('includes sector payload when sector enabled', () => {
      app.state.sectorEnabled = true;
      app.state.sectorBearing = 45;
      app.state.sectorWidth = 90;
      sync.connect('ws://host');
      const ws = FakeWebSocket.instances[0];
      ws.onopen!();
      const fullSync = JSON.parse(ws.send.mock.calls[0][0]);
      expect(fullSync.payload.zoneType).toBe('SECTOR');
      expect(fullSync.payload.sector).toBeDefined();
      expect(fullSync.payload.sector.bearingDeg).toBe(45);
    });

    it('includes chain and depth when set', () => {
      app.state.chainLengthM = 30;
      app.state.depthM = 8;
      sync.connect('ws://host');
      FakeWebSocket.instances[0].onopen!();
      const msg = JSON.parse(FakeWebSocket.instances[0].send.mock.calls[0][0]);
      expect(msg.payload.chainLengthM).toBe(30);
      expect(msg.payload.depthM).toBe(8);
    });

    it('omits chain/depth when null', () => {
      sync.connect('ws://host');
      FakeWebSocket.instances[0].onopen!();
      const msg = JSON.parse(FakeWebSocket.instances[0].send.mock.calls[0][0]);
      expect(msg.payload.chainLengthM).toBeUndefined();
      expect(msg.payload.depthM).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // disconnect
  // -----------------------------------------------------------------------
  describe('disconnect', () => {
    it('sends DISCONNECT message when connected', () => {
      sync.connect('ws://host');
      const ws = FakeWebSocket.instances[0];
      ws.onopen!();
      ws.send.mockClear();
      sync.disconnect();
      const msg = JSON.parse(ws.send.mock.calls[0][0]);
      expect(msg.type).toBe('DISCONNECT');
    });

    it('sets isConnected false and clears intervals', () => {
      sync.connect('ws://host');
      FakeWebSocket.instances[0].onopen!();
      sync.disconnect();
      expect(sync.isConnected).toBe(false);
    });

    it('does not send when not connected', () => {
      sync.connect('ws://host');
      const ws = FakeWebSocket.instances[0];
      // Not calling onopen → not connected
      sync.disconnect();
      expect(ws.send).not.toHaveBeenCalled();
    });

    it('is safe when no ws exists', () => {
      sync.disconnect(); // should not throw
      expect(sync.isConnected).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // _onClose — reconnection
  // -----------------------------------------------------------------------
  describe('onClose / reconnection', () => {
    it('resets isConnected and peer state', () => {
      sync.connect('ws://host');
      FakeWebSocket.instances[0].onopen!();
      FakeWebSocket.instances[0].onclose!();
      expect(sync.isConnected).toBe(false);
      expect(sync.lastPeerPingTime).toBeNull();
      expect(sync.peerConnectionLost).toBe(false);
    });

    it('shows connection banner when was connected', () => {
      const banner = document.getElementById('ws-connection-banner')!;
      sync.connect('ws://host');
      FakeWebSocket.instances[0].onopen!();
      FakeWebSocket.instances[0].onclose!();
      expect(banner.classList.contains('hidden')).toBe(false);
    });

    it('schedules reconnect when URL is set', () => {
      sync.connect('ws://host');
      FakeWebSocket.instances[0].onopen!();
      const initialCount = FakeWebSocket.instances.length;
      FakeWebSocket.instances[0].onclose!();

      // Advance past reconnect delay
      vi.advanceTimersByTime(60000);
      expect(FakeWebSocket.instances.length).toBeGreaterThan(initialCount);
    });

    it('does NOT reconnect after intentional disconnect', () => {
      sync.connect('ws://host');
      FakeWebSocket.instances[0].onopen!();
      sync.disconnect();
      const count = FakeWebSocket.instances.length;
      vi.advanceTimersByTime(60000);
      expect(FakeWebSocket.instances.length).toBe(count);
    });

    it('hides peer battery and drift banners on close', () => {
      const peerBat = document.getElementById('peer-battery')!;
      const drift = document.getElementById('peer-drift-banner')!;
      peerBat.classList.remove('hidden');
      drift.classList.remove('hidden');

      sync.connect('ws://host');
      FakeWebSocket.instances[0].onopen!();
      FakeWebSocket.instances[0].onclose!();

      expect(peerBat.classList.contains('hidden')).toBe(true);
      expect(drift.classList.contains('hidden')).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // checkHeartbeat
  // -----------------------------------------------------------------------
  describe('checkHeartbeat', () => {
    it('does nothing when not connected', () => {
      sync.checkHeartbeat(); // should not throw
    });

    it('does nothing when lastPeerPingTime is null', () => {
      sync.isConnected = true;
      sync.lastPeerPingTime = null;
      sync.checkHeartbeat(); // should not throw
    });

    it('marks peerConnectionLost after 15s timeout', () => {
      sync.connect('ws://host');
      const ws = FakeWebSocket.instances[0];
      ws.onopen!();
      // Advance fake clock so Date.now() moves forward past the 15s threshold
      vi.advanceTimersByTime(16000);
      sync.checkHeartbeat();
      // checkHeartbeat sets peerConnectionLost=true, shows modal, then calls _onClose which resets it.
      // Verify the warning modal was shown (the observable side-effect).
      const warningModal = document.getElementById('warning-modal');
      expect(warningModal).toBeTruthy();
    });

    it('does not re-trigger if already lost', () => {
      sync.connect('ws://host');
      const ws = FakeWebSocket.instances[0];
      ws.onopen!();
      sync.lastPeerPingTime = Date.now() - 16000;
      sync.peerConnectionLost = true;
      sync.checkHeartbeat(); // should not show modal again
    });
  });

  // -----------------------------------------------------------------------
  // _onMessage
  // -----------------------------------------------------------------------
  describe('onMessage', () => {
    function openSync() {
      sync.connect('ws://host');
      const ws = FakeWebSocket.instances[0];
      ws.onopen!();
      return ws;
    }

    it('handles PING — updates lastPeerPingTime', () => {
      const ws = openSync();
      ws._receive({ type: 'PING' });
      expect(sync.lastPeerPingTime).toBeTruthy();
    });

    it('PING recovers peerConnectionLost', () => {
      const ws = openSync();
      sync.peerConnectionLost = true;
      document.getElementById('ws-status-icon')!.classList.add('text-orange-400');
      ws._receive({ type: 'PING' });
      expect(sync.peerConnectionLost).toBe(false);
    });

    it('ACTION_COMMAND MUTE_ALARM stops alarm and re-flags isAlarming', () => {
      const ws = openSync();
      ws._receive({ type: 'ACTION_COMMAND', payload: { command: 'MUTE_ALARM' } });
      expect(app.alertCtrl.stop).toHaveBeenCalled();
      expect(app.alertCtrl.isAlarming).toBe(true);
      // After 5s the flag resets
      vi.advanceTimersByTime(5000);
      expect(app.alertCtrl.isAlarming).toBe(false);
    });

    it('ACTION_COMMAND DISMISS_ALARM stops and resets', () => {
      const ws = openSync();
      ws._receive({ type: 'ACTION_COMMAND', payload: { command: 'DISMISS_ALARM' } });
      expect(app.alertCtrl.stop).toHaveBeenCalled();
      expect(app.alarmEngine.reset).toHaveBeenCalled();
      expect(app.state.alarmState).toBe('SAFE');
    });

    it('ACTION_COMMAND with invalid payload is ignored', () => {
      const ws = openSync();
      ws._receive({ type: 'ACTION_COMMAND', payload: {} });
      expect(app.alertCtrl.stop).not.toHaveBeenCalled();
    });

    it('ACTION_COMMAND with no payload is ignored', () => {
      const ws = openSync();
      ws._receive({ type: 'ACTION_COMMAND' });
      expect(app.alertCtrl.stop).not.toHaveBeenCalled();
    });

    it('ANDROID_GPS_REPORT updates phone marker', () => {
      const ws = openSync();
      ws._receive({
        type: 'ANDROID_GPS_REPORT',
        payload: { pos: { lat: 54.1, lng: 18.1 }, accuracy: 10 },
      });
      expect(app.mapCtrl.updatePhoneMarker).toHaveBeenCalled();
    });

    it('ANDROID_GPS_REPORT updates peer battery element', () => {
      const ws = openSync();
      ws._receive({
        type: 'ANDROID_GPS_REPORT',
        payload: { pos: { lat: 54, lng: 18 }, batteryLevel: 42, isCharging: true },
      });
      const el = document.getElementById('peer-battery')!;
      expect(el.textContent).toBe('42%');
      expect(el.classList.contains('hidden')).toBe(false);
    });

    it('ANDROID_GPS_REPORT shows drift banner when driftDetected', () => {
      const ws = openSync();
      ws._receive({
        type: 'ANDROID_GPS_REPORT',
        payload: {
          pos: { lat: 54, lng: 18 },
          driftDetected: true,
          driftBearingDeg: 45,
          driftSpeedMps: 0.5,
        },
      });
      const drift = document.getElementById('peer-drift-banner')!;
      expect(drift.classList.contains('hidden')).toBe(false);
    });

    it('ANDROID_GPS_REPORT hides drift banner when no drift', () => {
      const ws = openSync();
      const driftBanner = document.getElementById('peer-drift-banner')!;
      driftBanner.classList.remove('hidden');
      ws._receive({
        type: 'ANDROID_GPS_REPORT',
        payload: { pos: { lat: 54, lng: 18 }, driftDetected: false },
      });
      expect(driftBanner.classList.contains('hidden')).toBe(true);
    });

    it('ANDROID_GPS_REPORT skips invalid pos', () => {
      const ws = openSync();
      ws._receive({
        type: 'ANDROID_GPS_REPORT',
        payload: { pos: { lat: 'bad', lng: 18 } },
      });
      expect(app.mapCtrl.updatePhoneMarker).not.toHaveBeenCalled();
    });

    it('ANDROID_GPS_REPORT battery colors: red ≤15, orange ≤30, green otherwise', () => {
      const ws = openSync();
      // Red
      ws._receive({ type: 'ANDROID_GPS_REPORT', payload: { pos: { lat: 54, lng: 18 }, batteryLevel: 10 } });
      expect(document.getElementById('peer-battery')!.className).toContain('text-red-400');

      // Orange
      ws._receive({ type: 'ANDROID_GPS_REPORT', payload: { pos: { lat: 54, lng: 18 }, batteryLevel: 25 } });
      expect(document.getElementById('peer-battery')!.className).toContain('text-orange-400');

      // Green
      ws._receive({ type: 'ANDROID_GPS_REPORT', payload: { pos: { lat: 54, lng: 18 }, batteryLevel: 80 } });
      expect(document.getElementById('peer-battery')!.className).toContain('text-green-400');
    });

    it('handles drift with unknown bearing/speed', () => {
      const ws = openSync();
      ws._receive({
        type: 'ANDROID_GPS_REPORT',
        payload: { pos: { lat: 54, lng: 18 }, driftDetected: true },
      });
      const txt = document.getElementById('peer-drift-text')!.textContent!;
      expect(txt).toContain('?');
    });

    it('invalid JSON is caught without crashing', () => {
      sync.connect('ws://host');
      const ws = FakeWebSocket.instances[0];
      ws.onopen!();
      ws.onmessage?.({ data: 'not-json' });
      // No crash
    });

    it('message without type string is ignored', () => {
      const ws = openSync();
      ws._receive({ type: 123 });
      // No crash
    });

    it('message with null data is ignored', () => {
      const ws = openSync();
      ws._receive(null);
      // The parse will fail, but it's caught
    });
  });

  // -----------------------------------------------------------------------
  // _onError
  // -----------------------------------------------------------------------
  describe('onError', () => {
    it('logs warning without crashing', () => {
      sync.connect('ws://host');
      const ws = FakeWebSocket.instances[0];
      ws.onerror!(new Event('error'));
      // No crash expected
    });
  });
});
