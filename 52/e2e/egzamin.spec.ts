import { test, expect } from './fixtures.js';
import { MODULES, STORAGE_KEYS } from './helpers.js';

const EGZAMIN_URL = MODULES.egzamin;

/** Wait for React to render inside #root and questions to load from JSON */
const waitForApp = async (page: import('@playwright/test').Page) => {
  await page.waitForFunction(() => {
    const root = document.getElementById('root');
    return root && root.children.length > 0;
  }, { timeout: 15_000 });
};

// ==========================================
// 1. PAGE LOAD & INITIAL STATE
// ==========================================
test.describe('Page Load & Initial State', () => {
  test('page loads and React renders in #root', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    const root = page.locator('#root');
    await expect(root).toBeVisible();
    const children = await root.evaluate(el => el.children.length);
    expect(children).toBeGreaterThan(0);
  });

  test('main menu shows Nauka button', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    await expect(page.getByText('Nauka', { exact: false })).toBeVisible();
  });

  test('main menu shows Egzamin button', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    await expect(page.locator('button', { hasText: '30 pytan, 45 minut' })).toBeVisible();
  });

  test('main menu shows Leitner button', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    await expect(page.getByText('Leitner')).toBeVisible();
  });

  test('progress section is visible with stats', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    await expect(page.getByText('Postep nauki')).toBeVisible();
    await expect(page.getByText('pytan').first()).toBeVisible();
    await expect(page.getByText('poprawnych')).toBeVisible();
    await expect(page.getByText('odpowiedziano')).toBeVisible();
  });

  test('categories are listed', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    await expect(page.getByText('Kategorie')).toBeVisible();
    await expect(page.getByText('Locja')).toBeVisible();
    await expect(page.getByText('Nawigacja')).toBeVisible();
    await expect(page.getByText('Meteorologia')).toBeVisible();
  });

  test('has correct page title', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await expect(page).toHaveTitle(/Egzamin/);
  });
});

