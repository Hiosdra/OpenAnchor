import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AlarmEngine, SimpleAlarmEngine } from '../src/modules/anchor/alarm-engine';
import type { ZoneCheckResult, AlarmLevel } from '../src/modules/anchor/alarm-engine';

// ---------------------------------------------------------------------------
// AlarmEngine.checkZone — static method
// ---------------------------------------------------------------------------
describe('AlarmEngine.checkZone', () => {
  const radius = 50;
  const bufferRadius = 70;

  // Helper to create a minimal L.LatLng-compatible object
  const latLng = (lat: number, lng: number) => ({ lat, lng } as any);

  describe('circle mode (sector disabled)', () => {
    it('returns INSIDE when distance ≤ radius', () => {
      expect(
        AlarmEngine.checkZone(30, radius, bufferRadius, false, 0, 0, null, null),
      ).toBe('INSIDE');
    });

    it('returns INSIDE at exactly the radius boundary', () => {
      expect(
        AlarmEngine.checkZone(radius, radius, bufferRadius, false, 0, 0, null, null),
      ).toBe('INSIDE');
    });

    it('returns BUFFER when distance is between radius and bufferRadius', () => {
      expect(
        AlarmEngine.checkZone(60, radius, bufferRadius, false, 0, 0, null, null),
      ).toBe('BUFFER');
    });

    it('returns OUTSIDE when distance exceeds bufferRadius', () => {
      expect(
        AlarmEngine.checkZone(80, radius, bufferRadius, false, 0, 0, null, null),
      ).toBe('OUTSIDE');
    });

    it('returns OUTSIDE when there is no buffer and distance > radius', () => {
      expect(
        AlarmEngine.checkZone(60, radius, null, false, 0, 0, null, null),
      ).toBe('OUTSIDE');
    });
  });

  describe('sector mode', () => {
    const anchorPos = latLng(54.0, 18.0);

    it('returns INSIDE when boat is within sector and within radius', () => {
      // Boat at same position as anchor → distance 0, always inside
      const boatPos = latLng(54.0, 18.0);
      expect(
        AlarmEngine.checkZone(0, radius, bufferRadius, true, 90, 60, anchorPos, boatPos),
      ).toBe('INSIDE');
    });

    it('returns OUTSIDE when boat bearing is outside sector and distance > 50% radius', () => {
      // Boat is due North of anchor (bearing ~0°), sector is centered on 180° with width 60°
      const boatPos = latLng(54.001, 18.0);
      expect(
        AlarmEngine.checkZone(40, radius, null, true, 180, 60, anchorPos, boatPos),
      ).toBe('OUTSIDE');
    });

    it('returns BUFFER when boat is outside sector but within buffer radius', () => {
      const boatPos = latLng(54.001, 18.0);
      expect(
        AlarmEngine.checkZone(40, radius, bufferRadius, true, 180, 60, anchorPos, boatPos),
      ).toBe('BUFFER');
    });

    it('falls through to circle logic when sector is disabled', () => {
      const boatPos = latLng(54.001, 18.0);
      expect(
        AlarmEngine.checkZone(30, radius, bufferRadius, false, 180, 60, anchorPos, boatPos),
      ).toBe('INSIDE');
    });
  });
});

