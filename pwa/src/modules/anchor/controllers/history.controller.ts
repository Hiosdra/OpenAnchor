/**
 * HistoryController — Session history list, replay, GPX/CSV export.
 */

import L from 'leaflet';
import { createIcons, icons } from 'lucide';
import type { AppState } from '../anchor-app';
import type { SessionDB, TrackPoint } from '../session-db';
import { I18N } from '../i18n';
import { UI } from '../ui-utils';
import { formatDuration, buildGPX, buildCSV } from '../anchor-utils';

export class HistoryController {
  constructor(
    private state: AppState,
    private db: SessionDB,
  ) {}

  async showHistory() {
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
        const duration = session.endTime ? formatDuration(session.endTime - session.startTime) : I18N.t.histActive;
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
        div.addEventListener('click', () => this.showReplay(session.id!));
        list.appendChild(div);
      }
    } catch (err: any) {
      list.innerHTML = `<div class="text-red-400 text-sm text-center py-4">${I18N.t.errPrefix} ${err.message}</div>`;
    }
  }

  async showReplay(sessionId: number) {
    UI.showModal('replay-modal');
    const info = document.getElementById('replay-info')!;
    info.innerHTML = `<div class="text-slate-500 text-sm">${I18N.t.histLoading}</div>`;
    try {
      const session = await this.db.getSession(sessionId);
      const points = await this.db.getTrackPoints(sessionId);
      if (!session) { info.innerHTML = `<div class="text-red-400">${I18N.t.replayNotFound}</div>`; return; }

      const startDate = new Date(session.startTime);
      const duration = session.endTime ? formatDuration(session.endTime - session.startTime) : I18N.t.histActive;
      info.innerHTML = `
        <div class="flex justify-between"><span class="text-slate-400">${I18N.t.replayDate}</span><span class="text-white font-mono">${startDate.toLocaleDateString(I18N.locale)} ${startDate.toLocaleTimeString(I18N.locale, { hour: '2-digit', minute: '2-digit' })}</span></div>
        <div class="flex justify-between"><span class="text-slate-400">${I18N.t.replayDuration}</span><span class="text-white">${duration}</span></div>
        <div class="flex justify-between"><span class="text-slate-400">${I18N.t.replayRadius}</span><span class="text-white">${Math.round(session.radius)}m</span></div>
        <div class="flex justify-between"><span class="text-slate-400">${I18N.t.replayMaxDev}</span><span class="text-white">${Math.round(session.maxDistance || 0)}m</span></div>
        <div class="flex justify-between"><span class="text-slate-400">${I18N.t.replayAlarms}</span><span class="${session.alarmTriggered ? 'text-red-400' : 'text-green-400'}">${session.alarmCount || 0}</span></div>
        <div class="flex justify-between"><span class="text-slate-400">${I18N.t.replayPoints}</span><span class="text-white">${points.length}</span></div>
      `;
      this.renderReplayMap(session, points);

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
            createIcons({ icons });
          }
        } catch (_) { /* ignore */ }
      }

      document.getElementById('replay-export-btn')!.onclick = () => this.exportSessionGPX(session, points);
      const csvBtn = document.getElementById('replay-export-csv-btn');
      if (csvBtn) csvBtn.onclick = () => this.exportSessionCSV(session, points);
      document.getElementById('replay-delete-btn')!.onclick = async () => {
        if (confirm(I18N.t.replayConfirm)) {
          await this.db.deleteSession(sessionId);
          if (this.db.db) { try { await this.db.deleteLogbookEntries(sessionId); } catch (_) { /* ignore */ } }
          UI.hideModal('replay-modal');
          this.showHistory();
        }
      };
    } catch (err: any) {
      info.innerHTML = `<div class="text-red-400">${I18N.t.errPrefix} ${err.message}</div>`;
    }
  }

  renderReplayMap(session: any, points: TrackPoint[]) {
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

  exportSessionGPX(session: any, points: TrackPoint[]) {
    const gpx = buildGPX(session, points);
    if (!gpx) return;
    const startDate = new Date(session.startTime);
    const a = document.createElement('a');
    const url = URL.createObjectURL(new Blob([gpx], { type: 'application/gpx+xml' }));
    a.href = url;
    a.download = `openanchor_${startDate.toISOString().slice(0, 10)}_${startDate.toISOString().slice(11, 16).replace(':', '')}.gpx`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  exportSessionCSV(session: any, points: TrackPoint[]) {
    const csv = buildCSV(points);
    if (!csv) return;
    const startDate = new Date(session.startTime);
    const a = document.createElement('a');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.href = url;
    a.download = `openanchor_${startDate.toISOString().slice(0, 10)}_${startDate.toISOString().slice(11, 16).replace(':', '')}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  private _escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
