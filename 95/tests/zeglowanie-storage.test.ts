import { describe, it, expect } from 'vitest';
import {
  briefingStorageKey,
  checklistStorageKey,
  packingStorageKey,
  STORAGE_KEYS,
  isValidBriefingType,
  isValidChecklistType,
  isValidCruiseType,
  isValidSection,
  crewLabel,
  parseCheckedState,
} from '../src/modules/zeglowanie/storage-keys';

// ---------------------------------------------------------------------------
// Storage key builders
// ---------------------------------------------------------------------------
describe('zeglowanie/storage-keys', () => {
  describe('briefingStorageKey', () => {
    it('builds correct key', () => {
      expect(briefingStorageKey('zero', 'solas-mob')).toBe('briefing-zero-solas-mob');
    });

    it('builds key for first-day type', () => {
      expect(briefingStorageKey('first-day', 'knots')).toBe('briefing-first-day-knots');
    });
  });

  describe('checklistStorageKey', () => {
    it('builds correct key', () => {
      expect(checklistStorageKey('morning', 'oil')).toBe('checklist-morning-oil');
    });

    it('builds key for departure type', () => {
      expect(checklistStorageKey('departure', 'fenders-depart')).toBe(
        'checklist-departure-fenders-depart',
      );
    });
  });

  describe('packingStorageKey', () => {
    it('builds correct key', () => {
      expect(packingStorageKey('baltic-autumn', 'kurtka')).toBe('sailing-baltic-autumn-kurtka');
    });

    it('builds key for croatia cruise', () => {
      expect(packingStorageKey('croatia-summer', 'okulary')).toBe(
        'sailing-croatia-summer-okulary',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // STORAGE_KEYS constants
  // ---------------------------------------------------------------------------
  describe('STORAGE_KEYS', () => {
    it('has all expected preference keys', () => {
      expect(STORAGE_KEYS.BRIEFING_TYPE).toBe('zeglowanie_selected_briefing_type');
      expect(STORAGE_KEYS.CHECKLIST_TYPE).toBe('zeglowanie_selected_checklist_type');
      expect(STORAGE_KEYS.CRUISE_TYPE).toBe('zeglowanie_selected_cruise_type');
      expect(STORAGE_KEYS.SECTION).toBe('zeglowanie_selected_section');
    });
  });

  // ---------------------------------------------------------------------------
  // Type validators
  // ---------------------------------------------------------------------------
  describe('isValidBriefingType', () => {
    it('accepts valid types', () => {
      expect(isValidBriefingType('zero')).toBe(true);
      expect(isValidBriefingType('first-day')).toBe(true);
    });

    it('rejects invalid strings', () => {
      expect(isValidBriefingType('invalid')).toBe(false);
      expect(isValidBriefingType('')).toBe(false);
    });

    it('rejects non-strings', () => {
      expect(isValidBriefingType(null)).toBe(false);
      expect(isValidBriefingType(undefined)).toBe(false);
      expect(isValidBriefingType(42)).toBe(false);
    });
  });

  describe('isValidChecklistType', () => {
    it('accepts all 4 checklist types', () => {
      for (const type of ['morning', 'departure', 'mooring', 'grabbag']) {
        expect(isValidChecklistType(type)).toBe(true);
      }
    });

    it('rejects invalid values', () => {
      expect(isValidChecklistType('evening')).toBe(false);
      expect(isValidChecklistType(null)).toBe(false);
    });
  });

  describe('isValidCruiseType', () => {
    it('accepts valid cruise types', () => {
      expect(isValidCruiseType('baltic-autumn')).toBe(true);
      expect(isValidCruiseType('croatia-summer')).toBe(true);
    });

    it('rejects invalid cruise types', () => {
      expect(isValidCruiseType('atlantic-winter')).toBe(false);
    });
  });

  describe('isValidSection', () => {
    it('accepts all 5 section types', () => {
      for (const sec of ['packing', 'shopping', 'briefing', 'checklists', 'knowledge']) {
        expect(isValidSection(sec)).toBe(true);
      }
    });

    it('rejects unknown section', () => {
      expect(isValidSection('settings')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  describe('crewLabel', () => {
    it('returns crew prefix when true', () => {
      expect(crewLabel(true)).toBe('(Załoga) ');
    });

    it('returns empty string when false', () => {
      expect(crewLabel(false)).toBe('');
    });
  });

  describe('parseCheckedState', () => {
    it('returns true for "true"', () => {
      expect(parseCheckedState('true')).toBe(true);
    });

    it('returns false for "false"', () => {
      expect(parseCheckedState('false')).toBe(false);
    });

    it('returns false for null', () => {
      expect(parseCheckedState(null)).toBe(false);
    });

    it('returns false for any other string', () => {
      expect(parseCheckedState('yes')).toBe(false);
      expect(parseCheckedState('1')).toBe(false);
    });
  });
});
