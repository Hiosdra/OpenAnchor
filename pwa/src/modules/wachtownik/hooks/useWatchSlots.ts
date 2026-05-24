import { useState, useCallback, useEffect } from 'react';
import type { WatchSlot, CoverageResult, Locale } from '../types';
import { defaultSlots, WATCH_TEMPLATES, t } from '../constants';
import { calculateCoverage, isCrossDaySlot, rangesOverlap } from '../utils/schedule-logic';

export interface SlotWarning {
  slotId: string;
  type: 'cross_day' | 'overlap';
  message: string;
}

export interface WatchSlotsReturn {
  slots: WatchSlot[];
  setSlots: React.Dispatch<React.SetStateAction<WatchSlot[]>>;
  addSlot: () => void;
  removeSlot: (id: string) => void;
  updateSlot: (id: string, field: string, value: string | number) => void;
  applyDogWatches: (
    userLocale: Locale,
    showToast: (msg: string, type: 'success' | 'error') => void,
  ) => void;
  applyTemplate: (templateKey: string) => void;
  getCoverage: () => CoverageResult;
  slotWarnings: SlotWarning[];
}

/**
 * Compute validation warnings for the current set of slots.
 * This does NOT block the user from making changes — it just produces
 * informational warnings to display as a banner.
 */
export function computeSlotWarnings(slots: WatchSlot[], userLocale: Locale): SlotWarning[] {
  const warnings: SlotWarning[] = [];

  for (const slot of slots) {
    if (!slot.start || !slot.end) continue;

    // Cross-day warning
    if (isCrossDaySlot(slot)) {
      warnings.push({
        slotId: slot.id,
        type: 'cross_day',
        message: `${slot.start}-${slot.end}: ${t('msg.crossDaySlot', userLocale)}`,
      });
    }

    // Overlap warning
    const startMinutes =
      parseInt(slot.start.split(':')[0]) * 60 + parseInt(slot.start.split(':')[1]);
    const endMinutes =
      slot.end === '24:00'
        ? 1440
        : parseInt(slot.end.split(':')[0]) * 60 + parseInt(slot.end.split(':')[1]);
    const effectiveEnd = isCrossDaySlot(slot) ? endMinutes + 1440 : endMinutes;

    const otherSlots = slots.filter((s) => s.id !== slot.id);
    for (const other of otherSlots) {
      const otherStart =
        parseInt(other.start.split(':')[0]) * 60 + parseInt(other.start.split(':')[1]);
      const otherEnd =
        other.end === '24:00'
          ? 1440
          : parseInt(other.end.split(':')[0]) * 60 + parseInt(other.end.split(':')[1]);
      const otherEffectiveEnd = isCrossDaySlot(other) ? otherEnd + 1440 : otherEnd;

      if (rangesOverlap(startMinutes, effectiveEnd, otherStart, otherEffectiveEnd)) {
        // Avoid duplicate warnings (only warn from the slot that appears first)
        const alreadyWarned = warnings.some(
          (w) => w.type === 'overlap' && w.slotId === other.id && w.message.includes(slot.start),
        );
        if (!alreadyWarned) {
          warnings.push({
            slotId: slot.id,
            type: 'overlap',
            message: `${slot.start}-${slot.end}: ${t('msg.watchOverlap', userLocale)} (${other.start}-${other.end})`,
          });
        }
        break;
      }
    }
  }

  return warnings;
}

export function useWatchSlots(userLocale: Locale): WatchSlotsReturn {
  const [slots, setSlots] = useState<WatchSlot[]>(defaultSlots);
  const [slotWarnings, setSlotWarnings] = useState<SlotWarning[]>([]);

  const recalcWarnings = useCallback(
    (newSlots: WatchSlot[]) => {
      setSlotWarnings(computeSlotWarnings(newSlots, userLocale));
    },
    [userLocale],
  );

  // Recalculate warnings when locale changes so messages stay in sync
  useEffect(() => {
    setSlotWarnings(computeSlotWarnings(slots, userLocale));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocale, slots]);

  const addSlot = useCallback(() => {
    setSlots((prev) => {
      const newSlots = [
        ...prev,
        {
          id: Math.random().toString(36).slice(2, 11),
          start: '12:00',
          end: '16:00',
          reqCrew: 1,
        },
      ];
      recalcWarnings(newSlots);
      return newSlots;
    });
  }, [recalcWarnings]);

  const removeSlot = useCallback(
    (id: string) => {
      setSlots((prev) => {
        const newSlots = prev.filter((s) => s.id !== id);
        recalcWarnings(newSlots);
        return newSlots;
      });
    },
    [recalcWarnings],
  );

  const updateSlot = useCallback(
    (id: string, field: string, value: string | number) => {
      setSlots((prev) => {
        const newSlots = prev.map((s) => (s.id === id ? { ...s, [field]: value } : s));
        recalcWarnings(newSlots);
        return newSlots;
      });
    },
    [recalcWarnings],
  );

  const applyDogWatches = useCallback(
    (_userLocale: Locale, showToast: (msg: string, type: 'success' | 'error') => void) => {
      setSlots((prev) => {
        const dogWatchSlot = prev.find((s) => s.start === '16:00' && s.end === '20:00');
        if (!dogWatchSlot) {
          showToast(t('msg.dogWatchesNotApplicable', _userLocale), 'error');
          return prev;
        }

        const newSlots = prev.flatMap((s) => {
          if (s.start === '16:00' && s.end === '20:00') {
            return [
              { id: Math.random().toString(), start: '16:00', end: '18:00', reqCrew: s.reqCrew },
              { id: Math.random().toString(), start: '18:00', end: '20:00', reqCrew: s.reqCrew },
            ];
          }
          return s;
        });

        showToast(t('msg.dogWatchesApplied', _userLocale), 'success');
        recalcWarnings(newSlots);
        return newSlots;
      });
    },
    [recalcWarnings],
  );

  const applyTemplate = useCallback(
    (templateKey: string) => {
      const template = WATCH_TEMPLATES[templateKey];
      if (template) {
        const newSlots = template.slots.map((slot) => ({
          id: Math.random().toString(36).slice(2, 11),
          ...slot,
        }));
        setSlots(newSlots);
        recalcWarnings(newSlots);

        requestAnimationFrame(() => {
          const slotsSection = document.getElementById('slots-configuration');
          if (slotsSection) {
            const prefersReducedMotion =
              window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            slotsSection.scrollIntoView({
              behavior: prefersReducedMotion ? 'auto' : 'smooth',
              block: 'nearest',
            });
          }
        });
      }
    },
    [recalcWarnings],
  );

  const getCoverage = useCallback(() => calculateCoverage(slots), [slots]);

  return {
    slots,
    setSlots,
    addSlot,
    removeSlot,
    updateSlot,
    applyDogWatches,
    applyTemplate,
    getCoverage,
    slotWarnings,
  };
}
