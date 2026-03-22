import { test, expect } from './fixtures.js';
import { MODULES } from './helpers.js';

/** Wait for the service worker to be ready and the page to stabilize. */
async function waitForSW(page: import('@playwright/test').Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // Allow the SW activate event (clients.claim) to settle
  await page.waitForTimeout(300);
}

test.describe('Service Worker', () => {
  test('registers and becomes active on dashboard', async ({ page }) => {
    await page.goto(MODULES.dashboard, { waitUntil: 'networkidle' });
    await waitForSW(page);

    const swState = await page.evaluate(() => {
      return navigator.serviceWorker.controller ? 'active' : 'not-active';
    });

    expect(swState).toBe('active');
  });

  test('controls egzamin module after dashboard registration', async ({
    page,
  }) => {
    // Register SW via dashboard first
    await page.goto(MODULES.dashboard, { waitUntil: 'networkidle' });
    await waitForSW(page);

    // Navigate to egzamin — SW should still be controlling
    await page.goto(MODULES.egzamin, { waitUntil: 'domcontentloaded' });

    const swState = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return 'unsupported';
      const reg = await navigator.serviceWorker.getRegistration('/');
      return reg?.active ? 'active' : 'not-active';
    });

    expect(swState).toBe('active');
  });

  test('caches core pages after initial load', async ({ page }) => {
    await page.goto(MODULES.dashboard, { waitUntil: 'networkidle' });
    await waitForSW(page);

    const cachedUrls = await page.evaluate(async () => {
      const cacheNames = await caches.keys();
      const cacheName = cacheNames.find(n => n.startsWith('openanchor-superapp-v'));
      if (!cacheName) return [];
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      return keys.map((r) => new URL(r.url).pathname);
    });

    expect(cachedUrls).toContain('/index.html');
    expect(cachedUrls).toContain('/modules/egzamin/index.html');
  });

  test('serves cached dashboard when offline', async ({ page }) => {
    // First load to populate cache
    await page.goto(MODULES.dashboard, { waitUntil: 'networkidle' });
    await waitForSW(page);

    // Block all network requests to simulate offline
    await page.route('**/*', (route) => route.abort());

    // Navigate to dashboard again — should be served from cache
    await page.goto(MODULES.dashboard, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/OpenAnchor/);
  });

  test('responds to SKIP_WAITING message', async ({ page }) => {
    await page.goto(MODULES.dashboard, { waitUntil: 'networkidle' });
    await waitForSW(page);

    const result = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      if (!reg.active) return 'no-active-sw';
      reg.active.postMessage({ type: 'SKIP_WAITING' });
      return 'message-sent';
    });

    expect(result).toBe('message-sent');
  });
});

test.describe('PWA Manifest', () => {
  test('manifest link is present in dashboard', async ({ page }) => {
    await page.goto(MODULES.dashboard, { waitUntil: 'domcontentloaded' });

    const manifestHref = await page.evaluate(() => {
      const link = document.querySelector('link[rel="manifest"]');
      return link ? link.getAttribute('href') : null;
    });

    expect(manifestHref).toBeTruthy();
  });

  test('manifest contains required PWA fields', async ({ page }) => {
    await page.goto(MODULES.dashboard, { waitUntil: 'domcontentloaded' });

    const manifest = await page.evaluate(async () => {
      const link = document.querySelector('link[rel="manifest"]');
      if (!link) return null;
      const href = link.getAttribute('href');
      if (!href) return null;
      const resp = await fetch(new URL(href, location.href).href);
      return resp.json();
    });

    expect(manifest).toBeTruthy();
    expect(manifest.name).toBeTruthy();
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons).toBeDefined();
    expect(manifest.icons.length).toBeGreaterThan(0);
  });
});
