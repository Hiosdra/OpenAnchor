/**
 * AlarmEngine — 4-level anchor alarm processor
 *
 * Ported from the Android AlarmEngine and the inline script in modules/anchor/index.html.
 * Processes GPS readings through a zone-check → alarm-state pipeline:
 *   INSIDE → SAFE
 *   BUFFER → CAUTION
 *   OUTSIDE → WARNING (1-2 violations) → ALARM (3+ violations over 3 s)
 */

import type { Position, AlarmStateValue } from '../../shared/types/index';
import { calculateDistance, getAlarmState } from './geo-utils';
import { GeoUtils } from './geo-utils';
import L from 'leaflet';

export type ZoneCheckResult = 'INSIDE' | 'BUFFER' | 'OUTSIDE';
export type AlarmLevel = 'SAFE' | 'CAUTION' | 'WARNING' | 'ALARM';

export interface AlarmEngineConfig {
  radius: number;
  onAlarmStateChange?: (state: AlarmStateValue, distance: number) => void;
}

/**
 * Legacy AlarmEngine (simple radius-based) kept for backward-compat re-exports.
 */
export class SimpleAlarmEngine {
  private _anchorPosition: Position | null = null;
  private _radius: number;
  private _isActive = false;
  private _onAlarmStateChange?: (state: AlarmStateValue, distance: number) => void;

  constructor(config: AlarmEngineConfig) {
    this._radius = config.radius;
    this._onAlarmStateChange = config.onAlarmStateChange;
  }

  setAnchorPosition(position: Position): void {
    this._anchorPosition = position;
  }

  setRadius(radius: number): void {
    this._radius = radius;
  }

  start(): void {
    this._isActive = true;
  }

  stop(): void {
    this._isActive = false;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  checkPosition(currentPosition: Position): AlarmStateValue | null {
    if (!this._isActive || !this._anchorPosition) {
      return null;
    }

    const distance = calculateDistance(
      this._anchorPosition.lat,
      this._anchorPosition.lon,
      currentPosition.lat,
      currentPosition.lon
    );

    const state = getAlarmState(distance, this._radius);

    if (this._onAlarmStateChange) {
      this._onAlarmStateChange(state, distance);
    }

    return state;
  }
}

/**
 * Full 4-level AlarmEngine used by the anchor module UI.
 */
export class AlarmEngine {
  violationCount = 0;
  firstViolationTime: number | null = null;
  bufferActive = false;

  /**
   * Determine if the boat is INSIDE, in the BUFFER zone, or OUTSIDE.
   */
  static checkZone(
    distance: number,
    radius: number,
    bufferRadius: number | null,
    sectorEnabled: boolean,
    sectorBearing: number,
    sectorWidth: number,
    anchorPos: L.LatLng | null,
    boatPos: L.LatLng | null
  ): ZoneCheckResult {
    if (sectorEnabled && anchorPos && boatPos) {
      const brngToBoat = GeoUtils.getBearing(anchorPos, boatPos);
      let diff = Math.abs(brngToBoat - sectorBearing) % 360;
      if (diff > 180) diff = 360 - diff;
      if (diff > sectorWidth / 2 && distance > radius * 0.5) {
        if (bufferRadius && distance <= bufferRadius) return 'BUFFER';
        return 'OUTSIDE';
      }
    }

    if (distance <= radius) return 'INSIDE';
    if (bufferRadius && distance <= bufferRadius) return 'BUFFER';
    return 'OUTSIDE';
  }

  /**
   * Process a GPS reading. Returns the current alarm level.
   */
  processReading(zoneResult: ZoneCheckResult): AlarmLevel {
    switch (zoneResult) {
      case 'INSIDE':
        this.reset();
        return 'SAFE';

      case 'BUFFER':
        this.reset();
        this.bufferActive = true;
        return 'CAUTION';

      case 'OUTSIDE':
        this.bufferActive = false;
        this.violationCount++;
        if (this.firstViolationTime === null) {
          this.firstViolationTime = Date.now();
        }
        return this.currentState;

      default:
        return 'SAFE';
    }
  }

  get currentState(): AlarmLevel {
    if (this.violationCount >= 3 && this.elapsedSinceFirstViolation >= 3000) return 'ALARM';
    if (this.violationCount > 0) return 'WARNING';
    return 'SAFE';
  }

  get elapsedSinceFirstViolation(): number {
    return this.firstViolationTime ? Date.now() - this.firstViolationTime : 0;
  }

  reset() {
    this.violationCount = 0;
    this.firstViolationTime = null;
    this.bufferActive = false;
  }
}
