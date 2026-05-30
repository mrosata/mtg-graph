import { test, expect, type Page } from '@playwright/test';
import {
  SULTAI_TEST_DECK,
  resetState,
  seedDeck,
  waitForHydration,
} from './helpers';

// A small helper: seed three named decks where one is active.
// Card composition uses real oracleIds from SULTAI_TEST_DECK so each row has a
// non-empty color identity and a real card count.
async function seedThreeDecks(page: Page): Promise<{
  monoRedId: string;
  azoriusId: string;
  emptyId: string;
}> {
  await resetState(page);
  // Use a creature with R or G identity for Mono-Red (Llanowar Elves is green —
  // close enough for a colored band test).
  const llanowar = SULTAI_TEST_DECK.find((c) => c.name === 'Llanowar Elves')!;
  const stroke = SULTAI_TEST_DECK.find((c) => c.name === 'Disdainful Stroke')!; // U
  const monoRedId = await seedDeck(page, {
    name: 'Mono-Red Aggro',
    cards: [{ oracleId: llanowar.oracleId, count: 4, name: llanowar.name }],
    active: false,
  });
  const azoriusId = await seedDeck(page, {
    name: 'Azorius Control',
    cards: [{ oracleId: stroke.oracleId, count: 2, name: stroke.name }],
    active: true,
  });
  const emptyId = await seedDeck(page, {
    name: 'Empty Brew',
    cards: [],
    active: false,
  });
  return { monoRedId, azoriusId, emptyId };
}

// =============================================================================
// Suite 1 — Empty state
// =============================================================================
test.describe('Suite 1 — Empty state', () => {
  test.beforeEach(async ({ page }) => {
    await resetState(page);
  });

  test('1.1 No decks → empty message and heading', async ({ page }) => {
    await page.goto('/decks');
    await expect(page.getByRole('heading', { name: 'Decks' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'New deck' })).toBeVisible();
    await expect(page.getByText('No decks yet.')).toBeVisible();
  });

  test('1.2 Only CTA is the "New deck" button', async ({ page }) => {
    await page.goto('/decks');
    // No "Delete" buttons should exist when empty
    await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(0);
  });
});

// =============================================================================
// Suite 2 — Create deck
// =============================================================================
test.describe('Suite 2 — Create deck', () => {
  test.beforeEach(async ({ page }) => {
    await resetState(page);
  });

  test('2.1 Click "New deck" creates a deck and navigates to /deck', async ({ page }) => {
    await page.goto('/decks');
    await page.getByRole('button', { name: 'New deck' }).click();
    await expect(page).toHaveURL(/\/deck$/);
    // Active id is set
    const activeId = await page.evaluate(() => localStorage.getItem('mtg-graph:activeDeckId'));
    expect(activeId).not.toBeNull();
    // Go back to /decks and assert the row exists
    await page.goto('/decks');
    await expect(page.getByText('Untitled Deck 1')).toBeVisible();
  });

  test('2.2 Second deck increments the default name', async ({ page }) => {
    await page.goto('/decks');
    await page.getByRole('button', { name: 'New deck' }).click();
    // The handler awaits createDeck then navigates; wait for the URL change so
    // the next goto doesn't race with the in-flight programmatic navigation.
    await page.waitForURL(/\/deck$/);
    await page.goto('/decks');
    await expect(page.getByText('Untitled Deck 1')).toBeVisible();
    await page.getByRole('button', { name: 'New deck' }).click();
    await page.waitForURL(/\/deck$/);
    await page.goto('/decks');
    await expect(page.getByText('Untitled Deck 1')).toBeVisible();
    await expect(page.getByText('Untitled Deck 2')).toBeVisible();
    // The 2nd is now active
    const li2 = page.getByText('Untitled Deck 2').locator('xpath=ancestor::li');
    await expect(li2.getByText('Active', { exact: true })).toBeVisible();
    const li1 = page.getByText('Untitled Deck 1').locator('xpath=ancestor::li');
    await expect(li1.getByText('Active', { exact: true })).not.toBeVisible();
  });
});

