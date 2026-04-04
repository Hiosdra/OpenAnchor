import { useState, useCallback } from 'react';
import type { WatchSlot, CoverageResult, Locale } from '../types';
import { defaultSlots, WATCH_TEMPLATES, t } from '../constants';
import { calculateCoverage } from '../utils/schedule-logic';

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
}

export function validateSlotTime(
  slots: WatchSlot[],
  id: string,
  field: string,
  value: string,
  userLocale: Locale,
): boolean {
  const slot = slots.find((s) => s.id === id);
  if (!slot) return true;

  const newSlot = { ...slot, [field]: value };

  if (newSlot.start && newSlot.end) {
    const startMinutes =
      parseInt(newSlot.start.split(':')[0]) * 60 + parseInt(newSlot.start.split(':')[1]);
    const endMinutes =
      newSlot.end === '24:00'
        ? 1440
        : parseInt(newSlot.end.split(':')[0]) * 60 + parseInt(newSlot.end.split(':')[1]);

    if (endMinutes <= startMinutes && newSlot.end !== '24:00') {
      alert(t('msg.endAfterStart', userLocale));
      return false;
    }

    const otherSlots = slots.filter((s) => s.id !== id);
    for (const otherSlot of otherSlots) {
      const otherStartMinutes =
        parseInt(otherSlot.start.split(':')[0]) * 60 + parseInt(otherSlot.start.split(':')[1]);
      const otherEndMinutes =
        otherSlot.end === '24:00'
          ? 1440
          : parseInt(otherSlot.end.split(':')[0]) * 60 + parseInt(otherSlot.end.split(':')[1]);

      if (startMinutes < otherEndMinutes && endMinutes > otherStartMinutes) {
        alert(`${t('msg.watchOverlap', userLocale)} (${otherSlot.start} - ${otherSlot.end})`);
        return false;
      }
    }
  }

  return true;
}

export function useWatchSlots(userLocale: Locale): WatchSlotsReturn {
  const [slots, setSlots] = useState<WatchSlot[]>(defaultSlots);

  const addSlot = useCallback(() => {
    setSlots((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2, 11),
        start: '12:00',
        end: '16:00',
        reqCrew: 1,
      },
    ]);
  }, []);

  const removeSlot = useCallback((id: string) => {
    setSlots((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const updateSlot = useCallback(
    (id: string, field: string, value: string | number) => {
      if (field === 'start' || field === 'end') {
        setSlots((prev) => {
          if (!validateSlotTime(prev, id, field, value as string, userLocale)) return prev;
          return prev.map((s) => (s.id === id ? { ...s, [field]: value } : s));
        });
      } else {
        setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
      }
    },
    [userLocale],
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
        return newSlots;
      });
    },
    [],
  );

  const applyTemplate = useCallback((templateKey: string) => {
    const template = WATCH_TEMPLATES[templateKey];
    if (template) {
      const newSlots = template.slots.map((slot) => ({
        id: Math.random().toString(36).slice(2, 11),
        ...slot,
      }));
      setSlots(newSlots);

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
  }, []);

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
  };
}
