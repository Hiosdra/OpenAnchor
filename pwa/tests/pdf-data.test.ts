import { describe, it, expect } from 'vitest';
import {
  calculateDateRange,
  buildScheduleHeaders,
  buildScheduleRows,
  buildStatsRows,
  buildPdfFilename,
} from '../src/modules/wachtownik/utils/pdf-data';
import type { DaySchedule, CrewStat, DashboardData, AbsoluteSlot } from '../src/modules/wachtownik/types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const mockSchedule: DaySchedule[] = [
  {
    day: 1,
    slots: [
      {
        id: '1',
        start: '00:00',
        end: '08:00',
        reqCrew: 2,
        assigned: [
          { id: 'c1', name: 'Anna', role: 'captain' },
          { id: 'c2', name: 'Michał', role: 'officer' },
        ],
      },
      {
        id: '2',
        start: '08:00',
        end: '16:00',
        reqCrew: 2,
        assigned: [
          { id: 'c3', name: 'Kasia', role: 'sailor' },
          { id: 'c4', name: 'Tomek', role: 'sailor' },
        ],
      },
      {
        id: '3',
        start: '16:00',
        end: '24:00',
        reqCrew: 2,
        assigned: [
          { id: 'c1', name: 'Anna', role: 'captain' },
          { id: 'c3', name: 'Kasia', role: 'sailor' },
        ],
      },
    ],
  },
  {
    day: 2,
    slots: [
      {
        id: '1',
        start: '00:00',
        end: '08:00',
        reqCrew: 2,
        assigned: [
          { id: 'c2', name: 'Michał', role: 'officer' },
          { id: 'c4', name: 'Tomek', role: 'sailor' },
        ],
      },
      {
        id: '2',
        start: '08:00',
        end: '16:00',
        reqCrew: 2,
        assigned: [
          { id: 'c1', name: 'Anna', role: 'captain' },
          { id: 'c2', name: 'Michał', role: 'officer' },
        ],
      },
      {
        id: '3',
        start: '16:00',
        end: '24:00',
        reqCrew: 2,
        assigned: [
          { id: 'c3', name: 'Kasia', role: 'sailor' },
          { id: 'c4', name: 'Tomek', role: 'sailor' },
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('pdf-data', () => {
  describe('calculateDateRange', () => {
    it('calculates correct start and end', () => {
      const range = calculateDateRange('2026-04-01', 7);
      expect(range.start.toISOString()).toContain('2026-04-01');
      expect(range.end.toISOString()).toContain('2026-04-07');
    });

    it('single day has same start and end', () => {
      const range = calculateDateRange('2026-06-15', 1);
      expect(range.isoStart).toBe('2026-06-15');
      expect(range.isoEnd).toBe('2026-06-15');
    });

    it('provides ISO date strings', () => {
      const range = calculateDateRange('2026-01-28', 5);
      expect(range.isoStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(range.isoEnd).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('handles month boundaries', () => {
      const range = calculateDateRange('2026-01-30', 5);
      expect(range.isoEnd).toBe('2026-02-03');
    });
  });

  describe('buildScheduleHeaders', () => {
    it('starts with "Data"', () => {
      const headers = buildScheduleHeaders(mockSchedule);
      expect(headers[0]).toBe('Data');
    });

    it('has one column per slot + Data column', () => {
      const headers = buildScheduleHeaders(mockSchedule);
      expect(headers).toHaveLength(4); // Data + 3 slots
    });

    it('formats slot headers with time and crew count', () => {
      const headers = buildScheduleHeaders(mockSchedule);
      expect(headers[1]).toBe('00:00-08:00\n(2os)');
      expect(headers[2]).toBe('08:00-16:00\n(2os)');
    });

    it('returns only ["Data"] for empty schedule', () => {
      expect(buildScheduleHeaders([])).toEqual(['Data']);
    });
  });

  describe('buildScheduleRows', () => {
    it('produces one row per day', () => {
      const rows = buildScheduleRows(mockSchedule, '2026-04-01', 'pl-PL');
      expect(rows).toHaveLength(2);
    });

    it('first column contains day number and date', () => {
      const rows = buildScheduleRows(mockSchedule, '2026-04-01', 'pl-PL');
      expect(rows[0][0]).toContain('D1');
      expect(rows[1][0]).toContain('D2');
    });

    it('slot columns contain crew names separated by newlines', () => {
      const rows = buildScheduleRows(mockSchedule, '2026-04-01', 'pl-PL');
      expect(rows[0][1]).toBe('Anna\nMichał');
      expect(rows[0][2]).toBe('Kasia\nTomek');
    });

    it('uses dash for empty slots', () => {
      const emptySchedule: DaySchedule[] = [
        {
          day: 1,
          slots: [{ id: '1', start: '00:00', end: '12:00', reqCrew: 2, assigned: [] }],
        },
      ];
      const rows = buildScheduleRows(emptySchedule, '2026-04-01', 'pl-PL');
      expect(rows[0][1]).toBe('-');
    });
  });

  describe('buildStatsRows', () => {
    const crewStats: CrewStat[] = [
      { id: 'c1', name: 'Anna', role: 'captain', totalHours: 16, hardWatches: 1 },
      { id: 'c3', name: 'Kasia', role: 'sailor', totalHours: 16, hardWatches: 0 },
    ];

    it('returns one row per crew member', () => {
      const rows = buildStatsRows(crewStats, null, 'pl-PL');
      expect(rows).toHaveLength(2);
    });

    it('maps role to localized label', () => {
      const rows = buildStatsRows(crewStats, null, 'pl-PL');
      expect(rows[0][1]).toBe('Kapitan');
      expect(rows[1][1]).toBe('Żeglarz');
    });

    it('shows 0 watches when no dashboard data', () => {
      const rows = buildStatsRows(crewStats, null, 'pl-PL');
      expect(rows[0][2]).toBe('0');
    });

    it('counts watches from dashboard data', () => {
      const dash: DashboardData = {
        currentSlot: null,
        nextSlot: null,
        status: '',
        progress: 0,
        allSlotsAbsolute: [
          {
            id: '1', start: '00:00', end: '08:00', reqCrew: 2, dayNumber: 1,
            absoluteStart: new Date(), absoluteEnd: new Date(),
            assigned: [{ id: 'c1', name: 'Anna', role: 'captain' }],
          },
          {
            id: '2', start: '08:00', end: '16:00', reqCrew: 2, dayNumber: 1,
            absoluteStart: new Date(), absoluteEnd: new Date(),
            assigned: [{ id: 'c1', name: 'Anna', role: 'captain' }, { id: 'c3', name: 'Kasia', role: 'sailor' }],
          },
        ] as AbsoluteSlot[],
      };
      const rows = buildStatsRows(crewStats, dash, 'pl-PL');
      expect(rows[0][2]).toBe('2'); // Anna in 2 slots
      expect(rows[1][2]).toBe('1'); // Kasia in 1 slot
    });

    it('formats hours with h suffix', () => {
      const rows = buildStatsRows(crewStats, null, 'pl-PL');
      expect(rows[0][3]).toBe('16h');
    });

    it('handles null entries in crewStats', () => {
      const stats = [null as any, crewStats[0]];
      const rows = buildStatsRows(stats, null, 'pl-PL');
      expect(rows).toHaveLength(1);
    });
  });

  describe('buildPdfFilename', () => {
    it('builds filename with ISO dates', () => {
      const name = buildPdfFilename('2026-04-01', 7);
      expect(name).toBe('grafik_wacht_2026-04-01_2026-04-07.pdf');
    });

    it('single day uses same date twice', () => {
      const name = buildPdfFilename('2026-06-15', 1);
      expect(name).toBe('grafik_wacht_2026-06-15_2026-06-15.pdf');
    });
  });
});
