import { test, expect } from './fixtures.js';
import { MODULES, STORAGE_KEYS } from './helpers.js';

/**
 * Comprehensive E2E tests for the full Wachtownik path:
 * - Template application and verification
 * - Cross-day slot handling
 * - Warning banner behavior
 * - Schedule generation with various configurations
 * - Gantt chart and analytics views
 * - Undo/redo operations
 * - Language switching
 * - Coverage indicator
 * - Full workflow: setup → generate → view schedule → analytics
 */

const waitForApp = async (page: import('@playwright/test').Page) => {
  await page.waitForFunction(() => {
    const spa = document.getElementById('spa-root');
    if (spa && spa.children.length > 0) return true;
    const root = document.getElementById('root');
    return root && root.children.length > 0;
  }, { timeout: 15_000 });
};

const scrollClick = async (locator: import('@playwright/test').Locator) => {
  await locator.scrollIntoViewIfNeeded();
  await locator.click();
};

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

// ─── Template Application ────────────────────────────────────────────────────

test.describe('Template Application', () => {
  test('night3_day4 template applies 7 slots', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    const templateBtn = page.getByRole('button', { name: 'Night 3h / Day 4h (7 watches)' });
    await scrollClick(templateBtn);

    const desktopSlots = page.locator('#slots-configuration-desktop');
    await expect(desktopSlots.locator('tbody tr')).toHaveCount(7);
  });

  test('night3_day4 template shows full 24h coverage', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    await scrollClick(page.getByRole('button', { name: 'Night 3h / Day 4h (7 watches)' }));

    await expect(page.getByText('100%')).toBeVisible();
    await expect(page.getByText('24h coverage', { exact: true })).toBeVisible();
  });

  test('swedish template applies 5 slots', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    await scrollClick(page.getByRole('button', { name: 'Swedish system (5 watches)' }).last());

    const desktopSlots = page.locator('#slots-configuration-desktop');
    await expect(desktopSlots.locator('tbody tr')).toHaveCount(5);
  });

  test('racing template applies 12 slots', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    await scrollClick(page.getByRole('button', { name: 'Racing system (12 watches × 2h)' }).last());

    const desktopSlots = page.locator('#slots-configuration-desktop');
    await expect(desktopSlots.locator('tbody tr')).toHaveCount(12);
  });

  test('3x8h template applies 3 slots with full coverage', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    await scrollClick(page.getByRole('button', { name: /3 watches × 8h/ }).last());

    const desktopSlots = page.locator('#slots-configuration-desktop');
    await expect(desktopSlots.locator('tbody tr')).toHaveCount(3);
    await expect(page.getByText('100%')).toBeVisible();
  });

  test('switching templates replaces previous slot configuration', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    const desktopSlots = page.locator('#slots-configuration-desktop');

    await scrollClick(page.getByRole('button', { name: /3 watches × 8h/ }).last());
    await expect(desktopSlots.locator('tbody tr')).toHaveCount(3);

    await scrollClick(page.getByRole('button', { name: 'Swedish system (5 watches)' }).last());
    await expect(desktopSlots.locator('tbody tr')).toHaveCount(5);
  });
});

// ─── Cross-Day Slot Handling ─────────────────────────────────────────────────

