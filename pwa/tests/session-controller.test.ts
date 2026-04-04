import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SessionController } from '../src/modules/anchor/controllers/session.controller';

// Mock leaflet
vi.mock('leaflet', () => ({
  default: { latLng: (lat: number, lng: number) => ({ lat, lng, distanceTo: vi.fn(() => 10) }) },
  latLng: (lat: number, lng: number) => ({ lat, lng, distanceTo: vi.fn(() => 10) }),
}));

function makeState() {
  return {
    unit: 'm', isAnchored: false, anchorPos: null, currentPos: null,
    track: [], dragHistory: [], dragWarningDismissed: false, sog: 0, cog: null,
    accuracy: 0, distance: 0, radius: 50, bufferRadius: null, mapAutoCenter: true,
    sectorEnabled: false, sectorBearing: 0, sectorWidth: 90, anchorStartTime: null,
    maxDistanceSwing: 0, maxSogDuringAnchor: 0, watchActive: false, watchEndTime: null,
    watchMinutes: 10, schedule: [], chainLengthM: null, depthM: null,
    alarmState: 'SAFE', sessionId: null, hasGpsFix: false, gpsSignalLost: false,
  };
}

function makeMockDb() {
  return {
    db: {},
    open: vi.fn().mockResolvedValue({}),
    getActiveState: vi.fn().mockResolvedValue(null),
    saveActiveState: vi.fn().mockResolvedValue(undefined),
    clearActiveState: vi.fn().mockResolvedValue(undefined),
    createSession: vi.fn().mockResolvedValue(42),
    updateSession: vi.fn().mockResolvedValue(undefined),
    getSession: vi.fn().mockResolvedValue(undefined),
    getTrackPoints: vi.fn().mockResolvedValue([]),
    addTrackPointsBatch: vi.fn().mockResolvedValue(undefined),
    addTrackPoint: vi.fn().mockResolvedValue(1),
    getAllSessions: vi.fn().mockResolvedValue([]),
    deleteSession: vi.fn().mockResolvedValue(undefined),
  } as any;
}

function makeMockMap() {
  return {
    setAnchor: vi.fn(), clearAnchor: vi.fn(), updateTrack: vi.fn(),
    fitSafeZone: vi.fn(), drawSafeZone: vi.fn(), updateBoat: vi.fn(),
  } as any;
}

function makeMockAlert() {
  return {
    stop: vi.fn(), releaseWakeLock: vi.fn(), initPermissions: vi.fn(),
    isAlarming: false, lastKnownBatteryLevel: 1, lastKnownChargingState: false,
  } as any;
}

function makeMockAlarmEngine() {
  return { reset: vi.fn(), violationCount: 0 } as any;
}

function makeMockSync() {
  return { isConnected: false, sendFullSync: vi.fn(), send: vi.fn() } as any;
}

function makeCallbacks() {
  return {
    recalculateZone: vi.fn(),
    recalculate: vi.fn(),
    updateAlarmStateBar: vi.fn(),
    syncUI: vi.fn(),
    generateLogbookEntry: vi.fn(),
    persistActiveState: vi.fn(),
  };
}

function makeEls() {
  return {
    alarmStateBar: document.createElement('div'),
    alarmStateText: document.createElement('span'),
    gpsStatusText: null, gpsStatus: null, noSignalOverlay: null,
    mainBtn: null, offsetBtn: null, sectorBadge: null,
    activeWatchBanner: null, activeWatchName: null, watchBadge: null,
    simpleMonitorOverlay: null, smDistance: null, smUnitLabel: null,
    smSog: null, smCog: null, smAccuracy: null, smGpsLost: null,
    smAlarmLabel: null, smDismissAlarm: null, warningText: null,
  } as any;
}

