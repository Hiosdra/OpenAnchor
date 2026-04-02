import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CrewMember, WatchSlot, DaySchedule, AbsoluteSlot } from '../src/modules/wachtownik/types';

// Pure logic functions from hooks
import { computeAbsoluteSlots, computeDashboard, computeCrewStats } from '../src/modules/wachtownik/hooks/useScheduleEngine';
import { snapshotsEqual, pushSnapshot } from '../src/modules/wachtownik/hooks/useUndoRedo';
import { applyDrop } from '../src/modules/wachtownik/hooks/useDragDrop';
import { validateSlotTime } from '../src/modules/wachtownik/hooks/useWatchSlots';
import { decodeShareHash, loadFromLocalStorage, applyLoadedState } from '../src/modules/wachtownik/hooks/usePersistence';
import { buildShareUrlLocal } from '../src/modules/wachtownik/hooks/useExportShare';
import { detectLocale } from '../src/modules/wachtownik/hooks/useAppSettings';

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
const crew: CrewMember[] = [
  { id: 'c1', name: 'Anna', role: 'captain' },
  { id: 'c2', name: 'Michał', role: 'officer' },
  { id: 'c3', name: 'Kasia', role: 'sailor' },
  { id: 'c4', name: 'Tomek', role: 'sailor' },
];

const slots: WatchSlot[] = [
  { id: 's1', start: '00:00', end: '06:00', reqCrew: 2 },
  { id: 's2', start: '06:00', end: '12:00', reqCrew: 2 },
  { id: 's3', start: '12:00', end: '18:00', reqCrew: 2 },
  { id: 's4', start: '18:00', end: '24:00', reqCrew: 2 },
];

function makeSchedule(daysCount = 2): DaySchedule[] {
  return Array.from({ length: daysCount }, (_, i) => ({
    day: i + 1,
    slots: slots.map((s) => ({
      ...s,
      assigned: [crew[0], crew[1]],
    })),
  }));
}

