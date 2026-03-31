import type {
  CrewMember,
  WatchSlot,
  DaySchedule,
  Recommendation,
  CoverageResult,
  WatchTemplate,
} from '../types';
import { WATCH_TEMPLATES } from '../constants';

export function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return function (this: unknown, ...args: unknown[]) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  } as T;
}

export function getActiveCrew(crew: CrewMember[], captainParticipates: boolean): CrewMember[] {
  return crew.filter((c) => {
    const role = (c.role || '').toLowerCase();
    return role !== 'cook' && (captainParticipates || role !== 'captain');
  });
}

export function recommendWatchSystem(
  crew: CrewMember[],
  captainParticipates = true,
): Recommendation[] {
  const activeCrew = getActiveCrew(crew, captainParticipates);
  const crewSize = activeCrew.length;

  const experiencedCrew = activeCrew.filter((c) => {
    const role = (c.role || '').toLowerCase();
    return role === 'captain' || role === 'officer';
  }).length;

  const scores = Object.entries(WATCH_TEMPLATES).map(([key, template]) => {
    let score = 0;

    if (crewSize >= template.minCrew && crewSize <= template.optimalCrew + 2) {
      score += 25;
      const diff = Math.abs(crewSize - template.optimalCrew);
      score += Math.max(0, 15 - diff * 3);
    } else if (crewSize < template.minCrew) {
      score -= 20;
    }

    const maxReqCrew = Math.max(...template.slots.map((s) => s.reqCrew));
    if (maxReqCrew > crewSize) {
      score -= 30;
    } else if (maxReqCrew <= crewSize / 2) {
      score += 10;
    }

    if (crewSize <= 4) {
      const slotsCount = template.slots.length;
      if (slotsCount <= 4) score += 10;
      if (slotsCount >= 7) score -= 10;
    }

    if (crewSize >= 8) {
      const slotsCount = template.slots.length;
      if (slotsCount >= 6) score += 10;
    }

    return { key, template, score };
  });

  scores.sort((a, b) => b.score - a.score);

  return scores.slice(0, 3).map((s) => ({
    templateKey: s.key,
    template: s.template,
    score: s.score,
    reason: generateRecommendationReason(s, crewSize, experiencedCrew),
  }));
}

export function generateRecommendationReason(
  scoreObj: { template: WatchTemplate; score: number },
  crewSize: number,
  experiencedCrew: number,
): string {
  const reasons: string[] = [];

  if (crewSize >= scoreObj.template.minCrew && crewSize <= scoreObj.template.optimalCrew + 2) {
    reasons.push(`Optymalna wielkość załogi (${crewSize} osób)`);
  }

  const slotsCount = scoreObj.template.slots.length;
  if (crewSize <= 4 && slotsCount <= 4) {
    reasons.push('Prosty system dla małej załogi');
  } else if (crewSize >= 8 && slotsCount >= 6) {
    reasons.push('Dobre rozłożenie obciążenia dla dużej załogi');
  }

  if (experiencedCrew >= crewSize * 0.4) {
    reasons.push('Doświadczona załoga');
  }

  return reasons.length > 0 ? reasons.join(', ') : 'Uniwersalny system';
}

export function calculateCoverage(slots: WatchSlot[]): CoverageResult {
  if (slots.length === 0) return { totalMinutes: 0, gaps: [], hasFull24h: false };

  const coverage = new Array(1440).fill(false);

  slots.forEach((slot) => {
    const startMinutes =
      parseInt(slot.start.split(':')[0]) * 60 + parseInt(slot.start.split(':')[1]);
    const endMinutes =
      slot.end === '24:00'
        ? 1440
        : parseInt(slot.end.split(':')[0]) * 60 + parseInt(slot.end.split(':')[1]);

    for (let i = startMinutes; i < endMinutes; i++) {
      coverage[i] = true;
    }
  });

  const totalMinutes = coverage.filter(Boolean).length;

  const gaps: CoverageResult['gaps'] = [];
  let gapStart: number | null = null;
  for (let i = 0; i < 1440; i++) {
    if (!coverage[i] && gapStart === null) {
      gapStart = i;
    } else if (coverage[i] && gapStart !== null) {
      gaps.push({
        start: `${Math.floor(gapStart / 60)
          .toString()
          .padStart(2, '0')}:${(gapStart % 60).toString().padStart(2, '0')}`,
        end: `${Math.floor(i / 60)
          .toString()
          .padStart(2, '0')}:${(i % 60).toString().padStart(2, '0')}`,
        minutes: i - gapStart,
      });
      gapStart = null;
    }
  }
  if (gapStart !== null) {
    gaps.push({
      start: `${Math.floor(gapStart / 60)
        .toString()
        .padStart(2, '0')}:${(gapStart % 60).toString().padStart(2, '0')}`,
      end: '24:00',
      minutes: 1440 - gapStart,
    });
  }

  return { totalMinutes, gaps, hasFull24h: totalMinutes === 1440 };
}

