/**
 * Anchor module — Main Application Controller
 *
 * Extracted from modules/anchor/index.html inline script.
 * Manages anchor alarm lifecycle, GPS tracking, session persistence,
 * weather, AI, QR scanning, and all UI event bindings.
 */

import L from 'leaflet';
import { marked } from 'marked';
import { Html5Qrcode } from 'html5-qrcode';
import { createIcons } from 'lucide';
import { I18N } from './i18n';
import { GeoUtils } from './geo-utils';
import { AlarmEngine } from './alarm-engine';
import { SessionDB } from './session-db';
import { AlertController } from './alert-controller';
import { MapController } from './map-controller';
import { AIController } from './ai-controller';
import { SyncController } from './sync-controller';
import { UI } from './ui-utils';
import { throttle } from './ui-utils';
import type { TrackPoint } from './session-db';

interface ScheduleItem {
  start: string;
  end: string;
  person: string;
}

interface CachedElements {
  alarmStateBar: HTMLElement | null;
  alarmStateText: HTMLElement | null;
  gpsStatusText: HTMLElement | null;
  gpsStatus: HTMLElement | null;
  noSignalOverlay: HTMLElement | null;
  mainBtn: HTMLButtonElement | null;
  offsetBtn: HTMLButtonElement | null;
  sectorBadge: HTMLElement | null;
  activeWatchBanner: HTMLElement | null;
  activeWatchName: HTMLElement | null;
  watchBadge: HTMLElement | null;
  simpleMonitorOverlay: HTMLElement | null;
  smDistance: HTMLElement | null;
  smUnitLabel: HTMLElement | null;
  smSog: HTMLElement | null;
  smCog: HTMLElement | null;
  smAccuracy: HTMLElement | null;
  smGpsLost: HTMLElement | null;
  smAlarmLabel: HTMLElement | null;
  smDismissAlarm: HTMLElement | null;
  warningText: HTMLElement | null;
}

export interface AppState {
  unit: string;
  isAnchored: boolean;
  anchorPos: L.LatLng | null;
  currentPos: L.LatLng | null;
  track: L.LatLng[];
  dragHistory: number[];
  dragWarningDismissed: boolean;
  sog: number;
  cog: number | null;
  accuracy: number;
  distance: number;
  radius: number;
  bufferRadius: number | null;
  mapAutoCenter: boolean;
  sectorEnabled: boolean;
  sectorBearing: number;
  sectorWidth: number;
  anchorStartTime: number | null;
  maxDistanceSwing: number;
  maxSogDuringAnchor: number;
  watchActive: boolean;
  watchEndTime: number | null;
  watchMinutes: number;
  schedule: ScheduleItem[];
  chainLengthM: number | null;
  depthM: number | null;
  alarmState: string;
  sessionId: number | null;
  hasGpsFix: boolean;
  gpsSignalLost: boolean;
  alarmCount?: number;
}

export class AnchorApp {
  state: AppState;
  db: SessionDB;
  alarmEngine: AlarmEngine;
  mapCtrl: MapController;
  alertCtrl: AlertController;
  aiCtrl: AIController;
  syncCtrl: SyncController;

  private lastGpsFixTime: number;
  private GPS_WATCHDOG_TIMEOUT = 60000;
  private gpsWatchdogAlerted = false;

  private _trackPointBuffer: Omit<TrackPoint, 'id'>[] = [];
  private _trackFlushInterval: ReturnType<typeof setInterval> | null = null;
  private _TRACK_BUFFER_MAX = 1000;
  private _batterySaverActive = false;

  private gpsWatchId: number | null = null;
  private _rafPending = false;
  private _smRafPending = false;

  _els: CachedElements;

  private _scheduleSaveTimer: ReturnType<typeof setTimeout> | null = null;
  private _tickInterval: ReturnType<typeof setInterval> | null = null;
  private _smClockInterval: ReturnType<typeof setInterval> | null = null;
  _simpleMonitorActive = false;
  private _simpleMonitorRedFilter = false;

  private _qrScanner: Html5Qrcode | null = null;
  private _qrScannedData: { wsUrl: string; ssid?: string } | null = null;
  private _qrScanHandled = false;

  private _lastLogbookResponse: string | null = null;
  private _lastLogbookParsed: { summary: string; logEntry: string; safetyNote: string } | null = null;

  private _throttledOnPosition: ((pos: GeolocationPosition) => void) & { cancel(): void } = null!;

  constructor() {
    this.state = {
      unit: 'm',
      isAnchored: false,
      anchorPos: null,
      currentPos: null,
      track: [],
      dragHistory: [],
      dragWarningDismissed: false,
      sog: 0,
      cog: null,
      accuracy: 0,
      distance: 0,
      radius: 50,
      bufferRadius: null,
      mapAutoCenter: true,
      sectorEnabled: false,
      sectorBearing: 0,
      sectorWidth: 90,
      anchorStartTime: null,
      maxDistanceSwing: 0,
      maxSogDuringAnchor: 0,
      watchActive: false,
      watchEndTime: null,
      watchMinutes: 10,
      schedule: this._loadSchedule(),
      chainLengthM: null,
      depthM: null,
      alarmState: 'SAFE',
      sessionId: null,
      hasGpsFix: false,
      gpsSignalLost: false,
    };

    this.lastGpsFixTime = Date.now();

    this.db = new SessionDB();
    this.alarmEngine = new AlarmEngine();
    this.mapCtrl = new MapController('map');
    this.alertCtrl = new AlertController();
    this.aiCtrl = new AIController();
    this.syncCtrl = new SyncController(this);

    this._els = {
      alarmStateBar: document.getElementById('alarm-state-bar'),
      alarmStateText: document.getElementById('alarm-state-text'),
      gpsStatusText: document.getElementById('gps-status-text'),
      gpsStatus: document.getElementById('gps-status'),
      noSignalOverlay: document.getElementById('no-signal-overlay'),
      mainBtn: document.getElementById('main-btn') as HTMLButtonElement,
      offsetBtn: document.getElementById('offset-btn') as HTMLButtonElement,
      sectorBadge: document.getElementById('sector-badge'),
      activeWatchBanner: document.getElementById('active-watch-banner'),
      activeWatchName: document.getElementById('active-watch-name'),
      watchBadge: document.getElementById('watch-badge'),
      simpleMonitorOverlay: document.getElementById('simple-monitor-overlay'),
      smDistance: document.getElementById('sm-distance'),
      smUnitLabel: document.getElementById('sm-unit-label'),
      smSog: document.getElementById('sm-sog'),
      smCog: document.getElementById('sm-cog'),
      smAccuracy: document.getElementById('sm-accuracy'),
      smGpsLost: document.getElementById('sm-gps-lost'),
      smAlarmLabel: document.getElementById('sm-alarm-label'),
      smDismissAlarm: document.getElementById('sm-dismiss-alarm'),
      warningText: document.getElementById('warning-text'),
    };

    UI.init();
    this._bindAppEvents();
    this._initGPS();

    if (this.syncCtrl.url) {
      (document.getElementById('ws-url-input') as HTMLInputElement).value = this.syncCtrl.url;
    }

    this._tickInterval = setInterval(() => this._onTick(), 1000);

    window.addEventListener('beforeunload', () => {
      if (this._trackPointBuffer.length > 0 && this.state.sessionId && this.db.db) {
        this._flushTrackPoints();
      }
      if (this._smClockInterval) clearInterval(this._smClockInterval);
      if (this._tickInterval) clearInterval(this._tickInterval);
    });

    this._initDB();
  }

  // ==========================================
  // DB INIT & STATE PERSISTENCE
  // ==========================================
  private async _initDB() {
    try {
      await this.db.open();
      await this._restoreActiveState();
    } catch (err) {
      console.error('IndexedDB init failed:', err);
    }
  }

  private _loadSchedule(): ScheduleItem[] {
    try {
      const scheduleData = localStorage.getItem('anchor_schedule');
      if (!scheduleData) return [];
      const parsed = JSON.parse(scheduleData);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error('Failed to parse schedule from localStorage:', err);
      return [];
    }
  }

  private _debouncedSaveSchedule() {
    if (this._scheduleSaveTimer) clearTimeout(this._scheduleSaveTimer);
    this._scheduleSaveTimer = setTimeout(() => {
      try {
        localStorage.setItem('anchor_schedule', JSON.stringify(this.state.schedule));
      } catch (e) {
        console.warn('Failed to save schedule:', e);
      }
    }, 300);
  }

  private async _restoreActiveState() {
    const saved = await this.db.getActiveState();
    if (!saved || !saved.isAnchored) return;

    console.log('Restoring active anchor session from IndexedDB...');

    this.state.isAnchored = true;
    this.state.anchorPos = L.latLng(saved.anchorLat, saved.anchorLng);
    this.state.radius = saved.radius || 50;
    this.state.bufferRadius = saved.bufferRadius || null;
    this.state.sectorEnabled = saved.sectorEnabled || false;
    this.state.sectorBearing = saved.sectorBearing || 0;
    this.state.sectorWidth = saved.sectorWidth || 90;
    this.state.sessionId = saved.sessionId || null;
    this.state.anchorStartTime = saved.anchorStartTime || Date.now();
    this.state.maxDistanceSwing = saved.maxDistanceSwing || 0;
    this.state.maxSogDuringAnchor = saved.maxSogDuringAnchor || 0;
    this.state.chainLengthM = saved.chainLengthM || null;
    this.state.depthM = saved.depthM || null;
    this.state.unit = saved.unit || 'm';
    this.state.alarmState = 'SAFE';

    this.mapCtrl.setAnchor(this.state.anchorPos);
    UI.setAnchorMode(true);
    UI.updateRadiusControls(GeoUtils.formatDist(this.state.radius, this.state.unit), this.state.unit);

    if (this.state.sessionId) {
      const points = await this.db.getTrackPoints(this.state.sessionId);
      this.state.track = points.map((p) => L.latLng(p.lat, p.lng));
      this.mapCtrl.updateTrack(this.state.track);
    }

    this._recalculateZone();
    this._startTrackFlushing();
    console.log(`Restored session #${this.state.sessionId} with ${this.state.track.length} track points.`);
  }

