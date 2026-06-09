# MTG Arena import — design

Status: approved (revised 2026-06-09 — see "Platform support" section)
Date: 2026-06-08
Target version: v0.38

## Goal

Let users import their MTG Arena collection (and, optionally, their MTGA decks) by uploading `Player.log` — Arena's local game log. Collection counts feed the existing library system; selected decks land in the existing deck store. No new persistence concepts.

## Non-goals

- **Bi-directional sync.** Import is a one-shot snapshot. Re-import = re-snapshot.
- **Provenance / "synced deck" identity.** Re-imported decks are added; previously-imported decks the user has edited are left alone.
- **Wildcard inventory, vault, draft tokens, currencies.** Out of scope.
- **Non-Standard cards.** Cards in the user's MTGA collection that don't appear in our Standard graph are counted as "out of pool" and dropped — no separate artifact ingestion.
- **Public MTGA APIs.** None exist. We parse the local log file the user uploads.
- **MTGA install detection / auto-locate.** User picks the file via a normal file picker.

## Inputs

`Player.log`, the local Arena game log. Typical paths:

- Windows: `%APPDATA%\..\LocalLow\Wizards Of The Coast\MTGA\Player.log`
- macOS: `~/Library/Logs/Wizards Of The Coast/MTGA/Player.log`

The user uploads the file through a standard file picker. We do not attempt to read it from disk directly.

Two named events drive the import:

- `<== PlayerInventory.GetPlayerCards*` — JSON object `{ "<arenaId>": <count>, ... }`. Multiple snapshots may exist in a single log; the most recent wins.
- `<== Deck.GetDeckLists*` — array of MTGA decks. Each carries `{ id, name, format, mainDeck, sideboard, companion }`. Most recent snapshot wins.

Event name accept patterns (tolerate version drift):

- `/PlayerInventory\.GetPlayerCards(V\d+)?$/`
- `/Deck\.GetDeckLists(V\d+)?$/`

## Architecture

```
Player.log (uploaded)
    │
    ▼
mtgaLogParser.ts  ── extract latest collection event + (optional) deck events
    │
    ▼
mtgaResolve.ts    ── arena_id → oracleId via artifact index;
                    bucket unresolved counts as "out-of-pool"
    │
    ├──► LibraryImportResult ──► useLibraryStore.importLibrary()
    │
    └──► ParsedMtgaDeck[]   ──► deck checklist UI ──► useDeckStore.addDeck()
                                  (only if user opted in)
```

The MTGA path produces the **same** `LibraryImportResult` shape Manabox already produces and slots into the existing `libraryStore.importLibrary` / `LibraryImportSummary` machinery. Deck objects flow through the existing `deckImport` / `deckStore.addDeck` paths.

## Pipeline change

`pipeline/normalize.ts` reads `arena_id` from each Scryfall printing and stores it on the matching `printingDetails` entry:

```ts
printingDetails?: Array<{
  set: string;
  collectorNumber: string;
  mtgoId?: number;
  arenaId?: number;   // NEW — optional, per-printing
}>;
```

Additive; no migration required. Bump `RULE_VERSION` in `pipeline/catalog.ts` so clients re-hydrate IndexedDB against the new artifact shape (existing rule-version invalidation handles this).

## Parser

`app/src/lib/mtgaLogParser.ts`.

- **Streamed**, never holds the full log in memory. Uses `File.stream()` + `TextDecoderStream`, scanning chunks for the event marker.
- On finding a marker (`==> PlayerInventory.GetPlayerCardsV3` or matching deck-list pattern), bracket-balances the JSON that follows so events spanning many lines (and chunk boundaries) parse correctly.
- Maintains a small ring buffer across chunk boundaries to recover events split mid-payload.
- Returns only the **last** occurrence of each event type.
- Reports parse progress as a byte-count callback (drives the modal progress bar).

Parser output:

```ts
type MtgaLogContents = {
  collection: Record<string, number> | null;        // arenaId → count
  decks: MtgaRawDeck[] | null;
};

type MtgaRawDeck = {
  id: string;
  name: string;
  format: string;
  mainDeck: { id: number; quantity: number }[];     // id is arenaId
  sideboard: { id: number; quantity: number }[];
  companion: { id: number } | null;
};
```

Either field is `null` if its event wasn't present in the log.

## Resolver

`app/src/lib/mtgaResolve.ts`.

Builds an in-memory `Map<arenaId, { oracleId, set, collectorNumber }>` lazily from `cards` on the graph store (cached after first use).

### Collection resolution

```ts
type MtgaCollectionSummary = {
  totalCardsOwned: number;
  resolvedCardsOwned: number;
  outOfPoolCount: number;
  unresolvedArenaIds: number[];   // diagnostic; keep small / sample if huge
};

function resolveMtgaCollection(
  raw: Record<string, number>,
  cards: Map<string, Card>,
): { result: LibraryImportResult; mtgaSummary: MtgaCollectionSummary }
```

Per-printing fidelity: each resolved entry adds an `OwnedPrinting` keyed by the matched printing's `set` + `collectorNumber` (no `mtgoId` — Arena printings rarely have one). Existing DEK export already handles missing `mtgoId`.

`LibraryImportResult.unknownNames` and `unknownSets` stay empty for MTGA imports — those fields don't apply.

`MtgaCollectionSummary` is transient. It flows from resolver → `ImportMtgaModal` summary step → `LibraryImportSummary` rendering (via a new optional prop `mtgaSummary?: MtgaCollectionSummary` that the component shows when present). It is **not** persisted in the Dexie library row.

### Deck resolution

```ts
type ParsedMtgaDeck = {
  mtgaId: string;                                   // not persisted; used as key in checklist
  mtgaName: string;
  mtgaFormat: string;
  mainboard: { oracleId: string; count: number }[];
  sideboard: { oracleId: string; count: number }[];
  companion: { oracleId: string } | null;
  unresolvedMain: number;
  unresolvedSide: number;
  inPoolPercent: number;                            // (resolved / total) * 100
};
```

`mtgaId` is **not** stored on the resulting deck — it's a transient key for the checklist UI only. (Per non-goals: no provenance.)

## UI

### Shared modal: `ImportMtgaModal`

Two modes set by entry point.

**Mode: `full`** — opened from the Browser-page library button. The existing `ImportLibraryModal` becomes a tabbed modal: *Manabox CSV* | *MTG Arena*. The MTGA tab walks:

1. **Pick log** — file picker, two-line path hint (Windows, macOS), note that the file can be large.
2. **Review summary** — owned / in-pool / out-of-pool counts. Single checkbox *"Also import my MTGA decks"* (default off).
3. **(If checked) Deck checklist** — scrollable list, each row: deck name • format • mainboard count • `N% in pool` badge • checkbox. Sorted by in-pool % desc. *Select all* / *Select none* controls at the top. "Skip — just import the library" link to back out of decks after opting in.

Confirm button text adapts: *"Import library"* or *"Import library + N decks"*.

**Mode: `decks-only`** — opened from a new "Import MTGA decks" button on the Decks page. Same modal, two steps: pick log → deck checklist. Library section is hidden; the Dexie library row is not touched.

In `decks-only` mode, if the log contains a collection snapshot **and** the user has no library imported yet, the modal shows a small banner: *"This log also contains your collection. Import it too?"* — inline checkbox, default off.

### Progress and errors

- Determinate progress bar during parse (driven by byte-count callback from `File.stream`).
- Indeterminate spinner during resolution.
- Error states render in a single red panel inside the modal, with actionable copy:
  - "We couldn't find a collection snapshot in this log. Open MTGA, click the Collection tab, then re-export Player.log."
  - "We couldn't find any decks in this log. Open MTGA's deck builder, then re-export Player.log."
  - "Neither a collection snapshot nor decks were found. Try `Player-prev.log` if it exists in the same folder."
  - Malformed JSON → "This file doesn't look like a Player.log — check that you uploaded the right file."