export function generateStandardSchedule(
  activeCrew: CrewMember[],
  slots: WatchSlot[],
  days: number,
): DaySchedule[] {
  let currentCrewIndex = 0;
  const newSchedule: DaySchedule[] = [];
  const sortedSlots = [...slots].sort((a, b) => a.start.localeCompare(b.start));

  for (let day = 1; day <= days; day++) {
    const daySlots = sortedSlots.map((slot) => {
      const assigned: CrewMember[] = [];
      for (let i = 0; i < slot.reqCrew && activeCrew.length > 0; i++) {
        const member = activeCrew[currentCrewIndex];
        if (member) assigned.push(member);
        currentCrewIndex = (currentCrewIndex + 1) % activeCrew.length;
      }
      return { ...slot, assigned };
    });
    newSchedule.push({ day, slots: daySlots });
  }

  return newSchedule;
}

export function generateSmallCrewSchedule(
  activeCrew: CrewMember[],
  slots: WatchSlot[],
  days: number,
): DaySchedule[] {
  const newSchedule: DaySchedule[] = [];
  const sortedSlots = [...slots].sort((a, b) => a.start.localeCompare(b.start));

  interface CrewTracker {
    person: CrewMember;
    lastSlotIndex: number;
    consecutiveWatches: number;
    nightWatchesInRow: number;
  }

  const crewLastWorked: CrewTracker[] = activeCrew.map((person) => ({
    person,
    lastSlotIndex: -1,
    consecutiveWatches: 0,
    nightWatchesInRow: 0,
  }));

  const isNightSlot = (slot: WatchSlot) => {
    const hour = parseInt(slot.start.split(':')[0]);
    return hour >= 0 && hour < 6;
  };

  const findBestCrewMember = (slotIndex: number, assignedInSlot: CrewMember[]) => {
    const scores = crewLastWorked
      .filter((c) => !assignedInSlot.some((a) => a.id === c.person.id))
      .map((crewMember) => {
        let score = 0;
        const slotsSinceLastWork = slotIndex - crewMember.lastSlotIndex;
        score += slotsSinceLastWork * 10;
        if (crewMember.consecutiveWatches > 0) {
          score -= crewMember.consecutiveWatches * 20;
        }
        if (isNightSlot(sortedSlots[slotIndex % sortedSlots.length])) {
          score -= crewMember.nightWatchesInRow * 15;
        }
        return { crewMember, score };
      });

    scores.sort((a, b) => b.score - a.score);
    return scores[0]?.crewMember;
  };

  for (let day = 1; day <= days; day++) {
    const daySlots = sortedSlots.map((slot, slotIndexInDay) => {
      const globalSlotIndex = (day - 1) * sortedSlots.length + slotIndexInDay;
      const assigned: CrewMember[] = [];

      for (let i = 0; i < slot.reqCrew; i++) {
        const bestCrew = findBestCrewMember(globalSlotIndex, assigned);

        if (bestCrew) {
          assigned.push(bestCrew.person);
          bestCrew.lastSlotIndex = globalSlotIndex;
          bestCrew.consecutiveWatches++;

          if (isNightSlot(slot)) {
            bestCrew.nightWatchesInRow++;
          } else {
            bestCrew.nightWatchesInRow = 0;
          }

          crewLastWorked.forEach((c) => {
            if (
              c.person.id !== bestCrew.person.id &&
              c.lastSlotIndex < globalSlotIndex - sortedSlots.length
            ) {
              c.consecutiveWatches = 0;
            }
          });
        } else {
          if (activeCrew.length > 0) {
            const fallbackIndex = (globalSlotIndex + i) % activeCrew.length;
            const fallbackMember = activeCrew[fallbackIndex];
            if (fallbackMember) assigned.push(fallbackMember);
          }
        }
      }

      return { ...slot, assigned };
    });

    newSchedule.push({ day, slots: daySlots });
  }

  return newSchedule;
}

