import React from 'react';
import { Icon } from './Icon';
import { ROLES } from '../constants';
import type { DaySchedule, Locale } from '../types';

interface DragItem {
  dayIdx: number;
  slotIdx: number;
  pIdx: number;
}

interface ScheduleTableRowProps {
  daySchedule: DaySchedule;
  dayIndex: number;
  startDate: string;
  isNightMode: boolean;
  isReadOnly: boolean;
  draggedItem: DragItem | null;
  onDragStart: (e: React.DragEvent, dayIdx: number, slotIdx: number, pIdx: number) => void;
  onDrop: (e: React.DragEvent, dayIdx: number, slotIdx: number, pIdx: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  t: (key: string, locale: Locale) => string;
  userLocale: Locale;
}

export const ScheduleTableRow = React.memo(
  function ScheduleTableRow({
    daySchedule,
    dayIndex,
    startDate,
    isNightMode,
    isReadOnly,
    draggedItem,
    onDragStart,
    onDrop,
    onDragOver,
    t,
    userLocale,
  }: ScheduleTableRowProps) {
    const rowDate = new Date(startDate);
    rowDate.setDate(rowDate.getDate() + dayIndex);

    return (
      <tr
        className={`transition-colors print:hover:bg-transparent ${isNightMode ? 'hover:bg-zinc-900/50' : 'hover:bg-slate-50'}`}
      >
        <td
          className={`px-4 py-4 border font-bold text-center sticky-date-column print:bg-transparent print:border-slate-400 print:static ${isNightMode ? 'bg-zinc-900 border-red-900/50' : 'bg-slate-50 border-slate-200'}`}
        >
          <div className="text-sm">
            {t('label.day', userLocale)} {daySchedule.day}
          </div>
          <div
            className={`text-xs font-normal ${isNightMode ? 'text-red-700' : 'text-slate-500'}`}
          >
            {rowDate.toLocaleDateString(userLocale, { day: '2-digit', month: '2-digit' })}
          </div>
        </td>
        {daySchedule.slots.map((slot, slotIndex) => (
          <td
            key={slotIndex}
            className={`p-2 border align-top print:border-slate-400 ${isNightMode ? 'border-red-900/50' : 'border-slate-200'}`}
          >
            <div className="flex flex-col space-y-1.5 h-full">
              <div className="flex-1 space-y-1">
                {slot.assigned.map((person, personIndex) => {
                  const roleIcon = ROLES[person.role.toUpperCase()]?.icon || 'User';
                  return (
                    <div
                      key={personIndex}
                      draggable={!isReadOnly}
                      onDragStart={(e) =>
                        !isReadOnly && onDragStart(e, dayIndex, slotIndex, personIndex)
                      }
                      onDrop={(e) =>
                        !isReadOnly && onDrop(e, dayIndex, slotIndex, personIndex)
                      }
                      onDragOver={!isReadOnly ? onDragOver : undefined}
                      className={`text-sm px-2 py-1 rounded border flex items-center space-x-2 ${!isReadOnly ? 'cursor-move' : ''} print:border-none print:p-0 print:bg-transparent transition-all ${draggedItem?.dayIdx === dayIndex && draggedItem?.slotIdx === slotIndex && draggedItem?.pIdx === personIndex ? 'opacity-50' : ''} ${isNightMode ? 'bg-black border-red-800 hover:border-red-500' : 'bg-white border-slate-200 hover:border-sky-300 hover:shadow-sm'}`}
                    >
                      <Icon
                        name={roleIcon}
                        className={`w-3 h-3 print:hidden ${isNightMode ? 'text-red-800' : 'text-slate-400'}`}
                      />
                      <span
                        className={`font-medium truncate ${isNightMode ? '' : 'text-slate-800'}`}
                      >
                        {person.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </td>
        ))}
      </tr>
    );
  },
  (prev, next) => {
    return (
      prev.daySchedule === next.daySchedule &&
      prev.dayIndex === next.dayIndex &&
      prev.startDate === next.startDate &&
      prev.isNightMode === next.isNightMode &&
      prev.isReadOnly === next.isReadOnly &&
      prev.draggedItem === next.draggedItem &&
      prev.userLocale === next.userLocale &&
      prev.onDragStart === next.onDragStart &&
      prev.onDrop === next.onDrop &&
      prev.onDragOver === next.onDragOver &&
      prev.t === next.t
    );
  },
);
