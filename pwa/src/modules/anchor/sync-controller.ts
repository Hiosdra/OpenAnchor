import L from 'leaflet';
import { createIcons, icons } from 'lucide';
import { I18N } from './i18n';
import { UI } from './ui-utils';
import { ReconnectStrategy } from './reconnect-strategy';
import type { AnchorApp } from './anchor-app';

export class SyncController {
  app: AnchorApp;
  private ws: WebSocket | null = null;
  url: string;
  isConnected = false;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  lastPeerPingTime: number | null = null;
  peerConnectionLost = false;
  private _reconnect = new ReconnectStrategy();
  private _lastSentStateHash: string | null = null;

  constructor(appContext: AnchorApp) {
    this.app = appContext;
    this.url = localStorage.getItem('anchor_ws_url') || '';
  }

  connect(url: string) {
    this._reconnect.reset();
    if (this.ws) this._closeSocket();
    this.url = url;
    localStorage.setItem('anchor_ws_url', url);
    this._doConnect();
  }

  private _doConnect() {
    try {
      this.ws = new WebSocket(this.url);
      this.ws.onopen = () => this._onOpen();
      this.ws.onclose = () => this._onClose();
      this.ws.onerror = (e) => this._onError(e);
      this.ws.onmessage = (msg) => this._onMessage(msg);
    } catch (err) {
      console.error('WS Connect error', err);
      this._onClose();
    }
  }

  disconnect(reason = 'USER_DISCONNECT') {
    this._reconnect.markIntentional();
    if (this.ws) {
      if (this.isConnected) this.send('DISCONNECT', { reason });
      this._closeSocket();
    }
    this._onClose();
  }

  private _closeSocket() {
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }

  send(type: string, payload: Record<string, any> = {}) {
    if (!this.isConnected || !this.ws) return;
    const msg = JSON.stringify({ type, timestamp: Date.now(), payload });
    this.ws.send(msg);
  }

  sendFullSync() {
    const s = this.app.state;
    const payload: Record<string, any> = {
      isAnchored: s.isAnchored,
      anchorPos: s.anchorPos,
      zoneType: s.sectorEnabled ? 'SECTOR' : 'CIRCLE',
      radiusMeters: s.radius,
      bufferRadiusMeters: s.bufferRadius,
      units: s.unit,
    };
    if (s.sectorEnabled) {
      payload.sector = {
        bearingDeg: s.sectorBearing,
        halfAngleDeg: s.sectorWidth / 2,
        radiusMeters: s.radius * 1.5,
      };
    }
    if (s.chainLengthM != null) payload.chainLengthM = s.chainLengthM;
    if (s.depthM != null) payload.depthM = s.depthM;
    this.send('FULL_SYNC', payload);
  }

  checkHeartbeat() {
    if (!this.isConnected || !this.lastPeerPingTime) return;
    const elapsed = Date.now() - this.lastPeerPingTime;
    if (elapsed > 15000 && !this.peerConnectionLost) {
      this.peerConnectionLost = true;
      document.getElementById('ws-status-icon')!.classList.replace('text-green-400', 'text-orange-400');
      document.getElementById('warning-title')!.innerHTML = `<i data-lucide="wifi-off" class="text-orange-500"></i> ${I18N.t.wsConnLost}`;
      document.getElementById('warning-text')!.textContent = I18N.t.wsConnLostBody;
      UI.showModal('warning-modal');
      createIcons({ icons });
      this._closeSocket();
      this._onClose();
    }
  }

  private _onOpen() {
    this.isConnected = true;
    this._reconnect.onConnected();
    this.lastPeerPingTime = Date.now();
    this.peerConnectionLost = false;
    document.getElementById('ws-status-icon')!.classList.replace('text-slate-600', 'text-green-400');
    const banner = document.getElementById('ws-connection-banner');
    if (banner) banner.classList.add('hidden');

    this.sendFullSync();

    this.pingInterval = setInterval(() => this.send('PING'), 5000);
    this._lastSentStateHash = null;

    this.syncInterval = setInterval(() => {
      const payload = {
        currentPos: this.app.state.currentPos,
        gpsAccuracy: this.app.state.accuracy,
        distanceToAnchor: this.app.state.distance,
        alarmState: this.app.state.alarmState,
        sog: this.app.state.sog,
        cog: this.app.state.cog,
        batteryLevel: this.app.alertCtrl.lastKnownBatteryLevel || 1.0,
        isCharging: this.app.alertCtrl.lastKnownChargingState || false,
      };
      const hash = JSON.stringify(payload);
      if (hash !== this._lastSentStateHash) {
        this._lastSentStateHash = hash;
        this.send('STATE_UPDATE', payload);
      }
    }, 2000);
  }

