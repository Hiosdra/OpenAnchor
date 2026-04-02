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
  newHistory.push(JSON.parse(JSON.stringify(snapshot)));

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
  const [history, setHistory] = useState<UndoRedoSnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoAction = useRef(false);

  // Track state changes
  useEffect(() => {
    if (!isLoaded || isReadOnly || isUndoRedoAction.current) {
      return;
    }

    const result = pushSnapshot(history, historyIndex, state);
    if (result.historyIndex !== historyIndex || result.history !== history) {
      setHistory(result.history);
      setHistoryIndex(result.historyIndex);
    }
  }, [state.crew, state.slots, state.schedule, isLoaded, isReadOnly]);

  // Reset undo/redo flag
  useEffect(() => {
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
    }
  }, [state.crew, state.slots, state.schedule]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      isUndoRedoAction.current = true;
      const prev = history[historyIndex - 1];
      setters.setCrew(JSON.parse(JSON.stringify(prev.crew)));
      setters.setSlots(JSON.parse(JSON.stringify(prev.slots)));
      setters.setSchedule(JSON.parse(JSON.stringify(prev.schedule)));
      setters.setIsGenerated(prev.schedule && prev.schedule.length > 0);
      setHistoryIndex(historyIndex - 1);
    }
  }, [historyIndex, history, setters]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUndoRedoAction.current = true;
      const next = history[historyIndex + 1];
      setters.setCrew(JSON.parse(JSON.stringify(next.crew)));
      setters.setSlots(JSON.parse(JSON.stringify(next.slots)));
      setters.setSchedule(JSON.parse(JSON.stringify(next.schedule)));
      setters.setIsGenerated(next.schedule && next.schedule.length > 0);
      setHistoryIndex(historyIndex + 1);
    }
  }, [historyIndex, history, setters]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return { undo, redo, canUndo, canRedo };
}
