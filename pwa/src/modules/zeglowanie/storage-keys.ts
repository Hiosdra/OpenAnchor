/**
 * Zeglowanie module — Pure storage key helpers
 *
 * Extracted from briefing.ts, checklists.ts, packing.ts for testability.
 * All three checklist modules use the same localStorage key pattern.
 */

import type { BriefingType, ChecklistType, CruiseType, SectionType } from './data';

// ── Storage key builders ───────────────────────────────────────

export function briefingStorageKey(briefingType: string, itemId: string): string {
  return `briefing-${briefingType}-${itemId}`;
}

export function checklistStorageKey(checklistType: string, itemId: string): string {
  return `checklist-${checklistType}-${itemId}`;
}

export function packingStorageKey(cruiseType: string, itemId: string): string {
  return `sailing-${cruiseType}-${itemId}`;
}

// ── Preference storage keys ────────────────────────────────────

export const STORAGE_KEYS = {
  BRIEFING_TYPE: 'zeglowanie_selected_briefing_type',
  CHECKLIST_TYPE: 'zeglowanie_selected_checklist_type',
  CRUISE_TYPE: 'zeglowanie_selected_cruise_type',
  SECTION: 'zeglowanie_selected_section',
} as const;

// ── Validation helpers ─────────────────────────────────────────

const VALID_BRIEFING_TYPES = new Set<string>(['zero', 'first-day']);
const VALID_CHECKLIST_TYPES = new Set<string>(['morning', 'departure', 'mooring', 'grabbag']);
const VALID_CRUISE_TYPES = new Set<string>(['baltic-autumn', 'croatia-summer']);
const VALID_SECTIONS = new Set<string>([
  'packing',
  'shopping',
  'briefing',
  'checklists',
  'knowledge',
]);

export function isValidBriefingType(value: unknown): value is BriefingType {
  return typeof value === 'string' && VALID_BRIEFING_TYPES.has(value);
}

export function isValidChecklistType(value: unknown): value is ChecklistType {
  return typeof value === 'string' && VALID_CHECKLIST_TYPES.has(value);
}

export function isValidCruiseType(value: unknown): value is CruiseType {
  return typeof value === 'string' && VALID_CRUISE_TYPES.has(value);
}

export function isValidSection(value: unknown): value is SectionType {
  return typeof value === 'string' && VALID_SECTIONS.has(value);
}

// ── Checklist item helpers (pure) ──────────────────────────────

export function crewLabel(isCrewTask: boolean): string {
  return isCrewTask ? '(Załoga) ' : '';
}

export function parseCheckedState(storageValue: string | null): boolean {
  return storageValue === 'true';
}
