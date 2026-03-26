import { test, expect } from './fixtures.js';
import { MODULES, STORAGE_KEYS } from './helpers.js';

test.describe('Dashboard smoke tests', () => {
  test('has correct title', async ({ page }) => {
    await page.goto(MODULES.dashboard);
    await expect(page).toHaveTitle(/OpenAnchor/);
  });

  test('displays egzamin card (always visible)', async ({ page }) => {
    await page.goto(MODULES.dashboard);
    const examCard = page.locator('.module-card.card-exam');
    await expect(examCard).toBeVisible();
  });

  test('shows beta modules when beta mode enabled', async ({ setLocalStorage }) => {
    const page = await setLocalStorage(MODULES.dashboard, [
      { key: STORAGE_KEYS.betaMode, value: 'true' },
    ]);
    const anchorCard = page.locator('#anchorModule');
    await expect(anchorCard).toBeVisible();
    await expect(anchorCard).toHaveAttribute('role', 'button');
  });
});
