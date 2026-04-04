import { I18N } from './i18n';
import { UI } from './ui-utils';

interface BatteryManager extends EventTarget {
  charging: boolean;
  level: number;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
}

export class AlertController {
  audioCtx: AudioContext | null = null;
  private alarmInterval: ReturnType<typeof setInterval> | null = null;
  private batteryInterval: ReturnType<typeof setInterval> | null = null;
  private wakeLock: WakeLockSentinel | null = null;
  batteryWarningShown = false;
  isAlarming = false;
  lastKnownBatteryLevel = 1.0;
  lastKnownChargingState = false;
  private _batteryRef: BatteryManager | null = null;
  private _batteryCheck: (() => void) | null = null;
  private _isAnchored: (() => boolean) | null = null;
  private _onBatteryWarning: ((data: { reason: string; message: string; alarmState: string }) => void) | null = null;

  constructor() {
    this._initBatteryMonitor();
  }

  configureBatteryCallbacks(
    isAnchored: () => boolean,
    onBatteryWarning: (data: { reason: string; message: string; alarmState: string }) => void,
  ) {
    this._isAnchored = isAnchored;
    this._onBatteryWarning = onBatteryWarning;
  }

  initPermissions() {
    if (!this.audioCtx) this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
    this.requestWakeLock();
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }

  async requestWakeLock() {
    try {
      if ('wakeLock' in navigator) this.wakeLock = await navigator.wakeLock.request('screen');
    } catch (err) {
      console.warn('WakeLock error:', err);
    }
  }

  releaseWakeLock() {
    if (this.wakeLock) this.wakeLock.release().then(() => (this.wakeLock = null));
  }

  playBeep(type: 'square' | 'warning' | 'sine' = 'square') {
    if (!this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    if (type === 'square') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, this.audioCtx.currentTime);
      osc.frequency.setValueAtTime(1200, this.audioCtx.currentTime + 0.2);
      gain.gain.setValueAtTime(1, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.4);
      osc.stop(this.audioCtx.currentTime + 0.5);
    } else if (type === 'warning') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.5, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.3);
      osc.stop(this.audioCtx.currentTime + 0.4);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(0, this.audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.5, this.audioCtx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 1);
      osc.stop(this.audioCtx.currentTime + 1);
    }
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start();
  }

  triggerNotification(msg: string) {
    if ('Notification' in window && Notification.permission === 'granted') {
      navigator.serviceWorker.ready
        .then((reg) => reg.showNotification(I18N.t.notifTitle, { body: msg, vibrate: [500, 200, 500] } as NotificationOptions))
        .catch(() => new Notification(I18N.t.notifTitle, { body: msg }));
    }
  }

  startForState(alarmState: string, reason: string, distStr: string) {
    if (alarmState === 'ALARM') {
      this.start(reason, distStr);
    } else if (alarmState === 'WARNING') {
      if (!this.isAlarming) {
        this.isAlarming = true;
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        this.playBeep('warning');
        this.triggerNotification(I18N.fmt(I18N.t.notifWarning, { reason, dist: distStr }));
        document.getElementById('stop-alarm-btn')!.classList.remove('hidden');
      }
    }
  }

  start(reason: string, distStr: string) {
    if (this.isAlarming) return;
    this.isAlarming = true;
    document.getElementById('app-body')!.classList.add('bg-alarm-active');
    document.getElementById('stop-alarm-btn')!.classList.remove('hidden');
    if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
    this.playBeep('square');
    this.triggerNotification(`${reason} ${I18N.t.dashDistance}: ${distStr}`);
    this.alarmInterval = setInterval(() => {
      this.playBeep('square');
      if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
    }, 1000);
  }

  stop() {
    this.isAlarming = false;
    document.getElementById('app-body')!.classList.remove('bg-alarm-active');
    document.getElementById('stop-alarm-btn')!.classList.add('hidden');
    if (this.alarmInterval) clearInterval(this.alarmInterval);
  }

  private _initBatteryMonitor() {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((b: BatteryManager) => {
        this._batteryRef = b;
        this.lastKnownBatteryLevel = b.level;
        this.lastKnownChargingState = b.charging;
        this._batteryCheck = () => {
          this.lastKnownBatteryLevel = b.level;
          this.lastKnownChargingState = b.charging;
          if (
            b.level <= 0.15 &&
            !b.charging &&
            this._isAnchored?.() &&
            !this.batteryWarningShown
          ) {
            this.batteryWarningShown = true;
            UI.showModal('battery-modal');
            this.playBeep('square');
            this._onBatteryWarning?.({
              reason: 'LOW_BATTERY',
              message: 'iPad battery critically low!',
              alarmState: 'WARNING',
            });
          }
          if (b.charging) this.batteryWarningShown = false;
        };
        b.addEventListener('levelchange', this._batteryCheck);
        b.addEventListener('chargingchange', this._batteryCheck);
        this.batteryInterval = setInterval(this._batteryCheck, 60000);
      });
    }
  }

  cleanup() {
    if (this.alarmInterval) clearInterval(this.alarmInterval);
    if (this.batteryInterval) clearInterval(this.batteryInterval);
    if (this._batteryRef && this._batteryCheck) {
      this._batteryRef.removeEventListener('levelchange', this._batteryCheck);
      this._batteryRef.removeEventListener('chargingchange', this._batteryCheck);
      this._batteryRef = null;
      this._batteryCheck = null;
    }
    this.releaseWakeLock();
  }
}
