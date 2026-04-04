// @ts-nocheck
import React from 'react';
import { Icon } from './Icon';
import { ROLES, t } from '../constants';
import { ScheduleTableRow } from './ScheduleTableRow';
import type { DaySchedule, CrewStat, Locale } from '../types';

interface DragItem {
  dayIdx: number;
  slotIdx: number;
  pIdx: number;
}

interface ScheduleTableProps {
  isNightMode: boolean;
  userLocale: Locale;
  schedule: DaySchedule[];
  startDate: string;
  isReadOnly: boolean;
  draggedItem: DragItem | null;
  handleDragStart: (e: React.DragEvent, dayIdx: number, slotIdx: number, pIdx: number) => void;
  handleDrop: (e: React.DragEvent, dayIdx: number, slotIdx: number, pIdx: number) => void;
  handleDragOver: (e: React.DragEvent) => void;
  crewStats: CrewStat[];
  captainParticipates: boolean;
  downloadICS: (c: CrewStat) => void;
}

export function ScheduleTable({
  isNightMode, userLocale, schedule, startDate,
  isReadOnly, draggedItem, handleDragStart, handleDrop, handleDragOver,
  crewStats, captainParticipates, downloadICS,
}: ScheduleTableProps) {
  return (
    <>
      <div id="print-schedule-section" className={`p-3 sm:p-4 md:p-6 rounded-xl shadow-sm border print:border-none print:shadow-none print:p-0 ${isNightMode ? 'bg-zinc-950 border-red-900 text-red-600' : 'bg-white border-slate-200 text-slate-800'}`}>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 sm:mb-4 md:mb-6 gap-2">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold flex items-center print:text-black">{t('heading.fullSchedule', userLocale)}</h2>
          <span className={`text-xs italic print:hidden hidden sm:block ${isNightMode ? 'text-red-800' : 'text-slate-400'}`}>
            {t('tip.dragDrop', userLocale)}
          </span>
        </div>

        {/* Mobile Card View - Hidden, using table instead */}
        <div className="hidden print:hidden space-y-3 sm:space-y-4">
          {schedule.map((daySchedule, dayIndex) => {
            const rowDate = new Date(startDate);
            rowDate.setDate(rowDate.getDate() + dayIndex);

            return (
              <div key={dayIndex} className={`rounded-lg border overflow-hidden ${isNightMode ? 'border-red-900/50 bg-zinc-900' : 'border-slate-200 bg-white'}`}>
                {/* Day Header */}
                <div className={`px-4 py-3 font-bold sticky top-0 z-10 ${isNightMode ? 'bg-black text-red-500 border-b border-red-900' : 'bg-sky-900 text-white border-b border-sky-800'}`}>
                  <div className="flex justify-between items-center">
                    <span>{t('label.day', userLocale)} {daySchedule.day}</span>
                    <span className="text-sm font-normal">{rowDate.toLocaleDateString(userLocale, {day:'2-digit', month:'2-digit', year:'numeric'})}</span>
                  </div>
                </div>

                {/* Watch Slots */}
                <div className="divide-y" style={{borderColor: isNightMode ? '#7f1d1d33' : '#e2e8f033'}}>
                  {daySchedule.slots.map((slot, slotIndex) => (
                    <div key={slotIndex} className={`p-4 ${isNightMode ? 'hover:bg-zinc-800/50' : 'hover:bg-slate-50/50'} transition-colors`}>
                      {/* Slot Header */}
                      <div className="flex justify-between items-center mb-3">
                        <span className={`font-semibold text-base ${isNightMode ? 'text-red-400' : 'text-sky-800'}`}>
                          {slot.start} - {slot.end}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${isNightMode ? 'bg-black text-red-700 border border-red-900' : 'bg-sky-50 text-sky-700 border border-sky-200'}`}>
                          Osoby: {slot.reqCrew}
                        </span>
                      </div>

                      {/* Assigned Crew */}
                      <div className="space-y-2 mb-3">
                        {slot.assigned.map((person, personIndex) => {
                          const roleIcon = ROLES[person.role.toUpperCase()]?.icon || 'User';
                          return (
                            <div
                              key={personIndex}
                              className={`px-4 py-3 min-h-[44px] rounded-lg border flex items-center space-x-3 mobile-touch-target ${isNightMode ? 'bg-black border-red-800' : 'bg-slate-50 border-slate-300'}`}
                            >
                              <Icon name={roleIcon} className={`w-5 h-5 shrink-0 ${isNightMode ? 'text-red-700' : 'text-slate-500'}`} />
                              <span className={`font-medium text-base ${isNightMode ? 'text-red-300' : 'text-slate-800'}`}>{person.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Table View - Now visible on all screen sizes with horizontal scroll */}
        <div className={`rounded-lg p-4 print:p-0 print:shadow-none print:rounded-none print:bg-transparent ${isNightMode ? 'bg-black text-red-600' : 'bg-white text-slate-800 shadow-lg'}`}>
          <div id="print-schedule-table" className="block print:block overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
            <thead className={`print:bg-slate-200 print:text-black ${isNightMode ? 'bg-black border-red-900 text-red-600' : 'bg-sky-900 border-sky-800 text-white'}`}>
              <tr>
                <th className={`px-4 py-3 border whitespace-nowrap w-24 sticky-date-column ${isNightMode ? 'border-red-900 bg-black' : 'border-sky-800 bg-sky-900'} print:border-slate-400 print:static`}>Data</th>
                {schedule[0]?.slots.map((slot, i) => (
                  <th key={i} className={`px-4 py-3 border text-center min-w-[140px] ${isNightMode ? 'border-red-900' : 'border-sky-800'} print:border-slate-400`}>
                    <div className="font-bold">{slot.start} - {slot.end}</div>
                    <div className={`text-xs font-normal mt-0.5 ${isNightMode ? 'text-red-800' : 'text-sky-200'} print:text-slate-600`}>Osoby: {slot.reqCrew}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {schedule.map((daySchedule, dayIndex) => (
                <ScheduleTableRow
                  key={dayIndex}
                  daySchedule={daySchedule}
                  dayIndex={dayIndex}
                  startDate={startDate}
                  isNightMode={isNightMode}
                  isReadOnly={isReadOnly}
                  draggedItem={draggedItem}
                  onDragStart={handleDragStart}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  t={t}
                  userLocale={userLocale}
                />
              ))}
            </tbody>
          </table>
        </div>
        </div>
      </div>

      {crewStats.length > 0 && (
        <div className={`p-6 rounded-xl shadow-sm border print:hidden ${isNightMode ? 'bg-zinc-950 border-red-900' : 'bg-white border-slate-200 text-slate-800'}`}>
          <h2 className={`text-xl font-bold mb-4 flex items-center space-x-2 ${isNightMode ? 'text-red-500' : 'text-sky-900'}`}>
            <Icon name="Shield" className="w-5 h-5" /> <span>{t('heading.summaryAndExport', userLocale)}</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {crewStats.map(c => {
              const normalizedRole = (c.role || '').toLowerCase();
              const isExcluded = normalizedRole === 'cook' || (normalizedRole === 'captain' && !captainParticipates);
              return (
                <div key={c.id} className={`p-4 rounded-lg border flex justify-between items-center ${isNightMode ? 'bg-black border-red-900' : 'bg-slate-50 border-slate-200'}`}>
                  <div>
                    <div className="font-bold flex items-center space-x-2">
                      <span className={`${isNightMode ? '' : 'text-slate-800'} ${isExcluded ? 'line-through opacity-50' : ''}`}>{c.name}</span>
                      {normalizedRole === 'cook' && <Icon name="ChefHat" className="w-4 h-4 text-emerald-500" />}
                      {normalizedRole === 'captain' && !captainParticipates && <Icon name="Shield" className="w-4 h-4 text-amber-500" />}
                    </div>
                    {!isExcluded ? (
                      <div className={`text-xs mt-1 ${isNightMode ? 'text-red-700' : 'text-slate-500'}`}>
                        Godzin: <span className={`font-semibold ${isNightMode ? 'text-red-400' : 'text-slate-800'}`}>{c.totalHours}h</span> |
                        Trudne wachty: <span className={`font-semibold ${isNightMode ? 'text-red-400' : 'text-slate-800'}`}>{c.hardWatches}</span>
                      </div>
                    ) : (
                      <div className={`text-xs mt-1 ${isNightMode ? 'text-red-800' : 'text-slate-500'}`}>{t('label.exemptFromWatches', userLocale)}</div>
                    )}
                  </div>
                  {!isExcluded && (
                    <button
                      onClick={() => downloadICS(c)} title="Pobierz kalendarz do telefonu"
                      className={`p-2 rounded-full transition ${isNightMode ? 'bg-red-900 text-black hover:bg-red-800' : 'bg-sky-100 text-sky-700 hover:bg-sky-200'}`}
                    >
                      <Icon name="Download" className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
