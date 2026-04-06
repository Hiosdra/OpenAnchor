import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  initRouter,
  getHashPath,
  getCurrentPath,
  navigateTo,
  push,
  navigateToModule,
  type RouterConfig,
  type ModuleMount,
} from '../src/router';

/** Helper: build a minimal DOM for the router and return a config object. */
function makeConfig(routes: RouterConfig['routes'] = []): RouterConfig {
  const outlet = document.createElement('div');
  outlet.id = 'router-outlet';
  outlet.style.display = 'none';
  document.body.appendChild(outlet);

  const dashboardEl = document.createElement('div');
  dashboardEl.id = 'dashboard-content';
  document.body.appendChild(dashboardEl);

  const loadingEl = document.createElement('div');
  loadingEl.id = 'router-loading';
  loadingEl.style.display = 'none';
  document.body.appendChild(loadingEl);

  return { outlet, dashboardEl, loadingEl, routes };
}

/** Helper: create a fake module mount. */
function fakeModule(): ModuleMount & { mounted: boolean } {
  const mod: ModuleMount & { mounted: boolean } = {
    mounted: false,
    mount(container: HTMLElement) {
      mod.mounted = true;
      container.innerHTML = '<p>module content</p>';
    },
    unmount() {
      mod.mounted = false;
    },
  };
  return mod;
}

