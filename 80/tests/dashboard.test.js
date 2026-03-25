import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BETA_MODE_KEY,
  isBetaModeEnabled,
  setBetaMode,
  initBetaMode,
  toggleBetaMode,
  openSettings,
  closeSettings,
  closeSettingsOnBackdrop,
  openModule
} from '../js/dashboard.js';

describe('Dashboard - Beta Mode Management', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
  });

  describe('isBetaModeEnabled', () => {
    it('should return false when beta mode is not set', () => {
      expect(isBetaModeEnabled()).toBe(false);
    });

    it('should return true when beta mode is enabled', () => {
      localStorage.setItem(BETA_MODE_KEY, 'true');
      expect(isBetaModeEnabled()).toBe(true);
    });

    it('should return false when beta mode is disabled', () => {
      localStorage.setItem(BETA_MODE_KEY, 'false');
      expect(isBetaModeEnabled()).toBe(false);
    });

    it('should return false for invalid values', () => {
      localStorage.setItem(BETA_MODE_KEY, 'invalid');
      expect(isBetaModeEnabled()).toBe(false);
    });
  });

  describe('setBetaMode', () => {
    it('should save beta mode as true', () => {
      setBetaMode(true);
      expect(localStorage.getItem(BETA_MODE_KEY)).toBe('true');
    });

    it('should save beta mode as false', () => {
      setBetaMode(false);
      expect(localStorage.getItem(BETA_MODE_KEY)).toBe('false');
    });

    it('should convert value to string', () => {
      setBetaMode(1);
      expect(localStorage.getItem(BETA_MODE_KEY)).toBe('1');
    });
  });

  describe('initBetaMode', () => {
    beforeEach(() => {
      // Modules start with module-hidden class to prevent flash on load
      document.body.innerHTML = `
        <input type="checkbox" id="betaToggle" />
        <div id="anchorModule" class="module-hidden"></div>
        <div id="wachtownikModule" class="module-hidden"></div>
      `;
    });

    it('should keep modules hidden when beta mode is disabled', () => {
      setBetaMode(false);
      initBetaMode();

      const anchor = document.getElementById('anchorModule');
      const wachtownik = document.getElementById('wachtownikModule');

      // Modules should remain hidden (initBetaMode doesn't remove the class)
      expect(anchor.classList.contains('module-hidden')).toBe(true);
      expect(wachtownik.classList.contains('module-hidden')).toBe(true);
    });

    it('should show modules when beta mode is enabled', () => {
      setBetaMode(true);
      initBetaMode();

      const anchor = document.getElementById('anchorModule');
      const wachtownik = document.getElementById('wachtownikModule');

      // Modules should be visible (initBetaMode removes the hidden class)
      expect(anchor.classList.contains('module-hidden')).toBe(false);
      expect(wachtownik.classList.contains('module-hidden')).toBe(false);
    });

    it('should set checkbox to checked when beta mode is enabled', () => {
      setBetaMode(true);
      initBetaMode();

      const toggle = document.getElementById('betaToggle');
      expect(toggle.checked).toBe(true);
    });

    it('should set checkbox to unchecked when beta mode is disabled', () => {
      setBetaMode(false);
      initBetaMode();

      const toggle = document.getElementById('betaToggle');
      expect(toggle.checked).toBe(false);
    });

    it('should handle missing DOM elements gracefully', () => {
      document.body.innerHTML = '';
      expect(() => initBetaMode()).not.toThrow();
    });
  });

  describe('toggleBetaMode', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <input type="checkbox" id="betaToggle" />
        <div id="anchorModule"></div>
        <div id="wachtownikModule"></div>
      `;
    });

    it('should enable beta mode when checkbox is checked', () => {
      const toggle = document.getElementById('betaToggle');
      toggle.checked = true;

      toggleBetaMode();

      expect(isBetaModeEnabled()).toBe(true);
      expect(document.getElementById('anchorModule').classList.contains('module-hidden')).toBe(false);
    });

    it('should disable beta mode when checkbox is unchecked', () => {
      const toggle = document.getElementById('betaToggle');
      toggle.checked = false;

      toggleBetaMode();

      expect(isBetaModeEnabled()).toBe(false);
      expect(document.getElementById('anchorModule').classList.contains('module-hidden')).toBe(true);
    });

    it('should persist preference to localStorage', () => {
      const toggle = document.getElementById('betaToggle');
      toggle.checked = true;

      toggleBetaMode();

      expect(localStorage.getItem(BETA_MODE_KEY)).toBe('true');
    });
  });
});

describe('Dashboard - Settings Modal', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="settingsModal"></div>';
  });

  describe('openSettings', () => {
    it('should add show class to modal', () => {
      openSettings();
      const modal = document.getElementById('settingsModal');
      expect(modal.classList.contains('show')).toBe(true);
    });

    it('should handle missing modal gracefully', () => {
      document.body.innerHTML = '';
      expect(() => openSettings()).not.toThrow();
    });
  });

  describe('closeSettings', () => {
    it('should remove show class from modal', () => {
      const modal = document.getElementById('settingsModal');
      modal.classList.add('show');

      closeSettings();

      expect(modal.classList.contains('show')).toBe(false);
    });

    it('should handle missing modal gracefully', () => {
      document.body.innerHTML = '';
      expect(() => closeSettings()).not.toThrow();
    });
  });

  describe('closeSettingsOnBackdrop', () => {
    it('should close when clicking on backdrop (modal itself)', () => {
      const modal = document.getElementById('settingsModal');
      modal.classList.add('show');

      const event = { target: { id: 'settingsModal' } };
      closeSettingsOnBackdrop(event);

      expect(modal.classList.contains('show')).toBe(false);
    });

    it('should not close when clicking on content', () => {
      const modal = document.getElementById('settingsModal');
      modal.classList.add('show');

      const event = { target: { id: 'settingsContent' } };
      closeSettingsOnBackdrop(event);

      expect(modal.classList.contains('show')).toBe(true);
    });
  });
});

describe('Dashboard - Navigation', () => {
  describe('openModule', () => {
    it('should navigate to module URL', () => {
      const originalHref = window.location.href;

      // Mock window.location.href setter
      delete window.location;
      window.location = { href: originalHref };

      openModule('modules/anchor/index.html');

      expect(window.location.href).toBe('modules/anchor/index.html');
    });
  });
});
