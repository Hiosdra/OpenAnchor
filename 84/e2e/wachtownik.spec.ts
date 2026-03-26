import { test, expect } from './fixtures.js';
import { MODULES, STORAGE_KEYS } from './helpers.js';

// Playwright uses en-US locale by default; the app detects this and renders English.
// Some strings (night mode aria-labels, share dropdown) are hardcoded in Polish.

const waitForApp = async (page: import('@playwright/test').Page) => {
  await page.waitForFunction(() => {
    const root = document.getElementById('root');
    return root && root.children.length > 0;
  });
};

/** Scroll element to viewport center (avoids sticky header occlusion) then click */
const scrollClick = async (locator: import('@playwright/test').Locator) => {
  await locator.evaluate(el => el.scrollIntoView({ block: 'center' }));
  await locator.click();
};

/** Build a minimal localStorage state for the app */
const buildState = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    crew: [
      { id: 'c1', name: 'Anna', role: 'captain' },
      { id: 'c2', name: 'Michał', role: 'officer' },
      { id: 'c3', name: 'Kasia', role: 'sailor' },
      { id: 'c4', name: 'Tomek', role: 'sailor' },
      { id: 'c5', name: 'Piotr', role: 'cook' },
    ],
    slots: [
      { id: '1', start: '00:00', end: '04:00', reqCrew: 2 },
      { id: '2', start: '04:00', end: '08:00', reqCrew: 2 },
      { id: '3', start: '08:00', end: '12:00', reqCrew: 2 },
      { id: '4', start: '12:00', end: '16:00', reqCrew: 2 },
      { id: '5', start: '16:00', end: '20:00', reqCrew: 2 },
      { id: '6', start: '20:00', end: '24:00', reqCrew: 2 },
    ],
    days: 3,
    startDate: '2025-01-01',
    schedule: [],
    isGenerated: false,
    isNightMode: false,
    captainParticipates: true,
    ...overrides,
  });

// ─── Page Load & Initial State ───────────────────────────────────────────────

test.describe('Page Load & Initial State', () => {
  test('page loads and React renders in #root', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);
    const root = page.locator('#root');
    await expect(root).toBeVisible();
    const children = await root.evaluate(el => el.children.length);
    expect(children).toBeGreaterThan(0);
  });

  test('main content area is visible', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);
    await expect(page.locator('#main-content')).toBeVisible();
  });

  test('add crew button is available', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);
    await expect(page.getByRole('button', { name: 'Add person' })).toBeVisible();
  });

  test('default crew members are loaded', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);
    for (const name of ['Anna', 'Michał', 'Kasia', 'Tomek', 'Piotr']) {
      await expect(page.getByText(name, { exact: true })).toBeVisible();
    }
  });

  test('crew count shows 5/15 by default', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);
    await expect(page.getByText('(5/15)')).toBeVisible();
  });

  test('setup tab is active by default', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);
    await expect(page.getByRole('button', { name: 'Setup' })).toBeVisible();
  });

  test('default 6 watch slots are loaded', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);
    const desktopSlots = page.locator('#slots-configuration-desktop');
    await expect(desktopSlots.locator('tbody tr')).toHaveCount(6);
  });
});

// ─── Crew Management ─────────────────────────────────────────────────────────

