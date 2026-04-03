import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { CrewMember, WatchSlot, DaySchedule } from '../src/modules/wachtownik/types';

// Hooks under test
import { useCrewManagement } from '../src/modules/wachtownik/hooks/useCrewManagement';
import {
  useUndoRedo,
  snapshotsEqual,
  pushSnapshot,
  type UndoRedoSnapshot,
  type UndoRedoSetters,
} from '../src/modules/wachtownik/hooks/useUndoRedo';
import { useWatchSlots, validateSlotTime } from '../src/modules/wachtownik/hooks/useWatchSlots';
import {
  useKeyboardShortcuts,
  useNotifications,
  type KeyboardShortcutsParams,
} from '../src/modules/wachtownik/hooks/useKeyboardAndNotifications';
import { useDragDrop, applyDrop } from '../src/modules/wachtownik/hooks/useDragDrop';

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------
const crew: CrewMember[] = [
  { id: 'c1', name: 'Anna', role: 'captain' },
  { id: 'c2', name: 'Michał', role: 'officer' },
  { id: 'c3', name: 'Kasia', role: 'sailor' },
  { id: 'c4', name: 'Tomek', role: 'sailor' },
  { id: 'c5', name: 'Piotr', role: 'cook' },
];

const slots: WatchSlot[] = [
  { id: 's1', start: '00:00', end: '04:00', reqCrew: 2 },
  { id: 's2', start: '04:00', end: '08:00', reqCrew: 2 },
  { id: 's3', start: '08:00', end: '12:00', reqCrew: 2 },
  { id: 's4', start: '12:00', end: '16:00', reqCrew: 2 },
  { id: 's5', start: '16:00', end: '20:00', reqCrew: 2 },
  { id: 's6', start: '20:00', end: '24:00', reqCrew: 2 },
];

function makeSchedule(): DaySchedule[] {
  return [
    {
      day: 1,
      slots: [
        { id: 's1', start: '00:00', end: '06:00', reqCrew: 2, assigned: [crew[0], crew[1]] },
        { id: 's2', start: '06:00', end: '12:00', reqCrew: 2, assigned: [crew[2], crew[3]] },
      ],
    },
  ];
}

// ===========================================================================
// useCrewManagement
// ===========================================================================
describe('useCrewManagement', () => {
  beforeEach(() => {
    window.alert = vi.fn();
  });

  it('initializes with defaultCrew (5 members)', () => {
    const { result } = renderHook(() => useCrewManagement());
    expect(result.current.crew).toHaveLength(5);
    expect(result.current.crew[0].role).toBe('captain');
  });

  it('initializes default form state', () => {
    const { result } = renderHook(() => useCrewManagement());
    expect(result.current.newCrewName).toBe('');
    expect(result.current.newCrewRole).toBe('sailor');
    expect(result.current.captainParticipates).toBe(true);
  });

  it('computes activeCrew (excludes cook)', () => {
    const { result } = renderHook(() => useCrewManagement());
    // Default crew has 1 cook (Piotr), captain participates by default
    const cookInActive = result.current.activeCrew.find((c) => c.role === 'cook');
    expect(cookInActive).toBeUndefined();
    expect(result.current.activeCrew.length).toBeLessThan(result.current.crew.length);
  });

  it('excludes captain from activeCrew when captainParticipates is false', () => {
    const { result } = renderHook(() => useCrewManagement());

    act(() => {
      result.current.setCaptainParticipates(false);
    });

    const captainInActive = result.current.activeCrew.find((c) => c.role === 'captain');
    expect(captainInActive).toBeUndefined();
  });

  it('provides recommendations when activeCrew is non-empty', () => {
    const { result } = renderHook(() => useCrewManagement());
    expect(result.current.recommendations.length).toBeGreaterThan(0);
  });

  it('returns empty recommendations when activeCrew is empty', () => {
    const { result } = renderHook(() => useCrewManagement());

    // Remove all crew except one cook (so activeCrew = [])
    act(() => {
      result.current.setCrew([{ id: 'cook1', name: 'Chef', role: 'cook' }]);
    });

    expect(result.current.activeCrew).toHaveLength(0);
    expect(result.current.recommendations).toEqual([]);
  });

  // --- addCrew ---
  describe('addCrew', () => {
    it('adds a crew member with trimmed name', () => {
      const { result } = renderHook(() => useCrewManagement());
      const initialLength = result.current.crew.length;

      act(() => {
        result.current.setNewCrewName('  Zosia  ');
        result.current.setNewCrewRole('officer');
      });
      act(() => {
        result.current.addCrew();
      });

      expect(result.current.crew).toHaveLength(initialLength + 1);
      const added = result.current.crew[result.current.crew.length - 1];
      expect(added.name).toBe('Zosia');
      expect(added.role).toBe('officer');
    });

    it('resets newCrewName after adding', () => {
      const { result } = renderHook(() => useCrewManagement());

      act(() => {
        result.current.setNewCrewName('Zosia');
      });
      act(() => {
        result.current.addCrew();
      });

      expect(result.current.newCrewName).toBe('');
    });

    it('does not add crew member when name is empty', () => {
      const { result } = renderHook(() => useCrewManagement());
      const initialLength = result.current.crew.length;

      act(() => {
        result.current.setNewCrewName('');
      });
      act(() => {
        result.current.addCrew();
      });

      expect(result.current.crew).toHaveLength(initialLength);
    });

    it('does not add crew member when name is only whitespace', () => {
      const { result } = renderHook(() => useCrewManagement());
      const initialLength = result.current.crew.length;

      act(() => {
        result.current.setNewCrewName('   ');
      });
      act(() => {
        result.current.addCrew();
      });

      expect(result.current.crew).toHaveLength(initialLength);
    });

    it('does not add crew member when at 15-member limit', () => {
      const { result } = renderHook(() => useCrewManagement());

      // Set crew to 15 members
      const bigCrew: CrewMember[] = Array.from({ length: 15 }, (_, i) => ({
        id: `x${i}`,
        name: `Person${i}`,
        role: 'sailor',
      }));
      act(() => {
        result.current.setCrew(bigCrew);
      });

      act(() => {
        result.current.setNewCrewName('OneMore');
      });
      act(() => {
        result.current.addCrew();
      });

      expect(result.current.crew).toHaveLength(15);
    });
  });

  // --- removeCrew ---
  describe('removeCrew', () => {
    it('removes a crew member by id', () => {
      const { result } = renderHook(() => useCrewManagement());
      const initialLength = result.current.crew.length;
      const idToRemove = result.current.crew[0].id;

      act(() => {
        result.current.removeCrew(idToRemove);
      });

      expect(result.current.crew).toHaveLength(initialLength - 1);
      expect(result.current.crew.find((c) => c.id === idToRemove)).toBeUndefined();
    });

    it('does not remove when crew has exactly 3 members (minimum)', () => {
      const { result } = renderHook(() => useCrewManagement());

      // Set crew to exactly 3 members
      act(() => {
        result.current.setCrew([
          { id: 'a', name: 'A', role: 'captain' },
          { id: 'b', name: 'B', role: 'officer' },
          { id: 'c', name: 'C', role: 'sailor' },
        ]);
      });

      act(() => {
        result.current.removeCrew('a');
      });

      expect(result.current.crew).toHaveLength(3);
      expect(window.alert).toHaveBeenCalled();
    });
  });

  // --- setters ---
  describe('setters', () => {
    it('updates newCrewName', () => {
      const { result } = renderHook(() => useCrewManagement());
      act(() => {
        result.current.setNewCrewName('TestName');
      });
      expect(result.current.newCrewName).toBe('TestName');
    });

    it('updates newCrewRole', () => {
      const { result } = renderHook(() => useCrewManagement());
      act(() => {
        result.current.setNewCrewRole('captain');
      });
      expect(result.current.newCrewRole).toBe('captain');
    });

    it('updates captainParticipates', () => {
      const { result } = renderHook(() => useCrewManagement());
      act(() => {
        result.current.setCaptainParticipates(false);
      });
      expect(result.current.captainParticipates).toBe(false);
    });
  });
});

