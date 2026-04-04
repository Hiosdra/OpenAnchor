import { describe, it, expect, vi, beforeEach } from 'vitest';

import type {
  DaySchedule,
  CrewStat,
  DashboardData,
  AbsoluteSlot,
} from '../src/modules/wachtownik/types';

/* ------------------------------------------------------------------ */
/*  Mock jsPDF                                                         */
/* ------------------------------------------------------------------ */

const mockDoc = {
  setFontSize: vi.fn(),
  text: vi.fn(),
  autoTable: vi.fn(),
  lastAutoTable: { finalY: 100 },
  addPage: vi.fn(),
  setTextColor: vi.fn(),
  setPage: vi.fn(),
  internal: { getNumberOfPages: vi.fn().mockReturnValue(1) },
  save: vi.fn(),
};

vi.mock('jspdf', () => {
  const ctor = function jsPDF() {
    return mockDoc;
  } as unknown as typeof import('jspdf').jsPDF;
  return { jsPDF: ctor };
});
vi.mock('jspdf-autotable', () => ({}));

/* ------------------------------------------------------------------ */
/*  Fixtures                                                           */
/* ------------------------------------------------------------------ */

function makeSchedule(days: number, slotsPerDay: number): DaySchedule[] {
  return Array.from({ length: days }, (_, dayIdx) => ({
    day: dayIdx + 1,
    slots: Array.from({ length: slotsPerDay }, (_, slotIdx) => {
      const start = String((slotIdx * (24 / slotsPerDay)) | 0).padStart(2, '0') + ':00';
      const end =
        String((((slotIdx + 1) * (24 / slotsPerDay)) | 0) % 24).padStart(2, '0') + ':00';
      return {
        id: `s${slotIdx}`,
        start,
        end,
        reqCrew: 2,
        assigned: [
          { id: 'c1', name: 'Anna', role: 'captain' },
          { id: 'c2', name: 'Michał', role: 'officer' },
        ],
      };
    }),
  }));
}

function makeCrewStats(): CrewStat[] {
  return [
    { id: 'c1', name: 'Anna', role: 'captain', totalHours: 16, hardWatches: 1 },
    { id: 'c2', name: 'Michał', role: 'officer', totalHours: 12, hardWatches: 0 },
    { id: 'c3', name: 'Kasia', role: 'sailor', totalHours: 8, hardWatches: 0 },
  ];
}

