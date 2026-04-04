/** Lightweight hash-based SPA router for the OpenAnchor dashboard. */

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

function showLoading(): void { if (_config) _config.loadingEl.style.display = ''; }
function hideLoading(): void { if (_config) _config.loadingEl.style.display = 'none'; }

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

  if (_currentCleanup) { _currentCleanup(); _currentCleanup = null; }
  _currentPath = path;

  if (path === '/') { showDashboard(); return; }

  const route = _config.routes.find((r) => r.path === path);
  if (!route) { showDashboard(); _currentPath = '/'; return; }

  showLoading();
  showOutlet();

  try {
    const mod = await route.loader();
    if (_currentPath !== path) return;
    hideLoading();

    _config.outlet.innerHTML = '';
    const backBtn = Object.assign(document.createElement('button'), {
      id: 'router-back-btn', className: 'router-back-btn',
      innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg> Powrót',
    });
    backBtn.setAttribute('aria-label', 'Powrót do ekranu głównego');
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

/** Push a route path (e.g. `/egzamin`). Updates the hash which triggers navigation. */
export function push(path: string): void {
  window.location.hash = '#' + path;
}

/** Handle a legacy MPA module URL via the SPA router. Returns true if handled. */
export function navigateToModule(url: string): boolean {
  const route = MODULE_URL_TO_ROUTE[url];
  if (route && _config) { push(route); return true; }
  return false;
}

function onHashChange(): void {
  navigateTo(getHashPath());
}

/** Initialise the router. Returns a teardown function. */
export function initRouter(cfg: RouterConfig): () => void {
  _config = cfg;
  _currentPath = '/';
  _currentCleanup = null;
  hideLoading();

  window.addEventListener('hashchange', onHashChange);

  const initial = getHashPath();
  if (initial !== '/') navigateTo(initial);

  return () => {
    window.removeEventListener('hashchange', onHashChange);
    if (_currentCleanup) { _currentCleanup(); _currentCleanup = null; }
    _currentPath = '/';
    _config = null;
  };
}
