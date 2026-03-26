import { test, expect } from './fixtures.js';
import { MODULES, STORAGE_KEYS } from './helpers.js';

/** Click an element and wait for navigation to complete. */
async function clickAndNavigate(
  page: import('@playwright/test').Page,
  selector: string,
  urlPattern: string,
  options?: { force?: boolean },
) {
  await Promise.all([
    page.waitForURL(urlPattern, { waitUntil: 'commit' }),
    page.locator(selector).click(options),
  ]);
  await page.waitForLoadState('domcontentloaded');
}

test.describe('Module Navigation Flow', () => {
  // Dismiss update/install banners that may overlay cards in full-suite runs
  const dismissBanners = async (page: import('@playwright/test').Page) => {
    // Wait for any SW-triggered navigation/reload to settle before manipulating DOM
    await page.waitForLoadState('load');
    await page.evaluate(() => {
      document.getElementById('updateBanner')?.remove();
      document.getElementById('installBanner')?.remove();
    });
  };

  test('dashboard → egzamin → dashboard', async ({ page }) => {
    await page.goto(MODULES.dashboard, { waitUntil: 'domcontentloaded' });
    await dismissBanners(page);
    await expect(page).toHaveTitle(/OpenAnchor/);

    // Navigate to Egzamin
    await clickAndNavigate(page, '.module-card.card-exam', '**/modules/egzamin/**');
    await expect(page).toHaveTitle(/Egzamin/);

    // Navigate back to dashboard
    await clickAndNavigate(page, 'a.oa-back-btn', '**/index.html');
    await expect(page).toHaveTitle(/OpenAnchor/);
  });

  test('dashboard → anchor (beta) → dashboard', async ({
    setLocalStorage,
  }) => {
    const page = await setLocalStorage(MODULES.dashboard, [
      { key: STORAGE_KEYS.betaMode, value: 'true' },
    ]);

    await expect(page.locator('#anchorModule')).toBeVisible();

    // Navigate to Anchor
    await clickAndNavigate(page, '#anchorModule', '**/modules/anchor/**');
    await expect(page).toHaveTitle(/Alert Kotwiczny/);

    // Dismiss any overlays (onboarding, warnings) blocking interaction
    await page.evaluate(() => {
      document.getElementById('onboarding-overlay')?.remove();
      document.getElementById('warning-modal')?.remove();
    });

    // Navigate back
    await clickAndNavigate(page, 'a.oa-back-btn', '**/index.html');
    await expect(page).toHaveTitle(/OpenAnchor/);
  });

  test('dashboard → wachtownik → dashboard', async ({ page }) => {
    await page.goto(MODULES.dashboard, { waitUntil: 'domcontentloaded' });
    await dismissBanners(page);

    await expect(page.locator('.module-card.card-watch')).toBeVisible();

    // Navigate to Wachtownik
    await clickAndNavigate(page, '.module-card.card-watch', '**/modules/wachtownik/**');
    await expect(page).toHaveTitle(/Wachtownik/);

    // Navigate back
    await clickAndNavigate(page, 'a.oa-back-btn', '**/index.html', { force: true });
    await expect(page).toHaveTitle(/OpenAnchor/);
  });
});

test.describe('localStorage Persistence Across Modules', () => {
  test('beta mode persists across dashboard → egzamin → dashboard', async ({
    setLocalStorage,
  }) => {
    const page = await setLocalStorage(MODULES.dashboard, [
      { key: STORAGE_KEYS.betaMode, value: 'true' },
    ]);

    // Beta modules should be visible
    await expect(page.locator('#anchorModule')).toBeVisible();

    // Navigate to Egzamin
    await clickAndNavigate(page, '.module-card.card-exam', '**/modules/egzamin/**');

    // Verify beta mode is still in localStorage
    const betaInEgzamin = await page.evaluate(
      (key) => localStorage.getItem(key),
      STORAGE_KEYS.betaMode,
    );
    expect(betaInEgzamin).toBe('true');

    // Navigate back to dashboard
    await clickAndNavigate(page, 'a.oa-back-btn', '**/index.html');

    // Beta modules should still be visible
    await expect(page.locator('#anchorModule')).toBeVisible();
  });
});

