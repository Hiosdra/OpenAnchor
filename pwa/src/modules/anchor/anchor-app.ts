/**
 * Anchor module — Main Application Controller (Orchestrator)
 *
 * Thin orchestrator that wires controllers together and delegates all
 * domain logic to focused controller classes in ./controllers/.
 */

import L from 'leaflet';
import { Html5Qrcode } from 'html5-qrcode';
import { createIcons, icons } from 'lucide';
import { I18N } from './i18n';
import { GeoUtils } from './geo-utils';
import { AlarmEngine } from './alarm-engine';
import { SessionDB } from './session-db';
import { AlertController } from './alert-controller';
import { MapController } from './map-controller';
import { AIController } from './ai-controller';
import { SyncController } from './sync-controller';
import { UI } from './ui-utils';
import { formatDuration, type ScheduleItem } from './anchor-utils';

import {
  SessionController,
  AlarmStateController,
  WatchScheduleController,
  HistoryController,
  AILogbookController,
  WeatherController,
  GPSController,
} from './controllers';

function assertEl(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element: #${id}`);
  return el;
}

export interface CachedElements {
  alarmStateBar: HTMLElement;
  alarmStateText: HTMLElement;
  gpsStatusText: HTMLElement;
  gpsStatus: HTMLElement;
  noSignalOverlay: HTMLElement;
  mainBtn: HTMLButtonElement;
  offsetBtn: HTMLButtonElement;
  sectorBadge: HTMLElement;
  activeWatchBanner: HTMLElement;
  activeWatchName: HTMLElement;
  watchBadge: HTMLElement;
  simpleMonitorOverlay: HTMLElement;
  smDistance: HTMLElement;
  smUnitLabel: HTMLElement;
  smSog: HTMLElement;
  smCog: HTMLElement;
  smAccuracy: HTMLElement;
  smGpsLost: HTMLElement;
  smAlarmLabel: HTMLElement;
  smDismissAlarm: HTMLElement;
  warningText: HTMLElement;
}

