import { describe, it, expect } from 'vitest';
import {
  formatDuration,
  degToCompass,
  buildGPX,
  buildCSV,
  parseLogbookResponse,
  timeToMinutes,
  findActiveScheduleSlot,
  isGpsSignalLost,
  shouldActivateBatterySaver,
} from '../src/modules/anchor/anchor-utils';
import type { GPXSession, GPXTrackPoint, CSVTrackPoint, ScheduleItem } from '../src/modules/anchor/anchor-utils';

// ─── formatDuration ─────────────────────────────────────────────────
describe('formatDuration', () => {
  it('returns seconds for 0 ms', () => {
    expect(formatDuration(0)).toBe('0s');
  });

  it('returns seconds for values less than one minute', () => {
    expect(formatDuration(30_000)).toBe('30s');
    expect(formatDuration(59_999)).toBe('59s');
  });

  it('returns minutes only when less than one hour', () => {
    expect(formatDuration(60_000)).toBe('1m');
    expect(formatDuration(5 * 60_000)).toBe('5m');
    expect(formatDuration(59 * 60_000)).toBe('59m');
  });

  it('returns hours and minutes', () => {
    expect(formatDuration(3_600_000)).toBe('1h 0m');
    expect(formatDuration(3_600_000 + 30 * 60_000)).toBe('1h 30m');
    expect(formatDuration(2 * 3_600_000 + 15 * 60_000)).toBe('2h 15m');
  });

  it('handles large values', () => {
    expect(formatDuration(48 * 3_600_000)).toBe('48h 0m');
    expect(formatDuration(100 * 3_600_000 + 59 * 60_000)).toBe('100h 59m');
  });

  it('floors partial minutes', () => {
    expect(formatDuration(90_000)).toBe('1m'); // 1.5 min → 1m
    expect(formatDuration(3_600_000 + 90_000)).toBe('1h 1m');
  });
});

// ─── degToCompass ───────────────────────────────────────────────────
describe('degToCompass', () => {
  it('maps cardinal directions', () => {
    expect(degToCompass(0)).toBe('N');
    expect(degToCompass(90)).toBe('E');
    expect(degToCompass(180)).toBe('S');
    expect(degToCompass(270)).toBe('W');
  });

  it('maps intercardinal directions', () => {
    expect(degToCompass(45)).toBe('NE');
    expect(degToCompass(135)).toBe('SE');
    expect(degToCompass(225)).toBe('SW');
    expect(degToCompass(315)).toBe('NW');
  });

  it('handles 360° as N', () => {
    expect(degToCompass(360)).toBe('N');
  });

  it('handles boundary values between sectors', () => {
    // 22.5° is the boundary between N and NE
    expect(degToCompass(22)).toBe('N');
    expect(degToCompass(23)).toBe('NE');

    // 67.5° boundary between NE and E
    expect(degToCompass(67)).toBe('NE');
    expect(degToCompass(68)).toBe('E');
  });

  it('handles values just under 360', () => {
    expect(degToCompass(350)).toBe('N');
    expect(degToCompass(337)).toBe('NW');
  });
});

// ─── buildGPX ───────────────────────────────────────────────────────
describe('buildGPX', () => {
  const session: GPXSession = {
    startTime: new Date('2024-06-15T10:00:00Z').getTime(),
    anchorLat: 54.35,
    anchorLng: 18.65,
    radius: 50,
  };

  it('returns null for empty points', () => {
    expect(buildGPX(session, [])).toBeNull();
  });

  it('builds valid GPX for a single point', () => {
    const points: GPXTrackPoint[] = [
      { lat: 54.351, lng: 18.651, timestamp: new Date('2024-06-15T10:01:00Z').getTime() },
    ];
    const gpx = buildGPX(session, points)!;
    expect(gpx).toContain('<?xml version="1.0"');
    expect(gpx).toContain('OpenAnchor PWA');
    expect(gpx).toContain('wpt lat="54.35" lon="18.65"');
    expect(gpx).toContain('radius=50m');
    expect(gpx).toContain('trkpt lat="54.351" lon="18.651"');
    expect(gpx).toContain('</gpx>');
  });

  it('builds GPX with multiple points', () => {
    const points: GPXTrackPoint[] = [
      { lat: 54.351, lng: 18.651, timestamp: new Date('2024-06-15T10:01:00Z').getTime() },
      { lat: 54.352, lng: 18.652, timestamp: new Date('2024-06-15T10:02:00Z').getTime(), accuracy: 5.3 },
      { lat: 54.353, lng: 18.653, timestamp: new Date('2024-06-15T10:03:00Z').getTime(), alarmState: 'ALARM' },
    ];
    const gpx = buildGPX(session, points)!;
    expect(gpx).toContain('<hdop>5.3</hdop>');
    expect(gpx).toContain('<name>ALARM</name>');
    const trkptCount = (gpx.match(/<trkpt/g) || []).length;
    expect(trkptCount).toBe(3);
  });

  it('omits hdop when accuracy is null or zero', () => {
    const points: GPXTrackPoint[] = [
      { lat: 54.351, lng: 18.651, timestamp: Date.now(), accuracy: 0 },
      { lat: 54.352, lng: 18.652, timestamp: Date.now(), accuracy: null },
    ];
    const gpx = buildGPX(session, points)!;
    expect(gpx).not.toContain('<hdop>');
  });

  it('does not include ALARM name for non-ALARM states', () => {
    const points: GPXTrackPoint[] = [
      { lat: 54.351, lng: 18.651, timestamp: Date.now(), alarmState: 'SAFE' },
      { lat: 54.352, lng: 18.652, timestamp: Date.now(), alarmState: 'WARNING' },
    ];
    const gpx = buildGPX(session, points)!;
    expect(gpx).not.toContain('<name>ALARM</name>');
  });
});

