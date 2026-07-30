import { test, expect } from './fixtures.js';
import type { Page } from '@playwright/test';
import { MODULES } from './helpers.js';

const GOTO_OPTS = { waitUntil: 'networkidle' as const };

async function openSection(page: Page, label: string) {
  await page.getByRole('button', { name: label, exact: true }).click();
}

test.describe('Żeglowanie — complete user journeys', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(MODULES.zeglowanie, GOTO_OPTS);
    await expect(page.getByRole('heading', { name: 'Informacje o Żeglarstwie' })).toBeVisible();
  });

  test('packing choices persist, switch cruise type, and reset', async ({ page }) => {
    const firstItem = page.getByRole('checkbox').first();
    await expect(firstItem).toHaveAttribute('aria-checked', 'false');
    await firstItem.click();
    await expect(firstItem).toHaveAttribute('aria-checked', 'true');

    const storedPackingEntry = await page.evaluate(() =>
      Object.entries(localStorage).find(
        ([key, value]) => key.startsWith('sailing-baltic-autumn-') && value === 'true',
      ),
    );
    expect(storedPackingEntry).toBeTruthy();

    await page.reload(GOTO_OPTS);
    await expect(page.getByRole('checkbox').first()).toHaveAttribute('aria-checked', 'true');

    await page.getByRole('button', { name: /Chorwacja/ }).click();
    await expect(page.getByRole('checkbox')).toHaveCount(24);
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('zeglowanie_selected_cruise_type')))
      .toBe('croatia-summer');

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Wyczyść obecną listę' }).click();
    await expect(page.getByRole('checkbox').first()).toHaveAttribute('aria-checked', 'false');
  });

  test('all navigation sections and briefing variants are usable and persisted', async ({
    page,
  }) => {
    await openSection(page, 'Zakupy');
    await expect(page.getByText('Lista Zakupów i Pomysły na Dania')).toBeVisible();

    await openSection(page, 'Briefing');
    await expect(page.getByText(/Briefing zerowy - Checklista/)).toBeVisible();
    const firstBriefingItem = page.getByRole('checkbox').first();
    await firstBriefingItem.press('Enter');
    await expect(firstBriefingItem).toHaveAttribute('aria-checked', 'true');

    await page.getByRole('button', { name: /Briefing pierwszy dzień/ }).click();
    await expect(page.getByText(/Briefing pierwszy dzień - Checklista/)).toBeVisible();
    await page.getByRole('checkbox').first().press(' ');
    await expect(page.getByRole('checkbox').first()).toHaveAttribute('aria-checked', 'true');

    await page.reload(GOTO_OPTS);
    await expect(page.getByText(/Briefing pierwszy dzień - Checklista/)).toBeVisible();
    await expect(page.getByRole('checkbox').first()).toHaveAttribute('aria-checked', 'true');

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Wyczyść checklistę' }).click();
    await expect(page.getByRole('checkbox').first()).toHaveAttribute('aria-checked', 'false');
  });

  test('every operational checklist variant can be selected and reset', async ({ page }) => {
    await openSection(page, 'Checklisty');

    const variants = [
      { name: /Codziennie rano/, count: 7 },
      { name: /Wyjście z portu/, count: 13 },
      { name: /Cumowanie/, count: 11 },
      { name: /Grab bag/, count: 8 },
    ];

    for (const variant of variants) {
      await page.getByRole('button', { name: variant.name }).click();
      await expect(page.getByRole('checkbox')).toHaveCount(variant.count);
      await page.getByRole('checkbox').first().click();
      await expect(page.getByRole('checkbox').first()).toHaveAttribute('aria-checked', 'true');
    }

    page.once('dialog', (dialog) => dialog.dismiss());
    await page.getByRole('button', { name: 'Wyczyść obecną checklistę' }).click();
    await expect(page.getByRole('checkbox').first()).toHaveAttribute('aria-checked', 'true');

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Wyczyść obecną checklistę' }).click();
    await expect(page.getByRole('checkbox').first()).toHaveAttribute('aria-checked', 'false');
  });

  test('VHF knowledge renders all operational channel groups', async ({ page }) => {
    await openSection(page, 'Wiedza');
    await page.getByRole('button', { name: /^📻 VHF/ }).click();

    await expect(page.getByRole('heading', { name: /Kanały VHF/ })).toBeVisible();
    await expect(page.getByText('Polish Rescue Radio')).toBeVisible();
    await expect(page.getByText('VTS Zatoka')).toBeVisible();
    await expect(page.getByText('anons 16, 71 · emisja 66')).toBeVisible();
    await expect(page.getByText('Elbląg i wszystkie porty Zalewu Wiślanego')).toBeVisible();
  });

  test('ship-light viewer covers vessel families, night lights, and day marks', async ({
    page,
  }) => {
    test.slow();
    await openSection(page, 'Wiedza');
    await expect(page.locator('canvas')).toBeVisible();
    await expect(page.getByText('Prawidło 23(a)')).toBeVisible();

    const representativeProfiles = [
      /Motorowy ≥ 50m/,
      /Żaglowy w drodze/,
      /Trałowiec < 50m/,
      /Holownik \(hol ≤ 200m\)/,
      /Na kotwicy \(≥ 50m\)/,
      /Niezdolny do manewru/,
      /Ograniczona zdolność manewru/,
      /Ograniczony zanurzeniem/,
      /Trałowiec \(min\)/,
      /Statek pilotowy/,
      /Poduszkowiec/,
      /Obiekt holowany \(hol > 200m\)/,
    ];

    for (const name of representativeProfiles) {
      await page.getByRole('button', { name }).click();
      await expect(page.locator('canvas')).toBeVisible();
    }

    await page.getByRole('button', { name: /Dzień|Noc/ }).click();
    await expect(page.getByRole('button', { name: /Dzień/ })).toBeVisible();
    await expect(page.getByText(/Kula|Stożek|Walec|Romb/).first()).toBeVisible();

    await page.getByRole('button', { name: /Dzień/ }).click();
    await expect(page.getByRole('button', { name: /Noc/ })).toBeVisible();
    await expect(page.getByText(/Światło/).first()).toBeVisible();
  });
});
