import { useState, useRef, useCallback, useEffect } from 'react';
import { findActiveScheduleSlot, type ScheduleItem } from '../anchor-utils';

const SCHEDULE_STORAGE_KEY = 'anchor_schedule';
const SAVE_DEBOUNCE_MS = 300;

export function useWatchSchedule() {
  const [watchActive, setWatchActive] = useState(false);
  const [watchEndTime, setWatchEndTime] = useState<number | null>(null);
  const [watchMinutes, setWatchMinutes] = useState(10);
  const [schedule, setSchedule] = useState<ScheduleItem[]>(() => {
    try {
      const raw = localStorage.getItem(SCHEDULE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {
      /* ignore */
    }
    return [];
  });

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchActiveRef = useRef(watchActive);
  const watchEndTimeRef = useRef(watchEndTime);

  // Keep refs in sync
  watchActiveRef.current = watchActive;
  watchEndTimeRef.current = watchEndTime;

  const debouncedSave = useCallback((items: ScheduleItem[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(items));
      } catch (e) {
        console.warn('Failed to save schedule:', e);
      }
    }, SAVE_DEBOUNCE_MS);
  }, []);

  const startWatch = useCallback((minutes: number) => {
    const endTime = Date.now() + minutes * 60 * 1000;
    setWatchActive(true);
    setWatchEndTime(endTime);
    setWatchMinutes(minutes);
  }, []);

  const cancelWatch = useCallback(() => {
    setWatchActive(false);
    setWatchEndTime(null);
  }, []);

  const addScheduleItem = useCallback(
    (item: ScheduleItem) => {
      setSchedule((prev) => {
        const next = [...prev, item];
        debouncedSave(next);
        return next;
      });
    },
    [debouncedSave],
  );

  const removeScheduleItem = useCallback(
    (index: number) => {
      setSchedule((prev) => {
        const next = prev.filter((_, i) => i !== index);
        debouncedSave(next);
        return next;
      });
    },
    [debouncedSave],
  );

  const checkWatchTimer = useCallback((): boolean => {
    if (!watchActiveRef.current || !watchEndTimeRef.current) return false;
    if (Date.now() >= watchEndTimeRef.current) {
      setWatchActive(false);
      setWatchEndTime(null);
      return true;
    }
    return false;
  }, []);

  const getActiveScheduleSlot = useCallback((): ScheduleItem | null => {
    if (schedule.length === 0) return null;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    return findActiveScheduleSlot(schedule, currentMinutes);
  }, [schedule]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return {
    startWatch,
    cancelWatch,
    addScheduleItem,
    removeScheduleItem,
    checkWatchTimer,
    getActiveScheduleSlot,
    schedule,
    watchActive,
    watchEndTime,
    watchMinutes,
    setWatchMinutes,
    setSchedule,
  };
}
