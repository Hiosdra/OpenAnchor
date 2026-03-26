import { test, expect } from './fixtures.js';
import { MODULES, STORAGE_KEYS } from './helpers.js';

// The service worker may trigger a page reload on first visit (controllerchange).
// Use networkidle to wait for the page to fully stabilize before interacting.
const GOTO_OPTS = { waitUntil: 'networkidle' as const };

test.describe('Page Load & Basic Display', () => {
  test('page loads with correct title', async ({ page }) => {
    await page.goto(MODULES.dashboard, GOTO_OPTS);
    await expect(page).toHaveTitle(/OpenAnchor/);
  });

  test('egzamin module card is visible by default', async ({ page }) => {
    await page.goto(MODULES.dashboard, GOTO_OPTS);
    await expect(page.locator('.module-card.card-exam')).toBeVisible();
  });

  test('anchor module card is hidden by default', async ({ page }) => {
    await page.goto(MODULES.dashboard, GOTO_OPTS);
    const anchorCard = page.locator('#anchorModule');
    await expect(anchorCard).toHaveClass(/module-hidden/);
    await expect(anchorCard).not.toBeVisible();
  });

  test('wachtownik module card is visible by default', async ({ page }) => {
    await page.goto(MODULES.dashboard, GOTO_OPTS);
    await expect(page.locator('.module-card.card-watch')).toBeVisible();
  });

  test('settings button is visible', async ({ page }) => {
    await page.goto(MODULES.dashboard, GOTO_OPTS);
    await expect(page.locator('.settings-btn')).toBeVisible();
  });
});

test.describe('Beta Mode Toggle', () => {
  test('enabling beta mode shows anchor card', async ({ page }) => {
    await page.goto(MODULES.dashboard, GOTO_OPTS);
    await page.locator('.settings-btn').click();
    await expect(page.locator('#settingsModal')).toHaveClass(/show/);
    await page.locator('#betaToggle').evaluate((el: HTMLInputElement) => el.click());

    await expect(page.locator('#anchorModule')).toBeVisible();
  });

  test('disabling beta mode hides anchor card', async ({ setLocalStorage }) => {
    const page = await setLocalStorage(MODULES.dashboard, [
      { key: STORAGE_KEYS.betaMode, value: 'true' },
    ]);

    await expect(page.locator('#anchorModule')).toBeVisible();

    await page.locator('.settings-btn').click();
    await expect(page.locator('#settingsModal')).toHaveClass(/show/);
    await page.locator('#betaToggle').evaluate((el: HTMLInputElement) => el.click());

    await expect(page.locator('#anchorModule')).not.toBeVisible();
  });

  test('beta mode persists across page reload', async ({ setLocalStorage }) => {
    const page = await setLocalStorage(MODULES.dashboard, [
      { key: STORAGE_KEYS.betaMode, value: 'true' },
    ]);

    await expect(page.locator('#anchorModule')).toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#anchorModule')).toBeVisible();
  });

  test('beta mode is disabled by default on fresh load', async ({ page }) => {
    await page.goto(MODULES.dashboard, GOTO_OPTS);
    await page.locator('.settings-btn').click();
    await expect(page.locator('#settingsModal')).toHaveClass(/show/);
    await expect(page.locator('#betaToggle')).not.toBeChecked();
  });
});

test.describe('Settings Modal', () => {
  test('settings modal opens when settings button is clicked', async ({ page }) => {
    await page.goto(MODULES.dashboard, GOTO_OPTS);
    await expect(page.locator('#settingsModal')).not.toHaveClass(/show/);
    await page.locator('.settings-btn').click();
    await expect(page.locator('#settingsModal')).toHaveClass(/show/);
  });

  test('settings modal closes via close button', async ({ page }) => {
    await page.goto(MODULES.dashboard, GOTO_OPTS);
    await page.locator('.settings-btn').click();
    await expect(page.locator('#settingsModal')).toHaveClass(/show/);
    await page.locator('.settings-close').click();
    await expect(page.locator('#settingsModal')).not.toHaveClass(/show/);
  });

  test('beta toggle checkbox reflects localStorage value', async ({ setLocalStorage }) => {
    const page = await setLocalStorage(MODULES.dashboard, [
      { key: STORAGE_KEYS.betaMode, value: 'true' },
    ]);
    await page.locator('.settings-btn').click();
    await expect(page.locator('#settingsModal')).toHaveClass(/show/);
    await expect(page.locator('#betaToggle')).toBeChecked();
  });

  test('force update button is present in settings', async ({ page }) => {
    await page.goto(MODULES.dashboard, GOTO_OPTS);
    await page.locator('.settings-btn').click();
    await expect(page.locator('#settingsModal')).toHaveClass(/show/);
    const btn = page.locator('#forceUpdateBtn');
    await expect(btn).toBeVisible();
    await expect(btn).toHaveClass(/force-update-btn/);
  });
});

test.describe('Module Navigation', () => {
  test('clicking egzamin card navigates to egzamin module', async ({ page }) => {
    await page.goto(MODULES.dashboard, GOTO_OPTS);
    await page.locator('.module-card.card-exam').click();
    await expect(page).toHaveURL(/modules\/egzamin/);
  });

  test('clicking anchor card navigates to anchor module', async ({ setLocalStorage }) => {
    const page = await setLocalStorage(MODULES.dashboard, [
      { key: STORAGE_KEYS.betaMode, value: 'true' },
    ]);
    await page.locator('#anchorModule').click();
    await expect(page).toHaveURL(/modules\/anchor/);
  });

  test('clicking wachtownik card navigates to wachtownik module', async ({ page }) => {
    await page.goto(MODULES.dashboard, GOTO_OPTS);
    await page.locator('.module-card.card-watch').click();
    await expect(page).toHaveURL(/modules\/wachtownik/);
  });
});

test.describe('Accessibility', () => {
  test('module cards have role="button"', async ({ setLocalStorage }) => {
    const page = await setLocalStorage(MODULES.dashboard, [
      { key: STORAGE_KEYS.betaMode, value: 'true' },
    ]);
    await expect(page.locator('#anchorModule')).toHaveAttribute('role', 'button');
    await expect(page.locator('.module-card.card-watch')).toHaveAttribute('role', 'button');
    await expect(page.locator('.module-card.card-exam')).toHaveAttribute('role', 'button');
  });

  test('module cards are keyboard accessible', async ({ setLocalStorage }) => {
    const page = await setLocalStorage(MODULES.dashboard, [
      { key: STORAGE_KEYS.betaMode, value: 'true' },
    ]);
    await expect(page.locator('#anchorModule')).toHaveAttribute('tabindex', '0');
    await expect(page.locator('.module-card.card-watch')).toHaveAttribute('tabindex', '0');
    await expect(page.locator('.module-card.card-exam')).toHaveAttribute('tabindex', '0');
  });

  test('settings modal has proper structure', async ({ page }) => {
    await page.goto(MODULES.dashboard, GOTO_OPTS);
    await page.locator('.settings-btn').click();
    await expect(page.locator('#settingsModal')).toHaveClass(/show/);

    const modal = page.locator('#settingsModal');
    await expect(modal.locator('.settings-panel')).toBeVisible();
    await expect(modal.locator('.settings-title')).toHaveText('Ustawienia');
    await expect(modal.locator('.settings-close')).toHaveAttribute('aria-label', 'Zamknij');
  });
});
