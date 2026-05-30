import { test, expect } from '@playwright/test';
import { waitForHydration } from './helpers';

const STORAGE_KEY = 'mtg-graph:seen-tours:v1';

async function clearSeenTours(page: import('@playwright/test').Page) {
  await page.addInitScript((key) => {
    window.localStorage.removeItem(key);
  }, STORAGE_KEY);
}

test.describe('wizard onboarding', () => {
  test('global tour auto-runs on first visit and persists seenness on finish', async ({ page, context }) => {
    await context.clearCookies();
    await clearSeenTours(page);
    await page.goto('/');
    await waitForHydration(page);

    // Joyride renders tooltips as role=alertdialog (a subtype of dialog).
    await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Welcome to MTG Graph')).toBeVisible();

    // Click through to finish.
    for (let i = 0; i < 4; i++) {
      await page.getByRole('button', { name: /Next/i }).click();
    }
    await page.getByRole('button', { name: /Last|Done|Finish/i }).click();

    await expect(page.getByRole('alertdialog')).toBeHidden();

    const seen = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? '[]'), STORAGE_KEY);
    expect(seen).toContain('global');
  });

  test('skip marks all tours seen', async ({ page, context }) => {
    await context.clearCookies();
    await clearSeenTours(page);
    await page.goto('/');
    await waitForHydration(page);

    await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /Skip/i }).click();
    await expect(page.getByRole('alertdialog')).toBeHidden();

    const seen = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? '[]'), STORAGE_KEY);
    expect(seen).toEqual(expect.arrayContaining(['global', 'browse', 'decks', 'active-deck', 'deck-graph']));
  });

  test('help menu replays the global tour', async ({ page }) => {
    // Pre-mark global as seen so it doesn't auto-run.
    await page.addInitScript((key) => {
      window.localStorage.setItem(key, JSON.stringify(['global', 'browse', 'decks', 'active-deck', 'deck-graph']));
    }, STORAGE_KEY);

    await page.goto('/');
    await waitForHydration(page);

    // No auto tour.
    await expect(page.getByRole('alertdialog')).toBeHidden();

    // Open help menu, click "Show app intro".
    await page.getByRole('button', { name: 'Help' }).click();
    await page.getByRole('menuitem', { name: /Show app intro/i }).click();

    await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Welcome to MTG Graph')).toBeVisible();
  });

  test('page tour does not auto-run on same route after global finishes', async ({ page, context }) => {
    await context.clearCookies();
    await clearSeenTours(page);
    await page.goto('/');
    await waitForHydration(page);

    // Finish the global tour.
    await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 10_000 });
    for (let i = 0; i < 4; i++) {
      await page.getByRole('button', { name: /Next/i }).click();
    }
    await page.getByRole('button', { name: /Last|Done|Finish/i }).click();
    await expect(page.getByRole('alertdialog')).toBeHidden();

    // We are still on /. The browse tour must NOT auto-run.
    // Give Joyride a tick to settle and confirm no dialog comes back.
    await page.waitForTimeout(500);
    await expect(page.getByRole('alertdialog')).toBeHidden();

    // Navigate to /decks → decks tour appears.
    await page.getByRole('link', { name: 'Decks' }).click();
    await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 5_000 });
  });
});
