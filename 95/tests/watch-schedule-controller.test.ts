import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WatchScheduleController } from '../src/modules/anchor/controllers/watch-schedule.controller';

function makeState(overrides = {}) {
  return {
    watchActive: false, watchEndTime: null, watchMinutes: 10,
    schedule: [] as any[],
    ...overrides,
  } as any;
}

function makeMockEls() {
  const banner = document.createElement('div');
  banner.id = 'active-watch-banner';
  banner.classList.add('hidden');
  const name = document.createElement('span');
  name.id = 'active-watch-name';
  const badge = document.createElement('span');
  badge.id = 'watch-badge';
  const scheduleList = document.createElement('div');
  scheduleList.id = 'schedule-list';
  document.body.append(banner, name, badge, scheduleList);
  return { activeWatchBanner: banner, activeWatchName: name, watchBadge: badge } as any;
}

function makeMockAlert() {
  return { playBeep: vi.fn(), initPermissions: vi.fn() } as any;
}

function makeMockSync() {
  return { send: vi.fn() } as any;
}

describe('WatchScheduleController', () => {
  let ctrl: WatchScheduleController;
  let state: ReturnType<typeof makeState>;
  let els: ReturnType<typeof makeMockEls>;
  let alertCtrl: ReturnType<typeof makeMockAlert>;
  let syncCtrl: ReturnType<typeof makeMockSync>;

  beforeEach(() => {
    state = makeState();
    els = makeMockEls();
    alertCtrl = makeMockAlert();
    syncCtrl = makeMockSync();
    ctrl = new WatchScheduleController(state, alertCtrl, syncCtrl, els);
  });

  afterEach(() => {
    ['active-watch-banner', 'active-watch-name', 'watch-badge', 'schedule-list'].forEach(id =>
      document.getElementById(id)?.remove()
    );
  });

  describe('loadSchedule', () => {
    it('returns empty array when nothing stored', () => {
      expect(ctrl.loadSchedule()).toEqual([]);
    });

    it('returns stored schedule', () => {
      const schedule = [{ start: '08:00', end: '12:00', person: 'Alice' }];
      localStorage.setItem('anchor_schedule', JSON.stringify(schedule));
      expect(ctrl.loadSchedule()).toEqual(schedule);
    });

    it('returns empty array for invalid JSON', () => {
      localStorage.setItem('anchor_schedule', '{broken');
      expect(ctrl.loadSchedule()).toEqual([]);
    });

    it('returns empty array for non-array JSON', () => {
      localStorage.setItem('anchor_schedule', '"not-array"');
      expect(ctrl.loadSchedule()).toEqual([]);
    });
  });

  describe('debouncedSaveSchedule', () => {
    it('saves schedule to localStorage after debounce', async () => {
      state.schedule = [{ start: '08:00', end: '12:00', person: 'Bob' }];
      ctrl.debouncedSaveSchedule();
      await new Promise((r) => setTimeout(r, 350));
      expect(JSON.parse(localStorage.getItem('anchor_schedule')!)).toEqual(state.schedule);
    });
  });

  describe('checkWatchTimer', () => {
    it('does nothing when watch not active', () => {
      state.watchActive = false;
      ctrl.checkWatchTimer();
      expect(alertCtrl.playBeep).not.toHaveBeenCalled();
    });

    it('triggers alarm when watch time expired', () => {
      state.watchActive = true;
      state.watchEndTime = Date.now() - 1000;
      ctrl.checkWatchTimer();
      expect(state.watchActive).toBe(false);
      expect(alertCtrl.playBeep).toHaveBeenCalledWith('sine');
      expect(syncCtrl.send).toHaveBeenCalledWith('TRIGGER_ALARM', expect.objectContaining({ reason: 'WATCH_TIMER' }));
    });

    it('does nothing when watch time not expired', () => {
      state.watchActive = true;
      state.watchEndTime = Date.now() + 60000;
      ctrl.checkWatchTimer();
      expect(state.watchActive).toBe(true);
      expect(alertCtrl.playBeep).not.toHaveBeenCalled();
    });
  });

  describe('checkSchedule', () => {
    it('hides banner when no schedule', () => {
      state.schedule = [];
      ctrl.checkSchedule();
      expect(els.activeWatchBanner.classList.contains('hidden')).toBe(true);
    });

    it('shows banner when current time matches schedule', () => {
      const now = new Date();
      const start = `${String(now.getHours()).padStart(2, '0')}:00`;
      const end = `${String(now.getHours() + 1).padStart(2, '0')}:00`;
      state.schedule = [{ start, end, person: 'Alice' }];
      ctrl.checkSchedule();
      expect(els.activeWatchBanner.classList.contains('hidden')).toBe(false);
      expect(document.getElementById('active-watch-name')!.textContent).toBe('Alice');
    });
  });

  describe('renderScheduleList', () => {
    it('renders schedule items as DOM elements', () => {
      state.schedule = [
        { start: '08:00', end: '12:00', person: 'Alice' },
        { start: '12:00', end: '16:00', person: 'Bob' },
      ];
      ctrl.renderScheduleList();
      const list = document.getElementById('schedule-list')!;
      expect(list.children.length).toBe(2);
      expect(list.innerHTML).toContain('Alice');
      expect(list.innerHTML).toContain('Bob');
    });

    it('renders empty list when no schedule', () => {
      state.schedule = [];
      ctrl.renderScheduleList();
      const list = document.getElementById('schedule-list')!;
      expect(list.children.length).toBe(0);
    });
  });
});
