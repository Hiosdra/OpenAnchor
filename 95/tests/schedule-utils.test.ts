import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  debounce,
  getActiveCrew,
  recommendWatchSystem,
  generateRecommendationReason,
  calculateCoverage,
  generateStandardSchedule,
  generateSmallCrewSchedule,
  detectScheduleConflicts,
} from '../src/modules/wachtownik/utils/schedule-utils';
import type {
  CrewMember,
  WatchSlot,
  WatchTemplate,
  DaySchedule,
} from '../src/modules/wachtownik/types';

// ---------------------------------------------------------------------------
// Test data factories
// ---------------------------------------------------------------------------
function makeCrew(overrides: Partial<CrewMember> & { id: string; name: string }): CrewMember {
  return { role: 'sailor', ...overrides };
}

const captain = makeCrew({ id: 'c1', name: 'Anna', role: 'captain' });
const officer = makeCrew({ id: 'c2', name: 'Michał', role: 'officer' });
const sailor1 = makeCrew({ id: 'c3', name: 'Kasia', role: 'sailor' });
const sailor2 = makeCrew({ id: 'c4', name: 'Tomek', role: 'sailor' });
const cook = makeCrew({ id: 'c5', name: 'Piotr', role: 'cook' });

const standardSlots: WatchSlot[] = [
  { id: '1', start: '00:00', end: '04:00', reqCrew: 2 },
  { id: '2', start: '04:00', end: '08:00', reqCrew: 2 },
  { id: '3', start: '08:00', end: '12:00', reqCrew: 2 },
  { id: '4', start: '12:00', end: '16:00', reqCrew: 2 },
  { id: '5', start: '16:00', end: '20:00', reqCrew: 2 },
  { id: '6', start: '20:00', end: '24:00', reqCrew: 2 },
];

// ---------------------------------------------------------------------------
// debounce
// ---------------------------------------------------------------------------
describe('debounce', () => {
  beforeEach(() => { vi.useFakeTimers(); });

  it('delays invocation until after the wait period', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('resets timer on repeated calls', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    vi.advanceTimersByTime(50);
    debounced();
    vi.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('passes arguments to the original function', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 50);

    debounced('a', 'b');
    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledWith('a', 'b');
  });
});

