import { useState, useEffect, useRef, useCallback } from 'react';
import type { CrewMember, WatchSlot, DaySchedule } from '../types';

export interface UndoRedoSnapshot {
  crew: CrewMember[];
  slots: WatchSlot[];
  schedule: DaySchedule[];
}

export interface UndoRedoSetters {
  setCrew: React.Dispatch<React.SetStateAction<CrewMember[]>>;
  setSlots: React.Dispatch<React.SetStateAction<WatchSlot[]>>;
  setSchedule: React.Dispatch<React.SetStateAction<DaySchedule[]>>;
  setIsGenerated: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface UndoRedoReturn {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const MAX_HISTORY = 20;

export function snapshotsEqual(a: UndoRedoSnapshot | null, b: UndoRedoSnapshot): boolean {
  if (!a) return false;
  if (a.crew.length !== b.crew.length || a.slots.length !== b.slots.length || a.schedule.length !== b.schedule.length) return false;
  return (
    JSON.stringify(a.crew) === JSON.stringify(b.crew) &&
    JSON.stringify(a.slots) === JSON.stringify(b.slots) &&
    JSON.stringify(a.schedule) === JSON.stringify(b.schedule)
  );
}

export function pushSnapshot(
  history: UndoRedoSnapshot[],
  historyIndex: number,
  snapshot: UndoRedoSnapshot,
): { history: UndoRedoSnapshot[]; historyIndex: number } {
  const lastState = historyIndex >= 0 ? history[historyIndex] : null;
  if (snapshotsEqual(lastState, snapshot)) {
    return { history, historyIndex };
  }

  let newHistory = history.slice(0, historyIndex + 1);
  newHistory.push(structuredClone(snapshot));

  if (newHistory.length > MAX_HISTORY) {
    newHistory = newHistory.slice(1);
  }

  return { history: newHistory, historyIndex: newHistory.length - 1 };
}

export function useUndoRedo(
  state: UndoRedoSnapshot,
  setters: UndoRedoSetters,
  isLoaded: boolean,
  isReadOnly: boolean,
): UndoRedoReturn {
  const historyRef = useRef<UndoRedoSnapshot[]>([]);
  const historyIndexRef = useRef(-1);
  const isUndoRedoAction = useRef(false);
  const [, forceRender] = useState(0);

  // Track state changes — refs avoid stale closure / infinite-loop issues
  useEffect(() => {
    if (!isLoaded || isReadOnly || isUndoRedoAction.current) {
      return;
    }

    const result = pushSnapshot(historyRef.current, historyIndexRef.current, state);
    if (result.historyIndex !== historyIndexRef.current || result.history !== historyRef.current) {
      historyRef.current = result.history;
      historyIndexRef.current = result.historyIndex;
      forceRender((n) => n + 1);
    }
  }, [state.crew, state.slots, state.schedule, isLoaded, isReadOnly]);

  // Reset undo/redo flag
  useEffect(() => {
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
    }
  }, [state.crew, state.slots, state.schedule]);

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      isUndoRedoAction.current = true;
      const prev = historyRef.current[historyIndexRef.current - 1];
      setters.setCrew(structuredClone(prev.crew));
      setters.setSlots(structuredClone(prev.slots));
      setters.setSchedule(structuredClone(prev.schedule));
      setters.setIsGenerated(prev.schedule && prev.schedule.length > 0);
      historyIndexRef.current -= 1;
      forceRender((n) => n + 1);
    }
  }, [setters]);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      isUndoRedoAction.current = true;
      const next = historyRef.current[historyIndexRef.current + 1];
      setters.setCrew(structuredClone(next.crew));
      setters.setSlots(structuredClone(next.slots));
      setters.setSchedule(structuredClone(next.schedule));
      setters.setIsGenerated(next.schedule && next.schedule.length > 0);
      historyIndexRef.current += 1;
      forceRender((n) => n + 1);
    }
  }, [setters]);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  return { undo, redo, canUndo, canRedo };
}
