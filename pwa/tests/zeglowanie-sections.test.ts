import { describe, it, expect, beforeEach, vi } from 'vitest';
import { switchSection, getCurrentSection, initSections } from '../src/modules/zeglowanie/sections';

function setupSectionsDOM(): void {
  document.body.innerHTML = `
    <button class="section-nav-btn" data-section="packing"></button>
    <button class="section-nav-btn" data-section="shopping"></button>
    <button class="section-nav-btn" data-section="briefing"></button>
    <button class="section-nav-btn" data-section="checklists"></button>
    <button class="section-nav-btn" data-section="knowledge"></button>
    <div class="content-section" id="section-packing"></div>
    <div class="content-section" id="section-shopping"></div>
    <div class="content-section" id="section-briefing"></div>
    <div class="content-section" id="section-checklists"></div>
    <div class="content-section" id="section-knowledge"></div>
  `;
}

describe('zeglowanie/sections', () => {
  beforeEach(() => {
    setupSectionsDOM();
  });

  // --------------------------------------------------------------------------
  // initSections
  // --------------------------------------------------------------------------
  describe('initSections', () => {
    it('defaults to packing when localStorage is empty', () => {
      initSections();
      expect(getCurrentSection()).toBe('packing');

      const packingBtn = document.querySelector<HTMLButtonElement>('[data-section="packing"]')!;
      expect(packingBtn.classList.contains('active')).toBe(true);

      const packingSection = document.getElementById('section-packing')!;
      expect(packingSection.classList.contains('active')).toBe(true);
    });

    it('restores saved section from localStorage', () => {
      localStorage.setItem('zeglowanie_selected_section', 'briefing');
      initSections();

      expect(getCurrentSection()).toBe('briefing');
      expect(
        document.querySelector('[data-section="briefing"]')!.classList.contains('active'),
      ).toBe(true);
      expect(document.getElementById('section-briefing')!.classList.contains('active')).toBe(true);
    });

    it('only the selected section and button are active', () => {
      localStorage.setItem('zeglowanie_selected_section', 'checklists');
      initSections();

      document.querySelectorAll<HTMLButtonElement>('.section-nav-btn').forEach((btn) => {
        const shouldBeActive = btn.dataset.section === 'checklists';
        expect(btn.classList.contains('active')).toBe(shouldBeActive);
      });

      document.querySelectorAll<HTMLElement>('.content-section').forEach((sec) => {
        const shouldBeActive = sec.id === 'section-checklists';
        expect(sec.classList.contains('active')).toBe(shouldBeActive);
      });
    });

    it('falls back to packing for invalid localStorage value', () => {
      localStorage.setItem('zeglowanie_selected_section', 'nonexistent');
      initSections();

      expect(getCurrentSection()).toBe('packing');
      document.querySelectorAll('.section-nav-btn').forEach((btn) => {
        const shouldBeActive = (btn as HTMLButtonElement).dataset.section === 'packing';
        expect(btn.classList.contains('active')).toBe(shouldBeActive);
      });
      document.querySelectorAll('.content-section').forEach((sec) => {
        const shouldBeActive = sec.id === 'section-packing';
        expect(sec.classList.contains('active')).toBe(shouldBeActive);
      });
    });
  });

  // --------------------------------------------------------------------------
  // switchSection
  // --------------------------------------------------------------------------
  describe('switchSection', () => {
    beforeEach(() => {
      initSections(); // known state: packing
    });

    it('switches to the specified section', () => {
      switchSection('knowledge');
      expect(getCurrentSection()).toBe('knowledge');

      expect(
        document.querySelector('[data-section="knowledge"]')!.classList.contains('active'),
      ).toBe(true);
      expect(document.getElementById('section-knowledge')!.classList.contains('active')).toBe(true);
    });

    it('deactivates previous section', () => {
      switchSection('shopping');

      expect(
        document.querySelector('[data-section="packing"]')!.classList.contains('active'),
      ).toBe(false);
      expect(document.getElementById('section-packing')!.classList.contains('active')).toBe(false);
    });

    it('saves selection to localStorage', () => {
      switchSection('briefing');
      expect(localStorage.getItem('zeglowanie_selected_section')).toBe('briefing');
    });

    it('can switch between sections multiple times', () => {
      switchSection('shopping');
      switchSection('checklists');
      switchSection('packing');

      expect(getCurrentSection()).toBe('packing');
      expect(localStorage.getItem('zeglowanie_selected_section')).toBe('packing');

      document.querySelectorAll<HTMLButtonElement>('.section-nav-btn').forEach((btn) => {
        expect(btn.classList.contains('active')).toBe(btn.dataset.section === 'packing');
      });
    });
  });

  // --------------------------------------------------------------------------
  // getCurrentSection
  // --------------------------------------------------------------------------
  describe('getCurrentSection', () => {
    it('reflects state after switchSection', () => {
      switchSection('shopping');
      expect(getCurrentSection()).toBe('shopping');
    });

    it('reflects state after initSections with saved value', () => {
      localStorage.setItem('zeglowanie_selected_section', 'knowledge');
      initSections();
      expect(getCurrentSection()).toBe('knowledge');
    });
  });

  // --------------------------------------------------------------------------
  // Edge cases: empty DOM
  // --------------------------------------------------------------------------
  describe('with empty DOM', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
    });

    it('switchSection updates state and localStorage even without DOM elements', () => {
      switchSection('briefing');
      expect(getCurrentSection()).toBe('briefing');
      expect(localStorage.getItem('zeglowanie_selected_section')).toBe('briefing');
    });

    it('initSections defaults to packing without DOM elements', () => {
      initSections();
      expect(getCurrentSection()).toBe('packing');
    });
  });
});