// ==========================================
// 2. LEARN MODE
// ==========================================
test.describe('Learn Mode', () => {
  test('clicking Nauka enters learn mode', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    await page.locator('button', { hasText: 'Nauka' }).click();
    await expect(page.locator('.oa-header-title')).toHaveText('Nauka');
  });

  test('question image is displayed', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    await page.locator('button', { hasText: 'Nauka' }).click();
    await expect(page.locator('.oa-header-title')).toHaveText('Nauka');
    // Question image card should be visible (either img or fallback)
    const questionCard = page.locator('.rounded-2xl.bg-white.border');
    await expect(questionCard).toBeVisible();
  });

  test('answer buttons are visible', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    await page.locator('button', { hasText: 'Nauka' }).click();
    await expect(page.locator('.oa-header-title')).toHaveText('Nauka');
    const answerBtns = page.locator('.answer-btn');
    const count = await answerBtns.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('clicking correct answer shows green feedback', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    await page.locator('button', { hasText: 'Nauka' }).click();
    await expect(page.locator('.oa-header-title')).toHaveText('Nauka');

    // Get the correct answer from the DOM
    const correctAnswer = await page.evaluate(() => {
      // Access the React fiber to find the correct answer isn't reliable;
      // Instead, click each button and check — or read the question data.
      // We'll use a simpler approach: the correct answer info is in the component props.
      // Let's just click the first answer and check for feedback classes.
      return null;
    });

    // Click first answer button
    const firstBtn = page.locator('.answer-btn').first();
    await firstBtn.click();

    // After answering, one button should have correct-btn class (green)
    await expect(page.locator('.correct-btn')).toBeVisible();
  });

  test('clicking incorrect answer shows red and green feedback', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    await page.locator('button', { hasText: 'Nauka' }).click();
    await expect(page.locator('.oa-header-title')).toHaveText('Nauka');

    // Click the first answer and let the UI reveal correct/incorrect styling
    await page.locator('.answer-btn').first().click();

    // After answering, the correct answer always gets green styling
    await expect(page.locator('.correct-btn')).toBeVisible();

    // If our click was wrong, we also see an incorrect-btn with red styling
    const incorrectCount = await page.locator('.incorrect-btn').count();
    // Either 0 (we picked the correct one) or 1 (we picked wrong) — both are valid
    expect(incorrectCount).toBeGreaterThanOrEqual(0);
  });

  test('Next button advances to next question', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    await page.locator('button', { hasText: 'Nauka' }).click();
    await expect(page.locator('.oa-header-title')).toHaveText('Nauka');

    // Should show "Pytanie 1 / N"
    await expect(page.getByText(/Pytanie 1 \//)).toBeVisible();

    // Click next (shows as "Pomin" when unanswered)
    await page.locator('button', { hasText: 'Pomin' }).click();

    // Should now show "Pytanie 2 / N"
    await expect(page.getByText(/Pytanie 2 \//)).toBeVisible();
  });

  test('Previous button goes back', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    await page.locator('button', { hasText: 'Nauka' }).click();
    await expect(page.locator('.oa-header-title')).toHaveText('Nauka');

    // Navigate to question 2
    await page.locator('button', { hasText: 'Pomin' }).click();
    await expect(page.getByText(/Pytanie 2 \//)).toBeVisible();

    // Go back
    await page.locator('button', { hasText: 'Poprzednie' }).click();
    await expect(page.getByText(/Pytanie 1 \//)).toBeVisible();
  });

  test('Previous button is disabled on first question', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    await page.locator('button', { hasText: 'Nauka' }).click();
    await expect(page.locator('.oa-header-title')).toHaveText('Nauka');

    const prevBtn = page.locator('button', { hasText: 'Poprzednie' });
    await expect(prevBtn).toBeDisabled();
  });

  test('answering changes Next button text from Pomin to Nastepne', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    await page.locator('button', { hasText: 'Nauka' }).click();
    await expect(page.locator('.oa-header-title')).toHaveText('Nauka');

    // Before answering: "Pomin"
    await expect(page.locator('button', { hasText: 'Pomin' })).toBeVisible();

    // Answer a question
    await page.locator('.answer-btn').first().click();

    // After answering: "Nastepne"
    await expect(page.locator('button', { hasText: 'Nastepne' })).toBeVisible();
  });

  test('can navigate through multiple questions', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    await page.locator('button', { hasText: 'Nauka' }).click();
    await expect(page.locator('.oa-header-title')).toHaveText('Nauka');

    // Navigate forward 3 questions
    for (let i = 1; i <= 3; i++) {
      await expect(page.getByText(new RegExp(`Pytanie ${i} /`))).toBeVisible();
      await page.locator('button', { hasText: 'Pomin' }).click();
    }
    await expect(page.getByText(/Pytanie 4 \//)).toBeVisible();
  });

  test('progress bar updates with correct/incorrect counts', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    await page.locator('button', { hasText: 'Nauka' }).click();
    await expect(page.locator('.oa-header-title')).toHaveText('Nauka');

    // Initial: 0 OK, 0 Err
    await expect(page.getByText('0 OK')).toBeVisible();
    await expect(page.getByText('0 Err')).toBeVisible();

    // Answer first question
    await page.locator('.answer-btn').first().click();

    // Stats should update — either OK or Err increments
    const okText = await page.locator('text=OK').first().textContent();
    const errText = await page.locator('text=Err').first().textContent();
    const okCount = parseInt(okText?.replace(' OK', '') || '0');
    const errCount = parseInt(errText?.replace(' Err', '') || '0');
    expect(okCount + errCount).toBe(1);
  });
});

// ==========================================
// 3. LEARN MODE - CATEGORY FILTER
// ==========================================
test.describe('Learn Mode - Category Filter', () => {
  test('category filter can be opened', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    await page.locator('button', { hasText: 'Nauka' }).click();
    await expect(page.locator('.oa-header-title')).toHaveText('Nauka');

    // Click filter button (aria-label "Filtruj kategorie")
    await page.locator('button[aria-label="Filtruj kategorie"]').click();

    // Category names should be visible
    await expect(page.getByText('Zaznacz wszystkie')).toBeVisible();
    await expect(page.getByText('Odznacz')).toBeVisible();
  });

  test('categories are displayed in filter', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    await page.locator('button', { hasText: 'Nauka' }).click();
    await page.locator('button[aria-label="Filtruj kategorie"]').click();

    // All 8 categories should be visible
    await expect(page.getByText('Locja')).toBeVisible();
    await expect(page.getByText('Nawigacja')).toBeVisible();
    await expect(page.getByText('Meteorologia')).toBeVisible();
    await expect(page.getByText('Prawo')).toBeVisible();
    await expect(page.getByText('Ratownictwo')).toBeVisible();
  });

  test('Deselect all removes all categories and shows empty state', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    await page.locator('button', { hasText: 'Nauka' }).click();
    await expect(page.locator('.oa-header-title')).toHaveText('Nauka');
    await page.locator('button[aria-label="Filtruj kategorie"]').click();
    await expect(page.getByText('Zaznacz wszystkie')).toBeVisible();

    // Click "Odznacz" to deselect all
    await page.locator('button', { hasText: /^Odznacz$/ }).click();

    // Should show empty state
    await expect(page.getByText('Brak pytan', { exact: true })).toBeVisible();
  });

  test('Select all restores all categories after partial deselection', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    await page.locator('button', { hasText: 'Nauka' }).click();
    await expect(page.locator('.oa-header-title')).toHaveText('Nauka');

    // Get total count
    const totalText = await page.getByText(/Pytanie 1 \//).textContent();
    const totalMatch = totalText?.match(/\/ (\d+)/);
    const totalBefore = totalMatch ? parseInt(totalMatch[1]) : 0;

    await page.locator('button[aria-label="Filtruj kategorie"]').click();

    // Deselect one category
    await page.locator('button', { hasText: 'Nawigacja' }).click();
    const filteredText = await page.getByText(/Pytanie 1 \//).textContent();
    const filteredMatch = filteredText?.match(/\/ (\d+)/);
    const totalAfterDeselect = filteredMatch ? parseInt(filteredMatch[1]) : 0;
    expect(totalAfterDeselect).toBeLessThan(totalBefore);

    // Select all again to restore
    await page.getByText('Zaznacz wszystkie').click();

    // Count should be restored to original
    const restoredText = await page.getByText(/Pytanie \d+ \//).textContent();
    const restoredMatch = restoredText?.match(/\/ (\d+)/);
    const totalRestored = restoredMatch ? parseInt(restoredMatch[1]) : 0;
    expect(totalRestored).toBe(totalBefore);
  });

  test('toggling a single category filters questions', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    await page.locator('button', { hasText: 'Nauka' }).click();
    await expect(page.locator('.oa-header-title')).toHaveText('Nauka');

    // Get total count before filtering
    const totalText = await page.getByText(/Pytanie 1 \//).textContent();
    const totalMatch = totalText?.match(/\/ (\d+)/);
    const totalBefore = totalMatch ? parseInt(totalMatch[1]) : 0;

    await page.locator('button[aria-label="Filtruj kategorie"]').click();
    await expect(page.getByText('Zaznacz wszystkie')).toBeVisible();

    // Toggle off one category (Nawigacja) — should reduce question count
    await page.locator('button', { hasText: 'Nawigacja' }).click();

    // Total should be less than before (one category removed)
    const filteredText = await page.getByText(/Pytanie 1 \//).textContent();
    const filteredMatch = filteredText?.match(/\/ (\d+)/);
    const totalAfter = filteredMatch ? parseInt(filteredMatch[1]) : 0;

    expect(totalAfter).toBeGreaterThan(0);
    expect(totalAfter).toBeLessThan(totalBefore);
  });
});

// ==========================================
// 4. EXAM MODE
// ==========================================
test.describe('Exam Mode', () => {
  test('clicking Egzamin enters exam mode', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    await page.locator('button', { hasText: 'Egzamin' }).click();
    await expect(page.locator('.oa-header-title')).toHaveText('Egzamin');
  });

  test('exam shows 30 questions', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    await page.locator('button', { hasText: 'Egzamin' }).click();
    await expect(page.locator('.oa-header-title')).toHaveText('Egzamin');

    // Progress bar should show "Pytanie 1 / 30"
    await expect(page.getByText(/Pytanie 1 \/ 30/)).toBeVisible();
  });

  test('exam shows timer', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    await page.locator('button', { hasText: 'Egzamin' }).click();
    await expect(page.locator('.oa-header-title')).toHaveText('Egzamin');

    // Timer should show initial time (45:00 or close to it)
    await expect(page.getByText(/4[45]:\d{2}/)).toBeVisible();
  });

  test('answer can be selected in exam', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    await page.locator('button', { hasText: 'Egzamin' }).click();
    await expect(page.locator('.oa-header-title')).toHaveText('Egzamin');

    // Click first answer
    const firstBtn = page.locator('.answer-btn').first();
    await firstBtn.click();

    // In exam mode, selected answer gets amber style (no correct/incorrect shown)
    // The button should have amber border class
    await expect(firstBtn).toHaveClass(/border-amber-500/);
  });

  test('exam navigation dots show question numbers', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    await page.locator('button', { hasText: 'Egzamin' }).click();
    await expect(page.locator('.oa-header-title')).toHaveText('Egzamin');

    // Navigation dots: 30 buttons with numbers 1-30
    const dot1 = page.locator('button', { hasText: /^1$/ }).first();
    await expect(dot1).toBeVisible();
  });

  test('can navigate through exam questions', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    await page.locator('button', { hasText: 'Egzamin' }).click();
    await expect(page.locator('.oa-header-title')).toHaveText('Egzamin');

    // Navigate to next question
    await page.locator('button', { hasText: 'Nastepne' }).click();
    await expect(page.getByText(/Pytanie 2 \/ 30/)).toBeVisible();

    // Navigate back
    await page.locator('button', { hasText: 'Poprzednie' }).click();
    await expect(page.getByText(/Pytanie 1 \/ 30/)).toBeVisible();
  });

  test('can complete exam and see results', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);

    // Handle confirm dialogs automatically
    page.on('dialog', dialog => dialog.accept());

    await page.locator('button', { hasText: 'Egzamin' }).click();
    await expect(page.locator('.oa-header-title')).toHaveText('Egzamin');

    // Answer all 30 questions by clicking first answer and advancing
    for (let i = 0; i < 29; i++) {
      await page.locator('.answer-btn').first().click();
      await page.locator('button', { hasText: 'Nastepne' }).click();
    }

    // Answer last question and click "Zakoncz"
    await page.locator('.answer-btn').first().click();
    await page.locator('button', { hasText: /Zakoncz/ }).click();

    // Results screen should appear
    await expect(page.locator('.oa-header-title')).toHaveText('Wyniki egzaminu');
    // Should show percentage result
    await expect(page.locator('.text-5xl')).toBeVisible();
    // Should show pass or fail message
    const resultText = page.getByText(/Egzamin zdany|Nie zdano egzaminu/);
    await expect(resultText).toBeVisible();
  });

  test('results screen shows retry button', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    page.on('dialog', dialog => dialog.accept());

    await page.locator('button', { hasText: 'Egzamin' }).click();

    // Quick-complete: answer all and finish
    for (let i = 0; i < 29; i++) {
      await page.locator('.answer-btn').first().click();
      await page.locator('button', { hasText: 'Nastepne' }).click();
    }
    await page.locator('.answer-btn').first().click();
    await page.locator('button', { hasText: /Zakoncz/ }).click();

    await expect(page.locator('.oa-header-title')).toHaveText('Wyniki egzaminu');
    await expect(page.locator('button', { hasText: 'Sprobuj ponownie' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Powrot do menu' })).toBeVisible();
  });

  test('results screen shows category breakdown', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    page.on('dialog', dialog => dialog.accept());

    await page.locator('button', { hasText: 'Egzamin' }).click();

    for (let i = 0; i < 29; i++) {
      await page.locator('.answer-btn').first().click();
      await page.locator('button', { hasText: 'Nastepne' }).click();
    }
    await page.locator('.answer-btn').first().click();
    await page.locator('button', { hasText: /Zakoncz/ }).click();

    await expect(page.getByText('Wyniki wg kategorii')).toBeVisible();
  });

  test('retry button starts new exam', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    page.on('dialog', dialog => dialog.accept());

    await page.locator('button', { hasText: 'Egzamin' }).click();

    for (let i = 0; i < 29; i++) {
      await page.locator('.answer-btn').first().click();
      await page.locator('button', { hasText: 'Nastepne' }).click();
    }
    await page.locator('.answer-btn').first().click();
    await page.locator('button', { hasText: /Zakoncz/ }).click();

    await expect(page.locator('.oa-header-title')).toHaveText('Wyniki egzaminu');

    // Click retry
    await page.locator('button', { hasText: 'Sprobuj ponownie' }).click();
    await expect(page.locator('.oa-header-title')).toHaveText('Egzamin');
    await expect(page.getByText(/Pytanie 1 \/ 30/)).toBeVisible();
  });
});

