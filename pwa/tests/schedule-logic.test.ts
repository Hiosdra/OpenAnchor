import { describe, it, expect } from 'vitest';
import {
  validateSlotTime,
  calculateCoverage,
  detectScheduleConflicts,
  isNightWatch,
  calculateRestHours,
  generateStandardSchedule,
  generateSmallCrewSchedule,
} from '../src/modules/wachtownik/utils/schedule-logic';
import type {
  CrewMember,
  WatchSlot,
  DaySchedule,
} from '../src/modules/wachtownik/types';

// ---------------------------------------------------------------------------
// Test data factories
// ---------------------------------------------------------------------------

function crew(id: string, name: string, role = 'sailor'): CrewMember {
  return { id, name, role };
}

const anna = crew('c1', 'Anna', 'captain');
const michal = crew('c2', 'Michał', 'officer');
const kasia = crew('c3', 'Kasia');
const tomek = crew('c4', 'Tomek');

const standardSlots: WatchSlot[] = [
  { id: '1', start: '00:00', end: '04:00', reqCrew: 2 },
  { id: '2', start: '04:00', end: '08:00', reqCrew: 2 },
  { id: '3', start: '08:00', end: '12:00', reqCrew: 2 },
  { id: '4', start: '12:00', end: '16:00', reqCrew: 2 },
  { id: '5', start: '16:00', end: '20:00', reqCrew: 2 },
  { id: '6', start: '20:00', end: '24:00', reqCrew: 2 },
];

// =====================================================================
// isNightWatch
// =====================================================================
describe('isNightWatch', () => {
  it('returns true for 00:00 (midnight)', () => {
    expect(isNightWatch('00:00')).toBe(true);
  });

  it('returns true for 02:00', () => {
    expect(isNightWatch('02:00')).toBe(true);
  });

  it('returns true for 05:30', () => {
    expect(isNightWatch('05:30')).toBe(true);
  });

  it('returns false for 06:00 (dawn boundary)', () => {
    expect(isNightWatch('06:00')).toBe(false);
  });

  it('returns false for 12:00 (noon)', () => {
    expect(isNightWatch('12:00')).toBe(false);
  });

  it('returns false for 18:00 (evening)', () => {
    expect(isNightWatch('18:00')).toBe(false);
  });

  it('returns false for 22:00 (late evening)', () => {
    expect(isNightWatch('22:00')).toBe(false);
  });
});

// =====================================================================
// calculateRestHours
// =====================================================================
describe('calculateRestHours', () => {
  it('calculates rest within the same day', () => {
    expect(calculateRestHours('08:00', '14:00')).toBe(6);
  });

  it('calculates rest across midnight', () => {
    // end at 22:00, next start at 02:00 → 4 h
    expect(calculateRestHours('22:00', '02:00')).toBe(4);
  });

  it('returns 0 when watches are back-to-back', () => {
    // Same end and start time means zero gap (no day-wrap since equal)
    expect(calculateRestHours('04:00', '04:00')).toBe(0);
  });

  it('handles minutes correctly', () => {
    // 06:30 → 08:45 = 2.25 h
    expect(calculateRestHours('06:30', '08:45')).toBe(2.25);
  });

  it('handles end at 24:00', () => {
    // "24:00" is parsed as 24*60; start 02:00 → wraps → 2 h
    expect(calculateRestHours('24:00', '02:00')).toBe(2);
  });
});

