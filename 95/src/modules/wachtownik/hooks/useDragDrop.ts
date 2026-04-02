import { useState, useCallback } from 'react';
import type { DaySchedule } from '../types';

export interface DragItem {
  dayIdx: number;
  slotIdx: number;
  pIdx: number;
}

export interface DragDropReturn {
  draggedItem: DragItem | null;
  handleDragStart: (e: React.DragEvent, dayIdx: number, slotIdx: number, pIdx: number) => void;
  handleDrop: (e: React.DragEvent, targetDayIdx: number, targetSlotIdx: number, targetPIdx: number) => void;
  handleDragOver: (e: React.DragEvent) => void;
}

export function applyDrop(
  schedule: DaySchedule[],
  source: DragItem,
  target: { dayIdx: number; slotIdx: number; pIdx: number },
): DaySchedule[] {
  const newSchedule: DaySchedule[] = JSON.parse(JSON.stringify(schedule));
  const personA = newSchedule[source.dayIdx].slots[source.slotIdx].assigned[source.pIdx];
  const personB = newSchedule[target.dayIdx].slots[target.slotIdx].assigned[target.pIdx];
  newSchedule[source.dayIdx].slots[source.slotIdx].assigned[source.pIdx] = personB;
  newSchedule[target.dayIdx].slots[target.slotIdx].assigned[target.pIdx] = personA;
  return newSchedule;
}

export function useDragDrop(
  schedule: DaySchedule[],
  setSchedule: React.Dispatch<React.SetStateAction<DaySchedule[]>>,
): DragDropReturn {
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);

  const handleDragStart = useCallback(
    (e: React.DragEvent, dayIdx: number, slotIdx: number, pIdx: number) => {
      setDraggedItem({ dayIdx, slotIdx, pIdx });
      e.dataTransfer.effectAllowed = 'move';
    },
    [],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, targetDayIdx: number, targetSlotIdx: number, targetPIdx: number) => {
      e.preventDefault();
      if (!draggedItem) return;
      const updated = applyDrop(schedule, draggedItem, {
        dayIdx: targetDayIdx,
        slotIdx: targetSlotIdx,
        pIdx: targetPIdx,
      });
      setSchedule(updated);
      setDraggedItem(null);
    },
    [draggedItem, schedule, setSchedule],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => e.preventDefault(), []);

  return { draggedItem, handleDragStart, handleDrop, handleDragOver };
}