type EventBinding = { id: string; event: string; handler: (e?: Event) => void };

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

  _els: CachedElements;

  // Controllers
  sessionCtrl: SessionController;
  alarmStateCtrl: AlarmStateController;
  watchScheduleCtrl: WatchScheduleController;
  historyCtrl: HistoryController;
  aiLogbookCtrl: AILogbookController;
  weatherCtrl: WeatherController;
  gpsCtrl: GPSController;

  private _rafPending = false;
  private _tickInterval: ReturnType<typeof setInterval> | null = null;
  private _smClockInterval: ReturnType<typeof setInterval> | null = null;
  _simpleMonitorActive = false;
  private _simpleMonitorRedFilter = false;

  private _qrScanner: Html5Qrcode | null = null;
  private _qrScannedData: { wsUrl: string; ssid?: string } | null = null;
  private _qrScanHandled = false;

  constructor() {
    // Build shared state — schedule loaded via WatchScheduleController
    const tempScheduleCtrl = { loadSchedule: () => WatchScheduleController.prototype.loadSchedule.call({} as any) };
    let scheduleData: ScheduleItem[] = [];
    try {
      const raw = localStorage.getItem('anchor_schedule');
      if (raw) { const parsed = JSON.parse(raw); scheduleData = Array.isArray(parsed) ? parsed : []; }
    } catch { /* ignore */ }

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
      schedule: scheduleData,
      chainLengthM: null,
      depthM: null,
      alarmState: 'SAFE',
      sessionId: null,
      hasGpsFix: false,
      gpsSignalLost: false,
    };

    this.db = new SessionDB();
    this.alarmEngine = new AlarmEngine();
    this.mapCtrl = new MapController('map');
    this.alertCtrl = new AlertController();
    this.aiCtrl = new AIController();
    this.syncCtrl = new SyncController(this);
    this.alertCtrl.configureBatteryCallbacks(
      () => this.state.isAnchored,
      (data) => this.syncCtrl?.send('TRIGGER_ALARM', data),
    );

    this._els = {
      alarmStateBar: assertEl('alarm-state-bar'),
      alarmStateText: assertEl('alarm-state-text'),
      gpsStatusText: assertEl('gps-status-text'),
      gpsStatus: assertEl('gps-status'),
      noSignalOverlay: assertEl('no-signal-overlay'),
      mainBtn: assertEl('main-btn') as HTMLButtonElement,
      offsetBtn: assertEl('offset-btn') as HTMLButtonElement,
      sectorBadge: assertEl('sector-badge'),
      activeWatchBanner: assertEl('active-watch-banner'),
      activeWatchName: assertEl('active-watch-name'),
      watchBadge: assertEl('watch-badge'),
      simpleMonitorOverlay: assertEl('simple-monitor-overlay'),
      smDistance: assertEl('sm-distance'),
      smUnitLabel: assertEl('sm-unit-label'),
      smSog: assertEl('sm-sog'),
      smCog: assertEl('sm-cog'),
      smAccuracy: assertEl('sm-accuracy'),
      smGpsLost: assertEl('sm-gps-lost'),
      smAlarmLabel: assertEl('sm-alarm-label'),
      smDismissAlarm: assertEl('sm-dismiss-alarm'),
      warningText: assertEl('warning-text'),
    };

    // Wire controllers
    this.sessionCtrl = new SessionController(
      this.state, this.db, this.mapCtrl, this.alertCtrl, this.alarmEngine, this.syncCtrl, this._els,
      {
        recalculateZone: () => this.alarmStateCtrl.recalculateZone(),
        recalculate: () => this.alarmStateCtrl.recalculate(),
        updateAlarmStateBar: () => this.alarmStateCtrl.updateAlarmStateBar(),
        syncUI: () => this._syncUI(),
        generateLogbookEntry: () => this.aiLogbookCtrl.generateLogbookEntry(),
        persistActiveState: () => this.sessionCtrl.persistActiveState(),
      },
    );
    this.alarmStateCtrl = new AlarmStateController(
      this.state, this.db, this.alarmEngine, this.mapCtrl, this.alertCtrl, this.syncCtrl, this._els,
      {
        syncUI: () => this._syncUI(),
        updateSimpleMonitor: () => this.gpsCtrl.updateSimpleMonitor(this._simpleMonitorActive),
        isSimpleMonitorActive: () => this._simpleMonitorActive,
      },
    );
    this.watchScheduleCtrl = new WatchScheduleController(this.state, this.alertCtrl, this.syncCtrl, this._els);
    this.historyCtrl = new HistoryController(this.state, this.db);
    this.aiLogbookCtrl = new AILogbookController(this.state, this.db, this.aiCtrl);
    this.weatherCtrl = new WeatherController(this.state);
    this.gpsCtrl = new GPSController(
      this.state, this.alertCtrl, this.syncCtrl, this._els,
      (pos) => this._onPosition(pos),
    );

    UI.init();
    this._bindAppEvents();
    this.gpsCtrl.initGPS();

    if (this.syncCtrl.url) {
      (document.getElementById('ws-url-input') as HTMLInputElement).value = this.syncCtrl.url;
    }

    this._tickInterval = setInterval(() => this._onTick(), 1000);

    window.addEventListener('beforeunload', () => {
      if (this.sessionCtrl.hasBufferedPoints && this.state.sessionId && this.db.db) {
        this.sessionCtrl.flushTrackPoints();
      }
      this.gpsCtrl.cleanupGPS();
      if (this._smClockInterval) clearInterval(this._smClockInterval);
      if (this._tickInterval) clearInterval(this._tickInterval);
    });

    this.sessionCtrl.initDB();
  }

  // ==========================================
  // TICK DISPATCH
  // ==========================================
  private _onTick() {
    this.watchScheduleCtrl.checkWatchTimer();
    this.watchScheduleCtrl.checkSchedule();
    if (this.syncCtrl) this.syncCtrl.checkHeartbeat();
    this.gpsCtrl.checkGpsWatchdog();
    this.gpsCtrl.checkBatterySaver();
  }

  // ==========================================
  // GPS POSITION HANDLER
  // ==========================================
  private _onPosition(position: GeolocationPosition) {
    this.gpsCtrl.lastGpsFixTime = Date.now();
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
      this.gpsCtrl.gpsWatchdogAlerted = false;
      UI.hideModal('gps-lost-modal');
    }

    if (this._els.gpsStatusText) this._els.gpsStatusText.textContent = I18N.t.gpsOk;
    this._els.gpsStatus?.classList.replace('text-yellow-500', 'text-green-500');
    this._els.gpsStatus?.classList.replace('text-red-500', 'text-green-500');

    this.mapCtrl.updateBoat(
      this.state.currentPos,
      this.state.accuracy,
      this.state.cog,
      !this.state.isAnchored && this.state.mapAutoCenter,
    );
    this.state.track.push(this.state.currentPos);
    if (this.state.track.length > 500) this.state.track.shift();
    this.mapCtrl.updateTrack(this.state.track);

    if (this.state.isAnchored && this.state.sessionId) {
      this.sessionCtrl.bufferTrackPoint({
        sessionId: this.state.sessionId,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy,
        timestamp: Date.now(),
        distance: this.state.distance,
        alarmState: this.state.alarmState,
      });
    }

    this.alarmStateCtrl.recalculate();
    if (this._simpleMonitorActive) this.gpsCtrl.updateSimpleMonitor(this._simpleMonitorActive);
  }

  // ==========================================
  // ANCHOR LIFECYCLE (public API)
  // ==========================================
  toggleAnchor() {
    this.alertCtrl.initPermissions();
    if (this.state.isAnchored) this.sessionCtrl.liftAnchor();
    else if (this.state.currentPos) this.sessionCtrl.setAnchor(this.state.currentPos);
  }

  // ==========================================
  // BACKWARDS-COMPAT DELEGATES (used by SyncController / MapController)
  // ==========================================
  _persistActiveState() { this.sessionCtrl.persistActiveState(); }
  _recalculateZone() { this.alarmStateCtrl.recalculateZone(); }
  _recalculate() { this.alarmStateCtrl.recalculate(); }
  _updateAlarmStateBar() { this.alarmStateCtrl.updateAlarmStateBar(); }
  _formatDuration(ms: number): string { return formatDuration(ms); }
  _escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
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
        this.state.isAnchored,
      );
      this._els.sectorBadge?.classList.toggle('hidden', !this.state.sectorEnabled);
    });
  }

  // ==========================================
  // STATS (kept in orchestrator — small)
  // ==========================================
  private async _showStats() {
    UI.showModal('stats-modal');
    if (!this.db.db) return;
    try {
      const s = await this.db.getStats();
      const fmtDur = (ms: number) => { if (!ms || ms <= 0) return '0h'; return formatDuration(ms); };
      document.getElementById('stats-sessions')!.textContent = String(s.totalSessions || 0);
      document.getElementById('stats-alarms')!.textContent = String(s.totalAlarms || 0);
      document.getElementById('stats-duration')!.textContent = fmtDur(s.totalDuration);
      document.getElementById('stats-avg-duration')!.textContent = fmtDur(s.avgDuration);
      document.getElementById('stats-max-dist')!.textContent = (s.maxDistance || 0).toFixed(1) + 'm';
      document.getElementById('stats-max-sog')!.textContent = (s.maxSog || 0).toFixed(1) + ' kn';
    } catch (err) { console.warn('Failed to load stats:', err); }
  }

  // ==========================================
  // QR SCANNER (kept — tightly coupled to sync)
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
  // EVENT BINDINGS (data-driven)
  // ==========================================
  private _getEventBindings(): EventBinding[] {
    return [
      { id: 'main-btn', event: 'click', handler: () => this.toggleAnchor() },
      { id: 'stop-alarm-btn', event: 'click', handler: () => this._dismissAlarm() },
      { id: 'night-mode-btn', event: 'click', handler: () => document.body.classList.toggle('night-vision') },
      { id: 'unit-toggle', event: 'click', handler: () => { this.state.unit = this.state.unit === 'm' ? 'ft' : 'm'; this._syncUI(); this._persistActiveState(); } },
      { id: 'toggle-map-layer-btn', event: 'click', handler: () => this.mapCtrl.toggleLayer() },
      { id: 'lang-toggle', event: 'click', handler: () => { const newLang = I18N.lang === 'pl' ? 'en' : 'pl'; I18N.setLang(newLang); this._syncUI(); } },
      { id: 'radius-slider', event: 'input', handler: (e) => this._handleRadius((e!.target as HTMLInputElement).value) },
      { id: 'radius-number', event: 'change', handler: (e) => this._handleRadius((e!.target as HTMLInputElement).value) },
      { id: 'center-map-btn', event: 'click', handler: () => this._handleCenterMap() },
      { id: 'offset-btn', event: 'click', handler: () => this._handleOpenOffset() },
      { id: 'set-bearing-behind-btn', event: 'click', handler: () => (document.getElementById('offset-bearing') as HTMLInputElement).value = this.state.cog !== null ? String(Math.round((this.state.cog + 180) % 360)) : '180' },
      { id: 'confirm-offset-btn', event: 'click', handler: () => this._handleConfirmOffset() },
      { id: 'check-drag-btn', event: 'click', handler: () => { UI.hideModal('drag-warning-modal'); if (this.state.currentPos) this.mapCtrl.map.setView(this.state.currentPos, 19); } },
      { id: 'open-history-btn', event: 'click', handler: () => this.historyCtrl.showHistory() },
      { id: 'share-pos-btn', event: 'click', handler: () => this._handleSharePosition() },
      { id: 'start-watch-btn', event: 'click', handler: () => this._handleStartWatch() },
      { id: 'cancel-watch-btn', event: 'click', handler: () => { this.state.watchActive = false; assertEl('watch-badge').classList.add('hidden'); UI.hideModal('watch-setup-modal'); } },
      { id: 'watch-alert-ok-btn', event: 'click', handler: () => { UI.hideModal('watch-alert-modal'); this.state.watchEndTime = Date.now() + this.state.watchMinutes * 60000; this.state.watchActive = true; assertEl('watch-badge').classList.remove('hidden'); } },
      { id: 'add-schedule-btn', event: 'click', handler: () => this._handleAddSchedule() },
      { id: 'apply-calc-btn', event: 'click', handler: () => this._handleApplyCalc() },
      { id: 'save-sector-btn', event: 'click', handler: () => this._handleSaveSector() },
      { id: 'sector-enable', event: 'change', handler: (e) => (document.getElementById('sector-inputs') as HTMLElement).style.opacity = (e!.target as HTMLInputElement).checked ? '1' : '0.5' },
      { id: 'ws-connect-btn', event: 'click', handler: () => { const url = (document.getElementById('ws-url-input') as HTMLInputElement).value.trim(); if (url) { this.syncCtrl.connect(url); UI.hideModal('ws-sync-modal'); } } },
      { id: 'ws-disconnect-btn', event: 'click', handler: () => { this.syncCtrl.disconnect('USER_DISCONNECT'); UI.hideModal('ws-sync-modal'); } },
      { id: 'open-ai-btn', event: 'click', handler: () => this._checkAiKey(() => UI.showModal('ai-modal')) },
      { id: 'edit-api-key-btn', event: 'click', handler: () => { (document.getElementById('api-key-input') as HTMLInputElement).value = this.aiCtrl.apiKey; assertEl('clear-api-key-btn').classList.toggle('hidden', !this.aiCtrl.apiKey); UI.showModal('api-key-modal'); } },
      { id: 'save-api-key-btn', event: 'click', handler: () => this._handleSaveApiKey() },
      { id: 'clear-api-key-btn', event: 'click', handler: () => { this.aiCtrl.clearKey(); (document.getElementById('api-key-input') as HTMLInputElement).value = ''; assertEl('clear-api-key-btn').classList.add('hidden'); } },
      { id: 'ai-ask-btn', event: 'click', handler: () => this.aiLogbookCtrl.handleAskAI() },
      { id: 'ai-clear-chat-btn', event: 'click', handler: () => this.aiLogbookCtrl.clearAIChat() },
      { id: 'ai-summary-save-btn', event: 'click', handler: () => this.aiLogbookCtrl.saveLogbookEntry() },
      { id: 'open-stats-btn', event: 'click', handler: () => this._showStats() },
      { id: 'open-weather-btn', event: 'click', handler: () => { UI.showModal('weather-modal'); this.weatherCtrl.fetchWeatherData(); } },
      { id: 'simple-monitor-btn', event: 'click', handler: () => this._handleOpenSimpleMonitor() },
      { id: 'sm-close-btn', event: 'click', handler: () => this._handleCloseSimpleMonitor() },
      { id: 'sm-dismiss-alarm', event: 'click', handler: () => this._dismissAlarm() },
      { id: 'sm-toggle-nightred', event: 'click', handler: () => this._handleToggleNightRed() },
      { id: 'open-qr-scan-btn', event: 'click', handler: () => this._handleOpenQrScan() },
      { id: 'qr-scan-close', event: 'click', handler: () => { this._stopQrScanner(); UI.hideModal('qr-scan-modal'); } },
      { id: 'qr-scan-connect', event: 'click', handler: () => this._handleQrConnect() },
    ];
  }

  private _bindAppEvents() {
    for (const { id, event, handler } of this._getEventBindings()) {
      document.getElementById(id)?.addEventListener(event, handler);
    }

    // Calculator inputs need local references
    const calcIn = document.getElementById('calc-depth') as HTMLInputElement;
    const calcRat = document.getElementById('calc-ratio') as HTMLSelectElement;
    calcIn.addEventListener('input', () => this._updateCalc());
    calcRat.addEventListener('change', () => this._updateCalc());
    document.querySelector('[data-modal="calc-modal"]')?.addEventListener('click', () => this._updateCalc());

    this.watchScheduleCtrl.renderScheduleList();

    // AI chat enter-to-send
    const aiChatInput = document.getElementById('ai-chat-input');
    if (aiChatInput) aiChatInput.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Enter' && !(e as KeyboardEvent).shiftKey) { e.preventDefault(); this.aiLogbookCtrl.handleAskAI(); } });
  }

  // ==========================================
  // HANDLER METHODS (extracted from bindings)
  // ==========================================
  private _dismissAlarm() {
    this.alertCtrl.stop();
    this.alertCtrl.isAlarming = true;
    setTimeout(() => (this.alertCtrl.isAlarming = false), 5000);
  }

  private _handleRadius(val: string) {
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
  }

  private _handleCenterMap() {
    this.state.mapAutoCenter = true;
    assertEl('center-map-btn').classList.add('hidden');
    if (this.state.isAnchored && this.state.anchorPos) this.mapCtrl.map.setView(this.state.anchorPos);
    else if (this.state.currentPos) this.mapCtrl.map.setView(this.state.currentPos, 18);
  }

  private _handleOpenOffset() {
    UI.showModal('offset-modal');
    if (this.state.cog !== null) (document.getElementById('offset-bearing') as HTMLInputElement).value = String(Math.round((this.state.cog + 180) % 360));
  }

  private _handleConfirmOffset() {
    if (!this.state.currentPos) return;
    this.alertCtrl.initPermissions();
    let d = parseFloat((document.getElementById('offset-dist') as HTMLInputElement).value) || 0;
    if (this.state.unit === 'ft') d = d / GeoUtils.M2FT;
    this.sessionCtrl.setAnchor(GeoUtils.getDestinationPoint(this.state.currentPos.lat, this.state.currentPos.lng, d, parseFloat((document.getElementById('offset-bearing') as HTMLInputElement).value) || 0) as unknown as L.LatLng);
    UI.hideModal('offset-modal');
  }

  private _handleSharePosition() {
    if (!this.state.currentPos) { assertEl('warning-text').textContent = I18N.t.shareNoGps; UI.showModal('warning-modal'); return; }
    const url = `https://www.google.com/maps?q=${this.state.currentPos.lat},${this.state.currentPos.lng}`;
    if (navigator.share) { navigator.share({ title: I18N.t.appTitle, text: `${I18N.t.sharePrefix} ${this.state.currentPos.lat.toFixed(5)}, ${this.state.currentPos.lng.toFixed(5)}`, url }).catch(console.error); }
    else { assertEl('warning-text').innerHTML = `${I18N.t.shareFallback}<br><br><a href="${url}" target="_blank" class="text-blue-400 break-all">${url}</a>`; UI.showModal('warning-modal'); }
  }

  private _handleStartWatch() {
    this.alertCtrl.initPermissions();
    this.state.watchMinutes = parseInt((document.getElementById('watch-minutes-input') as HTMLInputElement).value) || 10;
    this.state.watchEndTime = Date.now() + this.state.watchMinutes * 60000;
    this.state.watchActive = true;
    assertEl('watch-badge').classList.remove('hidden');
    UI.hideModal('watch-setup-modal');
  }

  private _handleAddSchedule() {
    const s = (document.getElementById('schedule-start') as HTMLInputElement).value;
    const e = (document.getElementById('schedule-end') as HTMLInputElement).value;
    const p = (document.getElementById('schedule-name') as HTMLInputElement).value.trim();
    if (s && e && p) {
      this.state.schedule.push({ start: s, end: e, person: p });
      (document.getElementById('schedule-start') as HTMLInputElement).value = '';
      (document.getElementById('schedule-end') as HTMLInputElement).value = '';
      (document.getElementById('schedule-name') as HTMLInputElement).value = '';
      this.watchScheduleCtrl.renderScheduleList();
      this.watchScheduleCtrl.debouncedSaveSchedule();
    }
  }

  private _updateCalc() {
    const depth = parseFloat((document.getElementById('calc-depth') as HTMLInputElement).value) || 0;
    const ratio = parseFloat((document.getElementById('calc-ratio') as HTMLSelectElement).value) || 5;
    const chainLength = depth * ratio;
    const swing = chainLength > depth ? Math.sqrt(chainLength * chainLength - depth * depth) : chainLength;
    const safeSwing = swing * 1.2;
    const calcRes = assertEl('calc-chain-result');
    calcRes.textContent = String(Math.round(safeSwing));
    const breakdownEl = calcRes.parentElement?.querySelector('.text-slate-500');
    if (breakdownEl) breakdownEl.textContent = I18N.fmt(I18N.t.calcBreakdown, { chain: Math.round(chainLength), swing: Math.round(swing) });
  }

  private _handleApplyCalc() {
    const totalRadius = parseFloat(assertEl('calc-chain-result').textContent!) || 0;
    const depth = parseFloat((document.getElementById('calc-depth') as HTMLInputElement).value) || 0;
    const ratio = parseFloat((document.getElementById('calc-ratio') as HTMLSelectElement).value) || 5;
    this.state.chainLengthM = depth * ratio;
    this.state.depthM = depth;
    this._handleRadius(String(totalRadius));
    UI.hideModal('calc-modal');
  }

  private _handleSaveSector() {
    this.state.sectorEnabled = (document.getElementById('sector-enable') as HTMLInputElement).checked;
    this.state.sectorBearing = parseFloat((document.getElementById('sector-bearing') as HTMLInputElement).value) || 0;
    this.state.sectorWidth = parseFloat((document.getElementById('sector-width') as HTMLInputElement).value) || 90;
    UI.hideModal('sector-modal'); this._syncUI(); this._recalculateZone(); this._recalculate(); this._persistActiveState();
    if (this.syncCtrl.isConnected) this.syncCtrl.sendFullSync();
  }

  private _checkAiKey(action: () => void) {
    if (this.aiCtrl.apiKey) action();
    else {
      this.aiCtrl.pendingAction = action;
      (document.getElementById('api-key-input') as HTMLInputElement).value = this.aiCtrl.apiKey;
      assertEl('clear-api-key-btn').classList.toggle('hidden', !this.aiCtrl.apiKey);
      UI.showModal('api-key-modal');
    }
  }

  private _handleSaveApiKey() {
    const val = (document.getElementById('api-key-input') as HTMLInputElement).value.trim();
    if (val) {
      this.aiCtrl.setKey(val);
      UI.hideModal('api-key-modal');
      if (this.aiCtrl.pendingAction) { this.aiCtrl.pendingAction(); this.aiCtrl.pendingAction = null; }
    }
  }

  private _handleOpenSimpleMonitor() {
    const smOverlay = this._els.simpleMonitorOverlay;
    this._simpleMonitorActive = true;
    smOverlay.classList.remove('hidden'); smOverlay.classList.add('flex');
    this.gpsCtrl.updateSimpleMonitor(this._simpleMonitorActive);
    this._smClockInterval = setInterval(() => { const now = new Date(); assertEl('sm-time').textContent = now.toLocaleTimeString(I18N.locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }, 1000);
  }

  private _handleCloseSimpleMonitor() {
    const smOverlay = this._els.simpleMonitorOverlay;
    this._simpleMonitorActive = false;
    smOverlay.classList.add('hidden'); smOverlay.classList.remove('flex');
    if (this._smClockInterval) clearInterval(this._smClockInterval);
  }

  private _handleToggleNightRed() {
    const smOverlay = this._els.simpleMonitorOverlay;
    this._simpleMonitorRedFilter = !this._simpleMonitorRedFilter;
    smOverlay.style.filter = this._simpleMonitorRedFilter ? 'sepia(100%) hue-rotate(-30deg) saturate(300%) brightness(40%)' : '';
    assertEl('sm-toggle-nightred').innerHTML = this._simpleMonitorRedFilter
      ? `<i data-lucide="sun" class="w-4 h-4 inline mr-1"></i> ${I18N.t.smNormalFilter}`
      : `<i data-lucide="sun-dim" class="w-4 h-4 inline mr-1"></i> ${I18N.t.smRedFilter}`;
    createIcons({ icons });
  }

  private _handleOpenQrScan() {
    UI.showModal('qr-scan-modal');
    assertEl('qr-scan-result').classList.add('hidden');
    assertEl('qr-scan-error').classList.add('hidden');
    assertEl('qr-scan-connect').classList.add('hidden');
    this._qrScannedData = null;
    this._startQrScanner();
  }

  private _handleQrConnect() {
    if (this._qrScannedData?.wsUrl) {
      this.syncCtrl.connect(this._qrScannedData.wsUrl);
      (document.getElementById('ws-url-input') as HTMLInputElement).value = this._qrScannedData.wsUrl;
      this._stopQrScanner();
      UI.hideModal('qr-scan-modal');
    }
  }
}
