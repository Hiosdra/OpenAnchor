import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

import type { DaySchedule, CrewStat, DashboardData, Locale } from '../types';
import { t } from '../constants';

export function exportScheduleToPDF(
  schedule: DaySchedule[],
  startDate: string,
  crewStats: CrewStat[],
  dashboardData: DashboardData | null,
  captainParticipates: boolean,
  userLocale: Locale,
): void {
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(startDateObj);
  endDateObj.setDate(endDateObj.getDate() + schedule.length - 1);
  const endDate = endDateObj.toLocaleDateString(userLocale);
  const formattedStartDate = startDateObj.toLocaleDateString(userLocale);

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  doc.setFontSize(16);
  doc.text('Wachtownik', 148, 15, { align: 'center' });

  doc.setFontSize(10);
  doc.text(`Okres: ${schedule.length} dni (${formattedStartDate} - ${endDate})`, 148, 22, {
    align: 'center',
  });

  const roleLabels: Record<string, string> = {
    captain: t('role.captain', userLocale) || 'Kapitan',
    officer: t('role.officer', userLocale) || 'Oficer',
    bosun: t('role.bosun', userLocale) || 'Bosman',
    sailor: t('role.sailor', userLocale) || 'Marynarz',
    cook: t('role.cook', userLocale) || 'Kucharz',
    engineer: t('role.engineer', userLocale) || 'Mechanik',
  };

  const headers = ['Data'];
  schedule[0]?.slots.forEach((slot) => {
    headers.push(slot.start + '-' + slot.end + '\n(' + slot.reqCrew + 'os)');
  });

  const rows: string[][] = [];
  schedule.forEach((daySchedule, dayIndex) => {
    const rowDate = new Date(startDate);
    rowDate.setDate(rowDate.getDate() + dayIndex);
    const dateStr =
      'D' +
      daySchedule.day +
      '\n' +
      rowDate.toLocaleDateString(userLocale, { day: '2-digit', month: '2-digit' });

    const row = [dateStr];
    daySchedule.slots.forEach((slot) => {
      const names = slot.assigned
        .filter((p) => p != null)
        .map((p) => p.name)
        .join('\n');
      row.push(names || '-');
    });
    rows.push(row);
  });

  const numSlots = schedule[0]?.slots.length || 6;
  const tableWidth = 277 - 20;
  const dateColWidth = 22;
  const slotColWidth = Math.max(25, (tableWidth - dateColWidth) / numSlots);
  void slotColWidth; // used implicitly by autoTable auto-sizing

  (doc as unknown as { autoTable: (opts: unknown) => void }).autoTable({
    head: [headers],
    body: rows,
    startY: 28,
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      halign: 'center',
      valign: 'middle',
      lineWidth: 0.2,
      lineColor: [200, 200, 200],
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [12, 74, 110],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: dateColWidth, fontStyle: 'bold', fillColor: [241, 245, 249] },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 10, right: 10 },
  });

  if (crewStats.length > 0) {
    const lastTable = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable;
    const finalY = lastTable.finalY + 10;

    let statsStartY: number;
    if (finalY > 170) {
      doc.addPage();
      statsStartY = 15;
    } else {
      statsStartY = finalY;
    }

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(t('heading.crewStatisticsExport', userLocale), 14, statsStartY);

    const statsHeaders = [
      t('label.crewMember', userLocale),
      t('common.role', userLocale),
      t('label.totalWatches', userLocale),
      t('common.hours', userLocale),
    ];

    const statsRows = crewStats
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
          stat.totalHours + 'h',
        ];
      });

    (doc as unknown as { autoTable: (opts: unknown) => void }).autoTable({
      head: [statsHeaders],
      body: statsRows,
      startY: statsStartY + 5,
      theme: 'striped',
      styles: {
        fontSize: 9,
        cellPadding: 3,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [12, 74, 110],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { left: 14 },
    });
  }

  const pageCount = (
    doc as unknown as { internal: { getNumberOfPages(): number } }
  ).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(
      `Wygenerowano: ${new Date().toLocaleString(userLocale || 'pl-PL')} | Strona ${i} z ${pageCount}`,
      148,
      205,
      { align: 'center' },
    );
  }

  const filenameSafeStartDate = startDateObj.toISOString().split('T')[0];
  const filenameSafeEndDate = endDateObj.toISOString().split('T')[0];
  const filename = `grafik_wacht_${filenameSafeStartDate}_${filenameSafeEndDate}.pdf`;
  doc.save(filename);
}
