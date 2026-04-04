/**
 * Pure utility functions extracted from the map controller.
 * No Leaflet / DOM dependencies — fully testable in isolation.
 */

export interface ZoneColor {
  color: string;
  fillColor: string;
}

const ZONE_COLORS: Record<string, ZoneColor> = {
  SAFE: { color: '#22c55e', fillColor: '#22c55e' },
  CAUTION: { color: '#eab308', fillColor: '#eab308' },
  WARNING: { color: '#f97316', fillColor: '#f97316' },
  ALARM: { color: '#ef4444', fillColor: '#ef4444' },
};

const DEFAULT_ZONE_COLOR: ZoneColor = ZONE_COLORS.SAFE;

/** Return the colour pair for a given alarm state string. */
export function getZoneColor(state: string): ZoneColor {
  return ZONE_COLORS[state] ?? DEFAULT_ZONE_COLOR;
}
