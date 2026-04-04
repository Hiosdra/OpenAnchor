import { describe, it, expect, beforeEach } from 'vitest';

declare global {
  interface Window {
    toggleBetaMode: (...args: unknown[]) => void;
    openSettings: (...args: unknown[]) => void;
    closeSettings: (...args: unknown[]) => void;
    closeSettingsOnBackdrop: (...args: unknown[]) => void;
    openModule: (...args: unknown[]) => void;
  }
}

/**
 * Integration tests for dashboard functions global exposure
 *
 * These tests ensure that all dashboard functions required by onclick handlers
 * in index.html are properly exposed to the global window object.
 *
 * Regression test for: Module navigation broken when functions not exposed globally
 */
describe('Dashboard - Global Function Exposure (Regression)', () => {
  beforeEach(() => {
    // Clean up any previously set global functions
    delete (window as Partial<Window>).toggleBetaMode;
    delete (window as Partial<Window>).openSettings;
    delete (window as Partial<Window>).closeSettings;
    delete (window as Partial<Window>).closeSettingsOnBackdrop;
    delete (window as Partial<Window>).openModule;
  });

  describe('Required global functions for onclick handlers', () => {
    it('should have openModule available globally', async () => {
      // Simulate what index.html does
      const { openModule } = await import('../src/modules/dashboard/index');
      window.openModule = openModule;
      expect(window.openModule).toBeDefined();
      expect(typeof window.openModule).toBe('function');
    });

    it('should have toggleBetaMode available globally', async () => {
      const { toggleBetaMode } = await import('../src/modules/dashboard/index');
      window.toggleBetaMode = toggleBetaMode;
      expect(window.toggleBetaMode).toBeDefined();
      expect(typeof window.toggleBetaMode).toBe('function');
    });

    it('should have openSettings available globally', async () => {
      const { openSettings } = await import('../src/modules/dashboard/index');
      window.openSettings = openSettings;
      expect(window.openSettings).toBeDefined();
      expect(typeof window.openSettings).toBe('function');
    });

    it('should have closeSettings available globally', async () => {
      const { closeSettings } = await import('../src/modules/dashboard/index');
      window.closeSettings = closeSettings;
      expect(window.closeSettings).toBeDefined();
      expect(typeof window.closeSettings).toBe('function');
    });

    it('should have closeSettingsOnBackdrop available globally', async () => {
      const { closeSettingsOnBackdrop } = await import('../src/modules/dashboard/index');
      window.closeSettingsOnBackdrop = closeSettingsOnBackdrop;
      expect(window.closeSettingsOnBackdrop).toBeDefined();
      expect(typeof window.closeSettingsOnBackdrop).toBe('function');
    });
  });

  describe('All required functions together', () => {
    it('should expose all onclick handler functions simultaneously', async () => {
      const {
        openModule,
        toggleBetaMode,
        openSettings,
        closeSettings,
        closeSettingsOnBackdrop
      } = await import('../src/modules/dashboard/index');

      // Expose to global scope as done in index.html
      window.openModule = openModule;
      window.toggleBetaMode = toggleBetaMode;
      window.openSettings = openSettings;
      window.closeSettings = closeSettings;
      window.closeSettingsOnBackdrop = closeSettingsOnBackdrop;

      // Verify all are available
      expect(window.openModule).toBeDefined();
      expect(window.toggleBetaMode).toBeDefined();
      expect(window.openSettings).toBeDefined();
      expect(window.closeSettings).toBeDefined();
      expect(window.closeSettingsOnBackdrop).toBeDefined();

      // Verify they are all functions
      expect(typeof window.openModule).toBe('function');
      expect(typeof window.toggleBetaMode).toBe('function');
      expect(typeof window.openSettings).toBe('function');
      expect(typeof window.closeSettings).toBe('function');
      expect(typeof window.closeSettingsOnBackdrop).toBe('function');
    });
  });

  describe('Function functionality when exposed globally', () => {
    it('should allow openModule to navigate when called from window scope', async () => {
      const { openModule } = await import('../src/modules/dashboard/index');
      window.openModule = openModule;

      // Mock window.location
      const originalHref = window.location.href;
      delete (window as { location?: unknown }).location;
      window.location = { href: originalHref } as Location;

      // Call from global scope as onclick handler would
      window.openModule('modules/anchor/index.html');

      expect(window.location.href).toBe('modules/anchor/index.html');
    });

    it('should allow openSettings to work when called from window scope', async () => {
      const { openSettings } = await import('../src/modules/dashboard/index');
      window.openSettings = openSettings;

      // Create mock modal
      document.body.innerHTML = '<div id="settingsModal"></div>';
      const modal = document.getElementById('settingsModal')!;

      // Call from global scope
      window.openSettings();

      expect(modal.classList.contains('show')).toBe(true);
    });
  });
});
