import type { BrowserContext, Page } from '@playwright/test';
import { test, expect } from './fixtures.js';
import { MODULES } from './helpers.js';

const START = { latitude: 54.5189, longitude: 18.5305, accuracy: 4 };

async function gotoAnchor(page: Page, context: BrowserContext) {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation(START);
  await page.goto(MODULES.anchor, { waitUntil: 'commit' });
  await page.evaluate(() => localStorage.setItem('anchor_onboarding_done', 'true'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#main-btn')).toBeEnabled({ timeout: 10_000 });
}

test.describe('Anchor — persisted session lifecycle', () => {
  test('buffer-zone session persists, restores, replays, exports, and deletes', async ({
    page,
    context,
  }) => {
    test.slow();
    await gotoAnchor(page, context);
    await page.locator('#radius-number').fill('20');
    await page.locator('#main-btn').click();

    await context.setGeolocation({ ...START, latitude: START.latitude + 0.00021 });
    await expect(page.locator('#alarm-state-bar')).toContainText(/uwaga|caution/i);

    // Active state is restored from IndexedDB after a full application reload.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#main-btn-text')).toHaveText(/Podnieś Kotwicę|Raise Anchor/i, {
      timeout: 10_000,
    });

    await context.setGeolocation({ ...START, latitude: START.latitude + 0.00005 });
    await page.locator('#main-btn').click();
    await expect(page.locator('#main-btn-text')).toHaveText(/Rzuć Kotwicę|Drop Anchor/i);

    await page.locator('#open-history-btn').click();
    const history = page.locator('#history-modal');
    await expect(history).toBeVisible();
    await expect(history.getByTestId('session-history-item').first()).toBeVisible();
    await history.getByTestId('session-history-item').first().click();
    await expect(page.locator('#replay-export-btn')).toBeVisible({ timeout: 15_000 });

    const gpxDownload = page.waitForEvent('download');
    await page.locator('#replay-export-btn').click();
    await expect((await gpxDownload).suggestedFilename()).toMatch(/anchor-session-\d+\.gpx/);

    const csvDownload = page.waitForEvent('download');
    await history.getByRole('button', { name: /CSV/ }).click();
    await expect((await csvDownload).suggestedFilename()).toMatch(/anchor-session-\d+\.csv/);

    await history.getByRole('button', { name: /Usuń|Delete/ }).click();
    await expect(history).toContainText(/Brak zapisanych sesji|No saved sessions/);
  });
});