// ---------------------------------------------------------------------------
// AlarmEngine — state machine (processReading)
// ---------------------------------------------------------------------------
describe('AlarmEngine state machine', () => {
  let engine: AlarmEngine;

  beforeEach(() => {
    engine = new AlarmEngine();
  });

  it('starts in SAFE state', () => {
    expect(engine.currentState).toBe('SAFE');
    expect(engine.violationCount).toBe(0);
  });

  it('processReading INSIDE → SAFE', () => {
    expect(engine.processReading('INSIDE')).toBe('SAFE');
  });

  it('processReading BUFFER → CAUTION', () => {
    expect(engine.processReading('BUFFER')).toBe('CAUTION');
    expect(engine.bufferActive).toBe(true);
  });

  it('processReading OUTSIDE increments violation count', () => {
    engine.processReading('OUTSIDE');
    expect(engine.violationCount).toBe(1);
  });

  it('single OUTSIDE → WARNING (not ALARM)', () => {
    const level = engine.processReading('OUTSIDE');
    expect(level).toBe('WARNING');
  });

  it('3 OUTSIDE readings within 3s → still WARNING (time threshold not met)', () => {
    vi.useFakeTimers();
    engine.processReading('OUTSIDE');
    engine.processReading('OUTSIDE');
    const level = engine.processReading('OUTSIDE');
    // Only 0ms elapsed, so still WARNING despite 3 violations
    expect(level).toBe('WARNING');
    vi.useRealTimers();
  });

  it('3+ OUTSIDE readings over 3s → ALARM', () => {
    vi.useFakeTimers();
    engine.processReading('OUTSIDE');
    vi.advanceTimersByTime(2000);
    engine.processReading('OUTSIDE');
    vi.advanceTimersByTime(1500);
    const level = engine.processReading('OUTSIDE');
    expect(level).toBe('ALARM');
    vi.useRealTimers();
  });

  it('INSIDE after violations resets to SAFE', () => {
    engine.processReading('OUTSIDE');
    engine.processReading('OUTSIDE');
    expect(engine.violationCount).toBe(2);

    const level = engine.processReading('INSIDE');
    expect(level).toBe('SAFE');
    expect(engine.violationCount).toBe(0);
    expect(engine.firstViolationTime).toBeNull();
  });

  it('BUFFER after violations resets violations and returns CAUTION', () => {
    engine.processReading('OUTSIDE');
    expect(engine.violationCount).toBe(1);

    const level = engine.processReading('BUFFER');
    expect(level).toBe('CAUTION');
    expect(engine.violationCount).toBe(0);
    expect(engine.bufferActive).toBe(true);
  });

  it('reset() clears all state', () => {
    engine.processReading('OUTSIDE');
    engine.processReading('OUTSIDE');
    engine.reset();

    expect(engine.violationCount).toBe(0);
    expect(engine.firstViolationTime).toBeNull();
    expect(engine.bufferActive).toBe(false);
    expect(engine.currentState).toBe('SAFE');
  });

  it('elapsedSinceFirstViolation returns 0 when no violations', () => {
    expect(engine.elapsedSinceFirstViolation).toBe(0);
  });

  it('elapsedSinceFirstViolation tracks time since first OUTSIDE', () => {
    vi.useFakeTimers();
    engine.processReading('OUTSIDE');
    vi.advanceTimersByTime(5000);
    expect(engine.elapsedSinceFirstViolation).toBe(5000);
    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// SimpleAlarmEngine
// ---------------------------------------------------------------------------
describe('SimpleAlarmEngine', () => {
  it('returns null when inactive', () => {
    const engine = new SimpleAlarmEngine({ radius: 100 });
    const result = engine.checkPosition({ lat: 0, lon: 0, timestamp: 0 });
    expect(result).toBeNull();
  });

  it('returns null when no anchor position is set', () => {
    const engine = new SimpleAlarmEngine({ radius: 100 });
    engine.start();
    const result = engine.checkPosition({ lat: 0, lon: 0, timestamp: 0 });
    expect(result).toBeNull();
  });

  it('returns alarm state when active and anchor is set', () => {
    const engine = new SimpleAlarmEngine({ radius: 100 });
    engine.setAnchorPosition({ lat: 54.0, lon: 18.0, timestamp: 0 });
    engine.start();

    // Same position → distance ~0 → SAFE
    const result = engine.checkPosition({ lat: 54.0, lon: 18.0, timestamp: 1000 });
    expect(result).toBe('safe');
  });

  it('calls onAlarmStateChange callback', () => {
    const callback = vi.fn();
    const engine = new SimpleAlarmEngine({
      radius: 100,
      onAlarmStateChange: callback,
    });
    engine.setAnchorPosition({ lat: 54.0, lon: 18.0, timestamp: 0 });
    engine.start();

    engine.checkPosition({ lat: 54.0, lon: 18.0, timestamp: 1000 });
    expect(callback).toHaveBeenCalledWith('safe', expect.any(Number));
  });

  it('can be stopped and restarted', () => {
    const engine = new SimpleAlarmEngine({ radius: 100 });
    engine.setAnchorPosition({ lat: 54.0, lon: 18.0, timestamp: 0 });
    engine.start();
    expect(engine.isActive).toBe(true);

    engine.stop();
    expect(engine.isActive).toBe(false);
    expect(engine.checkPosition({ lat: 54.0, lon: 18.0, timestamp: 1000 })).toBeNull();

    engine.start();
    expect(engine.checkPosition({ lat: 54.0, lon: 18.0, timestamp: 2000 })).toBe('safe');
  });

  it('detects alarm state for distant position', () => {
    const engine = new SimpleAlarmEngine({ radius: 50 });
    engine.setAnchorPosition({ lat: 54.0, lon: 18.0, timestamp: 0 });
    engine.start();

    // ~111km away (1 degree lat) → way beyond 50m radius
    const result = engine.checkPosition({ lat: 55.0, lon: 18.0, timestamp: 1000 });
    expect(result).toBe('alarm');
  });

  it('setRadius updates the radius', () => {
    const engine = new SimpleAlarmEngine({ radius: 10 });
    engine.setAnchorPosition({ lat: 54.0, lon: 18.0, timestamp: 0 });
    engine.start();

    // 100m away → alarm with 10m radius
    const pos = { lat: 54.0009, lon: 18.0, timestamp: 1000 };
    expect(engine.checkPosition(pos)).toBe('alarm');

    // Increase radius to 200m → should be safe
    engine.setRadius(200);
    expect(engine.checkPosition(pos)).toBe('safe');
  });
});
