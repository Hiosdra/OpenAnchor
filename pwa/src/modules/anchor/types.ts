/**
 * Anchor module types
 */

import type { Position } from '../../shared/types/index';

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
