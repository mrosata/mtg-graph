# Deck save / working-state Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace autosave-per-edit with explicit Save / Discard semantics on each deck. Track a saved baseline (`originalCards`) and a working draft (`workingCards`); render added-during-session cards with a green accent and surface fully-removed cards in a red-accented "Removed cards" tray with one-click restore.

**Architecture:** Pure derivations (`deckDiff.ts`) compute dirty / added / removed from the two card lists. Dexie schema bumps v1 → v2 with an `upgrade()` that copies the existing `cards` into both fields. The store gains `saveDeck` / `discardChanges` / `restoreRemoved` actions; existing `addCard` / `removeCard` continue to write but now mutate `workingCards` and no longer bump `updatedAt`. UI changes are confined to `DeckPanel`, `DeckPage` (Cmd-S), and `DecksPage` (list `*` indicator).

**Tech Stack:** React 18 + Vite + TypeScript (strict, `noUncheckedIndexedAccess: true`) + Zustand + Dexie (IndexedDB) + Vitest + React Testing Library + Playwright. `fake-indexeddb` for jsdom-side Dexie tests.

**Reference spec:** `docs/superpowers/specs/2026-05-24-deck-save-working-state-design.md`

---

## File structure

**Create:**
- `app/src/lib/deckDiff.ts` — pure `isDirty`, `added`, `removed` selectors
- `app/src/lib/deckDiff.test.ts` — unit tests
- `app/src/lib/db.migration.test.ts` — Dexie v1 → v2 upgrade test

**Modify:**
- `app/src/lib/db.ts` — `Deck` type, `version(2)` upgrade, export factory for tests
- `app/src/stores/deckStore.ts` — write to `workingCards`; add `saveDeck`, `discardChanges`, `restoreRemoved`; drop `updatedAt` bump from edit actions
- `app/src/stores/deckStore.test.ts` — update existing assertions, add new ones for the new actions
- `app/src/components/DeckPanel.tsx` — read `workingCards`; title `*`; Save / Discard buttons; added-card accent; Removed cards tray
- `app/src/components/DeckPanel.test.tsx` — update fixtures + add tests for new UI
- `app/src/components/DeckPanelCollapsed.tsx` — read `workingCards`
- `app/src/components/InteractionsPanel.tsx` — read `workingCards`
- `app/src/components/AddToDeckButton.tsx` — read `workingCards`
- `app/src/pages/DeckPage.tsx` — Cmd-S keyboard handler
- `app/src/pages/DeckGraphPage.tsx` — read `workingCards`
- `app/src/pages/DecksPage.tsx` — read `workingCards`; show `*` next to dirty deck names
- `app/src/pages/DecksPage.test.tsx` — add test for `*` indicator
- `app/src/lib/legality.ts` — read `workingCards`
- `app/src/lib/deckColors.ts` — read `workingCards`
- `app/src/lib/deckThemes.ts` — read `workingCards`
- `app/src/lib/deckStats.ts` — read `workingCards`
- `app/src/lib/deckExport.ts` — read `workingCards`
- `app/src/lib/deckExport.test.ts` — update fixtures + new working-vs-original test
- `app/tests/e2e/helpers.ts` — `seedDeck` writes `originalCards` / `workingCards`
- `app/tests/e2e/deck-page.spec.ts` — new e2e scenario covering save / discard / refresh

**Create later in plan:**
- `app/src/pages/DeckPage.test.tsx` — Cmd-S handler tests

---

## Task 1: `deckDiff.ts` pure module

Pure, dependency-free module that derives dirty / added / removed from a `Deck`. Lives in `app/src/lib/` next to the other pure helpers. Lands first because it has no dependencies and the store + DeckPanel both consume it.

**Files:**
- Create: `app/src/lib/deckDiff.ts`
- Create: `app/src/lib/deckDiff.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `app/src/lib/deckDiff.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { isDirty, added, removed } from './deckDiff';
import type { Deck } from './db';

function makeDeck(overrides: Partial<Deck> = {}): Deck {
  return {
    id: 'd', name: 'D', format: 'standard',
    originalCards: [], workingCards: [],
    createdAt: 0, updatedAt: 0,
    ...overrides,
  };
}

describe('isDirty', () => {
  it('is false when original and working are both empty', () => {
    expect(isDirty(makeDeck())).toBe(false);
  });

  it('is false when original and working have the same entries in the same order', () => {
    const cards = [{ oracleId: 'a', count: 4 }, { oracleId: 'b', count: 2 }];
    expect(isDirty(makeDeck({ originalCards: cards, workingCards: cards }))).toBe(false);
  });

  it('is false when the same entries appear in a different order', () => {
    const a = [{ oracleId: 'a', count: 4 }, { oracleId: 'b', count: 2 }];
    const b = [{ oracleId: 'b', count: 2 }, { oracleId: 'a', count: 4 }];
    expect(isDirty(makeDeck({ originalCards: a, workingCards: b }))).toBe(false);
  });

  it('is true when working has an extra entry', () => {
    const orig = [{ oracleId: 'a', count: 4 }];
    const work = [{ oracleId: 'a', count: 4 }, { oracleId: 'b', count: 1 }];
    expect(isDirty(makeDeck({ originalCards: orig, workingCards: work }))).toBe(true);
  });

  it('is true when working is missing an entry', () => {
    const orig = [{ oracleId: 'a', count: 4 }, { oracleId: 'b', count: 1 }];
    const work = [{ oracleId: 'a', count: 4 }];
    expect(isDirty(makeDeck({ originalCards: orig, workingCards: work }))).toBe(true);
  });

  it('is true when the same oracleId has a different count', () => {
    const orig = [{ oracleId: 'a', count: 4 }];
    const work = [{ oracleId: 'a', count: 2 }];
    expect(isDirty(makeDeck({ originalCards: orig, workingCards: work }))).toBe(true);
  });

  it('ignores entry name differences', () => {
    const orig = [{ oracleId: 'a', count: 4, name: 'Old' }];
    const work = [{ oracleId: 'a', count: 4, name: 'New' }];
    expect(isDirty(makeDeck({ originalCards: orig, workingCards: work }))).toBe(false);
  });
});

describe('added', () => {
  it('returns nothing when working is a subset of original', () => {
    const orig = [{ oracleId: 'a', count: 4 }];
    const work = [{ oracleId: 'a', count: 2 }];
    expect(added(makeDeck({ originalCards: orig, workingCards: work }))).toEqual([]);
  });

  it('returns working entries whose oracleId is not in original', () => {
    const orig = [{ oracleId: 'a', count: 4 }];
    const work = [{ oracleId: 'a', count: 4 }, { oracleId: 'b', count: 2, name: 'B' }];
    expect(added(makeDeck({ originalCards: orig, workingCards: work }))).toEqual([
      { oracleId: 'b', count: 2, name: 'B' },
    ]);
  });
});