test.describe('Cross-Day Slot Handling', () => {
  test('cross-day slot (end < start) shows warning banner', async ({ setLocalStorage }) => {
    const page = await setLocalStorage(MODULES.wachtownik, [
      {
        key: STORAGE_KEYS.sailingSchedule,
        value: buildState({
          slots: [
            { id: '1', start: '23:00', end: '01:00', reqCrew: 2 },
            { id: '2', start: '01:00', end: '08:00', reqCrew: 2 },
            { id: '3', start: '08:00', end: '16:00', reqCrew: 2 },
            { id: '4', start: '16:00', end: '23:00', reqCrew: 2 },
          ],
        }),
      },
    ]);
    await waitForApp(page);

    const warningBanner = page.locator('[data-testid="slot-warnings-banner"]');
    await expect(warningBanner).toBeVisible();
    await expect(warningBanner).toContainText('midnight');
  });

  test('cross-day slot does not block schedule generation', async ({ setLocalStorage }) => {
    const page = await setLocalStorage(MODULES.wachtownik, [
      {
        key: STORAGE_KEYS.sailingSchedule,
        value: buildState({
          slots: [
            { id: '1', start: '22:00', end: '02:00', reqCrew: 2 },
            { id: '2', start: '02:00', end: '10:00', reqCrew: 2 },
            { id: '3', start: '10:00', end: '22:00', reqCrew: 2 },
          ],
        }),
      },
    ]);
    await waitForApp(page);

    await scrollClick(page.getByRole('button', { name: 'Generate watch schedule' }));
    await expect(page.getByRole('button', { name: 'Schedule', exact: true })).toBeEnabled();
  });

  test('normal slots (end > start) do not show warning banner', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    const warningBanner = page.locator('[data-testid="slot-warnings-banner"]');
    await expect(warningBanner).not.toBeVisible();
  });

  test('modifying slot end time to create cross-day shows warning', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    const lastRow = page.locator('#slots-configuration-desktop tbody tr').last();
    const endInput = lastRow.locator('input[type="time"]').nth(1);
    await endInput.fill('02:00');

    const warningBanner = page.locator('[data-testid="slot-warnings-banner"]');
    await expect(warningBanner).toBeVisible();
  });
});

// ─── Coverage Indicator ──────────────────────────────────────────────────────

test.describe('Coverage Indicator', () => {
  test('default 6×4h template shows 100% coverage', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    await expect(page.getByText('100%')).toBeVisible();
    await expect(page.getByText('24h coverage', { exact: true })).toBeVisible();
  });

  test('removing a slot reduces coverage below 100%', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    const desktopSlots = page.locator('#slots-configuration-desktop');
    await expect(desktopSlots.locator('tbody tr')).toHaveCount(6);

    await scrollClick(desktopSlots.locator('tbody tr').nth(2).locator('button'));

    await expect(page.getByText('100%')).not.toBeVisible();
    await expect(page.getByText('Coverage gap', { exact: true })).toBeVisible();
  });

  test('coverage gap shows time range details', async ({ setLocalStorage }) => {
    const page = await setLocalStorage(MODULES.wachtownik, [
      {
        key: STORAGE_KEYS.sailingSchedule,
        value: buildState({
          slots: [
            { id: '1', start: '00:00', end: '08:00', reqCrew: 2 },
            { id: '2', start: '16:00', end: '24:00', reqCrew: 2 },
          ],
        }),
      },
    ]);
    await waitForApp(page);

    await expect(page.getByText('Coverage gap', { exact: true })).toBeVisible();
    await expect(page.getByText(/08:00/)).toBeVisible();
  });
});

// ─── Full Workflow ────────────────────────────────────────────────────────────