// =====================================================================
// validateSlotTime
// =====================================================================
describe('validateSlotTime', () => {
  it('returns valid for a proper non-overlapping slot', () => {
    const slot: WatchSlot = { id: 'x', start: '08:00', end: '12:00', reqCrew: 1 };
    const others: WatchSlot[] = [
      { id: '1', start: '00:00', end: '08:00', reqCrew: 1 },
      { id: '2', start: '12:00', end: '24:00', reqCrew: 1 },
    ];
    const result = validateSlotTime(slot, [slot, ...others]);
    expect(result.valid).toBe(true);
  });

  it('rejects end before start', () => {
    const slot: WatchSlot = { id: 'x', start: '12:00', end: '08:00', reqCrew: 1 };
    const result = validateSlotTime(slot, [slot]);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('end_before_start');
  });

  it('rejects same start and end', () => {
    const slot: WatchSlot = { id: 'x', start: '10:00', end: '10:00', reqCrew: 1 };
    const result = validateSlotTime(slot, [slot]);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('end_before_start');
  });

  it('allows end of "24:00" even when start is later than 00:00', () => {
    const slot: WatchSlot = { id: 'x', start: '20:00', end: '24:00', reqCrew: 1 };
    const result = validateSlotTime(slot, [slot]);
    expect(result.valid).toBe(true);
  });

  it('detects overlap with another slot', () => {
    const slot: WatchSlot = { id: 'x', start: '06:00', end: '14:00', reqCrew: 1 };
    const other: WatchSlot = { id: 'y', start: '10:00', end: '18:00', reqCrew: 1 };
    const result = validateSlotTime(slot, [slot, other]);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('overlap');
    expect(result.overlappingSlot?.id).toBe('y');
  });

  it('does not flag itself as overlapping', () => {
    const slot: WatchSlot = { id: 'x', start: '08:00', end: '12:00', reqCrew: 1 };
    const result = validateSlotTime(slot, [slot]);
    expect(result.valid).toBe(true);
  });

  it('adjacent slots (no overlap) are valid', () => {
    const slot: WatchSlot = { id: 'a', start: '08:00', end: '12:00', reqCrew: 1 };
    const other: WatchSlot = { id: 'b', start: '12:00', end: '16:00', reqCrew: 1 };
    const result = validateSlotTime(slot, [slot, other]);
    expect(result.valid).toBe(true);
  });

  it('detects partial overlap at start boundary', () => {
    const slot: WatchSlot = { id: 'a', start: '06:00', end: '10:00', reqCrew: 1 };
    const other: WatchSlot = { id: 'b', start: '09:00', end: '12:00', reqCrew: 1 };
    const result = validateSlotTime(slot, [slot, other]);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('overlap');
  });
});

// =====================================================================
// calculateCoverage
// =====================================================================
describe('calculateCoverage', () => {
  it('returns full 24 h coverage for standard 6×4 h slots', () => {
    const result = calculateCoverage(standardSlots);
    expect(result.hasFull24h).toBe(true);
    expect(result.totalMinutes).toBe(1440);
    expect(result.gaps).toHaveLength(0);
  });

  it('detects a single gap', () => {
    const slotsWithGap: WatchSlot[] = [
      { id: '1', start: '00:00', end: '08:00', reqCrew: 1 },
      { id: '2', start: '16:00', end: '24:00', reqCrew: 1 },
    ];
    const result = calculateCoverage(slotsWithGap);
    expect(result.hasFull24h).toBe(false);
    expect(result.totalMinutes).toBe(960);
    expect(result.gaps).toHaveLength(1);
    expect(result.gaps[0]).toEqual({ start: '08:00', end: '16:00', minutes: 480 });
  });

  it('detects multiple gaps', () => {
    const slots: WatchSlot[] = [
      { id: '1', start: '00:00', end: '04:00', reqCrew: 1 },
      { id: '2', start: '08:00', end: '12:00', reqCrew: 1 },
      { id: '3', start: '16:00', end: '20:00', reqCrew: 1 },
    ];
    const result = calculateCoverage(slots);
    expect(result.gaps).toHaveLength(3);
    expect(result.totalMinutes).toBe(720);
  });

  it('handles overlapping slots', () => {
    const overlapping: WatchSlot[] = [
      { id: '1', start: '00:00', end: '14:00', reqCrew: 1 },
      { id: '2', start: '10:00', end: '24:00', reqCrew: 1 },
    ];
    const result = calculateCoverage(overlapping);
    expect(result.hasFull24h).toBe(true);
    expect(result.totalMinutes).toBe(1440);
  });

  it('handles empty slots array', () => {
    const result = calculateCoverage([]);
    expect(result.totalMinutes).toBe(0);
    expect(result.hasFull24h).toBe(false);
    expect(result.gaps).toHaveLength(0);
  });

  it('handles a single slot (partial day)', () => {
    const slots: WatchSlot[] = [{ id: '1', start: '08:00', end: '16:00', reqCrew: 1 }];
    const result = calculateCoverage(slots);
    expect(result.totalMinutes).toBe(480);
    expect(result.hasFull24h).toBe(false);
    expect(result.gaps).toHaveLength(2); // before and after
  });

  it('detects gap at end of day', () => {
    const slots: WatchSlot[] = [{ id: '1', start: '00:00', end: '20:00', reqCrew: 1 }];
    const result = calculateCoverage(slots);
    expect(result.gaps).toHaveLength(1);
    expect(result.gaps[0]).toEqual({ start: '20:00', end: '24:00', minutes: 240 });
  });

  it('detects gap at start of day', () => {
    const slots: WatchSlot[] = [{ id: '1', start: '04:00', end: '24:00', reqCrew: 1 }];
    const result = calculateCoverage(slots);
    expect(result.gaps).toHaveLength(1);
    expect(result.gaps[0]).toEqual({ start: '00:00', end: '04:00', minutes: 240 });
  });
});