function makeDashboardData(crewStats: CrewStat[]): DashboardData {
  return {
    currentSlot: null,
    nextSlot: null,
    status: '',
    progress: 0,
    allSlotsAbsolute: [
      {
        id: '1',
        start: '00:00',
        end: '08:00',
        reqCrew: 2,
        dayNumber: 1,
        absoluteStart: new Date('2026-04-01T00:00:00'),
        absoluteEnd: new Date('2026-04-01T08:00:00'),
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
        dayNumber: 1,
        absoluteStart: new Date('2026-04-01T08:00:00'),
        absoluteEnd: new Date('2026-04-01T16:00:00'),
        assigned: [
          { id: 'c3', name: 'Kasia', role: 'sailor' },
        ],
      },
    ] as AbsoluteSlot[],
  };
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('exportScheduleToPDF', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDoc.lastAutoTable = { finalY: 100 };
    mockDoc.internal.getNumberOfPages.mockReturnValue(1);
  });

  it('creates a landscape A4 PDF and saves with correct filename', async () => {
    const { exportScheduleToPDF } = await import(
      '../src/modules/wachtownik/utils/pdf-export'
    );

    const schedule = makeSchedule(3, 3);
    exportScheduleToPDF(schedule, '2026-04-01', makeCrewStats(), null, true, 'pl-PL');

    expect(mockDoc.save).toHaveBeenCalledWith('grafik_wacht_2026-04-01_2026-04-03.pdf');
    expect(mockDoc.text).toHaveBeenCalledWith('Wachtownik', 148, 15, { align: 'center' });
  });

  it('renders title and period header', async () => {
    const { exportScheduleToPDF } = await import(
      '../src/modules/wachtownik/utils/pdf-export'
    );

    const schedule = makeSchedule(2, 3);
    exportScheduleToPDF(schedule, '2026-04-01', [], null, true, 'pl-PL');

    expect(mockDoc.setFontSize).toHaveBeenCalledWith(16);
    expect(mockDoc.text).toHaveBeenCalledWith('Wachtownik', 148, 15, { align: 'center' });

    // Period header includes day count
    const periodCall = mockDoc.text.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('Okres: 2 dni'),
    );
    expect(periodCall).toBeTruthy();
  });

  it('builds schedule table via autoTable with correct row count', async () => {
    const { exportScheduleToPDF } = await import(
      '../src/modules/wachtownik/utils/pdf-export'
    );

    const schedule = makeSchedule(5, 4);
    exportScheduleToPDF(schedule, '2026-04-01', [], null, true, 'pl-PL');

    expect(mockDoc.autoTable).toHaveBeenCalled();
    const firstCall = mockDoc.autoTable.mock.calls[0][0] as {
      head: string[][];
      body: string[][];
      startY: number;
    };
    // Header: 'Data' + 4 slot columns
    expect(firstCall.head[0]).toHaveLength(5);
    // 5 days -> 5 rows
    expect(firstCall.body).toHaveLength(5);
    expect(firstCall.startY).toBe(28);
  });

  it('shows dash for empty slot assignments', async () => {
    const { exportScheduleToPDF } = await import(
      '../src/modules/wachtownik/utils/pdf-export'
    );

    const schedule: DaySchedule[] = [
      {
        day: 1,
        slots: [
          { id: 's1', start: '00:00', end: '08:00', reqCrew: 2, assigned: [] },
        ],
      },
    ];
    exportScheduleToPDF(schedule, '2026-04-01', [], null, true, 'pl-PL');

    const call = mockDoc.autoTable.mock.calls[0][0] as { body: string[][] };
    expect(call.body[0][1]).toBe('-');
  });

  it('renders crew statistics when crewStats is non-empty', async () => {
    const { exportScheduleToPDF } = await import(
      '../src/modules/wachtownik/utils/pdf-export'
    );

    const stats = makeCrewStats();
    const dash = makeDashboardData(stats);
    const schedule = makeSchedule(2, 3);

    exportScheduleToPDF(schedule, '2026-04-01', stats, dash, true, 'pl-PL');

    // Two autoTable calls: schedule table + stats table
    expect(mockDoc.autoTable).toHaveBeenCalledTimes(2);

    const statsCall = mockDoc.autoTable.mock.calls[1][0] as {
      body: string[][];
      theme: string;
    };
    expect(statsCall.body).toHaveLength(3);
    expect(statsCall.theme).toBe('striped');
  });

  it('adds a page for statistics when schedule table is too tall', async () => {
    const { exportScheduleToPDF } = await import(
      '../src/modules/wachtownik/utils/pdf-export'
    );

    // Simulate tall table
    mockDoc.lastAutoTable = { finalY: 180 };

    const schedule = makeSchedule(1, 3);
    exportScheduleToPDF(schedule, '2026-04-01', makeCrewStats(), null, true, 'pl-PL');

    expect(mockDoc.addPage).toHaveBeenCalled();
  });

  it('does not add stats section when crewStats is empty', async () => {
    const { exportScheduleToPDF } = await import(
      '../src/modules/wachtownik/utils/pdf-export'
    );

    const schedule = makeSchedule(1, 3);
    exportScheduleToPDF(schedule, '2026-04-01', [], null, true, 'pl-PL');

    // Only one autoTable call (schedule table)
    expect(mockDoc.autoTable).toHaveBeenCalledTimes(1);
  });

  it('renders page footer with page numbers', async () => {
    const { exportScheduleToPDF } = await import(
      '../src/modules/wachtownik/utils/pdf-export'
    );

    mockDoc.internal.getNumberOfPages.mockReturnValue(2);

    const schedule = makeSchedule(1, 3);
    exportScheduleToPDF(schedule, '2026-04-01', [], null, true, 'pl-PL');

    expect(mockDoc.setPage).toHaveBeenCalledWith(1);
    expect(mockDoc.setPage).toHaveBeenCalledWith(2);

    const footerCalls = mockDoc.text.mock.calls.filter(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('Strona'),
    );
    expect(footerCalls).toHaveLength(2);
    expect(footerCalls[0][0]).toContain('Strona 1 z 2');
    expect(footerCalls[1][0]).toContain('Strona 2 z 2');
  });

  it('computes watch count from dashboardData.allSlotsAbsolute', async () => {
    const { exportScheduleToPDF } = await import(
      '../src/modules/wachtownik/utils/pdf-export'
    );

    const stats = makeCrewStats();
    const dash = makeDashboardData(stats);
    const schedule = makeSchedule(1, 3);

    exportScheduleToPDF(schedule, '2026-04-01', stats, dash, true, 'pl-PL');

    const statsCall = mockDoc.autoTable.mock.calls[1][0] as { body: string[][] };
    // Anna (c1) is in first slot of dashboardData -> watchCount = 1
    const annaRow = statsCall.body.find((r: string[]) => r[0] === 'Anna');
    expect(annaRow).toBeTruthy();
    expect(annaRow![2]).toBe('1'); // watchCount
    expect(annaRow![3]).toBe('16h'); // totalHours
  });

  it('handles single-day schedule correctly', async () => {
    const { exportScheduleToPDF } = await import(
      '../src/modules/wachtownik/utils/pdf-export'
    );

    const schedule = makeSchedule(1, 2);
    exportScheduleToPDF(schedule, '2026-06-15', [], null, false, 'en-US');

    expect(mockDoc.save).toHaveBeenCalledWith('grafik_wacht_2026-06-15_2026-06-15.pdf');

    const call = mockDoc.autoTable.mock.calls[0][0] as { body: string[][] };
    expect(call.body).toHaveLength(1);
  });
});
