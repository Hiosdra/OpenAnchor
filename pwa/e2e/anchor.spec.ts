import { test, expect } from './fixtures.js';
import { MODULES, STORAGE_KEYS, ANCHOR_STRINGS } from './helpers.js';
import type { Page } from '@playwright/test';

const ANCHOR_URL = MODULES.anchor;

/**
 * Navigate to anchor page with onboarding already dismissed.
 * Uses goto→setItem→reload pattern so localStorage is set before app init.
 */
async function gotoAnchor(page: Page) {
  await page.goto(ANCHOR_URL, { waitUntil: 'commit' });
  await page.evaluate(() => localStorage.setItem('anchor_onboarding_done', 'true'));
  await page.reload({ waitUntil: 'domcontentloaded' });
}

// ---------------------------------------------------------------------------
// 1. Page Load & Initial State (no GPS mock — tests read-only UI state)
// ---------------------------------------------------------------------------
test.describe('Anchor — Page Load & Initial State', () => {
  test('page loads with app body', async ({ page }) => {
    await gotoAnchor(page);
    await expect(page.locator('#app-body')).toBeVisible();
  });

  test('map container is present', async ({ page }) => {
    await gotoAnchor(page);
    await expect(page.locator('#map')).toBeVisible();
  });

  test('main button shows "Rzuć Kotwicę"', async ({ page }) => {
    await gotoAnchor(page);
    await expect(page.locator('#main-btn-text')).toHaveText(ANCHOR_STRINGS.dropAnchor);
  });

  test('main button is initially disabled', async ({ page }) => {
    await gotoAnchor(page);
    await expect(page.locator('#main-btn')).toBeDisabled();
  });

  test('GPS status shows searching state', async ({ page }) => {
    await gotoAnchor(page);
    await expect(page.locator('#gps-status-text')).toHaveText(ANCHOR_STRINGS.searching);
  });

  test('alarm bar is hidden initially', async ({ page }) => {
    await gotoAnchor(page);
    await expect(page.locator('#alarm-state-bar')).toBeHidden();
  });

  test('tool buttons grid is visible', async ({ page }) => {
    await gotoAnchor(page);
    const toolGrid = page.locator('.grid.grid-cols-4.max-w-md');
    await expect(toolGrid).toBeVisible();

    await expect(page.locator('button[data-modal="calc-modal"]')).toBeVisible();
    await expect(page.locator('button[data-modal="sector-modal"]')).toBeVisible();
    await expect(page.locator('button[data-modal="watch-setup-modal"]')).toBeVisible();
    await expect(page.locator('#open-weather-btn')).toBeVisible();
    await expect(page.locator('#simple-monitor-btn')).toBeVisible();
    await expect(page.locator('button[data-modal="ws-sync-modal"]')).toBeVisible();
    await expect(page.locator('#open-history-btn')).toBeVisible();
    await expect(page.locator('#open-ai-btn')).toBeVisible();
    await expect(page.locator('#share-pos-btn')).toBeVisible();
    await expect(page.locator('#open-qr-scan-btn')).toBeVisible();
  });

  test('no signal overlay is visible without GPS', async ({ page }) => {
    await gotoAnchor(page);
    await expect(page.locator('#no-signal-overlay')).toBeVisible();
  });

  test('status indicators show default placeholders', async ({ page }) => {
    await gotoAnchor(page);
    await expect(page.locator('#val-dist')).toHaveText('--');
    await expect(page.locator('#val-cog')).toHaveText('---');
    await expect(page.locator('#val-acc')).toHaveText('--');
  });

  test('stop alarm button is hidden by default', async ({ page }) => {
    await gotoAnchor(page);
    await expect(page.locator('#stop-alarm-btn')).toBeHidden();
  });

  test('offset button is present and initially disabled', async ({ page }) => {
    await gotoAnchor(page);
    await expect(page.locator('#offset-btn')).toBeVisible();
    await expect(page.locator('#offset-btn')).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// 2. Geolocation & GPS
// ---------------------------------------------------------------------------
test.describe('Anchor — Geolocation & GPS', () => {
  test('GPS status updates with mocked geolocation', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    await expect(page.locator('#no-signal-overlay')).toBeHidden({ timeout: 10_000 });
  });

  test('GPS accuracy shows value after anchor drop', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 54.5189, longitude: 18.5305, accuracy: 5 });
    await gotoAnchor(page);
    await expect(page.locator('#main-btn')).toBeEnabled({ timeout: 10_000 });

    // Drop anchor
    await page.locator('#main-btn').click();
    await expect(page.locator('#main-btn-text')).not.toHaveText(ANCHOR_STRINGS.dropAnchor, { timeout: 5_000 });

    // Trigger a new GPS position update so _recalculate → _syncUI updates the dashboard
    await context.setGeolocation({ latitude: 54.5190, longitude: 18.5306, accuracy: 5 });
    await expect(page.locator('#val-acc')).not.toHaveText('--', { timeout: 10_000 });
  });

  test('main button becomes enabled after GPS fix', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    await expect(page.locator('#main-btn')).toBeEnabled({ timeout: 10_000 });
  });

  test('GPS status text changes to OK', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    await expect(page.locator('#gps-status-text')).toHaveText('OK', { timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// 3. Radius Controls (need GPS mock to avoid warning modal blocking clicks)
// ---------------------------------------------------------------------------
test.describe('Anchor — Radius Controls', () => {
  test('radius slider has correct min/max/step attributes', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    const slider = page.locator('#radius-slider');
    await expect(slider).toHaveAttribute('min', '10');
    await expect(slider).toHaveAttribute('max', '500');
    await expect(slider).toHaveAttribute('step', '5');
  });

  test('radius number input has correct min/max attributes', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    const numInput = page.locator('#radius-number');
    await expect(numInput).toHaveAttribute('min', '10');
    await expect(numInput).toHaveAttribute('max', '1000');
  });

  test('radius slider default value is 50', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    await expect(page.locator('#radius-slider')).toHaveValue('50');
  });

  test('radius number input default value is 50', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    await expect(page.locator('#radius-number')).toHaveValue('50');
  });

  test('changing radius slider updates number input', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    await expect(page.locator('#main-btn')).toBeEnabled({ timeout: 10_000 });

    const slider = page.locator('#radius-slider');
    await slider.fill('100');
    await slider.dispatchEvent('input');

    await expect(page.locator('#radius-number')).not.toHaveValue('50', { timeout: 5_000 });
  });

  test('changing radius number input accepts typed values', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    await expect(page.locator('#main-btn')).toBeEnabled({ timeout: 10_000 });

    const numInput = page.locator('#radius-number');
    await numInput.fill('200');
    await numInput.dispatchEvent('change');

    await expect(numInput).toHaveValue('200');
  });
});

