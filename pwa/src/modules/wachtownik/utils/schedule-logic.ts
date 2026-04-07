/**
 * Pure schedule logic functions extracted from Wachtownik App.tsx.
 *
 * Every export is a pure function (no DOM, no React state, no side-effects)
 * so it can be tested and reused independently.
 */

import type {
  CrewMember,
  WatchSlot,
  DaySchedule,
  CoverageResult,
  Recommendation,
  WatchTemplate,
} from '../types';
import { WATCH_TEMPLATES } from '../constants';

// ---------------------------------------------------------------------------
// Types specific to schedule-logic
// ---------------------------------------------------------------------------

export interface SlotValidationResult {
  valid: boolean;
  error?: 'end_before_start' | 'overlap';
  overlappingSlot?: WatchSlot;
}

export interface ScheduleConflict {
  type: 'consecutive_night' | 'insufficient_rest' | 'uneven_distribution';
  person: string;
  day?: number;
  message: string;
  count?: number;
  restHours?: string;
  nightWatchCount?: number;
  average?: string;
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** Convert "HH:MM" to total minutes from midnight.  "24:00" → 1440. */
function timeToMinutes(time: string): number {
  if (time === '24:00') return 1440;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Determine whether a watch starting at `startTime` is a night watch.
 * Night hours: 00:00–05:59.
 */
export function isNightWatch(startTime: string): boolean {
  const hour = parseInt(startTime.split(':')[0], 10);
  return hour >= 0 && hour < 6;
}

/**
 * Calculate the rest hours between the end of one watch and the start of the
 * next.  Handles the day-boundary case (e.g. end 22:00 → start 02:00 = 4 h).
 */
export function calculateRestHours(endTime: string, startTime: string): number {
  const [h1, m1] = endTime.split(':').map(Number);
  const [h2, m2] = startTime.split(':').map(Number);

  const end = h1 * 60 + m1;
  let start = h2 * 60 + m2;

  if (start < end) start += 24 * 60;

  return (start - end) / 60;
}

// ---------------------------------------------------------------------------
// Slot validation
// ---------------------------------------------------------------------------

/**
 * Validate a single watch slot against all other slots.
 *
 * Checks:
 * 1. End time must be after start time (unless end is "24:00").
 * 2. The slot must not overlap with any other slot.
 *
 * Returns a result object instead of calling `alert()` so the caller can
 * decide how to present the error.
 */
export function validateSlotTime(slot: WatchSlot, allSlots: WatchSlot[]): SlotValidationResult {
  const startMinutes = timeToMinutes(slot.start);
  const endMinutes = timeToMinutes(slot.end);

  // end must be after start
  if (endMinutes <= startMinutes && slot.end !== '24:00') {
    return { valid: false, error: 'end_before_start' };
  }

  // overlap check against every *other* slot
  const otherSlots = allSlots.filter((s) => s.id !== slot.id);
  for (const other of otherSlots) {
    const otherStart = timeToMinutes(other.start);
    const otherEnd = timeToMinutes(other.end);

    if (startMinutes < otherEnd && endMinutes > otherStart) {
      return { valid: false, error: 'overlap', overlappingSlot: other };
    }
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// Coverage analysis
// ---------------------------------------------------------------------------

/**
 * Analyse 24-hour coverage from a set of watch slots.
 * Uses a 1 440-element boolean array (one per minute of the day).
 */
export function calculateCoverage(slots: WatchSlot[]): CoverageResult {
  if (slots.length === 0) return { totalMinutes: 0, gaps: [], hasFull24h: false };

  const coverage = new Array<boolean>(1440).fill(false);

  for (const slot of slots) {
    const start = timeToMinutes(slot.start);
    const end = timeToMinutes(slot.end);
    for (let i = start; i < end; i++) coverage[i] = true;
  }

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

// ---------------------------------------------------------------------------
// Conflict detection
// ---------------------------------------------------------------------------

/**
 * Detect schedule conflicts and return them as an array (pure — no
 * `console.warn`).
 *
 * Checks performed:
 * - Consecutive night watches > 3 for any crew member.
 * - Less than 6 h rest between two watches for the same person.
 * - Uneven distribution of night watches (> 30 % deviation from average).
 */
export function detectScheduleConflicts(
  scheduleData: DaySchedule[],
  _sortedSlots: WatchSlot[],
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];

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

  for (const daySchedule of scheduleData) {
    for (const slot of daySchedule.slots) {
      for (const person of slot.assigned.filter((p) => p != null)) {
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
          const rest = calculateRestHours(history.lastWatch.end, slot.start);
          if (rest < 6 && rest >= 0) {
            conflicts.push({
              type: 'insufficient_rest',
              person: person.name,
              day: daySchedule.day,
              restHours: rest.toFixed(1),
              message: `${person.name} ma tylko ${rest.toFixed(1)}h odpoczynku między wachtami (min zalecane: 6h)`,
            });
          }
        }

        history.lastWatch = {
          day: daySchedule.day,
          start: slot.start,
          end: slot.end,
        };
      }
    }
  }

  // Uneven distribution check
  const crewMembers = Object.values(crewWatchHistory);
  if (crewMembers.length > 0) {
    const avgNightWatches =
      crewMembers.reduce((sum, c) => sum + c.nightWatchCount, 0) / crewMembers.length;

    for (const member of crewMembers) {
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
    }
  }

  // De-duplicate by message
  return conflicts.filter(
    (conflict, index, self) => index === self.findIndex((c) => c.message === conflict.message),
  );
}

// ---------------------------------------------------------------------------
// Schedule generation — standard (round-robin)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Schedule generation — small-crew optimised (scoring)
// ---------------------------------------------------------------------------

interface CrewTracker {
  person: CrewMember;
  lastSlotIndex: number;
  consecutiveWatches: number;
  nightWatchesInRow: number;
}

export function generateSmallCrewSchedule(
  activeCrew: CrewMember[],
  slots: WatchSlot[],
  days: number,
): DaySchedule[] {
  const newSchedule: DaySchedule[] = [];
  const sortedSlots = [...slots].sort((a, b) => a.start.localeCompare(b.start));

  const crewTrackers: CrewTracker[] = activeCrew.map((person) => ({
    person,
    lastSlotIndex: -1,
    consecutiveWatches: 0,
    nightWatchesInRow: 0,
  }));

  const isNightSlot = (slot: WatchSlot): boolean => {
    const hour = parseInt(slot.start.split(':')[0], 10);
    return hour >= 0 && hour < 6;
  };

  const findBestCrewMember = (
    slotIndex: number,
    assignedInSlot: CrewMember[],
  ): CrewTracker | undefined => {
    const scores = crewTrackers
      .filter((c) => !assignedInSlot.some((a) => a.id === c.person.id))
      .map((tracker) => {
        let score = 0;
        const slotsSinceLastWork = slotIndex - tracker.lastSlotIndex;
        score += slotsSinceLastWork * 10;

        if (tracker.consecutiveWatches > 0) {
          score -= tracker.consecutiveWatches * 20;
        }

        if (isNightSlot(sortedSlots[slotIndex % sortedSlots.length])) {
          score -= tracker.nightWatchesInRow * 15;
        }

        return { tracker, score };
      });

    scores.sort((a, b) => b.score - a.score);
    return scores[0]?.tracker;
  };

  for (let day = 1; day <= days; day++) {
    const daySlots = sortedSlots.map((slot, slotIndexInDay) => {
      const globalSlotIndex = (day - 1) * sortedSlots.length + slotIndexInDay;
      const assigned: CrewMember[] = [];

      for (let i = 0; i < slot.reqCrew; i++) {
        const best = findBestCrewMember(globalSlotIndex, assigned);

        if (best) {
          assigned.push(best.person);
          best.lastSlotIndex = globalSlotIndex;
          best.consecutiveWatches++;

          if (isNightSlot(slot)) {
            best.nightWatchesInRow++;
          } else {
            best.nightWatchesInRow = 0;
          }

          crewTrackers.forEach((c) => {
            if (
              c.person.id !== best.person.id &&
              c.lastSlotIndex < globalSlotIndex - sortedSlots.length
            ) {
              c.consecutiveWatches = 0;
            }
          });
        } else if (activeCrew.length > 0) {
          const fallbackIndex = (globalSlotIndex + i) % activeCrew.length;
          const fallbackMember = activeCrew[fallbackIndex];
          if (fallbackMember) assigned.push(fallbackMember);
        }
      }

      return { ...slot, assigned };
    });

    newSchedule.push({ day, slots: daySlots });
  }

  return newSchedule;
}

// ---------------------------------------------------------------------------
// Debounce utility
// ---------------------------------------------------------------------------

export function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return function (this: unknown, ...args: unknown[]) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  } as T;
}

// ---------------------------------------------------------------------------
// Crew filtering
// ---------------------------------------------------------------------------

export function getActiveCrew(crew: CrewMember[], captainParticipates: boolean): CrewMember[] {
  return crew.filter((c) => {
    const role = (c.role || '').toLowerCase();
    return role !== 'cook' && (captainParticipates || role !== 'captain');
  });
}

// ---------------------------------------------------------------------------
// Watch-system recommendation
// ---------------------------------------------------------------------------

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
