import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resetState, waitForHydration, suppressWizard } from './helpers';

// __dirname is not available in ESM; derive it from import.meta.url instead.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURE = path.resolve(__dirname, '../fixtures/mtga/e2e-healthy.log');

// The fixture resolves 5 Standard cards via arena IDs:
//   87018 Forest x16, 87016 Mountain x12, 87010 Plains x8,
//   94938 Lightning Strike x4, 86864 Agatha's Champion x2.
// It also contains one deck "Burn" (main: Lightning Strike x4 + Mountain x12,
// sideboard: Agatha's Champion x2).

/**
 * Clear both the library and prefs tables from IndexedDB.
 * resetState() only clears decks, so we must do this separately to guarantee
 * a clean "No library" initial state.
 */
async function clearLibraryState(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('mtg-graph');
      req.onsuccess = () => {
        const db = req.result;
        const stores = Array.from(db.objectStoreNames);
        const toDelete: string[] = ['library', 'prefs'].filter((s) => stores.includes(s));
        if (toDelete.length === 0) { db.close(); resolve(); return; }
        const tx = db.transaction(toDelete, 'readwrite');
        for (const s of toDelete) tx.objectStore(s).clear();
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });
  });
}

test.describe('MTGA import', () => {
  test.beforeEach(async ({ page }) => {
    await suppressWizard(page);
    await resetState(page);
    // resetState navigates to "/" and waits for hydration so IndexedDB schema exists;
    // now we can safely clear the library tables.
    await clearLibraryState(page);
    // Reload so the libraryStore re-hydrates from the now-empty DB.
    await page.reload();
    await waitForHydration(page);
  });

  test('imports library + one deck from a Player.log', async ({ page }) => {
    // 1. Initial state: header shows "No library".
    await expect(page.getByText('No library')).toBeVisible();

    // 2. Open the import-library modal from the FilterPanel.
    await page.getByRole('button', { name: /Import library/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // 3. Switch to the MTG Arena tab.
    await page.getByRole('tab', { name: /MTG Arena/i }).click();

    // 4. Upload the fixture log.
    await page.setInputFiles('input[aria-label="Choose Player.log"]', FIXTURE);

    // 5. Wait for the import summary to appear.
    await expect(page.getByText(/Imported.*cards/i)).toBeVisible();

    // 6. Opt into importing MTGA decks.
    await page.getByLabel(/Also import my MTGA decks/i).check();

    // 7. Pick the "Burn" deck — the checkbox uses the deck name as aria-label.
    await page.getByLabel('Burn', { exact: true }).check();

    // 8. Confirm — single deck selected so the button reads "Import library + 1 deck".
    await page.getByRole('button', { name: /Import library \+ 1 deck/i }).click();

    // 9. Modal closes.
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // 10. Header badge flips from "no library" to "Library active" with a count.
    //     LibraryStatusBadge renders "<N> cards owned" with aria-label "Library active".
    await expect(page.getByLabel('Library active')).toBeVisible();
    await expect(page.getByText(/cards owned/i)).toBeVisible();

    // 11. The imported "Burn" deck is visible on /decks. The deck name also
    //     surfaces in the top-nav "Active deck: Burn" link, so scope to the
    //     decks list to avoid a strict-mode collision.
    await page.goto('/decks');
    await expect(page.getByRole('heading', { name: 'Decks' })).toBeVisible();
    await expect(
      page.getByRole('list').getByText('Burn', { exact: true }),
    ).toBeVisible({ timeout: 10_000 });
  });
});