// ---------------------------------------------------------------------------
// 4. Chain Calculator Modal
// ---------------------------------------------------------------------------
test.describe('Anchor — Chain Calculator Modal', () => {
  test('opens when clicking chain tool button', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    const calcModal = page.locator('#calc-modal');
    await expect(calcModal).toBeHidden();

    await page.locator('button[data-modal="calc-modal"]').click();
    await expect(calcModal).toBeVisible();
  });

  test('depth input accepts values', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    await page.locator('button[data-modal="calc-modal"]').click();

    const depthInput = page.locator('#calc-depth');
    await depthInput.fill('10');
    await expect(depthInput).toHaveValue('10');
  });

  test('ratio select has correct options (3:1, 5:1, 7:1)', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    await page.locator('button[data-modal="calc-modal"]').click();

    const ratioSelect = page.locator('#calc-ratio');
    const options = ratioSelect.locator('option');
    await expect(options).toHaveCount(3);
    await expect(options.nth(0)).toHaveText('3:1');
    await expect(options.nth(1)).toHaveText('5:1');
    await expect(options.nth(2)).toHaveText('7:1');
  });

  test('default ratio is 5:1', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    await page.locator('button[data-modal="calc-modal"]').click();
    await expect(page.locator('#calc-ratio')).toHaveValue('5');
  });

  test('changing depth updates result', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    await page.locator('button[data-modal="calc-modal"]').click();

    const initialResult = await page.locator('#calc-chain-result').textContent();

    const depthInput = page.locator('#calc-depth');
    await depthInput.fill('20');
    await depthInput.dispatchEvent('input');

    await expect(page.locator('#calc-chain-result')).not.toHaveText(initialResult!, { timeout: 3_000 });
  });

  test('apply button sets radius value', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    await expect(page.locator('#main-btn')).toBeEnabled({ timeout: 10_000 });

    await page.locator('button[data-modal="calc-modal"]').click();

    await page.locator('#calc-depth').fill('10');
    await page.locator('#calc-depth').dispatchEvent('input');

    const calcResult = await page.locator('#calc-chain-result').textContent();

    await page.locator('#apply-calc-btn').click();

    await expect(page.locator('#calc-modal')).toBeHidden();
    await expect(page.locator('#radius-number')).toHaveValue(calcResult!);
  });

  test('modal closes with close button', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    await page.locator('button[data-modal="calc-modal"]').click();
    await expect(page.locator('#calc-modal')).toBeVisible();

    await page.locator('#calc-modal .modal-close-btn').click();
    await expect(page.locator('#calc-modal')).toBeHidden();
  });
});