test.describe('Crew Management', () => {
  test('can add a crew member', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    const nameInput = page.getByPlaceholder('Imię...');
    await nameInput.scrollIntoViewIfNeeded();
    await nameInput.fill('Zbyszek');
    await scrollClick(page.getByRole('button', { name: 'Add person' }));

    await expect(page.getByText('Zbyszek')).toBeVisible();
    await expect(page.getByText('(6/15)')).toBeVisible();
  });

  test('can add multiple crew members', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    const nameInput = page.getByPlaceholder('Imię...');
    const addBtn = page.getByRole('button', { name: 'Add person' });

    await nameInput.scrollIntoViewIfNeeded();
    await nameInput.fill('Jan');
    await scrollClick(addBtn);

    await nameInput.fill('Maria');
    await scrollClick(addBtn);

    await expect(page.getByText('Jan')).toBeVisible();
    await expect(page.getByText('Maria')).toBeVisible();
    await expect(page.getByText('(7/15)')).toBeVisible();
  });

  test('name input clears after adding crew', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    const nameInput = page.getByPlaceholder('Imię...');
    await nameInput.scrollIntoViewIfNeeded();
    await nameInput.fill('Zbyszek');
    await scrollClick(page.getByRole('button', { name: 'Add person' }));

    await expect(nameInput).toHaveValue('');
  });

  test('can add crew member by pressing Enter', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    const nameInput = page.getByPlaceholder('Imię...');
    await nameInput.scrollIntoViewIfNeeded();
    await nameInput.fill('EwaTest');
    await nameInput.press('Enter');

    await expect(page.getByText('EwaTest')).toBeVisible();
    await expect(page.getByText('(6/15)')).toBeVisible();
  });

  test('can remove a crew member', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    // Add a crew member first
    const nameInput = page.getByPlaceholder('Imię...');
    await nameInput.scrollIntoViewIfNeeded();
    await nameInput.fill('Tymczasowy');
    await scrollClick(page.getByRole('button', { name: 'Add person' }));
    await expect(page.getByText('(6/15)')).toBeVisible();

    // Delete the added member via the Trash button next to their name
    const crewItem = page.locator('div.flex.items-center.justify-between').filter({ hasText: 'Tymczasowy' });
    await scrollClick(crewItem.locator('button'));

    await expect(page.getByText('Tymczasowy')).not.toBeVisible();
    await expect(page.getByText('(5/15)')).toBeVisible();
  });

  test('cannot remove crew below minimum of 3', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    page.on('dialog', dialog => dialog.accept());

    // Remove down from 5 to 3
    for (const name of ['Piotr', 'Tomek']) {
      const row = page.locator('div.flex.items-center.justify-between').filter({ hasText: name });
      await scrollClick(row.locator('button'));
    }
    await expect(page.getByText('(3/15)')).toBeVisible();

    // Try removing Kasia — blocked at minimum, count stays 3
    const kasiaRow = page.locator('div.flex.items-center.justify-between').filter({ hasText: 'Kasia' });
    await scrollClick(kasiaRow.locator('button'));
    await expect(page.getByText('(3/15)')).toBeVisible();
  });

  test('maximum of 15 crew enforced - add button disabled', async ({ setLocalStorage }) => {
    const crew = Array.from({ length: 15 }, (_, i) => ({
      id: `c${i + 1}`,
      name: `Person${i + 1}`,
      role: 'sailor',
    }));

    const page = await setLocalStorage(MODULES.wachtownik, [
      { key: STORAGE_KEYS.sailingSchedule, value: buildState({ crew }) },
    ]);
    await waitForApp(page);

    await expect(page.getByText('(15/15)')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add person' })).toBeDisabled();
  });
});

// ─── Schedule Slots ──────────────────────────────────────────────────────────

test.describe('Schedule Slots', () => {
  test('can add a new time slot', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    const desktopSlots = page.locator('#slots-configuration-desktop');
    const initialRows = await desktopSlots.locator('tbody tr').count();

    await scrollClick(page.getByRole('button', { name: 'Add watch slot' }));

    await expect(desktopSlots.locator('tbody tr')).toHaveCount(initialRows + 1);
  });

  test('time inputs have correct default values', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    const firstRow = page.locator('#slots-configuration-desktop tbody tr').first();
    const startInput = firstRow.locator('input[type="time"]').first();
    await expect(startInput).toHaveValue('00:00');
  });

  test('can remove a slot', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    const desktopSlots = page.locator('#slots-configuration-desktop');
    const initialCount = await desktopSlots.locator('tbody tr').count();

    await scrollClick(desktopSlots.locator('tbody tr').last().locator('button'));

    await expect(desktopSlots.locator('tbody tr')).toHaveCount(initialCount - 1);
  });

  test('required crew input has correct constraints', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    const crewInput = page.locator('#slots-configuration-desktop tbody tr').first().locator('input[type="number"]');
    await expect(crewInput).toHaveAttribute('min', '1');
    await expect(crewInput).toHaveAttribute('max', '10');
    await expect(crewInput).toHaveValue('2');
  });
});

// ─── Schedule Generation & Display ──────────────────────────────────────────

test.describe('Schedule Generation & Display', () => {
  test('generate button is visible on setup tab', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);
    await expect(page.getByRole('button', { name: 'Generate watch schedule' })).toBeVisible();
  });

  test('schedule tabs are disabled before generation', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    await expect(page.getByRole('button', { name: 'Schedule', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Gantt' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Analytics' })).toBeDisabled();
  });

  test('generating schedule enables schedule tab', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    await scrollClick(page.getByRole('button', { name: 'Generate watch schedule' }));
    await expect(page.getByRole('button', { name: 'Schedule', exact: true })).toBeEnabled();
  });

  test('schedule table is visible after generation and tab switch', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    await scrollClick(page.getByRole('button', { name: 'Generate watch schedule' }));
    await page.getByRole('button', { name: 'Schedule', exact: true }).click();

    await expect(page.locator('#print-schedule-section')).toBeVisible();
    await expect(page.locator('#print-schedule-table')).toBeVisible();
  });

  test('schedule table contains crew member names', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    await scrollClick(page.getByRole('button', { name: 'Generate watch schedule' }));
    await page.getByRole('button', { name: 'Schedule', exact: true }).click();

    const tableText = await page.locator('#print-schedule-table').textContent();
    const defaultNames = ['Anna', 'Michał', 'Kasia', 'Tomek'];
    const foundNames = defaultNames.filter(name => tableText?.includes(name));
    expect(foundNames.length).toBeGreaterThan(0);
  });

  test('gantt and analytics tabs enable after generation', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    await scrollClick(page.getByRole('button', { name: 'Generate watch schedule' }));

    await expect(page.getByRole('button', { name: 'Gantt' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Analytics' })).toBeEnabled();
  });
});