// =============================================================================
// Suite 3 — Deck list rendering
// =============================================================================
test.describe('Suite 3 — Deck list rendering', () => {
  test.beforeEach(async ({ page }) => {
    await seedThreeDecks(page);
    await page.goto('/decks');
  });

  test('3.1 Each deck renders with name, count, updated time, Delete button', async ({ page }) => {
    await expect(page.getByText('Azorius Control')).toBeVisible();
    await expect(page.getByText('Mono-Red Aggro')).toBeVisible();
    await expect(page.getByText('Empty Brew')).toBeVisible();

    const azoriusLi = page.getByText('Azorius Control').locator('xpath=ancestor::li');
    await expect(azoriusLi).toContainText(/· \d+ cards · updated/);
    const emptyLi = page.getByText('Empty Brew').locator('xpath=ancestor::li');
    await expect(emptyLi).toContainText(/· 0 cards · updated/);

    // Each row has its own Delete button
    expect(await page.getByRole('button', { name: 'Delete' }).count()).toBe(3);
  });

  test('3.2 Active deck shows an "Active" badge', async ({ page }) => {
    const azoriusLi = page.getByText('Azorius Control').locator('xpath=ancestor::li');
    await expect(azoriusLi.getByText('Active', { exact: true })).toBeVisible();
    const monoLi = page.getByText('Mono-Red Aggro').locator('xpath=ancestor::li');
    await expect(monoLi.getByText('Active', { exact: true })).not.toBeVisible();
  });

  test('3.3 Empty-deck row shows "0 cards"', async ({ page }) => {
    const emptyLi = page.getByText('Empty Brew').locator('xpath=ancestor::li');
    await expect(emptyLi).toContainText(/· 0 cards · updated/);
  });
});

// =============================================================================
// Suite 4 — Set active deck
// =============================================================================
test.describe('Suite 4 — Set active deck', () => {
  test('4.1 Clicking a deck row activates and navigates', async ({ page }) => {
    const ids = await seedThreeDecks(page);
    // Clear active so we can detect activation
    await page.evaluate(() => localStorage.removeItem('mtg-graph:activeDeckId'));
    await page.goto('/decks');
    const monoLi = page.getByText('Mono-Red Aggro').locator('xpath=ancestor::li');
    await monoLi.click();
    await expect(page).toHaveURL(/\/deck$/);
    const activeId = await page.evaluate(() => localStorage.getItem('mtg-graph:activeDeckId'));
    expect(activeId).toBe(ids.monoRedId);
  });

  test('4.2 Clicking another row switches the active deck', async ({ page }) => {
    await seedThreeDecks(page);
    await page.goto('/decks');
    const monoLi = page.getByText('Mono-Red Aggro').locator('xpath=ancestor::li');
    await monoLi.click();
    await page.goto('/decks');
    const monoLi2 = page.getByText('Mono-Red Aggro').locator('xpath=ancestor::li');
    await expect(monoLi2.getByText('Active', { exact: true })).toBeVisible();
    const azoriusLi = page.getByText('Azorius Control').locator('xpath=ancestor::li');
    await expect(azoriusLi.getByText('Active', { exact: true })).not.toBeVisible();
  });

  test('4.3 Clicking the name span enters rename mode (no navigation)', async ({ page }) => {
    await seedThreeDecks(page);
    await page.evaluate(() => localStorage.removeItem('mtg-graph:activeDeckId'));
    await page.goto('/decks');
    // Click the name span specifically
    await page.getByText('Mono-Red Aggro', { exact: true }).click();
    // Input should appear with the current value
    const input = page.locator('li').filter({ has: page.locator('input') }).locator('input').first();
    await expect(input).toBeVisible();
    await expect(page).toHaveURL(/\/decks$/);
  });

  test('4.4 Clicking Delete does NOT activate or navigate', async ({ page }) => {
    await seedThreeDecks(page);
    await page.evaluate(() => localStorage.removeItem('mtg-graph:activeDeckId'));
    await page.goto('/decks');
    const monoLi = page.getByText('Mono-Red Aggro').locator('xpath=ancestor::li');
    await monoLi.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page).toHaveURL(/\/decks$/);
  });
});

