/**
 * Service Worker utilities and update management
 *
 * Migrated from js/sw-utils.js
 */

export const APP_CACHE_PREFIX = 'openanchor-';

export function isServiceWorkerSupported(): boolean {
  return 'serviceWorker' in navigator;
}

export async function clearAppCaches(): Promise<void> {
  if (!('caches' in window)) {
    return;
  }

  const cacheNames = await caches.keys();
  const appCacheNames = cacheNames.filter(name => name.startsWith(APP_CACHE_PREFIX));
  await Promise.all(appCacheNames.map(name => caches.delete(name)));
}

export async function forceUpdate(btn: HTMLElement | null): Promise<void> {
  if (!btn) return;

  btn.setAttribute('disabled', 'true');
  btn.classList.add('updating');
  const originalText = btn.innerHTML;

  const updateButtonText = (text: string): void => {
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
          <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
          <path d="M21 3v5h-5"/>
      </svg>
      ${text}
    `;
  };

  if (!isServiceWorkerSupported()) {
    window.location.reload();
    return;
  }

  try {
    updateButtonText('Sprawdzam...');
    const registration = await navigator.serviceWorker.getRegistration();

    if (!registration) {
      window.location.reload();
      return;
    }

    if (registration.waiting) {
      updateButtonText('Instaluję...');
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      return;
    }

    await registration.update();

    const hasUpdate = await waitForServiceWorkerUpdate(registration);

    if (hasUpdate && registration.waiting) {
      updateButtonText('Instaluję...');
      (registration.waiting as ServiceWorker).postMessage({ type: 'SKIP_WAITING' });
    } else {
      updateButtonText('Czyszczę cache...');
      await clearAppCaches();
      window.location.reload();
    }
  } catch (error) {
    console.error('Force update error:', error);
    btn.innerHTML = originalText;
    btn.removeAttribute('disabled');
    btn.classList.remove('updating');
    throw error;
  }
}

export function waitForServiceWorkerUpdate(registration: ServiceWorkerRegistration, timeout: number = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => resolve(false), timeout);

    const checkUpdate = (): void => {
      if (registration.waiting) {
        clearTimeout(timeoutId);
        resolve(true);
      } else if (registration.installing) {
        registration.installing.addEventListener('statechange', function onStateChange(e: Event) {
          if ((e.target as ServiceWorker).state === 'installed') {
            (e.target as ServiceWorker).removeEventListener('statechange', onStateChange);
            clearTimeout(timeoutId);
            resolve(true);
          }
        });
      } else {
        clearTimeout(timeoutId);
        resolve(false);
      }
    };

    checkUpdate();
    registration.addEventListener('updatefound', checkUpdate, { once: true });
  });
}

export function showUpdateBanner(banner: HTMLElement | null): void {
  if (banner) {
    banner.classList.add('show');
  }
}

export function hideUpdateBanner(banner: HTMLElement | null): void {
  if (banner) {
    banner.classList.remove('show');
  }
}

export function handleUpdateClick(newWorker: ServiceWorker | null): void {
  if (newWorker) {
    newWorker.postMessage({ type: 'SKIP_WAITING' });
  } else {
    window.location.reload();
  }
}