// ---------------------------------------------------------------------------
// 5. Sector Configuration
// ---------------------------------------------------------------------------
test.describe('Anchor — Sector Configuration', () => {
  test('sector modal opens', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    await page.locator('button[data-modal="sector-modal"]').click();
    await expect(page.locator('#sector-modal')).toBeVisible();
  });

  test('enable checkbox toggles input opacity', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    await page.locator('button[data-modal="sector-modal"]').click();

    const inputs = page.locator('#sector-inputs');
    await expect(inputs).toHaveCSS('opacity', '0.5');

    await page.locator('#sector-enable').check();
    await expect(inputs).toHaveCSS('opacity', '1');

    await page.locator('#sector-enable').uncheck();
    await expect(inputs).toHaveCSS('opacity', '0.5');
  });

  test('bearing and width inputs accept values', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    await page.locator('button[data-modal="sector-modal"]').click();

    const bearing = page.locator('#sector-bearing');
    const width = page.locator('#sector-width');

    await bearing.fill('180');
    await expect(bearing).toHaveValue('180');

    await width.fill('120');
    await expect(width).toHaveValue('120');
  });

  test('bearing input has correct min/max', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    await page.locator('button[data-modal="sector-modal"]').click();
    await expect(page.locator('#sector-bearing')).toHaveAttribute('min', '0');
    await expect(page.locator('#sector-bearing')).toHaveAttribute('max', '360');
  });

  test('width input has correct min/max', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    await page.locator('button[data-modal="sector-modal"]').click();
    await expect(page.locator('#sector-width')).toHaveAttribute('min', '10');
    await expect(page.locator('#sector-width')).toHaveAttribute('max', '360');
  });

  test('save with sector enabled shows badge', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    await expect(page.locator('#main-btn')).toBeEnabled({ timeout: 10_000 });

    await expect(page.locator('#sector-badge')).toBeHidden();

    await page.locator('button[data-modal="sector-modal"]').click();
    await page.locator('#sector-enable').check();
    await page.locator('#sector-bearing').fill('90');
    await page.locator('#sector-width').fill('120');
    await page.locator('#save-sector-btn').click();

    await expect(page.locator('#sector-badge')).toBeVisible();
    await expect(page.locator('#sector-badge')).toHaveText(ANCHOR_STRINGS.sector);
  });

  test('sector modal closes with close button', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    await page.locator('button[data-modal="sector-modal"]').click();
    await expect(page.locator('#sector-modal')).toBeVisible();

    await page.locator('#sector-modal .modal-close-btn').click();
    await expect(page.locator('#sector-modal')).toBeHidden();
  });
});