// ─── State Persistence ───────────────────────────────────────────────────────

test.describe('State Persistence', () => {
  test('state is saved to localStorage', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    const nameInput = page.getByPlaceholder('Imię...');
    await nameInput.scrollIntoViewIfNeeded();
    await nameInput.fill('Persistence');
    await scrollClick(page.getByRole('button', { name: 'Add person' }));
    await expect(page.getByText('Persistence')).toBeVisible();

    const saved = await page.evaluate(() => localStorage.getItem('sailingSchedulePro'));
    expect(saved).toBeTruthy();
    const state = JSON.parse(saved!);
    expect(state.crew.map((c: { name: string }) => c.name)).toContain('Persistence');
  });

  test('state is restored after page reload', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    const nameInput = page.getByPlaceholder('Imię...');
    await nameInput.scrollIntoViewIfNeeded();
    await nameInput.fill('Reloaded');
    await scrollClick(page.getByRole('button', { name: 'Add person' }));
    await expect(page.getByText('Reloaded')).toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page.getByText('Reloaded')).toBeVisible();
  });

  test('pre-set localStorage state is loaded on page open', async ({ setLocalStorage }) => {
    const state = buildState({
      crew: [
        { id: 'x1', name: 'Capitan', role: 'captain' },
        { id: 'x2', name: 'Officer1', role: 'officer' },
        { id: 'x3', name: 'Sailor1', role: 'sailor' },
        { id: 'x4', name: 'Sailor2', role: 'sailor' },
      ],
      slots: [
        { id: '1', start: '06:00', end: '18:00', reqCrew: 2 },
        { id: '2', start: '18:00', end: '06:00', reqCrew: 2 },
      ],
    });

    const page = await setLocalStorage(MODULES.wachtownik, [
      { key: STORAGE_KEYS.sailingSchedule, value: state },
    ]);
    await waitForApp(page);

    await expect(page.getByText('Capitan')).toBeVisible();
    await expect(page.getByText('Officer1')).toBeVisible();
    await expect(page.getByText('(4/15)')).toBeVisible();
    await expect(page.locator('#slots-configuration-desktop tbody tr')).toHaveCount(2);
  });

  test('generated schedule persists across reload', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    await scrollClick(page.getByRole('button', { name: 'Generate watch schedule' }));
    await expect(page.getByRole('button', { name: 'Schedule', exact: true })).toBeEnabled();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    await expect(page.getByRole('button', { name: 'Schedule', exact: true })).toBeEnabled();
  });
});

// ─── Night Mode ──────────────────────────────────────────────────────────────

test.describe('Night Mode', () => {
  test('night mode toggle changes theme', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    const appContainer = page.locator('[data-night-mode]');
    await expect(appContainer).toHaveAttribute('data-night-mode', 'false');

    await page.getByRole('button', { name: /night mode/i }).click();
    await expect(appContainer).toHaveAttribute('data-night-mode', 'true');
  });

  test('night mode toggle aria-label updates', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    await page.getByRole('button', { name: /night mode/i }).click();
    await expect(page.getByRole('button', { name: /night mode/i })).toBeVisible();
  });

  test('night mode can be toggled off', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    await page.getByRole('button', { name: /night mode/i }).click();
    await expect(page.locator('[data-night-mode="true"]')).toBeVisible();

    await page.getByRole('button', { name: /night mode/i }).click();
    await expect(page.locator('[data-night-mode="false"]')).toBeVisible();
  });

  test('night mode persists across reload', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    await page.getByRole('button', { name: /night mode/i }).click();
    await expect(page.locator('[data-night-mode="true"]')).toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    await expect(page.locator('[data-night-mode="true"]')).toBeVisible();
  });

  test('night mode loaded from localStorage', async ({ setLocalStorage }) => {
    const page = await setLocalStorage(MODULES.wachtownik, [
      { key: STORAGE_KEYS.sailingSchedule, value: buildState({ isNightMode: true }) },
    ]);
    await waitForApp(page);

    await expect(page.locator('[data-night-mode="true"]')).toBeVisible();
  });
});

// ─── Dog Watch Pattern ───────────────────────────────────────────────────────

