/**
 * ICS (iCalendar) export utilities for Wachtownik.
 *
 * Pure functions — no DOM, no React, no side-effects.
 */

import type { AbsoluteSlot, CrewMember } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a Date to the ICS DATETIME format: YYYYMMDDTHHmmss */
export function formatICSDateTime(d: Date): string {
  const pad = (n: number): string => (n < 10 ? '0' + n : String(n));
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `T${pad(d.getHours())}${pad(d.getMinutes())}00`
  );
}

// ---------------------------------------------------------------------------
// ICS content builder
// ---------------------------------------------------------------------------

/**
 * Build the full text content of an `.ics` calendar file for a given crew
 * member from a list of absolute (date-resolved) watch slots.
 *
 * Only slots where `person` is in the `assigned` array are included.
 */
export function generateICSContent(
  allSlotsAbsolute: AbsoluteSlot[],
  person: CrewMember,
): string {
  let ics =
    'BEGIN:VCALENDAR\r\n' +
    'VERSION:2.0\r\n' +
    'PRODID:-//Morski Grafik Wacht//PL\r\n';

  for (const slot of allSlotsAbsolute) {
    if (!slot.assigned.some((p) => p.id === person.id)) continue;

    ics += 'BEGIN:VEVENT\r\n';
    ics += `SUMMARY:Wachta (${slot.start}-${slot.end})\r\n`;
    ics += `DTSTART:${formatICSDateTime(slot.absoluteStart)}\r\n`;
    ics += `DTEND:${formatICSDateTime(slot.absoluteEnd)}\r\n`;

    const others = slot.assigned
      .filter((p) => p.id !== person.id)
      .map((p) => p.name)
      .join(', ');
    const desc = others ? `Wachta razem z: ${others}` : 'Wachta solo';
    ics += `DESCRIPTION:${desc}\r\n`;
    ics += 'END:VEVENT\r\n';
  }

  ics += 'END:VCALENDAR\r\n';
  return ics;
}