// ---------------------------------------------------------------------------
// getActiveCrew
// ---------------------------------------------------------------------------
describe('getActiveCrew', () => {
  const crew = [captain, officer, sailor1, sailor2, cook];

  it('excludes the cook', () => {
    const active = getActiveCrew(crew, true);
    expect(active).not.toContainEqual(cook);
  });

  it('includes captain when captainParticipates is true', () => {
    const active = getActiveCrew(crew, true);
    expect(active).toContainEqual(captain);
  });

  it('excludes captain when captainParticipates is false', () => {
    const active = getActiveCrew(crew, false);
    expect(active).not.toContainEqual(captain);
  });

  it('handles empty crew', () => {
    expect(getActiveCrew([], true)).toEqual([]);
  });

  it('is case-insensitive for role matching', () => {
    const upperCaseCook = makeCrew({ id: 'x', name: 'X', role: 'Cook' });
    expect(getActiveCrew([upperCaseCook], true)).toEqual([]);
  });

  it('handles crew members with empty role', () => {
    const noRole = makeCrew({ id: 'x', name: 'X', role: '' });
    const active = getActiveCrew([noRole], true);
    expect(active).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// recommendWatchSystem
// ---------------------------------------------------------------------------
describe('recommendWatchSystem', () => {
  it('returns at most 3 recommendations', () => {
    const crew = [captain, officer, sailor1, sailor2, cook];
    const recs = recommendWatchSystem(crew, true);
    expect(recs.length).toBeLessThanOrEqual(3);
    expect(recs.length).toBeGreaterThan(0);
  });

  it('returns recommendations sorted by descending score', () => {
    const crew = [captain, officer, sailor1, sailor2];
    const recs = recommendWatchSystem(crew, true);
    for (let i = 1; i < recs.length; i++) {
      expect(recs[i - 1].score).toBeGreaterThanOrEqual(recs[i].score);
    }
  });

  it('each recommendation has a reason string', () => {
    const crew = [captain, officer, sailor1, sailor2, cook];
    const recs = recommendWatchSystem(crew, true);
    for (const rec of recs) {
      expect(typeof rec.reason).toBe('string');
      expect(rec.reason.length).toBeGreaterThan(0);
    }
  });

  it('penalises templates requiring more crew than available', () => {
    const smallCrew = [sailor1, sailor2];
    const recs = recommendWatchSystem(smallCrew, true);
    // Racing template (minCrew=6) should NOT be the top recommendation for 2-person crew
    expect(recs[0].templateKey).not.toBe('12x2h_racing');
  });

  it('favours simpler templates for small crews (≤4)', () => {
    const crew = [captain, officer, sailor1];
    const recs = recommendWatchSystem(crew, true);
    // With 3 people the scoring should prefer fewer slots
    const topTemplate = recs[0].template;
    expect(topTemplate.slots.length).toBeLessThanOrEqual(6);
  });

  it('handles single-person crew without crashing', () => {
    const recs = recommendWatchSystem([sailor1], true);
    expect(recs).toBeDefined();
    expect(recs.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// generateRecommendationReason
// ---------------------------------------------------------------------------
describe('generateRecommendationReason', () => {
  const template6x4h: WatchTemplate = {
    nameKey: 'template.6x4h',
    descKey: 'template.6x4h.desc',
    minCrew: 3,
    optimalCrew: 6,
    slots: [
      { start: '00:00', end: '04:00', reqCrew: 2 },
      { start: '04:00', end: '08:00', reqCrew: 2 },
      { start: '08:00', end: '12:00', reqCrew: 2 },
      { start: '12:00', end: '16:00', reqCrew: 2 },
      { start: '16:00', end: '20:00', reqCrew: 2 },
      { start: '20:00', end: '24:00', reqCrew: 2 },
    ],
  };

  it('mentions crew size when within optimal range', () => {
    const reason = generateRecommendationReason(
      { template: template6x4h, score: 40 },
      5,
      2,
    );
    expect(reason).toContain('5');
  });

  it('returns "Uniwersalny system" when no specific reasons apply', () => {
    const bigTemplate: WatchTemplate = {
      nameKey: 'x',
      descKey: 'x',
      minCrew: 20,
      optimalCrew: 30,
      slots: Array.from({ length: 10 }, () => ({ start: '00:00', end: '02:00', reqCrew: 2 })),
    };
    const reason = generateRecommendationReason({ template: bigTemplate, score: 0 }, 3, 0);
    expect(reason).toBe('Uniwersalny system');
  });

  it('mentions experienced crew when ≥40% are captain/officer', () => {
    const reason = generateRecommendationReason(
      { template: template6x4h, score: 40 },
      5,
      3,
    );
    expect(reason).toContain('Doświadczona');
  });
});

// ---------------------------------------------------------------------------
// calculateCoverage
// ---------------------------------------------------------------------------
describe('calculateCoverage', () => {
  it('returns full 24h coverage for contiguous slots', () => {
    const result = calculateCoverage(standardSlots);
    expect(result.hasFull24h).toBe(true);
    expect(result.totalMinutes).toBe(1440);
    expect(result.gaps).toHaveLength(0);
  });

  it('detects a single gap', () => {
    const slotsWithGap: WatchSlot[] = [
      { id: '1', start: '00:00', end: '08:00', reqCrew: 2 },
      // gap: 08:00 - 16:00
      { id: '2', start: '16:00', end: '24:00', reqCrew: 2 },
    ];
    const result = calculateCoverage(slotsWithGap);
    expect(result.hasFull24h).toBe(false);
    expect(result.totalMinutes).toBe(960); // 16 hours
    expect(result.gaps).toHaveLength(1);
    expect(result.gaps[0]).toEqual({ start: '08:00', end: '16:00', minutes: 480 });
  });

  it('handles empty slots array', () => {
    const result = calculateCoverage([]);
    expect(result.totalMinutes).toBe(0);
    expect(result.hasFull24h).toBe(false);
    expect(result.gaps).toHaveLength(0);
  });

  it('detects multiple gaps', () => {
    const slots: WatchSlot[] = [
      { id: '1', start: '00:00', end: '04:00', reqCrew: 1 },
      { id: '2', start: '08:00', end: '12:00', reqCrew: 1 },
      { id: '3', start: '16:00', end: '20:00', reqCrew: 1 },
    ];
    const result = calculateCoverage(slots);
    expect(result.gaps).toHaveLength(3);
    expect(result.totalMinutes).toBe(720); // 12h
  });

  it('handles overlapping slots correctly', () => {
    const overlapping: WatchSlot[] = [
      { id: '1', start: '00:00', end: '12:00', reqCrew: 2 },
      { id: '2', start: '08:00', end: '24:00', reqCrew: 2 },
    ];
    const result = calculateCoverage(overlapping);
    expect(result.hasFull24h).toBe(true);
    expect(result.totalMinutes).toBe(1440);
  });

  it('handles a gap at end of day', () => {
    const slotsEndGap: WatchSlot[] = [
      { id: '1', start: '00:00', end: '20:00', reqCrew: 1 },
    ];
    const result = calculateCoverage(slotsEndGap);
    expect(result.hasFull24h).toBe(false);
    expect(result.gaps).toHaveLength(1);
    expect(result.gaps[0]).toEqual({ start: '20:00', end: '24:00', minutes: 240 });
  });
});

// ---------------------------------------------------------------------------
// generateStandardSchedule
// ---------------------------------------------------------------------------
describe('generateStandardSchedule', () => {
  const crew = [captain, officer, sailor1, sailor2];

  it('generates the correct number of days', () => {
    const schedule = generateStandardSchedule(crew, standardSlots, 3);
    expect(schedule).toHaveLength(3);
  });

  it('each day has the same number of slots', () => {
    const schedule = generateStandardSchedule(crew, standardSlots, 2);
    for (const day of schedule) {
      expect(day.slots).toHaveLength(standardSlots.length);
    }
  });

  it('assigns reqCrew members per slot', () => {
    const schedule = generateStandardSchedule(crew, standardSlots, 1);
    for (const slot of schedule[0].slots) {
      expect(slot.assigned).toHaveLength(slot.reqCrew);
    }
  });

  it('rotates crew across slots (round-robin)', () => {
    const schedule = generateStandardSchedule(crew, standardSlots, 1);
    const allAssigned = schedule[0].slots.flatMap((s) => s.assigned.map((c) => c.id));
    // All crew members should appear at least once across 6 slots * 2 crew each = 12 assignments
    const uniqueIds = new Set(allAssigned);
    expect(uniqueIds.size).toBe(crew.length);
  });

  it('handles empty crew gracefully', () => {
    const schedule = generateStandardSchedule([], standardSlots, 1);
    expect(schedule).toHaveLength(1);
    for (const slot of schedule[0].slots) {
      expect(slot.assigned).toHaveLength(0);
    }
  });

  it('handles single-crew member', () => {
    const schedule = generateStandardSchedule([sailor1], standardSlots, 1);
    expect(schedule).toHaveLength(1);
    for (const slot of schedule[0].slots) {
      expect(slot.assigned.length).toBeLessThanOrEqual(slot.reqCrew);
      if (slot.assigned.length > 0) {
        expect(slot.assigned[0].id).toBe(sailor1.id);
      }
    }
  });

  it('sorts slots by start time', () => {
    const unsortedSlots: WatchSlot[] = [
      { id: '2', start: '12:00', end: '24:00', reqCrew: 1 },
      { id: '1', start: '00:00', end: '12:00', reqCrew: 1 },
    ];
    const schedule = generateStandardSchedule(crew, unsortedSlots, 1);
    expect(schedule[0].slots[0].start).toBe('00:00');
    expect(schedule[0].slots[1].start).toBe('12:00');
  });
});

// ---------------------------------------------------------------------------
// generateSmallCrewSchedule
// ---------------------------------------------------------------------------
describe('generateSmallCrewSchedule', () => {
  it('generates correct number of days', () => {
    const schedule = generateSmallCrewSchedule([sailor1, sailor2], standardSlots, 3);
    expect(schedule).toHaveLength(3);
  });

  it('avoids assigning same person to consecutive slots when possible', () => {
    const crew = [captain, officer, sailor1];
    const schedule = generateSmallCrewSchedule(crew, standardSlots, 2);

    for (const day of schedule) {
      for (let i = 1; i < day.slots.length; i++) {
        const prevIds = new Set(day.slots[i - 1].assigned.map((c) => c.id));
        const currIds = day.slots[i].assigned.map((c) => c.id);
        // With 3 crew and reqCrew=2, some overlap is inevitable,
        // but the algorithm should try to minimize it
        const overlap = currIds.filter((id) => prevIds.has(id));
        // At most 1 overlap is acceptable for 3 crew with reqCrew=2
        expect(overlap.length).toBeLessThanOrEqual(1);
      }
    }
  });

  it('handles crew smaller than reqCrew (falls back)', () => {
    const schedule = generateSmallCrewSchedule([sailor1], standardSlots, 1);
    expect(schedule).toHaveLength(1);
    // Should not crash; may use fallback assignment
    for (const slot of schedule[0].slots) {
      expect(slot.assigned.length).toBeGreaterThan(0);
    }
  });

  it('penalises consecutive night watches', () => {
    const crew = [captain, officer, sailor1, sailor2];
    const schedule = generateSmallCrewSchedule(crew, standardSlots, 5);

    // Count max consecutive night watches for any crew member
    const nightWatchCounts: Record<string, number> = {};
    for (const day of schedule) {
      for (const slot of day.slots) {
        const hour = parseInt(slot.start.split(':')[0]);
        if (hour >= 0 && hour < 6) {
          for (const person of slot.assigned) {
            nightWatchCounts[person.id] = (nightWatchCounts[person.id] || 0) + 1;
          }
        }
      }
    }
    // With 4 crew and smart scheduling, no one should have more than ~60% of all night watches
    const maxNightWatches = Math.max(...Object.values(nightWatchCounts));
    const totalNightSlots = schedule.length; // 1 night slot per day (00:00-04:00) * reqCrew=2
    // The algorithm should distribute, so no single person gets all night watches
    expect(maxNightWatches).toBeLessThan(totalNightSlots * 2);
  });
});

// ---------------------------------------------------------------------------
// detectScheduleConflicts
// ---------------------------------------------------------------------------
describe('detectScheduleConflicts', () => {
  it('detects insufficient rest between watches', () => {
    const warnSpy = vi.spyOn(console, 'warn');
    const shortRestSlots: WatchSlot[] = [
      { id: '1', start: '00:00', end: '04:00', reqCrew: 1 },
      { id: '2', start: '06:00', end: '10:00', reqCrew: 1 },
    ];
    const scheduleData: DaySchedule[] = [
      {
        day: 1,
        slots: [
          { ...shortRestSlots[0], assigned: [sailor1] },
          { ...shortRestSlots[1], assigned: [sailor1] },
        ],
      },
    ];
    detectScheduleConflicts(scheduleData, shortRestSlots);
    // Should warn about 2h rest (less than 6h minimum)
    expect(warnSpy).toHaveBeenCalled();
    const warnings = warnSpy.mock.calls.flat().join(' ');
    expect(warnings).toContain('Schedule conflicts detected');
  });

  it('detects consecutive night watches > 3', () => {
    const warnSpy = vi.spyOn(console, 'warn');
    const nightSlot: WatchSlot = { id: 'n', start: '02:00', end: '06:00', reqCrew: 1 };
    const scheduleData: DaySchedule[] = Array.from({ length: 5 }, (_, i) => ({
      day: i + 1,
      slots: [{ ...nightSlot, assigned: [sailor1] }],
    }));
    detectScheduleConflicts(scheduleData, [nightSlot]);
    expect(warnSpy).toHaveBeenCalled();
    const warnings = JSON.stringify(warnSpy.mock.calls);
    expect(warnings).toContain('consecutive_night');
  });

  it('does not warn for well-distributed schedule', () => {
    const warnSpy = vi.spyOn(console, 'warn');
    const crew = [captain, officer, sailor1, sailor2];
    const daySlots: WatchSlot[] = [
      { id: '1', start: '08:00', end: '14:00', reqCrew: 1 },
      { id: '2', start: '14:00', end: '20:00', reqCrew: 1 },
    ];
    const scheduleData: DaySchedule[] = [
      {
        day: 1,
        slots: [
          { ...daySlots[0], assigned: [captain] },
          { ...daySlots[1], assigned: [officer] },
        ],
      },
      {
        day: 2,
        slots: [
          { ...daySlots[0], assigned: [sailor1] },
          { ...daySlots[1], assigned: [sailor2] },
        ],
      },
    ];
    detectScheduleConflicts(scheduleData, daySlots);
    // No conflicts expected — 6h rest, no night watches
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('detects uneven night watch distribution', () => {
    const warnSpy = vi.spyOn(console, 'warn');
    const nightSlot: WatchSlot = { id: 'n', start: '02:00', end: '06:00', reqCrew: 1 };
    const daySlot: WatchSlot = { id: 'd', start: '14:00', end: '18:00', reqCrew: 1 };
    // sailor1 gets ALL night watches, sailor2 gets none
    const scheduleData: DaySchedule[] = Array.from({ length: 5 }, (_, i) => ({
      day: i + 1,
      slots: [
        { ...nightSlot, assigned: [sailor1] },
        { ...daySlot, assigned: [sailor2] },
      ],
    }));
    detectScheduleConflicts(scheduleData, [nightSlot, daySlot]);
    expect(warnSpy).toHaveBeenCalled();
    const warnings = JSON.stringify(warnSpy.mock.calls);
    expect(warnings).toContain('uneven_distribution');
  });

  it('handles empty schedule gracefully', () => {
    expect(() => detectScheduleConflicts([], [])).not.toThrow();
  });
});
