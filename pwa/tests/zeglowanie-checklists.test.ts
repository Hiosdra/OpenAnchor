import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCurrentChecklistType,
  renderChecklistItems,
  switchChecklistType,
  resetChecklistSection,
  initChecklists,
} from '../src/modules/zeglowanie/checklists';
import { checklistData } from '../src/modules/zeglowanie/data';
import type { ChecklistType } from '../src/modules/zeglowanie/data';

function setupChecklistsDOM(): void {
  document.body.innerHTML = `
    <button class="cruise-btn" data-checklist="morning"></button>
    <button class="cruise-btn" data-checklist="departure"></button>
    <button class="cruise-btn" data-checklist="mooring"></button>
    <button class="cruise-btn" data-checklist="grabbag"></button>
    <h2 id="checklistTitle"></h2>
    <ul id="checklistItems"></ul>
  `;
}

describe('zeglowanie/checklists', () => {
  beforeEach(() => {
    setupChecklistsDOM();
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // initChecklists
  // --------------------------------------------------------------------------
  describe('initChecklists', () => {
    it('defaults to "morning" when localStorage is empty', () => {
      initChecklists();
      expect(getCurrentChecklistType()).toBe('morning');
    });

    it('restores saved valid checklist type', () => {
      localStorage.setItem('zeglowanie_selected_checklist_type', 'departure');
      initChecklists();
      expect(getCurrentChecklistType()).toBe('departure');
    });

    it('falls back to "morning" for invalid localStorage value', () => {
      localStorage.setItem('zeglowanie_selected_checklist_type', 'invalid');
      initChecklists();
      expect(getCurrentChecklistType()).toBe('morning');
    });

    it('activates the correct button', () => {
      localStorage.setItem('zeglowanie_selected_checklist_type', 'mooring');
      initChecklists();

      document.querySelectorAll<HTMLButtonElement>('.cruise-btn[data-checklist]').forEach((btn) => {
        expect(btn.classList.contains('active')).toBe(btn.dataset.checklist === 'mooring');
      });
    });

    it('sets the checklist title', () => {
      localStorage.setItem('zeglowanie_selected_checklist_type', 'grabbag');
      initChecklists();

      const title = document.getElementById('checklistTitle')!;
      expect(title.textContent).toBe(checklistData['grabbag'].title);
    });

    it('renders items for the current type', () => {
      initChecklists();
      const items = document.querySelectorAll('#checklistItems .checklist-item');
      expect(items.length).toBe(checklistData['morning'].items.length);
    });
  });

  // --------------------------------------------------------------------------
  // renderChecklistItems
  // --------------------------------------------------------------------------
  describe('renderChecklistItems', () => {
    beforeEach(() => {
      initChecklists();
    });

    it('creates li elements with correct data attributes', () => {
      const items = document.querySelectorAll<HTMLLIElement>('#checklistItems .checklist-item');
      items.forEach((item, idx) => {
        expect(item.dataset.item).toBe(checklistData['morning'].items[idx].id);
        expect(item.dataset.checklistType).toBe('morning');
      });
    });

    it('each item has checkbox and text children', () => {
      const item = document.querySelector<HTMLLIElement>('#checklistItems .checklist-item')!;
      expect(item.querySelector('.checklist-checkbox')).not.toBeNull();
      expect(item.querySelector('.checklist-text')).not.toBeNull();
    });

    it('crew items get crew prefix', () => {
      const crewItem = checklistData['morning'].items.find((i) => i.crew);
      if (!crewItem) return;

      const li = document.querySelector<HTMLLIElement>(
        `#checklistItems .checklist-item[data-item="${crewItem.id}"]`,
      )!;
      const textContent = li.querySelector('.checklist-text')!.textContent!;
      expect(textContent).toContain('(Za\u0142oga)');
    });

    it('non-crew items do not get crew prefix', () => {
      const nonCrewItem = checklistData['morning'].items.find((i) => !i.crew);
      if (!nonCrewItem) return;

      const li = document.querySelector<HTMLLIElement>(
        `#checklistItems .checklist-item[data-item="${nonCrewItem.id}"]`,
      )!;
      const textContent = li.querySelector('.checklist-text')!.textContent!;
      expect(textContent).not.toContain('(Za\u0142oga)');
    });

    it('restores checked state from localStorage', () => {
      const firstId = checklistData['morning'].items[0].id;
      localStorage.setItem(`checklist-morning-${firstId}`, 'true');

      renderChecklistItems();

      const item = document.querySelector<HTMLLIElement>('#checklistItems .checklist-item')!;
      expect(item.classList.contains('checked')).toBe(true);
      expect(item.querySelector('.checklist-checkbox')!.classList.contains('checked')).toBe(true);
    });

    it('does not check item when localStorage value is "false"', () => {
      const firstId = checklistData['morning'].items[0].id;
      localStorage.setItem(`checklist-morning-${firstId}`, 'false');

      renderChecklistItems();

      const item = document.querySelector<HTMLLIElement>('#checklistItems .checklist-item')!;
      expect(item.classList.contains('checked')).toBe(false);
    });

    it('clears previous items on re-render', () => {
      const countBefore = document.querySelectorAll('#checklistItems .checklist-item').length;
      renderChecklistItems();
      const countAfter = document.querySelectorAll('#checklistItems .checklist-item').length;
      expect(countAfter).toBe(countBefore);
    });
  });

  // --------------------------------------------------------------------------
  // Click handler
  // --------------------------------------------------------------------------
  describe('checklist item click', () => {
    beforeEach(() => {
      initChecklists();
    });

    it('toggles checked class on click', () => {
      const item = document.querySelector<HTMLLIElement>('#checklistItems .checklist-item')!;

      item.click();
      expect(item.classList.contains('checked')).toBe(true);
      expect(item.querySelector('.checklist-checkbox')!.classList.contains('checked')).toBe(true);

      item.click();
      expect(item.classList.contains('checked')).toBe(false);
      expect(item.querySelector('.checklist-checkbox')!.classList.contains('checked')).toBe(false);
    });

    it('persists checked state to localStorage', () => {
      const item = document.querySelector<HTMLLIElement>('#checklistItems .checklist-item')!;
      const itemId = item.dataset.item!;

      item.click();
      expect(localStorage.getItem(`checklist-morning-${itemId}`)).toBe('true');

      item.click();
      expect(localStorage.getItem(`checklist-morning-${itemId}`)).toBe('false');
    });
  });

  // --------------------------------------------------------------------------
  // switchChecklistType
  // --------------------------------------------------------------------------
  describe('switchChecklistType', () => {
    beforeEach(() => {
      initChecklists();
    });

    it('switches to the specified type', () => {
      switchChecklistType('departure');
      expect(getCurrentChecklistType()).toBe('departure');
    });

    it('saves type to localStorage', () => {
      switchChecklistType('mooring');
      expect(localStorage.getItem('zeglowanie_selected_checklist_type')).toBe('mooring');
    });

    it('activates correct button', () => {
      switchChecklistType('grabbag');
      document.querySelectorAll<HTMLButtonElement>('.cruise-btn[data-checklist]').forEach((btn) => {
        expect(btn.classList.contains('active')).toBe(btn.dataset.checklist === 'grabbag');
      });
    });

    it('updates the title', () => {
      switchChecklistType('departure');
      expect(document.getElementById('checklistTitle')!.textContent).toBe(
        checklistData['departure'].title,
      );
    });

    it('renders items for the new type', () => {
      switchChecklistType('grabbag');
      const items = document.querySelectorAll('#checklistItems .checklist-item');
      expect(items.length).toBe(checklistData['grabbag'].items.length);
    });

    it('cycles through all types correctly', () => {
      const types: ChecklistType[] = ['morning', 'departure', 'mooring', 'grabbag'];
      for (const t of types) {
        switchChecklistType(t);
        expect(getCurrentChecklistType()).toBe(t);
        expect(document.getElementById('checklistTitle')!.textContent).toBe(
          checklistData[t].title,
        );
      }
    });
  });

  // --------------------------------------------------------------------------
  // resetChecklistSection
  // --------------------------------------------------------------------------
  describe('resetChecklistSection', () => {
    beforeEach(() => {
      initChecklists();
      // Check all items
      document
        .querySelectorAll<HTMLLIElement>('#checklistItems .checklist-item')
        .forEach((item) => item.click());
    });

    it('clears checked state when user confirms', () => {
      vi.stubGlobal('confirm', vi.fn(() => true));

      resetChecklistSection();

      document
        .querySelectorAll<HTMLLIElement>('#checklistItems .checklist-item')
        .forEach((item) => {
          expect(item.classList.contains('checked')).toBe(false);
          expect(
            item.querySelector('.checklist-checkbox')!.classList.contains('checked'),
          ).toBe(false);
        });
    });

    it('removes localStorage entries when user confirms', () => {
      vi.stubGlobal('confirm', vi.fn(() => true));

      resetChecklistSection();

      checklistData['morning'].items.forEach((ci) => {
        expect(localStorage.getItem(`checklist-morning-${ci.id}`)).toBeNull();
      });
    });

    it('does nothing when user cancels', () => {
      vi.stubGlobal('confirm', vi.fn(() => false));

      resetChecklistSection();

      document
        .querySelectorAll<HTMLLIElement>('#checklistItems .checklist-item')
        .forEach((item) => {
          expect(item.classList.contains('checked')).toBe(true);
        });
    });
  });

  // --------------------------------------------------------------------------
  // Edge cases
  // --------------------------------------------------------------------------
  describe('edge cases', () => {
    it('initChecklists with empty DOM does not throw', () => {
      document.body.innerHTML = '<ul id="checklistItems"></ul><h2 id="checklistTitle"></h2>';
      expect(() => initChecklists()).not.toThrow();
    });
  });
});
