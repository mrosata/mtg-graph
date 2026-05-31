# Manabox library import — design

Status: approved
Date: 2026-05-30
Target version: v0.15

## Goal

Let users import their Manabox CSV collection backup as a persistent "library." Once imported, the app shows only the intersection of the graph and the user's library (toggleable lens). The deck editor surfaces per-card owned quantities and warns when a deck wants more copies than the library holds. Cards that didn't import are reported to the user with a reason (unknown name vs. unknown set).

## Non-goals

- Library export / round-trip back to Manabox.
- Multiple named libraries — singleton only.
- Per-printing / per-condition / per-foil ownership granularity.
- Quantity-aware "what to buy" lists.
- Scryfall ID matching — resolution is by card name only (no artifact change).
- Sideboard quantity rules (legality already covers them).

## Data model

### Library row (Dexie)

A single singleton row in a new `library` table, keyed `id='main'`:

```ts
type LibraryRow = {
  id: 'main';
  importedAt: number;                // epoch ms
  sourceFilename: string;
  owned: Record<string, number>;     // oracleId → total quantity (summed across all matching CSV rows)
  unknownNames: ImportRowSummary[];  // name not found in artifact AND set code IS in Standard
  unknownSets:  ImportRowSummary[];  // name not found AND set code NOT in Standard
  unparseableLines: string[];        // raw CSV rows that failed parsing
};

type ImportRowSummary = {
  name: string;
  setCode: string;
  quantity: number;
};
```

### Preferences row (Dexie)

A second singleton row in a new `prefs` table, keyed `id='main'`, holds the persisted "Library only" toggle:

```ts
type PrefsRow = {
  id: 'main';
  libraryEnabled: boolean;  // default false; turned on automatically on first import
};
```

Two tables (not one fat row) so the toggle can be flipped without touching the (potentially large) library payload.

## Library code

### `app/src/lib/libraryImport.ts` (new)

Three pure functions, no React, no Dexie.

```ts
export type ParsedLibraryRow = {
  name: string;
  setCode: string;
  collectorNumber: string;
  quantity: number;
};

export type ParsedLibrary = {
  rows: ParsedLibraryRow[];
  unparseableLines: string[];
};

export type LibraryImportResult = {
  owned: Map<string, number>;           // oracleId → summed quantity
  unknownNames: ImportRowSummary[];
  unknownSets:  ImportRowSummary[];
  unparseableLines: string[];
};

export function parseManaboxCsv(text: string): ParsedLibrary;
export function resolveLibrary(
  parsed: ParsedLibrary,
  cards: Map<string, Card>,
  knownSetCodes: Set<string>,
): LibraryImportResult;
```

#### `parseManaboxCsv`

- Splits on `\r?\n`. First non-blank line is the header.
- Header is parsed by RFC-4180-ish CSV (quoted fields with embedded commas and doubled-quote escaping). Required columns: `Name`, `Set code`, `Collector number`, `Quantity`. Other columns are ignored.
- Required columns identified by case-insensitive header name, **not** position — Manabox occasionally shifts column order between exports.
- Missing any required column = the whole parse throws a typed error caught by the modal UI ("This doesn't look like a Manabox CSV — expected columns: …").
- Each data row is parsed the same way; rows whose `Quantity` isn't a positive integer, or whose `Name` is empty, go to `unparseableLines` (with the raw row text).
- Blank lines are skipped silently.

#### `resolveLibrary`

- Builds the same name index `deckImport.resolveImport` uses (exact lowercased `card.name` + DFC front-face fallback via `' // '` split). Refactor opportunity: extract the index builder to a tiny `lib/cardNameIndex.ts` so both importers share it. The name-index function stays pure and synchronous.
- For each parsed row:
  1. Lookup `row.name.toLowerCase()` in the index.
  2. On hit: `owned.set(oracleId, (owned.get(oracleId) ?? 0) + row.quantity)`. Multiple CSV rows for the same card (different printings, foil vs. non-foil) sum into one entry.
  3. On miss: classify by `knownSetCodes.has(row.setCode)` — true → `unknownNames`, false → `unknownSets`.
- `knownSetCodes` is built from `shared/sets.ts` (the existing Standard set list). Codes are compared case-insensitively.

### `app/src/lib/cardNameIndex.ts` (new — extracted from `deckImport.ts`)

```ts
export type NameIndex = Map<string, { oracleId: string; canonicalName: string }>;
export type CardNameLookup = {
  exact: NameIndex;
  frontFace: NameIndex;
};
export function buildCardNameLookup(cards: Map<string, Card>): CardNameLookup;
export function lookupByName(lookup: CardNameLookup, name: string): { oracleId: string; canonicalName: string } | undefined;
```