// ---------------------------------------------------------------------------
// 6. Night Mode
// ---------------------------------------------------------------------------
test.describe('Anchor — Night Mode', () => {
  test('night mode button toggles body class', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);

    const body = page.locator('body');
    await expect(body).not.toHaveClass(/night-vision/);

    await page.locator('#night-mode-btn').click();
    await expect(body).toHaveClass(/night-vision/);

    await page.locator('#night-mode-btn').click();
    await expect(body).not.toHaveClass(/night-vision/);
  });

  test('night mode applies visual filter', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    await page.locator('#night-mode-btn').click();

    const filter = await page.locator('body').evaluate(el => getComputedStyle(el).filter);
    expect(filter).not.toBe('none');
  });
});

// ---------------------------------------------------------------------------
// 7. Unit Toggle
// ---------------------------------------------------------------------------
test.describe('Anchor — Unit Toggle', () => {
  test('unit toggle shows METRY by default', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    await expect(page.locator('#unit-toggle')).toContainText(ANCHOR_STRINGS.meters);
  });

  test('unit toggle switches text on click', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    await expect(page.locator('#main-btn')).toBeEnabled({ timeout: 10_000 });

    await page.locator('#unit-toggle').click();
    await expect(page.locator('#unit-toggle')).not.toContainText(ANCHOR_STRINGS.meters);
  });

  test('unit toggle cycles back on second click', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    await expect(page.locator('#main-btn')).toBeEnabled({ timeout: 10_000 });

    await page.locator('#unit-toggle').click();
    await expect(page.locator('#unit-toggle')).not.toContainText(ANCHOR_STRINGS.meters);

    await page.locator('#unit-toggle').click();
    await expect(page.locator('#unit-toggle')).toContainText(ANCHOR_STRINGS.meters);
  });
});

// ---------------------------------------------------------------------------
// 8. Tool Buttons & Modals
// ---------------------------------------------------------------------------
test.describe('Anchor — Tool Buttons & Modals', () => {
  test('chain calculator modal opens and closes', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    await page.locator('button[data-modal="calc-modal"]').click();
    await expect(page.locator('#calc-modal')).toBeVisible();
    await page.locator('#calc-modal .modal-close-btn').click();
    await expect(page.locator('#calc-modal')).toBeHidden();
  });

  test('sector modal opens and closes', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    await page.locator('button[data-modal="sector-modal"]').click();
    await expect(page.locator('#sector-modal')).toBeVisible();
    await page.locator('#sector-modal .modal-close-btn').click();
    await expect(page.locator('#sector-modal')).toBeHidden();
  });

  test('watch setup modal opens and closes', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    await page.locator('button[data-modal="watch-setup-modal"]').click();
    await expect(page.locator('#watch-setup-modal')).toBeVisible();
    await page.locator('#watch-setup-modal .modal-close-btn').click();
    await expect(page.locator('#watch-setup-modal')).toBeHidden();
  });

  test('android sync modal opens and closes', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    await page.locator('button[data-modal="ws-sync-modal"]').click();
    await expect(page.locator('#ws-sync-modal')).toBeVisible();
    await page.locator('#ws-sync-modal .modal-close-btn').click();
    await expect(page.locator('#ws-sync-modal')).toBeHidden();
  });

  test('all tool buttons are visible and enabled', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);

    for (const selector of [
      'button[data-modal="calc-modal"]',
      'button[data-modal="sector-modal"]',
      'button[data-modal="watch-setup-modal"]',
      '#open-weather-btn',
      '#simple-monitor-btn',
      '#open-history-btn',
      '#open-ai-btn',
      '#share-pos-btn',
    ]) {
      await expect(page.locator(selector)).toBeVisible();
      await expect(page.locator(selector)).toBeEnabled();
    }
  });
});

