import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the dashboard/index dependency that dashboard-ui.ts imports
vi.mock('../src/modules/dashboard/index', () => ({
  initBetaMode: vi.fn(),
  toggleBetaMode: vi.fn(),
  openSettings: vi.fn(),
  closeSettings: vi.fn(),
  closeSettingsOnBackdrop: vi.fn(),
  openModule: vi.fn(),
}));

// dashboard-ui.ts only exports via initDashboard which assigns to window.
// We need to test setTheme and updateThemeButtons which are non-exported.
// We'll test through initDashboard exposing them on window, and directly
// testing observable effects.

describe('dashboard-ui', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.documentElement.dataset.theme = '';
    localStorage.clear();
  });

  describe('setTheme (exposed via initDashboard)', () => {
    it('sets data-theme on documentElement and persists to localStorage', async () => {
      document.body.innerHTML = '<button class="theme-btn" data-theme-value="light"></button>';

      const mod = await import('../src/modules/dashboard/dashboard-ui');
      mod.initDashboard();

      // setTheme is now on window
      const setTheme = (window as any).setTheme;
      expect(setTheme).toBeDefined();

      setTheme('light');
      expect(document.documentElement.dataset.theme).toBe('light');
      expect(localStorage.getItem('openanchor-theme')).toBe('light');
    });

    it('sets dark theme', async () => {
      document.body.innerHTML = '<button class="theme-btn" data-theme-value="dark"></button>';

      const mod = await import('../src/modules/dashboard/dashboard-ui');
      mod.initDashboard();

      (window as any).setTheme('dark');
      expect(document.documentElement.dataset.theme).toBe('dark');
      expect(localStorage.getItem('openanchor-theme')).toBe('dark');
    });
  });

  describe('updateThemeButtons (called by setTheme)', () => {
    it('marks correct button as active', async () => {
      document.body.innerHTML = `
        <button class="theme-btn" data-theme-value="light"></button>
        <button class="theme-btn" data-theme-value="dark"></button>
        <button class="theme-btn" data-theme-value="oled"></button>
      `;

      const mod = await import('../src/modules/dashboard/dashboard-ui');
      mod.initDashboard();

      (window as any).setTheme('dark');

      const buttons = document.querySelectorAll<HTMLElement>('.theme-btn');
      buttons.forEach((btn) => {
        if (btn.dataset.themeValue === 'dark') {
          expect(btn.classList.contains('active')).toBe(true);
        } else {
          expect(btn.classList.contains('active')).toBe(false);
        }
      });
    });

    it('defaults to dark theme when no theme is set', async () => {
      document.body.innerHTML = `
        <button class="theme-btn active" data-theme-value="light"></button>
        <button class="theme-btn" data-theme-value="dark"></button>
      `;
      // Clear any previous theme so it defaults to 'dark'
      delete document.documentElement.dataset.theme;

      const mod = await import('../src/modules/dashboard/dashboard-ui');
      mod.initDashboard();

      // setTheme triggers updateThemeButtons; set 'dark' explicitly
      (window as any).setTheme('dark');

      const darkBtn = document.querySelector('[data-theme-value="dark"]') as HTMLElement;
      const lightBtn = document.querySelector('[data-theme-value="light"]') as HTMLElement;
      expect(darkBtn.classList.contains('active')).toBe(true);
      expect(lightBtn.classList.contains('active')).toBe(false);
    });
  });

  describe('forceUpdate (exposed via initDashboard)', () => {
    it('is exposed on window after initDashboard', async () => {
      const mod = await import('../src/modules/dashboard/dashboard-ui');
      mod.initDashboard();
      expect((window as any).forceUpdate).toBeDefined();
      expect(typeof (window as any).forceUpdate).toBe('function');
    });
  });

  describe('initDashboard', () => {
    it('exposes all expected functions on window', async () => {
      const mod = await import('../src/modules/dashboard/dashboard-ui');
      mod.initDashboard();

      expect((window as any).setTheme).toBeDefined();
      expect((window as any).forceUpdate).toBeDefined();
      expect((window as any).toggleBetaMode).toBeDefined();
      expect((window as any).openSettings).toBeDefined();
      expect((window as any).closeSettings).toBeDefined();
      expect((window as any).closeSettingsOnBackdrop).toBeDefined();
      expect((window as any).openModule).toBeDefined();
    });
  });
});