describe('removed', () => {
  it('returns nothing when working contains every original oracleId', () => {
    const orig = [{ oracleId: 'a', count: 4 }];
    const work = [{ oracleId: 'a', count: 1 }];
    expect(removed(makeDeck({ originalCards: orig, workingCards: work }))).toEqual([]);
  });

  it('returns original entries missing from working', () => {
    const orig = [{ oracleId: 'a', count: 4, name: 'A' }, { oracleId: 'b', count: 2 }];
    const work = [{ oracleId: 'a', count: 4 }];
    expect(removed(makeDeck({ originalCards: orig, workingCards: work }))).toEqual([
      { oracleId: 'b', count: 2 },
    ]);
  });

  it('returns the original count, not the working count', () => {
    const orig = [{ oracleId: 'a', count: 4 }];
    const work: Deck['workingCards'] = [];
    expect(removed(makeDeck({ originalCards: orig, workingCards: work }))).toEqual([
      { oracleId: 'a', count: 4 },
    ]);
  });

  it('treats a working entry with count 0 as removed', () => {
    const orig = [{ oracleId: 'a', count: 4 }];
    const work = [{ oracleId: 'a', count: 0 }];
    expect(removed(makeDeck({ originalCards: orig, workingCards: work }))).toEqual([
      { oracleId: 'a', count: 4 },
    ]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run from repo root: `cd app && npx vitest run src/lib/deckDiff.test.ts`
Expected: FAIL — `Cannot find module './deckDiff'` (and a parallel TS error about `originalCards`/`workingCards` on `Deck`, which won't be resolved until Task 2 — that's OK; vitest doesn't type-check, so the test file will still attempt to run and fail on the missing module first).

If vitest is unhappy with the `Deck` import because `Deck` doesn't have those fields yet: temporarily change the import in the test to `import type { Deck as DeckBase } from './db'; type Deck = DeckBase & { originalCards: Array<{oracleId:string;count:number;name?:string}>; workingCards: Array<{oracleId:string;count:number;name?:string}> };` — and revert in Task 2 once the real type lands.

- [ ] **Step 3: Implement `deckDiff.ts`**

Create `app/src/lib/deckDiff.ts`:

```ts
import type { Deck, DeckCard } from './db';

function indexByOracleId(entries: DeckCard[]): Map<string, DeckCard> {
  const out = new Map<string, DeckCard>();
  for (const e of entries) out.set(e.oracleId, e);
  return out;
}

export function isDirty(deck: Deck): boolean {
  if (deck.originalCards.length !== deck.workingCards.length) return true;
  const orig = indexByOracleId(deck.originalCards);
  for (const w of deck.workingCards) {
    const o = orig.get(w.oracleId);
    if (!o || o.count !== w.count) return true;
  }
  return false;
}

export function added(deck: Deck): DeckCard[] {
  const orig = indexByOracleId(deck.originalCards);
  return deck.workingCards.filter((w) => !orig.has(w.oracleId));
}

export function removed(deck: Deck): DeckCard[] {
  const work = indexByOracleId(deck.workingCards);
  const out: DeckCard[] = [];
  for (const o of deck.originalCards) {
    const w = work.get(o.oracleId);
    if (!w || w.count === 0) out.push(o);
  }
  return out;
}
```

(`DeckCard` is exported from `db.ts` in Task 2. Until then this file won't compile — Task 1 ends red on the type, green only on test logic. That's fine; vitest doesn't type-check during `npx vitest run`. Final compile is verified at the end of Task 2.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && npx vitest run src/lib/deckDiff.test.ts`
Expected: all 13 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/deckDiff.ts app/src/lib/deckDiff.test.ts
git commit -m "feat(app): add deckDiff (isDirty/added/removed) selectors"
```

---

## Task 2: `Deck` type + Dexie v1→v2 migration + propagate `workingCards` to all consumers

The shape change is one atomic commit because partial states break the build (`Deck` no longer has `cards`; every consumer must read `workingCards`). The Dexie migration runs on every existing user's DB on first load after this ships.

**Files:**
- Modify: `app/src/lib/db.ts`
- Modify: `app/src/stores/deckStore.ts`
- Modify: `app/src/stores/deckStore.test.ts`
- Modify: `app/src/components/DeckPanel.tsx`
- Modify: `app/src/components/DeckPanel.test.tsx`
- Modify: `app/src/components/DeckPanelCollapsed.tsx`
- Modify: `app/src/components/InteractionsPanel.tsx`
- Modify: `app/src/components/AddToDeckButton.tsx`
- Modify: `app/src/pages/DeckPage.tsx` (only if it references `deck.cards`; check first)
- Modify: `app/src/pages/DeckGraphPage.tsx`
- Modify: `app/src/pages/DecksPage.tsx`
- Modify: `app/src/lib/legality.ts`
- Modify: `app/src/lib/deckColors.ts`
- Modify: `app/src/lib/deckThemes.ts`
- Modify: `app/src/lib/deckStats.ts`
- Modify: `app/src/lib/deckExport.ts`
- Modify: `app/src/lib/deckExport.test.ts`
- Modify: `app/tests/e2e/helpers.ts`
- Create: `app/src/lib/db.migration.test.ts`

- [ ] **Step 1: Write the migration test**

Create `app/src/lib/db.migration.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import Dexie from 'dexie';
import { makeMtgDb } from './db';

describe('Dexie migration v1 → v2', () => {
  it('copies cards into originalCards and workingCards and removes the cards field', async () => {
    const dbName = `migration-test-${crypto.randomUUID()}`;

    // Set up a v1 database with one deck in the old shape
    const v1 = new Dexie(dbName);
    v1.version(1).stores({ decks: 'id, name, updatedAt', artifactCache: '&ruleVersion' });
    await v1.open();
    await v1.table('decks').put({
      id: 'd1',
      name: 'Legacy',
      format: 'standard',
      cards: [
        { oracleId: 'a', count: 4, name: 'Lightning Bolt' },
        { oracleId: 'b', count: 2 },
      ],
      createdAt: 100,
      updatedAt: 200,
    });
    v1.close();

    // Open the same database via the production factory (declares v1 + v2)
    const v2 = makeMtgDb(dbName);
    await v2.open();
    const row = await v2.decks.get('d1');
    expect(row).toBeDefined();
    expect(row!.originalCards).toEqual([
      { oracleId: 'a', count: 4, name: 'Lightning Bolt' },
      { oracleId: 'b', count: 2 },
    ]);
    expect(row!.workingCards).toEqual([
      { oracleId: 'a', count: 4, name: 'Lightning Bolt' },
      { oracleId: 'b', count: 2 },
    ]);
    expect((row as unknown as { cards?: unknown }).cards).toBeUndefined();
    v2.close();
  });

  it('migrates multiple decks', async () => {
    const dbName = `migration-test-${crypto.randomUUID()}`;
    const v1 = new Dexie(dbName);
    v1.version(1).stores({ decks: 'id, name, updatedAt', artifactCache: '&ruleVersion' });
    await v1.open();
    await v1.table('decks').bulkPut([
      { id: 'd1', name: 'A', format: 'standard', cards: [{ oracleId: 'a', count: 1 }], createdAt: 0, updatedAt: 0 },
      { id: 'd2', name: 'B', format: 'standard', cards: [], createdAt: 0, updatedAt: 0 },
    ]);
    v1.close();

    const v2 = makeMtgDb(dbName);
    await v2.open();
    const rows = await v2.decks.toArray();
    expect(rows).toHaveLength(2);
    for (const r of rows) {
      expect(r.originalCards).toBeDefined();
      expect(r.workingCards).toBeDefined();
      expect((r as unknown as { cards?: unknown }).cards).toBeUndefined();
      expect(r.originalCards).toEqual(r.workingCards);
    }
    v2.close();
  });

  it('opens cleanly on a brand-new database with no v1 data', async () => {
    const dbName = `migration-test-${crypto.randomUUID()}`;
    const v2 = makeMtgDb(dbName);
    await v2.open();
    expect(await v2.decks.toArray()).toEqual([]);
    v2.close();
  });
});
```

- [ ] **Step 2: Run the migration test to verify it fails**

Run: `cd app && npx vitest run src/lib/db.migration.test.ts`
Expected: FAIL — `makeMtgDb` is not exported from `db.ts`.

- [ ] **Step 3: Rewrite `app/src/lib/db.ts`**

Replace the file with:

```ts
import Dexie, { Table } from 'dexie';
import type { Artifact } from '@shared/types';

export type DeckCard = { oracleId: string; count: number; name?: string };

export type Deck = {
  id: string;
  name: string;
  format: 'standard';
  originalCards: DeckCard[];
  workingCards: DeckCard[];
  createdAt: number;
  updatedAt: number;
};

export type ArtifactCacheRow = {
  ruleVersion: string;
  sourceSet: string;
  fetchedAt: number;
  artifact: Artifact;
};

export class MtgDb extends Dexie {
  decks!: Table<Deck, string>;
  artifactCache!: Table<ArtifactCacheRow, string>;

  constructor(name = 'mtg-graph') {
    super(name);
    this.version(1).stores({
      decks: 'id, name, updatedAt',
      artifactCache: '&ruleVersion',
    });
    this.version(2)
      .stores({
        decks: 'id, name, updatedAt',
        artifactCache: '&ruleVersion',
      })
      .upgrade((tx) =>
        tx
          .table('decks')
          .toCollection()
          .modify((d: { cards?: DeckCard[]; originalCards?: DeckCard[]; workingCards?: DeckCard[] }) => {
            const baseline = d.cards ?? [];
            d.originalCards = baseline;
            d.workingCards = baseline;
            delete d.cards;
          }),
      );
  }
}

export function makeMtgDb(name = 'mtg-graph'): MtgDb {
  return new MtgDb(name);
}

export const db = makeMtgDb();
```

- [ ] **Step 4: Update `app/src/stores/deckStore.ts`**

Apply these edits:

1. Change the `DeckCard` import to come from `db.ts` (it now lives there): add `type DeckCard` to the existing import.
2. In `createDeck`, replace `cards: []` with `originalCards: [], workingCards: []`.
3. In `importDeck`, replace the `cards: resolved.map(...)` line with:
   ```ts
   const baseline = resolved.map((e) => ({ oracleId: e.oracleId, count: e.count, name: e.name }));
   ```
   and inside the `deck: Deck = { ... }` literal use `originalCards: baseline, workingCards: baseline.slice()`.
4. In `addCard`, replace every `d.cards` with `d.workingCards`, the spread `...d, cards` with `...d, workingCards`. **Remove** `updatedAt: Date.now()` from the returned object.
5. In `removeCard`, same: replace `d.cards` → `d.workingCards`, `...d, cards` → `...d, workingCards`. **Remove** `updatedAt: Date.now()`.

Final shape of `addCard`:

```ts
addCard: async (oracleId, qty, name) => {
  const id = get().activeDeckId;
  if (!id) throw new Error('No active deck');
  const decks = get().decks.map((d) => {
    if (d.id !== id) return d;
    const existing = d.workingCards.find((c) => c.oracleId === oracleId);
    const workingCards = existing
      ? d.workingCards.map((c) =>
          c.oracleId === oracleId ? { ...c, count: c.count + qty, name: c.name ?? name } : c,
        )
      : [...d.workingCards, name ? { oracleId, count: qty, name } : { oracleId, count: qty }];
    return { ...d, workingCards };
  });
  const updated = decks.find((d) => d.id === id);
  if (updated) await persist(updated);
  set({ decks });
},
```

Final shape of `removeCard`:

```ts
removeCard: async (oracleId, qty) => {
  const id = get().activeDeckId;
  if (!id) throw new Error('No active deck');
  const decks = get().decks.map((d) => {
    if (d.id !== id) return d;
    const workingCards = d.workingCards
      .map((c) => (c.oracleId === oracleId ? { ...c, count: c.count - qty } : c))
      .filter((c) => c.count > 0);
    return { ...d, workingCards };
  });
  const updated = decks.find((d) => d.id === id);
  if (updated) await persist(updated);
  set({ decks });
},
```

- [ ] **Step 5: Update every other consumer to read `workingCards`**

Apply this mechanical substitution in each file:

- `app/src/components/DeckPanel.tsx` (lines ~49 and ~68): `deck.cards` → `deck.workingCards`, `deck?.cards` → `deck?.workingCards`.
- `app/src/components/DeckPanelCollapsed.tsx` (line ~45): `deck?.cards` → `deck?.workingCards`.
- `app/src/components/InteractionsPanel.tsx` (line ~81): `activeDeck?.cards` → `activeDeck?.workingCards`.
- `app/src/components/AddToDeckButton.tsx` (line ~15): `activeDeck?.cards` → `activeDeck?.workingCards`.
- `app/src/pages/DeckGraphPage.tsx` (lines ~59, ~97, ~100, ~101, ~107, ~181, ~239, ~262): every `deck.cards` → `deck.workingCards`, every `deck?.cards` → `deck?.workingCards`.
- `app/src/pages/DecksPage.tsx` (lines ~72 and ~99): `deck.cards` and `d.cards` → `deck.workingCards` and `d.workingCards`.
- `app/src/lib/legality.ts` (lines ~13 and ~21): `deck.cards` → `deck.workingCards`.
- `app/src/lib/deckColors.ts` (line ~8): `deck.cards` → `deck.workingCards`.
- `app/src/lib/deckThemes.ts` (line ~10): `deck.cards` → `deck.workingCards`.
- `app/src/lib/deckStats.ts` (lines ~40, ~55, ~94): `deck.cards` → `deck.workingCards`.
- `app/src/lib/deckExport.ts` (line ~5): `deck.cards` → `deck.workingCards`.

Quick verification command:

```bash
cd app && grep -rn 'deck\.cards\|deck?\.cards' src --include='*.ts' --include='*.tsx' | grep -v '\.test\.'
```

Expected: no matches.

- [ ] **Step 6: Update existing tests that reference `cards` on `Deck`**

In `app/src/stores/deckStore.test.ts`, replace every occurrence of `deck.cards` and `deck?.cards` with `deck.workingCards` / `deck?.workingCards` (lines ~24, ~32, ~39, ~46, ~54, ~61, ~150 — there are 7 spots). In `makeDeck` (line ~85-95) replace `cards: []` with `originalCards: [], workingCards: []`.

In `app/src/components/DeckPanel.test.tsx`, replace `cards: [...]` in the `beforeEach` (line ~33) and in the two override blocks (lines ~68 and ~82) with `originalCards: [...], workingCards: [...]` (use the same array for both).

In `app/src/lib/deckExport.test.ts` (line ~26): `cards: [...deck.cards, {...}]` → `workingCards: [...deck.workingCards, {...}], originalCards: deck.originalCards`. Also update any fixture deck literal at the top of the file: replace `cards:` with both `originalCards:` and `workingCards:` set to the same array.

Additionally add this test at the end of `deckExport.test.ts` to lock in that export reads working, not original:

```ts
it('reads workingCards, not originalCards', () => {
  const deck: Deck = {
    id: 'd', name: 'D', format: 'standard',
    originalCards: [{ oracleId: 'a', count: 4 }, { oracleId: 'b', count: 2 }],
    workingCards: [{ oracleId: 'a', count: 4 }], // 'b' removed in working
    createdAt: 0, updatedAt: 0,
  };
  const cards = new Map<string, Card>([
    ['a', { ...baseCard, oracleId: 'a', name: 'Alpha' }],
    ['b', { ...baseCard, oracleId: 'b', name: 'Beta' }],
  ]);
  const out = deckToArenaText(deck, cards);
  expect(out).toContain('4 Alpha');
  expect(out).not.toContain('Beta');
});
```

(`baseCard` is whatever fixture builder the existing tests in this file use; reuse it. If the file builds cards inline rather than via a helper, copy the existing pattern.)

In `app/src/pages/DecksPage.test.tsx` — no direct `deck.cards` references (verify with grep), but make sure any test that creates a deck via `useDeckStore.getState().createDeck(...)` followed by `addCard` still passes — those don't reference `cards` directly.

- [ ] **Step 7: Update `app/tests/e2e/helpers.ts` `seedDeck`**

The seeded row must match the v2 shape so the v2-aware app reads it correctly. In `seedDeck` (line ~142), replace:

```ts
store.put({ id, name: deckName, format: 'standard', cards, createdAt: now, updatedAt: now });
```

with:

```ts
store.put({
  id, name: deckName, format: 'standard',
  originalCards: cards, workingCards: cards,
  createdAt: now, updatedAt: now,
});
```

Note: `cards` is the function parameter (typed `SeedDeckCard[]`); we deliberately pass the same array reference to both fields because seeded decks are "saved" decks (not dirty). Update the JSDoc above `seedDeck` to mention the v2 shape.

- [ ] **Step 8: Run the full app test suite + build**

```bash
cd app && npm test
cd app && npm run build
```

Expected: all unit tests pass, vite build succeeds (no TS errors). The migration test added in Step 1 should now pass too:

```bash
cd app && npx vitest run src/lib/db.migration.test.ts
```

Expected: 3 PASS.

- [ ] **Step 9: Commit**

```bash
git add app/src/lib/db.ts app/src/lib/db.migration.test.ts \
  app/src/stores/deckStore.ts app/src/stores/deckStore.test.ts \
  app/src/components/DeckPanel.tsx app/src/components/DeckPanel.test.tsx \
  app/src/components/DeckPanelCollapsed.tsx app/src/components/InteractionsPanel.tsx \
  app/src/components/AddToDeckButton.tsx app/src/pages/DeckGraphPage.tsx \
  app/src/pages/DecksPage.tsx \
  app/src/lib/legality.ts app/src/lib/deckColors.ts app/src/lib/deckThemes.ts \
  app/src/lib/deckStats.ts app/src/lib/deckExport.ts app/src/lib/deckExport.test.ts \
  app/tests/e2e/helpers.ts
git commit -m "feat(app): split Deck into originalCards + workingCards (Dexie v2 migration)"
```

---

## Task 3: New store actions — `saveDeck`, `discardChanges`, `restoreRemoved`

All three operate on the active deck (like `addCard` / `removeCard`). Persistence is per-mutation. None of them bump `updatedAt` except `saveDeck`.

**Files:**
- Modify: `app/src/stores/deckStore.ts`
- Modify: `app/src/stores/deckStore.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `app/src/stores/deckStore.test.ts` (after the existing `importDeck` describe block):

```ts
import { isDirty } from '../lib/deckDiff';

describe('saveDeck', () => {
  it('copies workingCards into originalCards and clears dirty state', async () => {
    await useDeckStore.getState().createDeck('S');
    await useDeckStore.getState().addCard('a', 4);
    const before = useDeckStore.getState().decks[0]!;
    expect(isDirty(before)).toBe(true);

    await useDeckStore.getState().saveDeck(before.id);
    const after = useDeckStore.getState().decks[0]!;
    expect(after.originalCards).toEqual(after.workingCards);
    expect(isDirty(after)).toBe(false);
  });

  it('bumps updatedAt on save', async () => {
    const id = await useDeckStore.getState().createDeck('S');
    const created = useDeckStore.getState().decks[0]!;
    await new Promise((r) => setTimeout(r, 2)); // ensure Date.now() moves forward
    await useDeckStore.getState().addCard('a', 1);
    await useDeckStore.getState().saveDeck(id);
    const saved = useDeckStore.getState().decks[0]!;
    expect(saved.updatedAt).toBeGreaterThan(created.updatedAt);
  });
});

describe('addCard / removeCard no longer bump updatedAt', () => {
  it('working edits leave updatedAt unchanged', async () => {
    await useDeckStore.getState().createDeck('S');
    const before = useDeckStore.getState().decks[0]!;
    await new Promise((r) => setTimeout(r, 2));
    await useDeckStore.getState().addCard('a', 1);
    await useDeckStore.getState().removeCard('a', 1);
    const after = useDeckStore.getState().decks[0]!;
    expect(after.updatedAt).toBe(before.updatedAt);
  });
});

describe('discardChanges', () => {
  it('reverts workingCards to originalCards', async () => {
    const id = await useDeckStore.getState().createDeck('D');
    await useDeckStore.getState().addCard('a', 4);
    await useDeckStore.getState().saveDeck(id);
    await useDeckStore.getState().addCard('b', 1);
    await useDeckStore.getState().removeCard('a', 4);

    await useDeckStore.getState().discardChanges(id);

    const after = useDeckStore.getState().decks[0]!;
    expect(after.workingCards).toEqual(after.originalCards);
    expect(isDirty(after)).toBe(false);
  });

  it('does not bump updatedAt', async () => {
    const id = await useDeckStore.getState().createDeck('D');
    await useDeckStore.getState().addCard('a', 1);
    await useDeckStore.getState().saveDeck(id);
    const savedAt = useDeckStore.getState().decks[0]!.updatedAt;
    await new Promise((r) => setTimeout(r, 2));
    await useDeckStore.getState().addCard('b', 1);
    await useDeckStore.getState().discardChanges(id);
    expect(useDeckStore.getState().decks[0]!.updatedAt).toBe(savedAt);
  });
});

describe('restoreRemoved', () => {
  it('re-adds an entry at its original count', async () => {
    const id = await useDeckStore.getState().createDeck('R');
    await useDeckStore.getState().addCard('a', 4);
    await useDeckStore.getState().saveDeck(id);
    await useDeckStore.getState().removeCard('a', 4); // now in tray
    await useDeckStore.getState().restoreRemoved('a');
    const after = useDeckStore.getState().decks[0]!;
    expect(after.workingCards).toEqual([{ oracleId: 'a', count: 4 }]);
  });

  it('preserves the original name when present', async () => {
    const id = await useDeckStore.getState().createDeck('R');
    await useDeckStore.getState().addCard('a', 2, 'Lightning Bolt');
    await useDeckStore.getState().saveDeck(id);
    await useDeckStore.getState().removeCard('a', 2);
    await useDeckStore.getState().restoreRemoved('a');
    expect(useDeckStore.getState().decks[0]!.workingCards).toEqual([
      { oracleId: 'a', count: 2, name: 'Lightning Bolt' },
    ]);
  });

  it('is a no-op when the card is still in working', async () => {
    await useDeckStore.getState().createDeck('R');
    await useDeckStore.getState().addCard('a', 4);
    await useDeckStore.getState().saveDeck(useDeckStore.getState().decks[0]!.id);
    await useDeckStore.getState().restoreRemoved('a'); // still there
    expect(useDeckStore.getState().decks[0]!.workingCards).toEqual([{ oracleId: 'a', count: 4 }]);
  });

  it('is a no-op when the oracleId is not in originalCards', async () => {
    await useDeckStore.getState().createDeck('R');
    await useDeckStore.getState().restoreRemoved('ghost');
    expect(useDeckStore.getState().decks[0]!.workingCards).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd app && npx vitest run src/stores/deckStore.test.ts`
Expected: the new tests FAIL — `saveDeck`, `discardChanges`, `restoreRemoved` don't exist on the store.

- [ ] **Step 3: Add the three actions to `deckStore.ts`**

Extend the `DeckState` type:

```ts
type DeckState = {
  decks: Deck[];
  activeDeckId: string | null;
  load: () => Promise<void>;
  createDeck: (name: string) => Promise<string>;
  importDeck: (name: string | null, resolved: ResolvedEntry[]) => Promise<string>;
  setActiveDeck: (id: string | null) => void;
  renameDeck: (id: string, name: string) => Promise<void>;
  deleteDeck: (id: string) => Promise<void>;
  addCard: (oracleId: string, qty: number, name?: string) => Promise<void>;
  removeCard: (oracleId: string, qty: number) => Promise<void>;
  saveDeck: (id: string) => Promise<void>;
  discardChanges: (id: string) => Promise<void>;
  restoreRemoved: (oracleId: string) => Promise<void>;
};
```

Add the three implementations inside the `create<DeckState>` block, after `removeCard`:

```ts
saveDeck: async (id) => {
  const decks = get().decks.map((d) => {
    if (d.id !== id) return d;
    return {
      ...d,
      originalCards: d.workingCards.map((c) => ({ ...c })),
      updatedAt: Date.now(),
    };
  });
  const updated = decks.find((d) => d.id === id);
  if (updated) await persist(updated);
  set({ decks });
},

discardChanges: async (id) => {
  const decks = get().decks.map((d) => {
    if (d.id !== id) return d;
    return {
      ...d,
      workingCards: d.originalCards.map((c) => ({ ...c })),
    };
  });
  const updated = decks.find((d) => d.id === id);
  if (updated) await persist(updated);
  set({ decks });
},

restoreRemoved: async (oracleId) => {
  const id = get().activeDeckId;
  if (!id) throw new Error('No active deck');
  const decks = get().decks.map((d) => {
    if (d.id !== id) return d;
    const orig = d.originalCards.find((c) => c.oracleId === oracleId);
    if (!orig) return d; // not in original — no-op
    if (d.workingCards.find((c) => c.oracleId === oracleId)) return d; // already present — no-op
    const restored = orig.name
      ? { oracleId, count: orig.count, name: orig.name }
      : { oracleId, count: orig.count };
    return { ...d, workingCards: [...d.workingCards, restored] };
  });
  const updated = decks.find((d) => d.id === id);
  if (updated) await persist(updated);
  set({ decks });
},
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && npx vitest run src/stores/deckStore.test.ts`
Expected: all tests PASS (existing + 8 new).

- [ ] **Step 5: Commit**

```bash
git add app/src/stores/deckStore.ts app/src/stores/deckStore.test.ts
git commit -m "feat(app): add saveDeck/discardChanges/restoreRemoved; stop bumping updatedAt on edits"
```

---

## Task 4: `DeckPanel` — title `*` indicator + Save / Discard buttons

Surface the dirty state in the rail header and add the two controls. Buttons disabled when clean. No styling-of-rows or tray work yet (Task 5).

**Files:**
- Modify: `app/src/components/DeckPanel.tsx`
- Modify: `app/src/components/DeckPanel.test.tsx`

- [ ] **Step 1: Write failing tests**

Append to `app/src/components/DeckPanel.test.tsx` (after the existing `describe('DeckPanel — collapse toggle')` block):

```ts
import { act } from '@testing-library/react';

describe('DeckPanel — dirty state, Save, Discard', () => {
  it('does not render a "*" in the title when the deck is clean', () => {
    useDeckStore.setState({
      activeDeckId: 'd1',
      decks: [{
        id: 'd1', name: 'My Deck', format: 'standard',
        originalCards: [{ oracleId: 'bolt', count: 4 }],
        workingCards: [{ oracleId: 'bolt', count: 4 }],
        createdAt: 0, updatedAt: 0,
      }],
    });
    render(<DeckPanel />);
    const title = screen.getByRole('heading', { name: /my deck/i });
    expect(title.textContent).not.toMatch(/\*/);
  });

  it('renders a "*" suffix in the title when the deck is dirty', () => {
    useDeckStore.setState({
      activeDeckId: 'd1',
      decks: [{
        id: 'd1', name: 'My Deck', format: 'standard',
        originalCards: [{ oracleId: 'bolt', count: 4 }],
        workingCards: [{ oracleId: 'bolt', count: 2 }],
        createdAt: 0, updatedAt: 0,
      }],
    });
    render(<DeckPanel />);
    const title = screen.getByRole('heading', { name: /my deck/i });
    expect(title.textContent).toMatch(/\*$/);
  });

  it('Save and Discard buttons are disabled when the deck is clean', () => {
    useDeckStore.setState({
      activeDeckId: 'd1',
      decks: [{
        id: 'd1', name: 'My Deck', format: 'standard',
        originalCards: [{ oracleId: 'bolt', count: 4 }],
        workingCards: [{ oracleId: 'bolt', count: 4 }],
        createdAt: 0, updatedAt: 0,
      }],
    });
    render(<DeckPanel />);
    expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^discard$/i })).toBeDisabled();
  });

  it('Save and Discard buttons are enabled when the deck is dirty', () => {
    useDeckStore.setState({
      activeDeckId: 'd1',
      decks: [{
        id: 'd1', name: 'My Deck', format: 'standard',
        originalCards: [{ oracleId: 'bolt', count: 4 }],
        workingCards: [{ oracleId: 'bolt', count: 2 }],
        createdAt: 0, updatedAt: 0,
      }],
    });
    render(<DeckPanel />);
    expect(screen.getByRole('button', { name: /^save$/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /^discard$/i })).toBeEnabled();
  });

  it('clicking Save invokes saveDeck and clears dirty indicators', async () => {
    useDeckStore.setState({
      activeDeckId: 'd1',
      decks: [{
        id: 'd1', name: 'My Deck', format: 'standard',
        originalCards: [{ oracleId: 'bolt', count: 4 }],
        workingCards: [{ oracleId: 'bolt', count: 2 }],
        createdAt: 0, updatedAt: 0,
      }],
    });
    render(<DeckPanel />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    });
    const title = screen.getByRole('heading', { name: /my deck/i });
    expect(title.textContent).not.toMatch(/\*/);
    expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled();
  });

  it('clicking Discard invokes discardChanges and clears dirty indicators', async () => {
    useDeckStore.setState({
      activeDeckId: 'd1',
      decks: [{
        id: 'd1', name: 'My Deck', format: 'standard',
        originalCards: [{ oracleId: 'bolt', count: 4 }],
        workingCards: [{ oracleId: 'bolt', count: 2 }],
        createdAt: 0, updatedAt: 0,
      }],
    });
    render(<DeckPanel />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^discard$/i }));
    });
    const title = screen.getByRole('heading', { name: /my deck/i });
    expect(title.textContent).not.toMatch(/\*/);
    expect(useDeckStore.getState().decks[0]!.workingCards).toEqual([{ oracleId: 'bolt', count: 4 }]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd app && npx vitest run src/components/DeckPanel.test.tsx`
Expected: the new tests FAIL — title has no `*`, Save / Discard buttons don't exist.

- [ ] **Step 3: Update `DeckPanel.tsx`**

In `app/src/components/DeckPanel.tsx`:

1. Add imports at the top:
   ```ts
   import { isDirty } from '../lib/deckDiff';
   ```
2. In the component, after the `const removeCard = ...` line, add:
   ```ts
   const saveDeck = useDeckStore((s) => s.saveDeck);
   const discardChanges = useDeckStore((s) => s.discardChanges);
   ```
3. After the `const total = ...` line (around line 68), add:
   ```ts
   const dirty = deck ? isDirty(deck) : false;
   ```
4. Replace the `<h2>` element (currently lines 114–121) so it appends `*` when dirty:
   ```tsx
   <h2
     onClick={startEditingName}
     className="cursor-pointer truncate text-lg font-semibold hover:underline"
     title="Click to rename"
   >
     {deck.name}{dirty ? '*' : ''}
   </h2>
   ```
5. After the existing `<p className="text-xs text-neutral-400">{total} cards</p>` line, before the `<button>...Export</button>` block, add:
   ```tsx
   <div className="mt-2 flex gap-2">
     <button
       type="button"
       onClick={() => saveDeck(deck.id)}
       disabled={!dirty}
       className="rounded bg-amber-500 px-2 py-0.5 text-xs font-semibold text-black disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
     >
       Save
     </button>
     <button
       type="button"
       onClick={() => discardChanges(deck.id)}
       disabled={!dirty}
       className="rounded border border-red-500/50 px-2 py-0.5 text-xs text-red-400 disabled:cursor-not-allowed disabled:border-neutral-800 disabled:text-neutral-600"
     >
       Discard
     </button>
   </div>
   ```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd app && npx vitest run src/components/DeckPanel.test.tsx
```

Expected: all tests PASS (existing + 6 new).

- [ ] **Step 5: Commit**

```bash
git add app/src/components/DeckPanel.tsx app/src/components/DeckPanel.test.tsx
git commit -m "feat(app): DeckPanel title * + Save/Discard buttons"
```

---

## Task 5: `DeckPanel` — added-card accent + Removed cards tray

Render an accent on cards in `added(deck)` and a new "Removed cards" section at the bottom of the rail that shows `removed(deck)` with one-click restore.

**Files:**
- Modify: `app/src/components/DeckPanel.tsx`
- Modify: `app/src/components/DeckPanel.test.tsx`

- [ ] **Step 1: Write failing tests**

Append to `app/src/components/DeckPanel.test.tsx`:

```ts
describe('DeckPanel — added accent + Removed cards tray', () => {
  it('does not render the "Removed cards" section when nothing was removed', () => {
    useDeckStore.setState({
      activeDeckId: 'd1',
      decks: [{
        id: 'd1', name: 'D', format: 'standard',
        originalCards: [{ oracleId: 'bolt', count: 4 }],
        workingCards: [{ oracleId: 'bolt', count: 4 }],
        createdAt: 0, updatedAt: 0,
      }],
    });
    render(<DeckPanel />);
    expect(screen.queryByText(/removed cards/i)).not.toBeInTheDocument();
  });

  it('renders a "Removed cards" section listing fully-removed cards', () => {
    useDeckStore.setState({
      activeDeckId: 'd1',
      decks: [{
        id: 'd1', name: 'D', format: 'standard',
        originalCards: [
          { oracleId: 'bolt', count: 4 },
          { oracleId: 'bear', count: 2 },
        ],
        workingCards: [{ oracleId: 'bolt', count: 4 }],
        createdAt: 0, updatedAt: 0,
      }],
    });
    render(<DeckPanel />);
    expect(screen.getByText(/removed cards/i)).toBeInTheDocument();
    // Grizzly Bears should appear under Removed cards (lookup by the test card map)
    const removedSection = screen.getByText(/removed cards/i).closest('div')!;
    expect(removedSection.textContent).toMatch(/Grizzly Bears/);
  });

  it('clicking a removed-card row restores it at the original count', async () => {
    useDeckStore.setState({
      activeDeckId: 'd1',
      decks: [{
        id: 'd1', name: 'D', format: 'standard',
        originalCards: [
          { oracleId: 'bolt', count: 4 },
          { oracleId: 'bear', count: 2 },
        ],
        workingCards: [{ oracleId: 'bolt', count: 4 }],
        createdAt: 0, updatedAt: 0,
      }],
    });
    render(<DeckPanel />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /restore.*grizzly bears/i }));
    });
    expect(useDeckStore.getState().decks[0]!.workingCards).toEqual([
      { oracleId: 'bolt', count: 4 },
      { oracleId: 'bear', count: 2 },
    ]);
    expect(screen.queryByText(/removed cards/i)).not.toBeInTheDocument();
  });

  it('applies the added-card accent class to rows whose oracleId is not in originalCards', () => {
    useDeckStore.setState({
      activeDeckId: 'd1',
      decks: [{
        id: 'd1', name: 'D', format: 'standard',
        originalCards: [{ oracleId: 'bolt', count: 4 }],
        workingCards: [
          { oracleId: 'bolt', count: 4 },
          { oracleId: 'bear', count: 1 },
        ],
        createdAt: 0, updatedAt: 0,
      }],
    });
    render(<DeckPanel />);
    const bearRow = screen.getByText('Grizzly Bears').closest('[data-testid="card-row"]') as HTMLElement | null;
    expect(bearRow).not.toBeNull();
    expect(bearRow!.className).toMatch(/border-green-500/);

    const boltRow = screen.getByText('Lightning Bolt').closest('[data-testid="card-row"]') as HTMLElement | null;
    expect(boltRow).not.toBeNull();
    expect(boltRow!.className).not.toMatch(/border-green-500/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd app && npx vitest run src/components/DeckPanel.test.tsx
```

Expected: the four new tests FAIL — no "Removed cards" section, no accent class, no `data-testid="card-row"`.

- [ ] **Step 3: Add `data-testid` + optional `className` to `CardListRow`**

In `app/src/components/CardListRow.tsx`:

1. Add `className?: string;` to the `Props` type (after `rightSlot?: ReactNode;`).
2. Destructure `className` in the function signature alongside the existing props.
3. Replace the existing `<li>` opening tag (currently lines 32–38):

   ```tsx
   <li
     data-oracle-id={oracleId}
     onMouseEnter={onMouseEnter}
     onMouseMove={onMouseMove}
     onMouseLeave={onMouseLeave}
     className="group flex items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-neutral-900/50"
   >
   ```

   with:

   ```tsx
   <li
     data-oracle-id={oracleId}
     data-testid="card-row"
     onMouseEnter={onMouseEnter}
     onMouseMove={onMouseMove}
     onMouseLeave={onMouseLeave}
     className={`group flex items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-neutral-900/50${className ? ' ' + className : ''}`}
   >
   ```

- [ ] **Step 4: Update `DeckPanel.tsx` to apply the accent + render the Removed cards section**

In `app/src/components/DeckPanel.tsx`:

1. Add to imports:
   ```ts
   import { added, removed, isDirty } from '../lib/deckDiff';
   ```
   (Replace the existing `import { isDirty } ...` line from Task 4 with the three-name import.)

2. After the `const dirty = ...` line (added in Task 4), add:
   ```ts
   const addedSet = useMemo(() => new Set(deck ? added(deck).map((c) => c.oracleId) : []), [deck]);
   const removedEntries = useMemo(() => (deck ? removed(deck) : []), [deck]);
   ```

3. Update the `<CardListRow>` invocation inside the type-group loop. Find the existing element (it spans roughly lines 166–188 of the post-Task-2 file) and add `className={addedSet.has(e.oracleId) ? 'border-l-2 border-green-500 pl-1' : ''}` as a new prop.

4. Update the `Unknown` group's `<li>` (around line 198). Wrap its outer `<li>` with the same accent: change `<li className="flex items-center gap-2 px-1 py-0.5 text-sm">` to:
   ```tsx
   <li
     data-testid="card-row"
     className={`flex items-center gap-2 px-1 py-0.5 text-sm ${
       addedSet.has(e.oracleId) ? 'border-l-2 border-green-500 pl-1' : ''
     }`}
   >
   ```

5. After the existing `{grouped['Unknown']?.length ? (...) : null}` block (around line 209) but still inside the outer `<div className="space-y-3">`, add the Removed cards section:

   ```tsx
   {removedEntries.length > 0 && (
     <div>
       <h3 className="text-xs uppercase tracking-wide text-neutral-400">Removed cards</h3>
       <ul className="mt-1 space-y-0.5">
         {removedEntries.map((r) => {
           const displayName = cards.get(r.oracleId)?.name ?? r.name ?? `Unknown card (oracleId: ${r.oracleId.slice(0, 8)})`;
           return (
             <li
               key={r.oracleId}
               data-testid="removed-row"
               className="border-l-2 border-red-500 pl-1"
             >
               <button
                 type="button"
                 onClick={() => restoreRemoved(r.oracleId)}
                 aria-label={`Restore ${displayName}`}
                 className="flex w-full items-center gap-2 rounded px-1 py-0.5 text-left text-sm text-neutral-300 hover:bg-neutral-900 hover:text-neutral-100"
               >
                 <span className="tabular-nums text-neutral-500">{r.count}×</span>
                 <span className="truncate">{displayName}</span>
                 <span className="ml-auto text-xs text-neutral-500">Restore</span>
               </button>
             </li>
           );
         })}
       </ul>
     </div>
   )}
   ```

6. Add the `restoreRemoved` action to the store-destructure at the top of the component:
   ```ts
   const restoreRemoved = useDeckStore((s) => s.restoreRemoved);
   ```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd app && npx vitest run src/components/DeckPanel.test.tsx
```

Expected: all DeckPanel tests PASS.

Run the full app suite to make sure no other component test regressed:

```bash
cd app && npm test
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add app/src/components/DeckPanel.tsx app/src/components/DeckPanel.test.tsx app/src/components/CardListRow.tsx
git commit -m "feat(app): DeckPanel added-card accent + Removed cards tray with restore"
```

---

## Task 6: `DeckPage` — Cmd-S / Ctrl-S hotkey for Save

Mount a global `keydown` listener while `DeckPage` is mounted. Always `preventDefault` (so the browser save-page dialog never appears on this route); call `saveDeck` only when an active deck exists.

**Files:**
- Modify: `app/src/pages/DeckPage.tsx`
- Create: `app/src/pages/DeckPage.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `app/src/pages/DeckPage.test.tsx`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DeckPage from './DeckPage';
import { useDeckStore } from '../stores/deckStore';
import { useGraphStore } from '../stores/graphStore';

beforeEach(() => {
  useGraphStore.setState({
    cards: new Map(),
    edges: new Map(),
    edgesInbound: new Map(),
    tagCatalog: new Map(),
    ruleVersion: 't',
    status: 'ready',
  });
  useDeckStore.setState({ decks: [], activeDeckId: null });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <DeckPage />
    </MemoryRouter>,
  );
}

function dispatchSave(meta = true) {
  const ev = new KeyboardEvent('keydown', {
    key: 's',
    metaKey: meta,
    ctrlKey: !meta,
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(ev);
  return ev;
}

describe('DeckPage — Cmd-S hotkey', () => {
  it('calls saveDeck and preventDefaults when the active deck is dirty (Cmd-S)', async () => {
    useDeckStore.setState({
      activeDeckId: 'd1',
      decks: [{
        id: 'd1', name: 'D', format: 'standard',
        originalCards: [{ oracleId: 'a', count: 4 }],
        workingCards: [{ oracleId: 'a', count: 2 }],
        createdAt: 0, updatedAt: 0,
      }],
    });
    const saveSpy = vi.spyOn(useDeckStore.getState(), 'saveDeck');
    renderPage();
    const ev = dispatchSave(true);
    expect(ev.defaultPrevented).toBe(true);
    expect(saveSpy).toHaveBeenCalledWith('d1');
  });

  it('also fires on Ctrl-S', () => {
    useDeckStore.setState({
      activeDeckId: 'd1',
      decks: [{
        id: 'd1', name: 'D', format: 'standard',
        originalCards: [{ oracleId: 'a', count: 4 }],
        workingCards: [{ oracleId: 'a', count: 2 }],
        createdAt: 0, updatedAt: 0,
      }],
    });
    const saveSpy = vi.spyOn(useDeckStore.getState(), 'saveDeck');
    renderPage();
    const ev = dispatchSave(false);
    expect(ev.defaultPrevented).toBe(true);
    expect(saveSpy).toHaveBeenCalledWith('d1');
  });

  it('preventDefaults but does not call saveDeck when the active deck is clean', () => {
    useDeckStore.setState({
      activeDeckId: 'd1',
      decks: [{
        id: 'd1', name: 'D', format: 'standard',
        originalCards: [{ oracleId: 'a', count: 4 }],
        workingCards: [{ oracleId: 'a', count: 2 }],
        createdAt: 0, updatedAt: 0,
      }],
    });
    // Save the deck so it's clean
    return useDeckStore.getState().saveDeck('d1').then(() => {
      const saveSpy = vi.spyOn(useDeckStore.getState(), 'saveDeck');
      renderPage();
      const ev = dispatchSave(true);
      expect(ev.defaultPrevented).toBe(true);
      expect(saveSpy).not.toHaveBeenCalled();
    });
  });

  it('does not preventDefault when no deck is active', () => {
    useDeckStore.setState({ activeDeckId: null, decks: [] });
    renderPage();
    const ev = dispatchSave(true);
    expect(ev.defaultPrevented).toBe(false);
  });

  it('removes the listener on unmount', () => {
    useDeckStore.setState({
      activeDeckId: 'd1',
      decks: [{
        id: 'd1', name: 'D', format: 'standard',
        originalCards: [{ oracleId: 'a', count: 4 }],
        workingCards: [{ oracleId: 'a', count: 2 }],
        createdAt: 0, updatedAt: 0,
      }],
    });
    const saveSpy = vi.spyOn(useDeckStore.getState(), 'saveDeck');
    const { unmount } = renderPage();
    unmount();
    cleanup();
    const ev = dispatchSave(true);
    expect(ev.defaultPrevented).toBe(false);
    expect(saveSpy).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd app && npx vitest run src/pages/DeckPage.test.tsx
```

Expected: all 5 tests FAIL — there's no keydown listener yet.

- [ ] **Step 3: Add the handler to `DeckPage.tsx`**

Update `app/src/pages/DeckPage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import BrowserShell from '../components/BrowserShell';
import DeckPanel from '../components/DeckPanel';
import ImportSummary from '../components/ImportSummary';
import Toast from '../components/Toast';
import { useDeckStore } from '../stores/deckStore';
import { isDirty } from '../lib/deckDiff';
import type { Filter } from '../lib/filter';

export default function DeckPage() {
  const [filter, setFilter] = useState<Filter>({});

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isSave = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's' && !e.shiftKey && !e.altKey;
      if (!isSave) return;
      const { activeDeckId, decks, saveDeck } = useDeckStore.getState();
      if (!activeDeckId) return; // no active deck → leave the event alone
      e.preventDefault();
      const active = decks.find((d) => d.id === activeDeckId);
      if (active && isDirty(active)) void saveDeck(activeDeckId);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-end border-b border-neutral-800 bg-neutral-950 px-4 py-2">
        <div className="inline-flex overflow-hidden rounded border border-neutral-700 text-xs">
          <span className="bg-amber-900/40 px-2 py-1 font-semibold text-amber-200">List</span>
          <Link to="/deck/graph" className="px-2 py-1 text-neutral-300 hover:bg-neutral-900">Graph</Link>
        </div>
      </div>
      <ImportSummary />
      <div className="min-h-0 flex-1">
        <BrowserShell
          filter={filter}
          onFilterChange={setFilter}
          rightRail={({ onCardClick }) => <DeckPanel onCardClick={onCardClick} />}
        />
      </div>
      <Toast />
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd app && npx vitest run src/pages/DeckPage.test.tsx
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/pages/DeckPage.tsx app/src/pages/DeckPage.test.tsx
git commit -m "feat(app): Cmd-S / Ctrl-S hotkey saves the active deck"
```

---

## Task 7: `DecksPage` — `*` indicator next to dirty deck names

**Files:**
- Modify: `app/src/pages/DecksPage.tsx`
- Modify: `app/src/pages/DecksPage.test.tsx`

- [ ] **Step 1: Write failing tests**

Append to `app/src/pages/DecksPage.test.tsx`:

```ts
describe('DecksPage — dirty indicator', () => {
  beforeEach(setup);

  it('appends "*" to the name of a deck with unsaved working changes', async () => {
    await useDeckStore.getState().createDeck('Dirty Deck');
    await useDeckStore.getState().addCard('a', 1);
    renderPage();
    expect(screen.getByText('Dirty Deck*')).toBeInTheDocument();
  });

  it('does not append "*" when the deck is clean', async () => {
    await useDeckStore.getState().createDeck('Clean Deck');
    renderPage();
    // The name renders as plain "Clean Deck" (no asterisk)
    expect(screen.getByText('Clean Deck')).toBeInTheDocument();
    expect(screen.queryByText('Clean Deck*')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd app && npx vitest run src/pages/DecksPage.test.tsx
```

Expected: the new tests FAIL.

- [ ] **Step 3: Update `DecksPage.tsx`**

In `app/src/pages/DecksPage.tsx`:

1. Add import:
   ```ts
   import { isDirty } from '../lib/deckDiff';
   ```
2. Find the `<span ... cursor-text ...>` that renders `{d.name}` (around line 137) and change to:
   ```tsx
   <span
     onClick={(e) => {
       e.stopPropagation();
       setEditingId(d.id);
     }}
     className="cursor-text text-sm font-semibold hover:underline"
   >
     {d.name}{isDirty(d) ? '*' : ''}
   </span>
   ```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd app && npx vitest run src/pages/DecksPage.test.tsx
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/pages/DecksPage.tsx app/src/pages/DecksPage.test.tsx
git commit -m "feat(app): DecksPage shows * next to dirty decks"
```

---

## Task 8: Playwright e2e — save / discard / refresh

**Files:**
- Modify: `app/tests/e2e/deck-page.spec.ts`

- [ ] **Step 1: Add the new scenario at the end of `deck-page.spec.ts`**

Append (after the existing `test.describe` blocks):

```ts
test.describe('Suite — Save / Discard / persistence', () => {
  test('add → see green accent + Save button enabled, click Save → indicators clear', async ({ page }) => {
    await resetState(page);
    const { creature } = await seedMixedTypesDeck(page);
    await page.goto('/deck');
    await waitForHydration(page);

    // Remove a card fully — should appear in Removed cards tray
    const removeBtn = page
      .getByTestId('card-row')
      .filter({ hasText: creature.name })
      .getByRole('button', { name: /remove/i });
    await removeBtn.click();

    // Removed cards tray + red accent
    await expect(page.getByText(/removed cards/i)).toBeVisible();
    const removedRow = page.getByTestId('removed-row').filter({ hasText: creature.name });
    await expect(removedRow).toBeVisible();
    await expect(removedRow).toHaveClass(/border-red-500/);

    // Title has *
    await expect(page.getByRole('heading', { name: /sultai test\*/i })).toBeVisible();

    // Save button enabled
    const saveBtn = page.getByRole('button', { name: /^save$/i });
    await expect(saveBtn).toBeEnabled();

    // Click Save → tray gone, * gone, button disabled
    await saveBtn.click();
    await expect(page.getByText(/removed cards/i)).toBeHidden();
    await expect(page.getByRole('heading', { name: /sultai test$/i })).toBeVisible();
    await expect(saveBtn).toBeDisabled();
  });

  test('working state persists across reload', async ({ page }) => {
    await resetState(page);
    const { creature } = await seedMixedTypesDeck(page);
    await page.goto('/deck');
    await waitForHydration(page);

    // Remove a card fully
    await page
      .getByTestId('card-row')
      .filter({ hasText: creature.name })
      .getByRole('button', { name: /remove/i })
      .click();
    await expect(page.getByRole('heading', { name: /sultai test\*/i })).toBeVisible();

    // Reload
    await page.reload();
    await waitForHydration(page);

    // Dirty state still there
    await expect(page.getByRole('heading', { name: /sultai test\*/i })).toBeVisible();
    await expect(page.getByText(/removed cards/i)).toBeVisible();
  });

  test('Discard reverts working back to baseline', async ({ page }) => {
    await resetState(page);
    const { creature } = await seedMixedTypesDeck(page);
    await page.goto('/deck');
    await waitForHydration(page);

    await page
      .getByTestId('card-row')
      .filter({ hasText: creature.name })
      .getByRole('button', { name: /remove/i })
      .click();
    await expect(page.getByText(/removed cards/i)).toBeVisible();

    await page.getByRole('button', { name: /^discard$/i }).click();

    await expect(page.getByText(/removed cards/i)).toBeHidden();
    await expect(page.getByRole('heading', { name: /sultai test$/i })).toBeVisible();
    await expect(
      page.getByTestId('card-row').filter({ hasText: creature.name }),
    ).toBeVisible();
  });
});
```

- [ ] **Step 2: Run the e2e**

The e2e expects `cards-standard.json` to be built. Verify it exists, build if needed:

```bash
ls app/public/data/cards-standard.json || npm run build:cards -- --standard
cd app && npm run e2e -- --grep 'Save / Discard / persistence'
```

Expected: 3 PASS.

If `getByRole('button', { name: /remove/i })` doesn't match — open `app/src/components/CardListRow.tsx` and check the `aria-label` of the minus button; adjust the regex to match what's there (it's probably `decrement` or `Remove one`).

- [ ] **Step 3: Run the full e2e suite to check no regressions**

```bash
cd app && npm run e2e
```

Expected: all existing tests still PASS.

- [ ] **Step 4: Run the full gate (pipeline + app + build)**

From the repo root:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/tests/e2e/deck-page.spec.ts
git commit -m "test(app): e2e for deck Save/Discard/persistence"
```

---

## Final verification

- [ ] **Step 1: Manual smoke**

```bash
cd app && npm run dev
```

In the browser:

1. Open a pre-existing deck (or seed one via the existing UI). Verify it loads with no `*` (migration leaves clean state).
2. Add a card via search — verify green left accent appears on the new row.
3. Remove a card to 0 — verify red "Removed cards" section appears at the bottom with the card.
4. Click the removed entry — verify it pops back in at the original count, no longer in the tray.
5. Verify deck title now ends with `*`.
6. Verify Save and Discard buttons are enabled.
7. Press Cmd-S — verify save fires (`*` clears, buttons disable).
8. Add more changes — refresh the page — verify dirty state restored from Dexie.
9. Click Discard — verify everything returns to the baseline.
10. Navigate to `/decks` — verify any dirty decks show `*` next to their name in the list.

- [ ] **Step 2: Final commit (if any manual-smoke fixes)**

If you needed to tweak anything during manual smoke, commit it now with a message of the form `fix(app): <thing>`. Otherwise skip.