// ---------------------------------------------------------------------------
// 9. Simple Monitor View
// ---------------------------------------------------------------------------
test.describe('Anchor — Simple Monitor View', () => {
  test('simple monitor overlay is hidden by default', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    await expect(page.locator('#simple-monitor-overlay')).toBeHidden();
  });

  test('simple monitor opens on button click', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    await expect(page.locator('#main-btn')).toBeEnabled({ timeout: 10_000 });

    await page.locator('#simple-monitor-btn').click();
    await expect(page.locator('#simple-monitor-overlay')).toBeVisible();
  });

  test('simple monitor shows key status elements', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    await expect(page.locator('#main-btn')).toBeEnabled({ timeout: 10_000 });

    await page.locator('#simple-monitor-btn').click();
    await expect(page.locator('#simple-monitor-overlay')).toBeVisible();

    await expect(page.locator('#sm-distance')).toBeVisible();
    await expect(page.locator('#sm-sog')).toBeVisible();
    await expect(page.locator('#sm-cog')).toBeVisible();
    await expect(page.locator('#sm-time')).toBeVisible();
  });

  test('simple monitor close button returns to map', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    await expect(page.locator('#main-btn')).toBeEnabled({ timeout: 10_000 });

    await page.locator('#simple-monitor-btn').click();
    await expect(page.locator('#simple-monitor-overlay')).toBeVisible();

    await page.locator('#sm-close-btn').click();
    await expect(page.locator('#simple-monitor-overlay')).toBeHidden();
  });
});

// ---------------------------------------------------------------------------
// Language Toggle
// ---------------------------------------------------------------------------
test.describe('Anchor — Language Toggle', () => {
  test('language toggle button is visible', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    await expect(page.locator('#lang-toggle')).toBeVisible();
    await expect(page.locator('#lang-toggle')).toHaveText('EN');
  });

  test('language toggle changes UI language', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    await expect(page.locator('#main-btn-text')).toHaveText(ANCHOR_STRINGS.dropAnchor);

    await page.locator('#lang-toggle').click();
    await expect(page.locator('#main-btn-text')).not.toHaveText(ANCHOR_STRINGS.dropAnchor, { timeout: 3_000 });
  });
});

// ---------------------------------------------------------------------------
// 10. AI Assistant Modal
// ---------------------------------------------------------------------------
test.describe('Anchor — AI Assistant Modal', () => {
  /** Navigate to anchor with an API key already saved so AI modal opens directly. */
  async function gotoAnchorWithAiKey(page: Page) {
    await page.goto(ANCHOR_URL, { waitUntil: 'commit' });
    await page.evaluate(() => {
      localStorage.setItem('anchor_onboarding_done', 'true');
      localStorage.setItem('anchor_ai_key', 'test-key-e2e');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
  }

  test('AI button without key opens API key modal', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    await page.locator('#open-ai-btn').click();
    // No API key → API key modal opens instead of AI modal
    await expect(page.locator('#api-key-modal')).toBeVisible();
    await expect(page.locator('#ai-modal')).toBeHidden();
  });

  test('API key input accepts text', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    await page.locator('#open-ai-btn').click();
    await expect(page.locator('#api-key-modal')).toBeVisible();

    const input = page.locator('#api-key-input');
    await input.fill('test-api-key-12345');
    await expect(input).toHaveValue('test-api-key-12345');
  });

  test('save API key closes API key modal and opens AI modal', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    await page.locator('#open-ai-btn').click();
    await expect(page.locator('#api-key-modal')).toBeVisible();

    await page.locator('#api-key-input').fill('test-key');
    await page.locator('#save-api-key-btn').click();
    await expect(page.locator('#api-key-modal')).toBeHidden();
    // Pending action fires → AI modal opens
    await expect(page.locator('#ai-modal')).toBeVisible();
  });

  test('AI button with key opens AI modal directly', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchorWithAiKey(page);
    await expect(page.locator('#ai-modal')).toBeHidden();

    await page.locator('#open-ai-btn').click();
    await expect(page.locator('#ai-modal')).toBeVisible();
  });

  test('AI modal has chat area', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchorWithAiKey(page);
    await page.locator('#open-ai-btn').click();
    await expect(page.locator('#ai-chat-area')).toBeVisible();
  });

  test('edit API key button opens API key modal from AI modal', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchorWithAiKey(page);
    await page.locator('#open-ai-btn').click();
    await expect(page.locator('#ai-modal')).toBeVisible();

    await page.locator('#edit-api-key-btn').click();
    await expect(page.locator('#api-key-modal')).toBeVisible();
  });

  test('clear chat button exists', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchorWithAiKey(page);
    // Button exists in DOM but may be hidden initially
    await expect(page.locator('#ai-clear-chat-btn')).toBeAttached();
  });

  test('AI modal closes with close button', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchorWithAiKey(page);
    await page.locator('#open-ai-btn').click();
    await expect(page.locator('#ai-modal')).toBeVisible();

    await page.locator('#ai-modal .modal-close-btn').click();
    await expect(page.locator('#ai-modal')).toBeHidden();
  });
});