// =============================================================================
// Suite 5 — Rename deck (inline edit)
// =============================================================================
test.describe('Suite 5 — Rename deck (inline edit)', () => {
  test.beforeEach(async ({ page }) => {
    await seedThreeDecks(page);
    await page.goto('/decks');
  });

  test('5.1 Clicking the name span enters edit mode', async ({ page }) => {
    await page.getByText('Mono-Red Aggro', { exact: true }).click();
    await expect(page.locator('li').filter({ has: page.locator('input') }).locator('input').first()).toBeVisible();
  });

  test('5.2 Typing a new name and blurring commits the rename', async ({ page }) => {
    await page.getByText('Mono-Red Aggro', { exact: true }).click();
    const input = page.locator('li').filter({ has: page.locator('input') }).locator('input').first();
    await input.fill('Burn Deck');
    // Blur by clicking elsewhere
    await page.getByRole('heading', { name: 'Decks' }).click();
    await expect(page.getByText('Burn Deck')).toBeVisible();
    await expect(page.getByText('Mono-Red Aggro')).not.toBeVisible();
  });

  test('5.3 Enter key commits the rename', async ({ page }) => {
    await page.getByText('Mono-Red Aggro', { exact: true }).click();
    const input = page.locator('li').filter({ has: page.locator('input') }).locator('input').first();
    await input.fill('Quick Burn');
    await input.press('Enter');
    await expect(page.getByText('Quick Burn')).toBeVisible();
  });

  test('5.4 Escape cancels edit without committing', async ({ page }) => {
    await page.getByText('Mono-Red Aggro', { exact: true }).click();
    const input = page.locator('li').filter({ has: page.locator('input') }).locator('input').first();
    await input.fill('Garbage Name');
    await input.press('Escape');
    await expect(page.getByText('Mono-Red Aggro')).toBeVisible();
    await expect(page.getByText('Garbage Name')).not.toBeVisible();
  });

  test('5.5 Blur with empty value is a no-op', async ({ page }) => {
    await page.getByText('Mono-Red Aggro', { exact: true }).click();
    const input = page.locator('li').filter({ has: page.locator('input') }).locator('input').first();
    await input.fill('');
    await page.getByRole('heading', { name: 'Decks' }).click();
    await expect(page.getByText('Mono-Red Aggro')).toBeVisible();
  });

  test('5.6 Clicking the input does NOT navigate', async ({ page }) => {
    await page.getByText('Mono-Red Aggro', { exact: true }).click();
    const input = page.locator('li').filter({ has: page.locator('input') }).locator('input').first();
    await input.click();
    await expect(page).toHaveURL(/\/decks$/);
  });
});

// =============================================================================
// Suite 6 — Delete deck (with confirmation)
// =============================================================================
test.describe('Suite 6 — Delete deck (with confirmation)', () => {
  test.beforeEach(async ({ page }) => {
    await seedThreeDecks(page);
    await page.goto('/decks');
  });

  test('6.1 Delete button opens a confirmation modal', async ({ page }) => {
    const monoLi = page.getByText('Mono-Red Aggro').locator('xpath=ancestor::li');
    await monoLi.getByRole('button', { name: 'Delete' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Delete deck?' })).toBeVisible();
    await expect(dialog).toContainText('Mono-Red Aggro');
    await expect(dialog).toContainText('This cannot be undone.');
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Delete' })).toBeVisible();
  });

  test('6.2 Cancel keeps the deck', async ({ page }) => {
    const monoLi = page.getByText('Mono-Red Aggro').locator('xpath=ancestor::li');
    await monoLi.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByText('Mono-Red Aggro')).toBeVisible();
  });

  test('6.3 Backdrop click cancels', async ({ page }) => {
    const monoLi = page.getByText('Mono-Red Aggro').locator('xpath=ancestor::li');
    await monoLi.getByRole('button', { name: 'Delete' }).click();
    // The backdrop is the outermost fixed inset-0; click its top-left corner.
    await page.locator('.fixed.inset-0.z-50').click({ position: { x: 5, y: 5 } });
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByText('Mono-Red Aggro')).toBeVisible();
  });

  test('6.4 Escape key cancels', async ({ page }) => {
    const monoLi = page.getByText('Mono-Red Aggro').locator('xpath=ancestor::li');
    await monoLi.getByRole('button', { name: 'Delete' }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByText('Mono-Red Aggro')).toBeVisible();
  });

  test('6.5 Confirm deletes a non-active deck', async ({ page }) => {
    const monoLi = page.getByText('Mono-Red Aggro').locator('xpath=ancestor::li');
    await monoLi.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByText('Mono-Red Aggro')).not.toBeVisible();
    // activeDeckId unchanged (Azorius is still active)
    const activeLi = page.getByText('Azorius Control').locator('xpath=ancestor::li');
    await expect(activeLi.getByText('Active', { exact: true })).toBeVisible();
  });

  test('6.6 Deleting the ACTIVE deck clears activeDeckId', async ({ page }) => {
    const azoriusLi = page.getByText('Azorius Control').locator('xpath=ancestor::li');
    await azoriusLi.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
    // Wait for dialog to disappear before asserting the row is gone — both
    // contain the deck name and strict mode would otherwise complain about
    // the dual match during teardown.
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByRole('list').getByText('Azorius Control')).not.toBeVisible();
    const activeId = await page.evaluate(() => localStorage.getItem('mtg-graph:activeDeckId'));
    expect(activeId).toBeNull();
    await expect(page.getByText('Active', { exact: true })).not.toBeVisible();
  });
});

// =============================================================================
// Suite 7 — Navigate to deck details
// =============================================================================
test.describe('Suite 7 — Navigate to deck details', () => {
  test.beforeEach(async ({ page }) => {
    await seedThreeDecks(page);
    await page.goto('/decks');
  });

  test('7.1 Clicking a non-active deck row navigates to /deck', async ({ page }) => {
    const monoLi = page.getByText('Mono-Red Aggro').locator('xpath=ancestor::li');
    await monoLi.click();
    await expect(page).toHaveURL(/\/deck$/);
  });

  test('7.2 Clicking the active deck row still navigates to /deck', async ({ page }) => {
    const azoriusLi = page.getByText('Azorius Control').locator('xpath=ancestor::li');
    await azoriusLi.click();
    await expect(page).toHaveURL(/\/deck$/);
  });

  test('7.3 No direct link to /deck/graph from /decks', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Graph' })).toHaveCount(0);
  });
});