describe('SessionController', () => {
  let ctrl: SessionController;
  let state: ReturnType<typeof makeState>;
  let db: ReturnType<typeof makeMockDb>;
  let mapCtrl: ReturnType<typeof makeMockMap>;
  let alertCtrl: ReturnType<typeof makeMockAlert>;
  let alarmEngine: ReturnType<typeof makeMockAlarmEngine>;
  let syncCtrl: ReturnType<typeof makeMockSync>;
  let callbacks: ReturnType<typeof makeCallbacks>;

  beforeEach(() => {
    state = makeState();
    db = makeMockDb();
    mapCtrl = makeMockMap();
    alertCtrl = makeMockAlert();
    alarmEngine = makeMockAlarmEngine();
    syncCtrl = makeMockSync();
    callbacks = makeCallbacks();
    // Add required DOM elements for UI.setAnchorMode / UI.updateRadiusControls
    ['center-map-btn', 'main-btn', 'main-btn-text', 'radius-slider', 'radius-number', 'unit-toggle'].forEach(id => {
      const tag = (id === 'radius-slider' || id === 'radius-number') ? 'input' : (id === 'main-btn' ? 'button' : 'div');
      const el = document.createElement(tag);
      el.id = id;
      if (tag === 'button') { el.classList.add('bg-blue-600', 'hover:bg-blue-500'); }
      document.body.appendChild(el);
    });
    ctrl = new SessionController(state, db, mapCtrl, alertCtrl, alarmEngine, syncCtrl, makeEls(), callbacks);
  });

  afterEach(() => {
    ['center-map-btn', 'main-btn', 'main-btn-text', 'radius-slider', 'radius-number', 'unit-toggle'].forEach(id =>
      document.getElementById(id)?.remove()
    );
    ctrl.cleanup();
  });

  it('initDB opens database and restores state', async () => {
    await ctrl.initDB();
    expect(db.open).toHaveBeenCalled();
    expect(db.getActiveState).toHaveBeenCalled();
  });

  it('restoreActiveState does nothing when no saved state', async () => {
    db.getActiveState.mockResolvedValue(null);
    await ctrl.restoreActiveState();
    expect(state.isAnchored).toBe(false);
  });

  it('restoreActiveState restores anchored session', async () => {
    db.getActiveState.mockResolvedValue({
      isAnchored: true, anchorLat: 50, anchorLng: 14, radius: 75,
      bufferRadius: 90, sectorEnabled: false, sectorBearing: 0,
      sectorWidth: 90, sessionId: 5, anchorStartTime: Date.now() - 60000,
      maxDistanceSwing: 20, maxSogDuringAnchor: 1, chainLengthM: null,
      depthM: null, unit: 'm',
    });
    await ctrl.restoreActiveState();
    expect(state.isAnchored).toBe(true);
    expect(state.radius).toBe(75);
    expect(state.sessionId).toBe(5);
    expect(mapCtrl.setAnchor).toHaveBeenCalled();
    expect(callbacks.recalculateZone).toHaveBeenCalled();
  });

  it('persistActiveState calls db.saveActiveState when db is available', () => {
    state.isAnchored = true;
    state.anchorPos = { lat: 50, lng: 14 } as any;
    ctrl.persistActiveState();
    expect(db.saveActiveState).toHaveBeenCalled();
    const saved = db.saveActiveState.mock.calls[0][0];
    expect(saved.isAnchored).toBe(true);
    expect(saved.anchorLat).toBe(50);
  });

  it('persistActiveState is a no-op when db is null', () => {
    db.db = null;
    ctrl.persistActiveState();
    expect(db.saveActiveState).not.toHaveBeenCalled();
  });

  it('flushTrackPoints does nothing when buffer is empty', async () => {
    (state as any).sessionId = 1;
    await ctrl.flushTrackPoints();
    expect(db.addTrackPointsBatch).not.toHaveBeenCalled();
  });

  it('flushTrackPoints writes buffer to db and persists', async () => {
    (state as any).sessionId = 1;
    ctrl.bufferTrackPoint({ sessionId: 1, lat: 50, lng: 14, accuracy: 5, timestamp: Date.now(), distance: 10, alarmState: 'SAFE' });
    await ctrl.flushTrackPoints();
    expect(db.addTrackPointsBatch).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ lat: 50 }),
    ]));
    expect(db.saveActiveState).toHaveBeenCalled();
  });

  it('bufferTrackPoint adds and caps at max', () => {
    for (let i = 0; i < 1050; i++) {
      ctrl.bufferTrackPoint({ sessionId: 1, lat: i, lng: 0, accuracy: null, timestamp: i, distance: 0, alarmState: 'SAFE' });
    }
    expect(ctrl.trackBufferLength).toBeLessThanOrEqual(1000);
  });

  it('bufferTrackPoint triggers emergency flush above warn threshold', () => {
    (state as any).sessionId = 1;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Fill buffer to just above 800 (the warn threshold)
    for (let i = 0; i < 801; i++) {
      ctrl.bufferTrackPoint({ sessionId: 1, lat: i, lng: 0, accuracy: null, timestamp: i, distance: 0, alarmState: 'SAFE' });
    }
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('emergency flush'));
    expect(db.addTrackPointsBatch).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('bufferTrackPoint logs warning when dropping oldest points', () => {
    // No sessionId → flushTrackPoints is a no-op, so buffer won't drain
    (state as any).sessionId = null;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    for (let i = 0; i < 1050; i++) {
      ctrl.bufferTrackPoint({ sessionId: 1, lat: i, lng: 0, accuracy: null, timestamp: i, distance: 0, alarmState: 'SAFE' });
    }
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Dropping'));
    expect(ctrl.trackBufferLength).toBeLessThanOrEqual(1000);
    warnSpy.mockRestore();
  });

  it('setAnchor initializes anchored state and creates session', async () => {
    const pos = { lat: 50, lng: 14 } as any;
    state.currentPos = pos;
    await ctrl.setAnchor(pos);
    expect(state.isAnchored).toBe(true);
    expect(state.anchorPos).toEqual(pos);
    expect(state.alarmState).toBe('SAFE');
    expect(db.createSession).toHaveBeenCalled();
    expect(state.sessionId).toBe(42);
    expect(alarmEngine.reset).toHaveBeenCalled();
    expect(mapCtrl.setAnchor).toHaveBeenCalledWith(pos);
    expect(callbacks.recalculateZone).toHaveBeenCalled();
    expect(callbacks.updateAlarmStateBar).toHaveBeenCalled();
  });

  it('liftAnchor finalizes session and clears state', async () => {
    state.isAnchored = true;
    (state as any).sessionId = 42;
    state.anchorPos = { lat: 50, lng: 14 } as any;
    state.maxDistanceSwing = 30;
    state.maxSogDuringAnchor = 2;
    alarmEngine.violationCount = 1;

    await ctrl.liftAnchor();

    expect(state.isAnchored).toBe(false);
    expect(state.anchorPos).toBe(null);
    expect(state.sessionId).toBe(null);
    expect(db.updateSession).toHaveBeenCalledWith(42, expect.objectContaining({
      alarmTriggered: true,
    }));
    expect(db.clearActiveState).toHaveBeenCalled();
    expect(alertCtrl.stop).toHaveBeenCalled();
    expect(alarmEngine.reset).toHaveBeenCalled();
    expect(mapCtrl.clearAnchor).toHaveBeenCalled();
    expect(callbacks.updateAlarmStateBar).toHaveBeenCalled();
    expect(callbacks.syncUI).toHaveBeenCalled();
  });

  it('liftAnchor sends disconnect when sync is connected', async () => {
    state.isAnchored = true;
    (state as any).sessionId = 42;
    syncCtrl.isConnected = true;
    await ctrl.liftAnchor();
    expect(syncCtrl.send).toHaveBeenCalledWith('DISCONNECT', { reason: 'SESSION_ENDED' });
  });

  it('formatDuration delegates to anchor-utils', () => {
    expect(ctrl.formatDuration(7200000)).toBe('2h 0m');
    expect(ctrl.formatDuration(300000)).toBe('5m');
  });

  it('hasBufferedPoints returns correct boolean', () => {
    expect(ctrl.hasBufferedPoints).toBe(false);
    ctrl.bufferTrackPoint({ sessionId: 1, lat: 0, lng: 0, accuracy: null, timestamp: 0, distance: 0, alarmState: 'SAFE' });
    expect(ctrl.hasBufferedPoints).toBe(true);
  });
});