test.describe('Full Workflow: Setup → Generate → View', () => {
  test('complete workflow: add crew, select template, generate, view schedule', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    await expect(page.getByText('(5/15)')).toBeVisible();

    const nameInput = page.getByPlaceholder('Imię...');
    await nameInput.scrollIntoViewIfNeeded();
    await nameInput.fill('Bartek');
    await scrollClick(page.getByRole('button', { name: 'Add person' }));
    await expect(page.getByText('(6/15)')).toBeVisible();

    await scrollClick(page.getByRole('button', { name: 'Swedish system (5 watches)' }).last());
    const desktopSlots = page.locator('#slots-configuration-desktop');
    await expect(desktopSlots.locator('tbody tr')).toHaveCount(5);

    await scrollClick(page.getByRole('button', { name: 'Generate watch schedule' }));

    await expect(page.getByRole('button', { name: 'Schedule', exact: true })).toBeEnabled();
    await expect(page.locator('#print-schedule-section')).toBeVisible();

    const tableText = await page.locator('#print-schedule-table').textContent();
    expect(tableText).toContain('Anna');
  });

  test('generate with night3_day4 template shows correct schedule', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    await scrollClick(page.getByRole('button', { name: 'Night 3h / Day 4h (7 watches)' }));
    await scrollClick(page.getByRole('button', { name: 'Generate watch schedule' }));

    await expect(page.locator('#print-schedule-section')).toBeVisible();
    await expect(page.locator('#print-schedule-table')).toBeVisible();
  });

  test('gantt chart displays correctly after generation', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    await scrollClick(page.getByRole('button', { name: 'Generate watch schedule' }));
    await page.getByRole('button', { name: 'Gantt' }).click();

    await expect(page.getByText('Gantt Chart - Timeline View')).toBeVisible();
  });

  test('analytics panel displays statistics after generation', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    await scrollClick(page.getByRole('button', { name: 'Generate watch schedule' }));
    await page.getByRole('button', { name: 'Analytics' }).click();

    await expect(page.getByText('Total Watches')).toBeVisible();
    await expect(page.getByText('Active Crew')).toBeVisible();
    await expect(page.getByText('Total Days')).toBeVisible();
  });

  test('analytics shows workload distribution', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    await scrollClick(page.getByRole('button', { name: 'Generate watch schedule' }));
    await page.getByRole('button', { name: 'Analytics' }).click();

    await expect(page.getByText('Workload Distribution')).toBeVisible();
  });
});

// ─── Language Switching ──────────────────────────────────────────────────────

test.describe('Language Switching', () => {
  test('switching to Polish changes UI labels', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    await expect(page.getByRole('button', { name: 'Generate watch schedule' })).toBeVisible();

    await page.getByRole('button', { name: 'Przełącz na Polski' }).click();

    await expect(page.getByRole('button', { name: 'Generuj harmonogram wacht' })).toBeVisible();
  });

  test('switching language back to English restores labels', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    await page.getByRole('button', { name: 'Przełącz na Polski' }).click();
    await expect(page.getByRole('button', { name: 'Generuj harmonogram wacht' })).toBeVisible();

    await page.getByRole('button', { name: 'Switch to English' }).click();
    await expect(page.getByRole('button', { name: 'Generate watch schedule' })).toBeVisible();
  });

  test('cross-day warning message updates on language switch', async ({ setLocalStorage }) => {
    const page = await setLocalStorage(MODULES.wachtownik, [
      {
        key: STORAGE_KEYS.sailingSchedule,
        value: buildState({
          slots: [
            { id: '1', start: '23:00', end: '01:00', reqCrew: 2 },
            { id: '2', start: '01:00', end: '12:00', reqCrew: 2 },
            { id: '3', start: '12:00', end: '23:00', reqCrew: 2 },
          ],
        }),
      },
    ]);
    await waitForApp(page);

    const warningBanner = page.locator('[data-testid="slot-warnings-banner"]');
    await expect(warningBanner).toContainText('midnight');

    await page.getByRole('button', { name: 'Przełącz na Polski' }).click();

    await expect(warningBanner).toContainText('północ');
  });
});

// ─── Undo/Redo ───────────────────────────────────────────────────────────────

