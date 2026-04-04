/**
 * Dashboard module - Beta mode management and settings
 *
 * Migrated from js/dashboard.js
 */

export const BETA_MODE_KEY = 'oa_beta_mode';

export function isBetaModeEnabled(): boolean {
  return localStorage.getItem(BETA_MODE_KEY) === 'true';
}

export function setBetaMode(enabled: boolean): void {
  localStorage.setItem(BETA_MODE_KEY, enabled.toString());
}

export function initBetaMode(): void {
  const isBetaEnabled = isBetaModeEnabled();
  const betaToggle = document.getElementById('betaToggle') as HTMLInputElement | null;
  const anchorModule = document.getElementById('anchorModule');

  if (betaToggle) {
    betaToggle.checked = isBetaEnabled;
  }

  if (isBetaEnabled) {
    if (anchorModule) anchorModule.classList.remove('module-hidden');
  }
}

export function toggleBetaMode(): void {
  const betaToggle = document.getElementById('betaToggle') as HTMLInputElement | null;
  const isBetaEnabled = betaToggle?.checked ?? false;
  const anchorModule = document.getElementById('anchorModule');

  setBetaMode(isBetaEnabled);

  if (isBetaEnabled) {
    if (anchorModule) anchorModule.classList.remove('module-hidden');
  } else {
    if (anchorModule) anchorModule.classList.add('module-hidden');
  }
}

export function openSettings(): void {
  const modal = document.getElementById('settingsModal');
  if (modal) {
    modal.classList.add('show');
  }
}

export function closeSettings(): void {
  const modal = document.getElementById('settingsModal');
  if (modal) {
    modal.classList.remove('show');
  }
}

export function closeSettingsOnBackdrop(event: MouseEvent): void {
  if ((event.target as HTMLElement).id === 'settingsModal') {
    closeSettings();
  }
}

export function openModule(url: string): void {
  const match = url.match(/modules\/([^/]+)\//);
  if (match && navigator.serviceWorker && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_MODULE',
      module: match[1]
    });
  }

  // Try SPA navigation first; fall back to full-page load
  const { navigateToModule } = await_router_ref;
  if (navigateToModule && navigateToModule(url)) return;

  window.location.href = url;
}

/**
 * Lazy reference to the router so the dashboard module doesn't
 * have a hard import-time dependency on the router.
 */
export const await_router_ref: {
  navigateToModule: ((url: string) => boolean) | null;
} = { navigateToModule: null };
