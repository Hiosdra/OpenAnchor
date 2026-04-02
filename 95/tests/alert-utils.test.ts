import { describe, it, expect } from 'vitest';
import { buildNotificationBody } from '../src/modules/anchor/alert-utils';

describe('buildNotificationBody', () => {
  it('combines reason and distance string for a normal alert', () => {
    expect(buildNotificationBody('Drift detected', 120, '120 m')).toBe(
      'Drift detected | 120 m',
    );
  });

  it('returns only reason when distance is null', () => {
    expect(buildNotificationBody('GPS lost', null, '')).toBe('GPS lost');
  });

  it('returns only reason for battery alerts regardless of distance', () => {
    expect(
      buildNotificationBody('Battery critically low!', 0.15, '15%', true),
    ).toBe('Battery critically low!');
  });

  it('returns reason for battery alert even when distance is null', () => {
    expect(
      buildNotificationBody('Battery low', null, '', true),
    ).toBe('Battery low');
  });

  it('includes distString for zero distance (non-battery)', () => {
    expect(buildNotificationBody('At anchor', 0, '0 m')).toBe(
      'At anchor | 0 m',
    );
  });
});
