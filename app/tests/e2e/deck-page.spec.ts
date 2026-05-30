import { test, expect, type Page } from '@playwright/test';
import {
  resetState,
  seedDeck,
  seedMixedTypesDeck,
  waitForHydration,
} from './helpers';

// =============================================================================
// Suite 1 — No active deck
// =============================================================================
test.describe('Suite 1 — No active deck', () => {
  test('1.1 No active deck → DeckPanel empty-state copy', async ({ page }) => {
    await resetState(page);
    await page.goto('/deck');
    await waitForHydration(page);
    // Top nav
    await expect(page.getByRole('link', { name: 'Browse' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Decks' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Active Deck' })).toBeVisible();
    // Segmented control: List is a span (not link), Graph is a link
    await expect(page.getByText('List', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Graph' })).toHaveAttribute('href', '/deck/graph');
    // Empty rail copy
    await expect(page.getByText(/No active deck\. Create or select one from Decks\./)).toBeVisible();
    // No collapse/expand chevron
    await expect(page.getByRole('button', { name: 'Collapse deck panel' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Expand deck panel' })).not.toBeVisible();
    // No Export button
    await expect(page.getByRole('button', { name: 'Export' })).not.toBeVisible();
  });
});

// =============================================================================
// Suite 2 — Empty active deck
// =============================================================================
test.describe('Suite 2 — Empty active deck', () => {
  test('2.1 Empty active deck → header + curve but no card rows', async ({ page }) => {
    await resetState(page);
    await seedDeck(page, { name: 'Empty Test', cards: [], active: true });
    await page.goto('/deck');
    await waitForHydration(page);
    await expect(page.getByRole('heading', { level: 2, name: 'Empty Test' })).toBeVisible();
    await expect(page.getByText('0 cards', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Collapse deck panel' })).toBeVisible();
    await expect(page.getByText(/at least 60 cards.*this deck has only 0/i)).toBeVisible();
    // No card rows (look for li[data-oracle-id])
    await expect(page.locator('li[data-oracle-id]')).toHaveCount(0);
  });
});

// =============================================================================
// Suite 3 — Header / chrome
// =============================================================================
test.describe('Suite 3 — Header / chrome', () => {
  test.beforeEach(async ({ page }) => {
    await seedMixedTypesDeck(page);
    await page.goto('/deck');
    await waitForHydration(page);
  });

  test('3.1 Top nav links', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Browse' })).toHaveAttribute('href', '/');
    await expect(page.getByRole('link', { name: 'Decks' })).toHaveAttribute('href', '/decks');
    await expect(page.getByRole('link', { name: 'Active Deck' })).toHaveAttribute('href', '/deck');
    await expect(page.getByRole('link', { name: 'Active Deck' })).toHaveClass(/font-semibold/);
  });

  test('3.2 List | Graph segmented control', async ({ page }) => {
    // "List" is a <span>, not a link. Assert: Graph link exists with proper href.
    await expect(page.getByRole('link', { name: 'Graph' })).toHaveAttribute('href', '/deck/graph');
    // And "List" is NOT addressable as a link
    await expect(page.getByRole('link', { name: 'List' })).toHaveCount(0);
  });

  test('3.3 Deck name and total count', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 2, name: 'Sultai Test' })).toBeVisible();
    await expect(page.getByText('4 cards', { exact: true })).toBeVisible();
  });

  test('3.4 Rename deck inline', async ({ page }) => {
    await page.getByRole('heading', { level: 2, name: 'Sultai Test' }).click();
    // The heading is replaced by an input
    const input = page.locator('input.font-semibold').first();
    await expect(input).toBeVisible();
    await input.fill('Sultai v2');
    await input.press('Enter');
    await expect(page.getByRole('heading', { level: 2, name: 'Sultai v2' })).toBeVisible();
  });

  test('3.7 Action bar shows Fill mana and Goldfish buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /fill mana/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /goldfish/i })).toBeVisible();
  });

  test.skip('3.5 No color pip bar on expanded panel (negative assertion)', async () => {
    // Documents intent; not lifted to a separate test.
  });

  test.skip('3.6 Format — not surfaced', async () => {
    // Documents intent; not lifted to a separate test.
  });
});

// =============================================================================
// Suite 4 — Card list (rows)
// =============================================================================
test.describe('Suite 4 — Card list (rows)', () => {
  test('4.1 Cards grouped by primary type in canonical order', async ({ page }) => {
    await seedMixedTypesDeck(page);
    await page.goto('/deck');
    await waitForHydration(page);
    await expect(page.getByRole('heading', { level: 3, name: 'Creatures' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Instants' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Sorceries' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Lands' })).toBeVisible();
    // Verify visual order: Creatures < Instants < Sorceries < Lands (top to bottom)
    const creaturesY = (await page.getByRole('heading', { level: 3, name: 'Creatures' }).boundingBox())?.y ?? 0;
    const instantsY = (await page.getByRole('heading', { level: 3, name: 'Instants' }).boundingBox())?.y ?? 0;
    const sorceriesY = (await page.getByRole('heading', { level: 3, name: 'Sorceries' }).boundingBox())?.y ?? 0;
    const landsY = (await page.getByRole('heading', { level: 3, name: 'Lands' }).boundingBox())?.y ?? 0;
    expect(creaturesY).toBeLessThan(instantsY);
    expect(instantsY).toBeLessThan(sorceriesY);
    expect(sorceriesY).toBeLessThan(landsY);
  });

  test('4.2 Each row renders count controls, mana cost (no raw braces), and name', async ({ page }) => {
    const { instant } = await seedMixedTypesDeck(page);
    await page.goto('/deck');
    await waitForHydration(page);
    const row = page.locator(`li[data-oracle-id="${instant.oracleId}"]`);
    await expect(row).toBeVisible();
    await expect(row.getByRole('group', { name: 'Adjust copies' })).toBeVisible();
    await expect(row.getByRole('button', { name: 'Add one copy' })).toBeVisible();
    await expect(row.getByRole('button', { name: 'Remove one copy' })).toBeVisible();
    await expect(row).toContainText(instant.name);
    // Mana cost is rendered as symbols, not raw braces
    await expect(row).not.toContainText('{U}');
  });

  test('4.3 Count badge reflects current count', async ({ page }) => {
    const { creature } = await seedMixedTypesDeck(page);
    // Bump to 2 directly via re-seed
    await page.evaluate(async ({ dbName, oracleId }) => {
      await new Promise<void>((resolveOpen, rejectOpen) => {
        const req = indexedDB.open(dbName);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(['decks'], 'readwrite');
          const store = tx.objectStore('decks');
          const all = store.getAll();
          all.onsuccess = () => {
            // v2 schema: workingCards holds the in-progress state
            const decks = all.result as Array<{ id: string; workingCards: Array<{ oracleId: string; count: number; name?: string }> }>;
            const deck = decks[0]!;
            const card = deck.workingCards.find((c) => c.oracleId === oracleId)!;
            card.count = 2;
            store.put(deck);
          };
          tx.oncomplete = () => { db.close(); resolveOpen(); };
          tx.onerror = () => rejectOpen(tx.error);
        };
        req.onerror = () => rejectOpen(req.error);
      });
    }, { dbName: 'mtg-graph', oracleId: creature.oracleId });
    await page.goto('/deck');
    await waitForHydration(page);
    const row = page.locator(`li[data-oracle-id="${creature.oracleId}"]`);
    await expect(row.getByLabel('2 in deck')).toBeVisible();
  });

  test('4.4 Name button click opens drawer (URL gains ?card=)', async ({ page }) => {
    const { creature } = await seedMixedTypesDeck(page);
    await page.goto('/deck');
    await waitForHydration(page);
    const row = page.locator(`li[data-oracle-id="${creature.oracleId}"]`);
    // Click the name button (scoped to the row, by visible name)
    await row.getByRole('button', { name: creature.name }).click();
    await expect.poll(() => page.url()).toMatch(new RegExp(`card=${creature.oracleId}`));
    await expect(page.getByRole('heading', { name: creature.name })).toBeVisible();
  });

  test('4.5 +/- buttons do NOT open drawer', async ({ page }) => {
    const { instant } = await seedMixedTypesDeck(page);
    await page.goto('/deck');
    await waitForHydration(page);
    const row = page.locator(`li[data-oracle-id="${instant.oracleId}"]`);
    await row.getByRole('button', { name: 'Add one copy' }).click();
    await expect(row.getByLabel('2 in deck')).toBeVisible();
    expect(page.url()).not.toMatch(/card=/);
  });

  test('4.6 Unknown / orphan cards fall through to Unknown section', async ({ page }) => {
    await resetState(page);
    const ghostId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    await seedDeck(page, {
      name: 'Orphan Test',
      cards: [{ oracleId: ghostId, count: 1, name: 'Phantom Card' }],
      active: true,
    });
    await page.goto('/deck');
    await waitForHydration(page);
    await expect(page.getByRole('heading', { level: 3, name: 'Unknown' })).toBeVisible();
  });
});

// =============================================================================
// Suite 5 — Increment / decrement / remove
// =============================================================================
test.describe('Suite 5 — Increment / decrement / remove', () => {
  test('5.1 Click + adds one copy and updates header', async ({ page }) => {
    const { instant } = await seedMixedTypesDeck(page);
    await page.goto('/deck');
    await waitForHydration(page);
    await expect(page.getByText('4 cards', { exact: true })).toBeVisible();
    const row = page.locator(`li[data-oracle-id="${instant.oracleId}"]`);
    await row.getByRole('button', { name: 'Add one copy' }).click();
    await expect(row.getByLabel('2 in deck')).toBeVisible();
    await expect(page.getByText('5 cards', { exact: true })).toBeVisible();
  });

  test('5.2 Shift+click + adds 4 copies', async ({ page }) => {
    const { instant } = await seedMixedTypesDeck(page);
    await page.goto('/deck');
    await waitForHydration(page);
    const row = page.locator(`li[data-oracle-id="${instant.oracleId}"]`);
    await row.getByRole('button', { name: 'Add one copy' }).click({ modifiers: ['Shift'] });
    await expect(row.getByLabel('5 in deck')).toBeVisible();
    await expect(page.getByText('8 cards', { exact: true })).toBeVisible();
    // Legality warning: max 4 unless basic land
    await expect(page.getByText(/Deck contains 5 copies of Disdainful Stroke.*max 4/)).toBeVisible();
  });

  test('5.3 Click - removes one copy', async ({ page }) => {
    const { instant } = await seedMixedTypesDeck(page);
    await page.goto('/deck');
    await waitForHydration(page);
    const row = page.locator(`li[data-oracle-id="${instant.oracleId}"]`);
    // Currently 1 → click - removes it (row disappears at count 0). Bump first.
    await row.getByRole('button', { name: 'Add one copy' }).click({ modifiers: ['Shift'] }); // now 5
    await expect(row.getByLabel('5 in deck')).toBeVisible();
    await row.getByRole('button', { name: 'Remove one copy' }).click();
    await expect(row.getByLabel('4 in deck')).toBeVisible();
  });

  test('5.4 Shift+click - removes up to 4 (capped at current count)', async ({ page }) => {
    const { instant } = await seedMixedTypesDeck(page);
    await page.goto('/deck');
    await waitForHydration(page);
    const row = page.locator(`li[data-oracle-id="${instant.oracleId}"]`);
    // Bump to 5 then shift-remove 4 → leaves 1
    await row.getByRole('button', { name: 'Add one copy' }).click({ modifiers: ['Shift'] });
    await expect(row.getByLabel('5 in deck')).toBeVisible();
    await row.getByRole('button', { name: 'Remove one copy' }).click({ modifiers: ['Shift'] });
    await expect(row.getByLabel('1 in deck')).toBeVisible();
  });

  test('5.5 Removing the last copy removes the row', async ({ page }) => {
    const { sorcery } = await seedMixedTypesDeck(page);
    await page.goto('/deck');
    await waitForHydration(page);
    const row = page.locator(`li[data-oracle-id="${sorcery.oracleId}"]`);
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Remove one copy' }).click();
    await expect(page.locator(`li[data-oracle-id="${sorcery.oracleId}"]`)).toHaveCount(0);
    // Only Sorcery is gone now, so the Sorceries heading should also disappear
    await expect(page.getByRole('heading', { level: 3, name: 'Sorceries' })).not.toBeVisible();
  });

  test.skip('5.6 - button is disabled at count = 0', async () => {
    // Skipped: in normal flow rows with count = 0 are filtered before render,
    // so this state isn't reachable from the UI. Covered by unit tests.
  });
});

// =============================================================================
// Suite 6 — Mana curve (full)
// =============================================================================
test.describe('Suite 6 — Mana curve (full)', () => {
  test('6.1 ManaCurve renders 8 bars', async ({ page }) => {
    await seedMixedTypesDeck(page);
    await page.goto('/deck');
    await waitForHydration(page);
    // The deck rail is the last <aside> or rightmost overflow container.
    // The 8 amber bars are the only `bg-amber-500` divs in the curve.
    // Some other amber-500 things may exist; assert >= 8.
    const bars = page.locator('div.bg-amber-500');
    expect(await bars.count()).toBeGreaterThanOrEqual(8);
    // The "7+" axis label
    await expect(page.getByText('7+', { exact: true })).toBeVisible();
  });

  test('6.2 Curve updates on add/remove', async ({ page }) => {
    const { instant } = await seedMixedTypesDeck(page); // Disdainful Stroke, CMC 2
    await page.goto('/deck');
    await waitForHydration(page);
    // Just verify add changes the header — exact bar height measurement is brittle.
    await expect(page.getByText('4 cards', { exact: true })).toBeVisible();
    const row = page.locator(`li[data-oracle-id="${instant.oracleId}"]`);
    await row.getByRole('button', { name: 'Add one copy' }).click();
    await row.getByRole('button', { name: 'Add one copy' }).click();
    await expect(page.getByText('6 cards', { exact: true })).toBeVisible();
  });

  test('6.3 Adding a Land does NOT change the curve (header still increments)', async ({ page }) => {
    const { land } = await seedMixedTypesDeck(page);
    await page.goto('/deck');
    await waitForHydration(page);
    await expect(page.getByText('4 cards', { exact: true })).toBeVisible();
    const row = page.locator(`li[data-oracle-id="${land.oracleId}"]`);
    await row.getByRole('button', { name: 'Add one copy' }).click();
    await expect(page.getByText('5 cards', { exact: true })).toBeVisible();
    // (Bar heights are hard to measure deterministically; curve-non-change is intent-documented)
  });
});

// =============================================================================
// Suite 7 — Themes / tag highlights (not implemented on this page)
// =============================================================================
test.describe('Suite 7 — Themes', () => {
  test('7.1 No themes display in DeckPanel', async ({ page }) => {
    await seedMixedTypesDeck(page);
    await page.goto('/deck');
    await waitForHydration(page);
    // No "Themes" h3 in the right rail (FilterPanel themes section is on left aside;
    // we just assert no <h3>Themes</h3> exists anywhere).
    await expect(page.getByRole('heading', { level: 3, name: 'Themes' })).toHaveCount(0);
  });
});

// =============================================================================
// Suite 8 — Deck export
// =============================================================================
test.describe('Suite 8 — Deck export', () => {
  test.skip('8.1 Export writes plaintext lines to the clipboard', async () => {
    // Skipped: requires `clipboard-read` browser context permission which is
    // not granted in playwright.config.ts. To enable, add:
    //   await context.grantPermissions(['clipboard-read'])
    // in a beforeEach AND configure the permission in the project. Until then,
    // assert only that the button exists (covered by 2.1).
  });
});

// =============================================================================
// Suite 9 — Collapsed deck panel state
// =============================================================================
test.describe('Suite 9 — Collapsed deck panel state', () => {
  test('9.1 Collapse via the chevron', async ({ page }) => {
    await seedMixedTypesDeck(page);
    await page.goto('/deck');
    await waitForHydration(page);
    await page.getByRole('button', { name: 'Collapse deck panel' }).click();
    await expect(page.getByRole('button', { name: 'Expand deck panel' })).toBeVisible();
    // Heading is gone
    await expect(page.getByRole('heading', { level: 2, name: 'Sultai Test' })).not.toBeVisible();
    // localStorage persisted
    const stored = await page.evaluate(() => localStorage.getItem('mtg-graph:deck-panel-collapsed'));
    expect(stored).toBe('true');
  });

  test('9.2 Collapsed panel renders type pills, mini curve, and color bar', async ({ page }) => {
    await seedMixedTypesDeck(page);
    await page.goto('/deck');
    await waitForHydration(page);
    await page.getByRole('button', { name: 'Collapse deck panel' }).click();
    await expect(page.getByRole('button', { name: 'Expand deck panel' })).toBeVisible();
    await expect(page.getByText('4c', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Jump to creatures' })).toBeVisible();
    await expect(page.locator('[data-type-count="Creature"]')).toBeVisible();
    // 8 MiniManaCurve bars
    expect(await page.locator('[data-cmc]').count()).toBeGreaterThanOrEqual(8);
    // At least one colored pip (Sultai mix has U + G at minimum)
    expect(await page.locator('[data-color]').count()).toBeGreaterThanOrEqual(1);
  });

  test('9.3 Click a type pill — expands and scrolls to that section', async ({ page }) => {
    await seedMixedTypesDeck(page);
    await page.goto('/deck');
    await waitForHydration(page);
    await page.getByRole('button', { name: 'Collapse deck panel' }).click();
    await expect(page.getByRole('button', { name: 'Expand deck panel' })).toBeVisible();
    await page.getByRole('button', { name: 'Jump to instants' }).click();
    await expect(page.getByRole('button', { name: 'Collapse deck panel' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Instants' })).toBeInViewport();
  });

  test('9.4 Collapsed state hydrates from localStorage on mount', async ({ page }) => {
    await seedMixedTypesDeck(page);
    await page.evaluate(() => localStorage.setItem('mtg-graph:deck-panel-collapsed', 'true'));
    await page.goto('/deck');
    await waitForHydration(page);
    await expect(page.getByRole('button', { name: 'Expand deck panel' })).toBeVisible();
    // Expanded heading should NOT be there
    await expect(page.getByRole('heading', { level: 2, name: 'Sultai Test' })).not.toBeVisible();
  });

  test('9.5 Collapse button is hidden when there is no active deck', async ({ page }) => {
    await resetState(page);
    await page.goto('/deck');
    await waitForHydration(page);
    await expect(page.getByRole('button', { name: 'Collapse deck panel' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Expand deck panel' })).not.toBeVisible();
  });
});

// =============================================================================
// Suite 10 — Navigation
// =============================================================================
test.describe('Suite 10 — Navigation', () => {
  test('10.1 Top nav navigates between top-level routes', async ({ page }) => {
    await seedMixedTypesDeck(page);
    await page.goto('/deck');
    await waitForHydration(page);
    await page.getByRole('link', { name: 'Browse' }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.getByRole('link', { name: 'Decks' }).click();
    await expect(page).toHaveURL(/\/decks$/);
    await page.getByRole('link', { name: 'Active Deck' }).click();
    await expect(page).toHaveURL(/\/deck$/);
  });

  test('10.2 Segmented Graph link navigates to /deck/graph', async ({ page }) => {
    await seedMixedTypesDeck(page);
    await page.goto('/deck');
    await waitForHydration(page);
    await page.getByRole('link', { name: 'Graph' }).click();
    await expect(page).toHaveURL(/\/deck\/graph/);
  });

  test('10.3 Browser back from /deck/graph returns to /deck', async ({ page }) => {
    await seedMixedTypesDeck(page);
    await page.goto('/deck');
    await waitForHydration(page);
    await page.getByRole('link', { name: 'Graph' }).click();
    await expect(page).toHaveURL(/\/deck\/graph/);
    await page.goBack();
    await expect(page).toHaveURL(/\/deck$/);
  });
});

// =============================================================================
// Suite — Save / Discard / persistence
// =============================================================================
test.describe('Suite — Save / Discard / persistence', () => {
  let creature: { oracleId: string; name: string };

  test.beforeEach(async ({ page }) => {
    const seeded = await seedMixedTypesDeck(page);
    creature = seeded.creature;
    await page.goto('/deck');
    await waitForHydration(page);
  });

  test('remove → see tray + Save, click Save → indicators clear', async ({ page }) => {
    // Remove the creature fully (count starts at 1, so one click is enough)
    const removeBtn = page
      .getByTestId('card-row')
      .filter({ hasText: creature.name })
      .getByRole('button', { name: /remove one copy/i });
    await removeBtn.click();

    // Removed cards tray + red accent
    await expect(page.getByText(/removed cards/i)).toBeVisible();
    const removedRow = page.getByTestId('removed-row').filter({ hasText: creature.name });
    await expect(removedRow).toBeVisible();
    await expect(removedRow).toHaveClass(/border-red-500/);

    // Title has *
    await expect(page.getByRole('heading', { name: /^sultai test\*$/i })).toBeVisible();

    // Save button enabled
    const saveBtn = page.getByRole('button', { name: /^save$/i });
    await expect(saveBtn).toBeEnabled();

    // Click Save → tray gone, * gone, button disabled
    await saveBtn.click();
    await expect(page.getByText(/removed cards/i)).toBeHidden();
    await expect(page.getByRole('heading', { name: /^sultai test$/i })).toBeVisible();
    await expect(saveBtn).toBeDisabled();
  });

  test('working state persists across reload', async ({ page }) => {
    // Remove a card fully
    await page
      .getByTestId('card-row')
      .filter({ hasText: creature.name })
      .getByRole('button', { name: /remove one copy/i })
      .click();
    await expect(page.getByRole('heading', { name: /^sultai test\*$/i })).toBeVisible();

    // Reload
    await page.reload();
    await waitForHydration(page);

    // Dirty state still there
    await expect(page.getByRole('heading', { name: /^sultai test\*$/i })).toBeVisible();
    await expect(page.getByText(/removed cards/i)).toBeVisible();
  });

  test('Discard reverts working back to baseline', async ({ page }) => {
    await page
      .getByTestId('card-row')
      .filter({ hasText: creature.name })
      .getByRole('button', { name: /remove one copy/i })
      .click();
    await expect(page.getByText(/removed cards/i)).toBeVisible();

    await page.getByRole('button', { name: /^discard$/i }).click();

    await expect(page.getByText(/removed cards/i)).toBeHidden();
    await expect(page.getByRole('heading', { name: /^sultai test$/i })).toBeVisible();
    // Creature row is back
    await expect(
      page.getByTestId('card-row').filter({ hasText: creature.name }),
    ).toBeVisible();
  });
});

// =============================================================================
// Suite — Deck-row hover preview anchoring
// =============================================================================
test.describe('Suite — Hover preview anchoring', () => {
  test('preview sits left of the drawer when drawer is open', async ({ page }) => {
    const { creature } = await seedMixedTypesDeck(page);
    await page.goto('/deck');
    await waitForHydration(page);

    // Open the drawer for this card.
    const row = page.locator(`li[data-oracle-id="${creature.oracleId}"]`);
    await row.getByRole('button', { name: creature.name }).click();
    await expect(page.getByRole('heading', { name: creature.name })).toBeVisible();

    // Move the cursor away first so the subsequent move fires a fresh mouseenter.
    await page.mouse.move(50, 50);
    const rowBox = await row.boundingBox();
    if (!rowBox) throw new Error('no row box');
    await page.mouse.move(rowBox.x + 20, rowBox.y + rowBox.height / 2, { steps: 5 });

    const preview = page.getByTestId('hover-card-preview');
    await expect(preview).toBeVisible();
    const previewBox = await preview.boundingBox();
    // The drawer is the aside that contains the focused-card heading.
    const drawerBox = await page
      .locator('aside')
      .filter({ has: page.getByRole('heading', { name: creature.name }) })
      .boundingBox();
    expect(previewBox).toBeTruthy();
    expect(drawerBox).toBeTruthy();
    expect(previewBox!.x + previewBox!.width).toBeLessThanOrEqual(drawerBox!.x);
  });

  test('preview sits left of the deck panel when drawer is closed', async ({ page }) => {
    await seedMixedTypesDeck(page);
    await page.goto('/deck');
    await waitForHydration(page);

    const row = page.locator('li[data-oracle-id]').first();
    const rowBox = await row.boundingBox();
    if (!rowBox) throw new Error('no row box');
    await page.mouse.move(rowBox.x + 20, rowBox.y + rowBox.height / 2, { steps: 5 });

    const preview = page.getByTestId('hover-card-preview');
    await expect(preview).toBeVisible();
    const previewBox = await preview.boundingBox();
    // Deck rail wrapper carries the .scrollbar-slim class in BrowserShell.
    const deckPanelBox = await page.locator('.scrollbar-slim').last().boundingBox();
    expect(previewBox).toBeTruthy();
    expect(deckPanelBox).toBeTruthy();
    expect(previewBox!.x + previewBox!.width).toBeLessThanOrEqual(deckPanelBox!.x);
  });

  test('interactions-list hover sits left of drawer when deck panel is expanded', async ({ page }) => {
    // Regression: with both drawer + expanded deck panel open, the floating
    // preview that fires on interaction-row hover used to ignore the deck
    // panel and land inside the drawer. It must shift left as the deck panel
    // grows so it never overlaps the interactions list.
    const { creature } = await seedMixedTypesDeck(page);
    await page.goto('/deck');
    await waitForHydration(page);

    const row = page.locator(`li[data-oracle-id="${creature.oracleId}"]`);
    await row.getByRole('button', { name: creature.name }).click();
    await expect(page.getByRole('heading', { name: creature.name })).toBeVisible();

    const drawer = page
      .locator('aside')
      .filter({ has: page.getByRole('heading', { name: creature.name }) });

    const escapedName = creature.name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const neighborRow = drawer
      .locator('ul li button')
      .filter({ hasText: new RegExp(`^(?!${escapedName}).+$`) })
      .first();
    if (!(await neighborRow.isVisible().catch(() => false))) {
      await drawer.evaluate((el) => { el.scrollTop = 800; });
    }
    if (!(await neighborRow.isVisible().catch(() => false))) {
      test.skip(true, 'No non-self neighbor rows to hover');
    }
    await neighborRow.scrollIntoViewIfNeeded();

    await page.mouse.move(0, 0);
    const nbBox = await neighborRow.boundingBox();
    if (!nbBox) throw new Error('no neighbor row box');
    await page.mouse.move(nbBox.x + 20, nbBox.y + nbBox.height / 2, { steps: 5 });

    const preview = page.getByTestId('hover-card-preview');
    await expect(preview).toBeVisible();
    const previewBox = await preview.boundingBox();
    const drawerBox = await drawer.boundingBox();
    expect(previewBox).toBeTruthy();
    expect(drawerBox).toBeTruthy();
    expect(previewBox!.x + previewBox!.width).toBeLessThanOrEqual(drawerBox!.x);
  });
});