  private _onClose() {
    const wasConnected = this.isConnected;
    this.isConnected = false;
    this.lastPeerPingTime = null;
    this.peerConnectionLost = false;
    document.getElementById('ws-status-icon')?.classList.replace('text-green-400', 'text-slate-600');
    document.getElementById('ws-status-icon')?.classList.replace('text-orange-400', 'text-slate-600');
    if (wasConnected) {
      const banner = document.getElementById('ws-connection-banner');
      if (banner) banner.classList.remove('hidden');
    }
    const peerBat = document.getElementById('peer-battery');
    if (peerBat) peerBat.classList.add('hidden');
    const driftBanner = document.getElementById('peer-drift-banner');
    if (driftBanner) driftBanner.classList.add('hidden');
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.syncInterval) clearInterval(this.syncInterval);

    if (this.url) {
      const delay = this._reconnect.schedule(() => {
        if (!this.isConnected && this.url) {
          console.log(`WS: reconnecting to ${this.url}`);
          this._doConnect();
        }
      });
      if (delay !== null) {
        console.log(`WS: scheduling reconnect #${this._reconnect.attempts} in ${delay}ms`);
      }
    }
  }

  private _onError(e: Event) {
    console.warn('WS Error', e);
  }

  private _onMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      if (!data || typeof data.type !== 'string') {
        console.warn('WS: Invalid message structure', data);
        return;
      }

      if (data.type === 'PING') {
        this.lastPeerPingTime = Date.now();
        if (this.peerConnectionLost) {
          this.peerConnectionLost = false;
          document.getElementById('ws-status-icon')!.classList.replace('text-orange-400', 'text-green-400');
        }
        return;
      }

      if (data.type === 'ACTION_COMMAND') {
        if (!data.payload || typeof data.payload.command !== 'string') {
          console.warn('WS: Invalid ACTION_COMMAND payload', data);
          return;
        }
        const cmd = data.payload.command;
        if (cmd === 'MUTE_ALARM') {
          this.app.alertCtrl.stop();
          this.app.alertCtrl.isAlarming = true;
          setTimeout(() => { this.app.alertCtrl.isAlarming = false; }, 5000);
        } else if (cmd === 'DISMISS_ALARM') {
          this.app.alertCtrl.stop();
          this.app.alarmEngine.reset();
          this.app.state.alarmState = 'SAFE';
          this.app._updateAlarmStateBar();
        }
      }

      if (data.type === 'ANDROID_GPS_REPORT' && data.payload) {
        const p = data.payload;
        if (p.pos && typeof p.pos.lat === 'number' && typeof p.pos.lng === 'number') {
          this.app.mapCtrl.updatePhoneMarker(L.latLng(p.pos.lat, p.pos.lng), p.accuracy || 0);
        }
        const peerBatEl = document.getElementById('peer-battery');
        if (typeof p.batteryLevel === 'number' && peerBatEl) {
          peerBatEl.textContent = p.batteryLevel + '%';
          peerBatEl.classList.remove('hidden');
          peerBatEl.className =
            'text-[10px] ' +
            (p.batteryLevel <= 15 ? 'text-red-400' : p.batteryLevel <= 30 ? 'text-orange-400' : 'text-green-400');
          peerBatEl.title =
            I18N.fmt(I18N.t.peerBatteryTooltip, { level: p.batteryLevel }) +
            (p.isCharging ? ` ${I18N.t.peerBatteryCharging}` : '');
        }
        const driftBanner = document.getElementById('peer-drift-banner');
        const driftText = document.getElementById('peer-drift-text');
        if (driftBanner && p.driftDetected === true) {
          const bearing = typeof p.driftBearingDeg === 'number' ? p.driftBearingDeg.toFixed(0) + '°' : '?';
          const speed = typeof p.driftSpeedMps === 'number' ? (p.driftSpeedMps * 60).toFixed(1) + ' m/min' : '?';
          if (driftText) driftText.textContent = I18N.fmt(I18N.t.peerDriftMsg, { bearing, speed });
          driftBanner.classList.remove('hidden');
        } else if (driftBanner) {
          driftBanner.classList.add('hidden');
        }
      }
    } catch (err) {
      console.error('WS: Failed to parse message:', err);
    }
  }
}