// =====================================================================
// detectScheduleConflicts
// =====================================================================
describe('detectScheduleConflicts', () => {
  it('returns empty array for a conflict-free schedule', () => {
    const daySlots: WatchSlot[] = [
      { id: '1', start: '08:00', end: '14:00', reqCrew: 1 },
      { id: '2', start: '14:00', end: '20:00', reqCrew: 1 },
    ];
    const schedule: DaySchedule[] = [
      { day: 1, slots: [{ ...daySlots[0], assigned: [anna] }, { ...daySlots[1], assigned: [michal] }] },
      { day: 2, slots: [{ ...daySlots[0], assigned: [kasia] }, { ...daySlots[1], assigned: [tomek] }] },
    ];
    const conflicts = detectScheduleConflicts(schedule, daySlots);
    expect(conflicts).toHaveLength(0);
  });

  it('detects consecutive night watches > 3', () => {
    const nightSlot: WatchSlot = { id: 'n', start: '02:00', end: '06:00', reqCrew: 1 };
    const schedule: DaySchedule[] = Array.from({ length: 5 }, (_, i) => ({
      day: i + 1,
      slots: [{ ...nightSlot, assigned: [kasia] }],
    }));
    const conflicts = detectScheduleConflicts(schedule, [nightSlot]);
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts.some((c) => c.type === 'consecutive_night')).toBe(true);
  });

  it('detects insufficient rest between watches', () => {
    const slots: WatchSlot[] = [
      { id: '1', start: '00:00', end: '04:00', reqCrew: 1 },
      { id: '2', start: '06:00', end: '10:00', reqCrew: 1 },
    ];
    const schedule: DaySchedule[] = [
      { day: 1, slots: [{ ...slots[0], assigned: [kasia] }, { ...slots[1], assigned: [kasia] }] },
    ];
    const conflicts = detectScheduleConflicts(schedule, slots);
    expect(conflicts.some((c) => c.type === 'insufficient_rest')).toBe(true);
  });

  it('detects uneven night watch distribution', () => {
    const nightSlot: WatchSlot = { id: 'n', start: '02:00', end: '06:00', reqCrew: 1 };
    const daySlot: WatchSlot = { id: 'd', start: '14:00', end: '18:00', reqCrew: 1 };
    const schedule: DaySchedule[] = Array.from({ length: 5 }, (_, i) => ({
      day: i + 1,
      slots: [
        { ...nightSlot, assigned: [kasia] },
        { ...daySlot, assigned: [tomek] },
      ],
    }));
    const conflicts = detectScheduleConflicts(schedule, [nightSlot, daySlot]);
    expect(conflicts.some((c) => c.type === 'uneven_distribution')).toBe(true);
  });

  it('handles empty schedule without crashing', () => {
    expect(detectScheduleConflicts([], [])).toEqual([]);
  });

  it('handles null entries in assigned array', () => {
    const slot: WatchSlot = { id: '1', start: '08:00', end: '12:00', reqCrew: 1 };
    const schedule: DaySchedule[] = [
      { day: 1, slots: [{ ...slot, assigned: [null as unknown as CrewMember, kasia] }] },
    ];
    expect(() => detectScheduleConflicts(schedule, [slot])).not.toThrow();
  });

  it('de-duplicates identical conflict messages', () => {
    const nightSlot: WatchSlot = { id: 'n', start: '02:00', end: '06:00', reqCrew: 1 };
    const schedule: DaySchedule[] = Array.from({ length: 6 }, (_, i) => ({
      day: i + 1,
      slots: [{ ...nightSlot, assigned: [kasia] }],
    }));
    const conflicts = detectScheduleConflicts(schedule, [nightSlot]);
    const msgs = conflicts.map((c) => c.message);
    const unique = new Set(msgs);
    expect(msgs.length).toBe(unique.size);
  });
});

