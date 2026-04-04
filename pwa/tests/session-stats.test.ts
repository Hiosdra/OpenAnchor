import { describe, it, expect } from 'vitest';
import { calculateSessionStats } from '../src/modules/anchor/session-db';
import type { AnchorSession } from '../src/modules/anchor/session-db';

function makeSession(overrides: Partial<AnchorSession> = {}): AnchorSession {
  return {
    anchorLat: 54.0,
    anchorLng: 18.0,
    radius: 50,
    bufferRadius: null,
    sectorEnabled: false,
    sectorBearing: 0,
    sectorWidth: 0,
    startTime: 1000000,
    endTime: 2000000,
    chainLengthM: null,
    depthM: null,
    alarmTriggered: false,
    alarmCount: 0,
    maxDistance: 30,
    maxSog: 1.5,
    ...overrides,
  };
}

describe('calculateSessionStats', () => {
  it('returns zeros for empty array', () => {
    const stats = calculateSessionStats([]);
    expect(stats.totalSessions).toBe(0);
    expect(stats.totalAlarms).toBe(0);
    expect(stats.totalDuration).toBe(0);
    expect(stats.maxDistance).toBe(0);
    expect(stats.maxSog).toBe(0);
    expect(stats.avgDuration).toBe(0);
  });

  it('counts only completed sessions (with endTime)', () => {
    const sessions = [
      makeSession({ endTime: 2000000 }),
      makeSession({ endTime: null }), // incomplete — should be excluded
    ];
    const stats = calculateSessionStats(sessions);
    expect(stats.totalSessions).toBe(1);
  });

  it('sums alarm counts', () => {
    const sessions = [
      makeSession({ alarmCount: 3 }),
      makeSession({ alarmCount: 5 }),
    ];
    expect(calculateSessionStats(sessions).totalAlarms).toBe(8);
  });

  it('calculates total duration', () => {
    const sessions = [
      makeSession({ startTime: 1000, endTime: 5000 }),
      makeSession({ startTime: 2000, endTime: 8000 }),
    ];
    expect(calculateSessionStats(sessions).totalDuration).toBe(10000);
  });

  it('finds max distance across sessions', () => {
    const sessions = [
      makeSession({ maxDistance: 25 }),
      makeSession({ maxDistance: 80 }),
      makeSession({ maxDistance: 45 }),
    ];
    expect(calculateSessionStats(sessions).maxDistance).toBe(80);
  });

  it('finds max SOG across sessions', () => {
    const sessions = [
      makeSession({ maxSog: 1.2 }),
      makeSession({ maxSog: 3.5 }),
    ];
    expect(calculateSessionStats(sessions).maxSog).toBe(3.5);
  });

  it('calculates average duration correctly', () => {
    const sessions = [
      makeSession({ startTime: 0, endTime: 6000 }),
      makeSession({ startTime: 0, endTime: 4000 }),
    ];
    expect(calculateSessionStats(sessions).avgDuration).toBe(5000);
  });

  it('handles sessions with zero alarm count', () => {
    const sessions = [makeSession({ alarmCount: 0 })];
    expect(calculateSessionStats(sessions).totalAlarms).toBe(0);
  });

  it('handles sessions with undefined maxDistance/maxSog', () => {
    const sessions = [
      makeSession({ maxDistance: undefined as any, maxSog: undefined as any }),
    ];
    const stats = calculateSessionStats(sessions);
    expect(stats.maxDistance).toBe(0);
    expect(stats.maxSog).toBe(0);
  });
});
