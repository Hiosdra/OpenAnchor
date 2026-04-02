import { describe, it, expect } from 'vitest';
import {
  generateICSContent,
  formatICSDateTime,
} from '../src/modules/wachtownik/utils/ics-export';
import type { AbsoluteSlot, CrewMember } from '../src/modules/wachtownik/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAbsoluteSlot(overrides: Partial<AbsoluteSlot> & {
  start: string;
  end: string;
  absoluteStart: Date;
  absoluteEnd: Date;
  assigned: CrewMember[];
}): AbsoluteSlot {
  return {
    id: 'slot-1',
    reqCrew: 2,
    dayNumber: 1,
    ...overrides,
  };
}

const anna: CrewMember = { id: 'c1', name: 'Anna', role: 'captain' };
const michal: CrewMember = { id: 'c2', name: 'Michał', role: 'officer' };
const kasia: CrewMember = { id: 'c3', name: 'Kasia', role: 'sailor' };

// =====================================================================
// formatICSDateTime
// =====================================================================
describe('formatICSDateTime', () => {
  it('formats a date correctly', () => {
    const d = new Date(2025, 6, 15, 8, 30, 0); // July 15 2025, 08:30
    expect(formatICSDateTime(d)).toBe('20250715T083000');
  });

  it('zero-pads single-digit month and day', () => {
    const d = new Date(2025, 0, 5, 3, 7, 0); // Jan 5, 03:07
    expect(formatICSDateTime(d)).toBe('20250105T030700');
  });

  it('handles midnight', () => {
    const d = new Date(2025, 11, 31, 0, 0, 0); // Dec 31, 00:00
    expect(formatICSDateTime(d)).toBe('20251231T000000');
  });

  it('handles end of day', () => {
    const d = new Date(2025, 5, 1, 23, 59, 0); // Jun 1, 23:59
    expect(formatICSDateTime(d)).toBe('20250601T235900');
  });
});

// =====================================================================
// generateICSContent
// =====================================================================
describe('generateICSContent', () => {
  const slot1 = makeAbsoluteSlot({
    id: 's1',
    start: '00:00',
    end: '04:00',
    absoluteStart: new Date(2025, 6, 1, 0, 0),
    absoluteEnd: new Date(2025, 6, 1, 4, 0),
    assigned: [anna, michal],
    dayNumber: 1,
  });

  const slot2 = makeAbsoluteSlot({
    id: 's2',
    start: '08:00',
    end: '12:00',
    absoluteStart: new Date(2025, 6, 1, 8, 0),
    absoluteEnd: new Date(2025, 6, 1, 12, 0),
    assigned: [kasia],
    dayNumber: 1,
  });

  it('starts with VCALENDAR header', () => {
    const ics = generateICSContent([slot1], anna);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('PRODID:-//Morski Grafik Wacht//PL');
  });

  it('ends with VCALENDAR footer', () => {
    const ics = generateICSContent([slot1], anna);
    expect(ics.trimEnd()).toMatch(/END:VCALENDAR$/);
  });

  it('contains VEVENT markers for assigned slots', () => {
    const ics = generateICSContent([slot1], anna);
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('END:VEVENT');
  });

  it('does NOT include slots where the person is not assigned', () => {
    const ics = generateICSContent([slot2], anna);
    // Anna is NOT assigned to slot2
    expect(ics).not.toContain('BEGIN:VEVENT');
  });

  it('includes correct SUMMARY with time range', () => {
    const ics = generateICSContent([slot1], anna);
    expect(ics).toContain('SUMMARY:Wachta (00:00-04:00)');
  });

  it('includes correct DTSTART and DTEND', () => {
    const ics = generateICSContent([slot1], anna);
    expect(ics).toContain('DTSTART:20250701T000000');
    expect(ics).toContain('DTEND:20250701T040000');
  });

  it('lists other assigned crew in DESCRIPTION', () => {
    const ics = generateICSContent([slot1], anna);
    // Anna is on watch with Michał
    expect(ics).toContain('DESCRIPTION:Wachta razem z: Michał');
  });

  it('uses "Wachta solo" when no other crew assigned', () => {
    const soloSlot = makeAbsoluteSlot({
      id: 's3',
      start: '16:00',
      end: '20:00',
      absoluteStart: new Date(2025, 6, 1, 16, 0),
      absoluteEnd: new Date(2025, 6, 1, 20, 0),
      assigned: [anna],
      dayNumber: 1,
    });
    const ics = generateICSContent([soloSlot], anna);
    expect(ics).toContain('DESCRIPTION:Wachta solo');
  });

  it('includes multiple events for multiple assigned slots', () => {
    const slot3 = makeAbsoluteSlot({
      id: 's4',
      start: '12:00',
      end: '16:00',
      absoluteStart: new Date(2025, 6, 1, 12, 0),
      absoluteEnd: new Date(2025, 6, 1, 16, 0),
      assigned: [anna, kasia],
      dayNumber: 1,
    });
    const ics = generateICSContent([slot1, slot3], anna);
    const eventCount = (ics.match(/BEGIN:VEVENT/g) || []).length;
    expect(eventCount).toBe(2);
  });

  it('returns valid calendar even with no matching slots', () => {
    const ics = generateICSContent([slot2], anna);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).not.toContain('BEGIN:VEVENT');
  });

  it('uses CRLF line endings', () => {
    const ics = generateICSContent([slot1], anna);
    expect(ics).toContain('\r\n');
  });
});
