/**
 * SessionController — DB init, state persistence, track point buffering, anchor lifecycle.
 */

import L from 'leaflet';
import type { AppState, CachedElements } from '../anchor-app';
import type { SessionDB, TrackPoint } from '../session-db';
import type { MapController } from '../map-controller';
import type { AlertController } from '../alert-controller';
import type { AlarmEngine } from '../alarm-engine';
import type { SyncController } from '../sync-controller';
import { GeoUtils } from '../geo-utils';
import { UI } from '../ui-utils';
import { formatDuration } from '../anchor-utils';

export class SessionController {
  private _trackPointBuffer: Omit<TrackPoint, 'id'>[] = [];
  private _trackFlushInterval: ReturnType<typeof setInterval> | null = null;
  private _TRACK_BUFFER_MAX = 1000;
  private _TRACK_BUFFER_WARN = 800;

  constructor(
    private state: AppState,
    private db: SessionDB,
    private mapCtrl: MapController,
    private alertCtrl: AlertController,
    private alarmEngine: AlarmEngine,
    private syncCtrl: SyncController,
    private _els: CachedElements,
    private callbacks: {
      recalculateZone: () => void;
      recalculate: () => void;
      updateAlarmStateBar: () => void;
      syncUI: () => void;
      generateLogbookEntry: () => void;
      persistActiveState: () => void;
    },
  ) {}

  async initDB() {
    try {
      await this.db.open();
      await this.restoreActiveState();
    } catch (err) {
      console.error('IndexedDB init failed:', err);
    }
  }

  async restoreActiveState() {
    const saved = await this.db.getActiveState();
    if (!saved || !saved.isAnchored) return;

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

    this.callbacks.recalculateZone();
    this.startTrackFlushing();
  }

  persistActiveState() {
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

  startTrackFlushing() {
    if (this._trackFlushInterval) clearInterval(this._trackFlushInterval);
    this._trackFlushInterval = setInterval(() => this.flushTrackPoints(), 10000);
  }

  async flushTrackPoints() {
    if (this._trackPointBuffer.length === 0 || !this.state.sessionId) return;
    const batch = this._trackPointBuffer.splice(0);
    try {
      await this.db.addTrackPointsBatch(batch);
    } catch (err) {
      console.warn('Track flush failed:', err);
    }
    this.persistActiveState();
  }

  bufferTrackPoint(point: Omit<TrackPoint, 'id'>) {
    this._trackPointBuffer.push(point);
    if (this._trackPointBuffer.length > this._TRACK_BUFFER_WARN) {
      console.warn(
        `[SessionController] Track buffer at ${this._trackPointBuffer.length}/${this._TRACK_BUFFER_MAX} — triggering emergency flush`,
      );
      this.flushTrackPoints();
    }
    if (this._trackPointBuffer.length > this._TRACK_BUFFER_MAX) {
      const dropped = this._trackPointBuffer.length - this._TRACK_BUFFER_MAX;
      console.warn(`[SessionController] Dropping ${dropped} oldest track points`);
      this._trackPointBuffer.splice(0, dropped);
    }
  }

  get trackBufferLength(): number {
    return this._trackPointBuffer.length;
  }

  get hasBufferedPoints(): boolean {
    return this._trackPointBuffer.length > 0;
  }

  async setAnchor(latlng: L.LatLng) {
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
    this.callbacks.recalculateZone();
    this.mapCtrl.fitSafeZone();
    this.state.mapAutoCenter = true;
    document.getElementById('center-map-btn')!.classList.add('hidden');
    this.callbacks.updateAlarmStateBar();

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
        this.persistActiveState();
        this.startTrackFlushing();
      } catch (err) {
        console.warn('Failed to create session:', err);
      }
    }

    if (this.syncCtrl.isConnected) this.syncCtrl.sendFullSync();
  }

  async liftAnchor() {
    this.callbacks.generateLogbookEntry();
    await this.flushTrackPoints();

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
    this.callbacks.updateAlarmStateBar();
    this.callbacks.syncUI();

    if (this.syncCtrl.isConnected) {
      this.syncCtrl.send('DISCONNECT', { reason: 'SESSION_ENDED' });
    }
  }

  formatDuration(ms: number): string {
    return formatDuration(ms);
  }

  cleanup() {
    if (this._trackFlushInterval) clearInterval(this._trackFlushInterval);
  }
}