`deckImport.resolveImport` is refactored to use this. Behavior is unchanged; existing tests still pass.

### `app/src/lib/basics.ts` (new)

```ts
export const BASIC_LAND_NAMES = new Set(['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes']);
export function isBasicLand(card: Card): boolean;  // uses BASIC_LAND_NAMES + typeLine contains 'Basic Land'
```

Used by `OwnedBadge`, the deck-editor warning logic, and the `Missing` summary line.

## Store

### `app/src/stores/libraryStore.ts` (new)

```ts
type LibraryState = {
  owned: Map<string, number> | null;        // null = no library
  enabled: boolean;                          // the "Library only" toggle
  meta: Omit<LibraryRow, 'id' | 'owned'> | null;
  hydrate: () => Promise<void>;
  importLibrary: (result: LibraryImportResult, sourceFilename: string) => Promise<void>;
  clearLibrary: () => Promise<void>;
  setEnabled: (b: boolean) => Promise<void>;
};
```

- `hydrate()` is called once during app startup, alongside `graphStore.hydrateFromArtifact()`. Reads both `library` and `prefs` rows.
- `importLibrary` writes the new `library` row (replacing any existing one), sets `enabled=true` in `prefs` if this is the first-ever import, and updates in-memory state. Single Dexie transaction.
- `clearLibrary` deletes the `library` row, sets `owned=null` / `meta=null` / `enabled=false`, and persists `enabled=false`. Single Dexie transaction.
- `setEnabled` only touches the `prefs` row; library payload untouched.

`owned` is held as a `Map`, not a plain object, so derived `Set`s (for filtering) are cheap to build.

## Persistence — Dexie schema bump

Current schema version (`app/src/lib/db.ts:34`) is `2`. The new version is `3` and adds two tables alongside the existing ones:

```ts
this.version(3).stores({
  decks: 'id, name, updatedAt',
  artifactCache: '&ruleVersion',
  library: 'id',
  prefs: 'id',
});
```

No `upgrade` block needed — the existing `decks` and `artifactCache` tables are unchanged; the new tables start empty. `db.migration.test.ts` gains a case asserting that decks from v2 survive the bump and that the `library` / `prefs` tables exist and are empty.

## Filtering integration

The library is an **overlay** on `graphStore`, not a mutation. `graphStore.cards` always holds the full Standard universe; the library narrows what's visible at the call site. This preserves the documented `graphStore = read-only after hydration` invariant and makes the "Library only" toggle instant (no re-hydration).

Three call sites:

### 1. `app/src/lib/filter.ts`

Add an optional parameter:

```ts
export function filterCards(
  cards: Card[],
  query: FilterQuery,
  libraryFilter?: ReadonlySet<string>,   // when set, drop cards whose oracleId isn't in this set
): Card[];
```

Callers compute the set once per render:

```ts
const libraryFilter = useMemo(() => {
  if (!libraryStore.enabled || !libraryStore.owned) return undefined;
  return new Set(libraryStore.owned.keys());
}, [libraryStore.enabled, libraryStore.owned]);
```

### 2. `InteractionsPanel`

When `libraryFilter` is active, edges where either endpoint isn't in `owned` are hidden. Implemented as a `.filter(edge => libraryFilter.has(edge.source) && libraryFilter.has(edge.target))` pass on top of the existing neighbor lookup. No change to `graphStore`'s graph or neighbor functions.

### 3. `DeckGraphPage`

Same edge-hiding rule applied to the rendered graph. The user's own deck cards always render (even unowned ones) so the deck remains visible end-to-end.

### Filter UI behavior

The library filter stacks as an **AND** with all other FilterPanel controls (color, tags, text, etc.). The existing FilterPanel doesn't change shape — the library narrows the input set before tag filtering runs.

## UI surfaces

### `LibraryStatusBadge` (header, new)