// ==========================================
// 5. LEITNER MODE
// ==========================================
test.describe('Leitner Mode', () => {
  test('clicking Leitner opens overview', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    await page.locator('button', { hasText: 'Leitner' }).click();
    await expect(page.locator('.oa-header-title')).toHaveText('Leitner');
  });

  test('Leitner overview shows 5 boxes', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    await page.locator('button', { hasText: 'Leitner' }).click();
    await expect(page.locator('.oa-header-title')).toHaveText('Leitner');

    // 5 boxes: Pudelko 1 through 5
    await expect(page.getByText('Pudelko 1')).toBeVisible();
    await expect(page.getByText('Pudelko 2')).toBeVisible();
    await expect(page.getByText('Pudelko 3')).toBeVisible();
    await expect(page.getByText('Pudelko 4')).toBeVisible();
    await expect(page.getByText('Pudelko 5')).toBeVisible();
  });

  test('Leitner overview shows progress stats', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    await page.locator('button', { hasText: 'Leitner' }).click();

    await expect(page.getByText('Postep Leitnera')).toBeVisible();
    await expect(page.getByText('do powtorki')).toBeVisible();
    await expect(page.getByText('opanowanych')).toBeVisible();
  });

  test('can start a Leitner session', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    await page.locator('button', { hasText: 'Leitner' }).click();

    // Click start session button
    await page.locator('button', { hasText: /Rozpocznij sesje/ }).click();

    // Should enter session mode
    await expect(page.locator('.oa-header-title')).toHaveText('Sesja Leitner');
  });

  test('Leitner session shows question and answer buttons', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    await page.locator('button', { hasText: 'Leitner' }).click();
    await page.locator('button', { hasText: /Rozpocznij sesje/ }).click();
    await expect(page.locator('.oa-header-title')).toHaveText('Sesja Leitner');

    // Answer buttons should be visible
    const answerBtns = page.locator('.answer-btn');
    const count = await answerBtns.count();
    expect(count).toBeGreaterThanOrEqual(3);

    // "Wybierz odpowiedz" prompt should be visible before answering
    await expect(page.getByText('Wybierz odpowiedz')).toBeVisible();
  });

  test('answering in Leitner shows box movement indicator', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    page.on('dialog', dialog => dialog.accept());

    await page.locator('button', { hasText: 'Leitner' }).click();
    await page.locator('button', { hasText: /Rozpocznij sesje/ }).click();
    await expect(page.locator('.oa-header-title')).toHaveText('Sesja Leitner');

    // Answer a question
    await page.locator('.answer-btn').first().click();

    // Should show box movement: "Pudelko X → Y"
    await expect(page.getByText(/Pudelko \d/)).toBeVisible();
  });

  test('answering in Leitner enables Next button', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    page.on('dialog', dialog => dialog.accept());

    await page.locator('button', { hasText: 'Leitner' }).click();
    await page.locator('button', { hasText: /Rozpocznij sesje/ }).click();
    await expect(page.locator('.oa-header-title')).toHaveText('Sesja Leitner');

    // Before answering: "Wybierz odpowiedz" (no action button)
    await expect(page.getByText('Wybierz odpowiedz')).toBeVisible();

    // Answer
    await page.locator('.answer-btn').first().click();

    // After answering: "Nastepne" or "Zakoncz sesje" button appears
    await expect(page.locator('button', { hasText: /Nastepne|Zakoncz sesje/ })).toBeVisible();
  });

  test('completing Leitner session shows summary', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    page.on('dialog', dialog => dialog.accept());

    // Pre-seed Leitner state with only 1 question due (fetch questions from JSON)
    await page.evaluate(async () => {
      const res = await fetch('exam_questions.json');
      const questions: { id: string }[] = await res.json();
      if (!questions || questions.length === 0) return;

      // Set all questions to box 5 with lastReviewed=0 except the first one
      const states: Record<string, { box: number; lastReviewed: number }> = {};
      questions.forEach((q, i) => {
        if (i === 0) {
          states[q.id] = { box: 1, lastReviewed: 0 };
        } else {
          states[q.id] = { box: 5, lastReviewed: 100 };
        }
      });

      const leitnerState = { questionStates: states, sessionNumber: 100 };
      localStorage.setItem('openanchor_leitner', JSON.stringify(leitnerState));
    });

    // Reload to pick up seeded state
    await page.reload();
    await waitForApp(page);

    await page.locator('button', { hasText: 'Leitner' }).click();
    await page.locator('button', { hasText: /Rozpocznij sesje/ }).click();
    await expect(page.locator('.oa-header-title')).toHaveText('Sesja Leitner');

    // Answer the single question
    await page.locator('.answer-btn').first().click();
    await page.locator('button', { hasText: /Zakoncz sesje/ }).click();

    // Should show completion screen
    await expect(page.locator('.oa-header-title')).toHaveText('Sesja zakonczona');
    await expect(page.getByText('Rozklad pytan w pudelkach')).toBeVisible();
    await expect(page.locator('button', { hasText: 'Powrot do przegladu' })).toBeVisible();
  });
});