// ===========================================================================
// useUndoRedo — pure functions (extended from hooks-logic.test.ts)
// ===========================================================================
describe('useUndoRedo pure functions (extended)', () => {
  describe('snapshotsEqual', () => {
    it('returns false when slots differ', () => {
      const a: UndoRedoSnapshot = { crew: [], slots: [slots[0]], schedule: [] };
      const b: UndoRedoSnapshot = { crew: [], slots: [slots[1]], schedule: [] };
      expect(snapshotsEqual(a, b)).toBe(false);
    });

    it('returns false when schedule differs', () => {
      const sched = makeSchedule();
      const a: UndoRedoSnapshot = { crew: [], slots: [], schedule: sched };
      const b: UndoRedoSnapshot = { crew: [], slots: [], schedule: [] };
      expect(snapshotsEqual(a, b)).toBe(false);
    });

    it('returns true for deeply equal snapshots', () => {
      const snap: UndoRedoSnapshot = {
        crew: [crew[0]],
        slots: [slots[0]],
        schedule: makeSchedule(),
      };
      const clone: UndoRedoSnapshot = JSON.parse(JSON.stringify(snap));
      expect(snapshotsEqual(snap, clone)).toBe(true);
    });
  });

  describe('pushSnapshot edge cases', () => {
    it('deep clones snapshot (no reference sharing)', () => {
      const original: UndoRedoSnapshot = { crew: [{ ...crew[0] }], slots: [], schedule: [] };
      const result = pushSnapshot([], -1, original);

      // Mutate original
      original.crew[0].name = 'MUTATED';
      expect(result.history[0].crew[0].name).toBe('Anna');
    });

    it('handles push after undo to middle of history', () => {
      const s1: UndoRedoSnapshot = { crew: [crew[0]], slots: [], schedule: [] };
      const s2: UndoRedoSnapshot = { crew: [crew[1]], slots: [], schedule: [] };
      const s3: UndoRedoSnapshot = { crew: [crew[2]], slots: [], schedule: [] };
      const s4: UndoRedoSnapshot = { crew: [crew[3]], slots: [], schedule: [] };

      let r = pushSnapshot([], -1, s1);
      r = pushSnapshot(r.history, r.historyIndex, s2);
      r = pushSnapshot(r.history, r.historyIndex, s3);
      // "Undo" to index 1, then push new state
      r = pushSnapshot(r.history, 1, s4);

      expect(r.history).toHaveLength(3); // s1, s2, s4
      expect(r.history[2].crew[0].id).toBe('c4');
    });
  });
});