describe('router', () => {
  let destroy: (() => void) | undefined;

  beforeEach(() => {
    document.body.innerHTML = '';
    window.location.hash = '';
  });

  afterEach(() => {
    destroy?.();
    destroy = undefined;
    window.location.hash = '';
  });

  // ─── getHashPath ──────────────────────────────────────────────────
  describe('getHashPath', () => {
    it('returns "/" when hash is empty', () => {
      window.location.hash = '';
      expect(getHashPath()).toBe('/');
    });

    it('returns "/" for "#"', () => {
      window.location.hash = '#';
      expect(getHashPath()).toBe('/');
    });

    it('returns "/" for "#/"', () => {
      window.location.hash = '#/';
      expect(getHashPath()).toBe('/');
    });

    it('parses "#/egzamin" to "/egzamin"', () => {
      window.location.hash = '#/egzamin';
      expect(getHashPath()).toBe('/egzamin');
    });

    it('parses "#/wachtownik" to "/wachtownik"', () => {
      window.location.hash = '#/wachtownik';
      expect(getHashPath()).toBe('/wachtownik');
    });
  });

  // ─── initRouter ───────────────────────────────────────────────────
  describe('initRouter', () => {
    it('returns a cleanup function', () => {
      const cfg = makeConfig();
      destroy = initRouter(cfg);
      expect(typeof destroy).toBe('function');
    });

    it('hides the loading indicator on init', () => {
      const cfg = makeConfig();
      cfg.loadingEl.style.display = 'block';
      destroy = initRouter(cfg);
      expect(cfg.loadingEl.style.display).toBe('none');
    });

    it('navigates to the initial hash route on init', async () => {
      const mod = fakeModule();
      const cfg = makeConfig([
        { path: '/egzamin', loader: () => Promise.resolve(mod) },
      ]);

      window.location.hash = '#/egzamin';
      destroy = initRouter(cfg);

      // Wait for async navigateTo to complete
      await vi.waitFor(() => expect(mod.mounted).toBe(true));
    });

    it('stays on dashboard when hash is empty on init', () => {
      const cfg = makeConfig();
      destroy = initRouter(cfg);
      expect(getCurrentPath()).toBe('/');
      expect(cfg.dashboardEl.style.display).not.toBe('none');
    });
  });

  // ─── navigateTo ───────────────────────────────────────────────────
  describe('navigateTo', () => {
    it('shows dashboard for "/" path', async () => {
      const mod = fakeModule();
      const cfg = makeConfig([
        { path: '/egzamin', loader: () => Promise.resolve(mod) },
      ]);
      destroy = initRouter(cfg);

      // Navigate to module first
      await navigateTo('/egzamin');
      expect(cfg.dashboardEl.style.display).toBe('none');

      // Navigate back to dashboard
      await navigateTo('/');
      expect(cfg.dashboardEl.style.display).not.toBe('none');
      expect(cfg.outlet.style.display).toBe('none');
    });

    it('mounts the module into the outlet', async () => {
      const mod = fakeModule();
      const cfg = makeConfig([
        { path: '/egzamin', loader: () => Promise.resolve(mod) },
      ]);
      destroy = initRouter(cfg);

      await navigateTo('/egzamin');

      expect(mod.mounted).toBe(true);
      expect(cfg.outlet.style.display).not.toBe('none');
      expect(cfg.dashboardEl.style.display).toBe('none');
      expect(cfg.outlet.querySelector('#spa-root')).toBeTruthy();
    });

    it('unmounts the previous module on new navigation', async () => {
      const mod1 = fakeModule();
      const mod2 = fakeModule();
      const cfg = makeConfig([
        { path: '/egzamin', loader: () => Promise.resolve(mod1) },
        { path: '/wachtownik', loader: () => Promise.resolve(mod2) },
      ]);
      destroy = initRouter(cfg);

      await navigateTo('/egzamin');
      expect(mod1.mounted).toBe(true);

      await navigateTo('/wachtownik');
      expect(mod1.mounted).toBe(false);
      expect(mod2.mounted).toBe(true);
    });

    it('falls back to dashboard for unknown routes', async () => {
      const cfg = makeConfig();
      destroy = initRouter(cfg);

      await navigateTo('/nonexistent');
      expect(cfg.dashboardEl.style.display).not.toBe('none');
      expect(getCurrentPath()).toBe('/');
    });

    it('is a no-op when navigating to the current path', async () => {
      const loaderSpy = vi.fn().mockResolvedValue(fakeModule());
      const cfg = makeConfig([{ path: '/egzamin', loader: loaderSpy }]);
      destroy = initRouter(cfg);

      await navigateTo('/egzamin');
      expect(loaderSpy).toHaveBeenCalledTimes(1);

      await navigateTo('/egzamin');
      expect(loaderSpy).toHaveBeenCalledTimes(1);
    });

    it('falls back to dashboard when loader throws', async () => {
      const cfg = makeConfig([
        { path: '/egzamin', loader: () => Promise.reject(new Error('chunk failed')) },
      ]);
      destroy = initRouter(cfg);

      await navigateTo('/egzamin');
      expect(cfg.dashboardEl.style.display).not.toBe('none');
      expect(getCurrentPath()).toBe('/');
    });

    it('intercepts legacy back links in the outlet', async () => {
      const mod = fakeModule();
      const cfg = makeConfig([
        { path: '/egzamin', loader: () => Promise.resolve(mod) },
      ]);
      destroy = initRouter(cfg);

      await navigateTo('/egzamin');
      // Simulate a legacy back link inside the mounted module
      const link = document.createElement('a');
      link.href = '../../index.html';
      link.textContent = 'Back';
      cfg.outlet.querySelector('#spa-root')!.appendChild(link);
      link.click();
      // Should navigate to dashboard hash
      expect(window.location.hash).toBe('#/');
    });

    it('hides loading indicator after module loads', async () => {
      const mod = fakeModule();
      const cfg = makeConfig([
        { path: '/egzamin', loader: () => Promise.resolve(mod) },
      ]);
      destroy = initRouter(cfg);

      await navigateTo('/egzamin');
      expect(cfg.loadingEl.style.display).toBe('none');
    });
  });

  // ─── push ─────────────────────────────────────────────────────────
  describe('push', () => {
    it('sets window.location.hash', () => {
      const cfg = makeConfig();
      destroy = initRouter(cfg);

      push('/egzamin');
      expect(window.location.hash).toBe('#/egzamin');
    });
  });

  // ─── navigateToModule ─────────────────────────────────────────────
  describe('navigateToModule', () => {
    it('returns true and updates hash for known SPA module URLs', () => {
      const cfg = makeConfig([
        { path: '/egzamin', loader: () => Promise.resolve(fakeModule()) },
      ]);
      destroy = initRouter(cfg);

      const handled = navigateToModule('modules/egzamin/index.html');
      expect(handled).toBe(true);
      expect(window.location.hash).toBe('#/egzamin');
    });

    it('returns true for wachtownik module URL', () => {
      const cfg = makeConfig([
        { path: '/wachtownik', loader: () => Promise.resolve(fakeModule()) },
      ]);
      destroy = initRouter(cfg);

      const handled = navigateToModule('modules/wachtownik/index.html');
      expect(handled).toBe(true);
      expect(window.location.hash).toBe('#/wachtownik');
    });

    it('returns true for anchor module URL (now SPA-routable)', () => {
      const cfg = makeConfig([
        { path: '/anchor', loader: () => Promise.resolve(fakeModule()) },
      ]);
      destroy = initRouter(cfg);

      const handled = navigateToModule('modules/anchor/index.html');
      expect(handled).toBe(true);
      expect(window.location.hash).toBe('#/anchor');
    });

    it('returns true for zeglowanie module URL (now SPA-routable)', () => {
      const cfg = makeConfig([
        { path: '/zeglowanie', loader: () => Promise.resolve(fakeModule()) },
      ]);
      destroy = initRouter(cfg);

      const handled = navigateToModule('modules/zeglowanie/index.html');
      expect(handled).toBe(true);
      expect(window.location.hash).toBe('#/zeglowanie');
    });

    it('returns false when router is not initialized', () => {
      // Don't call initRouter
      const handled = navigateToModule('modules/egzamin/index.html');
      expect(handled).toBe(false);
    });
  });

  // ─── cleanup ──────────────────────────────────────────────────────
  describe('cleanup / destroy', () => {
    it('unmounts the active module on destroy', async () => {
      const mod = fakeModule();
      const cfg = makeConfig([
        { path: '/egzamin', loader: () => Promise.resolve(mod) },
      ]);
      destroy = initRouter(cfg);

      await navigateTo('/egzamin');
      expect(mod.mounted).toBe(true);

      destroy();
      destroy = undefined;
      expect(mod.mounted).toBe(false);
    });

    it('resets current path to "/" after destroy', async () => {
      const mod = fakeModule();
      const cfg = makeConfig([
        { path: '/egzamin', loader: () => Promise.resolve(mod) },
      ]);
      destroy = initRouter(cfg);

      await navigateTo('/egzamin');
      destroy();
      destroy = undefined;
      expect(getCurrentPath()).toBe('/');
    });
  });

  // ─── loading indicator ────────────────────────────────────────────
  describe('loading indicator', () => {
    it('shows loading while module is being imported', async () => {
      let resolveLoader!: (mod: ModuleMount) => void;
      const loaderPromise = new Promise<ModuleMount>((resolve) => {
        resolveLoader = resolve;
      });

      const cfg = makeConfig([
        { path: '/egzamin', loader: () => loaderPromise },
      ]);
      destroy = initRouter(cfg);

      // Start navigation (don't await yet)
      const navPromise = navigateTo('/egzamin');

      // Loading should be visible now
      await vi.waitFor(() => {
        expect(cfg.loadingEl.style.display).not.toBe('none');
      });

      // Resolve the import
      resolveLoader(fakeModule());
      await navPromise;

      // Loading should be hidden after load
      expect(cfg.loadingEl.style.display).toBe('none');
    });
  });
});