## Re-import behavior

- **Library:** re-import replaces the Dexie row (same as Manabox today).
- **Decks:** each newly selected deck is added. Previously-imported MTGA decks the user has since edited are left alone. No deduping by name or MTGA id.

If the user re-imports and ends up with duplicate decks, they delete the unwanted copies manually — same friction as re-importing a deck list paste.

## Testing

### Parser unit tests — `app/src/lib/mtgaLogParser.test.ts`

Fixture log snippets under `app/tests/fixtures/mtga/`:

- Healthy log (both events present, single snapshot each).
- Collection only.
- Decks only.
- Neither (no matching events).
- Version-drifted event names (`GetPlayerCardsV4`, `GetDeckListsV4`).
- Multiple snapshots — assert *last* wins.
- Event JSON split across a chunk boundary — assert stream parser recovers.
- Malformed JSON inside a matched marker — assert graceful failure, not crash.

### Resolver unit tests — `app/src/lib/mtgaResolve.test.ts`

Hand-crafted `cards` map with known `arena_id` values:

- Clean 1:1 mapping.
- Multiple arena_ids → same oracleId (reprint).
- Arena_id with no match → counted in `outOfPoolCount` / `unresolvedArenaIds`.
- Zero-count entries — skipped, not in result.
- Deck with cards both in-pool and out — `inPoolPercent` computed correctly.
- Companion field handled (resolved or dropped if unresolved).

### Pipeline test — `pipeline/normalize.test.ts`

Add an assertion that `arena_id` from a Scryfall fixture surfaces on the matching `printingDetails` entry. Add a fixture printing with no `arena_id` to confirm the field stays absent (not `null`, not `0`).

### Component tests — `app/src/components/ImportMtgaModal.test.tsx`

- `full` mode happy path: upload log → see collection summary → opt into decks → see checklist → confirm → `importLibrary` and `addDeck` called.
- `decks-only` mode happy path: upload log → see checklist → confirm → `importLibrary` *not* called.
- `decks-only` cross-section banner appears when no library is imported and the log contains a collection snapshot; opting in calls `importLibrary`.
- Error path: log with neither event → error panel visible, confirm button disabled.

Lean on existing `LibraryImportSummary` tests — don't retest summary rendering.

### E2E — `app/tests/e2e/`

One Playwright case: upload a small fixture `Player.log` via the Browser-page entry, opt into decks, confirm both library badge and decks list reflect the import.

## File layout

```
app/src/lib/
  mtgaLogParser.ts         streamed Player.log parser
  mtgaLogParser.test.ts
  mtgaResolve.ts           arena_id → oracleId, summary, deck parsing
  mtgaResolve.test.ts

app/src/components/
  ImportLibraryModal.tsx   (existing) becomes tabbed: Manabox | MTG Arena
  MtgaImportPanel.tsx      MTGA tab body: log picker, summary, deck checklist
  MtgaImportPanel.test.tsx
  MtgaDeckChecklist.tsx    scrollable checklist with in-pool % badges
  MtgaDeckChecklist.test.tsx

app/src/pages/DecksPage.tsx
                           adds "Import MTGA decks" button → opens
                           MtgaImportPanel in `decks-only` mode (rendered
                           inside a thin modal shell, not the tabbed
                           library modal)

app/tests/fixtures/mtga/   small synthetic Player.log snippets
```

`MtgaImportPanel` accepts a `mode: 'full' | 'decks-only'` prop and is the single source of truth for the MTGA flow. `ImportLibraryModal` renders it inside the MTGA tab; the Decks-page entry point renders it inside its own minimal modal shell.

## Platform support (revised 2026-06-09)