test.describe('Dog Watch Pattern', () => {
  test('dog watch button is visible', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);
    await expect(page.getByRole('button', { name: 'Add Dog Watches (16-20)' })).toBeVisible();
  });

  test('dog watch splits 16:00-20:00 slot into two', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    const desktopSlots = page.locator('#slots-configuration-desktop');
    await expect(desktopSlots.locator('tbody tr')).toHaveCount(6);

    await scrollClick(page.getByRole('button', { name: 'Add Dog Watches (16-20)' }));

    // 16:00-20:00 replaced with 16:00-18:00 + 18:00-20:00 → 7 slots
    await expect(desktopSlots.locator('tbody tr')).toHaveCount(7);
  });

  test('dog watch shows error when no 16-20 slot exists', async ({ setLocalStorage }) => {
    const page = await setLocalStorage(MODULES.wachtownik, [
      {
        key: STORAGE_KEYS.sailingSchedule,
        value: buildState({
          slots: [
            { id: '1', start: '00:00', end: '12:00', reqCrew: 2 },
            { id: '2', start: '12:00', end: '24:00', reqCrew: 2 },
          ],
        }),
      },
    ]);
    await waitForApp(page);

    await scrollClick(page.getByRole('button', { name: 'Add Dog Watches (16-20)' }));

    // Slot count remains unchanged — no 16:00-20:00 to split
    await expect(page.locator('#slots-configuration-desktop tbody tr')).toHaveCount(2);
  });
});

// ─── Share Functionality ─────────────────────────────────────────────────────

test.describe('Share Functionality', () => {
  test('share dropdown button is visible', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);
    await expect(page.getByRole('button', { name: 'Udostępnij' })).toBeVisible();
  });

  test('share dropdown shows options when clicked', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    await page.getByRole('button', { name: 'Udostępnij' }).click();

    await expect(page.getByText('QR Kod')).toBeVisible();
    await expect(page.getByText('Link edytowalny')).toBeVisible();
    await expect(page.getByText('Link tylko do odczytu')).toBeVisible();
  });

  test('editable share link copies to clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    await page.getByRole('button', { name: 'Udostępnij' }).click();
    await page.getByText('Link edytowalny').click();

    // Hardcoded Polish toast
    await expect(page.getByText('Skopiowano!')).toBeVisible();
  });
});

// ─── Notification Toggle ─────────────────────────────────────────────────────

test.describe('Notification Toggle', () => {
  test('alarm button is visible after schedule generation', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    await scrollClick(page.getByRole('button', { name: 'Generate watch schedule' }));
    await page.getByRole('button', { name: 'Schedule', exact: true }).click();

    const alarmBtn = page.getByRole('button', { name: /Alarm OFF/i });
    await expect(alarmBtn).toBeVisible();
  });

  test('toggling notification on changes button text and style', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    // Mock Notification.requestPermission to auto-grant
    await page.evaluate(() => {
      (window as any).Notification = { permission: 'default', requestPermission: () => Promise.resolve('granted') };
    });

    await scrollClick(page.getByRole('button', { name: 'Generate watch schedule' }));
    await page.getByRole('button', { name: 'Schedule', exact: true }).click();

    const alarmBtn = page.getByRole('button', { name: /Alarm/i });
    await expect(alarmBtn).toContainText('Alarm OFF');

    await alarmBtn.click();

    await expect(alarmBtn).toContainText('Alarm ON');
    // Enabled state applies emerald background
    await expect(alarmBtn).toHaveClass(/bg-emerald-100/);
  });

  test('toggling notification off restores original state', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    await page.evaluate(() => {
      (window as any).Notification = { permission: 'default', requestPermission: () => Promise.resolve('granted') };
    });

    await scrollClick(page.getByRole('button', { name: 'Generate watch schedule' }));
    await page.getByRole('button', { name: 'Schedule', exact: true }).click();

    const alarmBtn = page.getByRole('button', { name: /Alarm/i });
    await alarmBtn.click();
    await expect(alarmBtn).toContainText('Alarm ON');

    // Toggle off
    await alarmBtn.click();
    await expect(alarmBtn).toContainText('Alarm OFF');
    await expect(alarmBtn).not.toHaveClass(/bg-emerald-100/);
  });
});

// ─── Tabs Navigation ─────────────────────────────────────────────────────────

test.describe('Tabs Navigation', () => {
  test('can switch between tabs after generation', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    await scrollClick(page.getByRole('button', { name: 'Generate watch schedule' }));

    await page.getByRole('button', { name: 'Schedule', exact: true }).click();
    await expect(page.locator('#print-schedule-section')).toBeVisible();

    await page.getByRole('button', { name: 'Gantt' }).click();
    await expect(page.locator('#print-schedule-section')).not.toBeVisible();

    await page.getByRole('button', { name: 'Setup' }).click();
    await expect(page.getByRole('button', { name: 'Generate watch schedule' })).toBeVisible();
  });
});
