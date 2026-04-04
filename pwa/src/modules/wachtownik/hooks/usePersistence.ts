import { useState, useEffect, useRef, useCallback } from 'react';
import LZString from 'lz-string';
import type { CrewMember, WatchSlot, DaySchedule, AppState } from '../types';
import { debounce } from '../utils/schedule-logic';

export interface PersistenceSetters {
  setCrew: React.Dispatch<React.SetStateAction<CrewMember[]>>;
  setSlots: React.Dispatch<React.SetStateAction<WatchSlot[]>>;
  setSchedule: React.Dispatch<React.SetStateAction<DaySchedule[]>>;
  setIsGenerated: React.Dispatch<React.SetStateAction<boolean>>;
  setDays: (d: number) => void;
  setStartDate: (d: string) => void;
  setIsNightMode: (v: boolean) => void;
  setCaptainParticipates: (v: boolean) => void;
  setActiveTab: (tab: string) => void;
}

export interface PersistenceReturn {
  isLoaded: boolean;
  isReadOnly: boolean;
}

export function decodeShareHash(hash: string): { state: AppState | null; readOnly: boolean } {
  if (hash.startsWith('#share=')) {
    try {
      const encoded = hash.replace('#share=', '');
      if (!encoded.startsWith('c:')) {
        console.error("Invalid format - expected compressed format with 'c:' prefix");
        return { state: null, readOnly: false };
      }
      const compressed = encoded.substring(2);
      const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
      if (decompressed == null) {
        console.error('Failed to decompress share link data');
        return { state: null, readOnly: false };
      }
      return { state: JSON.parse(decompressed), readOnly: false };
    } catch (e) {
      console.error('Error reading share link', e);
      return { state: null, readOnly: false };
    }
  }

  if (hash.startsWith('#share-readonly=')) {
    try {
      const encoded = hash.replace('#share-readonly=', '');
      return { state: JSON.parse(decodeURIComponent(atob(encoded))), readOnly: true };
    } catch (e) {
      console.error('Error reading readonly link', e);
      return { state: null, readOnly: false };
    }
  }

  return { state: null, readOnly: false };
}

export function loadFromLocalStorage(): AppState | null {
  const saved = localStorage.getItem('sailingSchedulePro');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Error reading localStorage', e);
    }
  }
  return null;
}

export function applyLoadedState(
  stateToLoad: AppState,
  setters: PersistenceSetters,
  readOnly: boolean,
): void {
  if (stateToLoad.crew && typeof (stateToLoad.crew as unknown[])[0] === 'string') {
    setters.setCrew(
      (stateToLoad.crew as unknown as string[]).map((name: string, i: number) => ({
        id: `old_${i}`,
        name,
        role: 'sailor',
      })),
    );
    setters.setIsGenerated(false);
  } else {
    if (stateToLoad.crew) setters.setCrew(stateToLoad.crew);
    if (stateToLoad.schedule) setters.setSchedule(stateToLoad.schedule);
    if (stateToLoad.isGenerated !== undefined) {
      setters.setIsGenerated(stateToLoad.isGenerated);
      if (stateToLoad.isGenerated) setters.setActiveTab('schedule');
    }
  }

  if (stateToLoad.slots) setters.setSlots(stateToLoad.slots);
  if (stateToLoad.days) setters.setDays(stateToLoad.days);
  if (stateToLoad.startDate) setters.setStartDate(stateToLoad.startDate);
  if (stateToLoad.isNightMode) setters.setIsNightMode(stateToLoad.isNightMode);
  if (stateToLoad.captainParticipates !== undefined)
    setters.setCaptainParticipates(stateToLoad.captainParticipates);

  if (readOnly) {
    if (stateToLoad.isGenerated) {
      setters.setActiveTab('schedule');
    } else {
      setters.setActiveTab('crew');
    }
  }
}

export function usePersistence(
  appState: {
    crew: CrewMember[];
    slots: WatchSlot[];
    days: number;
    startDate: string;
    schedule: DaySchedule[];
    isGenerated: boolean;
    isNightMode: boolean;
    captainParticipates: boolean;
  },
  setters: PersistenceSetters,
): PersistenceReturn {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const pendingSaveRef = useRef<typeof appState | null>(null);

  const debouncedSave = useRef(
    debounce(function (stateToSave: unknown) {
      localStorage.setItem('sailingSchedulePro', JSON.stringify(stateToSave));
      pendingSaveRef.current = null;
    }, 1500),
  ).current;

  // Load state on mount
  useEffect(() => {
    const hash = window.location.hash;
    const { state, readOnly } = decodeShareHash(hash);

    if (state) {
      if (readOnly) setIsReadOnly(true);
      applyLoadedState(state, setters, readOnly);
      window.history.replaceState(null, '', window.location.pathname);
    } else {
      const saved = loadFromLocalStorage();
      if (saved) {
        applyLoadedState(saved, setters, false);
      }
    }

    setIsLoaded(true);
  }, []);

  // Flush pending save on unload
  useEffect(() => {
    const flushSave = () => {
      if (pendingSaveRef.current) {
        localStorage.setItem('sailingSchedulePro', JSON.stringify(pendingSaveRef.current));
        pendingSaveRef.current = null;
      }
    };
    window.addEventListener('beforeunload', flushSave);
    return () => {
      window.removeEventListener('beforeunload', flushSave);
      // Flush pending save on component unmount
      if (pendingSaveRef.current) {
        localStorage.setItem('sailingSchedulePro', JSON.stringify(pendingSaveRef.current));
        pendingSaveRef.current = null;
      }
    };
  }, []);

  // Auto-save when state changes
  useEffect(() => {
    if (isLoaded && !isReadOnly) {
      pendingSaveRef.current = appState;
      debouncedSave(appState);
    }
  }, [
    appState.crew,
    appState.slots,
    appState.days,
    appState.startDate,
    appState.schedule,
    appState.isGenerated,
    appState.isNightMode,
    appState.captainParticipates,
    isLoaded,
    isReadOnly,
  ]);

  return { isLoaded, isReadOnly };
}