// ─── buildCSV ───────────────────────────────────────────────────────
describe('buildCSV', () => {
  it('returns null for empty points', () => {
    expect(buildCSV([])).toBeNull();
  });

  it('includes header row', () => {
    const points: CSVTrackPoint[] = [
      { lat: 54.35, lng: 18.65, timestamp: Date.now(), accuracy: 3, distance: 10, alarmState: 'SAFE' },
    ];
    const csv = buildCSV(points)!;
    expect(csv.startsWith('timestamp,lat,lon,accuracy,distance,alarmState\n')).toBe(true);
  });

  it('formats data rows correctly', () => {
    const ts = new Date('2024-06-15T10:00:00Z').getTime();
    const points: CSVTrackPoint[] = [
      { lat: 54.35, lng: 18.65, timestamp: ts, accuracy: 3, distance: 10, alarmState: 'SAFE' },
    ];
    const csv = buildCSV(points)!;
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('54.35,18.65,3,10,SAFE');
  });

  it('handles missing optional fields', () => {
    const ts = Date.now();
    const points: CSVTrackPoint[] = [
      { lat: 1, lng: 2, timestamp: ts },
    ];
    const csv = buildCSV(points)!;
    const dataRow = csv.split('\n')[1];
    // accuracy and distance should be empty, alarmState defaults to SAFE
    expect(dataRow).toMatch(/,1,2,,,SAFE$/);
  });

  it('builds multiple rows', () => {
    const points: CSVTrackPoint[] = [
      { lat: 1, lng: 2, timestamp: Date.now(), alarmState: 'SAFE' },
      { lat: 3, lng: 4, timestamp: Date.now(), alarmState: 'ALARM' },
      { lat: 5, lng: 6, timestamp: Date.now(), alarmState: 'WARNING' },
    ];
    const csv = buildCSV(points)!;
    const lines = csv.split('\n');
    expect(lines).toHaveLength(4); // header + 3 rows
    expect(lines[2]).toContain('ALARM');
  });
});

// ─── parseLogbookResponse ───────────────────────────────────────────
describe('parseLogbookResponse', () => {
  it('parses a valid response with all three sections', () => {
    const text = 'SUMMARY: Quiet night at anchor\nLOG: Dropped anchor at 2100. Wind 10kn NW.\nSAFETY: All clear, crew well rested.';
    const result = parseLogbookResponse(text);
    expect(result).not.toBeNull();
    expect(result!.summary).toBe('Quiet night at anchor');
    expect(result!.logEntry).toBe('Dropped anchor at 2100. Wind 10kn NW.');
    expect(result!.safetyNote).toBe('All clear, crew well rested.');
  });

  it('parses response without trailing safety note', () => {
    const text = 'SUMMARY: Test\nLOG: Some log entry\nSAFETY:';
    const result = parseLogbookResponse(text);
    expect(result).not.toBeNull();
    expect(result!.safetyNote).toBe('');
  });

  it('returns null for empty input', () => {
    expect(parseLogbookResponse('')).toBeNull();
  });

  it('returns null for malformed input without required sections', () => {
    expect(parseLogbookResponse('Just some random text')).toBeNull();
    expect(parseLogbookResponse('SUMMARY: only summary')).toBeNull();
  });

  it('handles multiline sections', () => {
    const text = 'SUMMARY: Multi-line summary here\nLOG: Line 1 of log. Line 2 of log.\nSAFETY: Be careful of tides.';
    const result = parseLogbookResponse(text);
    expect(result).not.toBeNull();
    expect(result!.logEntry).toContain('Line 1');
    expect(result!.logEntry).toContain('Line 2');
  });

  it('is case-insensitive for section markers', () => {
    const text = 'summary: Test\nlog: Some entry\nsafety: Note';
    const result = parseLogbookResponse(text);
    expect(result).not.toBeNull();
    expect(result!.summary).toBe('Test');
  });
});

