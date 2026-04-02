/**
 * AlarmStateController — Position processing, zone recalculation, alarm state bar updates.
 */

import type { AppState, CachedElements } from '../anchor-app';
import type { SessionDB } from '../session-db';
import type { MapController } from '../map-controller';
import type { AlertController } from '../alert-controller';
import type { SyncController } from '../sync-controller';
import { AlarmEngine } from '../alarm-engine';
import { GeoUtils } from '../geo-utils';
import { I18N } from '../i18n';
import { UI } from '../ui-utils';

export class AlarmStateController {
  constructor(
    private state: AppState,
    private db: SessionDB,
    private alarmEngine: AlarmEngine,
    private mapCtrl: MapController,
    private alertCtrl: AlertController,
    private syncCtrl: SyncController,
    private _els: CachedElements,
    private callbacks: {
      syncUI: () => void;
      updateSimpleMonitor: () => void;
      isSimpleMonitorActive: () => boolean;
    },
  ) {}

  recalculateZone() {
    if (!this.state.isAnchored || !this.state.anchorPos) return;
    this.mapCtrl.drawSafeZone(
      this.state.anchorPos,
      this.state.radius,
      this.state.bufferRadius,
      { enabled: this.state.sectorEnabled, bearing: this.state.sectorBearing, width: this.state.sectorWidth },
      this.state.alarmState,
    );
  }

  recalculate() {
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
      this.state.currentPos,
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

    this.updateAlarmStateBar();
    this.recalculateZone();
    this.callbacks.syncUI();

    if (this.callbacks.isSimpleMonitorActive()) this.callbacks.updateSimpleMonitor();
  }

  updateAlarmStateBar() {
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
    const iconMap: Record<string, string> = { SAFE: '⚓', CAUTION: '🌊', WARNING: '⚠️', ALARM: '🚨' };

    bar.classList.add(`alarm-bar-${this.state.alarmState.toLowerCase()}`);
    const icon = iconMap[this.state.alarmState] || '';
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
}