// =============================================================================
// Suite 8 — Persistence
// =============================================================================
test.describe('Suite 8 — Persistence', () => {
  test('8.1 Reload preserves deck list', async ({ page }) => {
    await seedThreeDecks(page);
    await page.goto('/decks');
    await expect(page.getByText('Mono-Red Aggro')).toBeVisible();
    await page.reload();
    // /decks has no "cards" counter — wait for the page heading instead.
    await expect(page.getByRole('heading', { name: 'Decks' })).toBeVisible();
    await expect(page.getByText('Mono-Red Aggro')).toBeVisible();
    await expect(page.getByText('Azorius Control')).toBeVisible();
    await expect(page.getByText('Empty Brew')).toBeVisible();
  });

  test('8.2 Reload preserves the active deck', async ({ page }) => {
    await seedThreeDecks(page);
    await page.goto('/decks');
    const azoriusLi = page.getByText('Azorius Control').locator('xpath=ancestor::li');
    await expect(azoriusLi.getByText('Active', { exact: true })).toBeVisible();
    await page.reload();
    if (!page.url().endsWith('/decks')) await page.goto('/decks');
    const azoriusLi2 = page.getByText('Azorius Control').locator('xpath=ancestor::li');
    await expect(azoriusLi2.getByText('Active', { exact: true })).toBeVisible();
  });

  test('8.3 Stale localStorage active-id is dropped if deck is gone', async ({ page }) => {
    await resetState(page);
    // Manually set a non-existent active id
    await page.evaluate(() => localStorage.setItem('mtg-graph:activeDeckId', 'ghost-id-not-real'));
    await page.goto('/decks');
    await expect(page.getByRole('heading', { name: 'Decks' })).toBeVisible();
    // After load(), the stale id should be cleared. load() is async — poll.
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('mtg-graph:activeDeckId')))
      .toBeNull();
    await expect(page.getByText('Active', { exact: true })).not.toBeVisible();
  });

  test('8.4 Rename persists across reload', async ({ page }) => {
    await seedThreeDecks(page);
    await page.goto('/decks');
    await page.getByText('Mono-Red Aggro', { exact: true }).click();
    const input = page.locator('li').filter({ has: page.locator('input') }).locator('input').first();
    await input.fill('Quick Burn');
    await input.press('Enter');
    await expect(page.getByText('Quick Burn')).toBeVisible();
    await page.reload();
    if (!page.url().endsWith('/decks')) await page.goto('/decks');
    await expect(page.getByText('Quick Burn')).toBeVisible();
    await expect(page.getByText('Mono-Red Aggro')).not.toBeVisible();
  });

  test('8.5 Delete persists across reload', async ({ page }) => {
    await seedThreeDecks(page);
    await page.goto('/decks');
    const monoLi = page.getByText('Mono-Red Aggro').locator('xpath=ancestor::li');
    await monoLi.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByRole('list').getByText('Mono-Red Aggro')).not.toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Decks' })).toBeVisible();
    await expect(page.getByText('Mono-Red Aggro')).not.toBeVisible();
  });
});

// =============================================================================
// Suite 9 — Top nav
// =============================================================================
test.describe('Suite 9 — Top nav', () => {
  test.beforeEach(async ({ page }) => {
    await resetState(page);
    await page.goto('/decks');
  });

  test('9.1 Three nav links render with hrefs', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Browse' })).toHaveAttribute('href', '/');
    await expect(page.getByRole('link', { name: 'Decks' })).toHaveAttribute('href', '/decks');
    await expect(page.getByRole('link', { name: 'Active Deck' })).toHaveAttribute('href', '/deck');
    // Active route highlighting
    await expect(page.getByRole('link', { name: 'Decks' })).toHaveClass(/font-semibold/);
  });

  test('9.2 Browse link navigates to /', async ({ page }) => {
    await page.getByRole('link', { name: 'Browse' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('9.3 Active Deck link navigates to /deck', async ({ page }) => {
    await page.getByRole('link', { name: 'Active Deck' }).click();
    await expect(page).toHaveURL(/\/deck$/);
  });

  test('9.4 Decks link is a no-op when already on /decks', async ({ page }) => {
    await page.getByRole('link', { name: 'Decks' }).click();
    await expect(page).toHaveURL(/\/decks$/);
  });
});
