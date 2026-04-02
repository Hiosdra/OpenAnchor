/**
 * WatchScheduleController — Watch timer, schedule management, schedule rendering.
 */

import { createIcons, icons } from 'lucide';
import type { AppState, CachedElements } from '../anchor-app';
import type { AlertController } from '../alert-controller';
import type { SyncController } from '../sync-controller';
import { I18N } from '../i18n';
import { UI } from '../ui-utils';
import { findActiveScheduleSlot, type ScheduleItem } from '../anchor-utils';

export class WatchScheduleController {
  private _scheduleSaveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private state: AppState,
    private alertCtrl: AlertController,
    private syncCtrl: SyncController,
    private _els: CachedElements,
  ) {}

  loadSchedule(): ScheduleItem[] {
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

  debouncedSaveSchedule() {
    if (this._scheduleSaveTimer) clearTimeout(this._scheduleSaveTimer);
    this._scheduleSaveTimer = setTimeout(() => {
      try {
        localStorage.setItem('anchor_schedule', JSON.stringify(this.state.schedule));
      } catch (e) {
        console.warn('Failed to save schedule:', e);
      }
    }, 300);
  }

  checkWatchTimer() {
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

  checkSchedule() {
    const banner = this._els.activeWatchBanner || document.getElementById('active-watch-banner');
    if (!banner) return;
    if (this.state.schedule.length === 0) {
      banner.classList.add('hidden');
      return;
    }
    const now = new Date();
    const currentVal = now.getHours() * 60 + now.getMinutes();
    const activePerson = findActiveScheduleSlot(this.state.schedule, currentVal);

    if (activePerson) {
      document.getElementById('active-watch-name')!.textContent = activePerson.person;
      banner.classList.remove('hidden');
    } else {
      banner.classList.add('hidden');
    }
  }

  renderScheduleList() {
    const list = document.getElementById('schedule-list')!;
    list.innerHTML = '';
    this.state.schedule.forEach((item, index) => {
      const div = document.createElement('div');
      div.className = 'flex justify-between items-center bg-slate-800 p-2 rounded border border-slate-700 text-xs';
      div.innerHTML = `<span class="text-blue-400 font-mono">${item.start} - ${item.end}</span><span class="text-white font-bold truncate px-2">${item.person}</span><button class="text-red-400 hover:text-red-300 transition-colors" data-idx="${index}"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>`;
      div.querySelector('button')!.addEventListener('click', (e) => {
        this.state.schedule.splice(Number((e.currentTarget as HTMLElement).dataset.idx), 1);
        this.debouncedSaveSchedule();
        this.renderScheduleList();
      });
      list.appendChild(div);
    });
    createIcons({ icons });
    this.checkSchedule();
  }
}