test.describe('Undo/Redo', () => {
  test('undo button is disabled initially', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    const undoBtn = page.getByRole('button', { name: 'Undo last change' });
    await expect(undoBtn).toBeDisabled();
  });

  test('undo reverts crew addition', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    const nameInput = page.getByPlaceholder('Imię...');
    await nameInput.scrollIntoViewIfNeeded();
    await nameInput.fill('UndoTest');
    await scrollClick(page.getByRole('button', { name: 'Add person' }));
    await expect(page.getByText('UndoTest')).toBeVisible();
    await expect(page.getByText('(6/15)')).toBeVisible();

    const undoBtn = page.getByRole('button', { name: 'Undo last change' });
    await expect(undoBtn).toBeEnabled();
    await undoBtn.click();

    await expect(page.getByText('UndoTest')).not.toBeVisible();
    await expect(page.getByText('(5/15)')).toBeVisible();
  });

  test('redo restores undone action', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    const nameInput = page.getByPlaceholder('Imię...');
    await nameInput.scrollIntoViewIfNeeded();
    await nameInput.fill('RedoTest');
    await scrollClick(page.getByRole('button', { name: 'Add person' }));
    await expect(page.getByText('RedoTest')).toBeVisible();

    await page.getByRole('button', { name: 'Undo last change' }).click();
    await expect(page.getByText('RedoTest')).not.toBeVisible();

    const redoBtn = page.getByRole('button', { name: 'Redo last undone change' });
    await expect(redoBtn).toBeEnabled();
    await redoBtn.click();

    await expect(page.getByText('RedoTest')).toBeVisible();
  });

  test('redo button is disabled when there is nothing to redo', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    const redoBtn = page.getByRole('button', { name: 'Redo last undone change' });
    await expect(redoBtn).toBeDisabled();
  });
});

// ─── Cruise Settings ─────────────────────────────────────────────────────────

test.describe('Cruise Settings', () => {
  test('can change cruise duration', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    const durationInput = page.locator('input[type="number"][min="1"][max="60"]');
    await durationInput.scrollIntoViewIfNeeded();
    await durationInput.fill('7');

    await scrollClick(page.getByRole('button', { name: 'Generate watch schedule' }));
    await expect(page.locator('#print-schedule-section')).toBeVisible();

    const tableText = await page.locator('#print-schedule-table').textContent();
    expect(tableText).toContain('Day 7');
  });

  test('captain participates toggle affects schedule', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    const captainLabel = page.locator('label').filter({ hasText: 'Kapitan uczestniczy w wachtach' });
    await captainLabel.scrollIntoViewIfNeeded();
    await captainLabel.click();

    await scrollClick(page.getByRole('button', { name: 'Generate watch schedule' }));
    await expect(page.locator('#print-schedule-section')).toBeVisible();

    const tableText = await page.locator('#print-schedule-table').textContent();
    expect(tableText).not.toContain('Anna');
  });

  test('start date can be changed', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    const dateInput = page.locator('input[type="date"]');
    await dateInput.scrollIntoViewIfNeeded();
    await dateInput.fill('2025-06-15');

    await scrollClick(page.getByRole('button', { name: 'Generate watch schedule' }));
    const tableText = await page.locator('#print-schedule-section').textContent();
    expect(tableText).toContain('2025');
  });
});

// ─── Slot Modification ───────────────────────────────────────────────────────

test.describe('Slot Modification', () => {
  test('can modify slot start time', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    const firstRow = page.locator('#slots-configuration-desktop tbody tr').first();
    const startInput = firstRow.locator('input[type="time"]').first();
    await startInput.fill('01:00');
    await expect(startInput).toHaveValue('01:00');
  });

  test('can modify slot end time', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    const firstRow = page.locator('#slots-configuration-desktop tbody tr').first();
    const endInput = firstRow.locator('input[type="time"]').nth(1);
    await endInput.fill('05:00');
    await expect(endInput).toHaveValue('05:00');
  });

  test('can modify required crew count', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    const firstRow = page.locator('#slots-configuration-desktop tbody tr').first();
    const crewInput = firstRow.locator('input[type="number"]');
    await crewInput.fill('3');
    await expect(crewInput).toHaveValue('3');
  });

  test('overlapping slots show overlap warning', async ({ setLocalStorage }) => {
    const page = await setLocalStorage(MODULES.wachtownik, [
      {
        key: STORAGE_KEYS.sailingSchedule,
        value: buildState({
          slots: [
            { id: '1', start: '00:00', end: '08:00', reqCrew: 2 },
            { id: '2', start: '06:00', end: '14:00', reqCrew: 2 },
            { id: '3', start: '14:00', end: '24:00', reqCrew: 2 },
          ],
        }),
      },
    ]);
    await waitForApp(page);

    const warningBanner = page.locator('[data-testid="slot-warnings-banner"]');
    await expect(warningBanner).toBeVisible();
    await expect(warningBanner).toContainText('overlaps');
  });
});