  _persistActiveState() {
    if (!this.db.db) return;
    this.db
      .saveActiveState({
        isAnchored: this.state.isAnchored,
        anchorLat: this.state.anchorPos?.lat ?? 0,
        anchorLng: this.state.anchorPos?.lng ?? 0,
        radius: this.state.radius,
        bufferRadius: this.state.bufferRadius,
        sectorEnabled: this.state.sectorEnabled,
        sectorBearing: this.state.sectorBearing,
        sectorWidth: this.state.sectorWidth,
        sessionId: this.state.sessionId,
        anchorStartTime: this.state.anchorStartTime ?? Date.now(),
        maxDistanceSwing: this.state.maxDistanceSwing,
        maxSogDuringAnchor: this.state.maxSogDuringAnchor,
        chainLengthM: this.state.chainLengthM,
        depthM: this.state.depthM,
        unit: this.state.unit,
      })
      .catch((err: unknown) => console.warn('Failed to persist state:', err));
  }

  private _startTrackFlushing() {
    if (this._trackFlushInterval) clearInterval(this._trackFlushInterval);
    this._trackFlushInterval = setInterval(() => this._flushTrackPoints(), 10000);
  }

  private async _flushTrackPoints() {
    if (this._trackPointBuffer.length === 0 || !this.state.sessionId) return;
    const batch = this._trackPointBuffer.splice(0);
    try {
      await this.db.addTrackPointsBatch(batch);
    } catch (err) {
      console.warn('Track flush failed:', err);
    }
    this._persistActiveState();
  }

  // ==========================================
  // TICK, GPS WATCHDOG, BATTERY SAVER
  // ==========================================
  private _onTick() {
    this._checkWatchTimer();
    this._checkSchedule();
    if (this.syncCtrl) this.syncCtrl.checkHeartbeat();
    this._checkGpsWatchdog();
    this._checkBatterySaver();
  }

