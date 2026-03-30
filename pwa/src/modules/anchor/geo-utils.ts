/**
 * Anchor Alarm module - GPS calculations and alarm logic
 *
 * Migrated from js/anchor-utils.js
 */

import type { AlarmStates, AlarmStateValue, Position } from '../../shared/types/index';

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export const ALARM_STATES: AlarmStates = {
  SAFE: 'safe',
  CAUTION: 'caution',
  WARNING: 'warning',
  ALARM: 'alarm'
} as const;

export function getAlarmState(distance: number, radius: number): AlarmStateValue {
  if (distance <= radius * 0.7) {
    return ALARM_STATES.SAFE;
  } else if (distance <= radius * 0.85) {
    return ALARM_STATES.CAUTION;
  } else if (distance <= radius) {
    return ALARM_STATES.WARNING;
  } else {
    return ALARM_STATES.ALARM;
  }
}

export function calculateChainLength(depth: number, ratio: number = 3): number {
  return depth * ratio;
}

export function calculateSwingRadius(depth: number, chainLength: number): number {
  if (chainLength <= depth) {
    return chainLength * 0.8;
  }

  const horizontalDistance = Math.sqrt(Math.pow(chainLength, 2) - Math.pow(depth, 2));
  return Math.max(horizontalDistance, chainLength * 0.8);
}

export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  const θ = Math.atan2(y, x);
  const bearing = ((θ * 180) / Math.PI + 360) % 360;

  return bearing;
}

export function isInSector(bearing: number, sectorStart: number, sectorEnd: number): boolean {
  bearing = ((bearing % 360) + 360) % 360;
  sectorStart = ((sectorStart % 360) + 360) % 360;
  sectorEnd = ((sectorEnd % 360) + 360) % 360;

  if (sectorStart <= sectorEnd) {
    return bearing >= sectorStart && bearing <= sectorEnd;
  } else {
    return bearing >= sectorStart || bearing <= sectorEnd;
  }
}

export function calculateSOG(positions: Position[]): number {
  if (positions.length < 2) {
    return 0;
  }

  const recent = positions.slice(-2);
  const [pos1, pos2] = recent;

  const distance = calculateDistance(pos1.lat, pos1.lon, pos2.lat, pos2.lon);
  const timeSeconds = (pos2.timestamp - pos1.timestamp) / 1000;

  if (timeSeconds < 0.5) {
    return 0;
  }

  const speedMetersPerSecond = distance / timeSeconds;
  const speedKnots = speedMetersPerSecond * 1.94384;

  return Math.round(speedKnots * 10) / 10;
}

export function calculateCOG(positions: Position[]): number {
  if (positions.length < 2) {
    return 0;
  }

  const recent = positions.slice(-2);
  const [pos1, pos2] = recent;

  return calculateBearing(pos1.lat, pos1.lon, pos2.lat, pos2.lon);
}

export function isValidCoordinates(lat: number, lon: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180 &&
    !isNaN(lat) &&
    !isNaN(lon)
  );
}
