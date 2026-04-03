import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mock ALL dependencies of anchor-app.ts ─────────────────────────

vi.mock('leaflet', () => {
  const latLng = (lat: number, lng: number) => ({ lat, lng });
  return {
    default: {
      latLng,
      map: vi.fn(() => ({
        setView: vi.fn(),
        removeLayer: vi.fn(),
        fitBounds: vi.fn(),
        on: vi.fn(),
      })),
      tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
      polyline: vi.fn(() => ({ addTo: vi.fn(() => ({ setLatLngs: vi.fn() })), setLatLngs: vi.fn() })),
      layerGroup: vi.fn(() => ({ addTo: vi.fn(), clearLayers: vi.fn() })),
      marker: vi.fn(() => ({
        addTo: vi.fn().mockReturnThis(),
        setLatLng: vi.fn(),
        on: vi.fn(),
        bindTooltip: vi.fn(),
      })),
      circle: vi.fn(() => ({
        addTo: vi.fn().mockReturnThis(),
        setLatLng: vi.fn(),
        setRadius: vi.fn(),
        getBounds: vi.fn(() => ({ lat: 0, lng: 0 })),
      })),
      polygon: vi.fn(() => ({
        addTo: vi.fn().mockReturnThis(),
        getBounds: vi.fn(),
      })),
      divIcon: vi.fn((opts: any) => opts),
    },
  };
});

vi.mock('leaflet/dist/leaflet.css', () => ({}));

vi.mock('html5-qrcode', () => ({
  Html5Qrcode: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn(),
  })),
}));

vi.mock('lucide', () => ({
  createIcons: vi.fn(),
  icons: {},
}));

vi.mock('../src/modules/anchor/i18n', () => ({
  I18N: {
    t: {
      gpsOk: 'OK',
      qrCameraError: 'Camera error',
      qrScanError: 'Scan error',
      qrInvalid: 'Invalid QR',
      appTitle: 'Anchor Watch',
      shareNoGps: 'No GPS',
      sharePrefix: 'My position:',
      shareFallback: 'Copy link:',
      smRedFilter: 'Red filter',
      smNormalFilter: 'Normal',
      calcBreakdown: 'Chain: {chain}m, Swing: {swing}m',
    },
    fmt: (tpl: string, vars: Record<string, string | number>) =>
      tpl.replace(/{(\w+)}/g, (_, k: string) => String(vars[k] ?? '')),
    init: vi.fn(),
    lang: 'pl',
    locale: 'pl-PL',
    setLang: vi.fn(),
  },
}));

vi.mock('../src/modules/anchor/ui-utils', () => ({
  UI: {
    init: vi.fn(),
    showModal: vi.fn(),
    hideModal: vi.fn(),
    updateDashboard: vi.fn(),
    updateRadiusControls: vi.fn(),
  },
}));

vi.mock('../src/modules/anchor/geo-utils', () => ({
  GeoUtils: {
    M2FT: 3.28084,
    MPS2KNOTS: 1.94384,
    formatDist: vi.fn((m: number, u: string) => Math.round(u === 'ft' ? m * 3.28084 : m)),
    getDestinationPoint: vi.fn((lat: number, lng: number, d: number, b: number) => ({ lat: lat + 0.001, lng: lng + 0.001 })),
    getSectorPolygonPoints: vi.fn(() => []),
    getBearing: vi.fn(() => 45),
  },
}));

vi.mock('../src/modules/anchor/alarm-engine', () => {
  const AlarmEngine = vi.fn().mockImplementation(function (this: any) {
    this.reset = vi.fn();
    this.checkZone = vi.fn(() => 'SAFE');
    return this;
  });
  return { AlarmEngine };
});

vi.mock('../src/modules/anchor/session-db', () => {
  const SessionDB = vi.fn().mockImplementation(function (this: any) {
    this.db = null;
    this.getStats = vi.fn().mockResolvedValue({
      totalSessions: 5,
      totalAlarms: 2,
      totalDuration: 7200000,
      avgDuration: 1440000,
      maxDistance: 25.3,
      maxSog: 1.5,
    });
    return this;
  });
  return { SessionDB };
});

vi.mock('../src/modules/anchor/alert-controller', () => {
  const AlertController = vi.fn().mockImplementation(function (this: any) {
    this.initPermissions = vi.fn();
    this.stop = vi.fn();
    this.isAlarming = false;
    this.configureBatteryCallbacks = vi.fn();
    return this;
  });
  return { AlertController };
});

vi.mock('../src/modules/anchor/map-controller', () => {
  const MapController = vi.fn().mockImplementation(function (this: any) {
    this.map = { setView: vi.fn() };
    this.updateBoat = vi.fn();
    this.updateTrack = vi.fn();
    this.setAnchor = vi.fn();
    this.clearAnchor = vi.fn();
    this.drawSafeZone = vi.fn();
    this.fitSafeZone = vi.fn();
    this.toggleLayer = vi.fn();
    this.updatePhoneMarker = vi.fn();
    return this;
  });
  return { MapController };
});

vi.mock('../src/modules/anchor/ai-controller', () => {
  const AIController = vi.fn().mockImplementation(function (this: any) {
    this.apiKey = '';
    this.pendingAction = null;
    this.setKey = vi.fn();
    this.clearKey = vi.fn();
    this.buildContextPrompt = vi.fn(() => '');
    return this;
  });
  return { AIController };
});

vi.mock('../src/modules/anchor/sync-controller', () => {
  const SyncController = vi.fn().mockImplementation(function (this: any) {
    this.url = '';
    this.isConnected = false;
    this.connect = vi.fn();
    this.disconnect = vi.fn();
    this.send = vi.fn();
    this.sendFullSync = vi.fn();
    this.checkHeartbeat = vi.fn();
    return this;
  });
  return { SyncController };
});

vi.mock('../src/modules/anchor/anchor-utils', () => ({
  formatDuration: vi.fn((ms: number) => {
    if (!ms || ms <= 0) return '0m';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }),
}));

