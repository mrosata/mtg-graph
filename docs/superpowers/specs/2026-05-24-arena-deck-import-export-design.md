# Arena deck import/export — design

Status: approved
Date: 2026-05-24
Target version: v0.9

## Goal

Let users move decks in and out of mtg-graph using the MTG Arena text format. Import on the Decks page (paste or load `.txt`); export from the Decks list (per-deck button) and from the `DeckPanel` rail (replaces the current "Copy as text" affordance).

## Non-goals

- Sideboard support (parsed and reported, not stored).
- Commander/Companion semantics.
- Fuzzy name matching.
- File download on export (clipboard only).
- A toast component beyond the minimum needed here.

## Format

### Canonical output

```
About
Name <deck.name>

Deck
<count> <card name>
<count> <card name>
…
```

- Section headers `About` and `Deck`, exact case.
- One blank line between sections; no trailing newline.
- Card lines in `deck.cards` insertion order (same order `deckToText` uses today).
- Multi-face cards emit the full `"Front // Back"` name from `Card.name`.

### Tolerant input

Parser accepts the canonical output and the usual variations:

- Headers `About` / `Deck` / `Sideboard` matched case-insensitively.
- `About` block is optional. If missing or has no `Name <…>` line, deck name defaults to `Imported deck N` (next integer matching `DecksPage.tsx:46`'s `Untitled Deck N` pattern).
- Inside `About`: only `Name <…>` is consumed. Other lines (`Commander`, `Companion`, anything else) are ignored without error — they don't apply to Standard but should not break the import.
- Inside `Deck`: lines match `^(\d+)\s+(.+)$` after trim. The count is one or more digits; the name is the rest of the line, trimmed.
- Lines beginning with `//` or `#` are comments.
- Empty lines are ignored.
- A `Sideboard` block, if present, is parsed but **not** stored. The summed sideboard count is reported back so users aren't surprised.
- Lines inside `Deck` or `Sideboard` that don't match the `<count> <name>` shape go into `unparseableLines` and are reported in the summary.

## Library code

Two pure modules under `app/src/lib/`. No Dexie, no Zustand, no React — fully unit-testable.

### `deckExport.ts` (existing; expanded)

Add:

```ts
export function deckToArenaText(deck: Deck, cards: Map<string, Card>): string;
```

Emits the canonical format. Unknown `oracleId` entries are skipped silently (same semantics the current `deckToText` already enforces).

The existing `deckToText` function is removed. Its sole caller (`DeckPanel.tsx:122`) is migrated to `deckToArenaText`. The existing test file is updated accordingly.

### `deckImport.ts` (new)

```ts
export type ImportEntry = { count: number; name: string };

export type ParsedDeck = {
  name: string | null;
  entries: ImportEntry[];
  sideboardCount: number;       // total cards summed across the Sideboard block
  unparseableLines: string[];   // raw lines inside Deck/Sideboard that didn't match
};

export function parseArenaDeck(text: string): ParsedDeck;

export type ResolvedEntry = { oracleId: string; count: number; name: string };

export type ImportResult = {
  resolved: ResolvedEntry[];   // matched against the card index
  unknown: ImportEntry[];      // name not in the artifact
  sideboardCount: number;      // pass-through from ParsedDeck
  unparseableLines: string[];  // pass-through from ParsedDeck
};

export function resolveImport(parsed: ParsedDeck, cards: Map<string, Card>): ImportResult;
```

#### Name matching strategy

`resolveImport` builds an internal `Map<string, string>` from `name.toLowerCase()` → `oracleId`, then for each entry:

1. **Exact case-insensitive match** against the full `Card.name`.
2. **Multi-face fallback:** if no hit, look for a card whose name starts with `"<entry> // "` (case-insensitive). Arena sometimes exports DFCs as the front face only; our artifact stores them as `"Front // Back"`. There are zero name collisions across the 4,446-card Standard set, so this is unambiguous.
3. No fuzzy matching; misspellings go to `unknown`.

The lookup map is built on each call (the artifact is loaded once at startup and imports are rare, so caching across calls isn't worth the extra plumbing).

## Store API

`app/src/stores/deckStore.ts` gets one new action; existing API is untouched:

```ts
importDeck: (name: string | null, resolved: ResolvedEntry[]) => Promise<string>;
```

Behavior:

- Creates a `Deck` with a fresh UUID.
- `name` = passed-in name, or `"Imported deck " + (decks.length + 1)` if null.
- `cards` = `resolved.map(({oracleId, count, name}) => ({oracleId, count, name}))`. Carrying `name` matches what `addCard` already does and lets `DeckPanel`'s Unknown section render meaningfully if the artifact later loses the card.
- Persists via Dexie (same `db.decks.put` path the other mutations use).
- Sets it as the active deck.
- Returns the new deck id.

Surfacing `unknown` / `sideboardCount` / `unparseableLines` is the **caller's** responsibility, not the store's. The store stays a pure persistence layer and never touches `ImportResult`.

## UI changes

### `DecksPage.tsx`

- Header: add an **Import** button next to the existing **New deck** button.
- Each row: add an **Export** icon-button next to the existing **Delete** button. `e.stopPropagation()` so clicking it doesn't open the deck (the row's `onClick` at `DecksPage.tsx:79` opens the deck).
- Import button opens `<ImportDeckModal />`.
- Export button calls `navigator.clipboard.writeText(deckToArenaText(deck, cards))` and shows the toast.

### `DeckPanel.tsx`

Upgrade the existing "Copy as text" at line 122:

- Rename label to **Export**.
- Switch from `deckToText` (removed) to `deckToArenaText`.
- Show the same toast on click.

This means `DeckGraphPage` gets export automatically since it renders the same `DeckPanel`.

### `ImportDeckModal.tsx` (new)

Built on the existing `ConfirmModal` styling (`app/src/components/ConfirmModal.tsx`).

Layout:
- Title: "Import deck".
- Body: textarea (8 rows, monospace) + below it a small "Load from file…" link that triggers a hidden `<input type="file" accept=".txt,text/plain">`. The `FileReader` result fills the textarea — there is no separate "import from file" submit path.
- Footer: "Cancel" + "Import" buttons.

On submit:
- Run `parseArenaDeck(text)` then `resolveImport(parsed, cards)`.
- If `resolved.length === 0`:
  - If `parsed.entries.length === 0`: show inline error *"No cards found. Paste an Arena-format decklist."*
  - Else: *"None of the N cards are in our Standard set. mtg-graph currently only supports Standard."*
  - Modal stays open; no deck is created.
- Otherwise: call `importDeck(parsed, result.resolved)`, get the new deck id, close the modal, navigate to `/deck`, and **if the result had any `unknown` / `sideboardCount > 0` / `unparseableLines`,** surface them via `ImportSummary` (below).

### `ImportSummary.tsx` (new)

A dismissible inline panel that renders on `DeckPage` when there's a recent import summary to show.

Content (only sections that apply):
- *"Imported M of N cards."*
- *"K cards skipped — not in Standard. mtg-graph currently only supports Standard:"* followed by a `<details>` listing the unknown names.
- *"15 sideboard cards skipped — sideboards aren't supported yet."*
- *"P unparseable lines skipped."* with a `<details>` listing the raw lines.

State handoff: `DecksPage` writes the `ImportResult` into a tiny Zustand store (`importSummaryStore.ts`, one slot, last-write-wins) before navigating. `ImportSummary` reads from the store on mount and calls a `clear()` action so subsequent navigation back to `DeckPage` doesn't re-show it. The dismiss button also calls `clear()`. Using a store avoids threading state through React Router state or encoding a large object in the URL.

### `Toast.tsx` (new)

Minimum viable: portal-mounted at body bottom-right, fixed position, single text line, auto-dismisses after ~2500ms. One global slot is sufficient — the only triggers are the two export buttons, and rapid double-export is fine to overwrite. Internally a tiny Zustand store (`useToastStore`) with `show(msg: string)`.

## Edge cases & error handling

| Case | Behavior |
|---|---|
| Empty paste / parsed entries empty | Inline error in modal; no deck created |
| All cards unknown | Inline error in modal mentioning Standard-only; no deck created |
| Sideboard present | Imported deck excludes sideboard; summary reports the skipped count |
| Some cards unknown | Deck created with recognized cards; summary lists the unknowns |
| Multi-face card by front-face only | Resolved via the `" // "` prefix fallback |
| `navigator.clipboard.writeText` rejects | Toast becomes *"Copy failed. Select the text and copy manually."* In `DeckPanel`, the export text drops into a small inline `<pre>` under the deck title. In `DecksPage` rows, fall back to a tiny modal showing the text. |
| `FileReader` error on file load | Modal shows *"Couldn't read file."*; textarea content unchanged |
| Deck name collision with existing deck | Allowed — decks key on UUID, not name |

## Testing

### Unit (vitest)

**`deckExport.test.ts`** — extend the existing file:
- New `deckToArenaText` emits `About\nName <name>\n\nDeck\n…` with insertion-order card lines.
- Unknown `oracleId` entries are skipped silently (regression of the existing assertion).
- Multi-face card name is emitted as `"Front // Back"`.

**`deckImport.test.ts`** (new) — table-driven:
- Both example decks from the brief parse to the right name and entry counts.
- Headers `about` / `ABOUT` / `Deck` / `DECK` work.
- `//` and `#` comment lines are ignored.
- `Commander`/`Companion` lines inside `About` don't error.
- `Sideboard` block populates `sideboardCount`, not `entries`.
- Garbled lines (`"asdf"`, `"3"` alone, `"foo Lightning Bolt"`) land in `unparseableLines`.
- `resolveImport` resolves a basic land, an exact match, and a multi-face card given only the front face; routes truly unknown names to `unknown`.

### Component (React Testing Library)

**`ImportDeckModal.test.tsx`** — typing into the textarea and clicking Import creates a deck; Cancel does nothing; empty submit shows the inline error; all-unknown submit shows the Standard-only error.

**`DecksPage` test** — extend the existing file: row export button calls `navigator.clipboard.writeText` with Arena-format text (mock `navigator.clipboard`).

No Playwright additions for this feature.

## File touchpoints

New:
- `app/src/lib/deckImport.ts`
- `app/src/lib/deckImport.test.ts`
- `app/src/components/ImportDeckModal.tsx`
- `app/src/components/ImportDeckModal.test.tsx`
- `app/src/components/ImportSummary.tsx`
- `app/src/components/Toast.tsx`
- `app/src/stores/toastStore.ts`
- `app/src/stores/importSummaryStore.ts`

Modified:
- `app/src/lib/deckExport.ts` — add `deckToArenaText`, remove `deckToText`.
- `app/src/lib/deckExport.test.ts` — replace existing assertions with `deckToArenaText` assertions.
- `app/src/stores/deckStore.ts` — add `importDeck` action.
- `app/src/components/DeckPanel.tsx` — rename "Copy as text" → "Export", switch to `deckToArenaText`, wire toast.
- `app/src/pages/DecksPage.tsx` — add Import button, per-row Export button, mount `<Toast />` and `<ImportDeckModal />`.
- `app/src/pages/DecksPage.test.tsx` — add export-button test.
- `app/src/pages/DeckPage.tsx` — render `<ImportSummary />` when the import store has a payload.

## Out of scope (deferred)

- Sideboard storage on `Deck` (would require schema bump; v0.9+ if/when matchup data lands).
- Commander/Brawl deck shapes.
- Export `.txt` download (clipboard covers Arena's import flow today).
- Fuzzy name matching / suggestions for typos.
- Bulk import of multiple decks at once.