// ---------------------------------------------------------------------------
// 11. History Modal
// ---------------------------------------------------------------------------
test.describe('Anchor — History Modal', () => {
  test('history button opens history modal', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    await expect(page.locator('#history-modal')).toBeHidden();

    await page.locator('#open-history-btn').click();
    await expect(page.locator('#history-modal')).toBeVisible();
  });

  test('history modal shows content area', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    await page.locator('#open-history-btn').click();
    await expect(page.locator('#history-modal')).toBeVisible();

    // Modal should have visible inner content
    const modalContent = page.locator('#history-modal .bg-slate-800');
    await expect(modalContent.first()).toBeVisible();
  });

  test('history modal closes with close button', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    await page.locator('#open-history-btn').click();
    await expect(page.locator('#history-modal')).toBeVisible();

    await page.locator('#history-modal .modal-close-btn').first().click();
    await expect(page.locator('#history-modal')).toBeHidden();
  });
});

// ---------------------------------------------------------------------------
// 12. Offset Modal
// ---------------------------------------------------------------------------
test.describe('Anchor — Offset Modal', () => {
  async function dropAnchor(page: Page, context: import('@playwright/test').BrowserContext) {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 54.5189, longitude: 18.5305, accuracy: 5 });
    await gotoAnchor(page);
    await expect(page.locator('#main-btn')).toBeEnabled({ timeout: 10_000 });
    await page.locator('#main-btn').click();
    await expect(page.locator('#main-btn-text')).not.toHaveText(ANCHOR_STRINGS.dropAnchor, { timeout: 5_000 });
  }

  test('offset button is enabled after anchor drop', async ({ page, context }) => {
    await dropAnchor(page, context);
    await expect(page.locator('#offset-btn')).toBeEnabled({ timeout: 5_000 });
  });

  test('offset button opens offset modal', async ({ page, context }) => {
    await dropAnchor(page, context);
    await expect(page.locator('#offset-btn')).toBeEnabled({ timeout: 5_000 });

    await page.locator('#offset-btn').click();
    await expect(page.locator('#offset-modal')).toBeVisible();
  });

  test('distance and bearing inputs accept values', async ({ page, context }) => {
    await dropAnchor(page, context);
    await expect(page.locator('#offset-btn')).toBeEnabled({ timeout: 5_000 });
    await page.locator('#offset-btn').click();
    await expect(page.locator('#offset-modal')).toBeVisible();

    const dist = page.locator('#offset-dist');
    const bearing = page.locator('#offset-bearing');

    await dist.fill('50');
    await expect(dist).toHaveValue('50');

    await bearing.fill('180');
    await expect(bearing).toHaveValue('180');
  });

  test(`"${ANCHOR_STRINGS.behind}" button sets bearing`, async ({ page, context }) => {
    await dropAnchor(page, context);
    await expect(page.locator('#offset-btn')).toBeEnabled({ timeout: 5_000 });
    await page.locator('#offset-btn').click();
    await expect(page.locator('#offset-modal')).toBeVisible();

    const bearing = page.locator('#offset-bearing');
    const initialValue = await bearing.inputValue();

    await page.locator('#set-bearing-behind-btn').click();

    // The button should change the bearing value
    const newValue = await bearing.inputValue();
    expect(newValue).not.toBe(initialValue);
  });

  test('confirm button exists and is visible', async ({ page, context }) => {
    await dropAnchor(page, context);
    await expect(page.locator('#offset-btn')).toBeEnabled({ timeout: 5_000 });
    await page.locator('#offset-btn').click();
    await expect(page.locator('#offset-modal')).toBeVisible();

    await expect(page.locator('#confirm-offset-btn')).toBeVisible();
  });

  test('modal closes with close button', async ({ page, context }) => {
    await dropAnchor(page, context);
    await expect(page.locator('#offset-btn')).toBeEnabled({ timeout: 5_000 });
    await page.locator('#offset-btn').click();
    await expect(page.locator('#offset-modal')).toBeVisible();

    await page.locator('#offset-modal .modal-close-btn').first().click();
    await expect(page.locator('#offset-modal')).toBeHidden();
  });
});

