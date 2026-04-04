import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCurrentCruiseType,
  renderChecklist,
  switchCruiseType,
  resetChecklist,
  initPacking,
} from '../src/modules/zeglowanie/packing';
import { packingLists } from '../src/modules/zeglowanie/data';
import type { CruiseType } from '../src/modules/zeglowanie/data';

function setupPackingDOM(): void {
  document.body.innerHTML = `
    <button class="cruise-btn" data-cruise="baltic-autumn"></button>
    <button class="cruise-btn" data-cruise="croatia-summer"></button>
    <ul id="packingList"></ul>
  `;
}

describe('zeglowanie/packing', () => {
  beforeEach(() => {
    setupPackingDOM();
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // initPacking
  // --------------------------------------------------------------------------
  describe('initPacking', () => {
    it('defaults to "baltic-autumn" when localStorage is empty', () => {
      initPacking();
      expect(getCurrentCruiseType()).toBe('baltic-autumn');
    });

    it('restores saved valid cruise type', () => {
      localStorage.setItem('zeglowanie_selected_cruise_type', 'croatia-summer');
      initPacking();
      expect(getCurrentCruiseType()).toBe('croatia-summer');
    });

    it('falls back to "baltic-autumn" for invalid localStorage value', () => {
      localStorage.setItem('zeglowanie_selected_cruise_type', 'atlantic-winter');
      initPacking();
      expect(getCurrentCruiseType()).toBe('baltic-autumn');
    });

    it('activates the correct button', () => {
      localStorage.setItem('zeglowanie_selected_cruise_type', 'croatia-summer');
      initPacking();

      document.querySelectorAll<HTMLButtonElement>('.cruise-btn[data-cruise]').forEach((btn) => {
        expect(btn.classList.contains('active')).toBe(btn.dataset.cruise === 'croatia-summer');
      });
    });

    it('renders items for the current cruise type', () => {
      initPacking();
      const items = document.querySelectorAll('#packingList .checklist-item');
      expect(items.length).toBe(packingLists['baltic-autumn'].length);
    });
  });

  // --------------------------------------------------------------------------
  // renderChecklist
  // --------------------------------------------------------------------------
  describe('renderChecklist', () => {
    beforeEach(() => {
      initPacking();
    });

    it('creates li elements with correct data attributes', () => {
      const items = document.querySelectorAll<HTMLLIElement>('#packingList .checklist-item');
      items.forEach((item, idx) => {
        expect(item.dataset.item).toBe(packingLists['baltic-autumn'][idx].id);
        expect(item.dataset.cruiseType).toBe('baltic-autumn');
      });
    });

    it('each item has checkbox and text children', () => {
      const item = document.querySelector<HTMLLIElement>('#packingList .checklist-item')!;
      expect(item.querySelector('.checklist-checkbox')).not.toBeNull();
      expect(item.querySelector('.checklist-text')).not.toBeNull();
    });

    it('text element contains the item text via innerHTML', () => {
      const firstItemText = packingLists['baltic-autumn'][0].text;
      const textEl = document.querySelector('#packingList .checklist-item .checklist-text')!;
      expect(textEl.innerHTML).toBe(firstItemText);
    });

    it('restores checked state from localStorage', () => {
      const firstId = packingLists['baltic-autumn'][0].id;
      localStorage.setItem(`sailing-baltic-autumn-${firstId}`, 'true');

      renderChecklist();

      const item = document.querySelector<HTMLLIElement>('#packingList .checklist-item')!;
      expect(item.classList.contains('checked')).toBe(true);
      expect(item.querySelector('.checklist-checkbox')!.classList.contains('checked')).toBe(true);
    });

    it('does not check item when localStorage value is "false"', () => {
      const firstId = packingLists['baltic-autumn'][0].id;
      localStorage.setItem(`sailing-baltic-autumn-${firstId}`, 'false');

      renderChecklist();

      const item = document.querySelector<HTMLLIElement>('#packingList .checklist-item')!;
      expect(item.classList.contains('checked')).toBe(false);
    });

    it('does not check item when localStorage value is null', () => {
      renderChecklist();
      const item = document.querySelector<HTMLLIElement>('#packingList .checklist-item')!;
      expect(item.classList.contains('checked')).toBe(false);
    });

    it('clears previous items on re-render', () => {
      const countBefore = document.querySelectorAll('#packingList .checklist-item').length;
      renderChecklist();
      const countAfter = document.querySelectorAll('#packingList .checklist-item').length;
      expect(countAfter).toBe(countBefore);
    });
  });

  // --------------------------------------------------------------------------
  // Click handler
  // --------------------------------------------------------------------------
  describe('checklist item click', () => {
    beforeEach(() => {
      initPacking();
    });

    it('toggles checked class on click', () => {
      const item = document.querySelector<HTMLLIElement>('#packingList .checklist-item')!;

      item.click();
      expect(item.classList.contains('checked')).toBe(true);
      expect(item.querySelector('.checklist-checkbox')!.classList.contains('checked')).toBe(true);

      item.click();
      expect(item.classList.contains('checked')).toBe(false);
      expect(item.querySelector('.checklist-checkbox')!.classList.contains('checked')).toBe(false);
    });

    it('persists checked state to localStorage', () => {
      const item = document.querySelector<HTMLLIElement>('#packingList .checklist-item')!;
      const itemId = item.dataset.item!;

      item.click();
      expect(localStorage.getItem(`sailing-baltic-autumn-${itemId}`)).toBe('true');

      item.click();
      expect(localStorage.getItem(`sailing-baltic-autumn-${itemId}`)).toBe('false');
    });
  });

  // --------------------------------------------------------------------------
  // switchCruiseType
  // --------------------------------------------------------------------------
  describe('switchCruiseType', () => {
    beforeEach(() => {
      initPacking();
    });

    it('switches to the specified cruise type', () => {
      switchCruiseType('croatia-summer');
      expect(getCurrentCruiseType()).toBe('croatia-summer');
    });

    it('saves type to localStorage', () => {
      switchCruiseType('croatia-summer');
      expect(localStorage.getItem('zeglowanie_selected_cruise_type')).toBe('croatia-summer');
    });

    it('activates correct button', () => {
      switchCruiseType('croatia-summer');
      document.querySelectorAll<HTMLButtonElement>('.cruise-btn[data-cruise]').forEach((btn) => {
        expect(btn.classList.contains('active')).toBe(btn.dataset.cruise === 'croatia-summer');
      });
    });

    it('renders items for the new type', () => {
      switchCruiseType('croatia-summer');
      const items = document.querySelectorAll('#packingList .checklist-item');
      expect(items.length).toBe(packingLists['croatia-summer'].length);
    });

    it('items have correct cruise type data attribute after switch', () => {
      switchCruiseType('croatia-summer');
      const items = document.querySelectorAll<HTMLLIElement>('#packingList .checklist-item');
      items.forEach((item) => {
        expect(item.dataset.cruiseType).toBe('croatia-summer');
      });
    });

    it('switching back and forth works', () => {
      switchCruiseType('croatia-summer');
      switchCruiseType('baltic-autumn');
      expect(getCurrentCruiseType()).toBe('baltic-autumn');
      expect(localStorage.getItem('zeglowanie_selected_cruise_type')).toBe('baltic-autumn');

      const items = document.querySelectorAll('#packingList .checklist-item');
      expect(items.length).toBe(packingLists['baltic-autumn'].length);
    });
  });

  // --------------------------------------------------------------------------
  // resetChecklist
  // --------------------------------------------------------------------------
  describe('resetChecklist', () => {
    beforeEach(() => {
      initPacking();
      // Check all items
      document
        .querySelectorAll<HTMLLIElement>('#packingList .checklist-item')
        .forEach((item) => item.click());
    });

    it('clears checked state when user confirms', () => {
      vi.stubGlobal('confirm', vi.fn(() => true));

      resetChecklist();

      document.querySelectorAll<HTMLLIElement>('#packingList .checklist-item').forEach((item) => {
        expect(item.classList.contains('checked')).toBe(false);
        expect(
          item.querySelector('.checklist-checkbox')!.classList.contains('checked'),
        ).toBe(false);
      });
    });

    it('removes localStorage entries when user confirms', () => {
      vi.stubGlobal('confirm', vi.fn(() => true));

      resetChecklist();

      packingLists['baltic-autumn'].forEach((pi) => {
        expect(localStorage.getItem(`sailing-baltic-autumn-${pi.id}`)).toBeNull();
      });
    });

    it('does nothing when user cancels', () => {
      vi.stubGlobal('confirm', vi.fn(() => false));

      resetChecklist();

      document.querySelectorAll<HTMLLIElement>('#packingList .checklist-item').forEach((item) => {
        expect(item.classList.contains('checked')).toBe(true);
      });
    });

    it('only resets items for the current cruise type', () => {
      // Switch to croatia, check items there too
      switchCruiseType('croatia-summer');
      document
        .querySelectorAll<HTMLLIElement>('#packingList .checklist-item')
        .forEach((item) => item.click());

      // Reset croatia
      vi.stubGlobal('confirm', vi.fn(() => true));
      resetChecklist();

      // Croatia items should be unchecked
      document.querySelectorAll<HTMLLIElement>('#packingList .checklist-item').forEach((item) => {
        expect(item.classList.contains('checked')).toBe(false);
      });

      // Baltic items should still be checked in localStorage
      packingLists['baltic-autumn'].forEach((pi) => {
        expect(localStorage.getItem(`sailing-baltic-autumn-${pi.id}`)).toBe('true');
      });
    });
  });

  // --------------------------------------------------------------------------
  // Edge cases
  // --------------------------------------------------------------------------
  describe('edge cases', () => {
    it('initPacking with no DOM buttons does not throw', () => {
      document.body.innerHTML = '<ul id="packingList"></ul>';
      expect(() => initPacking()).not.toThrow();
    });

    it('switchCruiseType with no DOM buttons does not throw', () => {
      document.body.innerHTML = '<ul id="packingList"></ul>';
      expect(() => switchCruiseType('croatia-summer')).not.toThrow();
    });
  });
});
