/**
 * PDF data builders — pure functions extracted from pdf-export.ts.
 *
 * These build the data structures that jsPDF autoTable consumes,
 * without touching jsPDF or the DOM.
 */

import type { DaySchedule, CrewStat, DashboardData, Locale } from '../types';
import { t } from '../constants';

export function calculateDateRange(
  startDate: string,
  scheduleDays: number,
): { start: Date; end: Date; startStr: string; endStr: string; isoStart: string; isoEnd: string } {
  const start = new Date(startDate);
  const end = new Date(start);
  end.setDate(end.getDate() + scheduleDays - 1);
  return {
    start,
    end,
    startStr: start.toISOString().split('T')[0],
    endStr: end.toISOString().split('T')[0],
    isoStart: start.toISOString().split('T')[0],
    isoEnd: end.toISOString().split('T')[0],
  };
}

export function buildScheduleHeaders(schedule: DaySchedule[]): string[] {
  const headers = ['Data'];
  schedule[0]?.slots.forEach((slot) => {
    headers.push(`${slot.start}-${slot.end}\n(${slot.reqCrew}os)`);
  });
  return headers;
}

export function buildScheduleRows(
  schedule: DaySchedule[],
  startDate: string,
  locale: Locale,
): string[][] {
  return schedule.map((daySchedule, dayIndex) => {
    const rowDate = new Date(startDate);
    rowDate.setDate(rowDate.getDate() + dayIndex);
    const dateStr =
      `D${daySchedule.day}\n` +
      rowDate.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });

    const row = [dateStr];
    daySchedule.slots.forEach((slot) => {
      const names = slot.assigned
        .filter((p) => p != null)
        .map((p) => p.name)
        .join('\n');
      row.push(names || '-');
    });
    return row;
  });
}

export function buildStatsRows(
  crewStats: CrewStat[],
  dashboardData: DashboardData | null,
  locale: Locale,
): string[][] {
  const roleLabels: Record<string, string> = {
    captain: t('role.captain', locale) || 'Kapitan',
    officer: t('role.officer', locale) || 'Oficer',
    bosun: t('role.bosun', locale) || 'Bosman',
    sailor: t('role.sailor', locale) || 'Marynarz',
    cook: t('role.cook', locale) || 'Kucharz',
    engineer: t('role.engineer', locale) || 'Mechanik',
  };

  return crewStats
    .filter((stat) => stat != null)
    .map((stat) => {
      let watchCount = 0;
      if (dashboardData?.allSlotsAbsolute) {
        dashboardData.allSlotsAbsolute.forEach((slot) => {
          if (slot.assigned.some((p) => p && p.id === stat.id)) {
            watchCount++;
          }
        });
      }
      return [
        stat.name || '-',
        roleLabels[stat.role] || stat.role || 'Załoga',
        watchCount.toString(),
        `${stat.totalHours}h`,
      ];
    });
}

export function buildPdfFilename(startDate: string, scheduleDays: number): string {
  const { isoStart, isoEnd } = calculateDateRange(startDate, scheduleDays);
  return `grafik_wacht_${isoStart}_${isoEnd}.pdf`;
}
