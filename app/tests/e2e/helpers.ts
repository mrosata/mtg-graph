import { type Page, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ──────────────────────────────────────────────────────────────────────────
// Artifact lookup — read the same cards-standard.json the app ships, so we
// can find oracleIds by name without going through the UI.
// ──────────────────────────────────────────────────────────────────────────

type ArtifactCard = {
  oracleId: string;
  name: string;
  colors: string[];
  colorIdentity: string[];
  tags?: { tagId: string }[];
};

type Artifact = { cards: ArtifactCard[] };

let _artifact: Artifact | null = null;

export function loadArtifact(): Artifact {
  if (_artifact) return _artifact;
  const p = resolve(__dirname, '../../public/data/cards-standard.json');
  _artifact = JSON.parse(readFileSync(p, 'utf-8')) as Artifact;
  return _artifact;
}

export function findOracleIdByName(name: string): string {
  const art = loadArtifact();
  const card = art.cards.find((c) => c.name === name);
  if (!card) throw new Error(`Card not found in artifact: ${name}`);
  return card.oracleId;
}

// ──────────────────────────────────────────────────────────────────────────
// A small Sultai test deck assembled from the current Standard artifact.
// Cards picked to span multiple tag families (destruction, lifegain,
// counter-magic, resources, card-selection, themes) so the deck graph has
// plenty of edges to render.
//
// If Standard rotates these out, swap the IDs — `findOracleIdByName` lets
// you re-resolve by name first to confirm presence.
// ──────────────────────────────────────────────────────────────────────────

export const SULTAI_TEST_DECK: { name: string; oracleId: string; family: string }[] = [
  { name: 'Bloodletter of Aclazotz', oracleId: '469956a2-7cd4-4695-b8f4-c841526f160d', family: 'lifegain' },
  { name: 'Hamlet Glutton',          oracleId: 'aa1b7cdd-0296-418c-ac3b-7ad3c51f1760', family: 'lifegain' },
  { name: 'Enduring Tenacity',       oracleId: '98e698ae-1a69-469c-9cfb-0e3fedeb71d4', family: 'lifegain' },
  { name: 'Llanowar Elves',          oracleId: '68954295-54e3-4303-a6bc-fc4547a4e3a3', family: 'resources' },
  { name: 'Feed the Cauldron',       oracleId: '21153db6-552a-4956-a53a-a9dfb6968629', family: 'destruction' },
  { name: 'Spider Food',             oracleId: '38eabfea-5ea5-4baa-8ad6-7a7cb00e1fed', family: 'destruction' },
  { name: 'Disdainful Stroke',       oracleId: '11e02134-7b1a-46a4-a89e-7539dd1efada', family: 'counter-magic' },
  { name: "Ashiok's Reaper",         oracleId: '6f1e5571-ddda-4cea-84ef-36a571d8fd51', family: 'card-selection' },
  { name: "Cruel Somnophage // Can't Wake Up", oracleId: '997bdec5-f67b-4822-a3ba-c636e2685e8a', family: 'themes' },
  { name: 'Likeness Looter',         oracleId: 'e04560ea-f2bd-4cb7-8f65-3aa0dd58fbdf', family: 'themes' },
];

// ──────────────────────────────────────────────────────────────────────────
// In-browser state management. We use raw IndexedDB rather than going
// through Dexie because Dexie isn't accessible from page.evaluate scope.
// The Dexie schema is created by the app's first page-load; once that
// happens we can write to it via the raw API safely.
// ──────────────────────────────────────────────────────────────────────────

const DB_NAME = 'mtg-graph';
const ACTIVE_DECK_KEY = 'mtg-graph:activeDeckId';

/**
 * Selector that signals the artifact is hydrated and the app is interactive.
 *
 * BrowserShell renders `<span>{count}</span><span>cards</span>` inside an
 * uppercase header. The two spans share no whitespace in markup (JSX collapses
 * the newline), so the rendered textContent is "4,446cards" — a strict
 * `^\d+ cards$` regex won't match. The "cards" span on its own is unique to
 * this header, so we match it directly.
 *
 * Note: this selector covers `/`, `/deck`, and other pages that mount
 * `BrowserShell`. Pages like `/decks` and `/deck/graph` don't render the
 * counter; navigate to `/` first and call this, then route to your target.
 */
export async function waitForHydration(page: Page, timeout = 30_000): Promise<void> {
  await expect(page.getByText('cards', { exact: true })).toBeVisible({ timeout });
}

/**
 * Open the app once so Dexie creates the DB schema, then clear all
 * persisted state (decks rows + active-deck localStorage key).
 *
 * We *clear* the decks store rather than `deleteDatabase` so the schema
 * Dexie installed remains intact — that lets `seedDeck` below write rows
 * via the raw IndexedDB API without needing to recreate stores/indexes.
 *
 * Pass `gotoFirst: false` if the caller has already navigated.
 */
const SEEN_TOURS_KEY = 'mtg-graph:seen-tours:v1';
const ALL_SEEN_TOURS = JSON.stringify(['global', 'browse', 'decks', 'active-deck', 'deck-graph']);

/**
 * Suppress the onboarding wizard by pre-seeding all tours as "seen" in localStorage.
 * Runs as an init script so it takes effect before any page-load auto-tour can fire.
 * Tests that explicitly want to assert wizard behavior should not call resetState
 * (which calls this) — see app/tests/e2e/wizard.spec.ts for that pattern.
 */
export async function suppressWizard(page: Page): Promise<void> {
  await page.addInitScript(
    ({ key, value }) => { window.localStorage.setItem(key, value); },
    { key: SEEN_TOURS_KEY, value: ALL_SEEN_TOURS },
  );
}

export async function resetState(page: Page, opts: { gotoFirst?: boolean } = {}): Promise<void> {
  await suppressWizard(page);
  if (opts.gotoFirst !== false) {
    await page.goto('/');
    await waitForHydration(page);
  }
  await page.evaluate(async ({ dbName, activeKey }) => {
    window.localStorage.removeItem(activeKey);
    await new Promise<void>((resolveDone, reject) => {
      const req = indexedDB.open(dbName);
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('decks')) {
          db.close();
          resolveDone();
          return;
        }
        const tx = db.transaction(['decks'], 'readwrite');
        tx.objectStore('decks').clear();
        tx.oncomplete = () => { db.close(); resolveDone(); };
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });
  }, { dbName: DB_NAME, activeKey: ACTIVE_DECK_KEY });
}