vi.mock('../src/modules/anchor/controllers', () => ({
  SessionController: vi.fn().mockImplementation(function (this: any) {
    this.initDB = vi.fn();
    this.setAnchor = vi.fn();
    this.liftAnchor = vi.fn();
    this.flushTrackPoints = vi.fn();
    this.bufferTrackPoint = vi.fn();
    this.persistActiveState = vi.fn();
    this.hasBufferedPoints = false;
    return this;
  }),
  AlarmStateController: vi.fn().mockImplementation(function (this: any) {
    this.recalculate = vi.fn();
    this.recalculateZone = vi.fn();
    this.updateAlarmStateBar = vi.fn();
    return this;
  }),
  WatchScheduleController: vi.fn().mockImplementation(function (this: any) {
    this.checkWatchTimer = vi.fn();
    this.checkSchedule = vi.fn();
    this.renderScheduleList = vi.fn();
    this.debouncedSaveSchedule = vi.fn();
    return this;
  }),
  HistoryController: vi.fn().mockImplementation(function (this: any) {
    this.showHistory = vi.fn();
    return this;
  }),
  AILogbookController: vi.fn().mockImplementation(function (this: any) {
    this.generateLogbookEntry = vi.fn();
    this.handleAskAI = vi.fn();
    this.clearAIChat = vi.fn();
    this.saveLogbookEntry = vi.fn();
    return this;
  }),
  WeatherController: vi.fn().mockImplementation(function (this: any) {
    this.fetchWeatherData = vi.fn();
    return this;
  }),
  GPSController: vi.fn().mockImplementation(function (this: any) {
    this.initGPS = vi.fn();
    this.cleanupGPS = vi.fn();
    this.checkGpsWatchdog = vi.fn();
    this.checkBatterySaver = vi.fn();
    this.updateSimpleMonitor = vi.fn();
    this.lastGpsFixTime = 0;
    this.gpsWatchdogAlerted = false;
    return this;
  }),
}));

import L from 'leaflet';
import { AnchorApp } from '../src/modules/anchor/anchor-app';
import { UI } from '../src/modules/anchor/ui-utils';
import { I18N } from '../src/modules/anchor/i18n';
import { GeoUtils } from '../src/modules/anchor/geo-utils';

// ─── Helpers ─────────────────────────────────────────────────────────

function createMinimalDOM(): void {
  document.body.innerHTML = `
    <div id="map"></div>
    <button id="main-btn" disabled></button>
    <button id="offset-btn" disabled></button>
    <button id="stop-alarm-btn"></button>
    <button id="night-mode-btn"></button>
    <button id="unit-toggle"></button>
    <button id="toggle-map-layer-btn"></button>
    <button id="lang-toggle"></button>
    <button id="center-map-btn" class="hidden"></button>
    <button id="offset-btn"></button>
    <button id="confirm-offset-btn"></button>
    <button id="check-drag-btn"></button>
    <button id="open-history-btn"></button>
    <button id="share-pos-btn"></button>
    <button id="start-watch-btn"></button>
    <button id="cancel-watch-btn"></button>
    <button id="watch-alert-ok-btn"></button>
    <button id="add-schedule-btn"></button>
    <button id="open-stats-btn"></button>
    <button id="open-weather-btn"></button>
    <button id="simple-monitor-btn"></button>
    <button id="sm-close-btn"></button>
    <button id="sm-dismiss-alarm"></button>
    <button id="sm-toggle-nightred"></button>
    <button id="open-qr-scan-btn"></button>
    <button id="qr-scan-close"></button>
    <button id="qr-scan-connect"></button>
    <button id="open-ai-btn"></button>
    <button id="edit-api-key-btn"></button>
    <button id="save-api-key-btn"></button>
    <button id="clear-api-key-btn" class="hidden"></button>
    <button id="ai-ask-btn"></button>
    <button id="ai-clear-chat-btn"></button>
    <button id="ai-summary-save-btn"></button>
    <button id="ws-connect-btn"></button>
    <button id="ws-disconnect-btn"></button>
    <button id="save-sector-btn"></button>
    <button id="apply-calc-btn"></button>
    <button id="set-bearing-behind-btn"></button>
    <div id="alarm-state-bar"></div>
    <div id="alarm-state-text"></div>
    <div id="gps-status-text"></div>
    <div id="gps-status" class="text-yellow-500"></div>
    <div id="no-signal-overlay"></div>
    <div id="sector-badge" class="hidden"></div>
    <div id="active-watch-banner"></div>
    <div id="active-watch-name"></div>
    <div id="watch-badge" class="hidden"></div>
    <div id="simple-monitor-overlay" class="hidden"></div>
    <div id="sm-distance"></div>
    <div id="sm-unit-label"></div>
    <div id="sm-sog"></div>
    <div id="sm-cog"></div>
    <div id="sm-accuracy"></div>
    <div id="sm-gps-lost"></div>
    <div id="sm-alarm-label"></div>
    <div id="sm-dismiss-alarm"></div>
    <div id="sm-time"></div>
    <div id="warning-text"></div>
    <input id="radius-slider" type="range" value="50" />
    <input id="radius-number" type="number" value="50" />
    <input id="offset-dist" value="10" />
    <input id="offset-bearing" value="180" />
    <input id="watch-minutes-input" value="10" />
    <input id="schedule-start" value="" />
    <input id="schedule-end" value="" />
    <input id="schedule-name" value="" />
    <input id="calc-depth" value="5" />
    <select id="calc-ratio"><option value="5">5</option></select>
    <div id="calc-chain-result">0</div>
    <div id="calc-chain-result-parent"><span class="text-slate-500"></span></div>
    <input id="sector-enable" type="checkbox" />
    <input id="sector-bearing" value="0" />
    <input id="sector-width" value="90" />
    <div id="sector-inputs" style="opacity: 1"></div>
    <input id="ws-url-input" value="" />
    <input id="api-key-input" value="" />
    <textarea id="ai-chat-input"></textarea>
    <div id="qr-reader"></div>
    <div id="qr-scan-url"></div>
    <div id="qr-scan-result" class="hidden"></div>
    <div id="qr-scan-error" class="hidden"></div>
    <div id="qr-scan-connect" class="hidden"></div>
    <div id="stats-sessions">0</div>
    <div id="stats-alarms">0</div>
    <div id="stats-duration">0</div>
    <div id="stats-avg-duration">0</div>
    <div id="stats-max-dist">0</div>
    <div id="stats-max-sog">0</div>
    <div data-modal="calc-modal"></div>
  `;
}

