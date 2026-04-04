import { describe, it, expect } from 'vitest';
import { getZoneColor } from '../src/modules/anchor/map-utils';

describe('getZoneColor', () => {
  it('returns green for SAFE', () => {
    const c = getZoneColor('SAFE');
    expect(c.color).toBe('#22c55e');
    expect(c.fillColor).toBe('#22c55e');
  });

  it('returns yellow for CAUTION', () => {
    const c = getZoneColor('CAUTION');
    expect(c.color).toBe('#eab308');
    expect(c.fillColor).toBe('#eab308');
  });

  it('returns orange for WARNING', () => {
    const c = getZoneColor('WARNING');
    expect(c.color).toBe('#f97316');
    expect(c.fillColor).toBe('#f97316');
  });

  it('returns red for ALARM', () => {
    const c = getZoneColor('ALARM');
    expect(c.color).toBe('#ef4444');
    expect(c.fillColor).toBe('#ef4444');
  });

  it('falls back to SAFE colors for unknown state', () => {
    const c = getZoneColor('UNKNOWN');
    expect(c.color).toBe('#22c55e');
    expect(c.fillColor).toBe('#22c55e');
  });

  it('falls back to SAFE colors for empty string', () => {
    const c = getZoneColor('');
    expect(c.color).toBe('#22c55e');
    expect(c.fillColor).toBe('#22c55e');
  });
});
