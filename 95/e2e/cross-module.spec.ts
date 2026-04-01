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

/**
 * Navigate to a URL and wait for any service-worker-triggered reload to settle.
 * The dashboard's SW calls clients.claim() on activate, which fires controllerchange
 * and triggers window.location.reload(). We must wait for this to complete.
 */
async function safeGoto(
  page: import('@playwright/test').Page,
  url: string,
) {
  await page.goto(url, { waitUntil: 'load' });
  // Give the SW controllerchange → reload cycle a chance to fire
  try {
    await page.waitForNavigation({ timeout: 2000 });
    // A reload happened — wait for the new page to fully load
    await page.waitForLoadState('load');
  } catch {
    // No navigation happened within 2s — page is stable
  }
}

test.describe('Module Navigation Flow', () => {
  const dismissBanners = async (page: import('@playwright/test').Page) => {
    await page.evaluate(() => {
      document.getElementById('updateBanner')?.remove();
      document.getElementById('installBanner')?.remove();
    });
  };

  test('dashboard → egzamin → dashboard', async ({ page }) => {
    await safeGoto(page, MODULES.dashboard);
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
    await safeGoto(page, MODULES.dashboard);
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
  // Stub PDF-related functions in the egzamin bundle
  test.beforeEach(async ({ page }) => {
    await page.route('**/sw.js', route => route.abort());
    await page.route('**/assets/egzamin-*.js', async route => {
      const response = await route.fetch();
      let body = await response.text();

      const first = body.indexOf('.loadFromBlob(');
      const second = first !== -1 ? body.indexOf('.loadFromBlob(', first + 1) : -1;
      if (second !== -1) {
        const searchStart = body.lastIndexOf('if(await ', second);
        let depth = 0, blockEnd = searchStart;
        for (let i = searchStart; i < body.length; i++) {
          if (body[i] === '{') depth++;
          if (body[i] === '}') { depth--; if (depth === 0) { blockEnd = i + 1; break; } }
        }
        const block = body.substring(searchStart, blockEnd);
        const rvArr = block.match(/await (\w+)\.loadFromBlob/);
        const svArr = block.match(/,(\w+)\(!0\)/);
        if (rvArr && svArr) {
          const rv = rvArr[1];
          const sv = svArr[1];
          const stub = `${rv}._pdfDoc={numPages:200,getPage:async()=>({getViewport:()=>({width:100,height:100}),render:()=>({promise:Promise.resolve()})})};${rv}._cache=new Map();${sv}(!0)`;
          body = body.substring(0, searchStart) + stub + body.substring(blockEnd);
        }
      }

      const rqStart = body.indexOf('renderQuestion(e,t,n,r,i){');
      if (rqStart !== -1) {
        const bodyStart = body.indexOf('{', rqStart);
        let depth = 0, bodyEnd = bodyStart;
        for (let i = bodyStart; i < body.length; i++) {
          if (body[i] === '{') depth++;
          if (body[i] === '}') { depth--; if (depth === 0) { bodyEnd = i + 1; break; } }
        }
        body = body.substring(0, bodyStart) + `{return'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='}` + body.substring(bodyEnd);
      }

      await route.fulfill({ body, contentType: 'application/javascript' });
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
    await safeGoto(page, MODULES.dashboard);

    await expect(page.locator('.module-card.card-exam')).toBeVisible();
    await expect(page).toHaveTitle(/OpenAnchor/);
  });

  test('dashboard renders at mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await safeGoto(page, MODULES.dashboard);

    await expect(page.locator('.module-card.card-exam')).toBeVisible();
    await expect(page).toHaveTitle(/OpenAnchor/);
  });

  test('module cards are visible and clickable at mobile size', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await safeGoto(page, MODULES.dashboard);

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
    await safeGoto(page, MODULES.dashboard);

    // Navigate to Egzamin via click
    await clickAndNavigate(page, '.module-card.card-exam', '**/modules/egzamin/**');
    await expect(page).toHaveTitle(/Egzamin/);

    // Use browser back
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/OpenAnchor/);
  });
});
