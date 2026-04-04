// @ts-nocheck
import React from 'react';
import { Icon } from './Icon';
import { t } from '../constants';
import type { DaySchedule, Locale } from '../types';

interface GanttChartProps {
  isNightMode: boolean;
  userLocale: Locale;
  schedule: DaySchedule[];
  startDate: string;
}

export function GanttChart({ isNightMode, userLocale, schedule, startDate }: GanttChartProps) {
  const allCrewMembers = [...new Set(schedule.flatMap(day =>
    day.slots.flatMap(slot => slot.assigned.map(p => p.name))
  ))];

  return (
    <div className={`p-6 rounded-xl shadow-sm border ${isNightMode ? 'bg-zinc-950 border-red-900' : 'bg-white border-slate-200 text-slate-800'}`}>
      <h2 className={`text-2xl font-bold mb-6 flex items-center space-x-2 ${isNightMode ? 'text-red-500' : 'text-sky-900'}`}>
        <Icon name="BarChart3" className="w-6 h-6" />
        <span>{t('heading.ganttChart', userLocale)}</span>
      </h2>

      {schedule.map((daySchedule, dayIndex) => {
        const dayDate = new Date(startDate);
        dayDate.setDate(dayDate.getDate() + dayIndex);

        return (
          <div key={dayIndex} className="mb-8 last:mb-0">
            {/* Day header */}
            <div className={`mb-3 pb-2 border-b-2 ${isNightMode ? 'border-red-900' : 'border-slate-300'}`}>
              <h3 className={`text-lg font-bold ${isNightMode ? 'text-red-400' : 'text-sky-800'}`}>
                {t('common.day', userLocale)} {daySchedule.day}
                <span className={`ml-2 text-sm font-normal ${isNightMode ? 'text-red-700' : 'text-slate-500'}`}>
                  ({dayDate.toLocaleDateString(userLocale, {weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric'})})
                </span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Time axis */}
                <div className="flex mb-4">
                  <div className={`w-32 font-bold text-sm ${isNightMode ? 'text-red-700' : 'text-slate-600'}`}>{t('label.crewMember', userLocale)}</div>
                  <div className="flex-1 flex border-l border-r" style={{borderColor: isNightMode ? '#7f1d1d' : '#cbd5e1'}}>
                    {Array.from({length: 24}, (_, hour) => (
                      <div key={hour} className={`flex-1 text-center text-xs border-r ${isNightMode ? 'border-red-900/30 text-red-800' : 'border-slate-200 text-slate-500'}`}>
                        {String(hour).padStart(2, '0')}:00
                      </div>
                    ))}
                  </div>
                </div>

                {/* Crew rows with watches */}
                {allCrewMembers.map(crewName => (
                  <div key={crewName} className="mb-2">
                    <div className="flex items-stretch">
                      <div className={`w-32 font-medium text-sm flex items-center ${isNightMode ? 'text-red-400' : 'text-slate-700'}`}>
                        {crewName}
                      </div>
                      <div className="flex-1 relative h-8 border-l border-r" style={{borderColor: isNightMode ? '#7f1d1d' : '#cbd5e1'}}>
                        {/* 24-hour grid lines */}
                        {Array.from({length: 24}, (_, i) => (
                          <div key={i} className="absolute h-full border-r" style={{
                            left: `${(i / 24) * 100}%`,
                            borderColor: isNightMode ? '#7f1d1d33' : '#e2e8f0'
                          }}></div>
                        ))}

                        {/* Watch bars for current day */}
                        {daySchedule.slots.map((slot, idx) => {
                          if (!slot.assigned.some(p => p.name === crewName)) return null;

                          const [startH, startM] = slot.start.split(':').map(Number);
                          const [endH, endM] = slot.end === '24:00' ? [24, 0] : slot.end.split(':').map(Number);
                          const startPercent = ((startH + startM / 60) / 24) * 100;
                          const endPercent = ((endH + endM / 60) / 24) * 100;
                          const width = endPercent - startPercent;

                          const colors = [
                            {bg: isNightMode ? 'bg-blue-900' : 'bg-blue-500', text: 'text-white'},
                            {bg: isNightMode ? 'bg-green-900' : 'bg-green-500', text: 'text-white'},
                            {bg: isNightMode ? 'bg-purple-900' : 'bg-purple-500', text: 'text-white'},
                            {bg: isNightMode ? 'bg-orange-900' : 'bg-orange-500', text: 'text-white'},
                            {bg: isNightMode ? 'bg-pink-900' : 'bg-pink-500', text: 'text-white'},
                            {bg: isNightMode ? 'bg-teal-900' : 'bg-teal-500', text: 'text-white'}
                          ];
                          const color = colors[idx % colors.length];

                          return (
                            <div
                              key={idx}
                              className={`absolute top-0 h-full ${color.bg} ${color.text} rounded px-1 text-xs flex items-center justify-center font-medium shadow`}
                              style={{
                                left: `${startPercent}%`,
                                width: `${width}%`
                              }}
                              title={`${slot.start} - ${slot.end}`}
                            >
                              {width > 8 && `${slot.start}-${slot.end}`}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}

      <div className={`mt-6 p-4 rounded-lg ${isNightMode ? 'bg-black border border-red-900' : 'bg-slate-50 border border-slate-200'}`}>
        <p className={`text-sm font-medium ${isNightMode ? 'text-red-600' : 'text-slate-700'}`}>
          <strong>{t('label.info', userLocale)}:</strong> {t('msg.ganttInfo', userLocale)}
        </p>
      </div>
    </div>
  );
}