test.describe('Module Independence', () => {
  test('egzamin loads directly via URL', async ({ page }) => {
    await page.goto(MODULES.egzamin, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/Egzamin/);
    await expect(page.locator('a.oa-back-btn')).toBeVisible();
  });

  test('anchor loads directly via URL', async ({ page }) => {
    await page.goto(MODULES.anchor, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/Alert Kotwiczny/);
    await expect(page.locator('a.oa-back-btn')).toBeVisible();
  });

  test('wachtownik loads directly via URL', async ({ page }) => {
    await page.goto(MODULES.wachtownik, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/Wachtownik/);
    await expect(page.locator('a.oa-back-btn')).toBeVisible();
  });
});

test.describe('Egzamin State Persistence', () => {
  // Stub PDF storage/renderer so egzamin module skips ImportPdfScreen
  test.beforeEach(async ({ page }) => {
    await page.route('**/js/exam-pdf-storage.js', async route => {
      const response = await route.fetch();
      const body = await response.text();
      await route.fulfill({
        body: body + '\n; isPdfImported = async function() { return true; };',
        contentType: 'application/javascript',
      });
    });
    await page.route('**/js/pdf-renderer.js', async route => {
      await route.fulfill({
        body: 'var PdfRenderer = { async loadFromBlob() { return 1; }, isLoaded() { return true; }, async renderQuestion() { return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="; }, unload() {} };',
        contentType: 'application/javascript',
      });
    });
  });

  test('exam progress survives navigation to dashboard and back', async ({
    page,
  }) => {
    // Go to egzamin and set some progress in localStorage
    await page.goto(MODULES.egzamin, { waitUntil: 'domcontentloaded' });

    await page.evaluate((key) => {
      localStorage.setItem(key, '5');
    }, STORAGE_KEYS.learnPosition);

    // Navigate to dashboard
    await clickAndNavigate(page, 'a.oa-back-btn', '**/index.html');

    // Dismiss banners that may overlay cards
    await page.evaluate(() => {
      document.getElementById('updateBanner')?.remove();
      document.getElementById('installBanner')?.remove();
    });

    // Navigate back to egzamin
    await clickAndNavigate(page, '.module-card.card-exam', '**/modules/egzamin/**');

    // Verify progress persisted
    const position = await page.evaluate(
      (key) => localStorage.getItem(key),
      STORAGE_KEYS.learnPosition,
    );
    expect(position).toBe('5');
  });
});

test.describe('Responsive Layout', () => {
  test('dashboard renders at desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(MODULES.dashboard, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('.module-card.card-exam')).toBeVisible();
    await expect(page).toHaveTitle(/OpenAnchor/);
  });

  test('dashboard renders at mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(MODULES.dashboard, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('.module-card.card-exam')).toBeVisible();
    await expect(page).toHaveTitle(/OpenAnchor/);
  });

  test('module cards are visible and clickable at mobile size', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(MODULES.dashboard, { waitUntil: 'domcontentloaded' });

    const examCard = page.locator('.module-card.card-exam');
    await expect(examCard).toBeVisible();
    await page.waitForLoadState('networkidle');
    const width = await page.evaluate(() => {
      const el = document.querySelector('.module-card.card-exam');
      return el ? el.getBoundingClientRect().width : 0;
    });
    expect(width).toBeGreaterThan(0);
    expect(width).toBeLessThanOrEqual(390);
  });
});

test.describe('Back Navigation', () => {
  test('module pages have back button linking to dashboard', async ({
    page,
  }) => {
    await page.goto(MODULES.egzamin, { waitUntil: 'domcontentloaded' });

    const backBtn = page.locator('a.oa-back-btn');
    await expect(backBtn).toBeVisible();

    const href = await backBtn.getAttribute('href');
    expect(href).toContain('index.html');
  });

  test('browser back button returns from module to dashboard', async ({
    page,
  }) => {
    await page.goto(MODULES.dashboard, { waitUntil: 'domcontentloaded' });

    // Navigate to Egzamin via click
    await clickAndNavigate(page, '.module-card.card-exam', '**/modules/egzamin/**');
    await expect(page).toHaveTitle(/Egzamin/);

    // Use browser back
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/OpenAnchor/);
  });
});