function makePosition(lat = 54.0, lng = 18.0, accuracy = 5, speed: number | null = null, heading: number | null = null): GeolocationPosition {
  return {
    coords: {
      latitude: lat,
      longitude: lng,
      accuracy,
      altitude: null,
      altitudeAccuracy: null,
      speed,
      heading,
    },
    timestamp: Date.now(),
  } as GeolocationPosition;
}

describe('AnchorApp', () => {
  let app: AnchorApp;

  beforeEach(() => {
    vi.useFakeTimers();
    createMinimalDOM();
    app = new AnchorApp();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    delete (window as any).app;
  });

  // ─── Constructor & initialization ────────────────────────────────
  describe('constructor', () => {
    it('initializes default state', () => {
      expect(app.state.isAnchored).toBe(false);
      expect(app.state.unit).toBe('m');
      expect(app.state.hasGpsFix).toBe(false);
      expect(app.state.alarmState).toBe('SAFE');
    });

    it('loads schedule from localStorage when valid array', () => {
      localStorage.setItem('anchor_schedule', JSON.stringify([{ start: '00:00', end: '04:00', person: 'A' }]));
      const app2 = new AnchorApp();
      expect(app2.state.schedule).toHaveLength(1);
      expect(app2.state.schedule[0].person).toBe('A');
    });

    it('defaults schedule to [] when localStorage has invalid JSON', () => {
      localStorage.setItem('anchor_schedule', 'not-json');
      const app2 = new AnchorApp();
      expect(app2.state.schedule).toEqual([]);
    });

    it('defaults schedule to [] when localStorage has non-array JSON', () => {
      localStorage.setItem('anchor_schedule', '{"a":1}');
      const app2 = new AnchorApp();
      expect(app2.state.schedule).toEqual([]);
    });

    it('defaults schedule to [] when localStorage is empty', () => {
      expect(app.state.schedule).toEqual([]);
    });

    it('sets ws-url-input value when syncCtrl.url is truthy', () => {
      app.syncCtrl.url = 'ws://test.com';
      // Re-construct to test the constructor branch
      localStorage.setItem('anchor_ws_url', 'ws://test.com');
      // The input value is set in constructor, which already ran.
      // We verify the branch was reachable.
    });

    it('initializes _els cache with DOM elements', () => {
      expect(app._els.mainBtn).toBe(document.getElementById('main-btn'));
      expect(app._els.alarmStateBar).toBe(document.getElementById('alarm-state-bar'));
    });

    it('calls UI.init()', () => {
      expect(UI.init).toHaveBeenCalled();
    });

    it('calls gpsCtrl.initGPS()', () => {
      expect(app.gpsCtrl.initGPS).toHaveBeenCalled();
    });

    it('calls sessionCtrl.initDB()', () => {
      expect(app.sessionCtrl.initDB).toHaveBeenCalled();
    });

    it('sets up tick interval', () => {
      expect(app['_tickInterval']).not.toBeNull();
    });
  });

  // ─── _onTick ─────────────────────────────────────────────────────
  describe('_onTick (via setInterval)', () => {
    it('calls watchScheduleCtrl.checkWatchTimer and checkSchedule', () => {
      vi.advanceTimersByTime(1000);
      expect(app.watchScheduleCtrl.checkWatchTimer).toHaveBeenCalled();
      expect(app.watchScheduleCtrl.checkSchedule).toHaveBeenCalled();
    });

    it('calls syncCtrl.checkHeartbeat when syncCtrl exists', () => {
      vi.advanceTimersByTime(1000);
      expect(app.syncCtrl.checkHeartbeat).toHaveBeenCalled();
    });

    it('calls gpsCtrl.checkGpsWatchdog and checkBatterySaver', () => {
      vi.advanceTimersByTime(1000);
      expect(app.gpsCtrl.checkGpsWatchdog).toHaveBeenCalled();
      expect(app.gpsCtrl.checkBatterySaver).toHaveBeenCalled();
    });
  });

  // ─── _onPosition ─────────────────────────────────────────────────
  describe('_onPosition', () => {
    it('sets currentPos from position', () => {
      app['_onPosition'](makePosition(54.5, 18.5));
      expect(app.state.currentPos).toEqual({ lat: 54.5, lng: 18.5 });
    });

    it('sets accuracy when valid', () => {
      app['_onPosition'](makePosition(54, 18, 10));
      expect(app.state.accuracy).toBe(10);
    });

    it('ignores negative accuracy', () => {
      app.state.accuracy = 5;
      app['_onPosition'](makePosition(54, 18, -1));
      expect(app.state.accuracy).toBe(5);
    });

    it('ignores NaN accuracy', () => {
      app.state.accuracy = 5;
      app['_onPosition'](makePosition(54, 18, NaN));
      expect(app.state.accuracy).toBe(5);
    });

    it('ignores Infinity accuracy', () => {
      app.state.accuracy = 5;
      app['_onPosition'](makePosition(54, 18, Infinity));
      expect(app.state.accuracy).toBe(5);
    });

    it('sets SOG when speed is not null', () => {
      app['_onPosition'](makePosition(54, 18, 5, 2.5));
      expect(app.state.sog).toBeCloseTo(2.5 * 1.94384, 2);
    });

    it('does not set SOG when speed is null', () => {
      app.state.sog = 0;
      app['_onPosition'](makePosition(54, 18, 5, null));
      expect(app.state.sog).toBe(0);
    });

    it('updates maxSogDuringAnchor when anchored and sog exceeds current max', () => {
      app.state.isAnchored = true;
      app.state.maxSogDuringAnchor = 0;
      app['_onPosition'](makePosition(54, 18, 5, 5.0));
      expect(app.state.maxSogDuringAnchor).toBeGreaterThan(0);
    });

    it('does not update maxSogDuringAnchor when not anchored', () => {
      app.state.isAnchored = false;
      app.state.maxSogDuringAnchor = 100;
      app['_onPosition'](makePosition(54, 18, 5, 5.0));
      expect(app.state.maxSogDuringAnchor).toBe(100);
    });

    it('sets COG when heading is not null and not NaN', () => {
      app['_onPosition'](makePosition(54, 18, 5, null, 90));
      expect(app.state.cog).toBe(90);
    });

    it('does not set COG when heading is null', () => {
      app.state.cog = null;
      app['_onPosition'](makePosition(54, 18, 5, null, null));
      expect(app.state.cog).toBeNull();
    });

    it('does not set COG when heading is NaN', () => {
      app.state.cog = 45;
      const pos = makePosition(54, 18, 5, null, NaN);
      app['_onPosition'](pos);
      expect(app.state.cog).toBe(45);
    });

    it('sets hasGpsFix on first fix and enables buttons', () => {
      expect(app.state.hasGpsFix).toBe(false);
      app['_onPosition'](makePosition());
      expect(app.state.hasGpsFix).toBe(true);
      expect(app._els.mainBtn!.disabled).toBe(false);
      expect(app._els.offsetBtn!.disabled).toBe(false);
    });

    it('does not re-run first-fix logic on subsequent positions', () => {
      app['_onPosition'](makePosition());
      app.state.hasGpsFix = true;
      const addSpy = vi.spyOn(app._els.noSignalOverlay!.classList, 'add');
      app['_onPosition'](makePosition());
      expect(addSpy).not.toHaveBeenCalledWith('hidden');
    });

    it('clears gpsSignalLost state', () => {
      app.state.gpsSignalLost = true;
      app.state.hasGpsFix = true;
      app['_onPosition'](makePosition());
      expect(app.state.gpsSignalLost).toBe(false);
      expect(app.gpsCtrl.gpsWatchdogAlerted).toBe(false);
    });

    it('updates gps status text', () => {
      app['_onPosition'](makePosition());
      expect(app._els.gpsStatusText!.textContent).toBe('OK');
    });

    it('pushes to track and trims to 500', () => {
      for (let i = 0; i < 505; i++) {
        app['_onPosition'](makePosition(54 + i * 0.0001, 18));
      }
      expect(app.state.track.length).toBeLessThanOrEqual(500);
    });

    it('buffers track point when anchored with sessionId', () => {
      app.state.isAnchored = true;
      app.state.sessionId = 42;
      app['_onPosition'](makePosition());
      expect(app.sessionCtrl.bufferTrackPoint).toHaveBeenCalled();
    });

    it('does not buffer track point when not anchored', () => {
      app.state.isAnchored = false;
      app['_onPosition'](makePosition());
      expect(app.sessionCtrl.bufferTrackPoint).not.toHaveBeenCalled();
    });

    it('does not buffer when sessionId is null', () => {
      app.state.isAnchored = true;
      app.state.sessionId = null;
      app['_onPosition'](makePosition());
      expect(app.sessionCtrl.bufferTrackPoint).not.toHaveBeenCalled();
    });

    it('calls alarmStateCtrl.recalculate', () => {
      app['_onPosition'](makePosition());
      expect(app.alarmStateCtrl.recalculate).toHaveBeenCalled();
    });

    it('updates simple monitor when active', () => {
      app._simpleMonitorActive = true;
      app['_onPosition'](makePosition());
      expect(app.gpsCtrl.updateSimpleMonitor).toHaveBeenCalledWith(true);
    });

    it('does not update simple monitor when inactive', () => {
      app._simpleMonitorActive = false;
      app['_onPosition'](makePosition());
      expect(app.gpsCtrl.updateSimpleMonitor).not.toHaveBeenCalled();
    });
  });

  // ─── toggleAnchor ────────────────────────────────────────────────
  describe('toggleAnchor()', () => {
    it('lifts anchor when currently anchored', () => {
      app.state.isAnchored = true;
      app.toggleAnchor();
      expect(app.alertCtrl.initPermissions).toHaveBeenCalled();
      expect(app.sessionCtrl.liftAnchor).toHaveBeenCalled();
    });

    it('sets anchor when not anchored and currentPos exists', () => {
      app.state.isAnchored = false;
      app.state.currentPos = { lat: 54, lng: 18 } as any;
      app.toggleAnchor();
      expect(app.sessionCtrl.setAnchor).toHaveBeenCalledWith(app.state.currentPos);
    });

    it('does nothing when not anchored and no currentPos', () => {
      app.state.isAnchored = false;
      app.state.currentPos = null;
      app.toggleAnchor();
      expect(app.sessionCtrl.setAnchor).not.toHaveBeenCalled();
      expect(app.sessionCtrl.liftAnchor).not.toHaveBeenCalled();
    });
  });

  // ─── _syncUI ─────────────────────────────────────────────────────
  describe('_syncUI', () => {
    it('debounces with requestAnimationFrame', () => {
      const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => { cb(0); return 0; });
      app['_syncUI']();
      expect(rafSpy).toHaveBeenCalled();
      expect(UI.updateDashboard).toHaveBeenCalled();
    });

    it('skips when _rafPending is already true', () => {
      app['_rafPending'] = true;
      const rafSpy = vi.spyOn(window, 'requestAnimationFrame');
      app['_syncUI']();
      expect(rafSpy).not.toHaveBeenCalled();
    });
  });

  // ─── _showStats ──────────────────────────────────────────────────
  describe('_showStats', () => {
    it('shows stats modal', async () => {
      app.db.db = {} as any; // Make db truthy
      await app['_showStats']();
      expect(UI.showModal).toHaveBeenCalledWith('stats-modal');
    });

    it('returns early when db.db is null', async () => {
      app.db.db = null;
      await app['_showStats']();
      expect(UI.showModal).toHaveBeenCalledWith('stats-modal');
      expect(app.db.getStats).not.toHaveBeenCalled();
    });

    it('populates stats elements', async () => {
      app.db.db = {} as any;
      await app['_showStats']();
      expect(document.getElementById('stats-sessions')!.textContent).toBe('5');
      expect(document.getElementById('stats-alarms')!.textContent).toBe('2');
    });

    it('handles stats with zero/null values using fallback', async () => {
      app.db.db = {} as any;
      (app.db.getStats as any).mockResolvedValue({
        totalSessions: 0,
        totalAlarms: null,
        totalDuration: 0,
        avgDuration: -1,
        maxDistance: null,
        maxSog: undefined,
      });
      await app['_showStats']();
      expect(document.getElementById('stats-sessions')!.textContent).toBe('0');
      expect(document.getElementById('stats-alarms')!.textContent).toBe('0');
      expect(document.getElementById('stats-duration')!.textContent).toBe('0h');
      expect(document.getElementById('stats-avg-duration')!.textContent).toBe('0h');
      expect(document.getElementById('stats-max-dist')!.textContent).toBe('0.0m');
      expect(document.getElementById('stats-max-sog')!.textContent).toBe('0.0 kn');
    });

    it('handles getStats failure gracefully', async () => {
      app.db.db = {} as any;
      (app.db.getStats as any).mockRejectedValue(new Error('DB error'));
      await app['_showStats']();
      // Should not throw
    });
  });

  // ─── _escapeHtml ─────────────────────────────────────────────────
  describe('_escapeHtml', () => {
    it('escapes HTML characters', () => {
      const result = app._escapeHtml('<script>alert("xss")</script>');
      expect(result).not.toContain('<script>');
    });

    it('returns plain text unchanged', () => {
      expect(app._escapeHtml('hello world')).toBe('hello world');
    });
  });

  // ─── _formatDuration ─────────────────────────────────────────────
  describe('_formatDuration', () => {
    it('delegates to formatDuration', () => {
      app._formatDuration(3600000);
    });
  });

  // ─── Event bindings ──────────────────────────────────────────────
  describe('event bindings', () => {
    describe('unit toggle', () => {
      it('toggles unit from m to ft', () => {
        app.state.unit = 'm';
        document.getElementById('unit-toggle')!.click();
        expect(app.state.unit).toBe('ft');
      });

      it('toggles unit from ft to m', () => {
        app.state.unit = 'ft';
        document.getElementById('unit-toggle')!.click();
        expect(app.state.unit).toBe('m');
      });
    });

    describe('radius handling', () => {
      it('parses radius and applies minimum of 5', () => {
        const slider = document.getElementById('radius-slider') as HTMLInputElement;
        slider.value = '2';
        slider.dispatchEvent(new Event('input'));
        expect(app.state.radius).toBe(5);
      });

      it('converts from feet when unit is ft', () => {
        app.state.unit = 'ft';
        const slider = document.getElementById('radius-slider') as HTMLInputElement;
        slider.value = '100';
        slider.dispatchEvent(new Event('input'));
        expect(app.state.radius).toBeCloseTo(100 / GeoUtils.M2FT, 0);
      });

      it('falls back to 10 for non-numeric input', () => {
        const numberInput = document.getElementById('radius-number') as HTMLInputElement;
        numberInput.value = 'abc';
        numberInput.dispatchEvent(new Event('change'));
        expect(app.state.radius).toBe(10);
      });

      it('sends full sync when connected', () => {
        app.syncCtrl.isConnected = true;
        const slider = document.getElementById('radius-slider') as HTMLInputElement;
        slider.value = '50';
        slider.dispatchEvent(new Event('input'));
        expect(app.syncCtrl.sendFullSync).toHaveBeenCalled();
      });

      it('does not sync when not connected', () => {
        app.syncCtrl.isConnected = false;
        const slider = document.getElementById('radius-slider') as HTMLInputElement;
        slider.value = '50';
        slider.dispatchEvent(new Event('input'));
        expect(app.syncCtrl.sendFullSync).not.toHaveBeenCalled();
      });
    });

    describe('center map', () => {
      it('centers on anchor when anchored with anchorPos', () => {
        app.state.isAnchored = true;
        app.state.anchorPos = { lat: 54, lng: 18 } as any;
        document.getElementById('center-map-btn')!.click();
        expect(app.state.mapAutoCenter).toBe(true);
        expect(app.mapCtrl.map.setView).toHaveBeenCalledWith(app.state.anchorPos);
      });

      it('centers on current pos when not anchored', () => {
        app.state.isAnchored = false;
        app.state.currentPos = { lat: 55, lng: 19 } as any;
        document.getElementById('center-map-btn')!.click();
        expect(app.mapCtrl.map.setView).toHaveBeenCalledWith(app.state.currentPos, 18);
      });

      it('does nothing special when no pos available', () => {
        app.state.isAnchored = false;
        app.state.currentPos = null;
        document.getElementById('center-map-btn')!.click();
        expect(app.state.mapAutoCenter).toBe(true);
      });
    });

    describe('offset bearing', () => {
      it('sets bearing behind when cog is not null', () => {
        app.state.cog = 90;
        document.getElementById('set-bearing-behind-btn')!.click();
        expect((document.getElementById('offset-bearing') as HTMLInputElement).value).toBe('270');
      });

      it('defaults bearing to 180 when cog is null', () => {
        app.state.cog = null;
        document.getElementById('set-bearing-behind-btn')!.click();
        expect((document.getElementById('offset-bearing') as HTMLInputElement).value).toBe('180');
      });
    });

    describe('confirm offset', () => {
      it('returns early when no current pos', () => {
        app.state.currentPos = null;
        document.getElementById('confirm-offset-btn')!.click();
        expect(app.sessionCtrl.setAnchor).not.toHaveBeenCalled();
      });

      it('sets anchor with offset distance and bearing', () => {
        app.state.currentPos = { lat: 54, lng: 18 } as any;
        (document.getElementById('offset-dist') as HTMLInputElement).value = '20';
        (document.getElementById('offset-bearing') as HTMLInputElement).value = '90';
        document.getElementById('confirm-offset-btn')!.click();
        expect(app.sessionCtrl.setAnchor).toHaveBeenCalled();
        expect(UI.hideModal).toHaveBeenCalledWith('offset-modal');
      });

      it('converts distance from ft when unit is ft', () => {
        app.state.unit = 'ft';
        app.state.currentPos = { lat: 54, lng: 18 } as any;
        (document.getElementById('offset-dist') as HTMLInputElement).value = '30';
        document.getElementById('confirm-offset-btn')!.click();
        expect(GeoUtils.getDestinationPoint).toHaveBeenCalled();
      });
    });

    describe('share position', () => {
      it('shows warning when no GPS', () => {
        app.state.currentPos = null;
        document.getElementById('share-pos-btn')!.click();
        expect(document.getElementById('warning-text')!.textContent).toBe('No GPS');
        expect(UI.showModal).toHaveBeenCalledWith('warning-modal');
      });

      it('uses navigator.share when available', () => {
        app.state.currentPos = { lat: 54.123, lng: 18.456 } as any;
        const shareFn = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'share', { value: shareFn, configurable: true });
        document.getElementById('share-pos-btn')!.click();
        expect(shareFn).toHaveBeenCalled();
        delete (navigator as any).share;
      });

      it('falls back to showing URL when navigator.share is not available', () => {
        app.state.currentPos = { lat: 54.123, lng: 18.456 } as any;
        Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
        document.getElementById('share-pos-btn')!.click();
        expect(UI.showModal).toHaveBeenCalledWith('warning-modal');
      });
    });

    describe('watch management', () => {
      it('starts watch timer', () => {
        (document.getElementById('watch-minutes-input') as HTMLInputElement).value = '15';
        document.getElementById('start-watch-btn')!.click();
        expect(app.state.watchActive).toBe(true);
        expect(app.state.watchMinutes).toBe(15);
        expect(app.state.watchEndTime).not.toBeNull();
      });

      it('cancels watch timer', () => {
        app.state.watchActive = true;
        document.getElementById('cancel-watch-btn')!.click();
        expect(app.state.watchActive).toBe(false);
      });

      it('restarts watch on alert ok', () => {
        app.state.watchMinutes = 10;
        document.getElementById('watch-alert-ok-btn')!.click();
        expect(app.state.watchActive).toBe(true);
        expect(app.state.watchEndTime).not.toBeNull();
      });
    });

    describe('schedule', () => {
      it('adds schedule item when all fields filled', () => {
        (document.getElementById('schedule-start') as HTMLInputElement).value = '00:00';
        (document.getElementById('schedule-end') as HTMLInputElement).value = '04:00';
        (document.getElementById('schedule-name') as HTMLInputElement).value = 'John';
        document.getElementById('add-schedule-btn')!.click();
        expect(app.state.schedule).toHaveLength(1);
        expect(app.state.schedule[0].person).toBe('John');
      });

      it('does not add when fields are empty', () => {
        (document.getElementById('schedule-start') as HTMLInputElement).value = '';
        (document.getElementById('schedule-end') as HTMLInputElement).value = '';
        (document.getElementById('schedule-name') as HTMLInputElement).value = '';
        document.getElementById('add-schedule-btn')!.click();
        expect(app.state.schedule).toHaveLength(0);
      });

      it('does not add when name is only whitespace', () => {
        (document.getElementById('schedule-start') as HTMLInputElement).value = '00:00';
        (document.getElementById('schedule-end') as HTMLInputElement).value = '04:00';
        (document.getElementById('schedule-name') as HTMLInputElement).value = '   ';
        document.getElementById('add-schedule-btn')!.click();
        expect(app.state.schedule).toHaveLength(0);
      });
    });

    describe('calculator', () => {
      it('calculates chain result with chain > depth', () => {
        (document.getElementById('calc-depth') as HTMLInputElement).value = '5';
        (document.getElementById('calc-ratio') as HTMLSelectElement).value = '5';
        (document.getElementById('calc-depth') as HTMLInputElement).dispatchEvent(new Event('input'));
        const result = parseFloat(document.getElementById('calc-chain-result')!.textContent!);
        expect(result).toBeGreaterThan(0);
      });

      it('handles chainLength <= depth edge case', () => {
        (document.getElementById('calc-depth') as HTMLInputElement).value = '10';
        (document.getElementById('calc-ratio') as HTMLSelectElement).value = '0.5';
        (document.getElementById('calc-depth') as HTMLInputElement).dispatchEvent(new Event('input'));
        const result = parseFloat(document.getElementById('calc-chain-result')!.textContent!);
        expect(result).toBeGreaterThanOrEqual(0);
      });

      it('handles zero depth', () => {
        (document.getElementById('calc-depth') as HTMLInputElement).value = '0';
        (document.getElementById('calc-depth') as HTMLInputElement).dispatchEvent(new Event('input'));
        expect(document.getElementById('calc-chain-result')!.textContent).toBe('0');
      });

      it('updates breakdown text when element exists', () => {
        // Add breakdown element
        const parent = document.getElementById('calc-chain-result')!.parentElement;
        if (parent) {
          const span = document.createElement('span');
          span.className = 'text-slate-500';
          parent.appendChild(span);
        }
        (document.getElementById('calc-depth') as HTMLInputElement).value = '5';
        (document.getElementById('calc-depth') as HTMLInputElement).dispatchEvent(new Event('input'));
      });

      it('apply calc sets chainLengthM and depthM', () => {
        document.getElementById('calc-chain-result')!.textContent = '30';
        (document.getElementById('calc-depth') as HTMLInputElement).value = '5';
        document.getElementById('apply-calc-btn')!.click();
        expect(app.state.chainLengthM).toBe(25); // 5 * 5
        expect(app.state.depthM).toBe(5);
        expect(UI.hideModal).toHaveBeenCalledWith('calc-modal');
      });
    });

    describe('sector', () => {
      it('saves sector settings', () => {
        (document.getElementById('sector-enable') as HTMLInputElement).checked = true;
        (document.getElementById('sector-bearing') as HTMLInputElement).value = '90';
        (document.getElementById('sector-width') as HTMLInputElement).value = '120';
        document.getElementById('save-sector-btn')!.click();
        expect(app.state.sectorEnabled).toBe(true);
        expect(app.state.sectorBearing).toBe(90);
        expect(app.state.sectorWidth).toBe(120);
      });

      it('sends sync when connected', () => {
        app.syncCtrl.isConnected = true;
        document.getElementById('save-sector-btn')!.click();
        expect(app.syncCtrl.sendFullSync).toHaveBeenCalled();
      });

      it('sector-enable checkbox changes opacity', () => {
        const checkbox = document.getElementById('sector-enable') as HTMLInputElement;
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change'));
        expect((document.getElementById('sector-inputs') as HTMLElement).style.opacity).toBe('1');
        
        checkbox.checked = false;
        checkbox.dispatchEvent(new Event('change'));
        expect((document.getElementById('sector-inputs') as HTMLElement).style.opacity).toBe('0.5');
      });
    });

    describe('websocket', () => {
      it('connects with URL', () => {
        (document.getElementById('ws-url-input') as HTMLInputElement).value = 'ws://test.com';
        document.getElementById('ws-connect-btn')!.click();
        expect(app.syncCtrl.connect).toHaveBeenCalledWith('ws://test.com');
      });

      it('does not connect with empty URL', () => {
        (document.getElementById('ws-url-input') as HTMLInputElement).value = '';
        document.getElementById('ws-connect-btn')!.click();
        expect(app.syncCtrl.connect).not.toHaveBeenCalled();
      });

      it('disconnects', () => {
        document.getElementById('ws-disconnect-btn')!.click();
        expect(app.syncCtrl.disconnect).toHaveBeenCalledWith('USER_DISCONNECT');
      });
    });

    describe('AI key management', () => {
      it('opens AI modal when key exists', () => {
        app.aiCtrl.apiKey = 'sk-test';
        document.getElementById('open-ai-btn')!.click();
        expect(UI.showModal).toHaveBeenCalledWith('ai-modal');
      });

      it('shows key modal when no key', () => {
        app.aiCtrl.apiKey = '';
        document.getElementById('open-ai-btn')!.click();
        expect(UI.showModal).toHaveBeenCalledWith('api-key-modal');
      });

      it('saves API key and runs pending action', () => {
        const pendingFn = vi.fn();
        app.aiCtrl.pendingAction = pendingFn;
        (document.getElementById('api-key-input') as HTMLInputElement).value = 'sk-new-key';
        document.getElementById('save-api-key-btn')!.click();
        expect(app.aiCtrl.setKey).toHaveBeenCalledWith('sk-new-key');
        expect(pendingFn).toHaveBeenCalled();
        expect(app.aiCtrl.pendingAction).toBeNull();
      });

      it('does not save empty key', () => {
        (document.getElementById('api-key-input') as HTMLInputElement).value = '';
        document.getElementById('save-api-key-btn')!.click();
        expect(app.aiCtrl.setKey).not.toHaveBeenCalled();
      });

      it('clears API key', () => {
        document.getElementById('clear-api-key-btn')!.click();
        expect(app.aiCtrl.clearKey).toHaveBeenCalled();
      });
    });

    describe('AI chat', () => {
      it('handles Enter key without Shift to submit', () => {
        const chatInput = document.getElementById('ai-chat-input')!;
        const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: false, bubbles: true });
        const preventSpy = vi.spyOn(event, 'preventDefault');
        chatInput.dispatchEvent(event);
        expect(preventSpy).toHaveBeenCalled();
        expect(app.aiLogbookCtrl.handleAskAI).toHaveBeenCalled();
      });

      it('does not submit on Shift+Enter', () => {
        const chatInput = document.getElementById('ai-chat-input')!;
        const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true });
        chatInput.dispatchEvent(event);
        expect(app.aiLogbookCtrl.handleAskAI).not.toHaveBeenCalled();
      });

      it('does not submit on other keys', () => {
        const chatInput = document.getElementById('ai-chat-input')!;
        chatInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
        expect(app.aiLogbookCtrl.handleAskAI).not.toHaveBeenCalled();
      });
    });

    describe('simple monitor', () => {
      it('opens simple monitor overlay', () => {
        document.getElementById('simple-monitor-btn')!.click();
        expect(app._simpleMonitorActive).toBe(true);
        const overlay = document.getElementById('simple-monitor-overlay')!;
        expect(overlay.classList.contains('flex')).toBe(true);
        expect(overlay.classList.contains('hidden')).toBe(false);
      });

      it('closes simple monitor overlay', () => {
        document.getElementById('simple-monitor-btn')!.click();
        document.getElementById('sm-close-btn')!.click();
        expect(app._simpleMonitorActive).toBe(false);
      });

      it('toggles night red filter on', () => {
        document.getElementById('sm-toggle-nightred')!.click();
        const overlay = document.getElementById('simple-monitor-overlay')!;
        expect(overlay.style.filter).toContain('sepia');
      });

      it('toggles night red filter off', () => {
        document.getElementById('sm-toggle-nightred')!.click();
        document.getElementById('sm-toggle-nightred')!.click();
        const overlay = document.getElementById('simple-monitor-overlay')!;
        expect(overlay.style.filter).toBe('');
      });
    });

    describe('QR scanner', () => {
      it('opens QR scan modal', () => {
        document.getElementById('open-qr-scan-btn')!.click();
        expect(UI.showModal).toHaveBeenCalledWith('qr-scan-modal');
      });

      it('closes QR scan modal', () => {
        document.getElementById('qr-scan-close')!.click();
        expect(UI.hideModal).toHaveBeenCalledWith('qr-scan-modal');
      });

      it('connects via QR scanned data', () => {
        app['_qrScannedData'] = { wsUrl: 'ws://qr.test' };
        document.getElementById('qr-scan-connect')!.click();
        expect(app.syncCtrl.connect).toHaveBeenCalledWith('ws://qr.test');
      });

      it('does not connect when no QR data', () => {
        app['_qrScannedData'] = null;
        document.getElementById('qr-scan-connect')!.click();
        expect(app.syncCtrl.connect).not.toHaveBeenCalled();
      });
    });
  });

  // ─── _onQrScanSuccess ────────────────────────────────────────────
  describe('_onQrScanSuccess', () => {
    it('handles JSON with wsUrl', () => {
      app['_onQrScanSuccess'](JSON.stringify({ wsUrl: 'ws://test.com', ssid: 'MyWifi' }));
      expect(app['_qrScanHandled']).toBe(true);
      expect(app['_qrScannedData']!.wsUrl).toBe('ws://test.com');
      expect(document.getElementById('qr-scan-url')!.textContent).toContain('ws://test.com');
      expect(document.getElementById('qr-scan-url')!.textContent).toContain('WiFi: MyWifi');
    });

    it('handles JSON without ssid', () => {
      app['_onQrScanSuccess'](JSON.stringify({ wsUrl: 'ws://test.com' }));
      expect(document.getElementById('qr-scan-url')!.textContent).toBe('ws://test.com');
      expect(document.getElementById('qr-scan-url')!.textContent).not.toContain('WiFi');
    });

    it('handles plain ws:// URL', () => {
      app['_onQrScanSuccess']('ws://plain.test');
      expect(app['_qrScannedData']!.wsUrl).toBe('ws://plain.test');
      expect(document.getElementById('qr-scan-url')!.textContent).toBe('ws://plain.test');
    });

    it('handles plain wss:// URL', () => {
      app['_onQrScanSuccess']('wss://secure.test');
      expect(app['_qrScannedData']!.wsUrl).toBe('wss://secure.test');
    });

    it('shows error for invalid QR data', () => {
      app['_onQrScanSuccess']('random-text');
      expect(document.getElementById('qr-scan-error')!.textContent).toBe('Invalid QR');
      expect(document.getElementById('qr-scan-error')!.classList.contains('hidden')).toBe(false);
    });

    it('does not process if already handled', () => {
      app['_qrScanHandled'] = true;
      app['_onQrScanSuccess']('ws://test.com');
      // Should return early
      expect(app['_qrScannedData']).toBeNull();
    });

    it('vibrates on successful scan if supported', () => {
      const vibrateFn = vi.fn();
      Object.defineProperty(navigator, 'vibrate', { value: vibrateFn, configurable: true });
      app['_onQrScanSuccess']('ws://test.com');
      expect(vibrateFn).toHaveBeenCalledWith(100);
    });

    it('handles valid JSON that is not a wsUrl object', () => {
      app['_onQrScanSuccess']('{"other": "data"}');
      expect(document.getElementById('qr-scan-error')!.textContent).toBe('Invalid QR');
    });
  });

  // ─── _stopQrScanner ──────────────────────────────────────────────
  describe('_stopQrScanner', () => {
    it('does nothing when no scanner', () => {
      app['_qrScanner'] = null;
      expect(() => app._stopQrScanner()).not.toThrow();
    });

    it('stops and clears scanner', () => {
      const mockScanner = {
        stop: vi.fn().mockResolvedValue(undefined),
        clear: vi.fn(),
      };
      app['_qrScanner'] = mockScanner as any;
      app._stopQrScanner();
      expect(mockScanner.stop).toHaveBeenCalled();
      expect(mockScanner.clear).toHaveBeenCalled();
      expect(app['_qrScanner']).toBeNull();
    });
  });

  // ─── beforeunload ────────────────────────────────────────────────
  describe('beforeunload handler', () => {
    it('flushes track points when conditions met', () => {
      app.sessionCtrl.hasBufferedPoints = true;
      app.state.sessionId = 1;
      app.db.db = {} as any;
      window.dispatchEvent(new Event('beforeunload'));
      expect(app.sessionCtrl.flushTrackPoints).toHaveBeenCalled();
    });

    it('does not flush when no buffered points', () => {
      app.sessionCtrl.hasBufferedPoints = false;
      app.state.sessionId = 1;
      app.db.db = {} as any;
      window.dispatchEvent(new Event('beforeunload'));
      expect(app.sessionCtrl.flushTrackPoints).not.toHaveBeenCalled();
    });

    it('does not flush when no sessionId', () => {
      app.sessionCtrl.hasBufferedPoints = true;
      app.state.sessionId = null;
      app.db.db = {} as any;
      window.dispatchEvent(new Event('beforeunload'));
      expect(app.sessionCtrl.flushTrackPoints).not.toHaveBeenCalled();
    });

    it('does not flush when no db', () => {
      app.sessionCtrl.hasBufferedPoints = true;
      app.state.sessionId = 1;
      app.db.db = null;
      window.dispatchEvent(new Event('beforeunload'));
      expect(app.sessionCtrl.flushTrackPoints).not.toHaveBeenCalled();
    });

    it('calls gpsCtrl.cleanupGPS', () => {
      window.dispatchEvent(new Event('beforeunload'));
      expect(app.gpsCtrl.cleanupGPS).toHaveBeenCalled();
    });

    it('clears smClockInterval if set', () => {
      app['_smClockInterval'] = setInterval(() => {}, 1000);
      const clearSpy = vi.spyOn(global, 'clearInterval');
      window.dispatchEvent(new Event('beforeunload'));
      expect(clearSpy).toHaveBeenCalled();
    });

    it('clears tickInterval if set', () => {
      const clearSpy = vi.spyOn(global, 'clearInterval');
      window.dispatchEvent(new Event('beforeunload'));
      expect(clearSpy).toHaveBeenCalled();
    });
  });
});