export type SeedDeckCard = { oracleId: string; count: number; name?: string };

/**
 * Seed a deck directly into IndexedDB. The app must have loaded once before
 * this is called so the DB schema exists. After seeding, you typically want
 * to navigate (or reload) so the app re-reads the seeded state.
 */
export async function seedDeck(
  page: Page,
  opts: { name: string; cards: SeedDeckCard[]; active?: boolean },
): Promise<string> {
  return await page.evaluate(async ({ dbName, activeKey, deckName, cards, active }) => {
    const id: string = crypto.randomUUID();
    await new Promise<void>((resolveOpen, rejectOpen) => {
      const req = indexedDB.open(dbName);
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(['decks'], 'readwrite');
        const store = tx.objectStore('decks');
        const now = Date.now();
        // v2 shape: originalCards + workingCards (seeded decks represent a saved state)
        store.put({ id, name: deckName, format: 'standard', originalCards: cards, workingCards: cards, createdAt: now, updatedAt: now });
        tx.oncomplete = () => { db.close(); resolveOpen(); };
        tx.onerror = () => rejectOpen(tx.error);
      };
      req.onerror = () => rejectOpen(req.error);
    });
    if (active) window.localStorage.setItem(activeKey, id);
    return id;
  }, { dbName: DB_NAME, activeKey: ACTIVE_DECK_KEY, deckName: opts.name, cards: opts.cards, active: opts.active ?? true });
}

/** Convenience: reset + seed the canonical Sultai test deck. Returns the deck id. */
export async function seedSultaiDeck(page: Page, name = 'Sultai E2E'): Promise<string> {
  await resetState(page);
  const id = await seedDeck(page, {
    name,
    cards: SULTAI_TEST_DECK.map(({ oracleId, name: n }) => ({ oracleId, count: 1, name: n })),
    active: true,
  });
  return id;
}

/**
 * Seed a deck with a Creature + Instant + Sorcery + Land — covers the
 * type-section grouping that DeckPage uses to render `<h3>Creatures</h3>`
 * etc. Returns the deckId plus the four cards so tests can address rows by
 * oracleId.
 *
 * Cards used (all real Standard artifact entries):
 * - Llanowar Elves (Creature, CMC 1)
 * - Disdainful Stroke (Instant, CMC 2)
 * - Spider Food (Sorcery)
 * - Forest (Basic Land — counts toward total; excluded from mana curve)
 */
export async function seedMixedTypesDeck(
  page: Page,
  name = 'Sultai Test',
): Promise<{
  deckId: string;
  creature: { oracleId: string; name: string };
  instant: { oracleId: string; name: string };
  sorcery: { oracleId: string; name: string };
  land: { oracleId: string; name: string };
}> {
  await resetState(page);
  const creature = { oracleId: '68954295-54e3-4303-a6bc-fc4547a4e3a3', name: 'Llanowar Elves' };
  const instant = { oracleId: '11e02134-7b1a-46a4-a89e-7539dd1efada', name: 'Disdainful Stroke' };
  const sorcery = { oracleId: '38eabfea-5ea5-4baa-8ad6-7a7cb00e1fed', name: 'Spider Food' };
  const land = { oracleId: 'b34bb2dc-c1af-4d77-b0b3-a0fb342a5fc6', name: 'Forest' };
  const deckId = await seedDeck(page, {
    name,
    cards: [
      { oracleId: creature.oracleId, count: 1, name: creature.name },
      { oracleId: instant.oracleId, count: 1, name: instant.name },
      { oracleId: sorcery.oracleId, count: 1, name: sorcery.name },
      { oracleId: land.oracleId, count: 1, name: land.name },
    ],
    active: true,
  });
  return { deckId, creature, instant, sorcery, land };
}