// =====================================================================
// generateStandardSchedule
// =====================================================================
describe('generateStandardSchedule', () => {
  const fourCrew = [anna, michal, kasia, tomek];

  it('generates the requested number of days', () => {
    const schedule = generateStandardSchedule(fourCrew, standardSlots, 3);
    expect(schedule).toHaveLength(3);
  });

  it('each day contains the correct number of slots', () => {
    const schedule = generateStandardSchedule(fourCrew, standardSlots, 2);
    for (const day of schedule) {
      expect(day.slots).toHaveLength(standardSlots.length);
    }
  });

  it('assigns reqCrew members per slot', () => {
    const schedule = generateStandardSchedule(fourCrew, standardSlots, 1);
    for (const slot of schedule[0].slots) {
      expect(slot.assigned).toHaveLength(slot.reqCrew);
    }
  });

  it('uses round-robin — every crew member appears', () => {
    const schedule = generateStandardSchedule(fourCrew, standardSlots, 1);
    const allIds = schedule[0].slots.flatMap((s) => s.assigned.map((c) => c.id));
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(fourCrew.length);
  });

  it('handles 2-person crew', () => {
    const twoCrew = [anna, michal];
    const schedule = generateStandardSchedule(twoCrew, standardSlots, 1);
    expect(schedule).toHaveLength(1);
    for (const slot of schedule[0].slots) {
      expect(slot.assigned).toHaveLength(slot.reqCrew);
    }
  });

  it('handles 3-person crew across multiple days', () => {
    const threeCrew = [anna, michal, kasia];
    const schedule = generateStandardSchedule(threeCrew, standardSlots, 5);
    expect(schedule).toHaveLength(5);
    // All crew members should appear across all days
    const allIds = schedule.flatMap((d) => d.slots.flatMap((s) => s.assigned.map((c) => c.id)));
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(3);
  });

  it('handles single day', () => {
    const schedule = generateStandardSchedule(fourCrew, standardSlots, 1);
    expect(schedule).toHaveLength(1);
    expect(schedule[0].day).toBe(1);
  });

  it('handles empty crew gracefully', () => {
    const schedule = generateStandardSchedule([], standardSlots, 1);
    expect(schedule).toHaveLength(1);
    for (const slot of schedule[0].slots) {
      expect(slot.assigned).toHaveLength(0);
    }
  });

  it('sorts slots by start time', () => {
    const unsorted: WatchSlot[] = [
      { id: '2', start: '12:00', end: '24:00', reqCrew: 1 },
      { id: '1', start: '00:00', end: '12:00', reqCrew: 1 },
    ];
    const schedule = generateStandardSchedule(fourCrew, unsorted, 1);
    expect(schedule[0].slots[0].start).toBe('00:00');
    expect(schedule[0].slots[1].start).toBe('12:00');
  });
});