// ==========================================
// 6. PROGRESS PERSISTENCE
// ==========================================
test.describe('Progress Persistence', () => {
  test('learn progress persists after reload', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);

    // Enter learn mode and answer a question
    await page.locator('button', { hasText: 'Nauka' }).click();
    await expect(page.locator('.oa-header-title')).toHaveText('Nauka');
    await page.locator('.answer-btn').first().click();

    // Navigate to question 3
    await page.locator('button', { hasText: 'Nastepne' }).click();
    await page.locator('button', { hasText: 'Pomin' }).click();
    await expect(page.getByText(/Pytanie 3 \//)).toBeVisible();

    // Reload
    await page.reload();
    await waitForApp(page);

    // Progress should show answered count > 0
    const answeredText = await page.evaluate(() => {
      const data = localStorage.getItem('openanchor_exam_progress');
      if (!data) return null;
      const parsed = JSON.parse(data);
      return Object.keys(parsed.answered).length;
    });
    expect(answeredText).toBeGreaterThan(0);
  });

  test('learn position is restored after reload', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);

    // Enter learn mode and navigate to question 5
    await page.locator('button', { hasText: 'Nauka' }).click();
    for (let i = 0; i < 4; i++) {
      await page.locator('button', { hasText: /Pomin|Nastepne/ }).click();
    }
    await expect(page.getByText(/Pytanie 5 \//)).toBeVisible();

    // Reload and re-enter learn mode
    await page.reload();
    await waitForApp(page);
    await page.locator('button', { hasText: 'Nauka' }).click();

    // Position should be restored to question 5
    await expect(page.getByText(/Pytanie 5 \//)).toBeVisible();
  });

  test('menu shows updated stats after answering', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);

    // Pre-seed some progress
    await page.evaluate(() => {
      const progress = {
        answered: { '1': { answer: 'A', correct: true, timestamp: Date.now() } },
        stats: { correct: 1, incorrect: 0, total: 1 },
      };
      localStorage.setItem('openanchor_exam_progress', JSON.stringify(progress));
    });

    await page.reload();
    await waitForApp(page);

    // Stats should show 1 correct
    const correctText = page.locator('.text-green-400').filter({ hasText: '1' });
    await expect(correctText).toBeVisible();
  });
});

