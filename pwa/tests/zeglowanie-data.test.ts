import { describe, it, expect } from 'vitest';
import {
  packingLists,
  briefingLists,
  checklistData,
} from '../src/modules/zeglowanie/data';
import type {
  CruiseType,
  BriefingType,
  ChecklistType,
} from '../src/modules/zeglowanie/data';

describe('zeglowanie/data — data integrity', () => {
  // ------------------------------------------------------------------
  // packingLists
  // ------------------------------------------------------------------
  describe('packingLists', () => {
    const cruiseTypes: CruiseType[] = ['baltic-autumn', 'croatia-summer'];

    it('has entries for all cruise types', () => {
      for (const type of cruiseTypes) {
        expect(packingLists[type]).toBeDefined();
        expect(packingLists[type].length).toBeGreaterThan(0);
      }
    });

    it('every item has a non-empty id and text', () => {
      for (const type of cruiseTypes) {
        for (const item of packingLists[type]) {
          expect(item.id, `Missing id in ${type}`).toBeTruthy();
          expect(item.text, `Missing text for ${item.id} in ${type}`).toBeTruthy();
        }
      }
    });

    it('ids are unique within each cruise type', () => {
      for (const type of cruiseTypes) {
        const ids = packingLists[type].map((i) => i.id);
        expect(new Set(ids).size, `Duplicate ids in ${type}`).toBe(ids.length);
      }
    });
  });

  // ------------------------------------------------------------------
  // briefingLists
  // ------------------------------------------------------------------
  describe('briefingLists', () => {
    const briefingTypes: BriefingType[] = ['zero', 'first-day'];

    it('has entries for all briefing types', () => {
      for (const type of briefingTypes) {
        expect(briefingLists[type]).toBeDefined();
        expect(briefingLists[type].length).toBeGreaterThan(0);
      }
    });

    it('every item has a non-empty id and text', () => {
      for (const type of briefingTypes) {
        for (const item of briefingLists[type]) {
          expect(item.id).toBeTruthy();
          expect(item.text).toBeTruthy();
        }
      }
    });

    it('ids are unique within each briefing type', () => {
      for (const type of briefingTypes) {
        const ids = briefingLists[type].map((i) => i.id);
        expect(new Set(ids).size).toBe(ids.length);
      }
    });
  });

  // ------------------------------------------------------------------
  // checklistData
  // ------------------------------------------------------------------
  describe('checklistData', () => {
    const checklistTypes: ChecklistType[] = ['morning', 'departure', 'mooring', 'grabbag'];

    it('has entries for all checklist types', () => {
      for (const type of checklistTypes) {
        expect(checklistData[type]).toBeDefined();
        expect(checklistData[type].items.length).toBeGreaterThan(0);
      }
    });

    it('every section has a non-empty title', () => {
      for (const type of checklistTypes) {
        expect(checklistData[type].title).toBeTruthy();
      }
    });

    it('every item has id, text, and boolean crew flag', () => {
      for (const type of checklistTypes) {
        for (const item of checklistData[type].items) {
          expect(item.id).toBeTruthy();
          expect(item.text).toBeTruthy();
          expect(typeof item.crew).toBe('boolean');
        }
      }
    });

    it('ids are unique within each checklist type', () => {
      for (const type of checklistTypes) {
        const ids = checklistData[type].items.map((i) => i.id);
        expect(new Set(ids).size).toBe(ids.length);
      }
    });

    it('grabbag contains critical items', () => {
      const grabIds = checklistData.grabbag.items.map((i) => i.id);
      expect(grabIds).toContain('handheld-vhf');
      expect(grabIds).toContain('boat-docs');
      expect(grabIds).toContain('water-grab');
    });
  });
});