  private _checkGpsWatchdog() {
    if (!this.state.isAnchored || !this.state.hasGpsFix) return;
    const elapsed = Date.now() - this.lastGpsFixTime;
    const signalLost = elapsed > this.GPS_WATCHDOG_TIMEOUT;

    if (signalLost && !this.state.gpsSignalLost) {
      this.state.gpsSignalLost = true;
      this.gpsWatchdogAlerted = true;
      document.getElementById('gps-status-text')!.textContent = I18N.t.gpsLost;
      document.getElementById('gps-status')!.classList.replace('text-green-500', 'text-red-500');
      document.getElementById('no-signal-overlay')!.classList.remove('hidden');
      UI.showModal('gps-lost-modal');
      this.alertCtrl.playBeep('warning');
      if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300]);
      this.syncCtrl.send('TRIGGER_ALARM', {
        reason: 'GPS_LOST',
        message: 'iPad GPS signal lost for 60+ seconds!',
        alarmState: 'WARNING',
      });
    } else if (!signalLost && this.state.gpsSignalLost) {
      this.state.gpsSignalLost = false;
      this.gpsWatchdogAlerted = false;
      document.getElementById('no-signal-overlay')!.classList.add('hidden');
      UI.hideModal('gps-lost-modal');
    }
  }

  private _checkBatterySaver() {
    const level = this.alertCtrl.lastKnownBatteryLevel;
    const charging = this.alertCtrl.lastKnownChargingState;
    const shouldSave = level !== undefined && level <= 0.3 && !charging;

    if (shouldSave && !this._batterySaverActive) {
      this._batterySaverActive = true;
      this._cleanupGPS();
      this._initGPS();
      const badge = document.getElementById('battery-saver-badge');
      if (badge) badge.classList.remove('hidden');
    } else if (!shouldSave && this._batterySaverActive) {
      this._batterySaverActive = false;
      this._cleanupGPS();
      this._initGPS();
      const badge = document.getElementById('battery-saver-badge');
      if (badge) badge.classList.add('hidden');
    }
  }

  // ==========================================
  // ALARM STATE BAR
  // ==========================================
  _updateAlarmStateBar() {
    const bar = this._els.alarmStateBar!;
    const text = this._els.alarmStateText!;
    bar.classList.remove('alarm-bar-safe', 'alarm-bar-caution', 'alarm-bar-warning', 'alarm-bar-alarm', 'hidden');

    if (!this.state.isAnchored) {
      bar.classList.add('hidden');
      return;
    }

    const labels: Record<string, string> = {
      SAFE: I18N.t.alarmSafe,
      CAUTION: I18N.t.alarmCaution,
      WARNING: I18N.t.alarmWarning,
      ALARM: I18N.t.alarmAlarm,
    };
    const icons: Record<string, string> = { SAFE: '⚓', CAUTION: '🌊', WARNING: '⚠️', ALARM: '🚨' };

    bar.classList.add(`alarm-bar-${this.state.alarmState.toLowerCase()}`);
    const icon = icons[this.state.alarmState] || '';
    const label = labels[this.state.alarmState] || this.state.alarmState;
    text.textContent = `${icon} ${label}`;

    if (this.state.distance > 0) {
      const dist = GeoUtils.formatDist(this.state.distance, this.state.unit);
      const lbl = this.state.unit === 'm' ? 'm' : 'ft';
      text.textContent += ` (${dist}${lbl})`;
    }

    const srAnnounce = document.getElementById('sr-alarm-announce');
    if (srAnnounce) {
      srAnnounce.textContent = '';
      setTimeout(() => { srAnnounce.textContent = `${icon} ${label}`; }, 100);
    }
  }

  // ==========================================
  // ANCHOR LIFECYCLE
  // ==========================================
  toggleAnchor() {
    this.alertCtrl.initPermissions();
    if (this.state.isAnchored) this._liftAnchor();
    else if (this.state.currentPos) this._setAnchor(this.state.currentPos);
  }

  private async _setAnchor(latlng: L.LatLng) {
    this.state.isAnchored = true;
    this.state.anchorPos = latlng;
    this.state.alarmState = 'SAFE';
    this.state.bufferRadius = this.state.radius * 1.2;
    this.mapCtrl.setAnchor(latlng);
    this.state.track = this.state.currentPos ? [this.state.currentPos] : [];
    this.mapCtrl.updateTrack(this.state.track);
    this.state.dragHistory = [];
    this.state.dragWarningDismissed = false;
    this.state.anchorStartTime = Date.now();
    this.state.maxDistanceSwing = 0;
    this.state.maxSogDuringAnchor = 0;
    this.alarmEngine.reset();
    UI.setAnchorMode(true);
    this._recalculateZone();
    this.mapCtrl.fitSafeZone();
    this.state.mapAutoCenter = true;
    document.getElementById('center-map-btn')!.classList.add('hidden');
    this._updateAlarmStateBar();

    if (this.db.db) {
      try {
        const sessionId = await this.db.createSession({
          anchorLat: latlng.lat,
          anchorLng: latlng.lng,
          radius: this.state.radius,
          bufferRadius: this.state.bufferRadius,
          sectorEnabled: this.state.sectorEnabled,
          sectorBearing: this.state.sectorBearing,
          sectorWidth: this.state.sectorWidth,
          startTime: this.state.anchorStartTime!,
          endTime: null,
          chainLengthM: this.state.chainLengthM,
          depthM: this.state.depthM,
          alarmTriggered: false,
          alarmCount: 0,
          maxDistance: 0,
          maxSog: 0,
        });
        this.state.sessionId = sessionId;
        this._persistActiveState();
        this._startTrackFlushing();
      } catch (err) {
        console.warn('Failed to create session:', err);
      }
    }

    if (this.syncCtrl.isConnected) this.syncCtrl.sendFullSync();
  }

  private async _liftAnchor() {
    this._generateLogbookEntry();
    await this._flushTrackPoints();

    if (this.db.db && this.state.sessionId) {
      try {
        await this.db.updateSession(this.state.sessionId, {
          endTime: Date.now(),
          maxDistance: this.state.maxDistanceSwing,
          maxSog: this.state.maxSogDuringAnchor,
          alarmTriggered: this.alarmEngine.violationCount > 0,
        });
      } catch (err) {
        console.warn('Failed to finalize session:', err);
      }
    }

    if (this.db.db) this.db.clearActiveState();
    if (this._trackFlushInterval) clearInterval(this._trackFlushInterval);

    this.state.isAnchored = false;
    this.state.anchorPos = null;
    this.state.distance = 0;
    this.state.alarmState = 'SAFE';
    this.state.sessionId = null;
    this.state.bufferRadius = null;

    this.alertCtrl.stop();
    this.alarmEngine.reset();
    this.mapCtrl.clearAnchor();
    this.state.track = this.state.currentPos ? [this.state.currentPos] : [];
    this.mapCtrl.updateTrack(this.state.track);
    this.alertCtrl.releaseWakeLock();
    UI.setAnchorMode(false);
    this._updateAlarmStateBar();
    this._syncUI();

    if (this.syncCtrl.isConnected) {
      this.syncCtrl.send('DISCONNECT', { reason: 'SESSION_ENDED' });
    }
  }

  _recalculateZone() {
    if (!this.state.isAnchored || !this.state.anchorPos) return;
    this.mapCtrl.drawSafeZone(
      this.state.anchorPos,
      this.state.radius,
      this.state.bufferRadius,
      { enabled: this.state.sectorEnabled, bearing: this.state.sectorBearing, width: this.state.sectorWidth },
      this.state.alarmState
    );
  }

  _recalculate() {
    if (!this.state.isAnchored || !this.state.currentPos || !this.state.anchorPos) return;

    this.state.distance = this.state.anchorPos.distanceTo(this.state.currentPos);
    if (this.state.distance > this.state.maxDistanceSwing) this.state.maxDistanceSwing = this.state.distance;

    this.state.dragHistory.push(this.state.distance);
    if (this.state.dragHistory.length > 5) this.state.dragHistory.shift();

    if (
      !this.state.dragWarningDismissed &&
      this.state.dragHistory.length === 5 &&
      this.state.distance > this.state.radius * 0.4
    ) {
      const [d1, d2, d3, d4, d5] = this.state.dragHistory;
      if (d1 < d2 && d2 < d3 && d3 < d4 && d4 < d5 && d5 - d1 > 2) {
        UI.showModal('drag-warning-modal');
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        this.state.dragWarningDismissed = true;
        this.syncCtrl.send('TRIGGER_ALARM', {
          reason: 'OUT_OF_ZONE',
          message: 'Possible anchor drag detected!',
          alarmState: 'WARNING',
        });
      }
    }

    const zoneResult = AlarmEngine.checkZone(
      this.state.distance,
      this.state.radius,
      this.state.bufferRadius,
      this.state.sectorEnabled,
      this.state.sectorBearing,
      this.state.sectorWidth,
      this.state.anchorPos,
      this.state.currentPos
    );

    const previousAlarmState = this.state.alarmState;
    const newAlarmState = this.alarmEngine.processReading(zoneResult);
    this.state.alarmState = newAlarmState;

    if (newAlarmState !== previousAlarmState) {
      const distStr = String(GeoUtils.formatDist(this.state.distance, this.state.unit));

      if (newAlarmState === 'ALARM' && !this.alertCtrl.isAlarming) {
        this.alertCtrl.start(I18N.t.notifOutOfZone, distStr);
        this.syncCtrl.send('TRIGGER_ALARM', {
          reason: 'OUT_OF_ZONE',
          message: `Yacht outside safe zone! (${distStr})`,
          alarmState: 'ALARM',
        });
        if (this.db.db && this.state.sessionId) {
          this.db.getSession(this.state.sessionId).then((s) => {
            if (s) this.db.updateSession(this.state.sessionId!, { alarmTriggered: true, alarmCount: (s.alarmCount || 0) + 1 });
          });
        }
      } else if (newAlarmState === 'WARNING' && previousAlarmState !== 'ALARM') {
        this.alertCtrl.startForState('WARNING', I18N.t.notifVerifying, distStr);
        this.syncCtrl.send('TRIGGER_ALARM', {
          reason: 'OUT_OF_ZONE',
          message: `Position verification in progress (${distStr})`,
          alarmState: 'WARNING',
        });
      } else if (newAlarmState === 'CAUTION' && previousAlarmState === 'SAFE') {
        this.syncCtrl.send('STATE_UPDATE', {
          currentPos: this.state.currentPos,
          gpsAccuracy: this.state.accuracy,
          distanceToAnchor: this.state.distance,
          alarmState: 'CAUTION',
          sog: this.state.sog,
          cog: this.state.cog,
          batteryLevel: this.alertCtrl.lastKnownBatteryLevel || 1.0,
          isCharging: this.alertCtrl.lastKnownChargingState || false,
        });
      } else if (newAlarmState === 'SAFE' && (previousAlarmState === 'ALARM' || previousAlarmState === 'WARNING')) {
        this.alertCtrl.stop();
      }
    }

    this._updateAlarmStateBar();
    this._recalculateZone();
    this._syncUI();

    if (this._simpleMonitorActive) this._updateSimpleMonitor();
  }

  // ==========================================
  // GPS
  // ==========================================
  private _initGPS() {
    if (!('geolocation' in navigator)) {
      this._els.noSignalOverlay?.classList.remove('hidden');
      return;
    }
    const gpsOptions: PositionOptions = this._batterySaverActive
      ? { enableHighAccuracy: false, maximumAge: 5000, timeout: 10000 }
      : { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 };
    this._throttledOnPosition = throttle((pos: GeolocationPosition) => this._onPosition(pos), 500);
    this.gpsWatchId = navigator.geolocation.watchPosition(
      this._throttledOnPosition,
      (err) => {
        this._els.noSignalOverlay?.classList.remove('hidden');
        if (err.code === 1) {
          if (this._els.warningText)
            this._els.warningText.textContent =
              I18N.t.gpsPermDenied + ' ' + (I18N.t.gpsPermDeniedHelp || 'Check browser Site Settings to re-enable location access.');
          UI.showModal('warning-modal');
        } else if (err.code === 2 || err.code === 3) {
          if (this._els.gpsStatusText) this._els.gpsStatusText.textContent = I18N.t.gpsLost || 'GPS Lost';
          this._els.gpsStatus?.classList.replace('text-green-500', 'text-red-500');
          if (this.state.isAnchored && !this.state.gpsSignalLost) {
            this.state.gpsSignalLost = true;
            this.gpsWatchdogAlerted = true;
            UI.showModal('gps-lost-modal');
            this.alertCtrl.playBeep('warning');
            if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300]);
            this.syncCtrl.send('TRIGGER_ALARM', {
              reason: err.code === 2 ? 'GPS_UNAVAILABLE' : 'GPS_TIMEOUT',
              message: 'GPS signal lost: ' + err.message,
              alarmState: 'WARNING',
            });
          }
        }
      },
      gpsOptions
    );
  }

  private _cleanupGPS() {
    if (this._throttledOnPosition) this._throttledOnPosition.cancel();
    if (this.gpsWatchId !== null) {
      navigator.geolocation.clearWatch(this.gpsWatchId);
      this.gpsWatchId = null;
    }
  }

  private _onPosition(position: GeolocationPosition) {
    this.lastGpsFixTime = Date.now();
    this.state.currentPos = L.latLng(position.coords.latitude, position.coords.longitude);
    const rawAccuracy = position.coords.accuracy;
    const accuracy = rawAccuracy >= 0 && isFinite(rawAccuracy) ? rawAccuracy : null;
    if (accuracy !== null) this.state.accuracy = accuracy;

    if (position.coords.speed !== null) {
      this.state.sog = position.coords.speed * GeoUtils.MPS2KNOTS;
      if (this.state.isAnchored && this.state.sog > this.state.maxSogDuringAnchor)
        this.state.maxSogDuringAnchor = this.state.sog;
    }
    if (position.coords.heading !== null && !isNaN(position.coords.heading)) this.state.cog = position.coords.heading;

    if (!this.state.hasGpsFix) {
      this.state.hasGpsFix = true;
      this._els.noSignalOverlay?.classList.add('hidden');
      if (this._els.mainBtn) this._els.mainBtn.disabled = false;
      if (this._els.offsetBtn) this._els.offsetBtn.disabled = false;
    }

    if (this.state.gpsSignalLost) {
      this.state.gpsSignalLost = false;
      this.gpsWatchdogAlerted = false;
      UI.hideModal('gps-lost-modal');
    }

    if (this._els.gpsStatusText) this._els.gpsStatusText.textContent = I18N.t.gpsOk;
    this._els.gpsStatus?.classList.replace('text-yellow-500', 'text-green-500');
    this._els.gpsStatus?.classList.replace('text-red-500', 'text-green-500');

    this.mapCtrl.updateBoat(
      this.state.currentPos,
      this.state.accuracy,
      this.state.cog,
      !this.state.isAnchored && this.state.mapAutoCenter
    );
    this.state.track.push(this.state.currentPos);
    if (this.state.track.length > 500) this.state.track.shift();
    this.mapCtrl.updateTrack(this.state.track);

    if (this.state.isAnchored && this.state.sessionId) {
      this._trackPointBuffer.push({
        sessionId: this.state.sessionId,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy,
        timestamp: Date.now(),
        distance: this.state.distance,
        alarmState: this.state.alarmState,
      });
      if (this._trackPointBuffer.length > this._TRACK_BUFFER_MAX) {
        this._trackPointBuffer.splice(0, this._trackPointBuffer.length - this._TRACK_BUFFER_MAX);
      }
    }

    this._recalculate();
    if (this._simpleMonitorActive) this._updateSimpleMonitor();
  }

  // ==========================================
  // UI SYNC
  // ==========================================
  private _syncUI() {
    if (this._rafPending) return;
    this._rafPending = true;
    requestAnimationFrame(() => {
      this._rafPending = false;
      UI.updateDashboard(
        GeoUtils.formatDist(this.state.distance, this.state.unit),
        this.state.sog,
        this.state.cog,
        GeoUtils.formatDist(this.state.accuracy, this.state.unit),
        this.state.unit,
        this.state.isAnchored
      );
      this._els.sectorBadge?.classList.toggle('hidden', !this.state.sectorEnabled);
    });
  }

  // ==========================================
  // WATCH & SCHEDULE
  // ==========================================
  private _checkWatchTimer() {
    if (!this.state.watchActive) return;
    if (Date.now() >= this.state.watchEndTime!) {
      this.state.watchActive = false;
      document.getElementById('watch-badge')!.classList.add('hidden');
      this.alertCtrl.playBeep('sine');
      if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
      UI.showModal('watch-alert-modal');
      this.syncCtrl.send('TRIGGER_ALARM', { reason: 'WATCH_TIMER', message: 'Watch timer expired!', alarmState: 'WARNING' });
    }
  }

  private _checkSchedule() {
    const banner = this._els.activeWatchBanner || document.getElementById('active-watch-banner');
    if (!banner) return;
    if (this.state.schedule.length === 0) {
      banner.classList.add('hidden');
      return;
    }
    const now = new Date();
    const currentVal = now.getHours() * 60 + now.getMinutes();
    let activePerson: ScheduleItem | null = null;

    for (const item of this.state.schedule) {
      const [startH, startM] = item.start.split(':').map(Number);
      const [endH, endM] = item.end.split(':').map(Number);
      const startVal = startH * 60 + startM;
      const endVal = endH * 60 + endM;
      const isActive = startVal < endVal ? currentVal >= startVal && currentVal < endVal : currentVal >= startVal || currentVal < endVal;
      if (isActive) {
        activePerson = item;
        break;
      }
    }

    if (activePerson) {
      document.getElementById('active-watch-name')!.textContent = activePerson.person;
      banner.classList.remove('hidden');
    } else {
      banner.classList.add('hidden');
    }
  }

  private _renderScheduleList() {
    const list = document.getElementById('schedule-list')!;
    list.innerHTML = '';
    this.state.schedule.forEach((item, index) => {
      const div = document.createElement('div');
      div.className = 'flex justify-between items-center bg-slate-800 p-2 rounded border border-slate-700 text-xs';
      div.innerHTML = `<span class="text-blue-400 font-mono">${item.start} - ${item.end}</span><span class="text-white font-bold truncate px-2">${item.person}</span><button class="text-red-400 hover:text-red-300 transition-colors" data-idx="${index}"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>`;
      div.querySelector('button')!.addEventListener('click', (e) => {
        this.state.schedule.splice(Number((e.currentTarget as HTMLElement).dataset.idx), 1);
        this._debouncedSaveSchedule();
        this._renderScheduleList();
      });
      list.appendChild(div);
    });
    createIcons();
    this._checkSchedule();
  }

  // ==========================================
  // SESSION HISTORY
  // ==========================================
  private async _showHistory() {
    UI.showModal('history-modal');
    const list = document.getElementById('history-list')!;
    list.innerHTML = `<div class="text-slate-500 text-sm text-center py-4">${I18N.t.histLoading}</div>`;
    if (!this.db.db) {
      list.innerHTML = `<div class="text-slate-500 text-sm text-center py-4">${I18N.t.histDbError}</div>`;
      return;
    }
    try {
      const sessions = await this.db.getAllSessions();
      if (sessions.length === 0) {
        list.innerHTML = `<div class="text-slate-500 text-sm text-center py-4">${I18N.t.histEmpty}</div>`;
        return;
      }
      list.innerHTML = '';
      for (const session of sessions.reverse()) {
        const startDate = new Date(session.startTime);
        const duration = session.endTime ? this._formatDuration(session.endTime - session.startTime) : I18N.t.histActive;
        const alarmBadge = session.alarmTriggered
          ? `<span class="text-[9px] bg-red-900 text-red-300 px-1.5 py-0.5 rounded-full">${session.alarmCount || 0} alarm</span>`
          : `<span class="text-[9px] bg-green-900 text-green-300 px-1.5 py-0.5 rounded-full">OK</span>`;
        const div = document.createElement('div');
        div.className = 'bg-slate-900 p-3 rounded-xl border border-slate-700 cursor-pointer hover:border-blue-500 transition-colors';
        div.innerHTML = `
          <div class="flex justify-between items-center mb-1">
            <span class="text-sm font-bold text-white">${startDate.toLocaleDateString(I18N.locale)} ${startDate.toLocaleTimeString(I18N.locale, { hour: '2-digit', minute: '2-digit' })}</span>
            ${alarmBadge}
          </div>
          <div class="flex justify-between text-xs text-slate-400">
            <span>${I18N.t.histTime} ${duration}</span>
            <span>R: ${Math.round(session.radius)}m</span>
            <span>Max: ${Math.round(session.maxDistance || 0)}m</span>
          </div>
        `;
        div.addEventListener('click', () => this._showReplay(session.id!));
        list.appendChild(div);
      }
    } catch (err: any) {
      list.innerHTML = `<div class="text-red-400 text-sm text-center py-4">${I18N.t.errPrefix} ${err.message}</div>`;
    }
  }

  private async _showReplay(sessionId: number) {
    UI.showModal('replay-modal');
    const info = document.getElementById('replay-info')!;
    info.innerHTML = `<div class="text-slate-500 text-sm">${I18N.t.histLoading}</div>`;
    try {
      const session = await this.db.getSession(sessionId);
      const points = await this.db.getTrackPoints(sessionId);
      if (!session) { info.innerHTML = `<div class="text-red-400">${I18N.t.replayNotFound}</div>`; return; }

      const startDate = new Date(session.startTime);
      const duration = session.endTime ? this._formatDuration(session.endTime - session.startTime) : I18N.t.histActive;
      info.innerHTML = `
        <div class="flex justify-between"><span class="text-slate-400">${I18N.t.replayDate}</span><span class="text-white font-mono">${startDate.toLocaleDateString(I18N.locale)} ${startDate.toLocaleTimeString(I18N.locale, { hour: '2-digit', minute: '2-digit' })}</span></div>
        <div class="flex justify-between"><span class="text-slate-400">${I18N.t.replayDuration}</span><span class="text-white">${duration}</span></div>
        <div class="flex justify-between"><span class="text-slate-400">${I18N.t.replayRadius}</span><span class="text-white">${Math.round(session.radius)}m</span></div>
        <div class="flex justify-between"><span class="text-slate-400">${I18N.t.replayMaxDev}</span><span class="text-white">${Math.round(session.maxDistance || 0)}m</span></div>
        <div class="flex justify-between"><span class="text-slate-400">${I18N.t.replayAlarms}</span><span class="${session.alarmTriggered ? 'text-red-400' : 'text-green-400'}">${session.alarmCount || 0}</span></div>
        <div class="flex justify-between"><span class="text-slate-400">${I18N.t.replayPoints}</span><span class="text-white">${points.length}</span></div>
      `;
      this._renderReplayMap(session, points);

      // Logbook entries
      const logbookContainer = document.getElementById('replay-logbook')!;
      const logbookEntries = document.getElementById('replay-logbook-entries')!;
      logbookContainer.classList.add('hidden');
      logbookEntries.innerHTML = '';
      if (this.db.db) {
        try {
          const entries = await this.db.getLogbookEntries(sessionId);
          if (entries.length > 0) {
            logbookContainer.classList.remove('hidden');
            for (const entry of entries) {
              const div = document.createElement('div');
              div.className = 'bg-slate-900/50 p-2 rounded-lg border border-slate-700 text-xs';
              div.innerHTML = `
                <div class="font-bold text-white mb-0.5">${this._escapeHtml(entry.summary)}</div>
                <div class="text-slate-300 italic">${this._escapeHtml(entry.logEntry)}</div>
                ${entry.safetyNote ? `<div class="text-green-400 mt-1 flex items-center gap-1"><i data-lucide="shield-check" class="w-3 h-3"></i> ${this._escapeHtml(entry.safetyNote)}</div>` : ''}
              `;
              logbookEntries.appendChild(div);
            }
            createIcons();
          }
        } catch (_) { /* ignore */ }
      }

      document.getElementById('replay-export-btn')!.onclick = () => this._exportSessionGPX(session, points);
      const csvBtn = document.getElementById('replay-export-csv-btn');
      if (csvBtn) csvBtn.onclick = () => this._exportSessionCSV(session, points);
      document.getElementById('replay-delete-btn')!.onclick = async () => {
        if (confirm(I18N.t.replayConfirm)) {
          await this.db.deleteSession(sessionId);
          if (this.db.db) { try { await this.db.deleteLogbookEntries(sessionId); } catch (_) { /* ignore */ } }
          UI.hideModal('replay-modal');
          this._showHistory();
        }
      };
    } catch (err: any) {
      info.innerHTML = `<div class="text-red-400">${I18N.t.errPrefix} ${err.message}</div>`;
    }
  }

  private _renderReplayMap(session: any, points: TrackPoint[]) {
    const container = document.getElementById('replay-map')!;
    container.innerHTML = '';
    if (points.length === 0) {
      container.innerHTML = `<div class="text-slate-500 text-sm text-center py-8">${I18N.t.replayNoGps}</div>`;
      return;
    }
    const replayMap = L.map(container, { zoomControl: false, attributionControl: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(replayMap);
    const anchorPos = L.latLng(session.anchorLat, session.anchorLng);
    L.circleMarker(anchorPos, { radius: 6, color: '#fff', fillColor: '#334155', fillOpacity: 1, weight: 2 }).addTo(replayMap);
    L.circle(anchorPos, { radius: session.radius, color: '#22c55e', fillOpacity: 0.1, weight: 1 }).addTo(replayMap);
    const trackCoords = points.map((p) => L.latLng(p.lat, p.lng));
    L.polyline(trackCoords, { color: '#3b82f6', weight: 2, opacity: 0.7 }).addTo(replayMap);
    points.filter((p) => p.alarmState === 'ALARM').forEach((p) => {
      L.circleMarker(L.latLng(p.lat, p.lng), { radius: 3, color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.8, weight: 0 }).addTo(replayMap);
    });
    if (trackCoords.length > 0) {
      const bounds = L.latLngBounds(trackCoords).extend(anchorPos);
      replayMap.fitBounds(bounds, { padding: [10, 10] });
    }
    setTimeout(() => replayMap.invalidateSize(), 100);
  }

  private _exportSessionGPX(session: any, points: TrackPoint[]) {
    if (points.length === 0) return;
    const startDate = new Date(session.startTime);
    let gpx = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="OpenAnchor PWA"\n  xmlns="http://www.topografix.com/GPX/1/1">\n  <metadata><name>OpenAnchor Session ${startDate.toISOString()}</name><time>${startDate.toISOString()}</time></metadata>\n  <wpt lat="${session.anchorLat}" lon="${session.anchorLng}"><name>Anchor</name><desc>Anchor position, radius=${session.radius}m</desc><time>${startDate.toISOString()}</time><sym>Anchor</sym></wpt>\n  <trk><name>Boat Track</name><trkseg>\n`;
    for (const p of points) {
      const time = new Date(p.timestamp).toISOString();
      gpx += `      <trkpt lat="${p.lat}" lon="${p.lng}"><time>${time}</time>${p.accuracy && p.accuracy > 0 ? `<hdop>${p.accuracy.toFixed(1)}</hdop>` : ''}${p.alarmState === 'ALARM' ? '<name>ALARM</name>' : ''}</trkpt>\n`;
    }
    gpx += `    </trkseg></trk>\n</gpx>`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([gpx], { type: 'application/gpx+xml' }));
    a.download = `openanchor_${startDate.toISOString().slice(0, 10)}_${startDate.toISOString().slice(11, 16).replace(':', '')}.gpx`;
    a.click();
  }

  private _exportSessionCSV(session: any, points: TrackPoint[]) {
    if (points.length === 0) return;
    const startDate = new Date(session.startTime);
    const header = 'timestamp,lat,lon,accuracy,distance,alarmState\n';
    const rows = points.map((p) => `${new Date(p.timestamp).toISOString()},${p.lat},${p.lng},${p.accuracy || ''},${p.distance || ''},${p.alarmState || 'SAFE'}`).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([header + rows], { type: 'text/csv' }));
    a.download = `openanchor_${startDate.toISOString().slice(0, 10)}_${startDate.toISOString().slice(11, 16).replace(':', '')}.csv`;
    a.click();
  }

  _formatDuration(ms: number): string {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  // ==========================================
  // AI FEATURES
  // ==========================================
  private async _handleAskAI() {
    const input = document.getElementById('ai-chat-input') as HTMLInputElement;
    const question = input.value.trim();
    if (!question) return;

    const chatArea = document.getElementById('ai-chat-area')!;
    const placeholder = document.getElementById('ai-chat-placeholder');
    const clearBtn = document.getElementById('ai-clear-chat-btn')!;
    const askBtn = document.getElementById('ai-ask-btn') as HTMLButtonElement;

    if (placeholder) placeholder.classList.add('hidden');
    clearBtn.classList.remove('hidden');

    const userBubble = document.createElement('div');
    userBubble.className = 'flex justify-end';
    userBubble.innerHTML = `<div class="bg-purple-700 text-white text-sm px-3 py-2 rounded-xl rounded-br-sm max-w-[85%] break-words">${this._escapeHtml(question)}</div>`;
    chatArea.appendChild(userBubble);

    const loadBubble = document.createElement('div');
    loadBubble.className = 'flex justify-start';
    loadBubble.innerHTML = `<div class="bg-slate-700 text-slate-300 text-sm px-3 py-2 rounded-xl rounded-bl-sm max-w-[85%] flex items-center gap-2"><i data-lucide="loader-2" class="animate-spin w-4 h-4 text-purple-400"></i> <span class="text-xs">${I18N.t.aiAnalyzing}</span></div>`;
    chatArea.appendChild(loadBubble);
    createIcons();
    input.value = '';
    askBtn.disabled = true;
    chatArea.scrollTop = chatArea.scrollHeight;

    const contextPrompt = this.aiCtrl.buildContextPrompt(this.state as any);
    const depth = (document.getElementById('ai-depth') as HTMLInputElement).value;
    const chain = (document.getElementById('ai-chain') as HTMLInputElement).value;
    const wind = (document.getElementById('ai-wind') as HTMLInputElement).value;
    const bottom = (document.getElementById('ai-bottom') as HTMLSelectElement).value;
    let formContext = '';
    if (depth && chain) formContext = `\nUser-provided anchoring parameters: depth=${depth}m, chain=${chain}m, wind=${wind}kn, bottom type=${bottom}`;

    let weatherContext = '';
    if (this.state.currentPos) weatherContext = await this.aiCtrl.fetchWeather(this.state.currentPos.lat, this.state.currentPos.lng);

    let statsContext = '';
    if (this.db.db) { try { const stats = await this.db.getStats(); if (stats.totalSessions > 0) statsContext = `\n- Sailing history: ${stats.totalSessions} completed anchoring sessions, ${stats.totalAlarms} total alarms`; } catch (_) { /* ignore */ } }

    let recentDistances = '';
    if (this.state.isAnchored && this.state.sessionId && this.db.db) { try { const points = await this.db.getTrackPoints(this.state.sessionId); const recent = points.slice(-10); if (recent.length > 0) recentDistances = `\n- Recent distances from anchor (last ${recent.length} readings): ${recent.map((p) => Math.round(p.distance) + 'm').join(', ')}`; } catch (_) { /* ignore */ } }

    const fullContext = contextPrompt + formContext + statsContext + recentDistances;
    const systemPrompt = `You are an expert sailing advisor specializing in anchoring safety.\nYou provide concise, actionable advice for sailors.\nAlways consider safety as the top priority.\nIf you don't know something, say so — never make up navigational data.\nKeep answers under 300 words unless detailed analysis is needed.\nAnswer in the same language the sailor uses.`;

    const response = await this.aiCtrl.askWithContext(question, systemPrompt, fullContext, weatherContext);
    loadBubble.innerHTML = `<div class="bg-slate-700 text-slate-300 text-sm px-3 py-2 rounded-xl rounded-bl-sm max-w-[85%] prose prose-sm prose-invert max-w-none leading-relaxed">${marked.parse(response)}<div class="text-[9px] text-slate-500 mt-1 italic">${I18N.t.aiDisclaimer}</div></div>`;
    createIcons();
    askBtn.disabled = false;
    chatArea.scrollTop = chatArea.scrollHeight;
    document.getElementById('ai-context-badge')!.classList.toggle('hidden', !this.state.isAnchored);
  }

  _escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  private _clearAIChat() {
    this.aiCtrl.clearChat();
    const chatArea = document.getElementById('ai-chat-area')!;
    chatArea.innerHTML = `<div id="ai-chat-placeholder" class="text-slate-500 text-xs text-center py-6"><i data-lucide="message-circle" class="w-8 h-8 mx-auto mb-2 opacity-50"></i><p data-i18n="aiChatPlaceholder">${I18N.t.aiChatPlaceholder || 'Ask a question...'}</p></div>`;
    document.getElementById('ai-clear-chat-btn')!.classList.add('hidden');
    createIcons();
  }

  private async _generateLogbookEntry() {
    if (!this.state.anchorStartTime || !this.aiCtrl.apiKey) return;
    UI.showModal('ai-summary-modal');
    document.getElementById('ai-summary-loader')!.classList.remove('hidden');
    document.getElementById('ai-summary-content')!.classList.add('hidden');
    document.getElementById('ai-summary-raw')!.classList.add('hidden');

    const dMs = Date.now() - this.state.anchorStartTime;
    const h = Math.floor(dMs / 3600000), m = Math.floor((dMs % 3600000) / 60000);
    const durStr = h > 0 ? `${h}h ${m}m` : `${m}m`;

    let weatherSummary = '';
    if (this.state.currentPos) { try { weatherSummary = await this.aiCtrl.fetchWeather(this.state.currentPos.lat, this.state.currentPos.lng); } catch (_) { /* ignore */ } }

    let alarmPointCount = 0, trackPointCount = 0, avgDistance = 0;
    if (this.db.db && this.state.sessionId) { try { const points = await this.db.getTrackPoints(this.state.sessionId); trackPointCount = points.length; alarmPointCount = points.filter((p) => p.alarmState === 'ALARM').length; if (points.length > 0) avgDistance = points.reduce((s, p) => s + (p.distance || 0), 0) / points.length; } catch (_) { /* ignore */ } }

    let alarmCount = 0;
    if (this.db.db && this.state.sessionId) { try { const s = await this.db.getSession(this.state.sessionId); if (s) alarmCount = s.alarmCount || 0; } catch (_) { /* ignore */ } }

    const anchorLat = this.state.anchorPos ? this.state.anchorPos.lat.toFixed(6) : '?';
    const anchorLng = this.state.anchorPos ? this.state.anchorPos.lng.toFixed(6) : '?';

    const prompt = `Generate a concise nautical logbook entry for this anchoring session.\nWrite it in a professional maritime log style.\n\nSession data:\n- Anchor position: ${anchorLat}, ${anchorLng}\n- Duration: ${durStr}\n- Safe zone radius: ${this.state.radius}m\n- Alarms triggered: ${alarmCount}\n- Max distance from anchor: ${Math.round(this.state.maxDistanceSwing)}m\n- Average distance: ${Math.round(avgDistance)}m\n- Track points recorded: ${trackPointCount}\n- Alarm track points: ${alarmPointCount}\n${weatherSummary ? '- Weather conditions: ' + weatherSummary : ''}\n\nGenerate:\n1. A one-line summary (suitable for a list view)\n2. A detailed log entry (3-5 sentences)\n3. Safety assessment (one sentence)\n\nFormat as:\nSUMMARY: ...\nLOG: ...\nSAFETY: ...`;
    const systemPrompt = 'You are a professional maritime logbook writer. Generate structured logbook entries. Always use the exact format requested.';
    const response = await this.aiCtrl.ask(prompt, systemPrompt);

    document.getElementById('ai-summary-loader')!.classList.add('hidden');
    this._lastLogbookResponse = response;
    const parsed = this._parseLogbookResponse(response);

    if (parsed) {
      this._lastLogbookParsed = parsed;
      document.getElementById('ai-summary-content')!.classList.remove('hidden');
      document.getElementById('ai-summary-summary')!.textContent = parsed.summary;
      document.getElementById('ai-summary-log')!.textContent = parsed.logEntry;
      document.getElementById('ai-summary-safety-text')!.textContent = parsed.safetyNote;
    } else {
      this._lastLogbookParsed = { summary: response.substring(0, 100), logEntry: response, safetyNote: '' };
      document.getElementById('ai-summary-raw')!.classList.remove('hidden');
      document.getElementById('ai-summary-raw')!.textContent = `"${response.replace(/"/g, '')}"`;
    }
    createIcons();
  }

  private _parseLogbookResponse(response: string) {
    const summaryMatch = response.match(/SUMMARY:\s*(.+?)(?=\n|LOG:)/si);
    const logMatch = response.match(/LOG:\s*(.+?)(?=SAFETY:)/si);
    const safetyMatch = response.match(/SAFETY:\s*(.+?)$/si);
    if (summaryMatch && logMatch) {
      return { summary: summaryMatch[1].trim(), logEntry: logMatch[1].trim(), safetyNote: safetyMatch ? safetyMatch[1].trim() : '' };
    }
    return null;
  }

  private async _saveLogbookEntry() {
    if (!this.db.db || !this.state.sessionId || !this._lastLogbookParsed) return;
    try {
      await this.db.addLogbookEntry({
        sessionId: this.state.sessionId,
        createdAt: Date.now(),
        summary: this._lastLogbookParsed.summary,
        logEntry: this._lastLogbookParsed.logEntry,
        safetyNote: this._lastLogbookParsed.safetyNote,
        isAiGenerated: true,
      });
      UI.hideModal('ai-summary-modal');
    } catch (err) { console.warn('Failed to save logbook entry:', err); }
  }

  private async _showStats() {
    UI.showModal('stats-modal');
    if (!this.db.db) return;
    try {
      const s = await this.db.getStats();
      const fmtDur = (ms: number) => { if (!ms || ms <= 0) return '0h'; const h = Math.floor(ms / 3600000); const m = Math.floor((ms % 3600000) / 60000); return h > 0 ? `${h}h ${m}m` : `${m}m`; };
      document.getElementById('stats-sessions')!.textContent = String(s.totalSessions || 0);
      document.getElementById('stats-alarms')!.textContent = String(s.totalAlarms || 0);
      document.getElementById('stats-duration')!.textContent = fmtDur(s.totalDuration);
      document.getElementById('stats-avg-duration')!.textContent = fmtDur(s.avgDuration);
      document.getElementById('stats-max-dist')!.textContent = (s.maxDistance || 0).toFixed(1) + 'm';
      document.getElementById('stats-max-sog')!.textContent = (s.maxSog || 0).toFixed(1) + ' kn';
    } catch (err) { console.warn('Failed to load stats:', err); }
  }

  // ==========================================
  // WEATHER
  // ==========================================
  private async _fetchWeatherData() {
    const loading = document.getElementById('weather-loading')!;
    const content = document.getElementById('weather-content')!;
    const errorEl = document.getElementById('weather-error')!;
    loading.classList.remove('hidden'); content.classList.add('hidden'); errorEl.classList.add('hidden');

    if (!this.state.currentPos) { loading.classList.add('hidden'); errorEl.textContent = I18N.t.wxNoGps; errorEl.classList.remove('hidden'); return; }

    const lat = this.state.currentPos.lat, lng = this.state.currentPos.lng;
    try {
      const [windRes, marineRes] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=wind_speed_10m,wind_gusts_10m&wind_speed_unit=kn&timezone=auto&forecast_days=2`),
        fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&current=wave_height,wave_direction,wave_period&hourly=wave_height,wave_period&timezone=auto&forecast_days=2`),
      ]);
      if (!windRes.ok) throw new Error(I18N.t.wxNoWind);
      const windData = await windRes.json();
      const curWind = Math.round(windData.current.wind_speed_10m);
      const curGust = Math.round(windData.current.wind_gusts_10m || curWind);
      const curDir = Math.round(windData.current.wind_direction_10m);
      const dirLabel = this._degToCompass(curDir);
      document.getElementById('wx-wind-speed')!.textContent = String(curWind);
      document.getElementById('wx-wind-gust')!.textContent = String(curGust);
      document.getElementById('wx-wind-dir')!.textContent = dirLabel;

      let waveHeight = '--', wavePeriod = '--', waveDir = '--';
      let marineData: any = null;
      if (marineRes.ok) {
        marineData = await marineRes.json();
        if (marineData.current) {
          waveHeight = marineData.current.wave_height?.toFixed(1) || '--';
          wavePeriod = marineData.current.wave_period?.toFixed(0) || '--';
          waveDir = marineData.current.wave_direction ? this._degToCompass(marineData.current.wave_direction) : '--';
        }
      }
      document.getElementById('wx-wave-height')!.textContent = waveHeight;
      document.getElementById('wx-wave-period')!.textContent = wavePeriod;
      document.getElementById('wx-wave-dir')!.textContent = waveDir;

      const now = new Date();
      const nowIdx = windData.hourly.time.findIndex((t: string) => new Date(t) > now) || 0;
      const windSpeeds12 = windData.hourly.wind_speed_10m.slice(nowIdx, nowIdx + 12);
      const gustSpeeds12 = (windData.hourly.wind_gusts_10m || []).slice(nowIdx, nowIdx + 12);
      this._renderBarChart('wx-wind-chart', windSpeeds12, gustSpeeds12, 'kn');

      if (marineData?.hourly) {
        const marineNowIdx = marineData.hourly.time.findIndex((t: string) => new Date(t) > now) || 0;
        const waveHeights12 = marineData.hourly.wave_height.slice(marineNowIdx, marineNowIdx + 12);
        this._renderBarChart('wx-wave-chart', waveHeights12, [], 'm');
      } else {
        document.getElementById('wx-wave-chart')!.innerHTML = `<div class="text-slate-500 text-xs text-center w-full">${I18N.t.wxNoMarine}</div>`;
      }

      this._renderWeatherAssessment(curWind, curGust, parseFloat(waveHeight) || 0, windSpeeds12, gustSpeeds12);
      loading.classList.add('hidden'); content.classList.remove('hidden');
    } catch (err: any) {
      loading.classList.add('hidden'); errorEl.textContent = `${I18N.t.wxFetchError} ${err.message}`; errorEl.classList.remove('hidden');
    }
  }

  private _degToCompass(deg: number): string {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round(deg / 45) % 8];
  }

  private _renderBarChart(containerId: string, primaryValues: number[], secondaryValues: number[], unit: string) {
    const container = document.getElementById(containerId)!;
    container.innerHTML = '';
    if (!primaryValues || primaryValues.length === 0) { container.innerHTML = `<div class="text-slate-500 text-xs text-center w-full">${I18N.t.wxNoData}</div>`; return; }
    const allVals = [...primaryValues, ...secondaryValues].filter((v) => v != null);
    const maxVal = Math.max(...allVals, 1);
    primaryValues.forEach((val, i) => {
      const pct = Math.max((val / maxVal) * 100, 2);
      const gustVal = secondaryValues[i];
      const gustPct = gustVal ? Math.max((gustVal / maxVal) * 100, 2) : 0;
      const barGroup = document.createElement('div');
      barGroup.className = 'flex-1 flex flex-col items-center justify-end h-full relative';
      barGroup.title = `${Math.round(val)} ${unit}` + (gustVal ? ` (${I18N.t.wxGustsLabel} ${Math.round(gustVal)} ${unit})` : '');
      if (gustPct > 0 && gustPct > pct) { const gustBar = document.createElement('div'); gustBar.className = 'weather-bar w-full bg-orange-900/50 rounded-t-sm absolute bottom-0'; gustBar.style.height = gustPct + '%'; barGroup.appendChild(gustBar); }
      const bar = document.createElement('div');
      const color = val > 25 ? 'bg-red-500' : val > 15 ? 'bg-orange-400' : 'bg-cyan-400';
      bar.className = `weather-bar w-full ${color} rounded-t-sm relative`;
      bar.style.height = pct + '%';
      barGroup.appendChild(bar);
      container.appendChild(barGroup);
    });
  }

  private _renderWeatherAssessment(curWind: number, curGust: number, curWaveH: number, windForecast: number[], gustForecast: number[]) {
    const textEl = document.getElementById('wx-assessment-text')!;
    const maxFutureGust = gustForecast.length > 0 ? Math.max(...gustForecast.filter((v) => v != null)) : curGust;
    const maxFutureWind = windForecast.length > 0 ? Math.max(...windForecast.filter((v) => v != null)) : curWind;
    let icon = '🟢', text = '';
    if (maxFutureGust > 35 || curWaveH > 2.5) { icon = '🔴'; text = I18N.fmt(I18N.t.wxDanger, { gust: Math.round(maxFutureGust), wave: curWaveH }); }
    else if (maxFutureGust > 25 || curWaveH > 1.5 || maxFutureWind > 20) { icon = '🟡'; text = I18N.fmt(I18N.t.wxCaution, { gust: Math.round(maxFutureGust) }); }
    else if (curWind > 15 || curGust > 20) { icon = '🟠'; text = I18N.fmt(I18N.t.wxModerate, { wind: curWind, gust: curGust }); }
    else { text = I18N.fmt(I18N.t.wxGood, { wind: curWind }); }
    textEl.innerHTML = `<span class="text-lg mr-1">${icon}</span> ${text}`;
  }

  // ==========================================
  // SIMPLE MONITOR
  // ==========================================
  private _updateSimpleMonitor() {
    if (!this._simpleMonitorActive || this._smRafPending) return;
    this._smRafPending = true;
    requestAnimationFrame(() => {
      this._smRafPending = false;
      const els = this._els;
      const dist = this.state.isAnchored ? GeoUtils.formatDist(this.state.distance, this.state.unit) : '--';
      const lbl = this.state.unit === 'm' ? I18N.t.smUnit : I18N.t.smUnitFt;
      if (els.smDistance) els.smDistance.textContent = String(dist);
      if (els.smUnitLabel) els.smUnitLabel.textContent = lbl;
      if (els.smSog) els.smSog.textContent = this.state.sog.toFixed(1);
      if (els.smCog) els.smCog.textContent = this.state.cog !== null ? Math.round(this.state.cog) + '°' : '---';
      if (els.smAccuracy) els.smAccuracy.textContent = String(GeoUtils.formatDist(this.state.accuracy, this.state.unit));
      els.smGpsLost?.classList.toggle('hidden', !this.state.gpsSignalLost);
      const stateColors: Record<string, string> = { SAFE: 'green', CAUTION: 'yellow', WARNING: 'orange', ALARM: 'red' };
      const color = stateColors[this.state.alarmState] || 'green';
      if (els.smAlarmLabel) { els.smAlarmLabel.textContent = this.state.alarmState; els.smAlarmLabel.className = `text-lg font-bold uppercase tracking-widest mb-2 text-${color}-500`; }
      if (els.smDistance) els.smDistance.className = `text-[120px] leading-none font-bold tabular-nums text-${color}-500`;
      if (els.simpleMonitorOverlay) els.simpleMonitorOverlay.className = `fixed inset-0 z-[5500] flex flex-col simple-monitor-bg-${this.state.alarmState.toLowerCase()}`;
      els.smDismissAlarm?.classList.toggle('hidden', this.state.alarmState !== 'ALARM');
    });
  }

  // ==========================================
  // QR SCANNER
  // ==========================================
  private _startQrScanner() {
    if (this._qrScanner) this._stopQrScanner();
    this._qrScanHandled = false;
    try {
      this._qrScanner = new Html5Qrcode('qr-reader');
      this._qrScanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 220, height: 220 } }, (decodedText) => this._onQrScanSuccess(decodedText), () => {}).catch((err: any) => {
        document.getElementById('qr-scan-error')!.textContent = `${I18N.t.qrCameraError} ${err.message || err}`;
        document.getElementById('qr-scan-error')!.classList.remove('hidden');
      });
    } catch (err: any) {
      document.getElementById('qr-scan-error')!.textContent = `${I18N.t.qrScanError} ${err.message || err}`;
      document.getElementById('qr-scan-error')!.classList.remove('hidden');
    }
  }

  _stopQrScanner() {
    if (this._qrScanner) {
      this._qrScanner.stop().catch(() => {});
      this._qrScanner.clear();
      this._qrScanner = null;
    }
  }

  private _onQrScanSuccess(decodedText: string) {
    if (this._qrScanHandled) return;
    let data: any = null;
    try { data = JSON.parse(decodedText); } catch (_) { /* not JSON */ }

    if (data?.wsUrl) {
      this._qrScanHandled = true;
      this._qrScannedData = data;
      document.getElementById('qr-scan-url')!.textContent = data.wsUrl + (data.ssid ? ` (WiFi: ${data.ssid})` : '');
    } else if (decodedText.startsWith('ws://') || decodedText.startsWith('wss://')) {
      this._qrScanHandled = true;
      this._qrScannedData = { wsUrl: decodedText };
      document.getElementById('qr-scan-url')!.textContent = decodedText;
    } else {
      document.getElementById('qr-scan-error')!.textContent = I18N.t.qrInvalid;
      document.getElementById('qr-scan-error')!.classList.remove('hidden');
      return;
    }
    document.getElementById('qr-scan-result')!.classList.remove('hidden');
    document.getElementById('qr-scan-connect')!.classList.remove('hidden');
    document.getElementById('qr-scan-error')!.classList.add('hidden');
    this._stopQrScanner();
    if (navigator.vibrate) navigator.vibrate(100);
  }

  // ==========================================
  // EVENT BINDINGS
  // ==========================================
  private _bindAppEvents() {
    document.getElementById('main-btn')!.addEventListener('click', () => this.toggleAnchor());
    document.getElementById('stop-alarm-btn')!.addEventListener('click', () => { this.alertCtrl.stop(); this.alertCtrl.isAlarming = true; setTimeout(() => (this.alertCtrl.isAlarming = false), 5000); });
    document.getElementById('night-mode-btn')!.addEventListener('click', () => document.body.classList.toggle('night-vision'));
    document.getElementById('unit-toggle')!.addEventListener('click', () => { this.state.unit = this.state.unit === 'm' ? 'ft' : 'm'; this._syncUI(); this._persistActiveState(); });
    document.getElementById('toggle-map-layer-btn')!.addEventListener('click', () => this.mapCtrl.toggleLayer());
    document.getElementById('lang-toggle')!.addEventListener('click', () => { const newLang = I18N.lang === 'pl' ? 'en' : 'pl'; I18N.setLang(newLang); this._syncUI(); });

    const handleRadius = (val: string) => {
      let num = parseInt(val) || 10;
      if (this.state.unit === 'ft') num = num / GeoUtils.M2FT;
      if (num < 5) num = 5;
      this.state.radius = num;
      this.state.bufferRadius = num * 1.2;
      UI.updateRadiusControls(GeoUtils.formatDist(num, this.state.unit), this.state.unit);
      this._recalculateZone();
      this._recalculate();
      this._persistActiveState();
      if (this.syncCtrl.isConnected) this.syncCtrl.sendFullSync();
    };
    document.getElementById('radius-slider')!.addEventListener('input', (e) => handleRadius((e.target as HTMLInputElement).value));
    document.getElementById('radius-number')!.addEventListener('change', (e) => handleRadius((e.target as HTMLInputElement).value));

    document.getElementById('center-map-btn')!.addEventListener('click', () => {
      this.state.mapAutoCenter = true;
      document.getElementById('center-map-btn')!.classList.add('hidden');
      if (this.state.isAnchored && this.state.anchorPos) this.mapCtrl.map.setView(this.state.anchorPos);
      else if (this.state.currentPos) this.mapCtrl.map.setView(this.state.currentPos, 18);
    });

    document.getElementById('offset-btn')!.addEventListener('click', () => { UI.showModal('offset-modal'); if (this.state.cog !== null) (document.getElementById('offset-bearing') as HTMLInputElement).value = String(Math.round((this.state.cog + 180) % 360)); });
    document.getElementById('set-bearing-behind-btn')!.addEventListener('click', () => (document.getElementById('offset-bearing') as HTMLInputElement).value = this.state.cog !== null ? String(Math.round((this.state.cog + 180) % 360)) : '180');
    document.getElementById('confirm-offset-btn')!.addEventListener('click', () => {
      if (!this.state.currentPos) return;
      this.alertCtrl.initPermissions();
      let d = parseFloat((document.getElementById('offset-dist') as HTMLInputElement).value) || 0;
      if (this.state.unit === 'ft') d = d / GeoUtils.M2FT;
      this._setAnchor(GeoUtils.getDestinationPoint(this.state.currentPos.lat, this.state.currentPos.lng, d, parseFloat((document.getElementById('offset-bearing') as HTMLInputElement).value) || 0));
      UI.hideModal('offset-modal');
    });

    document.getElementById('check-drag-btn')!.addEventListener('click', () => { UI.hideModal('drag-warning-modal'); if (this.state.currentPos) this.mapCtrl.map.setView(this.state.currentPos, 19); });
    document.getElementById('open-history-btn')!.addEventListener('click', () => this._showHistory());

    document.getElementById('share-pos-btn')!.addEventListener('click', () => {
      if (!this.state.currentPos) { document.getElementById('warning-text')!.textContent = I18N.t.shareNoGps; UI.showModal('warning-modal'); return; }
      const url = `https://www.google.com/maps?q=${this.state.currentPos.lat},${this.state.currentPos.lng}`;
      if (navigator.share) { navigator.share({ title: I18N.t.appTitle, text: `${I18N.t.sharePrefix} ${this.state.currentPos.lat.toFixed(5)}, ${this.state.currentPos.lng.toFixed(5)}`, url }).catch(console.error); }
      else { document.getElementById('warning-text')!.innerHTML = `${I18N.t.shareFallback}<br><br><a href="${url}" target="_blank" class="text-blue-400 break-all">${url}</a>`; UI.showModal('warning-modal'); }
    });

    document.getElementById('start-watch-btn')!.addEventListener('click', () => { this.alertCtrl.initPermissions(); this.state.watchMinutes = parseInt((document.getElementById('watch-minutes-input') as HTMLInputElement).value) || 10; this.state.watchEndTime = Date.now() + this.state.watchMinutes * 60000; this.state.watchActive = true; document.getElementById('watch-badge')!.classList.remove('hidden'); UI.hideModal('watch-setup-modal'); });
    document.getElementById('cancel-watch-btn')!.addEventListener('click', () => { this.state.watchActive = false; document.getElementById('watch-badge')!.classList.add('hidden'); UI.hideModal('watch-setup-modal'); });
    document.getElementById('watch-alert-ok-btn')!.addEventListener('click', () => { UI.hideModal('watch-alert-modal'); this.state.watchEndTime = Date.now() + this.state.watchMinutes * 60000; this.state.watchActive = true; document.getElementById('watch-badge')!.classList.remove('hidden'); });

    this._renderScheduleList();
    document.getElementById('add-schedule-btn')!.addEventListener('click', () => {
      const s = (document.getElementById('schedule-start') as HTMLInputElement).value;
      const e = (document.getElementById('schedule-end') as HTMLInputElement).value;
      const p = (document.getElementById('schedule-name') as HTMLInputElement).value.trim();
      if (s && e && p) { this.state.schedule.push({ start: s, end: e, person: p }); (document.getElementById('schedule-start') as HTMLInputElement).value = ''; (document.getElementById('schedule-end') as HTMLInputElement).value = ''; (document.getElementById('schedule-name') as HTMLInputElement).value = ''; this._renderScheduleList(); this._debouncedSaveSchedule(); }
    });

    // Calculator
    const calcIn = document.getElementById('calc-depth') as HTMLInputElement;
    const calcRat = document.getElementById('calc-ratio') as HTMLSelectElement;
    const calcRes = document.getElementById('calc-chain-result')!;
    const updateCalc = () => {
      const depth = parseFloat(calcIn.value) || 0;
      const ratio = parseFloat(calcRat.value) || 5;
      const chainLength = depth * ratio;
      const swing = chainLength > depth ? Math.sqrt(chainLength * chainLength - depth * depth) : chainLength;
      const safeSwing = swing * 1.2;
      calcRes.textContent = String(Math.round(safeSwing));
      const breakdownEl = calcRes.parentElement?.querySelector('.text-slate-500');
      if (breakdownEl) breakdownEl.textContent = I18N.fmt(I18N.t.calcBreakdown, { chain: Math.round(chainLength), swing: Math.round(swing) });
    };
    calcIn.addEventListener('input', updateCalc);
    calcRat.addEventListener('change', updateCalc);
    document.querySelector('[data-modal="calc-modal"]')!.addEventListener('click', updateCalc);
    document.getElementById('apply-calc-btn')!.addEventListener('click', () => {
      const totalRadius = parseFloat(calcRes.textContent!) || 0;
      const depth = parseFloat(calcIn.value) || 0;
      const ratio = parseFloat(calcRat.value) || 5;
      this.state.chainLengthM = depth * ratio;
      this.state.depthM = depth;
      handleRadius(String(totalRadius));
      UI.hideModal('calc-modal');
    });

    // Sector
    document.getElementById('save-sector-btn')!.addEventListener('click', () => {
      this.state.sectorEnabled = (document.getElementById('sector-enable') as HTMLInputElement).checked;
      this.state.sectorBearing = parseFloat((document.getElementById('sector-bearing') as HTMLInputElement).value) || 0;
      this.state.sectorWidth = parseFloat((document.getElementById('sector-width') as HTMLInputElement).value) || 90;
      UI.hideModal('sector-modal'); this._syncUI(); this._recalculateZone(); this._recalculate(); this._persistActiveState();
      if (this.syncCtrl.isConnected) this.syncCtrl.sendFullSync();
    });
    document.getElementById('sector-enable')!.addEventListener('change', (e) => (document.getElementById('sector-inputs') as HTMLElement).style.opacity = (e.target as HTMLInputElement).checked ? '1' : '0.5');

    // WebSocket
    document.getElementById('ws-connect-btn')!.addEventListener('click', () => { const url = (document.getElementById('ws-url-input') as HTMLInputElement).value.trim(); if (url) { this.syncCtrl.connect(url); UI.hideModal('ws-sync-modal'); } });
    document.getElementById('ws-disconnect-btn')!.addEventListener('click', () => { this.syncCtrl.disconnect('USER_DISCONNECT'); UI.hideModal('ws-sync-modal'); });

    // AI
    const checkAiKey = (action: () => void) => { if (this.aiCtrl.apiKey) action(); else { this.aiCtrl.pendingAction = action; (document.getElementById('api-key-input') as HTMLInputElement).value = this.aiCtrl.apiKey; document.getElementById('clear-api-key-btn')!.classList.toggle('hidden', !this.aiCtrl.apiKey); UI.showModal('api-key-modal'); } };
    document.getElementById('open-ai-btn')!.addEventListener('click', () => checkAiKey(() => UI.showModal('ai-modal')));
    document.getElementById('edit-api-key-btn')!.addEventListener('click', () => { (document.getElementById('api-key-input') as HTMLInputElement).value = this.aiCtrl.apiKey; document.getElementById('clear-api-key-btn')!.classList.toggle('hidden', !this.aiCtrl.apiKey); UI.showModal('api-key-modal'); });
    document.getElementById('save-api-key-btn')!.addEventListener('click', () => { const val = (document.getElementById('api-key-input') as HTMLInputElement).value.trim(); if (val) { this.aiCtrl.setKey(val); UI.hideModal('api-key-modal'); if (this.aiCtrl.pendingAction) { this.aiCtrl.pendingAction(); this.aiCtrl.pendingAction = null; } } });
    document.getElementById('clear-api-key-btn')!.addEventListener('click', () => { this.aiCtrl.clearKey(); (document.getElementById('api-key-input') as HTMLInputElement).value = ''; document.getElementById('clear-api-key-btn')!.classList.add('hidden'); });
    document.getElementById('ai-ask-btn')!.addEventListener('click', () => this._handleAskAI());
    document.getElementById('ai-clear-chat-btn')!.addEventListener('click', () => this._clearAIChat());
    document.getElementById('ai-summary-save-btn')!.addEventListener('click', () => this._saveLogbookEntry());
    document.getElementById('open-stats-btn')!.addEventListener('click', () => this._showStats());

    const aiChatInput = document.getElementById('ai-chat-input');
    if (aiChatInput) aiChatInput.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Enter' && !(e as KeyboardEvent).shiftKey) { e.preventDefault(); this._handleAskAI(); } });

    // Weather
    document.getElementById('open-weather-btn')!.addEventListener('click', () => { UI.showModal('weather-modal'); this._fetchWeatherData(); });

    // Simple Monitor
    const smOverlay = document.getElementById('simple-monitor-overlay')!;
    document.getElementById('simple-monitor-btn')!.addEventListener('click', () => {
      this._simpleMonitorActive = true;
      smOverlay.classList.remove('hidden'); smOverlay.classList.add('flex');
      this._updateSimpleMonitor();
      this._smClockInterval = setInterval(() => { const now = new Date(); document.getElementById('sm-time')!.textContent = now.toLocaleTimeString(I18N.locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }, 1000);
    });
    document.getElementById('sm-close-btn')!.addEventListener('click', () => { this._simpleMonitorActive = false; smOverlay.classList.add('hidden'); smOverlay.classList.remove('flex'); if (this._smClockInterval) clearInterval(this._smClockInterval); });
    document.getElementById('sm-dismiss-alarm')!.addEventListener('click', () => { this.alertCtrl.stop(); this.alertCtrl.isAlarming = true; setTimeout(() => (this.alertCtrl.isAlarming = false), 5000); });
    document.getElementById('sm-toggle-nightred')!.addEventListener('click', () => {
      this._simpleMonitorRedFilter = !this._simpleMonitorRedFilter;
      smOverlay.style.filter = this._simpleMonitorRedFilter ? 'sepia(100%) hue-rotate(-30deg) saturate(300%) brightness(40%)' : '';
      document.getElementById('sm-toggle-nightred')!.innerHTML = this._simpleMonitorRedFilter
        ? `<i data-lucide="sun" class="w-4 h-4 inline mr-1"></i> ${I18N.t.smNormalFilter}`
        : `<i data-lucide="sun-dim" class="w-4 h-4 inline mr-1"></i> ${I18N.t.smRedFilter}`;
      createIcons();
    });

    // QR Scanner
    document.getElementById('open-qr-scan-btn')!.addEventListener('click', () => {
      UI.showModal('qr-scan-modal');
      document.getElementById('qr-scan-result')!.classList.add('hidden');
      document.getElementById('qr-scan-error')!.classList.add('hidden');
      document.getElementById('qr-scan-connect')!.classList.add('hidden');
      this._qrScannedData = null;
      this._startQrScanner();
    });
    document.getElementById('qr-scan-close')!.addEventListener('click', () => { this._stopQrScanner(); UI.hideModal('qr-scan-modal'); });
    document.getElementById('qr-scan-connect')!.addEventListener('click', () => {
      if (this._qrScannedData?.wsUrl) {
        this.syncCtrl.connect(this._qrScannedData.wsUrl);
        (document.getElementById('ws-url-input') as HTMLInputElement).value = this._qrScannedData.wsUrl;
        this._stopQrScanner();
        UI.hideModal('qr-scan-modal');
      }
    });
  }
}