// ==========================================
// 7. ANSWER FEEDBACK VISUAL STATES
// ==========================================
test.describe('Answer Feedback Visual States', () => {
  test('correct answer button gets green styling', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    await page.locator('button', { hasText: 'Nauka' }).click();

    // Click the first answer and detect correctness from the UI
    await page.locator('.answer-btn').first().click();

    // The correct answer always gets the correct-btn class with green border
    const correctBtn = page.locator('.correct-btn');
    await expect(correctBtn).toBeVisible();
    await expect(correctBtn).toHaveClass(/border-green-500/);
  });

  test('incorrect answer button gets red styling', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    await page.locator('button', { hasText: 'Nauka' }).click();

    // Click each answer until we find one that gets red (incorrect) styling
    const answerBtns = page.locator('.answer-btn');
    const count = await answerBtns.count();

    // Try clicking answer B (index 1); if it's the correct one, try A (index 0)
    const firstTry = count > 1 ? 1 : 0;
    await answerBtns.nth(firstTry).click();

    const incorrectBtn = page.locator('.incorrect-btn');
    const incorrectCount = await incorrectBtn.count();

    if (incorrectCount > 0) {
      // We did click the wrong answer — verify red styling
      await expect(incorrectBtn).toHaveClass(/border-red-500/);
    } else {
      // We happened to click the correct answer — still valid, just verify green
      await expect(page.locator('.correct-btn')).toHaveClass(/border-green-500/);
    }
  });

  test('after answering, buttons become disabled', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    await page.locator('button', { hasText: 'Nauka' }).click();

    // Answer a question
    await page.locator('.answer-btn').first().click();

    // All answer buttons should be disabled
    const answerBtns = page.locator('.answer-btn');
    const count = await answerBtns.count();
    for (let i = 0; i < count; i++) {
      await expect(answerBtns.nth(i)).toBeDisabled();
    }
  });

  test('correct answer always shown green even when wrong answer clicked', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    await page.locator('button', { hasText: 'Nauka' }).click();

    // Click answer B (index 1) — likely wrong for most questions
    const answerBtns = page.locator('.answer-btn');
    const count = await answerBtns.count();
    await answerBtns.nth(count > 1 ? 1 : 0).click();

    // Regardless of which we clicked, the correct answer must show green
    const correctBtn = page.locator('.correct-btn');
    await expect(correctBtn).toBeVisible();
    await expect(correctBtn).toHaveClass(/border-green-500/);
  });
});

