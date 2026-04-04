import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AlarmStateController } from '../src/modules/anchor/controllers/alarm-state.controller';

vi.mock('leaflet', () => ({
  default: { latLng: (lat: number, lng: number) => ({ lat, lng, distanceTo: vi.fn(() => 10) }) },
  latLng: (lat: number, lng: number) => ({ lat, lng, distanceTo: vi.fn(() => 10) }),
}));

function makeState(overrides = {}) {
  return {
    unit: 'm', isAnchored: false, anchorPos: null, currentPos: null,
    track: [], dragHistory: [], dragWarningDismissed: false, sog: 0, cog: null,
    accuracy: 0, distance: 0, radius: 50, bufferRadius: 60, mapAutoCenter: true,
    sectorEnabled: false, sectorBearing: 0, sectorWidth: 90, anchorStartTime: null,
    maxDistanceSwing: 0, maxSogDuringAnchor: 0, watchActive: false, watchEndTime: null,
    watchMinutes: 10, schedule: [], chainLengthM: null, depthM: null,
    alarmState: 'SAFE', sessionId: null, hasGpsFix: false, gpsSignalLost: false,
    ...overrides,
  };
}

function makeMockEls() {
  const bar = document.createElement('div');
  bar.id = 'alarm-state-bar';
  bar.classList.add('hidden');
  const text = document.createElement('span');
  text.id = 'alarm-state-text';
  document.body.appendChild(bar);
  document.body.appendChild(text);
  return {
    alarmStateBar: bar, alarmStateText: text,
    gpsStatusText: null, gpsStatus: null, noSignalOverlay: null,
    mainBtn: null, offsetBtn: null, sectorBadge: null,
    activeWatchBanner: null, activeWatchName: null, watchBadge: null,
    simpleMonitorOverlay: null, smDistance: null, smUnitLabel: null,
    smSog: null, smCog: null, smAccuracy: null, smGpsLost: null,
    smAlarmLabel: null, smDismissAlarm: null, warningText: null,
  } as any;
}

function makeMockDeps() {
  return {
    db: { db: {}, getSession: vi.fn().mockResolvedValue({ alarmCount: 0 }), updateSession: vi.fn().mockResolvedValue(undefined) } as any,
    alarmEngine: {
      processReading: vi.fn(() => 'SAFE'),
      reset: vi.fn(),
      violationCount: 0,
      checkZone: vi.fn(() => 'INSIDE'),
    } as any,
    mapCtrl: { drawSafeZone: vi.fn() } as any,
    alertCtrl: {
      stop: vi.fn(), start: vi.fn(), startForState: vi.fn(),
      isAlarming: false, lastKnownBatteryLevel: 1, lastKnownChargingState: false,
    } as any,
    syncCtrl: { send: vi.fn(), isConnected: false } as any,
    callbacks: {
      syncUI: vi.fn(),
      updateSimpleMonitor: vi.fn(),
      isSimpleMonitorActive: vi.fn(() => false),
    },
  };
}

