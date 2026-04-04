import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { CrewMember, WatchSlot, DaySchedule, DashboardData, CrewStat, AbsoluteSlot } from '../types';
import {
  getActiveCrew,
  generateStandardSchedule,
  generateSmallCrewSchedule,
  detectScheduleConflicts,
} from '../utils/schedule-logic';

export interface ScheduleEngineReturn {
  schedule: DaySchedule[];
  setSchedule: React.Dispatch<React.SetStateAction<DaySchedule[]>>;
  isGenerated: boolean;
  setIsGenerated: React.Dispatch<React.SetStateAction<boolean>>;
  days: number;
  setDays: (d: number) => void;
  startDate: string;
  setStartDate: (d: string) => void;
  currentTime: Date;
  dashboardData: DashboardData | null;
  crewStats: CrewStat[];
  generateSchedule: () => void;
}

export function computeAbsoluteSlots(
  schedule: DaySchedule[],
  startDate: string,
): AbsoluteSlot[] {
  const baseDate = new Date(startDate);
  baseDate.setHours(0, 0, 0, 0);
  const allSlotsAbsolute: AbsoluteSlot[] = [];

  schedule.forEach((dayObj, dayIdx) => {
    dayObj.slots.forEach((slot) => {
      const startParts = slot.start.split(':').map(Number);
      const endParts = slot.end.split(':').map(Number);

      const slotStart = new Date(baseDate);
      slotStart.setDate(slotStart.getDate() + dayIdx);
      slotStart.setHours(startParts[0], startParts[1], 0, 0);

      const slotEnd = new Date(baseDate);
      slotEnd.setDate(slotEnd.getDate() + dayIdx);
      if (endParts[0] === 24) {
        slotEnd.setDate(slotEnd.getDate() + 1);
        slotEnd.setHours(0, endParts[1], 0, 0);
      } else if (endParts[0] < startParts[0]) {
        slotEnd.setDate(slotEnd.getDate() + 1);
        slotEnd.setHours(endParts[0], endParts[1], 0, 0);
      } else {
        slotEnd.setHours(endParts[0], endParts[1], 0, 0);
      }

      allSlotsAbsolute.push({
        ...slot,
        dayNumber: dayObj.day,
        absoluteStart: slotStart,
        absoluteEnd: slotEnd,
      });
    });
  });

  allSlotsAbsolute.sort((a, b) => a.absoluteStart.getTime() - b.absoluteStart.getTime());
  return allSlotsAbsolute;
}

export function computeDashboard(
  allSlotsAbsolute: AbsoluteSlot[],
  currentTime: Date,
): DashboardData {
  const tripStart = allSlotsAbsolute[0]?.absoluteStart;
  const tripEnd = allSlotsAbsolute[allSlotsAbsolute.length - 1]?.absoluteEnd;

  let currentSlot: AbsoluteSlot | null = null;
  let nextSlot: AbsoluteSlot | null = null;
  let status = 'W TRAKCIE';
  let progress = 0;

  if (!tripStart || !tripEnd) {
    return { currentSlot: null, nextSlot: null, status: 'PRZED REJSEM', progress: 0, allSlotsAbsolute };
  }

  if (currentTime < tripStart) {
    status = 'PRZED REJSEM';
    nextSlot = allSlotsAbsolute[0];
  } else if (currentTime >= tripEnd) {
    status = 'ZAKOŃCZONY';
    progress = 100;
  } else {
    const cIdx = allSlotsAbsolute.findIndex(
      (s) => currentTime >= s.absoluteStart && currentTime < s.absoluteEnd,
    );
    if (cIdx !== -1) {
      currentSlot = allSlotsAbsolute[cIdx];
      nextSlot = allSlotsAbsolute[cIdx + 1] || null;
    } else {
      nextSlot = allSlotsAbsolute.find((s) => s.absoluteStart > currentTime) || null;
    }
    progress = Math.max(
      0,
      Math.min(100, ((currentTime.getTime() - tripStart.getTime()) / (tripEnd.getTime() - tripStart.getTime())) * 100),
    );
  }

  return { currentSlot, nextSlot, status, progress, allSlotsAbsolute };
}

export function computeCrewStats(
  crew: CrewMember[],
  allSlotsAbsolute: AbsoluteSlot[],
): CrewStat[] {
  return crew.map((c) => {
    let totalMinutes = 0;
    let hardWatches = 0;

    allSlotsAbsolute.forEach((slot) => {
      if (slot.assigned.some((p) => p.id === c.id)) {
        const duration = (slot.absoluteEnd.getTime() - slot.absoluteStart.getTime()) / 60000;
        totalMinutes += duration;
        const startHour = slot.absoluteStart.getHours();
        if (startHour >= 0 && startHour <= 5) hardWatches++;
      }
    });
    return { ...c, totalHours: Math.round((totalMinutes / 60) * 10) / 10, hardWatches };
  });
}

export function useScheduleEngine(
  crew: CrewMember[],
  slots: WatchSlot[],
  captainParticipates: boolean,
): ScheduleEngineReturn {
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [isGenerated, setIsGenerated] = useState(false);
  const [days, setDays] = useState(7);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    timerRef.current = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timerRef.current);
  }, []);

  const dashboardData = useMemo<DashboardData | null>(() => {
    if (!isGenerated || schedule.length === 0) return null;
    const absolute = computeAbsoluteSlots(schedule, startDate);
    return computeDashboard(absolute, currentTime);
  }, [schedule, startDate, isGenerated, currentTime]);

  const crewStats = useMemo<CrewStat[]>(() => {
    if (!isGenerated || !dashboardData) return [];
    return computeCrewStats(crew, dashboardData.allSlotsAbsolute);
  }, [schedule, crew, dashboardData, isGenerated]);

  const generateSchedule = useCallback(() => {
    const active = getActiveCrew(crew, captainParticipates);
    if (active.length === 0) {
      alert('Brak załogi do wacht nawigacyjnych!');
      return;
    }

    const maxReqCrew = slots.reduce((max, slot) => Math.max(max, slot.reqCrew || 0), 0);
    if (active.length < maxReqCrew) {
      alert(
        'Za mało członków załogi do obsadzenia wacht: wymagane minimum ' +
          maxReqCrew +
          ', dostępnych ' +
          active.length +
          '.',
      );
      return;
    }

    const isSmallCrew = active.length <= 4;
    const newSchedule = isSmallCrew
      ? generateSmallCrewSchedule(active, slots, days)
      : generateStandardSchedule(active, slots, days);

    setSchedule(newSchedule);
    setIsGenerated(true);
    detectScheduleConflicts(newSchedule, slots);
  }, [crew, captainParticipates, slots, days]);

  return {
    schedule,
    setSchedule,
    isGenerated,
    setIsGenerated,
    days,
    setDays,
    startDate,
    setStartDate,
    currentTime,
    dashboardData,
    crewStats,
    generateSchedule,
  };
}