export function detectScheduleConflicts(
  scheduleData: DaySchedule[],
  _sortedSlots: WatchSlot[],
): void {
  interface ConflictEntry {
    type: string;
    person: string;
    day?: number;
    message: string;
    [key: string]: unknown;
  }

  const conflicts: ConflictEntry[] = [];
  const crewWatchHistory: Record<
    string,
    {
      name: string;
      consecutiveNightWatches: number;
      lastWatch: { day: number; start: string; end: string } | null;
      nightWatchCount: number;
      totalWatches: number;
    }
  > = {};

  const isNightWatch = (startTime: string) => {
    const hour = parseInt(startTime.split(':')[0]);
    return hour >= 0 && hour < 6;
  };

  const calculateRestHours = (slot1EndTime: string, slot2StartTime: string) => {
    const [h1, m1] = slot1EndTime.split(':').map(Number);
    const [h2, m2] = slot2StartTime.split(':').map(Number);
    let end1 = h1 * 60 + m1;
    let start2 = h2 * 60 + m2;
    if (start2 < end1) start2 += 24 * 60;
    return (start2 - end1) / 60;
  };

  scheduleData.forEach((daySchedule) => {
    daySchedule.slots.forEach((slot) => {
      slot.assigned
        .filter((p) => p != null)
        .forEach((person) => {
          if (!crewWatchHistory[person.id]) {
            crewWatchHistory[person.id] = {
              name: person.name,
              consecutiveNightWatches: 0,
              lastWatch: null,
              nightWatchCount: 0,
              totalWatches: 0,
            };
          }

          const history = crewWatchHistory[person.id];
          history.totalWatches++;

          if (isNightWatch(slot.start)) {
            history.nightWatchCount++;
            history.consecutiveNightWatches++;

            if (history.consecutiveNightWatches > 3) {
              conflicts.push({
                type: 'consecutive_night',
                person: person.name,
                day: daySchedule.day,
                count: history.consecutiveNightWatches,
                message: `${person.name} ma ${history.consecutiveNightWatches} nocne wachty pod rząd (max zalecane: 3)`,
              });
            }
          } else {
            history.consecutiveNightWatches = 0;
          }

          if (history.lastWatch) {
            const restHours = calculateRestHours(history.lastWatch.end, slot.start);
            if (restHours < 6 && restHours >= 0) {
              conflicts.push({
                type: 'insufficient_rest',
                person: person.name,
                day: daySchedule.day,
                restHours: restHours.toFixed(1),
                message: `${person.name} ma tylko ${restHours.toFixed(1)}h odpoczynku między wachtami (min zalecane: 6h)`,
              });
            }
          }

          history.lastWatch = {
            day: daySchedule.day,
            start: slot.start,
            end: slot.end,
          };
        });
    });
  });

  const crewMembers = Object.values(crewWatchHistory);
  if (crewMembers.length > 0) {
    const avgNightWatches =
      crewMembers.reduce((sum, c) => sum + c.nightWatchCount, 0) / crewMembers.length;

    crewMembers.forEach((member) => {
      const difference = Math.abs(member.nightWatchCount - avgNightWatches);
      if (difference > avgNightWatches * 0.3 && avgNightWatches > 0) {
        conflicts.push({
          type: 'uneven_distribution',
          person: member.name,
          nightWatchCount: member.nightWatchCount,
          average: avgNightWatches.toFixed(1),
          message: `${member.name} ma nierówny rozkład nocnych wacht: ${member.nightWatchCount} (średnia: ${avgNightWatches.toFixed(1)})`,
        });
      }
    });
  }

  if (conflicts.length > 0) {
    const uniqueConflicts = conflicts.filter(
      (conflict, index, self) => index === self.findIndex((c) => c.message === conflict.message),
    );
    console.warn('Schedule conflicts detected:', uniqueConflicts);
  }
}
