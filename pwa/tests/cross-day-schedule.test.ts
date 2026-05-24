/**
 * Regression tests for cross-day schedule support, validation banner behavior,
 * and night3_day4 template.
 *
 * These tests verify:
 * 1. Cross-day slots (e.g. 23:00-01:00) are valid and produce a warning (not a block)
 * 2. End time 00:00 is allowed even when another slot starts at 00:00
 * 3. Full cross-day schedule (06:00 start, wrapping around to 06:00 end) works
 * 4. The night3_day4 template has correct structure
 * 5. Validation is non-blocking (warnings instead of errors)
 */
import { describe, it, expect } from 'vitest';
import {
  validateSlotTime,
  isCrossDaySlot,
  calculateCoverage,
  generateStandardSchedule,
} from '../src/modules/wachtownik/utils/schedule-logic';
import { computeSlotWarnings } from '../src/modules/wachtownik/hooks/useWatchSlots';
import { WATCH_TEMPLATES } from '../src/modules/wachtownik/constants';
import type { WatchSlot, CrewMember } from '../src/modules/wachtownik/types';

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
const crew: CrewMember[] = [
  { id: 'c1', name: 'Anna', role: 'captain' },
  { id: 'c2', name: 'Michał', role: 'officer' },
  { id: 'c3', name: 'Kasia', role: 'sailor' },
  { id: 'c4', name: 'Tomek', role: 'sailor' },
];

// ===========================================================================
// isCrossDaySlot
// ===========================================================================
describe('isCrossDaySlot', () => {
  it('returns true for slot crossing midnight (23:00-01:00)', () => {
    expect(isCrossDaySlot({ start: '23:00', end: '01:00' })).toBe(true);
  });

  it('returns true for slot 22:00-06:00', () => {
    expect(isCrossDaySlot({ start: '22:00', end: '06:00' })).toBe(true);
  });

  it('returns false for normal slot (08:00-12:00)', () => {
    expect(isCrossDaySlot({ start: '08:00', end: '12:00' })).toBe(false);
  });

  it('returns false for slot ending at 24:00', () => {
    expect(isCrossDaySlot({ start: '20:00', end: '24:00' })).toBe(false);
  });

  it('returns false for same start and end', () => {
    expect(isCrossDaySlot({ start: '08:00', end: '08:00' })).toBe(false);
  });

  it('returns true for 21:00-00:00 (end is midnight)', () => {
    expect(isCrossDaySlot({ start: '21:00', end: '00:00' })).toBe(true);
  });
});

