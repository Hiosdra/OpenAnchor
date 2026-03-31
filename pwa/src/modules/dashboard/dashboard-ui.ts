/**
 * Dashboard UI - Theme, PWA install, service worker updates, force update.
 *
 * Extracted from index.html inline script.
 */

import {
  initBetaMode,
  toggleBetaMode,
  openSettings,
  closeSettings,
  closeSettingsOnBackdrop,
  openModule,
} from './index';

const REFRESH_SVG = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
       stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
      <path d="M21 3v5h-5"/>
  </svg>`;

// --------------- Theme ---------------

function setTheme(theme: string): void {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('openanchor-theme', theme);
  updateThemeButtons();
}

function updateThemeButtons(): void {
  const current = document.documentElement.dataset.theme || 'dark';
  document.querySelectorAll<HTMLElement>('.theme-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.themeValue === current);
  });
}

// --------------- Force update ---------------

async function forceUpdate(): Promise<void> {
  const btn = document.getElementById('forceUpdateBtn') as HTMLButtonElement | null;
  if (!btn) return;

  btn.disabled = true;
  btn.classList.add('updating');
  const originalText = btn.innerHTML;
  btn.innerHTML = `${REFRESH_SVG} Sprawdzam...`;

  if (!('serviceWorker' in navigator)) {
    window.location.reload();
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();

    if (!registration) {
      window.location.reload();
      return;
    }

    if (registration.waiting) {
      btn.innerHTML = `${REFRESH_SVG} Instaluję...`;
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      return;
    }

    await registration.update();

    const hasUpdate = await new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => resolve(false), 5000);

      const checkUpdate = () => {
        if (registration.waiting) {
          clearTimeout(timeout);
          resolve(true);
        } else if (registration.installing) {
          registration.installing.addEventListener('statechange', function onStateChange(e) {
            if ((e.target as ServiceWorker).state === 'installed') {
              (e.target as ServiceWorker).removeEventListener('statechange', onStateChange);
              clearTimeout(timeout);
              resolve(true);
            }
          });
        } else {
          clearTimeout(timeout);
          resolve(false);
        }
      };

      checkUpdate();
      registration.addEventListener('updatefound', checkUpdate, { once: true });
    });

    if (hasUpdate && registration.waiting) {
      btn.innerHTML = `${REFRESH_SVG} Instaluję...`;
      (registration.waiting as ServiceWorker).postMessage({ type: 'SKIP_WAITING' });
    } else {
      btn.innerHTML = `${REFRESH_SVG} Czyszczę cache...`;
      const APP_CACHE_PREFIX = 'openanchor-';
      const cacheNames = await caches.keys();
      const appCacheNames = cacheNames.filter((name) => name.startsWith(APP_CACHE_PREFIX));
      await Promise.all(appCacheNames.map((name) => caches.delete(name)));
      window.location.reload();
    }
  } catch (error) {
    console.error('Force update error:', error);
    btn.innerHTML = originalText;
    btn.disabled = false;
    btn.classList.remove('updating');
    alert('Wystąpił błąd podczas aktualizacji. Spróbuj ponownie.');
  }
}

// --------------- PWA Install prompt ---------------

function initInstallBanner(): void {
  let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
  const installBanner = document.getElementById('installBanner');
  const installBtn = document.getElementById('installBtn');
  const installDismissBtn = document.getElementById('installDismissBtn');

  window.addEventListener('beforeinstallprompt', ((e: BeforeInstallPromptEvent) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (!sessionStorage.getItem('installDismissed')) {
      installBanner?.classList.add('show');
    }
  }) as EventListener);

  installBtn?.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    installBanner?.classList.remove('show');
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    console.log('Install prompt outcome:', outcome);
    deferredInstallPrompt = null;
  });

  installDismissBtn?.addEventListener('click', () => {
    installBanner?.classList.remove('show');
    sessionStorage.setItem('installDismissed', 'true');
  });

  window.addEventListener('appinstalled', () => {
    installBanner?.classList.remove('show');
    deferredInstallPrompt = null;
    console.log('PWA installed');
  });
}

// --------------- Service worker registration & update banner ---------------

function initServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;

  let newWorker: ServiceWorker | null = null;
  const updateBanner = document.getElementById('updateBanner');
  const updateBtn = document.getElementById('updateBtn');
  const dismissBtn = document.getElementById('dismissBtn');
  let refreshing = false;

  const showUpdateBanner = () => updateBanner?.classList.add('show');
  const hideUpdateBanner = () => updateBanner?.classList.remove('show');

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });

  updateBtn?.addEventListener('click', () => {
    if (newWorker) {
      newWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  });

  dismissBtn?.addEventListener('click', () => hideUpdateBanner());

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then((registration) => {
        setInterval(() => registration.update(), 300_000);

        if (registration.waiting) {
          newWorker = registration.waiting;
          showUpdateBanner();
        }

        registration.addEventListener('updatefound', () => {
          newWorker = registration.installing;
          newWorker?.addEventListener('statechange', () => {
            if (newWorker?.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateBanner();
            }
          });
        });
      })
      .catch(() => {});
  });
}

// --------------- Keyboard a11y for module cards ---------------

function initCardKeyboard(): void {
  document.querySelectorAll<HTMLElement>('.module-card').forEach((card) => {
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });
}

// --------------- Expose globals for onclick handlers & init ---------------

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export function initDashboard(): void {
  // Expose to window for HTML onclick handlers
  Object.assign(window, {
    toggleBetaMode,
    openSettings,
    closeSettings,
    closeSettingsOnBackdrop,
    openModule,
    setTheme,
    forceUpdate,
  });

  window.addEventListener('load', () => {
    initBetaMode();
    updateThemeButtons();
  });

  initInstallBanner();
  initServiceWorker();
  initCardKeyboard();
}