// ---------------------------------------------------------------------------
// computeAbsoluteSlots
// ---------------------------------------------------------------------------
describe('computeAbsoluteSlots', () => {
  it('creates absolute timestamps for each slot', () => {
    const schedule = makeSchedule(1);
    const absolute = computeAbsoluteSlots(schedule, '2025-07-01');
    expect(absolute).toHaveLength(4);
    expect(absolute[0].absoluteStart.getFullYear()).toBe(2025);
    expect(absolute[0].absoluteStart.getMonth()).toBe(6); // July = 6
    expect(absolute[0].absoluteStart.getDate()).toBe(1);
    expect(absolute[0].dayNumber).toBe(1);
  });

  it('sorts by absolute start time', () => {
    const schedule = makeSchedule(2);
    const absolute = computeAbsoluteSlots(schedule, '2025-07-01');
    for (let i = 1; i < absolute.length; i++) {
      expect(absolute[i].absoluteStart.getTime()).toBeGreaterThanOrEqual(
        absolute[i - 1].absoluteStart.getTime(),
      );
    }
  });

  it('handles midnight crossing (24:00 end)', () => {
    const schedule: DaySchedule[] = [
      {
        day: 1,
        slots: [{ id: 's1', start: '22:00', end: '24:00', reqCrew: 1, assigned: [crew[0]] }],
      },
    ];
    const absolute = computeAbsoluteSlots(schedule, '2025-07-01');
    expect(absolute[0].absoluteEnd.getDate()).toBe(2);
  });

  it('returns empty array for empty schedule', () => {
    expect(computeAbsoluteSlots([], '2025-07-01')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// computeDashboard
// ---------------------------------------------------------------------------
describe('computeDashboard', () => {
  it('returns PRZED REJSEM when current time is before trip start', () => {
    const absolute = computeAbsoluteSlots(makeSchedule(1), '2030-01-01');
    const result = computeDashboard(absolute, new Date('2025-01-01T00:00:00'));
    expect(result.status).toBe('PRZED REJSEM');
    expect(result.nextSlot).not.toBeNull();
  });

  it('returns ZAKOŃCZONY when current time is after trip end', () => {
    const absolute = computeAbsoluteSlots(makeSchedule(1), '2020-01-01');
    const result = computeDashboard(absolute, new Date('2025-01-01T00:00:00'));
    expect(result.status).toBe('ZAKOŃCZONY');
    expect(result.progress).toBe(100);
  });

  it('returns W TRAKCIE with current slot when time is during a watch', () => {
    const absolute = computeAbsoluteSlots(makeSchedule(1), '2025-07-01');
    const during = new Date('2025-07-01T03:00:00');
    const result = computeDashboard(absolute, during);
    expect(result.status).toBe('W TRAKCIE');
    expect(result.currentSlot).not.toBeNull();
    expect(result.progress).toBeGreaterThan(0);
    expect(result.progress).toBeLessThan(100);
  });

  it('returns empty dashboard for no slots', () => {
    const result = computeDashboard([], new Date());
    expect(result.status).toBe('PRZED REJSEM');
    expect(result.progress).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// computeCrewStats
// ---------------------------------------------------------------------------
describe('computeCrewStats', () => {
  it('computes hours and hard watches per crew member', () => {
    const absolute = computeAbsoluteSlots(makeSchedule(1), '2025-07-01');
    const stats = computeCrewStats(crew, absolute);
    expect(stats).toHaveLength(crew.length);

    // Anna and Michał are assigned, Kasia and Tomek are not
    const anna = stats.find((s) => s.id === 'c1')!;
    expect(anna.totalHours).toBeGreaterThan(0);
  });

  it('returns zero hours for unassigned crew', () => {
    const absolute = computeAbsoluteSlots(makeSchedule(1), '2025-07-01');
    const stats = computeCrewStats(crew, absolute);
    const kasia = stats.find((s) => s.id === 'c3')!;
    expect(kasia.totalHours).toBe(0);
    expect(kasia.hardWatches).toBe(0);
  });

  it('counts night watches (0-5h) as hard watches', () => {
    const schedule: DaySchedule[] = [
      {
        day: 1,
        slots: [
          { id: 's1', start: '02:00', end: '06:00', reqCrew: 1, assigned: [crew[0]] },
          { id: 's2', start: '14:00', end: '18:00', reqCrew: 1, assigned: [crew[0]] },
        ],
      },
    ];
    const absolute = computeAbsoluteSlots(schedule, '2025-07-01');
    const stats = computeCrewStats([crew[0]], absolute);
    expect(stats[0].hardWatches).toBe(1); // Only the 02:00 slot
  });
});

// ---------------------------------------------------------------------------
// snapshotsEqual & pushSnapshot (undo/redo)
// ---------------------------------------------------------------------------
describe('snapshotsEqual', () => {
  it('returns false for null previous', () => {
    expect(snapshotsEqual(null, { crew: [], slots: [], schedule: [] })).toBe(false);
  });

  it('returns true for identical snapshots', () => {
    const snap = { crew: [crew[0]], slots: [slots[0]], schedule: [] };
    expect(snapshotsEqual(snap, { ...snap })).toBe(true);
  });

  it('returns false when crew differs', () => {
    const a = { crew: [crew[0]], slots: [], schedule: [] };
    const b = { crew: [crew[1]], slots: [], schedule: [] };
    expect(snapshotsEqual(a, b)).toBe(false);
  });
});

describe('pushSnapshot', () => {
  it('adds a snapshot to empty history', () => {
    const snap = { crew: [], slots: [], schedule: [] };
    const result = pushSnapshot([], -1, snap);
    expect(result.history).toHaveLength(1);
    expect(result.historyIndex).toBe(0);
  });

  it('skips duplicate snapshots', () => {
    const snap = { crew: [], slots: [], schedule: [] };
    const first = pushSnapshot([], -1, snap);
    const second = pushSnapshot(first.history, first.historyIndex, snap);
    expect(second.history).toHaveLength(1);
    expect(second.historyIndex).toBe(0);
  });

  it('truncates future history on push', () => {
    const s1 = { crew: [crew[0]], slots: [], schedule: [] };
    const s2 = { crew: [crew[1]], slots: [], schedule: [] };
    const s3 = { crew: [crew[2]], slots: [], schedule: [] };

    let result = pushSnapshot([], -1, s1);
    result = pushSnapshot(result.history, result.historyIndex, s2);
    // Simulate undo (index back to 0), then push a new state
    result = pushSnapshot(result.history, 0, s3);
    expect(result.history).toHaveLength(2); // s1 + s3, s2 was truncated
  });

  it('limits history to MAX_HISTORY (20)', () => {
    let history: ReturnType<typeof pushSnapshot>['history'] = [];
    let index = -1;
    for (let i = 0; i < 25; i++) {
      const snap = { crew: [{ id: `c${i}`, name: `Person${i}`, role: 'sailor' }], slots: [], schedule: [] };
      const result = pushSnapshot(history, index, snap);
      history = result.history;
      index = result.historyIndex;
    }
    expect(history.length).toBeLessThanOrEqual(20);
  });
});

// ---------------------------------------------------------------------------
// applyDrop (drag & drop)
// ---------------------------------------------------------------------------
describe('applyDrop', () => {
  it('swaps two crew members between slots', () => {
    const schedule: DaySchedule[] = [
      {
        day: 1,
        slots: [
          { id: 's1', start: '00:00', end: '06:00', reqCrew: 2, assigned: [crew[0], crew[1]] },
          { id: 's2', start: '06:00', end: '12:00', reqCrew: 2, assigned: [crew[2], crew[3]] },
        ],
      },
    ];

    const result = applyDrop(
      schedule,
      { dayIdx: 0, slotIdx: 0, pIdx: 0 },
      { dayIdx: 0, slotIdx: 1, pIdx: 0 },
    );

    expect(result[0].slots[0].assigned[0].id).toBe('c3'); // Kasia swapped in
    expect(result[0].slots[1].assigned[0].id).toBe('c1'); // Anna swapped in
  });

  it('does not mutate the original schedule', () => {
    const schedule: DaySchedule[] = [
      {
        day: 1,
        slots: [
          { id: 's1', start: '00:00', end: '06:00', reqCrew: 1, assigned: [crew[0]] },
          { id: 's2', start: '06:00', end: '12:00', reqCrew: 1, assigned: [crew[1]] },
        ],
      },
    ];

    const original = JSON.parse(JSON.stringify(schedule));
    applyDrop(schedule, { dayIdx: 0, slotIdx: 0, pIdx: 0 }, { dayIdx: 0, slotIdx: 1, pIdx: 0 });
    expect(schedule).toEqual(original);
  });
});

// ---------------------------------------------------------------------------
// validateSlotTime
// ---------------------------------------------------------------------------
describe('validateSlotTime', () => {
  beforeEach(() => {
    window.alert = vi.fn();
  });

  it('returns true for valid time change', () => {
    const testSlots: WatchSlot[] = [{ id: 's1', start: '08:00', end: '12:00', reqCrew: 1 }];
    expect(validateSlotTime(testSlots, 's1', 'start', '06:00', 'pl-PL')).toBe(true);
  });

  it('returns false when end is before start', () => {
    const testSlots: WatchSlot[] = [{ id: 's1', start: '08:00', end: '12:00', reqCrew: 1 }];
    expect(validateSlotTime(testSlots, 's1', 'end', '06:00', 'pl-PL')).toBe(false);
  });

  it('returns false when overlap detected', () => {
    const testSlots: WatchSlot[] = [
      { id: 's1', start: '08:00', end: '12:00', reqCrew: 1 },
      { id: 's2', start: '10:00', end: '14:00', reqCrew: 1 },
    ];
    expect(validateSlotTime(testSlots, 's1', 'end', '16:00', 'pl-PL')).toBe(false);
  });

  it('returns true for non-existent slot id', () => {
    expect(validateSlotTime([], 'nonexistent', 'start', '08:00', 'pl-PL')).toBe(true);
  });

  it('allows 24:00 as end time', () => {
    const testSlots: WatchSlot[] = [{ id: 's1', start: '20:00', end: '22:00', reqCrew: 1 }];
    expect(validateSlotTime(testSlots, 's1', 'end', '24:00', 'pl-PL')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// decodeShareHash (persistence)
// ---------------------------------------------------------------------------
describe('decodeShareHash', () => {
  it('returns null state for empty hash', () => {
    expect(decodeShareHash('')).toEqual({ state: null, readOnly: false });
  });

  it('returns null state for unknown hash prefix', () => {
    expect(decodeShareHash('#unknown=data')).toEqual({ state: null, readOnly: false });
  });

  it('returns null state for non-compressed share link', () => {
    const result = decodeShareHash('#share=notcompressed');
    expect(result.state).toBeNull();
  });

  it('decodes read-only share link', () => {
    const state = {
      crew: [{ id: 'c1', name: 'Test', role: 'sailor' }],
      slots: [],
      days: 7,
      startDate: '2025-01-01',
      schedule: [],
      isGenerated: false,
      isNightMode: false,
      captainParticipates: true,
    };
    const encoded = btoa(encodeURIComponent(JSON.stringify(state)));
    const result = decodeShareHash(`#share-readonly=${encoded}`);
    expect(result.readOnly).toBe(true);
    expect(result.state).not.toBeNull();
    expect(result.state!.crew[0].name).toBe('Test');
  });

  it('returns null for corrupted readonly link', () => {
    const result = decodeShareHash('#share-readonly=corrupted!!!');
    expect(result.state).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// loadFromLocalStorage
// ---------------------------------------------------------------------------
describe('loadFromLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when no data stored', () => {
    expect(loadFromLocalStorage()).toBeNull();
  });

  it('returns parsed state from localStorage', () => {
    const state = { crew: [], slots: [], days: 7 };
    localStorage.setItem('sailingSchedulePro', JSON.stringify(state));
    const result = loadFromLocalStorage();
    expect(result).toEqual(state);
  });

  it('returns null for corrupted JSON', () => {
    localStorage.setItem('sailingSchedulePro', 'not valid json');
    expect(loadFromLocalStorage()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// applyLoadedState
// ---------------------------------------------------------------------------
describe('applyLoadedState', () => {
  it('calls setters with loaded state', () => {
    const setters = {
      setCrew: vi.fn(),
      setSlots: vi.fn(),
      setSchedule: vi.fn(),
      setIsGenerated: vi.fn(),
      setDays: vi.fn(),
      setStartDate: vi.fn(),
      setIsNightMode: vi.fn(),
      setCaptainParticipates: vi.fn(),
      setActiveTab: vi.fn(),
    };

    const state = {
      crew: [{ id: 'c1', name: 'Test', role: 'sailor' }],
      slots: [{ id: 's1', start: '00:00', end: '06:00', reqCrew: 1 }],
      days: 14,
      startDate: '2025-06-01',
      schedule: [],
      isGenerated: false,
      isNightMode: true,
      captainParticipates: false,
    };

    applyLoadedState(state, setters, false);

    expect(setters.setCrew).toHaveBeenCalledWith(state.crew);
    expect(setters.setSlots).toHaveBeenCalledWith(state.slots);
    expect(setters.setDays).toHaveBeenCalledWith(14);
    expect(setters.setStartDate).toHaveBeenCalledWith('2025-06-01');
    expect(setters.setIsNightMode).toHaveBeenCalledWith(true);
    expect(setters.setCaptainParticipates).toHaveBeenCalledWith(false);
  });

  it('handles legacy crew format (string array)', () => {
    const setters = {
      setCrew: vi.fn(),
      setSlots: vi.fn(),
      setSchedule: vi.fn(),
      setIsGenerated: vi.fn(),
      setDays: vi.fn(),
      setStartDate: vi.fn(),
      setIsNightMode: vi.fn(),
      setCaptainParticipates: vi.fn(),
      setActiveTab: vi.fn(),
    };

    const state = { crew: ['Anna', 'Michał'] } as any;
    applyLoadedState(state, setters, false);

    expect(setters.setCrew).toHaveBeenCalled();
    const calledCrew = setters.setCrew.mock.calls[0][0];
    expect(calledCrew[0].name).toBe('Anna');
    expect(calledCrew[0].role).toBe('sailor');
    expect(setters.setIsGenerated).toHaveBeenCalledWith(false);
  });

  it('sets activeTab to schedule in read-only mode with generated schedule', () => {
    const setters = {
      setCrew: vi.fn(),
      setSlots: vi.fn(),
      setSchedule: vi.fn(),
      setIsGenerated: vi.fn(),
      setDays: vi.fn(),
      setStartDate: vi.fn(),
      setIsNightMode: vi.fn(),
      setCaptainParticipates: vi.fn(),
      setActiveTab: vi.fn(),
    };

    const state = { crew: [], isGenerated: true, schedule: [{ day: 1, slots: [] }] } as any;
    applyLoadedState(state, setters, true);
    expect(setters.setActiveTab).toHaveBeenCalledWith('schedule');
  });
});

// ---------------------------------------------------------------------------
// buildShareUrlLocal
// ---------------------------------------------------------------------------
describe('buildShareUrlLocal', () => {
  it('creates compressed share URL for editable mode', () => {
    const state = {
      crew: [{ id: 'c1', name: 'Test', role: 'sailor' }],
      slots: [],
      days: 7,
      startDate: '2025-01-01',
      schedule: [],
      isGenerated: false,
      isNightMode: false,
      captainParticipates: true,
    };

    const url = buildShareUrlLocal(state, false);
    expect(url).toContain('#share=c:');
  });

  it('creates base64 share URL for read-only mode', () => {
    const state = {
      crew: [],
      slots: [],
      days: 7,
      startDate: '2025-01-01',
      schedule: [],
      isGenerated: false,
      isNightMode: false,
      captainParticipates: true,
    };

    const url = buildShareUrlLocal(state, true);
    expect(url).toContain('#share-readonly=');
  });
});

// ---------------------------------------------------------------------------
// detectLocale
// ---------------------------------------------------------------------------
describe('detectLocale', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns saved locale from localStorage', () => {
    localStorage.setItem('wachtownik_language', 'en-US');
    expect(detectLocale()).toBe('en-US');
  });

  it('falls back to pl-PL for non-English browsers', () => {
    // Default happy-dom navigator.language
    expect(detectLocale()).toBe('pl-PL');
  });
});