// ===========================================================================
// Cross-day validation (non-blocking)
// ===========================================================================
describe('Cross-day slot validation', () => {
  it('allows end time 00:00 when another slot starts at 00:00', () => {
    const slots: WatchSlot[] = [
      { id: '1', start: '00:00', end: '04:00', reqCrew: 2 },
      { id: '2', start: '20:00', end: '00:00', reqCrew: 2 },
    ];
    const result = validateSlotTime(slots[1], slots);
    expect(result.valid).toBe(true);
  });

  it('23:00-01:00 slot is valid with cross_day warning', () => {
    const slot: WatchSlot = { id: 'x', start: '23:00', end: '01:00', reqCrew: 2 };
    const result = validateSlotTime(slot, [slot]);
    expect(result.valid).toBe(true);
    expect(result.warnings).toBeDefined();
    expect(result.warnings!.some(w => w.type === 'cross_day')).toBe(true);
  });

  it('cross-day slot does not block the user (no error returned)', () => {
    const slot: WatchSlot = { id: 'x', start: '22:00', end: '06:00', reqCrew: 1 };
    const result = validateSlotTime(slot, [slot]);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('computeSlotWarnings produces cross_day warning', () => {
    const slots: WatchSlot[] = [
      { id: '1', start: '23:00', end: '01:00', reqCrew: 2 },
    ];
    const warnings = computeSlotWarnings(slots, 'pl-PL');
    expect(warnings.some(w => w.type === 'cross_day')).toBe(true);
    expect(warnings[0].message).toContain('23:00-01:00');
  });

  it('computeSlotWarnings produces no warnings for standard slots', () => {
    const slots: WatchSlot[] = [
      { id: '1', start: '00:00', end: '04:00', reqCrew: 2 },
      { id: '2', start: '04:00', end: '08:00', reqCrew: 2 },
    ];
    const warnings = computeSlotWarnings(slots, 'pl-PL');
    expect(warnings).toHaveLength(0);
  });
});

// ===========================================================================
// Full cross-day schedule (e.g. 06:00 start, wrapping to 06:00 end)
// ===========================================================================
describe('Cross-day full schedule (06:00-06:00 wrap)', () => {
  const crossDaySlots: WatchSlot[] = [
    { id: '1', start: '06:00', end: '10:00', reqCrew: 2 },
    { id: '2', start: '10:00', end: '14:00', reqCrew: 2 },
    { id: '3', start: '14:00', end: '18:00', reqCrew: 2 },
    { id: '4', start: '18:00', end: '22:00', reqCrew: 2 },
    { id: '5', start: '22:00', end: '02:00', reqCrew: 2 }, // cross-day
    { id: '6', start: '02:00', end: '06:00', reqCrew: 2 },
  ];

  it('schedule with cross-day slot provides full 24h coverage', () => {
    const coverage = calculateCoverage(crossDaySlots);
    expect(coverage.hasFull24h).toBe(true);
    expect(coverage.totalMinutes).toBe(1440);
    expect(coverage.gaps).toHaveLength(0);
  });

  it('all cross-day slots are individually valid', () => {
    for (const slot of crossDaySlots) {
      const result = validateSlotTime(slot, crossDaySlots);
      expect(result.valid).toBe(true);
    }
  });

  it('can generate a schedule with cross-day slots', () => {
    const schedule = generateStandardSchedule(crew, crossDaySlots, 3);
    expect(schedule).toHaveLength(3);
    for (const day of schedule) {
      expect(day.slots).toHaveLength(6);
      for (const slot of day.slots) {
        expect(slot.assigned.length).toBeGreaterThan(0);
      }
    }
  });

  it('schedule starting at 06:00 with a 23:00-01:00 watch works', () => {
    const slots: WatchSlot[] = [
      { id: '1', start: '06:00', end: '12:00', reqCrew: 2 },
      { id: '2', start: '12:00', end: '18:00', reqCrew: 2 },
      { id: '3', start: '18:00', end: '23:00', reqCrew: 2 },
      { id: '4', start: '23:00', end: '01:00', reqCrew: 2 }, // cross-day
      { id: '5', start: '01:00', end: '06:00', reqCrew: 2 },
    ];
    const coverage = calculateCoverage(slots);
    expect(coverage.hasFull24h).toBe(true);
  });
});

// ===========================================================================
// night3_day4 template
// ===========================================================================
describe('night3_day4 template', () => {
  const template = WATCH_TEMPLATES['night3_day4'];

  it('exists', () => {
    expect(template).toBeDefined();
  });

  it('has 7 slots', () => {
    expect(template.slots).toHaveLength(7);
  });

  it('night watches (21:00-06:00) are 3 hours each', () => {
    const nightSlots = template.slots.filter(s => {
      const hour = parseInt(s.start.split(':')[0]);
      return hour >= 21 || hour < 6;
    });
    expect(nightSlots).toHaveLength(3);
    for (const slot of nightSlots) {
      const startH = parseInt(slot.start.split(':')[0]);
      const endH = parseInt(slot.end.split(':')[0]);
      const duration = endH >= startH ? endH - startH : (24 - startH) + endH;
      expect(duration).toBe(3);
    }
  });

  it('day watches (06:00-21:00) are 3-4 hours each', () => {
    const daySlots = template.slots.filter(s => {
      const hour = parseInt(s.start.split(':')[0]);
      return hour >= 6 && hour < 21;
    });
    expect(daySlots.length).toBeGreaterThanOrEqual(3);
    for (const slot of daySlots) {
      const startH = parseInt(slot.start.split(':')[0]);
      const endH = parseInt(slot.end.split(':')[0]);
      const duration = endH - startH;
      expect(duration).toBeGreaterThanOrEqual(3);
      expect(duration).toBeLessThanOrEqual(4);
    }
  });

  it('provides full 24h coverage', () => {
    const slotsWithIds: WatchSlot[] = template.slots.map((s, i) => ({
      id: String(i),
      ...s,
    }));
    const coverage = calculateCoverage(slotsWithIds);
    expect(coverage.hasFull24h).toBe(true);
  });

  it('can generate a schedule with the template', () => {
    const slotsWithIds: WatchSlot[] = template.slots.map((s, i) => ({
      id: String(i),
      ...s,
    }));
    const schedule = generateStandardSchedule(crew, slotsWithIds, 5);
    expect(schedule).toHaveLength(5);
    for (const day of schedule) {
      expect(day.slots).toHaveLength(7);
    }
  });
});

// ===========================================================================
// Regression: validation is non-blocking
// ===========================================================================
describe('Validation is non-blocking (banner instead of alert)', () => {
  it('overlap returns valid=true with warning (not error)', () => {
    const slots: WatchSlot[] = [
      { id: '1', start: '08:00', end: '14:00', reqCrew: 1 },
      { id: '2', start: '12:00', end: '18:00', reqCrew: 1 },
    ];
    const result = validateSlotTime(slots[0], slots);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.warnings!.some(w => w.type === 'overlap')).toBe(true);
  });

  it('cross-day slot returns valid=true with warning (not error)', () => {
    const slot: WatchSlot = { id: '1', start: '23:00', end: '02:00', reqCrew: 1 };
    const result = validateSlotTime(slot, [slot]);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.warnings!.some(w => w.type === 'cross_day')).toBe(true);
  });

  it('zero-length slot (same start and end) is still invalid', () => {
    const slot: WatchSlot = { id: '1', start: '12:00', end: '12:00', reqCrew: 1 };
    const result = validateSlotTime(slot, [slot]);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('end_before_start');
  });
});
