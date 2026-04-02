/**
 * Anchor module — Pure utility functions
 *
 * Extracted from anchor-app.ts. These are side-effect-free functions
 * that contain no DOM access, no `this`, and no I/O.
 */

// ── Types used by the builders ──────────────────────────────────────

export interface GPXTrackPoint {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy?: number | null;
  alarmState?: string;
}

export interface GPXSession {
  startTime: number;
  anchorLat: number;
  anchorLng: number;
  radius: number;
}

export interface CSVTrackPoint {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy?: number | null;
  distance?: number | null;
  alarmState?: string;
}

export interface ScheduleItem {
  start: string;
  end: string;
  person: string;
}

export interface ParsedLogbook {
  summary: string;
  logEntry: string;
  safetyNote: string;
}

// ── Duration formatting ─────────────────────────────────────────────

/**
 * Convert milliseconds to a human-readable duration string.
 * Returns "Xh Ym" when hours > 0, otherwise "Xm".
 */
export function formatDuration(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ── Compass direction ───────────────────────────────────────────────

/**
 * Convert a degree bearing (0–360) to one of 8 compass directions.
 */
export function degToCompass(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

// ── GPX string builder ──────────────────────────────────────────────

/**
 * Build a GPX XML string from a session and an array of track points.
 * Returns `null` when the points array is empty.
 */
export function buildGPX(session: GPXSession, points: GPXTrackPoint[]): string | null {
  if (points.length === 0) return null;

  const startDate = new Date(session.startTime);
  let gpx =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<gpx version="1.1" creator="OpenAnchor PWA"\n` +
    `  xmlns="http://www.topografix.com/GPX/1/1">\n` +
    `  <metadata><name>OpenAnchor Session ${startDate.toISOString()}</name>` +
    `<time>${startDate.toISOString()}</time></metadata>\n` +
    `  <wpt lat="${session.anchorLat}" lon="${session.anchorLng}">` +
    `<name>Anchor</name>` +
    `<desc>Anchor position, radius=${session.radius}m</desc>` +
    `<time>${startDate.toISOString()}</time>` +
    `<sym>Anchor</sym></wpt>\n` +
    `  <trk><name>Boat Track</name><trkseg>\n`;

  for (const p of points) {
    const time = new Date(p.timestamp).toISOString();
    gpx += `      <trkpt lat="${p.lat}" lon="${p.lng}">`;
    gpx += `<time>${time}</time>`;
    if (p.accuracy && p.accuracy > 0) {
      gpx += `<hdop>${p.accuracy.toFixed(1)}</hdop>`;
    }
    if (p.alarmState === 'ALARM') {
      gpx += `<name>ALARM</name>`;
    }
    gpx += `</trkpt>\n`;
  }

  gpx += `    </trkseg></trk>\n</gpx>`;
  return gpx;
}

// ── CSV string builder ──────────────────────────────────────────────

/**
 * Build a CSV string (with header) from an array of track points.
 * Returns `null` when the points array is empty.
 */
export function buildCSV(points: CSVTrackPoint[]): string | null {
  if (points.length === 0) return null;

  const header = 'timestamp,lat,lon,accuracy,distance,alarmState\n';
  const rows = points
    .map(
      (p) =>
        `${new Date(p.timestamp).toISOString()},${p.lat},${p.lng},${p.accuracy ?? ''},${p.distance ?? ''},${p.alarmState || 'SAFE'}`,
    )
    .join('\n');

  return header + rows;
}

// ── Logbook response parser ─────────────────────────────────────────

/**
 * Parse an AI-generated logbook response that follows the
 * `SUMMARY: … LOG: … SAFETY: …` format.
 * Returns `null` when the response does not match.
 */
export function parseLogbookResponse(response: string): ParsedLogbook | null {
  const summaryMatch = response.match(/SUMMARY:\s*(.+?)(?=\n|LOG:)/si);
  const logMatch = response.match(/LOG:\s*(.+?)(?=SAFETY:)/si);
  const safetyMatch = response.match(/SAFETY:\s*(.+?)$/si);

  if (summaryMatch && logMatch) {
    return {
      summary: summaryMatch[1].trim(),
      logEntry: logMatch[1].trim(),
      safetyNote: safetyMatch ? safetyMatch[1].trim() : '',
    };
  }
  return null;
}

// ── Schedule helpers ────────────────────────────────────────────────

/**
 * Convert an "HH:MM" string to minutes since midnight.
 */
export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Find the currently active schedule slot, if any.
 * Handles wrap-around times (e.g. 23:00–01:00).
 */
export function findActiveScheduleSlot(
  schedule: ScheduleItem[],
  currentMinutes: number,
): ScheduleItem | null {
  for (const item of schedule) {
    const startVal = timeToMinutes(item.start);
    const endVal = timeToMinutes(item.end);
    const isActive =
      startVal < endVal
        ? currentMinutes >= startVal && currentMinutes < endVal
        : currentMinutes >= startVal || currentMinutes < endVal;
    if (isActive) return item;
  }
  return null;
}

// ── GPS watchdog decision ───────────────────────────────────────────

/**
 * Determine whether the GPS signal should be considered lost.
 */
export function isGpsSignalLost(elapsedMs: number, timeoutMs: number): boolean {
  return elapsedMs > timeoutMs;
}

// ── Battery saver decision ──────────────────────────────────────────

/**
 * Determine whether battery saver mode should be activated.
 * Activates when battery level is ≤ 30 % and the device is NOT charging.
 */
export function shouldActivateBatterySaver(
  level: number | undefined,
  charging: boolean,
): boolean {
  return level !== undefined && level <= 0.3 && !charging;
}