// ---------------------------------------------------------------------------
// 13. Watch Alert Modal
// ---------------------------------------------------------------------------
test.describe('Anchor — Watch Alert Modal', () => {
  test('watch alert modal exists in DOM', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    await expect(page.locator('#watch-alert-modal')).toBeAttached();
    await expect(page.locator('#watch-alert-modal')).toBeHidden();
  });

  test('watch alert OK button exists in DOM', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    await expect(page.locator('#watch-alert-ok-btn')).toBeAttached();
  });

  test('watch alert modal can be shown and dismissed', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);

    // Programmatically show the alert modal
    await page.evaluate(() => {
      document.getElementById('watch-alert-modal')?.classList.remove('hidden');
    });
    await expect(page.locator('#watch-alert-modal')).toBeVisible();

    await page.locator('#watch-alert-ok-btn').click();
    await expect(page.locator('#watch-alert-modal')).toBeHidden();
  });
});

// ---------------------------------------------------------------------------
// 14. Battery Warning Modal
// ---------------------------------------------------------------------------
test.describe('Anchor — Battery Warning Modal', () => {
  test('battery modal exists in DOM and is hidden', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    await expect(page.locator('#battery-modal')).toBeAttached();
    await expect(page.locator('#battery-modal')).toBeHidden();
  });

  test('battery modal can be shown and closed', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);

    await page.evaluate(() => {
      document.getElementById('battery-modal')?.classList.remove('hidden');
    });
    await expect(page.locator('#battery-modal')).toBeVisible();

    await page.locator('#battery-modal .modal-close-btn').first().click();
    await expect(page.locator('#battery-modal')).toBeHidden();
  });
});

// ---------------------------------------------------------------------------
// 15. Drag Warning Modal
// ---------------------------------------------------------------------------
test.describe('Anchor — Drag Warning Modal', () => {
  test('drag warning modal exists in DOM and is hidden', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    await expect(page.locator('#drag-warning-modal')).toBeAttached();
    await expect(page.locator('#drag-warning-modal')).toBeHidden();
  });

  test('drag warning modal can be shown and closed', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);

    await page.evaluate(() => {
      document.getElementById('drag-warning-modal')?.classList.remove('hidden');
    });
    await expect(page.locator('#drag-warning-modal')).toBeVisible();

    await page.locator('#drag-warning-modal .modal-close-btn').first().click();
    await expect(page.locator('#drag-warning-modal')).toBeHidden();
  });
});

// ---------------------------------------------------------------------------
// 16. GPX Export Button
// ---------------------------------------------------------------------------
test.describe('Anchor — GPX Export', () => {
  test('replay export button exists in DOM', async ({ page, mockGeolocation }) => {
    await mockGeolocation();
    await gotoAnchor(page);
    await expect(page.locator('#replay-export-btn')).toBeAttached();
  });
});
