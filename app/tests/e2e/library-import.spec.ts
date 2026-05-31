import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resetState, waitForHydration, suppressWizard } from './helpers';

// __dirname is not available in ESM; derive it from import.meta.url instead.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURE = path.resolve(__dirname, '../fixtures/manabox-sample.csv');

// The fixture resolves 4 distinct Standard cards:
//   Llanowar Elves (fdn), Disdainful Stroke (woe), Spider Food (woe), Forest (woe)
// Sol Ring, Tarmogoyf, and Frobulator are non-Standard → unknownSets / unknownNames.

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

test.describe('Library import', () => {
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

  test('imports a Manabox CSV and filters the browse view to the owned subset', async ({ page }) => {
    // ── 1. Initial state: header shows "No library" ──────────────────────────
    await expect(page.getByText('No library')).toBeVisible();

    // Read the initial card count from the header span
    const counter = page.locator('span.font-mono.text-neutral-300').first();
    const initialCount = Number(
      (await counter.textContent() ?? '0').replace(/,/g, ''),
    );
    expect(initialCount).toBeGreaterThan(100);

    // ── 2. Open the "Import library" button in the FilterPanel ───────────────
    await page.getByRole('button', { name: /Import library/i }).click();

    // Modal opens
    await expect(page.getByRole('dialog')).toBeVisible();

    // ── 3. Upload the fixture CSV ─────────────────────────────────────────────
    await page.setInputFiles('input[aria-label="Choose Manabox CSV"]', FIXTURE);

    // Summary appears: "Imported N cards (N copies)"
    await expect(page.getByText(/Imported/)).toBeVisible();

    // ── 4. Click "Use this library" ───────────────────────────────────────────
    await page.getByRole('button', { name: /Use this library/i }).click();

    // Modal closes
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // ── 5. Header badge updates ───────────────────────────────────────────────
    await expect(page.getByText(/Library:/)).toBeVisible();

    // ── 6. Grid shrinks to the library subset ─────────────────────────────────
    await expect.poll(async () => {
      const txt = await counter.textContent();
      return Number((txt ?? '0').replace(/,/g, ''));
    }).toBeLessThan(initialCount);

    const filteredCount = Number(
      (await counter.textContent() ?? '0').replace(/,/g, ''),
    );
    expect(filteredCount).toBeGreaterThan(0);

    // ── 7. Toggle "Library only" off → grid expands back ─────────────────────
    await page.getByLabel(/Library only/i).uncheck();

    await expect.poll(async () => {
      const txt = await counter.textContent();
      return Number((txt ?? '0').replace(/,/g, ''));
    }).toBe(initialCount);
  });
});