// ─── timeToMinutes ──────────────────────────────────────────────────
describe('timeToMinutes', () => {
  it('converts midnight', () => {
    expect(timeToMinutes('00:00')).toBe(0);
  });

  it('converts noon', () => {
    expect(timeToMinutes('12:00')).toBe(720);
  });

  it('converts end of day', () => {
    expect(timeToMinutes('23:59')).toBe(1439);
  });

  it('converts arbitrary times', () => {
    expect(timeToMinutes('06:30')).toBe(390);
    expect(timeToMinutes('18:45')).toBe(1125);
  });
});

// ─── findActiveScheduleSlot ─────────────────────────────────────────
describe('findActiveScheduleSlot', () => {
  it('returns null for empty schedule', () => {
    expect(findActiveScheduleSlot([], 720)).toBeNull();
  });

  it('finds matching slot for normal time range', () => {
    const schedule: ScheduleItem[] = [
      { start: '08:00', end: '12:00', person: 'Alice' },
      { start: '12:00', end: '16:00', person: 'Bob' },
    ];
    expect(findActiveScheduleSlot(schedule, 600)!.person).toBe('Alice');  // 10:00
    expect(findActiveScheduleSlot(schedule, 720)!.person).toBe('Bob');    // 12:00
  });

  it('returns null when no slot matches', () => {
    const schedule: ScheduleItem[] = [
      { start: '08:00', end: '12:00', person: 'Alice' },
    ];
    expect(findActiveScheduleSlot(schedule, 420)).toBeNull(); // 07:00
    expect(findActiveScheduleSlot(schedule, 720)).toBeNull(); // 12:00 (end is exclusive)
  });

  it('handles wrap-around schedule (23:00–01:00)', () => {
    const schedule: ScheduleItem[] = [
      { start: '23:00', end: '01:00', person: 'Charlie' },
    ];
    // 23:30 → inside
    expect(findActiveScheduleSlot(schedule, 23 * 60 + 30)!.person).toBe('Charlie');
    // 00:30 → inside (wrap-around)
    expect(findActiveScheduleSlot(schedule, 30)!.person).toBe('Charlie');
    // 01:00 → outside (end exclusive)
    expect(findActiveScheduleSlot(schedule, 60)).toBeNull();
    // 22:59 → outside
    expect(findActiveScheduleSlot(schedule, 22 * 60 + 59)).toBeNull();
  });

  it('returns first matching slot when multiple overlap', () => {
    const schedule: ScheduleItem[] = [
      { start: '10:00', end: '14:00', person: 'Alice' },
      { start: '12:00', end: '16:00', person: 'Bob' },
    ];
    // 13:00 → both match but Alice is first
    expect(findActiveScheduleSlot(schedule, 780)!.person).toBe('Alice');
  });

  it('handles exact start boundary (inclusive)', () => {
    const schedule: ScheduleItem[] = [
      { start: '10:00', end: '12:00', person: 'Alice' },
    ];
    expect(findActiveScheduleSlot(schedule, 600)!.person).toBe('Alice');
  });
});

// ─── isGpsSignalLost ────────────────────────────────────────────────
describe('isGpsSignalLost', () => {
  const timeout = 60_000;

  it('returns false when elapsed is less than timeout', () => {
    expect(isGpsSignalLost(0, timeout)).toBe(false);
    expect(isGpsSignalLost(59_999, timeout)).toBe(false);
  });

  it('returns false at exactly the timeout boundary', () => {
    expect(isGpsSignalLost(60_000, timeout)).toBe(false);
  });

  it('returns true when elapsed exceeds timeout', () => {
    expect(isGpsSignalLost(60_001, timeout)).toBe(true);
    expect(isGpsSignalLost(120_000, timeout)).toBe(true);
  });
});

// ─── shouldActivateBatterySaver ─────────────────────────────────────
describe('shouldActivateBatterySaver', () => {
  it('returns false when level is undefined', () => {
    expect(shouldActivateBatterySaver(undefined, false)).toBe(false);
  });

  it('returns true at 30% and not charging', () => {
    expect(shouldActivateBatterySaver(0.3, false)).toBe(true);
  });

  it('returns true below 30% and not charging', () => {
    expect(shouldActivateBatterySaver(0.1, false)).toBe(true);
    expect(shouldActivateBatterySaver(0, false)).toBe(true);
  });

  it('returns false above 30%', () => {
    expect(shouldActivateBatterySaver(0.31, false)).toBe(false);
    expect(shouldActivateBatterySaver(0.5, false)).toBe(false);
    expect(shouldActivateBatterySaver(1, false)).toBe(false);
  });

  it('returns false when charging regardless of level', () => {
    expect(shouldActivateBatterySaver(0.1, true)).toBe(false);
    expect(shouldActivateBatterySaver(0.3, true)).toBe(false);
  });
});
