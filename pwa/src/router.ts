/**
 * Lightweight hash-based SPA router for the OpenAnchor dashboard.
 *
 * React modules (egzamin, wachtownik) are loaded as SPA via dynamic imports.
 * Vanilla-TS modules (anchor, zeglowanie) still use full-page navigation.
 */

export interface ModuleMount {
  mount(container: HTMLElement): void;
  unmount(): void;
}

export interface RouteDefinition {
  path: string;
  loader: () => Promise<ModuleMount>;
}

export interface RouterConfig {
  outlet: HTMLElement;
  dashboardEl: HTMLElement;
  loadingEl: HTMLElement;
  routes: RouteDefinition[];
}

// MPA URLs that the router can intercept and serve as SPA
const MODULE_URL_TO_ROUTE: Record<string, string> = {
  'modules/egzamin/index.html': '/egzamin',
  'modules/wachtownik/index.html': '/wachtownik',
};

let _config: RouterConfig | null = null;
let _currentCleanup: (() => void) | null = null;
let _currentPath = '/';

export function getHashPath(): string {
  const hash = window.location.hash;
  if (!hash || hash === '#' || hash === '#/') return '/';
  return hash.startsWith('#/') ? hash.slice(1) : '/' + hash.slice(1);
}

export function getCurrentPath(): string {
  return _currentPath;
}

function showLoading(): void {
  if (_config) _config.loadingEl.style.display = '';
}

function hideLoading(): void {
  if (_config) _config.loadingEl.style.display = 'none';
}

function showDashboard(): void {
  if (!_config) return;
  _config.dashboardEl.style.display = '';
  _config.outlet.style.display = 'none';
  _config.outlet.innerHTML = '';
  hideLoading();
}

function showOutlet(): void {
  if (!_config) return;
  _config.dashboardEl.style.display = 'none';
  _config.outlet.style.display = '';
}

export async function navigateTo(path: string): Promise<void> {
  if (!_config) return;
  if (path === _currentPath) return;

  // Tear down the current module
  if (_currentCleanup) {
    _currentCleanup();
    _currentCleanup = null;
  }

  _currentPath = path;

  // Dashboard route
  if (path === '/') {
    showDashboard();
    return;
  }

  // Look up a matching SPA route
  const route = _config.routes.find((r) => r.path === path);
  if (!route) {
    // Unknown route – fall back to dashboard
    showDashboard();
    _currentPath = '/';
    return;
  }

  showLoading();
  showOutlet();

  try {
    const mod = await route.loader();

    // Guard: user may have navigated away while the chunk was loading
    if (_currentPath !== path) return;

    hideLoading();

    // Build a minimal wrapper with the background and a back button
    _config.outlet.innerHTML = '';

    const backBtn = document.createElement('button');
    backBtn.id = 'router-back-btn';
    backBtn.className = 'router-back-btn';
    backBtn.setAttribute('aria-label', 'Powrót do ekranu głównego');
    backBtn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" ' +
      'stroke-linecap="round" stroke-linejoin="round" width="18" height="18">' +
      '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>' +
      ' Powrót';
    backBtn.addEventListener('click', () => push('/'));
    _config.outlet.appendChild(backBtn);

    const spaRoot = document.createElement('div');
    spaRoot.id = 'spa-root';
    _config.outlet.appendChild(spaRoot);

    mod.mount(spaRoot);
    _currentCleanup = () => mod.unmount();
  } catch (error) {
    console.error(`[Router] Failed to load module for ${path}:`, error);
    hideLoading();
    showDashboard();
    _currentPath = '/';
  }
}

/**
 * Push a route path (e.g. `/egzamin`). Updates the hash which triggers navigation.
 */
export function push(path: string): void {
  window.location.hash = '#' + path;
}

/**
 * Attempt to handle a legacy MPA module URL via the SPA router.
 * Returns `true` if the URL was handled, `false` if it should fall through
 * to a full-page navigation.
 */
export function navigateToModule(url: string): boolean {
  const route = MODULE_URL_TO_ROUTE[url];
  if (route && _config) {
    push(route);
    return true;
  }
  return false;
}

function onHashChange(): void {
  navigateTo(getHashPath());
}

/**
 * Initialise the router. Returns a teardown function.
 */
export function initRouter(cfg: RouterConfig): () => void {
  _config = cfg;
  _currentPath = '/';
  _currentCleanup = null;
  hideLoading();

  window.addEventListener('hashchange', onHashChange);

  // If the page was opened with a hash already set, navigate immediately
  const initial = getHashPath();
  if (initial !== '/') {
    navigateTo(initial);
  }

  return () => {
    window.removeEventListener('hashchange', onHashChange);
    if (_currentCleanup) {
      _currentCleanup();
      _currentCleanup = null;
    }
    _currentPath = '/';
    _config = null;
  };
}
