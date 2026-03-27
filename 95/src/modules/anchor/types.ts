/**
 * Anchor module types
 */

import type { AlarmStates, Position } from '../../shared/types/index';

export type { Position };
export type { AlarmStates };

export interface AnchorConfig {
  radius: number;
  depth: number;
  chainLength: number;
}

export interface AlarmEngineState {
  anchorPosition: Position | null;
  currentPosition: Position | null;
  radius: number;
  isActive: boolean;
}