// ─── Schedule Table Interactions ─────────────────────────────────────────────

test.describe('Schedule Table Interactions', () => {
  test('schedule table shows day labels', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    await scrollClick(page.getByRole('button', { name: 'Generate watch schedule' }));
    await page.getByRole('button', { name: 'Schedule', exact: true }).click();

    await expect(page.locator('#print-schedule-table').getByText('Day 1')).toBeVisible();
    await expect(page.locator('#print-schedule-table').getByText('Day 2')).toBeVisible();
    await expect(page.locator('#print-schedule-table').getByText('Day 3')).toBeVisible();
  });

  test('schedule contains summary and export section', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    await scrollClick(page.getByRole('button', { name: 'Generate watch schedule' }));
    await page.getByRole('button', { name: 'Schedule', exact: true }).click();

    await expect(page.getByText('Summary and Export')).toBeVisible();
  });

  test('re-generating schedule updates the table', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    await scrollClick(page.getByRole('button', { name: 'Generate watch schedule' }));
    await expect(page.locator('#print-schedule-table')).toBeVisible();

    await page.getByRole('button', { name: 'Setup' }).click();
    await scrollClick(page.getByRole('button', { name: /3 watches × 8h/ }).last());

    await scrollClick(page.getByRole('button', { name: 'Generate watch schedule' }));
    await expect(page.locator('#print-schedule-table')).toBeVisible();
  });
});

// ─── Recommended Systems ─────────────────────────────────────────────────────

test.describe('Recommended Systems', () => {
  test('recommendations section is visible with sufficient crew', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    await expect(page.getByText('Recommended systems for your cruise')).toBeVisible();
  });

  test('recommended system shows "Best" badge on first recommendation', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    await expect(page.getByText('Best')).toBeVisible();
  });

  test('clicking a recommendation applies the template', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    const desktopSlots = page.locator('#slots-configuration-desktop');
    await expect(desktopSlots.locator('tbody tr')).toHaveCount(6);

    // Click first recommendation
    const recsSection = page.locator('text=Recommended systems for your cruise').locator('..').locator('..');
    const firstRecButton = recsSection.locator('button').first();
    await scrollClick(firstRecButton);

    const count = await desktopSlots.locator('tbody tr').count();
    expect(count).toBeGreaterThan(0);
  });
});

// ─── Live Dashboard ──────────────────────────────────────────────────────────

test.describe('Live Dashboard', () => {
  test('live dashboard appears on schedule tab after generation', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    await scrollClick(page.getByRole('button', { name: 'Generate watch schedule' }));

    await expect(page.getByText('Live Navigation Panel')).toBeVisible();
  });

  test('live dashboard shows cruise progress', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    await scrollClick(page.getByRole('button', { name: 'Generate watch schedule' }));

    await expect(page.getByText('Cruise Progress')).toBeVisible();
  });

  test('live dashboard shows upcoming watch info', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    await scrollClick(page.getByRole('button', { name: 'Generate watch schedule' }));

    await expect(page.getByText('Up Next')).toBeVisible();
  });
});

// ─── Help Panel ──────────────────────────────────────────────────────────────

test.describe('Help Panel', () => {
  test('help section is visible on setup tab', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    await expect(page.getByText('Szybka pomoc')).toBeVisible();
  });

  test('help section shows step-by-step instructions', async ({ page }) => {
    await page.goto(MODULES.wachtownik);
    await waitForApp(page);

    await expect(page.getByText('Krok 1:')).toBeVisible();
    await expect(page.getByText('Krok 2:')).toBeVisible();
    await expect(page.getByText('Krok 3:')).toBeVisible();
    await expect(page.getByText('Krok 4:')).toBeVisible();
  });
});