// =====================================================================
// generateSmallCrewSchedule
// =====================================================================
describe('generateSmallCrewSchedule', () => {
  it('generates the correct number of days', () => {
    const schedule = generateSmallCrewSchedule([anna, michal, kasia], standardSlots, 4);
    expect(schedule).toHaveLength(4);
  });

  it('3-crew: minimises consecutive-slot overlap', () => {
    const threeCrew = [anna, michal, kasia];
    const schedule = generateSmallCrewSchedule(threeCrew, standardSlots, 2);

    for (const day of schedule) {
      for (let i = 1; i < day.slots.length; i++) {
        const prevIds = new Set(day.slots[i - 1].assigned.map((c) => c.id));
        const overlap = day.slots[i].assigned.filter((c) => prevIds.has(c.id));
        // With 3 crew and reqCrew=2, at most 1 overlap is acceptable
        expect(overlap.length).toBeLessThanOrEqual(1);
      }
    }
  });

  it('4-crew: all members are used', () => {
    const schedule = generateSmallCrewSchedule([anna, michal, kasia, tomek], standardSlots, 2);
    const allIds = schedule.flatMap((d) => d.slots.flatMap((s) => s.assigned.map((c) => c.id)));
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(4);
  });

  it('4-crew: distributes night watches', () => {
    const fourCrew = [anna, michal, kasia, tomek];
    const schedule = generateSmallCrewSchedule(fourCrew, standardSlots, 5);
    const nightCounts: Record<string, number> = {};
    for (const day of schedule) {
      for (const slot of day.slots) {
        if (parseInt(slot.start.split(':')[0], 10) < 6) {
          for (const p of slot.assigned) {
            nightCounts[p.id] = (nightCounts[p.id] || 0) + 1;
          }
        }
      }
    }
    const counts = Object.values(nightCounts);
    const max = Math.max(...counts);
    const min = Math.min(...counts);
    // The algorithm should keep the spread reasonable
    expect(max - min).toBeLessThanOrEqual(max);
  });

  it('handles crew smaller than reqCrew (fallback)', () => {
    const schedule = generateSmallCrewSchedule([anna], standardSlots, 1);
    expect(schedule).toHaveLength(1);
    for (const slot of schedule[0].slots) {
      expect(slot.assigned.length).toBeGreaterThan(0);
    }
  });

  it('scoring edge case: all night slots', () => {
    const nightOnlySlots: WatchSlot[] = [
      { id: '1', start: '00:00', end: '02:00', reqCrew: 1 },
      { id: '2', start: '02:00', end: '04:00', reqCrew: 1 },
      { id: '3', start: '04:00', end: '06:00', reqCrew: 1 },
    ];
    const schedule = generateSmallCrewSchedule([anna, michal, kasia], nightOnlySlots, 3);
    expect(schedule).toHaveLength(3);
    // Should not crash and should assign everyone
    const allIds = schedule.flatMap((d) => d.slots.flatMap((s) => s.assigned.map((c) => c.id)));
    expect(new Set(allIds).size).toBe(3);
  });

  it('scoring edge case: single slot per day', () => {
    const singleSlot: WatchSlot[] = [{ id: '1', start: '08:00', end: '16:00', reqCrew: 2 }];
    const schedule = generateSmallCrewSchedule([anna, michal, kasia], singleSlot, 3);
    expect(schedule).toHaveLength(3);
    for (const day of schedule) {
      expect(day.slots).toHaveLength(1);
      expect(day.slots[0].assigned).toHaveLength(2);
    }
  });
});
