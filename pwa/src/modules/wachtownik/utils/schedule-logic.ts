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
  warnings?: SlotValidationWarning[];
  error?: 'end_before_start' | 'overlap';
  overlappingSlot?: WatchSlot;
}

export interface SlotValidationWarning {
  type: 'cross_day' | 'overlap';
  message?: string;
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
 * Check if a slot crosses midnight (end time is earlier than start time).
 */
export function isCrossDaySlot(slot: { start: string; end: string }): boolean {
  const startMinutes = timeToMinutes(slot.start);
  const endMinutes = timeToMinutes(slot.end);
  return endMinutes <= startMinutes && slot.end !== '24:00' && slot.start !== slot.end;
}

/**
 * Get the effective end minutes for a slot, accounting for cross-day slots.
 * Cross-day slots (e.g. 23:00-01:00) have their end interpreted as next day.
 */
function getEffectiveEndMinutes(slot: { start: string; end: string }): number {
  const startMinutes = timeToMinutes(slot.start);
  const endMinutes = timeToMinutes(slot.end);
  if (endMinutes <= startMinutes && slot.end !== '24:00' && slot.start !== slot.end) {
    return endMinutes + 1440; // next day
  }
  return endMinutes;
}

/**
 * Validate a single watch slot against all other slots.
 *
 * Cross-day slots (end time < start time, e.g. 23:00 → 01:00) are valid and
 * represent watches that cross midnight. Instead of blocking the user, this
 * function returns warnings that can be displayed as an info banner.
 *
 * Returns a result object instead of calling `alert()` so the caller can
 * decide how to present the warning.
 */
export function validateSlotTime(slot: WatchSlot, allSlots: WatchSlot[]): SlotValidationResult {
  const startMinutes = timeToMinutes(slot.start);
  const endMinutes = timeToMinutes(slot.end);
  const warnings: SlotValidationWarning[] = [];

  // Cross-day slot detection — valid but noteworthy
  const crossDay = isCrossDaySlot(slot);
  if (crossDay) {
    warnings.push({ type: 'cross_day' });
  }

  // Same start and end (zero-length slot) is still invalid
  if (slot.start === slot.end) {
    return { valid: false, error: 'end_before_start' };
  }

  // overlap check against every *other* slot
  const otherSlots = allSlots.filter((s) => s.id !== slot.id);
  const effectiveEnd = getEffectiveEndMinutes(slot);

  for (const other of otherSlots) {
    const otherStart = timeToMinutes(other.start);
    const otherEffectiveEnd = getEffectiveEndMinutes(other);

    // Check overlap considering cross-day wrapping
    if (crossDay || isCrossDaySlot(other)) {
      // For cross-day slots, check if ranges overlap modulo 1440
      if (rangesOverlap(startMinutes, effectiveEnd, otherStart, otherEffectiveEnd)) {
        warnings.push({ type: 'overlap', overlappingSlot: other });
      }
    } else {
      if (startMinutes < otherEffectiveEnd && endMinutes > otherStart) {
        warnings.push({ type: 'overlap', overlappingSlot: other });
      }
    }
  }

  return { valid: true, warnings: warnings.length > 0 ? warnings : undefined };
}

/**
 * Check if two time ranges overlap.
 * Handles ranges that may exceed 1440 (cross-day slots are represented
 * with end > 1440 to indicate wrapping past midnight).
 */
export function rangesOverlap(s1: number, e1: number, s2: number, e2: number): boolean {
  // Both ranges wrap past midnight — split both and check all segment pairs
  if (e1 > 1440 && e2 > 1440) {
    // Range1: [s1, 1440) + [0, e1-1440), Range2: [s2, 1440) + [0, e2-1440)
    const r1a_s = s1, r1a_e = 1440;
    const r1b_s = 0, r1b_e = e1 - 1440;
    const r2a_s = s2, r2a_e = 1440;
    const r2b_s = 0, r2b_e = e2 - 1440;
    return (
      (r1a_s < r2a_e && r1a_e > r2a_s) || // [s1,1440) vs [s2,1440)
      (r1a_s < r2b_e && r1a_e > r2b_s) || // [s1,1440) vs [0,e2-1440)
      (r1b_s < r2a_e && r1b_e > r2a_s) || // [0,e1-1440) vs [s2,1440)
      (r1b_s < r2b_e && r1b_e > r2b_s)    // [0,e1-1440) vs [0,e2-1440)
    );
  }

  // Only range2 wraps — swap so we handle wrapping on range1
  if (e2 > 1440) {
    return rangesOverlap(s2, e2, s1, e1);
  }

  if (e1 > 1440) {
    // Range1 wraps past midnight: split into [s1, 1440) and [0, e1-1440)
    const firstPartOverlaps = s1 < e2 && 1440 > s2; // [s1, 1440) vs [s2, e2)
    const secondPartOverlaps = 0 < e2 && (e1 - 1440) > s2; // [0, e1-1440) vs [s2, e2)
    return firstPartOverlaps || secondPartOverlaps;
  }

  // Normal case: both ranges are within a single day
  return s1 < e2 && e1 > s2;
}

// ---------------------------------------------------------------------------
// Coverage analysis
// ---------------------------------------------------------------------------

/**
 * Analyse 24-hour coverage from a set of watch slots.
 * Uses a 1 440-element boolean array (one per minute of the day).
 * Supports cross-day slots (end < start means the slot wraps past midnight).
 */
export function calculateCoverage(slots: WatchSlot[]): CoverageResult {
  if (slots.length === 0) return { totalMinutes: 0, gaps: [], hasFull24h: false };

  const coverage = new Array<boolean>(1440).fill(false);

  for (const slot of slots) {
    const start = timeToMinutes(slot.start);
    const end = timeToMinutes(slot.end);

    if (isCrossDaySlot(slot)) {
      // Cross-day: covers [start, 1440) and [0, end)
      for (let i = start; i < 1440; i++) coverage[i] = true;
      for (let i = 0; i < end; i++) coverage[i] = true;
    } else {
      for (let i = start; i < end; i++) coverage[i] = true;
    }
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
