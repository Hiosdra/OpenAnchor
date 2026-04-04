/**
 * GPSController — GPS initialization, cleanup, watchdog, battery saver, simple monitor.
 */

import type { AppState, CachedElements } from '../anchor-app';
import type { AlertController } from '../alert-controller';
import type { SyncController } from '../sync-controller';
import { GeoUtils } from '../geo-utils';
import { I18N } from '../i18n';
import { UI } from '../ui-utils';
import { throttle } from '../ui-utils';
import { isGpsSignalLost, shouldActivateBatterySaver } from '../anchor-utils';

export class GPSController {
  lastGpsFixTime: number;
  gpsWatchdogAlerted = false;

  private GPS_WATCHDOG_TIMEOUT = 60000;
  private _batterySaverActive = false;
  private gpsWatchId: number | null = null;
  private _smRafPending = false;
  private _throttledOnPosition: ((pos: GeolocationPosition) => void) & { cancel(): void } = null!;

  constructor(
    private state: AppState,
    private alertCtrl: AlertController,
    private syncCtrl: SyncController,
    private _els: CachedElements,
    private onPosition: (position: GeolocationPosition) => void,
  ) {
    this.lastGpsFixTime = Date.now();
  }

  initGPS() {
    if (!('geolocation' in navigator)) {
      this._els.noSignalOverlay?.classList.remove('hidden');
      return;
    }
    const gpsOptions: PositionOptions = this._batterySaverActive
      ? { enableHighAccuracy: false, maximumAge: 5000, timeout: 10000 }
      : { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 };
    this._throttledOnPosition = throttle((pos: GeolocationPosition) => this.onPosition(pos), 500);
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
      gpsOptions,
    );
  }

  cleanupGPS() {
    if (this._throttledOnPosition) this._throttledOnPosition.cancel();
    if (this.gpsWatchId !== null) {
      navigator.geolocation.clearWatch(this.gpsWatchId);
      this.gpsWatchId = null;
    }
  }

  checkGpsWatchdog() {
    if (!this.state.isAnchored || !this.state.hasGpsFix) return;
    const elapsed = Date.now() - this.lastGpsFixTime;
    const signalLost = isGpsSignalLost(elapsed, this.GPS_WATCHDOG_TIMEOUT);

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

  checkBatterySaver() {
    const level = this.alertCtrl.lastKnownBatteryLevel;
    const charging = this.alertCtrl.lastKnownChargingState;
    const shouldSave = shouldActivateBatterySaver(level, charging);

    if (shouldSave && !this._batterySaverActive) {
      this._batterySaverActive = true;
      this.cleanupGPS();
      this.initGPS();
      const badge = document.getElementById('battery-saver-badge');
      if (badge) badge.classList.remove('hidden');
    } else if (!shouldSave && this._batterySaverActive) {
      this._batterySaverActive = false;
      this.cleanupGPS();
      this.initGPS();
      const badge = document.getElementById('battery-saver-badge');
      if (badge) badge.classList.add('hidden');
    }
  }

  updateSimpleMonitor(simpleMonitorActive: boolean) {
    if (!simpleMonitorActive || this._smRafPending) return;
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
}