// ===========================================================================
// useUndoRedo — hook integration
// ===========================================================================
describe('useUndoRedo hook', () => {
  function makeSetters(): UndoRedoSetters {
    return {
      setCrew: vi.fn(),
      setSlots: vi.fn(),
      setSchedule: vi.fn(),
      setIsGenerated: vi.fn(),
    };
  }

  it('starts with canUndo=false and canRedo=false', () => {
    const setters = makeSetters();
    const state: UndoRedoSnapshot = { crew: [], slots: [], schedule: [] };
    const { result } = renderHook(() => useUndoRedo(state, setters, true, false));

    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('does not record history when isLoaded is false', () => {
    const setters = makeSetters();
    const state: UndoRedoSnapshot = { crew: [crew[0]], slots: [], schedule: [] };
    const { result } = renderHook(() => useUndoRedo(state, setters, false, false));

    expect(result.current.canUndo).toBe(false);
  });

  it('does not record history when isReadOnly is true', () => {
    const setters = makeSetters();
    const state: UndoRedoSnapshot = { crew: [crew[0]], slots: [], schedule: [] };
    const { result } = renderHook(() => useUndoRedo(state, setters, true, true));

    expect(result.current.canUndo).toBe(false);
  });

  it('records history on state change and can undo', () => {
    const setters = makeSetters();
    const initialState: UndoRedoSnapshot = { crew: [crew[0]], slots: [], schedule: [] };

    const { result, rerender } = renderHook(
      ({ state }) => useUndoRedo(state, setters, true, false),
      { initialProps: { state: initialState } },
    );

    // Push a second state
    const newState: UndoRedoSnapshot = { crew: [crew[0], crew[1]], slots: [], schedule: [] };
    rerender({ state: newState });

    expect(result.current.canUndo).toBe(true);

    // Undo
    act(() => {
      result.current.undo();
    });

    expect(setters.setCrew).toHaveBeenCalled();
    expect(setters.setSlots).toHaveBeenCalled();
    expect(setters.setSchedule).toHaveBeenCalled();
    expect(setters.setIsGenerated).toHaveBeenCalled();
  });

  it('undo does nothing when at beginning of history', () => {
    const setters = makeSetters();
    const state: UndoRedoSnapshot = { crew: [crew[0]], slots: [], schedule: [] };
    const { result } = renderHook(() => useUndoRedo(state, setters, true, false));

    act(() => {
      result.current.undo();
    });

    // No setters should be called
    expect(setters.setCrew).not.toHaveBeenCalled();
  });

  it('redo does nothing when at end of history', () => {
    const setters = makeSetters();
    const state: UndoRedoSnapshot = { crew: [crew[0]], slots: [], schedule: [] };
    const { result } = renderHook(() => useUndoRedo(state, setters, true, false));

    act(() => {
      result.current.redo();
    });

    expect(setters.setCrew).not.toHaveBeenCalled();
  });

  it('redo restores after undo', () => {
    const setters = makeSetters();
    const s1: UndoRedoSnapshot = { crew: [crew[0]], slots: [], schedule: [] };
    const s2: UndoRedoSnapshot = { crew: [crew[0], crew[1]], slots: [], schedule: [] };

    const { result, rerender } = renderHook(
      ({ state }) => useUndoRedo(state, setters, true, false),
      { initialProps: { state: s1 } },
    );

    rerender({ state: s2 });

    // Undo
    act(() => {
      result.current.undo();
    });

    // Now rerender with original to simulate the undo applying
    rerender({ state: s1 });

    expect(result.current.canRedo).toBe(true);

    // Redo
    act(() => {
      result.current.redo();
    });

    expect(setters.setCrew).toHaveBeenCalledTimes(2); // once undo, once redo
  });

  it('sets isGenerated based on schedule presence', () => {
    const setters = makeSetters();
    const s1: UndoRedoSnapshot = { crew: [crew[0]], slots: [], schedule: [] };
    const scheduleWithData = makeSchedule();
    const s2: UndoRedoSnapshot = { crew: [crew[0]], slots: [], schedule: scheduleWithData };

    const { result, rerender } = renderHook(
      ({ state }) => useUndoRedo(state, setters, true, false),
      { initialProps: { state: s1 } },
    );

    rerender({ state: s2 });

    // Undo should call setIsGenerated
    act(() => {
      result.current.undo();
    });

    // setIsGenerated called with false (empty schedule in s1)
    const isGenCalls = setters.setIsGenerated.mock.calls;
    expect(isGenCalls.length).toBeGreaterThan(0);
  });
});

// ===========================================================================
// useWatchSlots
// ===========================================================================
describe('useWatchSlots', () => {
  beforeEach(() => {
    window.alert = vi.fn();
  });

  it('initializes with defaultSlots (6 slots)', () => {
    const { result } = renderHook(() => useWatchSlots('pl-PL'));
    expect(result.current.slots).toHaveLength(6);
    expect(result.current.slots[0].start).toBe('00:00');
  });

  // --- addSlot ---
  describe('addSlot', () => {
    it('adds a new slot with default 12:00-16:00', () => {
      const { result } = renderHook(() => useWatchSlots('pl-PL'));
      const initialLength = result.current.slots.length;

      act(() => {
        result.current.addSlot();
      });

      expect(result.current.slots).toHaveLength(initialLength + 1);
      const newSlot = result.current.slots[result.current.slots.length - 1];
      expect(newSlot.start).toBe('12:00');
      expect(newSlot.end).toBe('16:00');
      expect(newSlot.reqCrew).toBe(1);
    });

    it('generates unique ids for added slots', () => {
      const { result } = renderHook(() => useWatchSlots('pl-PL'));

      act(() => {
        result.current.addSlot();
      });
      act(() => {
        result.current.addSlot();
      });

      const ids = result.current.slots.map((s) => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  // --- removeSlot ---
  describe('removeSlot', () => {
    it('removes a slot by id', () => {
      const { result } = renderHook(() => useWatchSlots('pl-PL'));
      const firstId = result.current.slots[0].id;
      const initialLength = result.current.slots.length;

      act(() => {
        result.current.removeSlot(firstId);
      });

      expect(result.current.slots).toHaveLength(initialLength - 1);
      expect(result.current.slots.find((s) => s.id === firstId)).toBeUndefined();
    });

    it('does nothing when id does not exist', () => {
      const { result } = renderHook(() => useWatchSlots('pl-PL'));
      const initialLength = result.current.slots.length;

      act(() => {
        result.current.removeSlot('nonexistent');
      });

      expect(result.current.slots).toHaveLength(initialLength);
    });
  });

  // --- updateSlot ---
  describe('updateSlot', () => {
    it('updates reqCrew (non-time field) directly', () => {
      const { result } = renderHook(() => useWatchSlots('pl-PL'));
      const slotId = result.current.slots[0].id;

      act(() => {
        result.current.updateSlot(slotId, 'reqCrew', 3);
      });

      expect(result.current.slots[0].reqCrew).toBe(3);
    });

    it('updates start time with validation', () => {
      const { result } = renderHook(() => useWatchSlots('pl-PL'));

      // Set to a single non-overlapping slot first
      act(() => {
        result.current.setSlots([{ id: 'x1', start: '08:00', end: '12:00', reqCrew: 1 }]);
      });

      act(() => {
        result.current.updateSlot('x1', 'start', '06:00');
      });

      expect(result.current.slots[0].start).toBe('06:00');
    });

    it('rejects end time before start time', () => {
      const { result } = renderHook(() => useWatchSlots('pl-PL'));

      act(() => {
        result.current.setSlots([{ id: 'x1', start: '08:00', end: '12:00', reqCrew: 1 }]);
      });

      act(() => {
        result.current.updateSlot('x1', 'end', '06:00');
      });

      // Should not update
      expect(result.current.slots[0].end).toBe('12:00');
      expect(window.alert).toHaveBeenCalled();
    });

    it('rejects overlapping time changes', () => {
      const { result } = renderHook(() => useWatchSlots('pl-PL'));

      act(() => {
        result.current.setSlots([
          { id: 'x1', start: '00:00', end: '08:00', reqCrew: 1 },
          { id: 'x2', start: '10:00', end: '16:00', reqCrew: 1 },
        ]);
      });

      // Try to extend x1 end to overlap with x2
      act(() => {
        result.current.updateSlot('x1', 'end', '12:00');
      });

      expect(result.current.slots[0].end).toBe('08:00'); // unchanged
      expect(window.alert).toHaveBeenCalled();
    });

    it('allows 24:00 as end time', () => {
      const { result } = renderHook(() => useWatchSlots('pl-PL'));

      act(() => {
        result.current.setSlots([{ id: 'x1', start: '20:00', end: '22:00', reqCrew: 1 }]);
      });

      act(() => {
        result.current.updateSlot('x1', 'end', '24:00');
      });

      expect(result.current.slots[0].end).toBe('24:00');
    });
  });

  // --- applyDogWatches ---
  describe('applyDogWatches', () => {
    it('splits 16:00-20:00 slot into two dog watches', () => {
      const { result } = renderHook(() => useWatchSlots('pl-PL'));
      const showToast = vi.fn();

      // defaultSlots includes 16:00-20:00
      act(() => {
        result.current.applyDogWatches('pl-PL', showToast);
      });

      const dogWatch1 = result.current.slots.find(
        (s) => s.start === '16:00' && s.end === '18:00',
      );
      const dogWatch2 = result.current.slots.find(
        (s) => s.start === '18:00' && s.end === '20:00',
      );
      expect(dogWatch1).toBeDefined();
      expect(dogWatch2).toBeDefined();
      expect(showToast).toHaveBeenCalledWith(expect.any(String), 'success');
    });

    it('shows error when no 16:00-20:00 slot exists', () => {
      const { result } = renderHook(() => useWatchSlots('pl-PL'));
      const showToast = vi.fn();

      act(() => {
        result.current.setSlots([{ id: 'x1', start: '00:00', end: '08:00', reqCrew: 1 }]);
      });

      act(() => {
        result.current.applyDogWatches('pl-PL', showToast);
      });

      expect(showToast).toHaveBeenCalledWith(expect.any(String), 'error');
    });
  });

  // --- applyTemplate ---
  describe('applyTemplate', () => {
    it('applies a known template (6x4h)', () => {
      const { result } = renderHook(() => useWatchSlots('pl-PL'));

      act(() => {
        result.current.applyTemplate('6x4h');
      });

      expect(result.current.slots).toHaveLength(6);
      expect(result.current.slots[0].start).toBe('00:00');
      expect(result.current.slots[0].end).toBe('04:00');
    });

    it('applies 3x8h template', () => {
      const { result } = renderHook(() => useWatchSlots('pl-PL'));

      act(() => {
        result.current.applyTemplate('3x8h');
      });

      expect(result.current.slots).toHaveLength(3);
    });

    it('does nothing for unknown template key', () => {
      const { result } = renderHook(() => useWatchSlots('pl-PL'));
      const slotsBeforeCount = result.current.slots.length;

      act(() => {
        result.current.applyTemplate('nonexistent');
      });

      expect(result.current.slots).toHaveLength(slotsBeforeCount);
    });

    it('generates unique ids for template slots', () => {
      const { result } = renderHook(() => useWatchSlots('pl-PL'));

      act(() => {
        result.current.applyTemplate('4x6h');
      });

      const ids = result.current.slots.map((s) => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  // --- getCoverage ---
  describe('getCoverage', () => {
    it('returns full coverage for default 6×4h slots', () => {
      const { result } = renderHook(() => useWatchSlots('pl-PL'));
      const coverage = result.current.getCoverage();
      expect(coverage.hasFull24h).toBe(true);
      expect(coverage.totalMinutes).toBe(1440);
      expect(coverage.gaps).toHaveLength(0);
    });

    it('detects gaps when slots do not cover 24h', () => {
      const { result } = renderHook(() => useWatchSlots('pl-PL'));

      act(() => {
        result.current.setSlots([{ id: 'x1', start: '08:00', end: '16:00', reqCrew: 1 }]);
      });

      const coverage = result.current.getCoverage();
      expect(coverage.hasFull24h).toBe(false);
      expect(coverage.gaps.length).toBeGreaterThan(0);
      expect(coverage.totalMinutes).toBe(480);
    });
  });
});

// ===========================================================================
// validateSlotTime — additional edge cases
// ===========================================================================
describe('validateSlotTime (extended)', () => {
  beforeEach(() => {
    window.alert = vi.fn();
  });

  it('validates with en-US locale', () => {
    const testSlots: WatchSlot[] = [{ id: 's1', start: '08:00', end: '12:00', reqCrew: 1 }];
    expect(validateSlotTime(testSlots, 's1', 'end', '06:00', 'en-US')).toBe(false);
    expect(window.alert).toHaveBeenCalled();
  });

  it('returns true when start equals end at 24:00', () => {
    const testSlots: WatchSlot[] = [{ id: 's1', start: '00:00', end: '04:00', reqCrew: 1 }];
    expect(validateSlotTime(testSlots, 's1', 'end', '24:00', 'pl-PL')).toBe(true);
  });

  it('handles adjacent (non-overlapping) slots', () => {
    const testSlots: WatchSlot[] = [
      { id: 's1', start: '00:00', end: '08:00', reqCrew: 1 },
      { id: 's2', start: '08:00', end: '16:00', reqCrew: 1 },
    ];
    // Change s1 end to exactly meet s2 start — should not overlap
    expect(validateSlotTime(testSlots, 's1', 'end', '08:00', 'pl-PL')).toBe(true);
  });

  it('detects overlap with 24:00 end on other slot', () => {
    const testSlots: WatchSlot[] = [
      { id: 's1', start: '20:00', end: '24:00', reqCrew: 1 },
      { id: 's2', start: '18:00', end: '19:00', reqCrew: 1 },
    ];
    // Try to extend s2 end into s1's range
    expect(validateSlotTime(testSlots, 's2', 'end', '22:00', 'pl-PL')).toBe(false);
  });
});

// ===========================================================================
// useKeyboardShortcuts
// ===========================================================================
describe('useKeyboardShortcuts', () => {
  let params: KeyboardShortcutsParams;

  beforeEach(() => {
    params = {
      activeTab: 'setup',
      canUndo: true,
      canRedo: true,
      isReadOnly: false,
      showQRModal: false,
      undo: vi.fn(),
      redo: vi.fn(),
      generateSchedule: vi.fn(),
      handlePrint: vi.fn(),
      setShowQRModal: vi.fn(),
    };
  });

  function fireKey(
    key: string,
    opts: Partial<KeyboardEventInit> = {},
  ) {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...opts }));
  }

  it('calls undo on Ctrl+Z', () => {
    renderHook(() => useKeyboardShortcuts(params));

    fireKey('z', { ctrlKey: true });
    expect(params.undo).toHaveBeenCalledTimes(1);
  });

  it('calls undo on Meta+Z (Mac)', () => {
    renderHook(() => useKeyboardShortcuts(params));

    fireKey('z', { metaKey: true });
    expect(params.undo).toHaveBeenCalledTimes(1);
  });

  it('does not call undo when canUndo is false', () => {
    params.canUndo = false;
    renderHook(() => useKeyboardShortcuts(params));

    fireKey('z', { ctrlKey: true });
    expect(params.undo).not.toHaveBeenCalled();
  });

  it('does not call undo in readOnly mode', () => {
    params.isReadOnly = true;
    renderHook(() => useKeyboardShortcuts(params));

    fireKey('z', { ctrlKey: true });
    expect(params.undo).not.toHaveBeenCalled();
  });

  it('calls redo on Ctrl+Y', () => {
    renderHook(() => useKeyboardShortcuts(params));

    fireKey('y', { ctrlKey: true });
    expect(params.redo).toHaveBeenCalledTimes(1);
  });

  it('calls redo on Ctrl+Shift+Z', () => {
    renderHook(() => useKeyboardShortcuts(params));

    fireKey('z', { ctrlKey: true, shiftKey: true });
    expect(params.redo).toHaveBeenCalledTimes(1);
  });

  it('does not call redo when canRedo is false', () => {
    params.canRedo = false;
    renderHook(() => useKeyboardShortcuts(params));

    fireKey('y', { ctrlKey: true });
    expect(params.redo).not.toHaveBeenCalled();
  });

  it('does not call redo in readOnly mode', () => {
    params.isReadOnly = true;
    renderHook(() => useKeyboardShortcuts(params));

    fireKey('y', { ctrlKey: true });
    expect(params.redo).not.toHaveBeenCalled();
  });

  it('calls generateSchedule on Ctrl+G when on setup tab', () => {
    renderHook(() => useKeyboardShortcuts(params));

    fireKey('g', { ctrlKey: true });
    expect(params.generateSchedule).toHaveBeenCalledTimes(1);
  });

  it('does not call generateSchedule on Ctrl+G when not on setup tab', () => {
    params.activeTab = 'schedule';
    renderHook(() => useKeyboardShortcuts(params));

    fireKey('g', { ctrlKey: true });
    expect(params.generateSchedule).not.toHaveBeenCalled();
  });

  it('calls handlePrint on Ctrl+P', () => {
    renderHook(() => useKeyboardShortcuts(params));

    fireKey('p', { ctrlKey: true });
    expect(params.handlePrint).toHaveBeenCalledTimes(1);
  });

  it('closes QR modal on Escape', () => {
    params.showQRModal = true;
    renderHook(() => useKeyboardShortcuts(params));

    fireKey('Escape');
    expect(params.setShowQRModal).toHaveBeenCalledWith(false);
  });

  it('does not close QR modal on Escape when modal is not shown', () => {
    params.showQRModal = false;
    renderHook(() => useKeyboardShortcuts(params));

    fireKey('Escape');
    expect(params.setShowQRModal).not.toHaveBeenCalled();
  });

  it('handles Esc key variant', () => {
    params.showQRModal = true;
    renderHook(() => useKeyboardShortcuts(params));

    fireKey('Esc');
    expect(params.setShowQRModal).toHaveBeenCalledWith(false);
  });

  it('does nothing for unrelated keys', () => {
    renderHook(() => useKeyboardShortcuts(params));

    fireKey('a');
    expect(params.undo).not.toHaveBeenCalled();
    expect(params.redo).not.toHaveBeenCalled();
    expect(params.generateSchedule).not.toHaveBeenCalled();
    expect(params.handlePrint).not.toHaveBeenCalled();
  });

  it('Ctrl+Z with Shift triggers redo, not undo', () => {
    renderHook(() => useKeyboardShortcuts(params));

    fireKey('z', { ctrlKey: true, shiftKey: true });
    expect(params.undo).not.toHaveBeenCalled();
    expect(params.redo).toHaveBeenCalledTimes(1);
  });

  it('cleans up event listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useKeyboardShortcuts(params));

    unmount();
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    removeSpy.mockRestore();
  });

  it('responds to updated params via ref', () => {
    // Render with canUndo=false, then update to true
    params.canUndo = false;
    const { rerender } = renderHook(
      ({ p }) => useKeyboardShortcuts(p),
      { initialProps: { p: params } },
    );

    const updatedParams = { ...params, canUndo: true };
    rerender({ p: updatedParams });

    fireKey('z', { ctrlKey: true });
    expect(updatedParams.undo).toHaveBeenCalledTimes(1);
  });
});

// ===========================================================================
// useNotifications
// ===========================================================================
describe('useNotifications', () => {
  const originalNotification = globalThis.Notification;

  beforeEach(() => {
    // Mock Notification API
    (globalThis as any).Notification = vi.fn();
    (globalThis.Notification as any).permission = 'granted';
  });

  afterEach(() => {
    (globalThis as any).Notification = originalNotification;
  });

  it('returns a notifiedSlots ref', () => {
    const { result } = renderHook(() => useNotifications(false, null, new Date()));
    expect(result.current.notifiedSlots.current).toBeInstanceOf(Set);
  });

  it('does not notify when notifications are disabled', () => {
    const now = new Date('2025-07-01T12:00:00');
    const nextSlotStart = new Date('2025-07-01T12:10:00'); // 10min away
    const dashboardData = {
      currentSlot: null,
      nextSlot: {
        id: 'ns1',
        start: '12:10',
        end: '16:00',
        reqCrew: 1,
        assigned: [],
        dayNumber: 1,
        absoluteStart: nextSlotStart,
        absoluteEnd: new Date('2025-07-01T16:00:00'),
      },
      status: 'W TRAKCIE',
      progress: 50,
      allSlotsAbsolute: [],
    };

    renderHook(() => useNotifications(false, dashboardData as any, now));
    expect(globalThis.Notification).not.toHaveBeenCalled();
  });

  it('does not notify when dashboardData is null', () => {
    renderHook(() => useNotifications(true, null, new Date()));
    expect(globalThis.Notification).not.toHaveBeenCalled();
  });

  it('does not notify when nextSlot is null', () => {
    const dashboardData = {
      currentSlot: null,
      nextSlot: null,
      status: 'ZAKOŃCZONY',
      progress: 100,
      allSlotsAbsolute: [],
    };
    renderHook(() => useNotifications(true, dashboardData as any, new Date()));
    expect(globalThis.Notification).not.toHaveBeenCalled();
  });

  it('notifies when next slot is within 15 minutes', () => {
    const now = new Date('2025-07-01T12:00:00');
    const nextSlotStart = new Date('2025-07-01T12:10:00'); // 10min away
    const dashboardData = {
      currentSlot: null,
      nextSlot: {
        id: 'ns1',
        start: '12:10',
        end: '16:00',
        reqCrew: 1,
        assigned: [],
        dayNumber: 1,
        absoluteStart: nextSlotStart,
        absoluteEnd: new Date('2025-07-01T16:00:00'),
      },
      status: 'W TRAKCIE',
      progress: 50,
      allSlotsAbsolute: [],
    };

    renderHook(() => useNotifications(true, dashboardData as any, now));
    expect(globalThis.Notification).toHaveBeenCalledTimes(1);
  });

  it('does not notify when next slot is more than 15 minutes away', () => {
    const now = new Date('2025-07-01T12:00:00');
    const nextSlotStart = new Date('2025-07-01T13:00:00'); // 60min away
    const dashboardData = {
      currentSlot: null,
      nextSlot: {
        id: 'ns1',
        start: '13:00',
        end: '16:00',
        reqCrew: 1,
        assigned: [],
        dayNumber: 1,
        absoluteStart: nextSlotStart,
        absoluteEnd: new Date('2025-07-01T16:00:00'),
      },
      status: 'W TRAKCIE',
      progress: 50,
      allSlotsAbsolute: [],
    };

    renderHook(() => useNotifications(true, dashboardData as any, now));
    expect(globalThis.Notification).not.toHaveBeenCalled();
  });

  it('does not notify twice for the same slot', () => {
    const now = new Date('2025-07-01T12:00:00');
    const nextSlotStart = new Date('2025-07-01T12:10:00');
    const dashboardData = {
      currentSlot: null,
      nextSlot: {
        id: 'ns1',
        start: '12:10',
        end: '16:00',
        reqCrew: 1,
        assigned: [],
        dayNumber: 1,
        absoluteStart: nextSlotStart,
        absoluteEnd: new Date('2025-07-01T16:00:00'),
      },
      status: 'W TRAKCIE',
      progress: 50,
      allSlotsAbsolute: [],
    };

    const { rerender } = renderHook(
      ({ time }) => useNotifications(true, dashboardData as any, time),
      { initialProps: { time: now } },
    );

    expect(globalThis.Notification).toHaveBeenCalledTimes(1);

    // Re-render with slightly different time — should not re-notify
    rerender({ time: new Date('2025-07-01T12:01:00') });
    expect(globalThis.Notification).toHaveBeenCalledTimes(1);
  });

  it('does not notify when next slot is in the past', () => {
    const now = new Date('2025-07-01T14:00:00');
    const nextSlotStart = new Date('2025-07-01T12:00:00'); // in the past
    const dashboardData = {
      currentSlot: null,
      nextSlot: {
        id: 'ns1',
        start: '12:00',
        end: '16:00',
        reqCrew: 1,
        assigned: [],
        dayNumber: 1,
        absoluteStart: nextSlotStart,
        absoluteEnd: new Date('2025-07-01T16:00:00'),
      },
      status: 'W TRAKCIE',
      progress: 50,
      allSlotsAbsolute: [],
    };

    renderHook(() => useNotifications(true, dashboardData as any, now));
    expect(globalThis.Notification).not.toHaveBeenCalled();
  });

  it('does not notify when Notification.permission is not granted', () => {
    (globalThis.Notification as any).permission = 'denied';

    const now = new Date('2025-07-01T12:00:00');
    const nextSlotStart = new Date('2025-07-01T12:10:00');
    const dashboardData = {
      currentSlot: null,
      nextSlot: {
        id: 'ns1',
        start: '12:10',
        end: '16:00',
        reqCrew: 1,
        assigned: [],
        dayNumber: 1,
        absoluteStart: nextSlotStart,
        absoluteEnd: new Date('2025-07-01T16:00:00'),
      },
      status: 'W TRAKCIE',
      progress: 50,
      allSlotsAbsolute: [],
    };

    renderHook(() => useNotifications(true, dashboardData as any, now));
    expect(globalThis.Notification).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// useDragDrop
// ===========================================================================
describe('useDragDrop', () => {
  function makeDropSchedule(): DaySchedule[] {
    return [
      {
        day: 1,
        slots: [
          { id: 's1', start: '00:00', end: '06:00', reqCrew: 2, assigned: [crew[0], crew[1]] },
          { id: 's2', start: '06:00', end: '12:00', reqCrew: 2, assigned: [crew[2], crew[3]] },
        ],
      },
    ];
  }

  function makeDragEvent(overrides: Partial<React.DragEvent> = {}): React.DragEvent {
    return {
      preventDefault: vi.fn(),
      dataTransfer: { effectAllowed: '' },
      ...overrides,
    } as unknown as React.DragEvent;
  }

  it('starts with no dragged item', () => {
    const schedule = makeDropSchedule();
    const setSchedule = vi.fn();
    const { result } = renderHook(() => useDragDrop(schedule, setSchedule));

    expect(result.current.draggedItem).toBeNull();
  });

  it('sets draggedItem on handleDragStart', () => {
    const schedule = makeDropSchedule();
    const setSchedule = vi.fn();
    const { result } = renderHook(() => useDragDrop(schedule, setSchedule));

    const event = makeDragEvent();
    act(() => {
      result.current.handleDragStart(event, 0, 0, 0);
    });

    expect(result.current.draggedItem).toEqual({ dayIdx: 0, slotIdx: 0, pIdx: 0 });
    expect(event.dataTransfer.effectAllowed).toBe('move');
  });

  it('handleDragOver prevents default', () => {
    const schedule = makeDropSchedule();
    const setSchedule = vi.fn();
    const { result } = renderHook(() => useDragDrop(schedule, setSchedule));

    const event = makeDragEvent();
    act(() => {
      result.current.handleDragOver(event);
    });

    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('handleDrop swaps crew members and clears draggedItem', () => {
    const schedule = makeDropSchedule();
    const setSchedule = vi.fn();
    const { result } = renderHook(() => useDragDrop(schedule, setSchedule));

    // Start drag
    act(() => {
      result.current.handleDragStart(makeDragEvent(), 0, 0, 0);
    });

    // Drop
    const dropEvent = makeDragEvent();
    act(() => {
      result.current.handleDrop(dropEvent, 0, 1, 0);
    });

    expect(dropEvent.preventDefault).toHaveBeenCalled();
    expect(setSchedule).toHaveBeenCalledTimes(1);
    const newSchedule = setSchedule.mock.calls[0][0];
    // crew[0] (Anna) and crew[2] (Kasia) should be swapped
    expect(newSchedule[0].slots[0].assigned[0].id).toBe('c3');
    expect(newSchedule[0].slots[1].assigned[0].id).toBe('c1');
    expect(result.current.draggedItem).toBeNull();
  });

  it('handleDrop does nothing when no drag in progress', () => {
    const schedule = makeDropSchedule();
    const setSchedule = vi.fn();
    const { result } = renderHook(() => useDragDrop(schedule, setSchedule));

    const event = makeDragEvent();
    act(() => {
      result.current.handleDrop(event, 0, 1, 0);
    });

    expect(setSchedule).not.toHaveBeenCalled();
  });

  it('handleDrop on same position still calls setSchedule (self-swap)', () => {
    const schedule = makeDropSchedule();
    const setSchedule = vi.fn();
    const { result } = renderHook(() => useDragDrop(schedule, setSchedule));

    act(() => {
      result.current.handleDragStart(makeDragEvent(), 0, 0, 0);
    });

    const dropEvent = makeDragEvent();
    act(() => {
      result.current.handleDrop(dropEvent, 0, 0, 0);
    });

    expect(setSchedule).toHaveBeenCalledTimes(1);
    // Self-swap should produce same assignment
    const newSchedule = setSchedule.mock.calls[0][0];
    expect(newSchedule[0].slots[0].assigned[0].id).toBe('c1');
  });
});

// ===========================================================================
// applyDrop — additional edge cases
// ===========================================================================
describe('applyDrop (extended)', () => {
  it('swaps across different days', () => {
    const schedule: DaySchedule[] = [
      {
        day: 1,
        slots: [{ id: 's1', start: '00:00', end: '06:00', reqCrew: 1, assigned: [crew[0]] }],
      },
      {
        day: 2,
        slots: [{ id: 's2', start: '00:00', end: '06:00', reqCrew: 1, assigned: [crew[1]] }],
      },
    ];

    const result = applyDrop(
      schedule,
      { dayIdx: 0, slotIdx: 0, pIdx: 0 },
      { dayIdx: 1, slotIdx: 0, pIdx: 0 },
    );

    expect(result[0].slots[0].assigned[0].id).toBe('c2');
    expect(result[1].slots[0].assigned[0].id).toBe('c1');
  });

  it('swaps within same slot, different positions', () => {
    const schedule: DaySchedule[] = [
      {
        day: 1,
        slots: [
          { id: 's1', start: '00:00', end: '06:00', reqCrew: 2, assigned: [crew[0], crew[1]] },
        ],
      },
    ];

    const result = applyDrop(
      schedule,
      { dayIdx: 0, slotIdx: 0, pIdx: 0 },
      { dayIdx: 0, slotIdx: 0, pIdx: 1 },
    );

    expect(result[0].slots[0].assigned[0].id).toBe('c2');
    expect(result[0].slots[0].assigned[1].id).toBe('c1');
  });
});