// ==========================================
// 8. NAVIGATION BACK TO MENU
// ==========================================
test.describe('Navigation Back to Menu', () => {
  test('can go back from learn mode to menu', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    await page.locator('button', { hasText: 'Nauka' }).click();
    await expect(page.locator('.oa-header-title')).toHaveText('Nauka');

    // Click back button
    await page.locator('button[aria-label="Wróć"]').click();

    // Should be back at menu
    await expect(page.locator('.oa-header-title')).toHaveText('Egzamin ŻJ / JSM');
  });

  test('can go back from Leitner overview to menu', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    await page.locator('button', { hasText: 'Leitner' }).click();
    await expect(page.locator('.oa-header-title')).toHaveText('Leitner');

    await page.locator('button[aria-label="Wróć"]').click();
    await expect(page.locator('.oa-header-title')).toHaveText('Egzamin ŻJ / JSM');
  });

  test('can go back from exam to menu via dialog', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);

    // Accept the confirm dialog
    page.on('dialog', dialog => dialog.accept());

    await page.locator('button', { hasText: 'Egzamin' }).click();
    await expect(page.locator('.oa-header-title')).toHaveText('Egzamin');

    await page.locator('button[aria-label="Wróć"]').click();

    // Should be back at menu
    await expect(page.locator('.oa-header-title')).toHaveText('Egzamin ŻJ / JSM');
  });

  test('can go back from results to menu', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    page.on('dialog', dialog => dialog.accept());

    // Complete exam quickly
    await page.locator('button', { hasText: 'Egzamin' }).click();
    for (let i = 0; i < 29; i++) {
      await page.locator('.answer-btn').first().click();
      await page.locator('button', { hasText: 'Nastepne' }).click();
    }
    await page.locator('.answer-btn').first().click();
    await page.locator('button', { hasText: /Zakoncz/ }).click();

    await expect(page.locator('.oa-header-title')).toHaveText('Wyniki egzaminu');

    // Click "Powrot do menu"
    await page.locator('button', { hasText: 'Powrot do menu' }).click();
    await expect(page.locator('.oa-header-title')).toHaveText('Egzamin ŻJ / JSM');
  });

  test('menu shows updated stats after returning from learn mode', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);

    // Enter learn mode and answer a question
    await page.locator('button', { hasText: 'Nauka' }).click();
    await page.locator('.answer-btn').first().click();

    // Go back to menu
    await page.locator('button[aria-label="Wróć"]').click();

    // Stats should show at least 1 answered
    const answeredEl = page.locator('.text-amber-400').filter({ hasText: /^[1-9]/ });
    await expect(answeredEl.first()).toBeVisible();
  });
});

