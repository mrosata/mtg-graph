# MTG Arena import — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the MTG Arena import feature per `docs/superpowers/specs/2026-06-08-mtga-import-design.md`. The user uploads `Player.log`; the app extracts the collection and (optionally) decks, resolves arena IDs to oracle IDs against the Standard graph, and feeds the existing `libraryStore` + `deckStore` infrastructure. Two entry points share one panel: a tab inside `ImportLibraryModal`, and a standalone button on the Decks page.

**Architecture:** Additive. One optional pipeline field (`arenaId` per printing) plus new app-side modules (`mtgaLogParser`, `mtgaResolve`) that produce the existing `LibraryImportResult` / `ResolvedEntry[]` shapes. UI is a single shared panel `MtgaImportPanel` mounted in two modes (`'full' | 'decks-only'`). No new persistence concepts.

**Tech Stack:** TypeScript, React, Vite, Zustand, Dexie, Vitest + React Testing Library, Playwright. Vite's `?raw` import suffix is the idiomatic way to load text fixtures into vitest. `noUncheckedIndexedAccess: true` is on across the repo — index access returns `T | undefined`. TDD for parser + resolver + pipeline; component tests with RTL for the panel + checklist.

---

## File map

**Modified (pipeline):**
- `pipeline/fetch.ts` — `ScryfallCard` gets `arena_id?: number | null`; `stripScryfallCard` writes it onto the matching `printingDetails` entry
- `pipeline/fetch.test.ts` — new case asserting `arenaId` round-trips
- `shared/version.ts` — bump `RULE_VERSION`

**Modified (shared types):**
- `shared/types.ts` — `printingDetails[].arenaId?: number`

**New (app pure logic):**
- `app/src/lib/arenaIdIndex.ts` — builds `Map<arenaId, { oracleId, set, collectorNumber }>` from `cards`
- `app/src/lib/arenaIdIndex.test.ts`
- `app/src/lib/mtgaLogParser.ts` — streamed `Player.log` event extractor
- `app/src/lib/mtgaLogParser.test.ts`
- `app/src/lib/mtgaResolve.ts` — collection + deck resolvers
- `app/src/lib/mtgaResolve.test.ts`

**New (fixtures):**
- `app/tests/fixtures/mtga/healthy.log`
- `app/tests/fixtures/mtga/collection-only.log`
- `app/tests/fixtures/mtga/decks-only.log`
- `app/tests/fixtures/mtga/empty.log`
- `app/tests/fixtures/mtga/versioned.log`
- `app/tests/fixtures/mtga/multi-snapshot.log`

**New (UI):**
- `app/src/components/MtgaImportPanel.tsx` — log picker + summary + opt-in/deck checklist; takes `mode: 'full' | 'decks-only'`
- `app/src/components/MtgaImportPanel.test.tsx`
- `app/src/components/MtgaDeckChecklist.tsx` — scrollable checklist with in-pool % badges
- `app/src/components/MtgaDeckChecklist.test.tsx`
- `app/src/components/MtgaImportModal.tsx` — thin modal shell used by the Decks page (wraps `MtgaImportPanel` in decks-only mode)

**Modified (UI):**
- `app/src/components/ImportLibraryModal.tsx` — tabbed: *Manabox CSV* | *MTG Arena*. MTGA tab renders `MtgaImportPanel` in `full` mode.
- `app/src/components/LibraryImportSummary.tsx` — adds optional `mtgaSummary?: MtgaCollectionSummary` prop that, when present, renders an "out of pool" line and suppresses the (always-empty for MTGA) unknown-names / unknown-sets groups.
- `app/src/pages/DecksPage.tsx` — adds "Import MTGA decks" button that opens `MtgaImportModal`.

**New (e2e):**
- `app/tests/e2e/mtga-import.spec.ts`

---

## Task 1 — Pipeline: surface `arena_id` per printing

**Files:**
- Modify: `shared/types.ts` (the `printingDetails` block, currently lines 56–64)
- Modify: `pipeline/fetch.ts` — `ScryfallCard` type (lines 10–28) and `stripScryfallCard` (lines 38–86)
- Modify: `shared/version.ts` (line 2)
- Test: `pipeline/fetch.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `pipeline/fetch.test.ts` inside the existing `describe('stripScryfallCard', ...)`:

```ts
it('records arena_id on the printing detail', () => {
  const raw = {
    oracle_id: 'oid-arena', name: 'Arena Card', set: 'one',
    collector_number: '42', cmc: 0, type_line: 'Creature', rarity: 'rare',
    mtgo_id: null, arena_id: 70123,
  };
  const card = stripScryfallCard(raw as any);
  expect(card.printingDetails).toEqual([
    { set: 'one', collectorNumber: '42', arenaId: 70123 },
  ]);
});

it('omits arenaId when arena_id is absent', () => {
  const raw = {
    oracle_id: 'oid-no-arena', name: 'Paper Only', set: 'old',
    collector_number: '1', cmc: 0, type_line: 'Land', rarity: 'common',
  };
  const card = stripScryfallCard(raw as any);
  expect(card.printingDetails).toEqual([
    { set: 'old', collectorNumber: '1' },
  ]);
});

it('records both mtgo_id and arena_id when both present', () => {
  const raw = {
    oracle_id: 'oid-both', name: 'Both IDs', set: 'one',
    collector_number: '7', cmc: 0, type_line: 'Instant', rarity: 'common',
    mtgo_id: 80000, arena_id: 70999,
  };
  const card = stripScryfallCard(raw as any);
  expect(card.printingDetails).toEqual([
    { set: 'one', collectorNumber: '7', mtgoId: 80000, arenaId: 70999 },
  ]);
});
```

- [ ] **Step 2: Run test to verify it fails**

```
npm run test:pipeline -- fetch.test
```

Expected: the three new cases fail with mismatched objects (no `arenaId` on output).

- [ ] **Step 3: Update `shared/types.ts`**

Replace the `printingDetails` block (around lines 56–64) with:

```ts
  printingDetails?: Array<{
    set: string;
    collectorNumber: string;
    mtgoId?: number;
    // Scryfall arena_id when present. Per-printing — multiple arenaIds
    // can map to the same oracleId across reprints / Arena-specific
    // visual variants. Used only by MTGA library/deck import.
    arenaId?: number;
  }>;
```

- [ ] **Step 4: Update `ScryfallCard` type in `pipeline/fetch.ts`**

Inside the `ScryfallCard` type literal (around line 25), add below `mtgo_id`:

```ts
  arena_id?: number | null;
```

- [ ] **Step 5: Update `stripScryfallCard` to write `arenaId`**

Replace the `printingDetails: [...]` block in `stripScryfallCard` (lines 79–83) with:

```ts
    printingDetails: [
      (() => {
        const d: { set: string; collectorNumber: string; mtgoId?: number; arenaId?: number } = {
          set: raw.set,
          collectorNumber: raw.collector_number,
        };
        if (raw.mtgo_id != null) d.mtgoId = raw.mtgo_id;
        if (raw.arena_id != null) d.arenaId = raw.arena_id;
        return d;
      })(),
    ],
```

This preserves the "omit field when null/absent" property the existing tests already check for.

- [ ] **Step 6: Bump `RULE_VERSION`**

In `shared/version.ts`, change the version string:

```ts
export const RULE_VERSION = 'v0.40.0';
```

The existing artifact-cache invalidation in `app/src/lib/db.ts` reads this; bumping it forces clients to re-hydrate IndexedDB against the new artifact shape.

- [ ] **Step 7: Run pipeline tests**

```
npm run test:pipeline
```

Expected: all green, including the three new cases.

- [ ] **Step 8: Rebuild the Standard artifact so the live app has `arenaId` populated**

```
npm run build:cards -- --standard
```

This regenerates `app/public/data/cards-standard.json` from cached Scryfall data. Sanity-check at the shell:

```
node -e "const j=require('./app/public/data/cards-standard.json'); const c=j.cards.find(c=>c.printingDetails?.some(d=>d.arenaId)); console.log(c?.name, c?.printingDetails);"
```

Expected: prints some card name with `arenaId` populated on at least one `printingDetails` entry.

- [ ] **Step 9: Commit**

```
git add shared/types.ts shared/version.ts pipeline/fetch.ts pipeline/fetch.test.ts app/public/data/cards-standard.json
git commit -m "pipeline: surface arena_id per printing; bump RULE_VERSION"
```

(The artifact is gitignored on this repo — `git add` will silently no-op for it. That's fine; the commit captures the source changes.)

---

## Task 2 — `arenaIdIndex.ts`: arena_id → printing lookup

A pure helper that builds the lookup map the resolver uses. Pulled out so resolver tests don't need a full `cards` map.

**Files:**
- Create: `app/src/lib/arenaIdIndex.ts`
- Test: `app/src/lib/arenaIdIndex.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// app/src/lib/arenaIdIndex.test.ts
import { describe, it, expect } from 'vitest';
import type { Card } from '@shared/types';
import { buildArenaIdIndex, type ArenaIdEntry } from './arenaIdIndex';

function mkCard(oracleId: string, printings: Array<{ set: string; cn: string; arenaId?: number }>): Card {
  return {
    oracleId, name: oracleId, set: printings[0]!.set, printings: printings.map((p) => p.set),
    collectorNumber: printings[0]!.cn, manaCost: null, cmc: 0,
    colors: [], colorIdentity: [], typeLine: 'Creature', types: ['Creature'],
    subtypes: [], supertypes: [], oracleText: '', keywords: [],
    power: null, toughness: null, rarity: 'common', imageUrl: '',
    printingDetails: printings.map((p) => {
      const d: { set: string; collectorNumber: string; arenaId?: number } = { set: p.set, collectorNumber: p.cn };
      if (p.arenaId !== undefined) d.arenaId = p.arenaId;
      return d;
    }),
    tags: [],
  };
}

