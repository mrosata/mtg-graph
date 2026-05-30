import { test, expect } from '@playwright/test';
import { suppressWizard, waitForHydration } from './helpers';

const TOKEN_MAKER = 'Abzan Monument';

test('browse → open card → interactions → add to deck', async ({ page }) => {
  await suppressWizard(page);
  await page.goto('/');
  await waitForHydration(page);

  // Filter by oracle text unique to Abzan Monument
  await page.getByLabel('Oracle text').fill('greatest toughness among creatures');
  // Wait for filter to apply
  await page.waitForTimeout(200);

  // Click the Abzan Monument card image
  const card = page.getByRole('button', { name: new RegExp(TOKEN_MAKER, 'i') }).first();
  await expect(card).toBeVisible();
  await card.click();

  // Drawer opens with the card name as heading
  await expect(page.getByRole('heading', { name: TOKEN_MAKER })).toBeVisible();

  // Interactions panel renders — scope to the tab button to disambiguate from
  // the filter-panel section label of the same name.
  await expect(page.getByRole('button', { name: /Interactions \(\d+\)/ })).toBeVisible();

  // Add to deck — shows ConfirmModal since no deck exists yet
  await page.getByRole('button', { name: /Add to deck/ }).click();
  await page.getByRole('button', { name: 'Create deck' }).click();

  // Navigate to Active Deck
  await page.getByRole('link', { name: 'Active Deck' }).click();

  // Deck panel should show some card count > 0
  await expect(page.getByText(/1 cards|1 card/i)).toBeVisible({ timeout: 5_000 });
});