The original design assumed `Player.log` carried collection + deck events on every platform. **Real-user testing on 2026-06-09 against MTGA client `2026.59.30` (macOS Epic build) found that Mac and Linux clients no longer write `PlayerInventory.GetPlayerCards*` or `Deck.GetDeckLists*` to `Player.log`, even with Detailed Logs enabled.** Confirmed against `Player.log` and `Player-prev.log`; no sibling log file exists. Online research (17Lands public statement, GitHub repos for Untapped/Aetherhub/Arena Tutor/etc.) confirms this has been a Mac-specific regression since ~2021 — all maintained third-party tools tail logs **on Windows via Overwolf**, where the events still fire.

To keep the feature useful on every platform, the MTGA tab now offers two sources:

1. **Player.log (Windows + Detailed Logs).** Original code path: streamed log parse → arena_id resolution → collection + opt-in decks. Works as designed for Windows users. Surfaces a per-import error message on Mac/Linux pointing users to source #2.
2. **Collection JSON (cross-platform).** Accepts the `mtga_collection.json` output from [MTGA-collection-exporter](https://github.com/NthPhantom10/MTGA-collection-exporter) — a Windows-side `pymem` memory scanner that anchors on the live MTGA process after the user scrolls through Collection. The JSON is a portable file the user uploads here. **Collection only — the JSON has no deck data.**

### JSON shape

```json
[
  { "count": 4, "name": "Abrade", "set": "DMU", "cn": "131" },
  { "count": 2, "name": "Sheoldred, the Apocalypse", "set": "DMU", "cn": "107" }
]
```

Flat array, no arena IDs (the exporter merges by `(name, set)` and discards `GrpId`s). No schema versioning, no wildcards, no currency.

### Resolution

`parseMtgaCollectionJson(text)` produces a `ParsedLibrary` — the same shape Manabox CSV produces. Downstream resolution reuses `resolveLibrary` (name-based, not arena-id-based). Unknowns surface in the existing `unknownNames` / `unknownSets` buckets, same as Manabox. The arena-id index built for the Player.log path is unused here.

### UI

The MTGA tab now renders, in order:

1. **Windows-only banner** (always visible): explains the Player.log limitation, links to MTGA-collection-exporter.
2. **Source selector** (`Player.log` / `Collection JSON`): defaults to `Player.log`. Switching resets the parse state. Decks-only mode (Decks page entry) hides the selector — JSON has no decks, so Player.log is the only option there.
3. **File picker** with dynamic label and accept attribute (`.log` vs `.json`).
4. The same summary / decks-checklist / confirm machinery as the original design.

`MtgaCollectionSummary` is still produced on the Player.log path but is absent on the JSON path — `LibraryImportSummary` accepts `mtgaSummary?:` and falls back to the Manabox-style Unknown-names / Unknown-sets groups when undefined.

## Future work (not in scope)

- **C-tier expanded graph scope.** Pull all `is:arena` cards into the artifact so MTGA imports cover Historic / Alchemy / Explorer collections. Architecturally additive; the call-out is artifact size and re-running rule coverage against a much larger pool.
- **Wildcard inventory.** `Player.log`'s `StartHook` carries `WildCardCommons/Uncommons/Rares/Mythics` and currency — this fires on every MTGA launch regardless of which screens the user visits, so it's more reliably accessible than collection. Could power a "decks I can craft" filter and per-card craft cost annotations without depending on the missing PlayerInventory event.
- **Sync provenance on decks.** Track MTGA deck UUID on imported decks to enable update-in-place re-sync.
- **Auto-detect log file.** Browser `File System Access API` could remember the folder and re-read on demand. Behind a feature detect; not all browsers support it.
- **Re-check `Player.log` periodically.** If a future MTGA client release restores the events on Mac/Linux, we can drop the "Windows only" caveat. Quick check: `grep -oE "<==\s*[A-Za-z][A-Za-z0-9_.]+\b" Player.log | sort -u` on a fresh log — `PlayerInventory.GetPlayerCardsV3` (or any version suffix) coming back to the list means the regression is fixed.