describe('buildArenaIdIndex', () => {
  it('maps a single arena_id to its printing', () => {
    const cards = new Map<string, Card>([
      ['oid-a', mkCard('oid-a', [{ set: 'one', cn: '1', arenaId: 70001 }])],
    ]);
    const idx = buildArenaIdIndex(cards);
    expect(idx.get(70001)).toEqual<ArenaIdEntry>({ oracleId: 'oid-a', set: 'one', collectorNumber: '1' });
  });

  it('indexes every printing of a reprinted card', () => {
    const cards = new Map<string, Card>([
      ['oid-bolt', mkCard('oid-bolt', [
        { set: 'm21', cn: '162', arenaId: 70100 },
        { set: 'fdn', cn: '500', arenaId: 80200 },
      ])],
    ]);
    const idx = buildArenaIdIndex(cards);
    expect(idx.get(70100)?.set).toBe('m21');
    expect(idx.get(80200)?.set).toBe('fdn');
    expect(idx.get(80200)?.oracleId).toBe('oid-bolt');
  });

  it('skips printings without arenaId', () => {
    const cards = new Map<string, Card>([
      ['oid-paper', mkCard('oid-paper', [{ set: 'old', cn: '1' }])],
    ]);
    const idx = buildArenaIdIndex(cards);
    expect(idx.size).toBe(0);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

```
cd app && npm test -- arenaIdIndex
```

Expected: module-not-found error.

- [ ] **Step 3: Implement**

```ts
// app/src/lib/arenaIdIndex.ts
import type { Card } from '@shared/types';

export type ArenaIdEntry = {
  oracleId: string;
  set: string;
  collectorNumber: string;
};

export function buildArenaIdIndex(cards: Map<string, Card>): Map<number, ArenaIdEntry> {
  const out = new Map<number, ArenaIdEntry>();
  for (const card of cards.values()) {
    const details = card.printingDetails;
    if (!details) continue;
    for (const d of details) {
      if (d.arenaId === undefined) continue;
      out.set(d.arenaId, {
        oracleId: card.oracleId,
        set: d.set,
        collectorNumber: d.collectorNumber,
      });
    }
  }
  return out;
}
```

- [ ] **Step 4: Run test, verify it passes**

```
cd app && npm test -- arenaIdIndex
```

Expected: 3/3 pass.

- [ ] **Step 5: Commit**

```
git add app/src/lib/arenaIdIndex.ts app/src/lib/arenaIdIndex.test.ts
git commit -m "app: arena_id → printing index"
```

---

## Task 3 — `mtgaLogParser.ts`: event extraction (synchronous string form)

Start with a synchronous `parseMtgaLogText(text)` function over an in-memory string. The streamed `File` variant comes next; doing the parsing logic on a string first keeps tests trivial.

**Files:**
- Create: `app/src/lib/mtgaLogParser.ts`
- Test: `app/src/lib/mtgaLogParser.test.ts`
- Create: `app/tests/fixtures/mtga/healthy.log`
- Create: `app/tests/fixtures/mtga/collection-only.log`
- Create: `app/tests/fixtures/mtga/decks-only.log`
- Create: `app/tests/fixtures/mtga/empty.log`
- Create: `app/tests/fixtures/mtga/versioned.log`
- Create: `app/tests/fixtures/mtga/multi-snapshot.log`

- [ ] **Step 1: Write the fixture files**

Each file is a small synthetic Player.log excerpt. The MTGA logger format we accept is:

```
[UnityCrossThreadLogger]<== PlayerInventory.GetPlayerCardsV3(...)
<json payload, possibly multi-line>
```

`healthy.log`:

```
[UnityCrossThreadLogger]==> PlayerInventory.GetPlayerCardsV3(7, "")
{"id": 7, "request": ""}

[UnityCrossThreadLogger]<== PlayerInventory.GetPlayerCardsV3(7)
{
  "70001": 4,
  "70002": 2,
  "70003": 1
}

[UnityCrossThreadLogger]<== Deck.GetDeckListsV3(8)
[
  {
    "id": "deck-aaa",
    "name": "Mono-Red Aggro",
    "format": "Standard",
    "mainDeck": [{"id": 70001, "quantity": 4}, {"id": 70002, "quantity": 2}],
    "sideboard": [{"id": 70003, "quantity": 1}],
    "companion": null
  },
  {
    "id": "deck-bbb",
    "name": "Test Brew",
    "format": "Historic",
    "mainDeck": [{"id": 99999, "quantity": 1}],
    "sideboard": [],
    "companion": null
  }
]
```

`collection-only.log`: like `healthy.log` but only the `<==` PlayerInventory block.

`decks-only.log`: like `healthy.log` but only the `<==` Deck.GetDeckLists block.

`empty.log`:

```
[UnityCrossThreadLogger] Some unrelated MTGA log line.
[UnityCrossThreadLogger]==> Authenticate(...)
{ "ok": true }
```

`versioned.log`: identical to `collection-only.log` but with `GetPlayerCardsV4` instead of `V3`.

`multi-snapshot.log`: two `<==` `GetPlayerCardsV3` blocks back to back; the *second* one has different counts:

```
[UnityCrossThreadLogger]<== PlayerInventory.GetPlayerCardsV3(7)
{
  "70001": 1
}

[UnityCrossThreadLogger]<== PlayerInventory.GetPlayerCardsV3(7)
{
  "70001": 4,
  "70002": 4
}
```

- [ ] **Step 2: Write the failing test**

```ts
// app/src/lib/mtgaLogParser.test.ts
import { describe, it, expect } from 'vitest';
import { parseMtgaLogText } from './mtgaLogParser';

import healthy from '../../tests/fixtures/mtga/healthy.log?raw';
import collectionOnly from '../../tests/fixtures/mtga/collection-only.log?raw';
import decksOnly from '../../tests/fixtures/mtga/decks-only.log?raw';
import empty from '../../tests/fixtures/mtga/empty.log?raw';
import versioned from '../../tests/fixtures/mtga/versioned.log?raw';
import multiSnapshot from '../../tests/fixtures/mtga/multi-snapshot.log?raw';

describe('parseMtgaLogText', () => {
  it('extracts both collection and decks from a healthy log', () => {
    const r = parseMtgaLogText(healthy);
    expect(r.collection).toEqual({ '70001': 4, '70002': 2, '70003': 1 });
    expect(r.decks).toHaveLength(2);
    expect(r.decks?.[0]).toMatchObject({ id: 'deck-aaa', name: 'Mono-Red Aggro', format: 'Standard' });
    expect(r.decks?.[0]?.mainDeck).toEqual([
      { id: 70001, quantity: 4 }, { id: 70002, quantity: 2 },
    ]);
  });

  it('returns null for the missing event when only collection is present', () => {
    const r = parseMtgaLogText(collectionOnly);
    expect(r.collection).not.toBeNull();
    expect(r.decks).toBeNull();
  });

  it('returns null for the missing event when only decks are present', () => {
    const r = parseMtgaLogText(decksOnly);
    expect(r.collection).toBeNull();
    expect(r.decks).not.toBeNull();
  });

  it('returns both null on a log with no matching events', () => {
    const r = parseMtgaLogText(empty);
    expect(r.collection).toBeNull();
    expect(r.decks).toBeNull();
  });

  it('accepts version-drifted event names (V4)', () => {
    const r = parseMtgaLogText(versioned);
    expect(r.collection).not.toBeNull();
  });

  it('uses the last snapshot when multiple are present', () => {
    const r = parseMtgaLogText(multiSnapshot);
    expect(r.collection).toEqual({ '70001': 4, '70002': 4 });
  });

  it('only matches response (<==) markers, not request (==>)', () => {
    // A request-form marker carries no payload; treat as ignored.
    const txt = '[UnityCrossThreadLogger]==> PlayerInventory.GetPlayerCardsV3(7, "")\n{"id":7,"request":""}\n';
    expect(parseMtgaLogText(txt).collection).toBeNull();
  });
});
```

- [ ] **Step 3: Run test, verify it fails**

```
cd app && npm test -- mtgaLogParser
```

Expected: module-not-found.

- [ ] **Step 4: Implement**

```ts
// app/src/lib/mtgaLogParser.ts

export type MtgaRawDeck = {
  id: string;
  name: string;
  format: string;
  mainDeck: { id: number; quantity: number }[];
  sideboard: { id: number; quantity: number }[];
  companion: { id: number } | null;
};

export type MtgaLogContents = {
  collection: Record<string, number> | null;
  decks: MtgaRawDeck[] | null;
};

const COLLECTION_RE = /<==\s*PlayerInventory\.GetPlayerCards(?:V\d+)?\b/;
const DECKS_RE = /<==\s*Deck\.GetDeckLists(?:V\d+)?\b/;

export function parseMtgaLogText(text: string): MtgaLogContents {
  let collection: Record<string, number> | null = null;
  let decks: MtgaRawDeck[] | null = null;

  let i = 0;
  while (i < text.length) {
    const nl = text.indexOf('\n', i);
    const line = text.slice(i, nl === -1 ? text.length : nl);

    if (COLLECTION_RE.test(line)) {
      const after = nl === -1 ? text.length : nl + 1;
      const { value, end } = readJsonValue(text, after);
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Last one wins — always overwrite.
        collection = value as Record<string, number>;
      }
      i = end;
      continue;
    }
    if (DECKS_RE.test(line)) {
      const after = nl === -1 ? text.length : nl + 1;
      const { value, end } = readJsonValue(text, after);
      if (Array.isArray(value)) {
        decks = (value as unknown[])
          .filter((d): d is MtgaRawDeck => isRawDeck(d));
      }
      i = end;
      continue;
    }

    i = nl === -1 ? text.length : nl + 1;
  }

  return { collection, decks };
}

function isRawDeck(d: unknown): d is MtgaRawDeck {
  if (!d || typeof d !== 'object') return false;
  const o = d as Record<string, unknown>;
  return typeof o.id === 'string'
    && typeof o.name === 'string'
    && typeof o.format === 'string'
    && Array.isArray(o.mainDeck)
    && Array.isArray(o.sideboard);
}

/**
 * Read a single JSON value (object or array) starting at `start`, skipping
 * leading whitespace. Returns the parsed value plus the index just past the
 * closing bracket. Bracket-balances naively so multi-line JSON works; respects
 * string literals so braces inside strings don't throw the count off.
 */
function readJsonValue(text: string, start: number): { value: unknown; end: number } {
  let i = start;
  while (i < text.length && /\s/.test(text[i]!)) i++;
  const open = text[i];
  if (open !== '{' && open !== '[') return { value: null, end: i };
  const close = open === '{' ? '}' : ']';

  let depth = 0;
  let inStr = false;
  let escape = false;
  const begin = i;
  for (; i < text.length; i++) {
    const ch = text[i]!;
    if (inStr) {
      if (escape) { escape = false; continue; }
      if (ch === '\\') { escape = true; continue; }
      if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') { inStr = true; continue; }
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) {
        const slice = text.slice(begin, i + 1);
        try { return { value: JSON.parse(slice), end: i + 1 }; }
        catch { return { value: null, end: i + 1 }; }
      }
    }
  }
  return { value: null, end: text.length };
}
```

- [ ] **Step 5: Run test, verify all pass**

```
cd app && npm test -- mtgaLogParser
```

Expected: 7/7 pass.

- [ ] **Step 6: Commit**

```
git add app/src/lib/mtgaLogParser.ts app/src/lib/mtgaLogParser.test.ts app/tests/fixtures/mtga/
git commit -m "app: Player.log event parser (synchronous string form)"
```

---

## Task 4 — `mtgaLogParser.ts`: streamed `File` reader

Wrap the synchronous parser in a `parseMtgaLogFile(file, onProgress?)` helper that streams the file in chunks. Real Player.logs are 50–500 MB; we cannot load them whole into memory.

**Files:**
- Modify: `app/src/lib/mtgaLogParser.ts`
- Modify: `app/src/lib/mtgaLogParser.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `mtgaLogParser.test.ts`:

```ts
import { parseMtgaLogFile } from './mtgaLogParser';

function fileFrom(text: string): File {
  return new File([text], 'Player.log', { type: 'text/plain' });
}

describe('parseMtgaLogFile', () => {
  it('streams a small log and returns the same result as parseMtgaLogText', async () => {
    const file = fileFrom(healthy);
    const result = await parseMtgaLogFile(file);
    expect(result).toEqual(parseMtgaLogText(healthy));
  });

  it('reports progress as bytes are consumed', async () => {
    const file = fileFrom(healthy);
    const progress: number[] = [];
    await parseMtgaLogFile(file, (bytesRead, total) => {
      progress.push(bytesRead);
      expect(total).toBe(file.size);
    });
    expect(progress.length).toBeGreaterThan(0);
    expect(progress[progress.length - 1]).toBe(file.size);
  });

  it('recovers when an event payload spans the chunk boundary', async () => {
    const file = fileFrom(healthy);
    // Force a tiny chunk size so the JSON definitely splits.
    const result = await parseMtgaLogFile(file, undefined, { chunkSize: 16 });
    expect(result.collection).toEqual({ '70001': 4, '70002': 2, '70003': 1 });
    expect(result.decks).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run, verify failure**

```
cd app && npm test -- mtgaLogParser
```

Expected: `parseMtgaLogFile is not exported`.

- [ ] **Step 3: Implement the streamed reader**

Append to `app/src/lib/mtgaLogParser.ts`:

```ts
export type ProgressCallback = (bytesRead: number, totalBytes: number) => void;

export async function parseMtgaLogFile(
  file: File,
  onProgress?: ProgressCallback,
  opts: { chunkSize?: number } = {},
): Promise<MtgaLogContents> {
  const chunkSize = opts.chunkSize ?? 1 << 20; // 1 MiB
  const decoder = new TextDecoder('utf-8');

  let buffered = '';
  let bytesRead = 0;
  const total = file.size;

  for (let offset = 0; offset < total; offset += chunkSize) {
    const slice = file.slice(offset, Math.min(offset + chunkSize, total));
    const ab = await slice.arrayBuffer();
    bytesRead += ab.byteLength;
    buffered += decoder.decode(ab, { stream: offset + chunkSize < total });
    onProgress?.(bytesRead, total);
  }
  // Flush the decoder.
  buffered += decoder.decode();

  return parseMtgaLogText(buffered);
}
```

The chunked read accumulates the full text in memory. That's acceptable: `Player.log` is typically <500 MB, and the parser scans for late events only. (A future optimization could stream-discard already-scanned prefix, but the spec doesn't require it and the JSON-blob model makes incremental parsing tricky.) Note `decoder.decode({ stream: true })` for all but the final chunk avoids splitting a multi-byte UTF-8 char across chunks.

- [ ] **Step 4: Run, verify all pass**

```
cd app && npm test -- mtgaLogParser
```

Expected: 10/10 pass.

- [ ] **Step 5: Commit**

```
git add app/src/lib/mtgaLogParser.ts app/src/lib/mtgaLogParser.test.ts
git commit -m "app: streamed Player.log reader with progress + small-chunk recovery"
```

---

## Task 5 — `mtgaResolve.ts`: collection resolver

Produces a standard `LibraryImportResult` plus an `MtgaCollectionSummary`.

**Files:**
- Create: `app/src/lib/mtgaResolve.ts`
- Test: `app/src/lib/mtgaResolve.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// app/src/lib/mtgaResolve.test.ts
import { describe, it, expect } from 'vitest';
import type { Card } from '@shared/types';
import { resolveMtgaCollection } from './mtgaResolve';

function mkCard(oracleId: string, printings: Array<{ set: string; cn: string; arenaId: number }>): Card {
  return {
    oracleId, name: oracleId, set: printings[0]!.set,
    printings: printings.map((p) => p.set),
    collectorNumber: printings[0]!.cn,
    manaCost: null, cmc: 0,
    colors: [], colorIdentity: [], typeLine: 'Creature', types: ['Creature'],
    subtypes: [], supertypes: [], oracleText: '', keywords: [],
    power: null, toughness: null, rarity: 'common', imageUrl: '',
    printingDetails: printings.map((p) => ({ set: p.set, collectorNumber: p.cn, arenaId: p.arenaId })),
    tags: [],
  };
}

const sampleCards = (): Map<string, Card> => new Map([
  ['oid-a', mkCard('oid-a', [{ set: 'one', cn: '1', arenaId: 70001 }])],
  ['oid-b', mkCard('oid-b', [{ set: 'one', cn: '2', arenaId: 70002 }])],
  ['oid-bolt', mkCard('oid-bolt', [
    { set: 'm21', cn: '162', arenaId: 70100 },
    { set: 'fdn', cn: '500', arenaId: 80200 },
  ])],
]);

describe('resolveMtgaCollection', () => {
  it('aggregates counts by oracleId and records per-printing detail', () => {
    const raw = { '70001': 4, '70002': 2 };
    const { result, mtgaSummary } = resolveMtgaCollection(raw, sampleCards());

    expect(result.owned.get('oid-a')).toBe(4);
    expect(result.owned.get('oid-b')).toBe(2);
    expect(result.ownedDetail.get('oid-a')).toEqual([
      { set: 'one', collectorNumber: '1', count: 4 },
    ]);

    expect(mtgaSummary).toEqual({
      totalCardsOwned: 6,
      resolvedCardsOwned: 6,
      outOfPoolCount: 0,
      unresolvedArenaIds: [],
    });
  });

  it('sums two arena ids of the same oracle into one entry', () => {
    const raw = { '70100': 3, '80200': 1 };
    const { result } = resolveMtgaCollection(raw, sampleCards());
    expect(result.owned.get('oid-bolt')).toBe(4);
    const detail = result.ownedDetail.get('oid-bolt');
    expect(detail).toHaveLength(2);
    expect(detail).toContainEqual({ set: 'm21', collectorNumber: '162', count: 3 });
    expect(detail).toContainEqual({ set: 'fdn', collectorNumber: '500', count: 1 });
  });

  it('buckets unresolved arena ids into outOfPoolCount', () => {
    const raw = { '70001': 4, '99999': 7, '88888': 1 };
    const { result, mtgaSummary } = resolveMtgaCollection(raw, sampleCards());
    expect(result.owned.get('oid-a')).toBe(4);
    expect(result.owned.size).toBe(1);
    expect(mtgaSummary.outOfPoolCount).toBe(8);
    expect(mtgaSummary.unresolvedArenaIds).toEqual([99999, 88888]);
  });

  it('skips zero-count entries', () => {
    const raw = { '70001': 4, '70002': 0 };
    const { result, mtgaSummary } = resolveMtgaCollection(raw, sampleCards());
    expect(result.owned.get('oid-b')).toBeUndefined();
    expect(mtgaSummary.totalCardsOwned).toBe(4);
  });

  it('leaves unknownNames / unknownSets / unparseableLines empty', () => {
    const { result } = resolveMtgaCollection({ '70001': 1 }, sampleCards());
    expect(result.unknownNames).toEqual([]);
    expect(result.unknownSets).toEqual([]);
    expect(result.unparseableLines).toEqual([]);
  });
});
```

- [ ] **Step 2: Run, verify failure**

```
cd app && npm test -- mtgaResolve
```

Expected: module-not-found.

- [ ] **Step 3: Implement**

```ts
// app/src/lib/mtgaResolve.ts
import type { Card } from '@shared/types';
import type { OwnedPrinting } from './db';
import type { LibraryImportResult } from './libraryImport';
import { buildArenaIdIndex, type ArenaIdEntry } from './arenaIdIndex';

export type MtgaCollectionSummary = {
  totalCardsOwned: number;
  resolvedCardsOwned: number;
  outOfPoolCount: number;
  unresolvedArenaIds: number[];
};

export function resolveMtgaCollection(
  raw: Record<string, number>,
  cards: Map<string, Card>,
): { result: LibraryImportResult; mtgaSummary: MtgaCollectionSummary } {
  const index = buildArenaIdIndex(cards);
  return resolveMtgaCollectionWithIndex(raw, index);
}

export function resolveMtgaCollectionWithIndex(
  raw: Record<string, number>,
  index: Map<number, ArenaIdEntry>,
): { result: LibraryImportResult; mtgaSummary: MtgaCollectionSummary } {
  const owned = new Map<string, number>();
  const ownedDetail = new Map<string, OwnedPrinting[]>();
  let totalCardsOwned = 0;
  let resolvedCardsOwned = 0;
  const unresolvedArenaIds: number[] = [];

  for (const [arenaIdStr, countRaw] of Object.entries(raw)) {
    const count = Number(countRaw);
    if (!Number.isFinite(count) || count <= 0) continue;
    totalCardsOwned += count;

    const arenaId = Number(arenaIdStr);
    const entry = index.get(arenaId);
    if (!entry) {
      unresolvedArenaIds.push(arenaId);
      continue;
    }

    resolvedCardsOwned += count;
    owned.set(entry.oracleId, (owned.get(entry.oracleId) ?? 0) + count);

    const list = ownedDetail.get(entry.oracleId) ?? [];
    const existing = list.find(
      (p) => p.set.toLowerCase() === entry.set.toLowerCase() &&
             p.collectorNumber === entry.collectorNumber,
    );
    if (existing) existing.count += count;
    else list.push({ set: entry.set, collectorNumber: entry.collectorNumber, count });
    ownedDetail.set(entry.oracleId, list);
  }

  const result: LibraryImportResult = {
    owned, ownedDetail,
    unknownNames: [], unknownSets: [], unparseableLines: [],
  };
  const mtgaSummary: MtgaCollectionSummary = {
    totalCardsOwned,
    resolvedCardsOwned,
    outOfPoolCount: totalCardsOwned - resolvedCardsOwned,
    unresolvedArenaIds,
  };
  return { result, mtgaSummary };
}
```

- [ ] **Step 4: Run, verify pass**

```
cd app && npm test -- mtgaResolve
```

Expected: 5/5 pass.

- [ ] **Step 5: Commit**

```
git add app/src/lib/mtgaResolve.ts app/src/lib/mtgaResolve.test.ts
git commit -m "app: MTGA collection resolver (arena_id → library import result)"
```

---

## Task 6 — `mtgaResolve.ts`: deck resolver

**Files:**
- Modify: `app/src/lib/mtgaResolve.ts`
- Modify: `app/src/lib/mtgaResolve.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `mtgaResolve.test.ts`:

```ts
import { resolveMtgaDecks } from './mtgaResolve';
import type { MtgaRawDeck } from './mtgaLogParser';

function mkRawDeck(over: Partial<MtgaRawDeck>): MtgaRawDeck {
  return {
    id: over.id ?? 'deck-x',
    name: over.name ?? 'Test',
    format: over.format ?? 'Standard',
    mainDeck: over.mainDeck ?? [],
    sideboard: over.sideboard ?? [],
    companion: over.companion ?? null,
  };
}

describe('resolveMtgaDecks', () => {
  it('resolves cards and computes in-pool percent', () => {
    const decks = resolveMtgaDecks(
      [mkRawDeck({
        mainDeck: [{ id: 70001, quantity: 4 }, { id: 99999, quantity: 2 }],
        sideboard: [{ id: 70002, quantity: 1 }],
      })],
      sampleCards(),
    );
    expect(decks).toHaveLength(1);
    const d = decks[0]!;
    expect(d.mainboard).toEqual([{ oracleId: 'oid-a', count: 4 }]);
    expect(d.sideboard).toEqual([{ oracleId: 'oid-b', count: 1 }]);
    expect(d.unresolvedMain).toBe(2);
    expect(d.unresolvedSide).toBe(0);
    // 5 of 7 cards resolved.
    expect(d.inPoolPercent).toBe(Math.round((5 / 7) * 100));
  });

  it('resolves the companion when its arena_id is in pool', () => {
    const decks = resolveMtgaDecks(
      [mkRawDeck({ mainDeck: [{ id: 70001, quantity: 4 }], companion: { id: 70002 } })],
      sampleCards(),
    );
    expect(decks[0]!.companion).toEqual({ oracleId: 'oid-b' });
  });

  it('drops the companion when its arena_id is unresolved', () => {
    const decks = resolveMtgaDecks(
      [mkRawDeck({ mainDeck: [{ id: 70001, quantity: 4 }], companion: { id: 88888 } })],
      sampleCards(),
    );
    expect(decks[0]!.companion).toBeNull();
  });

  it('reports zero inPoolPercent on an empty deck (and avoids divide by zero)', () => {
    const decks = resolveMtgaDecks([mkRawDeck({})], sampleCards());
    expect(decks[0]!.inPoolPercent).toBe(0);
  });

  it('preserves the MTGA name / format / id fields verbatim', () => {
    const decks = resolveMtgaDecks(
      [mkRawDeck({ id: 'abc', name: 'My Brew', format: 'Historic' })],
      sampleCards(),
    );
    expect(decks[0]).toMatchObject({ mtgaId: 'abc', mtgaName: 'My Brew', mtgaFormat: 'Historic' });
  });
});
```

- [ ] **Step 2: Run, verify failure**

```
cd app && npm test -- mtgaResolve
```

Expected: `resolveMtgaDecks is not exported`.

- [ ] **Step 3: Implement**

Append to `app/src/lib/mtgaResolve.ts`:

```ts
import type { MtgaRawDeck } from './mtgaLogParser';

export type ParsedMtgaDeck = {
  mtgaId: string;
  mtgaName: string;
  mtgaFormat: string;
  mainboard: { oracleId: string; count: number }[];
  sideboard: { oracleId: string; count: number }[];
  companion: { oracleId: string } | null;
  unresolvedMain: number;
  unresolvedSide: number;
  inPoolPercent: number;
};

export function resolveMtgaDecks(
  rawDecks: MtgaRawDeck[],
  cards: Map<string, Card>,
): ParsedMtgaDeck[] {
  const index = buildArenaIdIndex(cards);
  return rawDecks.map((d) => resolveOneDeck(d, index));
}

function resolveOneDeck(d: MtgaRawDeck, index: Map<number, ArenaIdEntry>): ParsedMtgaDeck {
  const mainboard: { oracleId: string; count: number }[] = [];
  const sideboard: { oracleId: string; count: number }[] = [];
  let resolved = 0;
  let totalCards = 0;
  let unresolvedMain = 0;
  let unresolvedSide = 0;

  for (const e of d.mainDeck) {
    totalCards += e.quantity;
    const hit = index.get(e.id);
    if (hit) { mainboard.push({ oracleId: hit.oracleId, count: e.quantity }); resolved += e.quantity; }
    else unresolvedMain += e.quantity;
  }
  for (const e of d.sideboard) {
    totalCards += e.quantity;
    const hit = index.get(e.id);
    if (hit) { sideboard.push({ oracleId: hit.oracleId, count: e.quantity }); resolved += e.quantity; }
    else unresolvedSide += e.quantity;
  }

  let companion: { oracleId: string } | null = null;
  if (d.companion) {
    const hit = index.get(d.companion.id);
    if (hit) companion = { oracleId: hit.oracleId };
  }

  return {
    mtgaId: d.id, mtgaName: d.name, mtgaFormat: d.format,
    mainboard, sideboard, companion,
    unresolvedMain, unresolvedSide,
    inPoolPercent: totalCards === 0 ? 0 : Math.round((resolved / totalCards) * 100),
  };
}
```

- [ ] **Step 4: Run, verify pass**

```
cd app && npm test -- mtgaResolve
```

Expected: 10/10 pass (5 collection + 5 deck).

- [ ] **Step 5: Commit**

```
git add app/src/lib/mtgaResolve.ts app/src/lib/mtgaResolve.test.ts
git commit -m "app: MTGA deck resolver with in-pool % per deck"
```

---

## Task 7 — `LibraryImportSummary`: optional `mtgaSummary` prop

**Files:**
- Modify: `app/src/components/LibraryImportSummary.tsx`
- Create: `app/src/components/LibraryImportSummary.test.tsx` (if absent; otherwise extend)

- [ ] **Step 1: Write the failing test**

If `LibraryImportSummary.test.tsx` doesn't exist, create it. Then add:

```tsx
// app/src/components/LibraryImportSummary.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LibraryImportSummary from './LibraryImportSummary';
import type { LibraryImportResult } from '../lib/libraryImport';
import type { MtgaCollectionSummary } from '../lib/mtgaResolve';

const baseResult: LibraryImportResult = {
  owned: new Map([['oid-a', 4], ['oid-b', 2]]),
  ownedDetail: new Map(),
  unknownNames: [], unknownSets: [], unparseableLines: [],
};

describe('LibraryImportSummary — mtgaSummary', () => {
  it('shows the out-of-pool line when mtgaSummary is provided and outOfPoolCount > 0', () => {
    const mtgaSummary: MtgaCollectionSummary = {
      totalCardsOwned: 100,
      resolvedCardsOwned: 88,
      outOfPoolCount: 12,
      unresolvedArenaIds: [],
    };
    render(<LibraryImportSummary result={baseResult} mtgaSummary={mtgaSummary} />);
    expect(screen.getByText(/12.*aren't in our Standard pool/i)).toBeInTheDocument();
  });

  it('omits the out-of-pool line when outOfPoolCount is zero', () => {
    const mtgaSummary: MtgaCollectionSummary = {
      totalCardsOwned: 50,
      resolvedCardsOwned: 50,
      outOfPoolCount: 0,
      unresolvedArenaIds: [],
    };
    render(<LibraryImportSummary result={baseResult} mtgaSummary={mtgaSummary} />);
    expect(screen.queryByText(/aren't in our Standard pool/i)).not.toBeInTheDocument();
  });

  it('hides unknown-names/unknown-sets/unparseable groups in MTGA mode', () => {
    const mtgaSummary: MtgaCollectionSummary = {
      totalCardsOwned: 1, resolvedCardsOwned: 1, outOfPoolCount: 0, unresolvedArenaIds: [],
    };
    render(<LibraryImportSummary result={baseResult} mtgaSummary={mtgaSummary} />);
    expect(screen.queryByText(/Unknown names/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Unknown sets/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Unparseable/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, verify failure**

```
cd app && npm test -- LibraryImportSummary
```

Expected: 3 failures about prop / element-not-found.

- [ ] **Step 3: Update the component**

Replace `app/src/components/LibraryImportSummary.tsx` with:

```tsx
import { useState } from 'react';
import type { ImportRowSummary, LibraryImportResult } from '../lib/libraryImport';
import type { MtgaCollectionSummary } from '../lib/mtgaResolve';

type Props = {
  result: LibraryImportResult;
  mtgaSummary?: MtgaCollectionSummary;
};

function Group({
  title, rows, initialOpen,
}: { title: string; rows: ImportRowSummary[]; initialOpen: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <div className="mt-3 border-t border-ink-line pt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="focus-brass flex w-full items-center justify-between text-left text-xs font-medium text-vellum-mute transition-colors hover:text-brass-hi"
      >
        <span>
          <span aria-hidden="true" className="mr-1 text-brass">{open ? '▼' : '▶'}</span>
          {`${title} (${rows.length})`}
        </span>
      </button>
      {open && rows.length > 0 && (
        <ul className="mt-2 max-h-48 overflow-y-auto font-mono text-xs tabular text-vellum-dim scrollbar-slim">
          {rows.map((r, i) => (
            <li key={`${r.name}-${r.setCode}-${i}`}>
              {`${r.quantity}× ${r.name} (${r.setCode || '—'})`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function LibraryImportSummary({ result, mtgaSummary }: Props) {
  const cardCount = result.owned.size;
  let copyCount = 0;
  for (const n of result.owned.values()) copyCount += n;

  return (
    <div>
      <p className="text-sm tabular text-brass-hi">
        {`Imported ${cardCount.toLocaleString()} cards (${copyCount.toLocaleString()} copies)`}
      </p>
      {mtgaSummary && mtgaSummary.outOfPoolCount > 0 && (
        <p className="mt-1 text-xs text-vellum-dim">
          {`${mtgaSummary.outOfPoolCount.toLocaleString()} cards in your collection aren't in our Standard pool.`}
        </p>
      )}
      {!mtgaSummary && (
        <>
          <Group title="Unknown names" rows={result.unknownNames} initialOpen />
          <Group title="Unknown sets" rows={result.unknownSets} initialOpen={false} />
          <Group
            title="Unparseable rows"
            rows={result.unparseableLines.map((line) => ({
              name: line.length > 60 ? line.slice(0, 60) + '…' : line,
              setCode: '',
              quantity: 1,
            }))}
            initialOpen={false}
          />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run, verify pass**

```
cd app && npm test -- LibraryImportSummary
```

Expected: all (existing Manabox tests + 3 new MTGA tests) pass.

- [ ] **Step 5: Commit**

```
git add app/src/components/LibraryImportSummary.tsx app/src/components/LibraryImportSummary.test.tsx
git commit -m "app: LibraryImportSummary supports MTGA mode (out-of-pool line)"
```

---

## Task 8 — `MtgaDeckChecklist` component

Scrollable list of decks with checkbox + in-pool % badge.

**Files:**
- Create: `app/src/components/MtgaDeckChecklist.tsx`
- Test: `app/src/components/MtgaDeckChecklist.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// app/src/components/MtgaDeckChecklist.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MtgaDeckChecklist from './MtgaDeckChecklist';
import type { ParsedMtgaDeck } from '../lib/mtgaResolve';

const deckA: ParsedMtgaDeck = {
  mtgaId: 'a', mtgaName: 'Mono-Red', mtgaFormat: 'Standard',
  mainboard: Array(60).fill({ oracleId: 'oid-a', count: 1 }),
  sideboard: [], companion: null,
  unresolvedMain: 0, unresolvedSide: 0, inPoolPercent: 100,
};
const deckB: ParsedMtgaDeck = {
  mtgaId: 'b', mtgaName: 'Historic Brew', mtgaFormat: 'Historic',
  mainboard: [], sideboard: [], companion: null,
  unresolvedMain: 60, unresolvedSide: 0, inPoolPercent: 0,
};
const deckC: ParsedMtgaDeck = {
  mtgaId: 'c', mtgaName: 'Mixed', mtgaFormat: 'Standard',
  mainboard: Array(40).fill({ oracleId: 'oid-a', count: 1 }),
  sideboard: [], companion: null,
  unresolvedMain: 20, unresolvedSide: 0, inPoolPercent: 67,
};

describe('MtgaDeckChecklist', () => {
  it('renders one row per deck with name, format, and in-pool %', () => {
    render(<MtgaDeckChecklist decks={[deckA, deckB, deckC]} selected={new Set()} onChange={() => {}} />);
    expect(screen.getByText('Mono-Red')).toBeInTheDocument();
    expect(screen.getByText('Historic Brew')).toBeInTheDocument();
    expect(screen.getByText('Mixed')).toBeInTheDocument();
    expect(screen.getByText('100% in pool')).toBeInTheDocument();
    expect(screen.getByText('0% in pool')).toBeInTheDocument();
  });

  it('sorts decks by inPoolPercent descending', () => {
    render(<MtgaDeckChecklist decks={[deckB, deckA, deckC]} selected={new Set()} onChange={() => {}} />);
    const rows = screen.getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('Mono-Red');
    expect(rows[1]).toHaveTextContent('Mixed');
    expect(rows[2]).toHaveTextContent('Historic Brew');
  });

  it('emits onChange with new Set when a row is toggled', () => {
    let captured: Set<string> | null = null;
    render(
      <MtgaDeckChecklist
        decks={[deckA, deckB]}
        selected={new Set(['a'])}
        onChange={(s) => { captured = s; }}
      />,
    );
    fireEvent.click(screen.getByLabelText(/Historic Brew/i));
    expect(captured).toEqual(new Set(['a', 'b']));
  });

  it('Select all / Select none toggle every row', () => {
    let captured: Set<string> | null = null;
    render(
      <MtgaDeckChecklist
        decks={[deckA, deckB]}
        selected={new Set()}
        onChange={(s) => { captured = s; }}
      />,
    );
    fireEvent.click(screen.getByText(/Select all/i));
    expect(captured).toEqual(new Set(['a', 'b']));
    fireEvent.click(screen.getByText(/Select none/i));
    expect(captured).toEqual(new Set());
  });
});
```

- [ ] **Step 2: Run, verify failure**

```
cd app && npm test -- MtgaDeckChecklist
```

Expected: module-not-found.

- [ ] **Step 3: Implement**

```tsx
// app/src/components/MtgaDeckChecklist.tsx
import type { ParsedMtgaDeck } from '../lib/mtgaResolve';

type Props = {
  decks: ParsedMtgaDeck[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
};

export default function MtgaDeckChecklist({ decks, selected, onChange }: Props) {
  const sorted = [...decks].sort((a, b) => b.inPoolPercent - a.inPoolPercent);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };

  const selectAll = () => onChange(new Set(sorted.map((d) => d.mtgaId)));
  const selectNone = () => onChange(new Set());

  return (
    <div>
      <div className="mb-2 flex items-center gap-3 text-xs">
        <button type="button" onClick={selectAll}
          className="focus-brass text-vellum-mute transition-colors hover:text-brass-hi">
          Select all
        </button>
        <span className="text-ink-line">|</span>
        <button type="button" onClick={selectNone}
          className="focus-brass text-vellum-mute transition-colors hover:text-brass-hi">
          Select none
        </button>
      </div>
      <ul className="max-h-72 overflow-y-auto rounded border border-ink-line bg-ink-raised scrollbar-slim">
        {sorted.map((d) => {
          const mainCount = d.mainboard.reduce((acc, e) => acc + e.count, 0);
          return (
            <li key={d.mtgaId} className="border-b border-ink-line last:border-b-0">
              <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-ink-panel">
                <input
                  type="checkbox"
                  checked={selected.has(d.mtgaId)}
                  onChange={() => toggle(d.mtgaId)}
                  aria-label={d.mtgaName}
                />
                <span className="flex-1 truncate text-vellum">{d.mtgaName}</span>
                <span className="text-xs text-vellum-dim">{d.mtgaFormat}</span>
                <span className="text-xs text-vellum-dim tabular">{mainCount}</span>
                <span className={`text-xs tabular ${d.inPoolPercent === 100 ? 'text-brass-hi' : 'text-vellum-mute'}`}>
                  {`${d.inPoolPercent}% in pool`}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Run, verify pass**

```
cd app && npm test -- MtgaDeckChecklist
```

Expected: 4/4 pass.

- [ ] **Step 5: Commit**

```
git add app/src/components/MtgaDeckChecklist.tsx app/src/components/MtgaDeckChecklist.test.tsx
git commit -m "app: MtgaDeckChecklist component"
```

---

## Task 9 — `MtgaImportPanel` — full mode (collection + opt-in decks)

A multi-step panel: file picker → summary + opt-in → decks checklist → confirm. Mounted inside `ImportLibraryModal`'s MTGA tab.

**Files:**
- Create: `app/src/components/MtgaImportPanel.tsx`
- Test: `app/src/components/MtgaImportPanel.test.tsx`

- [ ] **Step 1: Write the failing test (full-mode happy path)**

```tsx
// app/src/components/MtgaImportPanel.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MtgaImportPanel from './MtgaImportPanel';

import healthy from '../../tests/fixtures/mtga/healthy.log?raw';

const importLibrary = vi.fn().mockResolvedValue(undefined);
const importDeck    = vi.fn().mockResolvedValue('new-deck-id');

vi.mock('../stores/libraryStore', () => ({
  useLibraryStore: (sel: any) => sel({ importLibrary }),
}));
vi.mock('../stores/deckStore', () => ({
  useDeckStore: (sel: any) => sel({ importDeck }),
}));
vi.mock('../stores/graphStore', () => ({
  useGraphStore: (sel: any) => sel({
    cards: new Map([
      ['oid-a', mkCard('oid-a', 70001)],
      ['oid-b', mkCard('oid-b', 70002)],
      ['oid-c', mkCard('oid-c', 70003)],
    ]),
  }),
}));

function mkCard(oid: string, arenaId: number): any {
  return {
    oracleId: oid, name: oid, set: 'one', printings: ['one'],
    collectorNumber: '1', manaCost: null, cmc: 0,
    colors: [], colorIdentity: [], typeLine: 'Creature', types: ['Creature'],
    subtypes: [], supertypes: [], oracleText: '', keywords: [],
    power: null, toughness: null, rarity: 'common', imageUrl: '',
    printingDetails: [{ set: 'one', collectorNumber: '1', arenaId }],
    tags: [],
  };
}

function fileFrom(text: string) {
  return new File([text], 'Player.log', { type: 'text/plain' });
}

describe('MtgaImportPanel (full mode)', () => {
  beforeEach(() => {
    importLibrary.mockClear();
    importDeck.mockClear();
  });

  it('library-only path: imports library, no decks', async () => {
    const onClose = vi.fn();
    render(<MtgaImportPanel mode="full" onClose={onClose} />);

    const fileInput = screen.getByLabelText(/Choose Player\.log/i);
    fireEvent.change(fileInput, { target: { files: [fileFrom(healthy)] } });

    await waitFor(() => expect(screen.getByText(/Imported.*cards/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Import library/i }));

    await waitFor(() => expect(importLibrary).toHaveBeenCalledTimes(1));
    expect(importDeck).not.toHaveBeenCalled();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('library + decks path: opt-in checkbox → checklist → imports selected decks', async () => {
    const onClose = vi.fn();
    render(<MtgaImportPanel mode="full" onClose={onClose} />);

    fireEvent.change(screen.getByLabelText(/Choose Player\.log/i), {
      target: { files: [fileFrom(healthy)] },
    });
    await waitFor(() => screen.getByText(/Imported.*cards/i));

    fireEvent.click(screen.getByLabelText(/Also import my MTGA decks/i));
    await waitFor(() => screen.getByText('Mono-Red Aggro'));
    // Two decks parsed; pre-checked by default? Spec says checkbox per row,
    // not pre-checked. User selects Mono-Red.
    fireEvent.click(screen.getByLabelText('Mono-Red Aggro'));
    fireEvent.click(screen.getByRole('button', { name: /Import library \+ 1 deck/i }));

    await waitFor(() => expect(importLibrary).toHaveBeenCalled());
    expect(importDeck).toHaveBeenCalledTimes(1);
    expect(importDeck.mock.calls[0]![0]).toBe('Mono-Red Aggro');
  });

  it('shows an error when the file contains neither event', async () => {
    render(<MtgaImportPanel mode="full" onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText(/Choose Player\.log/i), {
      target: { files: [new File(['[Authenticate] hello\n'], 'Player.log')] },
    });
    await waitFor(() =>
      expect(screen.getByText(/Neither a collection snapshot nor decks/i)).toBeInTheDocument(),
    );
  });
});
```

- [ ] **Step 2: Run, verify failure**

```
cd app && npm test -- MtgaImportPanel
```

Expected: module-not-found.

- [ ] **Step 3: Implement**

```tsx
// app/src/components/MtgaImportPanel.tsx
import { useState } from 'react';
import { useGraphStore } from '../stores/graphStore';
import { useLibraryStore } from '../stores/libraryStore';
import { useDeckStore } from '../stores/deckStore';
import { parseMtgaLogFile } from '../lib/mtgaLogParser';
import {
  resolveMtgaCollection, resolveMtgaDecks,
  type MtgaCollectionSummary, type ParsedMtgaDeck,
} from '../lib/mtgaResolve';
import type { LibraryImportResult } from '../lib/libraryImport';
import LibraryImportSummary from './LibraryImportSummary';
import MtgaDeckChecklist from './MtgaDeckChecklist';

type Props = {
  mode: 'full' | 'decks-only';
  onClose: () => void;
};

type ParseState =
  | { kind: 'idle' }
  | { kind: 'parsing'; bytes: number; total: number }
  | { kind: 'ready';
      libraryResult: LibraryImportResult | null;
      mtgaSummary: MtgaCollectionSummary | null;
      decks: ParsedMtgaDeck[] | null;
      filename: string;
    }
  | { kind: 'error'; message: string };

export default function MtgaImportPanel({ mode, onClose }: Props) {
  const cards = useGraphStore((s) => s.cards);
  const importLibrary = useLibraryStore((s) => s.importLibrary);
  const ownedFromStore = useLibraryStore((s) => s.owned);
  const importDeck = useDeckStore((s) => s.importDeck);

  const [state, setState] = useState<ParseState>({ kind: 'idle' });
  const [decksOptIn, setDecksOptIn] = useState(false);
  const [crossSectionOptIn, setCrossSectionOptIn] = useState(false);
  const [selectedDeckIds, setSelectedDeckIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    setState({ kind: 'parsing', bytes: 0, total: file.size });
    try {
      const contents = await parseMtgaLogFile(file, (bytes, total) => {
        setState({ kind: 'parsing', bytes, total });
      });
      const hasCollection = contents.collection !== null;
      const hasDecks = contents.decks !== null;

      if (!hasCollection && !hasDecks) {
        setState({
          kind: 'error',
          message:
            "Neither a collection snapshot nor decks were found in this log. " +
            "Try Player-prev.log if it exists in the same folder.",
        });
        return;
      }
      if (mode === 'full' && !hasCollection) {
        setState({
          kind: 'error',
          message:
            "We couldn't find a collection snapshot in this log. " +
            "Open MTGA, click the Collection tab, then re-export Player.log.",
        });
        return;
      }
      if (mode === 'decks-only' && !hasDecks) {
        setState({
          kind: 'error',
          message:
            "We couldn't find any decks in this log. " +
            "Open MTGA's deck builder, then re-export Player.log.",
        });
        return;
      }

      const libraryBundle = hasCollection
        ? resolveMtgaCollection(contents.collection!, cards)
        : null;
      const decks = hasDecks ? resolveMtgaDecks(contents.decks!, cards) : null;

      setState({
        kind: 'ready',
        libraryResult: libraryBundle?.result ?? null,
        mtgaSummary: libraryBundle?.mtgaSummary ?? null,
        decks,
        filename: file.name,
      });
    } catch (e) {
      setState({ kind: 'error', message: (e as Error).message });
    }
  };

  const handleConfirm = async () => {
    if (state.kind !== 'ready') return;
    setBusy(true);
    try {
      const wantsCollection =
        mode === 'full'
          ? state.libraryResult !== null
          : state.libraryResult !== null && crossSectionOptIn;

      if (wantsCollection && state.libraryResult) {
        await importLibrary(state.libraryResult, state.filename);
      }

      const wantsDecks = mode === 'decks-only' || (mode === 'full' && decksOptIn);
      if (wantsDecks && state.decks) {
        const byId = new Map(state.decks.map((d) => [d.mtgaId, d]));
        for (const id of selectedDeckIds) {
          const d = byId.get(id);
          if (!d) continue;
          const resolved = d.mainboard.map((e) => ({
            oracleId: e.oracleId, count: e.count, name: '',
          }));
          const side = d.sideboard.map((e) => ({
            oracleId: e.oracleId, count: e.count, name: '',
          }));
          await importDeck(d.mtgaName, resolved, side);
        }
      }
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const confirmLabel = computeConfirmLabel(state, mode, decksOptIn, crossSectionOptIn, selectedDeckIds.size);
  const confirmDisabled = state.kind !== 'ready' || busy || (
    mode === 'decks-only' && selectedDeckIds.size === 0 && !crossSectionOptIn
  );

  return (
    <div>
      <p className="text-xs text-vellum-dim">
        Pick your Arena <code className="text-vellum-mute">Player.log</code>.
      </p>
      <p className="mt-1 text-xs text-vellum-dim">
        Windows: <code>%APPDATA%\..\LocalLow\Wizards Of The Coast\MTGA\Player.log</code><br />
        macOS: <code>~/Library/Logs/Wizards Of The Coast/MTGA/Player.log</code>
      </p>
      <p className="mt-1 text-xs text-vellum-dim">
        The file can be large (50–500 MB); parsing happens locally — nothing is uploaded.
      </p>

      <label className="focus-brass mt-3 inline-flex cursor-pointer items-center rounded border border-ink-line-2 bg-ink-raised px-3 py-1.5 text-sm text-vellum-mute transition-colors hover:border-brass/40 hover:text-brass-hi">
        Choose Player.log
        <input
          type="file"
          accept=".log,text/plain"
          className="hidden"
          aria-label="Choose Player.log"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
      </label>

      {state.kind === 'parsing' && (
        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded bg-ink-raised">
            <div
              className="h-full bg-brass transition-all"
              style={{ width: `${state.total === 0 ? 0 : (state.bytes / state.total) * 100}%` }}
              role="progressbar"
              aria-valuenow={state.bytes}
              aria-valuemax={state.total}
            />
          </div>
          <p className="mt-1 text-xs text-vellum-dim tabular">
            {`${(state.bytes / 1e6).toFixed(1)} / ${(state.total / 1e6).toFixed(1)} MB`}
          </p>
        </div>
      )}

      {state.kind === 'error' && (
        <p className="mt-3 rounded border border-mana-r/40 bg-mana-r/10 px-3 py-2 text-xs text-mana-r">
          {state.message}
        </p>
      )}

      {state.kind === 'ready' && (
        <div className="mt-4 space-y-4">
          {mode === 'full' && state.libraryResult && state.mtgaSummary && (
            <LibraryImportSummary result={state.libraryResult} mtgaSummary={state.mtgaSummary} />
          )}

          {mode === 'full' && state.decks && state.decks.length > 0 && (
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-vellum-mute">
              <input
                type="checkbox"
                checked={decksOptIn}
                onChange={(e) => {
                  setDecksOptIn(e.target.checked);
                  if (!e.target.checked) setSelectedDeckIds(new Set());
                }}
                aria-label="Also import my MTGA decks"
              />
              Also import my MTGA decks ({state.decks.length} available)
            </label>
          )}

          {mode === 'decks-only' && state.libraryResult && !ownedFromStore && (
            <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-ink-line bg-ink-raised px-3 py-2 text-sm text-vellum-mute">
              <input
                type="checkbox"
                checked={crossSectionOptIn}
                onChange={(e) => setCrossSectionOptIn(e.target.checked)}
                aria-label="Also import the collection snapshot in this log"
              />
              This log also contains your collection. Import it too?
            </label>
          )}

          {((mode === 'full' && decksOptIn) || mode === 'decks-only') && state.decks && (
            <MtgaDeckChecklist
              decks={state.decks}
              selected={selectedDeckIds}
              onChange={setSelectedDeckIds}
            />
          )}
        </div>
      )}

      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="focus-brass rounded border border-ink-line-2 bg-ink-raised px-3.5 py-1.5 text-sm text-vellum-mute transition-colors hover:border-brass/40 hover:text-brass-hi"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={confirmDisabled}
          className="focus-brass rounded bg-brass px-3.5 py-1.5 text-sm font-semibold text-ink-bg transition-colors hover:bg-brass-hi disabled:cursor-not-allowed disabled:bg-ink-raised disabled:text-vellum-dim"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}

function computeConfirmLabel(
  state: ParseState,
  mode: 'full' | 'decks-only',
  decksOptIn: boolean,
  crossSectionOptIn: boolean,
  selectedCount: number,
): string {
  if (state.kind !== 'ready') return mode === 'decks-only' ? 'Import decks' : 'Import library';
  if (mode === 'full') {
    if (decksOptIn && selectedCount > 0) {
      return selectedCount === 1
        ? 'Import library + 1 deck'
        : `Import library + ${selectedCount} decks`;
    }
    return 'Import library';
  }
  // decks-only
  const parts: string[] = [];
  if (crossSectionOptIn) parts.push('library');
  if (selectedCount > 0) parts.push(selectedCount === 1 ? '1 deck' : `${selectedCount} decks`);
  if (parts.length === 0) return 'Import';
  return `Import ${parts.join(' + ')}`;
}
```

- [ ] **Step 4: Run, verify pass**

```
cd app && npm test -- MtgaImportPanel
```

Expected: 3/3 pass.

- [ ] **Step 5: Commit**

```
git add app/src/components/MtgaImportPanel.tsx app/src/components/MtgaImportPanel.test.tsx
git commit -m "app: MtgaImportPanel (full mode + decks-only mode scaffolding)"
```

---

## Task 10 — `MtgaImportPanel` decks-only mode test coverage

Adds the remaining test cases for decks-only mode and the cross-section banner. Implementation already covers the behavior; we're just locking it in.

**Files:**
- Modify: `app/src/components/MtgaImportPanel.test.tsx`

- [ ] **Step 1: Write the failing tests**

Append to `MtgaImportPanel.test.tsx`:

```tsx
describe('MtgaImportPanel (decks-only mode)', () => {
  beforeEach(() => {
    importLibrary.mockClear();
    importDeck.mockClear();
  });

  it('decks-only path: shows checklist, imports selected decks, does NOT import library', async () => {
    const onClose = vi.fn();
    render(<MtgaImportPanel mode="decks-only" onClose={onClose} />);
    fireEvent.change(screen.getByLabelText(/Choose Player\.log/i), {
      target: { files: [fileFrom(healthy)] },
    });
    await waitFor(() => screen.getByText('Mono-Red Aggro'));

    fireEvent.click(screen.getByLabelText('Mono-Red Aggro'));
    fireEvent.click(screen.getByRole('button', { name: /Import 1 deck/i }));

    await waitFor(() => expect(importDeck).toHaveBeenCalledTimes(1));
    expect(importLibrary).not.toHaveBeenCalled();
  });

  it('cross-section banner: opting in also calls importLibrary', async () => {
    render(<MtgaImportPanel mode="decks-only" onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Choose Player\.log/i), {
      target: { files: [fileFrom(healthy)] },
    });
    await waitFor(() => screen.getByText('Mono-Red Aggro'));

    fireEvent.click(screen.getByLabelText(/also contains your collection/i));
    fireEvent.click(screen.getByLabelText('Mono-Red Aggro'));
    fireEvent.click(screen.getByRole('button', { name: /Import library \+ 1 deck/i }));

    await waitFor(() => expect(importLibrary).toHaveBeenCalled());
    expect(importDeck).toHaveBeenCalledTimes(1);
  });
});
```

The default mocked library store currently returns `owned: undefined` for `ownedFromStore`. That is "no library imported," which triggers the banner. Good.

- [ ] **Step 2: Run, verify pass**

```
cd app && npm test -- MtgaImportPanel
```

Expected: 5/5 pass.

- [ ] **Step 3: Commit**

```
git add app/src/components/MtgaImportPanel.test.tsx
git commit -m "app: cover MtgaImportPanel decks-only mode + cross-section banner"
```

---

## Task 11 — `ImportLibraryModal` becomes tabbed (Manabox | MTG Arena)

The existing modal grows a two-tab header. The Manabox path stays in the old tab body; the MTGA path mounts `MtgaImportPanel` in `full` mode.

**Files:**
- Modify: `app/src/components/ImportLibraryModal.tsx`

- [ ] **Step 1: Read the current file**

```
cat app/src/components/ImportLibraryModal.tsx | head -50
```

(Already reviewed in spec phase; keep the modal shell, factor the Manabox body into a private `ManaboxTab` function inside the file.)

- [ ] **Step 2: Write the failing test**

Create `app/src/components/ImportLibraryModal.test.tsx`:

```tsx
// app/src/components/ImportLibraryModal.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ImportLibraryModal from './ImportLibraryModal';

vi.mock('../stores/graphStore', () => ({
  useGraphStore: (sel: any) => sel({ cards: new Map() }),
}));
vi.mock('../stores/libraryStore', () => ({
  useLibraryStore: (sel: any) => sel({ importLibrary: vi.fn(), owned: null }),
}));
vi.mock('../stores/deckStore', () => ({
  useDeckStore: (sel: any) => sel({ importDeck: vi.fn() }),
}));

describe('ImportLibraryModal', () => {
  it('renders both tab headers and defaults to Manabox', () => {
    render(<ImportLibraryModal onClose={() => {}} />);
    expect(screen.getByRole('tab', { name: /Manabox CSV/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /MTG Arena/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Choose Manabox CSV/i)).toBeInTheDocument();
  });

  it('switches to the MTG Arena tab when clicked', () => {
    render(<ImportLibraryModal onClose={() => {}} />);
    fireEvent.click(screen.getByRole('tab', { name: /MTG Arena/i }));
    expect(screen.getByLabelText(/Choose Player\.log/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Choose Manabox CSV/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run, verify failure**

```
cd app && npm test -- ImportLibraryModal
```

Expected: failures about tabs.

- [ ] **Step 4: Refactor `ImportLibraryModal.tsx` to be tabbed**

Replace the file with:

```tsx
import { useState } from 'react';
import { STANDARD_SET_CODES } from '@shared/sets';
import { useGraphStore } from '../stores/graphStore';
import { useLibraryStore } from '../stores/libraryStore';
import { parseManaboxCsv, resolveLibrary, type LibraryImportResult } from '../lib/libraryImport';
import LibraryImportSummary from './LibraryImportSummary';
import MtgaImportPanel from './MtgaImportPanel';

type Props = { onClose: () => void };
type Tab = 'manabox' | 'mtga';

const KNOWN_SET_CODES = new Set(STANDARD_SET_CODES.map((c) => c.toLowerCase()));

export default function ImportLibraryModal({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>('manabox');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-bg/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[40rem] max-w-[92vw] overflow-hidden rounded-lg border border-ink-line-2 bg-ink-panel shadow-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-library-title"
      >
        <div className="brass-hairline" />
        <div className="p-6">
          <h3 id="import-library-title" className="font-head text-2xl text-vellum">
            Import library
          </h3>

          <div role="tablist" className="mt-3 flex gap-1 border-b border-ink-line">
            <TabButton active={tab === 'manabox'} onClick={() => setTab('manabox')}>
              Manabox CSV
            </TabButton>
            <TabButton active={tab === 'mtga'} onClick={() => setTab('mtga')}>
              MTG Arena
            </TabButton>
          </div>

          <div className="mt-4">
            {tab === 'manabox' && <ManaboxTab onClose={onClose} />}
            {tab === 'mtga' && <MtgaImportPanel mode="full" onClose={onClose} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        'focus-brass rounded-t px-3 py-1.5 text-sm transition-colors',
        active
          ? 'border-x border-t border-ink-line bg-ink-panel text-brass-hi'
          : 'text-vellum-mute hover:text-brass-hi',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function ManaboxTab({ onClose }: { onClose: () => void }) {
  const cards = useGraphStore((s) => s.cards);
  const importLibrary = useLibraryStore((s) => s.importLibrary);
  const [result, setResult] = useState<LibraryImportResult | null>(null);
  const [filename, setFilename] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const readFileText = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Couldn't read file."));
      reader.readAsText(file);
    });

  const handleFile = async (file: File) => {
    setError(null); setResult(null); setFilename(file.name);
    try {
      const text = await readFileText(file);
      const parsed = parseManaboxCsv(text);
      setResult(resolveLibrary(parsed, cards, KNOWN_SET_CODES));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleUse = async () => {
    if (!result || result.owned.size === 0) return;
    setBusy(true);
    await importLibrary(result, filename);
    setBusy(false);
    onClose();
  };

  return (
    <div>
      <p className="text-xs text-vellum-dim">
        Pick a Manabox CSV backup. We'll only show cards that are in both your library and our graph.
      </p>

      <label className="focus-brass mt-4 inline-flex cursor-pointer items-center rounded border border-ink-line-2 bg-ink-raised px-3 py-1.5 text-sm text-vellum-mute transition-colors hover:border-brass/40 hover:text-brass-hi">
        Choose Manabox CSV
        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
          aria-label="Choose Manabox CSV"
        />
      </label>
      {filename && (
        <span className="ml-2 font-mono text-xs text-vellum-dim">{filename}</span>
      )}

      {error && (
        <p className="mt-3 rounded border border-mana-r/40 bg-mana-r/10 px-3 py-2 text-xs text-mana-r">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-4">
          <LibraryImportSummary result={result} />
          {result.owned.size === 0 && (
            <p className="mt-3 text-xs text-brass-hi">
              No matching cards found. Pick a different file.
            </p>
          )}
        </div>
      )}

      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          className="focus-brass rounded border border-ink-line-2 bg-ink-raised px-3.5 py-1.5 text-sm text-vellum-mute transition-colors hover:border-brass/40 hover:text-brass-hi"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="button"
          className="focus-brass rounded bg-brass px-3.5 py-1.5 text-sm font-semibold text-ink-bg transition-colors hover:bg-brass-hi disabled:cursor-not-allowed disabled:bg-ink-raised disabled:text-vellum-dim"
          onClick={handleUse}
          disabled={!result || result.owned.size === 0 || busy}
        >
          Use this library
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run, verify pass**

```
cd app && npm test -- ImportLibraryModal
```

Expected: 2/2 pass.

- [ ] **Step 6: Commit**

```
git add app/src/components/ImportLibraryModal.tsx app/src/components/ImportLibraryModal.test.tsx
git commit -m "app: tabbed library import modal (Manabox | MTG Arena)"
```

---

## Task 12 — Decks page entry point: `MtgaImportModal` shell + button

A thin modal that wraps `MtgaImportPanel` in `decks-only` mode. Mounted from a new button on the Decks page.

**Files:**
- Create: `app/src/components/MtgaImportModal.tsx`
- Modify: `app/src/pages/DecksPage.tsx`

- [ ] **Step 1: Create the modal shell**

```tsx
// app/src/components/MtgaImportModal.tsx
import MtgaImportPanel from './MtgaImportPanel';

type Props = { onClose: () => void };

export default function MtgaImportModal({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-bg/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[40rem] max-w-[92vw] overflow-hidden rounded-lg border border-ink-line-2 bg-ink-panel shadow-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mtga-import-title"
      >
        <div className="brass-hairline" />
        <div className="p-6">
          <h3 id="mtga-import-title" className="font-head text-2xl text-vellum">
            Import MTGA decks
          </h3>
          <div className="mt-3">
            <MtgaImportPanel mode="decks-only" onClose={onClose} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Read DecksPage.tsx to find the existing toolbar location**

```
grep -n "Import\|button\|<h" app/src/pages/DecksPage.tsx | head -30
```

Locate the existing "Import deck" or similar action area. We add a sibling button.

- [ ] **Step 3: Wire the button**

Add to `DecksPage.tsx` near other deck-action buttons:

```tsx
import MtgaImportModal from '../components/MtgaImportModal';

// inside the component, alongside other useState calls:
const [mtgaModalOpen, setMtgaModalOpen] = useState(false);

// in the JSX, alongside other toolbar buttons:
<button
  type="button"
  onClick={() => setMtgaModalOpen(true)}
  className="focus-brass rounded border border-ink-line-2 bg-ink-raised px-3 py-1.5 text-sm text-vellum-mute transition-colors hover:border-brass/40 hover:text-brass-hi"
>
  Import MTGA decks
</button>

{mtgaModalOpen && <MtgaImportModal onClose={() => setMtgaModalOpen(false)} />}
```

(Exact placement depends on the existing JSX shape — match the visual rhythm of nearby buttons.)

- [ ] **Step 4: Verify the app builds**

```
cd app && npm run build
```

Expected: tsc + vite build both pass.

- [ ] **Step 5: Manual smoke test**

```
cd app && npm run dev
```

Visit `http://localhost:5173/decks`. Confirm:
- "Import MTGA decks" button appears in the toolbar.
- Clicking it opens the modal.
- ESC / outside-click / Cancel closes it.
- Uploading a real `Player.log` (or one of the fixture files) shows the checklist.

If you don't have access to a Player.log, use `app/tests/fixtures/mtga/healthy.log` as a hand-uploaded smoke test fixture.

- [ ] **Step 6: Commit**

```
git add app/src/components/MtgaImportModal.tsx app/src/pages/DecksPage.tsx
git commit -m "app: Decks page 'Import MTGA decks' entry point"
```

---

## Task 13 — E2E smoke test

**Files:**
- Create: `app/tests/e2e/mtga-import.spec.ts`

- [ ] **Step 1: Look at an existing e2e for the upload-file pattern**

```
ls app/tests/e2e
grep -rn "setInputFiles\|input\[type=.file" app/tests/e2e 2>/dev/null | head
```

If the library-import e2e exists, mimic its file-upload pattern. Otherwise use Playwright's standard `setInputFiles(path)`.

- [ ] **Step 2: Write the e2e**

```ts
// app/tests/e2e/mtga-import.spec.ts
import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HEALTHY_LOG = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'fixtures',
  'mtga',
  'healthy.log',
);

test('MTGA import: library + opt-in deck', async ({ page }) => {
  await page.goto('/');

  // Open library import modal (selector depends on existing nav copy)
  await page.getByRole('button', { name: /Import library/i }).click();

  // Switch to MTGA tab
  await page.getByRole('tab', { name: /MTG Arena/i }).click();

  // Upload the fixture log
  await page.getByLabel(/Choose Player\.log/i).setInputFiles(HEALTHY_LOG);

  // Wait for the summary to land
  await expect(page.getByText(/Imported.*cards/i)).toBeVisible();

  // Opt into decks
  await page.getByLabel(/Also import my MTGA decks/i).check();

  // Pick the Standard deck
  await page.getByLabel('Mono-Red Aggro').check();

  // Confirm
  await page.getByRole('button', { name: /Import library \+ 1 deck/i }).click();

  // Modal closes; library badge updates; deck appears in the side panel
  await expect(page.getByText('Mono-Red Aggro')).toBeVisible({ timeout: 5000 });
});
```

- [ ] **Step 3: Run the e2e**

```
cd app && npm run e2e -- mtga-import
```

Expected: pass. If selectors don't match, adjust to match the actual nav copy (e.g., the library button may be an icon button — use `getByLabel` instead).

- [ ] **Step 4: Commit**

```
git add app/tests/e2e/mtga-import.spec.ts
git commit -m "app: e2e smoke for MTGA import (Browser-page entry)"
```

---

## Task 14 — Final verification

- [ ] **Step 1: Full gate**

```
npm test
```

Expected: pipeline tests + app vitest + `app/npm run build` all green.

- [ ] **Step 2: Manual exercise of both entry points**

```
cd app && npm run dev
```

- Browser page → Import library → MTG Arena tab → upload fixture → library only path → confirm closes modal.
- Browser page → Import library → MTG Arena tab → upload fixture → opt into decks → select one → confirm imports both.
- Decks page → Import MTGA decks → upload fixture → checklist visible → select one → confirm imports deck without touching library.
- Decks page → Import MTGA decks (when no library yet imported) → upload fixture → cross-section banner visible → opt in → confirm imports both.

- [ ] **Step 3: Tag a release**

If everything passes and the user agrees, bump `package.json` version and tag (the project pattern is `vX.Y.Z` per the CLAUDE.md). Out of scope for this plan — the user typically tags after final review.

---

## Self-review checklist (record outcome)

Run this once before handing off:

- **Spec coverage** — every section of the design spec has a corresponding task:
  - Pipeline `arena_id` plumbing → Task 1 ✓
  - Streamed log parser → Tasks 3 + 4 ✓
  - Collection resolver + `MtgaCollectionSummary` → Task 5 ✓
  - Deck resolver → Task 6 ✓
  - `LibraryImportSummary.mtgaSummary` prop → Task 7 ✓
  - `MtgaDeckChecklist` → Task 8 ✓
  - `MtgaImportPanel` (both modes + cross-section banner) → Tasks 9 + 10 ✓
  - Tabbed `ImportLibraryModal` → Task 11 ✓
  - Decks-page entry → Task 12 ✓
  - E2E → Task 13 ✓
  - `RULE_VERSION` bump → Task 1 (Step 6) ✓
- **Placeholders** — none.
- **Type consistency** — `ArenaIdEntry`, `MtgaCollectionSummary`, `ParsedMtgaDeck`, `MtgaRawDeck`, `MtgaLogContents`, `ProgressCallback` are defined once and used consistently across tasks. `OwnedPrinting` (from `db.ts`) is what `ownedDetail` Map values point to — verified against existing `libraryImport.ts`.
