/**
 * AlarmEngine - Manages the GPS anchor alarm lifecycle
 *
 * Extracted from the inline script in modules/anchor/index.html.
 * This is a foundation class; the full implementation will be migrated
 * from the module HTML in a follow-up PR.
 */

import type { Position, AlarmStateValue } from '../../shared/types/index';
import { calculateDistance, getAlarmState } from './geo-utils';

export interface AlarmEngineConfig {
  radius: number;
  onAlarmStateChange?: (state: AlarmStateValue, distance: number) => void;
}

export class AlarmEngine {
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
