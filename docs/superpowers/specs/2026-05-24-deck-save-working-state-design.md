# Deck save / working state — design

Status: in review
Date: 2026-05-24
Target version: v0.9 (post arena-import)

## Goal

Replace today's autosave-on-every-edit model with explicit Save / Discard semantics. A deck carries both a saved baseline (`originalCards`) and a working draft (`workingCards`). Edits surface inline in the rail: newly-added cards get a green accent; cards that were in the baseline but have been fully removed appear in a "Removed cards" tray with a red accent and a one-click restore. Export reflects the working state.

## Non-goals

- Multi-version history / named snapshots.
- Conflict resolution / multi-device sync.
- Sideboard, commander, companion.
- A dirty-state concept for deck **metadata** (name, format) — those remain immediate writes.
- A "you have unsaved changes" navigation prompt — working state is persisted; nothing to lose on refresh.
- Quantity-delta indicators on rows (a row going from 4 → 2 is visible via the existing +/− controls; we deliberately don't add a "−2" badge).

## Data model

`Deck` row in Dexie gains two card lists in place of the current single `cards`:

```ts
export type DeckCard = { oracleId: string; count: number; name?: string };

export type Deck = {
  id: string;
  name: string;
  format: 'standard';
  originalCards: DeckCard[];  // last saved baseline
  workingCards: DeckCard[];   // live edits
  createdAt: number;
  updatedAt: number;          // bumped on save, NOT on working edits
};
```

Both lists persisted to Dexie on every mutation, so working state survives refresh.

### Dirty check

`isDirty(deck)` is true iff the two lists differ — set equality on `(oracleId, count)`, order-insensitive. Names are not compared (they're a display hint only).

### Removed-cards tray contents

```
removed(deck) = [
  { oracleId, count: originalEntry.count, name: originalEntry.name }
  for originalEntry in originalCards
  if workingCards has no entry with the same oracleId (or its count is 0)
]
```

Quantity decreases that don't fully remove the card never enter the tray.

### Added-card set

```
added(deck) = [
  workingEntry
  for workingEntry in workingCards
  if originalCards has no entry with the same oracleId
]
```

Used only for styling — these rows render with a green left accent.

## Persistence

Dexie schema bumped to `version(2)`:

```ts
this.version(1).stores({
  decks: 'id, name, updatedAt',
  artifactCache: '&ruleVersion',
});
this.version(2).stores({
  decks: 'id, name, updatedAt',
  artifactCache: '&ruleVersion',
}).upgrade((tx) =>
  tx.table('decks').toCollection().modify((d: { cards?: DeckCard[] }) => {
    const baseline = d.cards ?? [];
    (d as Deck).originalCards = baseline;
    (d as Deck).workingCards = baseline;
    delete d.cards;
  }),
);
```

Migration is one-shot. After upgrade, every deck has `original === working`, so nothing is dirty — exactly what we want for users with pre-existing decks.

## Behavior

### `addCard(oracleId, qty, name?)`

Mutates `workingCards` only. Persists to Dexie. Does NOT bump `updatedAt`.

If the oracleId was in `originalCards` and had been fully removed (i.e., is currently in the tray), this re-adds the card at `qty`. The tray entry disappears because working now has the card. Whether the count matches the original is irrelevant — the tray only cares about presence.

### `removeCard(oracleId, qty)`

Mutates `workingCards` only. Persists. Does NOT bump `updatedAt`.

If `qty` brings the count to 0, the entry is filtered out of `workingCards`. If the same oracleId existed in `originalCards`, it now appears in the tray.

### `saveDeck(id)`

```ts
originalCards := workingCards;  // structural clone
updatedAt := now();
```

Persists. After save: not dirty, tray empty, added-styling cleared, title `*` cleared.

### `discardChanges(id)`

```ts
workingCards := originalCards;  // structural clone
```

Persists. `updatedAt` unchanged. After discard: not dirty, tray empty, added-styling cleared, title `*` cleared.

### `restoreRemoved(oracleId)`

```ts
const orig = originalCards.find((c) => c.oracleId === oracleId);
if (!orig) return;
if (workingCards.find((c) => c.oracleId === oracleId)) return;  // defensive no-op
workingCards.push({ oracleId, count: orig.count, name: orig.name });
```

Persists. Card disappears from the tray.

### `renameDeck`, `deleteDeck`

Unchanged. Rename writes through immediately. Delete uses the existing confirm flow and disposes of the whole deck (both card lists).

### `importDeck`

Unchanged externally, but `originalCards` and `workingCards` both populated from the import. Imported decks start clean (not dirty).

### `createDeck`

Same — both lists start as `[]`.

## UI

### `DeckPanel.tsx`

Header changes:

- Deck title shows `<name>*` when `isDirty(deck)`.
- Two buttons added next to the title — **Save** (primary, amber to match brand) and **Discard** (secondary, red text). Both always rendered; both disabled when not dirty.
- Existing Export button reads `workingCards` (it already reads `deck.cards` today — the same access path now points at `workingCards` once `grouped` switches).

Row changes:

- `grouped` iterates `workingCards` (was `deck.cards`).
- For each row, if `oracleId` is in `added(deck)`, add a `border-l-2 border-green-500 pl-1` accent class.

New section, rendered after the existing type groups, only when `removed(deck).length > 0`:

```
Removed cards
  <red-accented row>  4× Lightning Bolt   [Restore]
  <red-accented row>  2× Counterspell     [Restore]
```

Whole row is clickable; clicking calls `restoreRemoved(oracleId)`. Use `border-l-2 border-red-500 pl-1` for the accent.

Mana curve and legality warnings continue to read from `workingCards` (the deck rail is showing the working state, not the baseline).

### `DeckPage.tsx`

Mount a `keydown` listener on `document` for the lifetime of the page:

- Mac (`metaKey`) or others (`ctrlKey`) + `s`.
- `preventDefault()` whenever an active deck is mounted on `DeckPage` (to swallow the browser "save page" dialog even when clean — matching VS Code etc.).
- If the deck is dirty, calls `saveDeck(activeDeckId)`.
- If clean, no-op (but still preventDefault).
- Unmounted on route change.

### `DecksPage.tsx`

Each deck row in the list shows `<name>*` when `isDirty(deck)`. No other indicators (no count of pending edits, no separate badge).

## Store shape

`useDeckStore` (in `app/src/stores/deckStore.ts`) gains:

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
  saveDeck: (id: string) => Promise<void>;          // new
  discardChanges: (id: string) => Promise<void>;     // new
  restoreRemoved: (oracleId: string) => Promise<void>; // new — operates on active deck
};

export function isDirty(deck: Deck): boolean;  // pure selector, exported
```

A small pure module `app/src/lib/deckDiff.ts` holds `isDirty`, `added`, and `removed` plus their unit tests. Keeps the store free of comparison logic.

## Test matrix

Every behavior change must have at least one test. Tests live next to the code (`*.test.ts(x)`).

### `app/src/lib/deckDiff.test.ts` (new)

- `isDirty` returns false for two equal lists (same entries, any order).
- `isDirty` returns true when working has an extra entry.
- `isDirty` returns true when working is missing an entry.
- `isDirty` returns true when same oracleId but different count.
- `isDirty` ignores entry `name` differences.
- `added` returns only oracleIds in working but not in original.
- `removed` returns only oracleIds in original but not in working (or with working count 0).
- `removed` carries the **original** count, not the working count.

### `app/src/lib/db.migration.test.ts` (new)

Use `fake-indexeddb` to instantiate a v1 schema with a couple of decks, then re-open at v2 and verify:

- Each pre-existing deck has `originalCards` and `workingCards` both equal to the old `cards`.
- The `cards` property is gone.
- A v2 fresh install with no v1 rows opens without error.

### `app/src/stores/deckStore.test.ts` (extended)

- `createDeck` → both lists empty, not dirty.
- `importDeck` → both lists equal to the resolved entries, not dirty.
- `addCard` mutates `workingCards`, leaves `originalCards`, deck becomes dirty, `updatedAt` unchanged.
- `removeCard` (full removal) → working entry gone, original intact, deck dirty.
- `removeCard` (partial) → working count reduced, original intact, deck dirty.
- `saveDeck` → `originalCards` equals `workingCards`, deck not dirty, `updatedAt` bumped.
- `discardChanges` → `workingCards` equals `originalCards`, deck not dirty, `updatedAt` unchanged.
- `restoreRemoved` for a fully-removed card → working contains an entry at the original count; deck still dirty if other edits exist, clean otherwise.
- `restoreRemoved` for a card still in working → no-op (defensive).
- `renameDeck` does not flip dirty state on its own.

### `app/src/components/DeckPanel.test.tsx` (extended)

- Title shows `*` when deck is dirty, no `*` when clean.
- Save button disabled when clean, enabled when dirty.
- Discard button disabled when clean, enabled when dirty.
- Clicking Save calls `saveDeck`; after re-render, title `*` is gone and buttons are disabled.
- Clicking Discard calls `discardChanges`; after re-render, tray is empty, added-row accents are gone.
- "Removed cards" section is not rendered when the tray is empty.
- "Removed cards" section is rendered with one row per fully-removed card.
- Clicking a tray row calls `restoreRemoved` and removes the tray row.
- A row for an oracleId not in `originalCards` has the green-accent class.
- A row for an oracleId in `originalCards` does NOT have the green-accent class even if its count changed.
- Export button output (via `deckToArenaText`) reflects `workingCards`, not `originalCards` (verified by removing a card and asserting the export omits it).

### `app/src/pages/DeckPage.test.tsx` (new or extended)

- Mounting an active dirty deck and dispatching `keydown` with `metaKey + 's'` calls `saveDeck` and `preventDefault`s the event.
- Same on `ctrlKey + 's'`.
- With a clean active deck, the keydown still `preventDefault`s but does not call `saveDeck`.
- With no active deck, the keydown does nothing (no preventDefault, no save).
- Unmounting the page removes the listener (dispatch after unmount → no save, no preventDefault).

### `app/src/pages/DecksPage.test.tsx` (extended)

- Deck with `original !== working` renders `<name>*` in the list.
- Deck with `original === working` renders just `<name>`.

### `app/tests/e2e/deck-page.spec.ts` (extended)

One new scenario:

1. Open a deck.
2. Add a card via search; assert green accent appears on its row.
3. Remove a different card fully; assert it appears in the "Removed cards" tray with red accent.
4. Assert title shows `*`.
5. Click Save; assert title `*` and tray both clear.
6. Refresh the page; assert no dirty state.
7. Add another card; refresh; assert dirty state is restored from Dexie.

## Edge cases

- **Empty working deck (all removed):** Tray shows every original card. Save persists an empty deck (tray then empty). Discard restores all cards. Allowed.
- **Pre-existing decks post-migration:** Original equals working, not dirty, no tray, no `*`. Exactly as if the user had just saved them. Migration test covers this.
- **Re-add via search of a card that's in the tray:** Behaves identically to clicking Restore — the card reappears in the rail and disappears from the tray. The count it lands at is whatever the user typed; Restore's "use original count" path is only taken when the user explicitly clicks the tray row.
- **`restoreRemoved` for an oracleId no longer in `originalCards`:** Can't happen via UI (the tray is derived from original), but the store call is a defensive no-op.
- **Saving an unchanged deck:** No-op for state, but we still write to Dexie and bump `updatedAt`. Cheap and consistent with how a "Save" button works elsewhere.
- **Deleting the active deck while dirty:** Existing delete confirm applies. Both card lists go with it; no separate "you have unsaved changes" prompt.

## Rule version impact

None — pipeline unchanged.

## Out of scope (deferred)

- A "saved N seconds ago" relative time stamp in the rail (could land later if useful).
- Server-backed deck storage (would change the data model significantly; revisit when the v0.5+ backend lands).