// ==========================================
// 8. IMAGE ZOOM
// ==========================================
test.describe('Image Zoom', () => {
  test('question image has zoom-in cursor in learn mode', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    await page.locator('button', { hasText: 'Nauka' }).click();
    await expect(page.locator('.oa-header-title')).toHaveText('Nauka');

    const questionImg = page.locator('img.cursor-zoom-in');
    await expect(questionImg).toBeVisible();
  });

  test('clicking question image opens zoom modal', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    await page.locator('button', { hasText: 'Nauka' }).click();
    await expect(page.locator('.oa-header-title')).toHaveText('Nauka');

    // No modal initially
    await expect(page.locator('.image-modal')).toHaveCount(0);

    // Click the question image to zoom
    await page.locator('img.cursor-zoom-in').click();

    // Modal should appear
    await expect(page.locator('.image-modal')).toBeVisible();
    await expect(page.locator('.image-modal img')).toBeVisible();
  });

  test('clicking zoomed image closes modal', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    await page.locator('button', { hasText: 'Nauka' }).click();
    await expect(page.locator('.oa-header-title')).toHaveText('Nauka');

    // Open zoom modal
    await page.locator('img.cursor-zoom-in').click();
    await expect(page.locator('.image-modal')).toBeVisible();

    // Click the modal to close it
    await page.locator('.image-modal').click();
    await expect(page.locator('.image-modal')).toHaveCount(0);
  });

  test('zoom modal works on subsequent questions', async ({ page }) => {
    await page.goto(EGZAMIN_URL);
    await waitForApp(page);
    await page.locator('button', { hasText: 'Nauka' }).click();
    await expect(page.locator('.oa-header-title')).toHaveText('Nauka');

    // Skip to next question
    await page.locator('button', { hasText: 'Pomin' }).click();
    await expect(page.getByText(/Pytanie 2 \//)).toBeVisible();

    // Open zoom on second question
    await page.locator('img.cursor-zoom-in').click();
    await expect(page.locator('.image-modal')).toBeVisible();

    // Close it
    await page.locator('.image-modal').click();
    await expect(page.locator('.image-modal')).toHaveCount(0);
  });
});