- Mounts via `BrowserShell`'s existing `headerExtra` slot (`BrowserShell.tsx:26,142`), so the WorkspacePage passes it through.
- When loaded: `Library: 1,234 cards` (clickable → focuses the FilterPanel's Library section).
- When empty: `No library` (clickable → focuses the Library section).
- Color: subtle, matches existing header chip styling. Not the focal point.

### `LibrarySection` in `FilterPanel` (new — top of the panel)

#### Empty state

```
LIBRARY
─────────
Import a Manabox CSV backup
[ Import library ]
```

Button opens `ImportLibraryModal`.

#### Loaded state

```
LIBRARY
─────────
1,234 cards · 4,287 copies
Imported May 30, 2026
[✓] Library only
[ Re-import ]  [ View report ]  [ Clear ]
```

- `Library only` toggle → `libraryStore.setEnabled(b)`.
- `Re-import` → opens `ImportLibraryModal`, pre-warned that it'll replace the current library.
- `View report` → opens `LibraryImportSummary` standalone (read from `libraryStore.meta`).
- `Clear` → `ConfirmModal` then `libraryStore.clearLibrary()`.

### `ImportLibraryModal` (new)

Flow:

1. Modal opens with a file picker (`<input type="file" accept=".csv" />`).
2. On file selected:
   - `text = await file.text()`
   - `parsed = parseManaboxCsv(text)` — if it throws, show the error message in-modal with a "Pick a different file" affordance.
   - `result = resolveLibrary(parsed, graphStore.cards, knownSetCodes)`
3. Modal body switches to `LibraryImportSummary` (preview) with two footer buttons: `[ Use this library ]` / `[ Cancel ]`.
4. `Cancel` closes the modal — nothing is written to Dexie.
5. `Use this library` calls `libraryStore.importLibrary(result, file.name)`, closes the modal, and shows a toast: `Library imported · 1,234 cards`.

### `LibraryImportSummary` (new — used by `ImportLibraryModal` and the "View report" link)

```
Imported  1,234 cards (4,287 copies)
─────────────────────────────────────

▼ Unknown names (12)
   1× Frobulator (BLB)
   1× Made Up Card (TDM)
   …

▶ Unknown sets (37)
▶ Unparseable rows (0)
```

- Three collapsible groups, each showing count in the header.
- Each row: `<quantity>× <name> (<setCode>)`.
- Default state: `Unknown names` expanded (most actionable for the user), other two collapsed.
- All three groups read from `libraryStore.meta` so the report is identical whether viewed mid-import or later.

### `OwnedBadge` (new)

- Small chip — text like `×3` — rendered in two places:
  1. On `CardGrid` tiles (bottom-right corner).
  2. Inside `DeckPanel` row beside the card name.
- Renders only when `libraryStore.owned` is non-null. Independent of the `enabled` toggle so quantity info is always visible after import.
- Suppressed entirely for basic lands (`isBasicLand(card)`).

### `NotInLibraryBadge` (new)

- Small dot — rendered on `DeckPanel` rows whose oracleId isn't in `libraryStore.owned`.
- Renders only when a library is loaded.
- Suppressed for basic lands.

## Deck-editor quantity behavior

Independent of the `Library only` toggle. Active whenever a library is loaded.

1. **Per-row display.** `DeckPanel` rows for non-basics show `<deckCount>/<ownedCount>` in addition to the `OwnedBadge`. Example: `2/3 Lightning Bolt`. Basics show only the deck count.
2. **Add warning.** Adding the (N+1)th copy of a non-basic fires a toast: `Your library has 3× Lightning Bolt; deck now wants 4.` Non-blocking — the user can still add the card. Uses the existing `toastStore`.
3. **Missing summary.** `DeckPanel` header gains a `Missing: N cards` line, where `N = sum(max(0, deckCount - owned) for each non-basic in the deck)`. Zero renders as a green check rather than being hidden — positive feedback.
4. **Pre-existing-deck cards not in library.** Render with `NotInLibraryBadge`. They're counted as `0/0` for the missing summary (so they contribute their full deck count to `Missing`).

## Behavioral edge cases

- **Re-importing the same CSV.** Replaces the prior library wholesale. The `Library only` toggle state is preserved. The import summary reflects only the new file.
- **Library loaded but `enabled=false`.** No filtering. Owned badges and missing-summary still show in the deck editor. Header status badge still shows the count.
- **Artifact updated between sessions (set rotation).** Some `oracleId`s in `owned` may no longer exist in `graphStore.cards`. They're silently ignored everywhere — owned set membership is a lookup, never a render. No proactive cleanup; if the user re-imports, the unknowns go away naturally.
- **DFC matching.** `resolveLibrary` uses both the exact name and the front-face name. A Manabox row for `"Brightsword, Lookout Hero"` resolves to the artifact's `"Brightsword, Lookout Hero // Boon of Safety"` (if applicable).
- **Quantity overflow.** No upper bound on owned quantity. A user with 47× Sol Ring shows `47`. (Sol Ring isn't Standard; this is hypothetical.)
- **Basic land quantity.** Tracked normally in `owned` (so the badge can show `×24 Mountain`), but the over-N warning never fires and they don't contribute to the missing summary.
- **Empty / all-unknown CSV.** If `resolveLibrary` produces `owned.size === 0`, the modal's `Use this library` button is disabled and a warning replaces the footer: `No matching cards found. Pick a different file.` This prevents accidental wipe of an existing library via a malformed import.

## Tests (TDD)

| File | Coverage |
|---|---|
| `app/src/lib/libraryImport.test.ts` (new) | CSV parsing (quoted fields, embedded commas, header drift, missing required columns throws, blank lines), `resolveLibrary` (name hit, DFC front-face, name miss in known set → `unknownNames`, name miss in unknown set → `unknownSets`, quantity sum across multiple rows with the same oracleId) |
| `app/src/lib/cardNameIndex.test.ts` (new) | Index build, exact lookup, DFC front-face fallback |
| `app/src/lib/deckImport.test.ts` (existing) | Unchanged after refactor — same behavior, now via `cardNameIndex` |
| `app/src/lib/basics.test.ts` (new) | `isBasicLand` for each basic, false for non-basics, true for a snow basic if `typeLine` includes `Basic Land`, false for a basic land animation token |
| `app/src/stores/libraryStore.test.ts` (new) | hydrate from Dexie (empty + populated), `importLibrary` writes Dexie + sets state + auto-enables on first import, `clearLibrary` removes Dexie + clears state + disables, `setEnabled` persists |
| `app/src/lib/db.migration.test.ts` (existing) | Migration from prior version preserves decks; `library` and `prefs` tables exist and are empty after the bump |
| `app/src/components/LibrarySection.test.tsx` (new) | Empty + loaded states, toggle behavior, re-import opens modal, clear opens confirm |
| `app/src/components/ImportLibraryModal.test.tsx` (new) | Happy path (file → summary → import), parse error displayed, Cancel = no Dexie write, Use this library = state change + toast |
| `app/src/components/LibraryImportSummary.test.tsx` (new) | Three groups render with correct counts, default expanded/collapsed state, row formatting |
| `app/src/components/OwnedBadge.test.tsx` (new) | Renders count when library loaded; absent when no library; suppressed for basics |
| `app/src/components/DeckPanel.test.tsx` (existing — extended) | `<deckCount>/<ownedCount>` display, missing summary, basics exempt from warning, `NotInLibraryBadge` for unowned cards |
| `app/tests/e2e/library-import.spec.ts` (new Playwright) | Upload a tiny fixture CSV → header badge updates → BrowserPage card count drops to the owned subset → toggle off restores the full grid |

A small Manabox CSV fixture (~15 rows, mixing in-Standard, out-of-Standard, and one bogus name) is committed under `app/tests/fixtures/manabox-sample.csv`.

## Files touched (summary)

**New:**
- `app/src/lib/libraryImport.ts` (+ test)
- `app/src/lib/cardNameIndex.ts` (+ test)
- `app/src/lib/basics.ts` (+ test)
- `app/src/stores/libraryStore.ts` (+ test)
- `app/src/components/LibrarySection.tsx` (+ test)
- `app/src/components/ImportLibraryModal.tsx` (+ test)
- `app/src/components/LibraryImportSummary.tsx` (+ test)
- `app/src/components/LibraryStatusBadge.tsx`
- `app/src/components/OwnedBadge.tsx` (+ test)
- `app/src/components/NotInLibraryBadge.tsx`
- `app/tests/fixtures/manabox-sample.csv`
- `app/tests/e2e/library-import.spec.ts`

**Modified:**
- `app/src/lib/db.ts` — schema bump, `library` + `prefs` tables, types exported.
- `app/src/lib/db.migration.test.ts` — new migration case.
- `app/src/lib/deckImport.ts` — refactor to use `cardNameIndex` (behavior preserved).
- `app/src/lib/filter.ts` — optional `libraryFilter` param.
- `app/src/lib/filter.test.ts` — cases for `libraryFilter`.
- `app/src/components/FilterPanel.tsx` — mount `LibrarySection` at the top.
- `app/src/pages/WorkspacePage.tsx` — pass `<LibraryStatusBadge />` into `BrowserShell`'s `headerExtra` slot. `DecksPage` and `DeckGraphPage` get the same treatment (so the badge is visible on every route).
- `app/src/components/CardGrid.tsx` — mount `OwnedBadge` per tile.
- `app/src/components/DeckPanel.tsx` — owned counts, missing summary, badges.
- `app/src/components/InteractionsPanel.tsx` — apply edge filter when library is active.
- `app/src/pages/DeckGraphPage.tsx` — apply edge filter when library is active.
- Wherever `graphStore.hydrateFromArtifact()` is awaited at startup — `await libraryStore.hydrate()` runs in parallel with it. (Locate during implementation; likely `app/src/main.tsx` or the top-level route component.)

**Pipeline:** no changes. `RULE_VERSION` unchanged. Artifact format unchanged.

## Open follow-ups (not in v1)

- Export library back to CSV.
- Manabox JSON format.
- Per-printing / per-foil ownership.
- "Buy these to complete your deck" view.
- Multi-library support (named collections, switcher).
- Scryfall ID matching (would require adding `scryfallId` to the artifact).
