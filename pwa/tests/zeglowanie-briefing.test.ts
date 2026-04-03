import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCurrentBriefingType,
  renderBriefingChecklist,
  switchBriefingType,
  resetBriefingChecklist,
  initBriefing,
} from '../src/modules/zeglowanie/briefing';
import { briefingLists } from '../src/modules/zeglowanie/data';
import { STORAGE_KEYS } from '../src/modules/zeglowanie/storage-keys';

function setupBriefingDOM(): void {
  document.body.innerHTML = `
    <button class="cruise-btn" data-briefing="zero"></button>
    <button class="cruise-btn" data-briefing="first-day"></button>
    <div class="briefing-content" id="briefing-zero">
      <ul id="briefingZeroList"></ul>
    </div>
    <div class="briefing-content" id="briefing-first-day">
      <ul id="briefingFirstDayList"></ul>
    </div>
  `;
}

describe('zeglowanie/briefing', () => {
  beforeEach(() => {
    setupBriefingDOM();
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // initBriefing
  // --------------------------------------------------------------------------
  describe('initBriefing', () => {
    it('defaults to "zero" when localStorage is empty', () => {
      initBriefing();
      expect(getCurrentBriefingType()).toBe('zero');
    });

    it('restores saved valid briefing type from localStorage', () => {
      localStorage.setItem(STORAGE_KEYS.BRIEFING_TYPE, 'first-day');
      initBriefing();
      expect(getCurrentBriefingType()).toBe('first-day');
    });

    it('falls back to "zero" for invalid localStorage value', () => {
      localStorage.setItem(STORAGE_KEYS.BRIEFING_TYPE, 'garbage');
      initBriefing();
      expect(getCurrentBriefingType()).toBe('zero');
    });

    it('activates correct button and content panel', () => {
      localStorage.setItem(STORAGE_KEYS.BRIEFING_TYPE, 'first-day');
      initBriefing();

      const firstDayBtn = document.querySelector<HTMLButtonElement>(
        '[data-briefing="first-day"]',
      )!;
      expect(firstDayBtn.classList.contains('active')).toBe(true);

      const zeroBtn = document.querySelector<HTMLButtonElement>('[data-briefing="zero"]')!;
      expect(zeroBtn.classList.contains('active')).toBe(false);

      expect(document.getElementById('briefing-first-day')!.classList.contains('active')).toBe(
        true,
      );
      expect(document.getElementById('briefing-zero')!.classList.contains('active')).toBe(false);
    });

    it('renders checklist items for the zero list', () => {
      initBriefing();
      const items = document.querySelectorAll('#briefingZeroList .checklist-item');
      expect(items.length).toBe(briefingLists['zero'].length);
    });

    it('renders checklist items for the first-day list', () => {
      localStorage.setItem(STORAGE_KEYS.BRIEFING_TYPE, 'first-day');
      initBriefing();
      const items = document.querySelectorAll('#briefingFirstDayList .checklist-item');
      expect(items.length).toBe(briefingLists['first-day'].length);
    });
  });

  // --------------------------------------------------------------------------
  // renderBriefingChecklist
  // --------------------------------------------------------------------------
  describe('renderBriefingChecklist', () => {
    it('creates li elements with correct data attributes', () => {
      initBriefing(); // type = 'zero'
      const items = document.querySelectorAll<HTMLLIElement>('#briefingZeroList .checklist-item');

      items.forEach((item, idx) => {
        expect(item.dataset.item).toBe(briefingLists['zero'][idx].id);
        expect(item.dataset.briefingType).toBe('zero');
      });
    });

    it('each item has a checkbox and text child', () => {
      initBriefing();
      const firstItem = document.querySelector<HTMLLIElement>('#briefingZeroList .checklist-item')!;
      expect(firstItem.querySelector('.checklist-checkbox')).not.toBeNull();
      expect(firstItem.querySelector('.checklist-text')).not.toBeNull();
    });

    it('restores checked state from localStorage', () => {
      const firstItemId = briefingLists['zero'][0].id;
      localStorage.setItem(`briefing-zero-${firstItemId}`, 'true');
      initBriefing();

      const firstItem = document.querySelector<HTMLLIElement>('#briefingZeroList .checklist-item')!;
      expect(firstItem.classList.contains('checked')).toBe(true);
      expect(
        firstItem.querySelector('.checklist-checkbox')!.classList.contains('checked'),
      ).toBe(true);
    });

    it('does not mark item as checked when localStorage value is not "true"', () => {
      const firstItemId = briefingLists['zero'][0].id;
      localStorage.setItem(`briefing-zero-${firstItemId}`, 'false');
      initBriefing();

      const firstItem = document.querySelector<HTMLLIElement>('#briefingZeroList .checklist-item')!;
      expect(firstItem.classList.contains('checked')).toBe(false);
    });

    it('returns early when list container is missing', () => {
      document.body.innerHTML = `
        <button class="cruise-btn" data-briefing="zero"></button>
        <div class="briefing-content" id="briefing-zero"></div>
      `;
      // No #briefingZeroList — renderBriefingChecklist should return without error
      initBriefing();
      expect(getCurrentBriefingType()).toBe('zero');
    });

    it('clears previous items on re-render', () => {
      initBriefing();
      const beforeCount = document.querySelectorAll('#briefingZeroList .checklist-item').length;
      renderBriefingChecklist();
      const afterCount = document.querySelectorAll('#briefingZeroList .checklist-item').length;
      expect(afterCount).toBe(beforeCount);
    });
  });

  // --------------------------------------------------------------------------
  // Click handler (attached by renderBriefingChecklist)
  // --------------------------------------------------------------------------
  describe('checklist item click', () => {
    it('toggles checked class on click', () => {
      initBriefing();
      const item = document.querySelector<HTMLLIElement>('#briefingZeroList .checklist-item')!;

      item.click();
      expect(item.classList.contains('checked')).toBe(true);
      expect(item.querySelector('.checklist-checkbox')!.classList.contains('checked')).toBe(true);

      item.click();
      expect(item.classList.contains('checked')).toBe(false);
      expect(item.querySelector('.checklist-checkbox')!.classList.contains('checked')).toBe(false);
    });

    it('persists checked state to localStorage', () => {
      initBriefing();
      const item = document.querySelector<HTMLLIElement>('#briefingZeroList .checklist-item')!;
      const itemId = item.dataset.item!;

      item.click();
      expect(localStorage.getItem(`briefing-zero-${itemId}`)).toBe('true');

      item.click();
      expect(localStorage.getItem(`briefing-zero-${itemId}`)).toBe('false');
    });
  });

  // --------------------------------------------------------------------------
  // switchBriefingType
  // --------------------------------------------------------------------------
  describe('switchBriefingType', () => {
    beforeEach(() => {
      initBriefing();
    });

    it('switches to first-day type', () => {
      switchBriefingType('first-day');
      expect(getCurrentBriefingType()).toBe('first-day');
    });

    it('saves type to localStorage', () => {
      switchBriefingType('first-day');
      expect(localStorage.getItem(STORAGE_KEYS.BRIEFING_TYPE)).toBe('first-day');
    });

    it('activates correct button', () => {
      switchBriefingType('first-day');
      expect(
        document.querySelector('[data-briefing="first-day"]')!.classList.contains('active'),
      ).toBe(true);
      expect(
        document.querySelector('[data-briefing="zero"]')!.classList.contains('active'),
      ).toBe(false);
    });

    it('activates correct content panel', () => {
      switchBriefingType('first-day');
      expect(document.getElementById('briefing-first-day')!.classList.contains('active')).toBe(
        true,
      );
      expect(document.getElementById('briefing-zero')!.classList.contains('active')).toBe(false);
    });

    it('renders items for the new type', () => {
      switchBriefingType('first-day');
      const items = document.querySelectorAll('#briefingFirstDayList .checklist-item');
      expect(items.length).toBe(briefingLists['first-day'].length);
    });

    it('switching back and forth works', () => {
      switchBriefingType('first-day');
      switchBriefingType('zero');
      expect(getCurrentBriefingType()).toBe('zero');
      expect(
        document.querySelector('[data-briefing="zero"]')!.classList.contains('active'),
      ).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // resetBriefingChecklist
  // --------------------------------------------------------------------------
  describe('resetBriefingChecklist', () => {
    beforeEach(() => {
      initBriefing();
      // Check a few items
      const items = document.querySelectorAll<HTMLLIElement>('#briefingZeroList .checklist-item');
      items.forEach((item) => item.click());
    });

    it('clears checked state when user confirms', () => {
      vi.stubGlobal('confirm', vi.fn(() => true));

      resetBriefingChecklist('zero');

      document
        .querySelectorAll<HTMLLIElement>('#briefingZeroList .checklist-item')
        .forEach((item) => {
          expect(item.classList.contains('checked')).toBe(false);
          expect(
            item.querySelector('.checklist-checkbox')!.classList.contains('checked'),
          ).toBe(false);
        });
    });

    it('removes localStorage entries when user confirms', () => {
      vi.stubGlobal('confirm', vi.fn(() => true));

      resetBriefingChecklist('zero');

      briefingLists['zero'].forEach((briefItem) => {
        expect(localStorage.getItem(`briefing-zero-${briefItem.id}`)).toBeNull();
      });
    });

    it('does nothing when user cancels', () => {
      vi.stubGlobal('confirm', vi.fn(() => false));

      resetBriefingChecklist('zero');

      // Items should still be checked
      const items = document.querySelectorAll<HTMLLIElement>('#briefingZeroList .checklist-item');
      items.forEach((item) => {
        expect(item.classList.contains('checked')).toBe(true);
      });
    });

    it('resets first-day checklist using correct selector', () => {
      switchBriefingType('first-day');
      const fdItems = document.querySelectorAll<HTMLLIElement>(
        '#briefingFirstDayList .checklist-item',
      );
      fdItems.forEach((item) => item.click());

      vi.stubGlobal('confirm', vi.fn(() => true));
      resetBriefingChecklist('first-day');

      document
        .querySelectorAll<HTMLLIElement>('#briefingFirstDayList .checklist-item')
        .forEach((item) => {
          expect(item.classList.contains('checked')).toBe(false);
        });
    });
  });

  // --------------------------------------------------------------------------
  // Edge cases: empty DOM
  // --------------------------------------------------------------------------
  describe('edge cases', () => {
    it('initBriefing with no DOM elements does not throw', () => {
      document.body.innerHTML = '';
      expect(() => initBriefing()).not.toThrow();
    });

    it('switchBriefingType with no DOM elements does not throw', () => {
      document.body.innerHTML = '';
      expect(() => switchBriefingType('first-day')).not.toThrow();
    });
  });
});