describe('AlarmStateController', () => {
  let ctrl: AlarmStateController;
  let state: ReturnType<typeof makeState>;
  let els: ReturnType<typeof makeMockEls>;
  let deps: ReturnType<typeof makeMockDeps>;

  beforeEach(() => {
    state = makeState();
    els = makeMockEls();
    deps = makeMockDeps();
    ctrl = new AlarmStateController(
      state as any, deps.db, deps.alarmEngine, deps.mapCtrl,
      deps.alertCtrl, deps.syncCtrl, els, deps.callbacks,
    );
  });

  afterEach(() => {
    document.getElementById('alarm-state-bar')?.remove();
    document.getElementById('alarm-state-text')?.remove();
  });

  it('recalculateZone does nothing when not anchored', () => {
    ctrl.recalculateZone();
    expect(deps.mapCtrl.drawSafeZone).not.toHaveBeenCalled();
  });

  it('recalculateZone draws safe zone when anchored', () => {
    state.isAnchored = true;
    state.anchorPos = { lat: 50, lng: 14 } as any;
    ctrl.recalculateZone();
    expect(deps.mapCtrl.drawSafeZone).toHaveBeenCalledWith(
      state.anchorPos, 50, 60,
      { enabled: false, bearing: 0, width: 90 },
      'SAFE',
    );
  });

  it('recalculate does nothing when not anchored', () => {
    ctrl.recalculate();
    expect(deps.alarmEngine.processReading).not.toHaveBeenCalled();
  });

  it('recalculate updates distance and calls engine', () => {
    const anchor = { lat: 50, lng: 14, distanceTo: vi.fn(() => 30) };
    const boat = { lat: 50.001, lng: 14.001 };
    state.isAnchored = true;
    state.anchorPos = anchor as any;
    state.currentPos = boat as any;

    ctrl.recalculate();

    expect(state.distance).toBe(30);
    expect(state.maxDistanceSwing).toBe(30);
    expect(deps.callbacks.syncUI).toHaveBeenCalled();
  });

  it('updateAlarmStateBar hides when not anchored', () => {
    state.isAnchored = false;
    ctrl.updateAlarmStateBar();
    expect(els.alarmStateBar.classList.contains('hidden')).toBe(true);
  });

  it('updateAlarmStateBar shows state text when anchored', () => {
    state.isAnchored = true;
    state.alarmState = 'SAFE';
    ctrl.updateAlarmStateBar();
    expect(els.alarmStateBar.classList.contains('alarm-bar-safe')).toBe(true);
    expect(els.alarmStateText.textContent).toContain('⚓');
  });

  it('updateAlarmStateBar shows distance when > 0', () => {
    state.isAnchored = true;
    state.alarmState = 'WARNING';
    state.distance = 45;
    ctrl.updateAlarmStateBar();
    expect(els.alarmStateText.textContent).toContain('45m');
  });

  it('recalculate detects anchor drag pattern', () => {
    const anchor = { lat: 50, lng: 14, distanceTo: vi.fn() };
    state.isAnchored = true;
    state.anchorPos = anchor as any;
    state.currentPos = { lat: 50.001, lng: 14 } as any;
    state.radius = 50;

    // Simulate 5 increasing distances above 0.4 * radius
    const distances = [25, 27, 29, 31, 33];
    distances.forEach((d) => {
      anchor.distanceTo.mockReturnValue(d);
      ctrl.recalculate();
    });
    expect(state.dragWarningDismissed).toBe(true);
  });

  it('recalculate triggers alarm when engine reports ALARM', () => {
    const anchor = { lat: 50, lng: 14, distanceTo: vi.fn(() => 70) };
    state.isAnchored = true;
    state.anchorPos = anchor as any;
    state.currentPos = { lat: 50.001, lng: 14 } as any;
    state.alarmState = 'WARNING';
    deps.alarmEngine.processReading.mockReturnValue('ALARM');

    ctrl.recalculate();

    expect(state.alarmState).toBe('ALARM');
    expect(deps.alertCtrl.start).toHaveBeenCalled();
    expect(deps.syncCtrl.send).toHaveBeenCalledWith('TRIGGER_ALARM', expect.objectContaining({ alarmState: 'ALARM' }));
  });

  it('recalculate stops alarm when returning to SAFE', () => {
    const anchor = { lat: 50, lng: 14, distanceTo: vi.fn(() => 10) };
    state.isAnchored = true;
    state.anchorPos = anchor as any;
    state.currentPos = { lat: 50, lng: 14 } as any;
    state.alarmState = 'ALARM';
    deps.alarmEngine.processReading.mockReturnValue('SAFE');

    ctrl.recalculate();

    expect(state.alarmState).toBe('SAFE');
    expect(deps.alertCtrl.stop).toHaveBeenCalled();
  });
});
