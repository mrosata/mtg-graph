# Manabox library import — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Manabox CSV library-import feature per `docs/superpowers/specs/2026-05-30-manabox-library-import-design.md`. The user uploads their Manabox CSV; the app persists the library, restricts the visible card pool to the intersection of the graph and the library (toggleable), and surfaces owned-count badges + over-N warnings in the deck editor.

**Architecture:** Library lives in Dexie as a singleton; `libraryStore` (Zustand) holds the in-memory copy and the toggle. The library is an **overlay** on `graphStore` — `graphStore.cards` stays full, and call sites compose a `libraryFilter` Set with the existing filter pipeline. Per-card owned counts and missing-card warnings render in the deck editor independently of the toggle.

**Tech Stack:** TypeScript, React, Vite, Zustand, Dexie (IndexedDB), Vitest + React Testing Library, Playwright. The repo's existing conventions apply: TDD for pure logic, RTL for headline components, `noUncheckedIndexedAccess: true`, fixture-based unit tests.

---

## File map

**New (pure logic):**
- `app/src/lib/basics.ts` — `isBasicLand(card)` + the `BASIC_LAND_NAMES` set
- `app/src/lib/cardNameIndex.ts` — extracted shared lookup used by both importers
- `app/src/lib/libraryImport.ts` — `parseManaboxCsv` + `resolveLibrary` (pure)

**New (state):**
- `app/src/stores/libraryStore.ts` — Zustand store backed by Dexie

**New (UI):**
- `app/src/components/OwnedBadge.tsx`
- `app/src/components/NotInLibraryBadge.tsx`
- `app/src/components/LibraryStatusBadge.tsx`
- `app/src/components/LibraryImportSummary.tsx`
- `app/src/components/ImportLibraryModal.tsx`
- `app/src/components/LibrarySection.tsx`

**New (fixtures/e2e):**
- `app/tests/fixtures/manabox-sample.csv`
- `app/tests/e2e/library-import.spec.ts`

**Modified:**
- `app/src/lib/deckImport.ts` — refactor to use `cardNameIndex`
- `app/src/lib/db.ts` — Dexie v3 (add `library`, `prefs` tables)
- `app/src/lib/db.migration.test.ts` — v2 → v3 migration case
- `app/src/lib/filter.ts` — `applyFilter` gains an optional 2nd `libraryFilter` Set arg
- `app/src/lib/filter.test.ts` — `libraryFilter` cases
- `app/src/components/FilterPanel.tsx` — mount `LibrarySection`; thread `libraryFilter` into `applyFilter`
- `app/src/components/CardGrid.tsx` — render `OwnedBadge`
- `app/src/components/DeckPanel.tsx` — owned counts, missing summary, owned/not-in-library badges, (N+1)-warning toast
- `app/src/components/InteractionsPanel.tsx` — hide edges where either endpoint isn't in `owned` when library is enabled
- `app/src/pages/DeckGraphPage.tsx` — same edge filter
- `app/src/App.tsx` — mount `LibraryStatusBadge` in the top nav; hydrate `libraryStore` at startup

---

## Task 1 — `lib/basics.ts`

**Files:**
- Create: `app/src/lib/basics.ts`
- Test: `app/src/lib/basics.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// app/src/lib/basics.test.ts
import { describe, it, expect } from 'vitest';
import type { Card } from '@shared/types';
import { isBasicLand, BASIC_LAND_NAMES } from './basics';

function card(name: string, typeLine: string): Card {
  return {
    oracleId: 'x', name, set: 'tst', printings: ['tst'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [],
    typeLine, types: [], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null,
    rarity: 'common', imageUrl: '', tags: [],
  };
}

describe('isBasicLand', () => {
  it('returns true for each of the five basics + Wastes', () => {
    for (const name of BASIC_LAND_NAMES) {
      expect(isBasicLand(card(name, 'Basic Land — ' + name))).toBe(true);
    }
  });

  it('returns true for snow basics (typeLine has "Basic Land")', () => {
    expect(isBasicLand(card('Snow-Covered Mountain', 'Basic Snow Land — Mountain'))).toBe(true);
  });

  it('returns false for a non-basic land', () => {
    expect(isBasicLand(card('Cavern of Souls', 'Land'))).toBe(false);
  });

  it('returns false for a creature named like a basic', () => {
    // Hypothetical token like "Mountain Giant" — name match alone must not trigger.
    expect(isBasicLand(card('Mountain Giant', 'Creature — Giant'))).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run src/lib/basics.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

```ts
// app/src/lib/basics.ts
import type { Card } from '@shared/types';

export const BASIC_LAND_NAMES: ReadonlySet<string> = new Set([
  'Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes',
]);

export function isBasicLand(card: Card): boolean {
  return card.typeLine.includes('Basic Land') || card.typeLine.includes('Basic Snow Land');
}
```

Note: we key the check off `typeLine` (not name) so a creature named "Mountain Giant" doesn't trigger. `BASIC_LAND_NAMES` is exported for callers that want to enumerate them (e.g., warnings UI).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npx vitest run src/lib/basics.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/basics.ts app/src/lib/basics.test.ts
git commit -m "feat(app): add isBasicLand helper for library-import quantity logic"
```

---

## Task 2 — `lib/cardNameIndex.ts` + refactor `deckImport.ts`

**Files:**
- Create: `app/src/lib/cardNameIndex.ts`
- Test: `app/src/lib/cardNameIndex.test.ts`
- Modify: `app/src/lib/deckImport.ts:54-102` (replace inline lookup build with `buildCardNameLookup` / `lookupByName`)

- [ ] **Step 1: Write the failing test**

```ts
// app/src/lib/cardNameIndex.test.ts
import { describe, it, expect } from 'vitest';
import type { Card } from '@shared/types';
import { buildCardNameLookup, lookupByName } from './cardNameIndex';

function card(oracleId: string, name: string): Card {
  return {
    oracleId, name, set: 'tst', printings: ['tst'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [],
    typeLine: '', types: [], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null,
    rarity: 'common', imageUrl: '', tags: [],
  };
}

const FIXTURE = new Map<string, Card>([
  ['bolt-id', card('bolt-id', 'Lightning Bolt')],
  ['dfc-id',  card('dfc-id',  'Aquatic Alchemist // Bubble Up')],
]);

describe('buildCardNameLookup / lookupByName', () => {
  it('resolves an exact name case-insensitively', () => {
    const lk = buildCardNameLookup(FIXTURE);
    expect(lookupByName(lk, 'lightning bolt')).toEqual(
      { oracleId: 'bolt-id', canonicalName: 'Lightning Bolt' },
    );
  });

  it('resolves a DFC by front-face name', () => {
    const lk = buildCardNameLookup(FIXTURE);
    expect(lookupByName(lk, 'aquatic alchemist')).toEqual(
      { oracleId: 'dfc-id', canonicalName: 'Aquatic Alchemist // Bubble Up' },
    );
  });

  it('resolves a DFC by full "A // B" name', () => {
    const lk = buildCardNameLookup(FIXTURE);
    expect(lookupByName(lk, 'Aquatic Alchemist // Bubble Up')?.oracleId).toBe('dfc-id');
  });

  it('returns undefined for an unknown name', () => {
    const lk = buildCardNameLookup(FIXTURE);
    expect(lookupByName(lk, 'Tarmogoyf')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run src/lib/cardNameIndex.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the implementation**

```ts
// app/src/lib/cardNameIndex.ts
import type { Card } from '@shared/types';

export type NameLookupEntry = { oracleId: string; canonicalName: string };
export type CardNameLookup = {
  exact: Map<string, NameLookupEntry>;
  frontFace: Map<string, NameLookupEntry>;
};

const DFC_SEPARATOR = ' // ';

export function buildCardNameLookup(cards: Map<string, Card>): CardNameLookup {
  const exact = new Map<string, NameLookupEntry>();
  const frontFace = new Map<string, NameLookupEntry>();
  for (const card of cards.values()) {
    const lower = card.name.toLowerCase();
    exact.set(lower, { oracleId: card.oracleId, canonicalName: card.name });
    const sepIdx = card.name.indexOf(DFC_SEPARATOR);
    if (sepIdx !== -1) {
      const front = card.name.slice(0, sepIdx).toLowerCase();
      // First-write-wins; with zero name collisions in Standard this is defensive.
      if (!frontFace.has(front)) {
        frontFace.set(front, { oracleId: card.oracleId, canonicalName: card.name });
      }
    }
  }
  return { exact, frontFace };
}

export function lookupByName(lk: CardNameLookup, name: string): NameLookupEntry | undefined {
  const lower = name.toLowerCase();
  return lk.exact.get(lower) ?? lk.frontFace.get(lower);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npx vitest run src/lib/cardNameIndex.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Refactor `deckImport.ts` to use the new module**

Replace the body of `resolveImport` (`app/src/lib/deckImport.ts:65-102`) with:

```ts
// app/src/lib/deckImport.ts
import type { Card } from '@shared/types';
import { buildCardNameLookup, lookupByName } from './cardNameIndex';

// (parseArenaDeck and types unchanged above)

export type ResolvedEntry = { oracleId: string; count: number; name: string };

export type ImportResult = {
  resolved: ResolvedEntry[];
  unknown: ImportEntry[];
  sideboardCount: number;
  unparseableLines: string[];
};

export function resolveImport(parsed: ParsedDeck, cards: Map<string, Card>): ImportResult {
  const lookup = buildCardNameLookup(cards);

  const resolved: ResolvedEntry[] = [];
  const unknown: ImportEntry[] = [];
  for (const entry of parsed.entries) {
    const hit = lookupByName(lookup, entry.name);
    if (hit) {
      resolved.push({ oracleId: hit.oracleId, count: entry.count, name: hit.canonicalName });
    } else {
      unknown.push(entry);
    }
  }

  return {
    resolved,
    unknown,
    sideboardCount: parsed.sideboardCount,
    unparseableLines: parsed.unparseableLines,
  };
}
```

Remove the now-unused `DFC_SEPARATOR` constant from `deckImport.ts` if it's only referenced by the removed code.

- [ ] **Step 6: Verify existing deckImport tests still pass**

Run: `cd app && npx vitest run src/lib/deckImport.test.ts`
Expected: PASS (all existing cases — refactor is behavior-preserving).

- [ ] **Step 7: Commit**

```bash
git add app/src/lib/cardNameIndex.ts app/src/lib/cardNameIndex.test.ts app/src/lib/deckImport.ts
git commit -m "refactor(app): extract cardNameIndex for shared deck/library lookup"
```

---

## Task 3 — `lib/libraryImport.ts` (CSV parser)

**Files:**
- Create: `app/src/lib/libraryImport.ts` (parser only — resolver lands in Task 4)
- Test: `app/src/lib/libraryImport.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// app/src/lib/libraryImport.test.ts
import { describe, it, expect } from 'vitest';
import { parseManaboxCsv } from './libraryImport';

const HEADER = '"Name","Set code","Set name","Collector number","Foil","Rarity","Quantity"';

describe('parseManaboxCsv', () => {
  it('parses a basic CSV with required columns', () => {
    const csv = [
      HEADER,
      '"Lightning Bolt","dmu","Dominaria United","100","normal","common","4"',
      '"Sol Ring","cmd","Commander","1","normal","uncommon","1"',
    ].join('\n');

    const parsed = parseManaboxCsv(csv);

    expect(parsed.rows).toEqual([
      { name: 'Lightning Bolt', setCode: 'dmu', collectorNumber: '100', quantity: 4 },
      { name: 'Sol Ring',       setCode: 'cmd', collectorNumber: '1',   quantity: 1 },
    ]);
    expect(parsed.unparseableLines).toEqual([]);
  });

  it('handles quoted fields with embedded commas', () => {
    const csv = [
      HEADER,
      '"Borrowing 100,000 Arrows","chk","Champions of Kamigawa","100","normal","common","1"',
    ].join('\n');

    const parsed = parseManaboxCsv(csv);
    expect(parsed.rows[0]?.name).toBe('Borrowing 100,000 Arrows');
  });

  it('handles doubled-quote escaping inside quoted fields', () => {
    const csv = [
      HEADER,
      '"""Ach! Hans, Run!""","ugl","Unglued","1","normal","rare","1"',
    ].join('\n');

    const parsed = parseManaboxCsv(csv);
    expect(parsed.rows[0]?.name).toBe('"Ach! Hans, Run!"');
  });

  it('tolerates CRLF line endings', () => {
    const csv = [HEADER, '"Bolt","dmu","Dominaria","1","normal","common","2"'].join('\r\n');
    const parsed = parseManaboxCsv(csv);
    expect(parsed.rows[0]?.name).toBe('Bolt');
  });

  it('skips blank lines', () => {
    const csv = [HEADER, '', '"Bolt","dmu","Dominaria","1","normal","common","2"', ''].join('\n');
    const parsed = parseManaboxCsv(csv);
    expect(parsed.rows).toHaveLength(1);
  });

  it('locates columns by header name, not position (tolerates Manabox column reorder)', () => {
    const csv = [
      '"Quantity","Name","Set code","Foil","Collector number","Rarity"',
      '"3","Llanowar Elves","dmu","normal","100","common"',
    ].join('\n');
    const parsed = parseManaboxCsv(csv);
    expect(parsed.rows).toEqual([
      { name: 'Llanowar Elves', setCode: 'dmu', collectorNumber: '100', quantity: 3 },
    ]);
  });

  it('puts rows with non-numeric quantity into unparseableLines', () => {
    const csv = [
      HEADER,
      '"Lightning Bolt","dmu","Dominaria","100","normal","common","not-a-number"',
    ].join('\n');
    const parsed = parseManaboxCsv(csv);
    expect(parsed.rows).toEqual([]);
    expect(parsed.unparseableLines).toHaveLength(1);
  });

  it('puts rows with missing name into unparseableLines', () => {
    const csv = [
      HEADER,
      '"","dmu","Dominaria","100","normal","common","4"',
    ].join('\n');
    const parsed = parseManaboxCsv(csv);
    expect(parsed.rows).toEqual([]);
    expect(parsed.unparseableLines).toHaveLength(1);
  });

  it('throws when a required column is missing from the header', () => {
    const csv = [
      '"Name","Set code","Collector number"',  // no Quantity
      '"Bolt","dmu","100"',
    ].join('\n');
    expect(() => parseManaboxCsv(csv)).toThrow(/Quantity/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run src/lib/libraryImport.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the parser implementation**

```ts
// app/src/lib/libraryImport.ts
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

const REQUIRED_COLUMNS = ['Name', 'Set code', 'Collector number', 'Quantity'] as const;

// Minimal RFC-4180-ish CSV row splitter. Handles quoted fields, embedded commas,
// and doubled-quote escapes ("" -> ").
function splitCsvRow(row: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (row[i + 1] === '"') { cur += '"'; i++; }
        else { inQuotes = false; }
      } else {
        cur += ch;
      }
    } else {
      if (ch === ',') { out.push(cur); cur = ''; }
      else if (ch === '"') { inQuotes = true; }
      else { cur += ch; }
    }
  }
  out.push(cur);
  return out;
}

export function parseManaboxCsv(text: string): ParsedLibrary {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    throw new Error('Empty CSV (no header row).');
  }

  const headerCells = splitCsvRow(lines[0]!).map((c) => c.trim());
  const headerLower = headerCells.map((c) => c.toLowerCase());
  const colIdx = (label: string) => headerLower.indexOf(label.toLowerCase());

  for (const required of REQUIRED_COLUMNS) {
    if (colIdx(required) === -1) {
      throw new Error(
        `This doesn't look like a Manabox CSV. Missing required column: ${required}. ` +
        `Expected: ${REQUIRED_COLUMNS.join(', ')}.`,
      );
    }
  }

  const nameIdx = colIdx('Name');
  const setIdx  = colIdx('Set code');
  const collIdx = colIdx('Collector number');
  const qtyIdx  = colIdx('Quantity');

  const rows: ParsedLibraryRow[] = [];
  const unparseableLines: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!;
    const cells = splitCsvRow(line);
    const name = (cells[nameIdx] ?? '').trim();
    const setCode = (cells[setIdx] ?? '').trim();
    const collectorNumber = (cells[collIdx] ?? '').trim();
    const qtyRaw = (cells[qtyIdx] ?? '').trim();
    const qty = Number.parseInt(qtyRaw, 10);
    if (!name || !Number.isFinite(qty) || qty <= 0 || !/^\d+$/.test(qtyRaw)) {
      unparseableLines.push(line);
      continue;
    }
    rows.push({ name, setCode, collectorNumber, quantity: qty });
  }

  return { rows, unparseableLines };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npx vitest run src/lib/libraryImport.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/libraryImport.ts app/src/lib/libraryImport.test.ts
git commit -m "feat(app): add parseManaboxCsv for library import"
```

---

## Task 4 — `lib/libraryImport.ts` (resolver) + fixture CSV

**Files:**
- Modify: `app/src/lib/libraryImport.ts` (append `resolveLibrary` + types)
- Modify: `app/src/lib/libraryImport.test.ts` (append `resolveLibrary` describe block)
- Create: `app/tests/fixtures/manabox-sample.csv`

- [ ] **Step 1: Write the failing test (append to existing test file)**

```ts
// append to app/src/lib/libraryImport.test.ts
import { resolveLibrary } from './libraryImport';
import type { Card } from '@shared/types';

function makeCard(oracleId: string, name: string, typeLine = ''): Card {
  return {
    oracleId, name, set: 'dmu', printings: ['dmu'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [],
    typeLine, types: [], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null,
    rarity: 'common', imageUrl: '', tags: [],
  };
}

const FIXTURE_CARDS = new Map<string, Card>([
  ['bolt-id',  makeCard('bolt-id',  'Lightning Bolt')],
  ['llano-id', makeCard('llano-id', 'Llanowar Elves')],
  ['dfc-id',   makeCard('dfc-id',   'Aquatic Alchemist // Bubble Up')],
  ['mtn-id',   makeCard('mtn-id',   'Mountain', 'Basic Land — Mountain')],
]);

const KNOWN_SETS = new Set(['dmu', 'tdm', 'blb']);

describe('resolveLibrary', () => {
  it('resolves a row whose name and set are both known', () => {
    const parsed = { rows: [
      { name: 'Lightning Bolt', setCode: 'dmu', collectorNumber: '100', quantity: 4 },
    ], unparseableLines: [] };

    const r = resolveLibrary(parsed, FIXTURE_CARDS, KNOWN_SETS);

    expect(r.owned.get('bolt-id')).toBe(4);
    expect(r.unknownNames).toEqual([]);
    expect(r.unknownSets).toEqual([]);
  });

  it('credits ownership by name even when the set is not Standard', () => {
    const parsed = { rows: [
      { name: 'Lightning Bolt', setCode: 'mh3', collectorNumber: '50', quantity: 2 },
    ], unparseableLines: [] };

    const r = resolveLibrary(parsed, FIXTURE_CARDS, KNOWN_SETS);

    expect(r.owned.get('bolt-id')).toBe(2);
    expect(r.unknownSets).toEqual([]);
  });

  it('resolves a DFC by front-face name', () => {
    const parsed = { rows: [
      { name: 'Aquatic Alchemist', setCode: 'tdm', collectorNumber: '1', quantity: 1 },
    ], unparseableLines: [] };

    const r = resolveLibrary(parsed, FIXTURE_CARDS, KNOWN_SETS);
    expect(r.owned.get('dfc-id')).toBe(1);
  });

  it('sums quantities across multiple rows resolving to the same oracleId', () => {
    const parsed = { rows: [
      { name: 'Lightning Bolt', setCode: 'dmu', collectorNumber: '100', quantity: 3 },
      { name: 'Lightning Bolt', setCode: 'mh3', collectorNumber: '50',  quantity: 1 },
    ], unparseableLines: [] };

    const r = resolveLibrary(parsed, FIXTURE_CARDS, KNOWN_SETS);
    expect(r.owned.get('bolt-id')).toBe(4);
  });

  it('classifies "name miss + known set" as unknownNames', () => {
    const parsed = { rows: [
      { name: 'Frobulator', setCode: 'dmu', collectorNumber: '1', quantity: 1 },
    ], unparseableLines: [] };

    const r = resolveLibrary(parsed, FIXTURE_CARDS, KNOWN_SETS);
    expect(r.owned.size).toBe(0);
    expect(r.unknownNames).toEqual([{ name: 'Frobulator', setCode: 'dmu', quantity: 1 }]);
    expect(r.unknownSets).toEqual([]);
  });

  it('classifies "name miss + unknown set" as unknownSets', () => {
    const parsed = { rows: [
      { name: 'Tarmogoyf', setCode: 'mh3', collectorNumber: '1', quantity: 1 },
    ], unparseableLines: [] };

    const r = resolveLibrary(parsed, FIXTURE_CARDS, KNOWN_SETS);
    expect(r.owned.size).toBe(0);
    expect(r.unknownNames).toEqual([]);
    expect(r.unknownSets).toEqual([{ name: 'Tarmogoyf', setCode: 'mh3', quantity: 1 }]);
  });

  it('compares set codes case-insensitively', () => {
    const parsed = { rows: [
      { name: 'Notacard', setCode: 'DMU', collectorNumber: '1', quantity: 1 },
    ], unparseableLines: [] };

    const r = resolveLibrary(parsed, FIXTURE_CARDS, KNOWN_SETS);
    expect(r.unknownNames).toHaveLength(1);
    expect(r.unknownSets).toHaveLength(0);
  });

  it('passes unparseableLines straight through', () => {
    const parsed = { rows: [], unparseableLines: ['garbage'] };
    const r = resolveLibrary(parsed, FIXTURE_CARDS, KNOWN_SETS);
    expect(r.unparseableLines).toEqual(['garbage']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run src/lib/libraryImport.test.ts`
Expected: FAIL (`resolveLibrary` not exported).

- [ ] **Step 3: Add the resolver to `libraryImport.ts`**

Append to `app/src/lib/libraryImport.ts`:

```ts
import type { Card } from '@shared/types';
import { buildCardNameLookup, lookupByName } from './cardNameIndex';

export type ImportRowSummary = {
  name: string;
  setCode: string;
  quantity: number;
};

export type LibraryImportResult = {
  owned: Map<string, number>;
  unknownNames: ImportRowSummary[];
  unknownSets: ImportRowSummary[];
  unparseableLines: string[];
};

export function resolveLibrary(
  parsed: ParsedLibrary,
  cards: Map<string, Card>,
  knownSetCodes: ReadonlySet<string>,
): LibraryImportResult {
  const lookup = buildCardNameLookup(cards);
  const knownLower = new Set<string>();
  for (const c of knownSetCodes) knownLower.add(c.toLowerCase());

  const owned = new Map<string, number>();
  const unknownNames: ImportRowSummary[] = [];
  const unknownSets: ImportRowSummary[] = [];

  for (const row of parsed.rows) {
    const hit = lookupByName(lookup, row.name);
    if (hit) {
      owned.set(hit.oracleId, (owned.get(hit.oracleId) ?? 0) + row.quantity);
      continue;
    }
    const summary: ImportRowSummary = {
      name: row.name, setCode: row.setCode, quantity: row.quantity,
    };
    if (knownLower.has(row.setCode.toLowerCase())) {
      unknownNames.push(summary);
    } else {
      unknownSets.push(summary);
    }
  }

  return { owned, unknownNames, unknownSets, unparseableLines: parsed.unparseableLines };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npx vitest run src/lib/libraryImport.test.ts`
Expected: PASS (parser tests + 8 resolver tests).

- [ ] **Step 5: Create the e2e fixture CSV**

```csv
// app/tests/fixtures/manabox-sample.csv
"Name","Set code","Set name","Collector number","Foil","Rarity","Quantity"
"Lightning Bolt","dmu","Dominaria United","100","normal","common","4"
"Llanowar Elves","dmu","Dominaria United","168","normal","common","4"
"Mountain","dmu","Dominaria United","270","normal","common","20"
"Sol Ring","cmd","Commander","1","normal","uncommon","1"
"Tarmogoyf","mh3","Modern Horizons 3","150","normal","mythic","2"
"Frobulator","dmu","Dominaria United","999","normal","rare","1"
```

The first three rows resolve to in-Standard fixture oracleIds (use whatever set is in the live artifact at execution time — the resolver matches by name). `Sol Ring` and `Tarmogoyf` end up in `unknownSets`. `Frobulator` lands in `unknownNames` if `dmu` is in the live set list.

- [ ] **Step 6: Commit**

```bash
git add app/src/lib/libraryImport.ts app/src/lib/libraryImport.test.ts app/tests/fixtures/manabox-sample.csv
git commit -m "feat(app): add resolveLibrary + fixture CSV for library import"
```

---

## Task 5 — Dexie v3 (library + prefs tables)

**Files:**
- Modify: `app/src/lib/db.ts:23-50` (bump to v3, add `library` and `prefs` tables + types)
- Modify: `app/src/lib/db.migration.test.ts` (append v2 → v3 case)

- [ ] **Step 1: Write the failing migration test (append to existing file)**

First, read `app/src/lib/db.migration.test.ts` to see the existing test pattern (it tests v1 → v2). Add a new `describe('v2 -> v3 migration', ...)` block at the bottom:

```ts
// append to app/src/lib/db.migration.test.ts
import Dexie from 'dexie';

describe('v2 -> v3 migration', () => {
  it('adds library and prefs tables, preserves existing decks', async () => {
    const dbName = `mig-v2-to-v3-${Date.now()}`;

    // Seed a v2 database with one deck (mirrors v2 schema from db.ts).
    const v2 = new Dexie(dbName);
    v2.version(1).stores({ decks: 'id, name, updatedAt', artifactCache: '&ruleVersion' });
    v2.version(2).stores({ decks: 'id, name, updatedAt', artifactCache: '&ruleVersion' });
    await v2.open();
    await v2.table('decks').put({
      id: 'd1', name: 'Pre-migration', originalCards: [], workingCards: [],
      createdAt: Date.now(), updatedAt: Date.now(),
    });
    v2.close();

    // Open with the current (v3) schema.
    const { makeMtgDb } = await import('./db');
    const v3 = makeMtgDb(dbName);
    await v3.open();

    const decks = await v3.decks.toArray();
    expect(decks).toHaveLength(1);
    expect(decks[0]?.name).toBe('Pre-migration');

    expect(await v3.library.count()).toBe(0);
    expect(await v3.prefs.count()).toBe(0);

    v3.close();
    await Dexie.delete(dbName);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run src/lib/db.migration.test.ts`
Expected: FAIL (`library` / `prefs` not on `MtgDb`).

- [ ] **Step 3: Update `app/src/lib/db.ts`**

Edit the imports, types, class fields, and constructor:

```ts
// app/src/lib/db.ts (near the top, after existing type imports)
import type { ImportRowSummary } from './libraryImport';

export type LibraryRow = {
  id: 'main';
  importedAt: number;
  sourceFilename: string;
  owned: Record<string, number>;
  unknownNames: ImportRowSummary[];
  unknownSets: ImportRowSummary[];
  unparseableLines: string[];
};

export type PrefsRow = {
  id: 'main';
  libraryEnabled: boolean;
};
```

Add two fields and a v3 stores block inside the class:

```ts
// inside class MtgDb extends Dexie { ... }
  decks!: Table<Deck, string>;
  artifactCache!: Table<ArtifactCacheRow, string>;
  library!: Table<LibraryRow, 'main'>;
  prefs!: Table<PrefsRow, 'main'>;

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
            d.originalCards = baseline.map((c) => ({ ...c }));
            d.workingCards = baseline.map((c) => ({ ...c }));
            delete d.cards;
          }),
      );
    this.version(3).stores({
      decks: 'id, name, updatedAt',
      artifactCache: '&ruleVersion',
      library: 'id',
      prefs: 'id',
    });
  }
```

No upgrade callback — the new tables start empty and existing data is untouched.

- [ ] **Step 4: Run all DB tests to verify both old and new pass**

Run: `cd app && npx vitest run src/lib/db.migration.test.ts`
Expected: PASS (existing v1 → v2 case + new v2 → v3 case).

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/db.ts app/src/lib/db.migration.test.ts
git commit -m "feat(app): bump Dexie to v3 with library + prefs tables"
```

---

## Task 6 — `stores/libraryStore.ts`

**Files:**
- Create: `app/src/stores/libraryStore.ts`
- Test: `app/src/stores/libraryStore.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// app/src/stores/libraryStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../lib/db';
import { useLibraryStore } from './libraryStore';
import type { LibraryImportResult } from '../lib/libraryImport';

function reset() {
  useLibraryStore.setState({ owned: null, enabled: false, meta: null });
  return Promise.all([db.library.clear(), db.prefs.clear()]);
}

function fakeResult(overrides: Partial<LibraryImportResult> = {}): LibraryImportResult {
  return {
    owned: new Map([['bolt-id', 4], ['mtn-id', 20]]),
    unknownNames: [],
    unknownSets: [],
    unparseableLines: [],
    ...overrides,
  };
}

describe('libraryStore', () => {
  beforeEach(reset);

  it('hydrate with no Dexie row leaves state empty', async () => {
    await useLibraryStore.getState().hydrate();
    const s = useLibraryStore.getState();
    expect(s.owned).toBeNull();
    expect(s.meta).toBeNull();
    expect(s.enabled).toBe(false);
  });

  it('importLibrary writes Dexie, populates state, and auto-enables on first import', async () => {
    await useLibraryStore.getState().importLibrary(fakeResult(), 'collection.csv');

    const s = useLibraryStore.getState();
    expect(s.owned?.get('bolt-id')).toBe(4);
    expect(s.enabled).toBe(true);
    expect(s.meta?.sourceFilename).toBe('collection.csv');

    const row = await db.library.get('main');
    expect(row?.owned['bolt-id']).toBe(4);
    expect((await db.prefs.get('main'))?.libraryEnabled).toBe(true);
  });

  it('hydrate loads a previously imported library', async () => {
    await useLibraryStore.getState().importLibrary(fakeResult(), 'col.csv');

    useLibraryStore.setState({ owned: null, enabled: false, meta: null });

    await useLibraryStore.getState().hydrate();
    const s = useLibraryStore.getState();
    expect(s.owned?.get('mtn-id')).toBe(20);
    expect(s.enabled).toBe(true);
    expect(s.meta?.sourceFilename).toBe('col.csv');
  });

  it('clearLibrary deletes Dexie row, clears state, disables', async () => {
    await useLibraryStore.getState().importLibrary(fakeResult(), 'col.csv');

    await useLibraryStore.getState().clearLibrary();

    const s = useLibraryStore.getState();
    expect(s.owned).toBeNull();
    expect(s.meta).toBeNull();
    expect(s.enabled).toBe(false);

    expect(await db.library.get('main')).toBeUndefined();
    expect((await db.prefs.get('main'))?.libraryEnabled).toBe(false);
  });

  it('setEnabled toggles the persisted flag without touching the library', async () => {
    await useLibraryStore.getState().importLibrary(fakeResult(), 'col.csv');

    await useLibraryStore.getState().setEnabled(false);
    expect(useLibraryStore.getState().enabled).toBe(false);
    expect(useLibraryStore.getState().owned?.size).toBe(2);
    expect((await db.prefs.get('main'))?.libraryEnabled).toBe(false);

    await useLibraryStore.getState().setEnabled(true);
    expect((await db.prefs.get('main'))?.libraryEnabled).toBe(true);
  });

  it('importLibrary preserves an existing enabled=false preference on re-import', async () => {
    await useLibraryStore.getState().importLibrary(fakeResult(), 'a.csv');
    await useLibraryStore.getState().setEnabled(false);

    await useLibraryStore.getState().importLibrary(fakeResult(), 'b.csv');
    expect(useLibraryStore.getState().enabled).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run src/stores/libraryStore.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the store implementation**

```ts
// app/src/stores/libraryStore.ts
import { create } from 'zustand';
import { db, type LibraryRow } from '../lib/db';
import type { LibraryImportResult, ImportRowSummary } from '../lib/libraryImport';

export type LibraryMeta = {
  importedAt: number;
  sourceFilename: string;
  unknownNames: ImportRowSummary[];
  unknownSets: ImportRowSummary[];
  unparseableLines: string[];
};

type LibraryState = {
  owned: Map<string, number> | null;
  enabled: boolean;
  meta: LibraryMeta | null;
  hydrate: () => Promise<void>;
  importLibrary: (result: LibraryImportResult, sourceFilename: string) => Promise<void>;
  clearLibrary: () => Promise<void>;
  setEnabled: (b: boolean) => Promise<void>;
};

function rowToState(row: LibraryRow): { owned: Map<string, number>; meta: LibraryMeta } {
  return {
    owned: new Map(Object.entries(row.owned)),
    meta: {
      importedAt: row.importedAt,
      sourceFilename: row.sourceFilename,
      unknownNames: row.unknownNames,
      unknownSets: row.unknownSets,
      unparseableLines: row.unparseableLines,
    },
  };
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  owned: null,
  enabled: false,
  meta: null,

  hydrate: async () => {
    const [row, prefs] = await Promise.all([db.library.get('main'), db.prefs.get('main')]);
    if (row) {
      const { owned, meta } = rowToState(row);
      set({ owned, meta, enabled: prefs?.libraryEnabled ?? true });
    } else {
      set({ owned: null, meta: null, enabled: prefs?.libraryEnabled ?? false });
    }
  },

  importLibrary: async (result, sourceFilename) => {
    const importedAt = Date.now();
    const ownedObj: Record<string, number> = {};
    for (const [k, v] of result.owned) ownedObj[k] = v;
    const row: LibraryRow = {
      id: 'main',
      importedAt,
      sourceFilename,
      owned: ownedObj,
      unknownNames: result.unknownNames,
      unknownSets: result.unknownSets,
      unparseableLines: result.unparseableLines,
    };

    // First-ever import auto-enables; re-imports preserve user's toggle state.
    const existingPrefs = await db.prefs.get('main');
    const isFirstImport = existingPrefs === undefined;

    await db.transaction('rw', db.library, db.prefs, async () => {
      await db.library.put(row);
      if (isFirstImport) {
        await db.prefs.put({ id: 'main', libraryEnabled: true });
      }
    });

    set({
      owned: new Map(result.owned),
      meta: {
        importedAt, sourceFilename,
        unknownNames: result.unknownNames,
        unknownSets: result.unknownSets,
        unparseableLines: result.unparseableLines,
      },
      enabled: isFirstImport ? true : get().enabled,
    });
  },

  clearLibrary: async () => {
    await db.transaction('rw', db.library, db.prefs, async () => {
      await db.library.delete('main');
      await db.prefs.put({ id: 'main', libraryEnabled: false });
    });
    set({ owned: null, meta: null, enabled: false });
  },

  setEnabled: async (b) => {
    await db.prefs.put({ id: 'main', libraryEnabled: b });
    set({ enabled: b });
  },
}));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npx vitest run src/stores/libraryStore.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add app/src/stores/libraryStore.ts app/src/stores/libraryStore.test.ts
git commit -m "feat(app): add libraryStore (zustand + Dexie persistence)"
```

---

## Task 7 — `lib/filter.ts` libraryFilter argument

**Files:**
- Modify: `app/src/lib/filter.ts` (add 2nd argument to `applyFilter`)
- Modify: `app/src/lib/filter.test.ts` (append libraryFilter cases)
- Modify: `app/src/components/FilterPanel.tsx:92` (pass libraryFilter to applyFilter)

- [ ] **Step 1: Write the failing test (append to existing file)**

```ts
// append to app/src/lib/filter.test.ts
describe('applyFilter with libraryFilter', () => {
  it('drops cards not present in the library set', () => {
    const cards: Card[] = [
      // (compose using whatever helper already exists in this file;
      // if none, build minimal Card stubs with unique oracleIds)
      makeStubCard('a'),
      makeStubCard('b'),
      makeStubCard('c'),
    ];

    const library = new Set(['a', 'c']);
    const out = applyFilter(cards, {}, library);

    expect(out.map((c) => c.oracleId).sort()).toEqual(['a', 'c']);
  });

  it('returns all cards when libraryFilter is undefined', () => {
    const cards: Card[] = [makeStubCard('a'), makeStubCard('b')];
    const out = applyFilter(cards, {});
    expect(out).toHaveLength(2);
  });

  it('intersects with other filter criteria (AND semantics)', () => {
    const cards: Card[] = [
      makeStubCard('a', { rarity: 'common' }),
      makeStubCard('b', { rarity: 'rare' }),
      makeStubCard('c', { rarity: 'common' }),
    ];
    const out = applyFilter(cards, { rarities: ['common'] }, new Set(['a', 'b']));
    expect(out.map((c) => c.oracleId)).toEqual(['a']);
  });
});
```

If `filter.test.ts` doesn't already have a `makeStubCard` helper, add one near the top:

```ts
function makeStubCard(oracleId: string, over: Partial<Card> = {}): Card {
  return {
    oracleId, name: oracleId, set: 'dmu', printings: ['dmu'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [],
    typeLine: '', types: [], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null,
    rarity: 'common', imageUrl: '', tags: [],
    ...over,
  };
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run src/lib/filter.test.ts`
Expected: FAIL (`applyFilter` accepts only one arg).

- [ ] **Step 3: Update `applyFilter`**

In `app/src/lib/filter.ts`, change the signature and add a single early-return check at the top of the per-card predicate:

```ts
export function applyFilter(
  cards: Card[],
  f: Filter,
  libraryFilter?: ReadonlySet<string>,
): Card[] {
  return cards.filter((c) => {
    if (libraryFilter && !libraryFilter.has(c.oracleId)) return false;
    // (all existing predicates below — unchanged)
    if (f.scope === 'standard' && !c.printings.some((p) => STANDARD_SET_SET.has(p))) return false;
    // ...
  });
}
```

(Keep the rest of the function body byte-for-byte.)

- [ ] **Step 4: Update `FilterPanel.tsx` to thread the library filter**

Edit `app/src/components/FilterPanel.tsx`:

```tsx
import { useLibraryStore } from '../stores/libraryStore';
// ...
const libraryEnabled = useLibraryStore((s) => s.enabled);
const libraryOwned = useLibraryStore((s) => s.owned);

const libraryFilter = useMemo(() => {
  if (!libraryEnabled || !libraryOwned) return undefined;
  return new Set(libraryOwned.keys());
}, [libraryEnabled, libraryOwned]);

const baseFiltered = useMemo(
  () => applyFilter(cards, value, libraryFilter),
  [cards, value, libraryFilter],
);
```

- [ ] **Step 5: Run tests**

Run: `cd app && npx vitest run src/lib/filter.test.ts src/components/FilterPanel.test.tsx`
Expected: PASS (existing + 3 new filter cases; FilterPanel tests pass because `useLibraryStore` returns its default `enabled: false`).

- [ ] **Step 6: Commit**

```bash
git add app/src/lib/filter.ts app/src/lib/filter.test.ts app/src/components/FilterPanel.tsx
git commit -m "feat(app): plumb libraryFilter through applyFilter + FilterPanel"
```

---

## Task 8 — `OwnedBadge` + `NotInLibraryBadge`

**Files:**
- Create: `app/src/components/OwnedBadge.tsx`
- Create: `app/src/components/NotInLibraryBadge.tsx`
- Test: `app/src/components/OwnedBadge.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// app/src/components/OwnedBadge.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useLibraryStore } from '../stores/libraryStore';
import OwnedBadge from './OwnedBadge';
import type { Card } from '@shared/types';

function makeCard(over: Partial<Card>): Card {
  return {
    oracleId: 'x', name: 'X', set: 't', printings: ['t'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [],
    typeLine: '', types: [], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null,
    rarity: 'common', imageUrl: '', tags: [],
    ...over,
  };
}

beforeEach(() => useLibraryStore.setState({ owned: null, enabled: false, meta: null }));

describe('OwnedBadge', () => {
  it('renders nothing when no library is loaded', () => {
    const { container } = render(<OwnedBadge card={makeCard({ oracleId: 'a' })} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the owned count when library is loaded', () => {
    useLibraryStore.setState({ owned: new Map([['a', 3]]), enabled: true, meta: null });
    render(<OwnedBadge card={makeCard({ oracleId: 'a' })} />);
    expect(screen.getByText(/×3/)).toBeInTheDocument();
  });

  it('renders ×0 when library is loaded but card is not owned', () => {
    useLibraryStore.setState({ owned: new Map([['b', 1]]), enabled: true, meta: null });
    render(<OwnedBadge card={makeCard({ oracleId: 'a' })} />);
    expect(screen.getByText(/×0/)).toBeInTheDocument();
  });

  it('renders nothing for a basic land', () => {
    useLibraryStore.setState({ owned: new Map([['a', 24]]), enabled: true, meta: null });
    const { container } = render(
      <OwnedBadge card={makeCard({ oracleId: 'a', name: 'Mountain', typeLine: 'Basic Land — Mountain' })} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run src/components/OwnedBadge.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement OwnedBadge**

```tsx
// app/src/components/OwnedBadge.tsx
import type { Card } from '@shared/types';
import { useLibraryStore } from '../stores/libraryStore';
import { isBasicLand } from '../lib/basics';

type Props = { card: Card; className?: string };

export default function OwnedBadge({ card, className = '' }: Props) {
  const owned = useLibraryStore((s) => s.owned);
  if (!owned) return null;
  if (isBasicLand(card)) return null;
  const count = owned.get(card.oracleId) ?? 0;
  return (
    <span
      className={
        'inline-flex items-center rounded bg-neutral-800/80 px-1.5 text-[10px] font-medium text-neutral-200 ' +
        className
      }
      aria-label={`Owned: ${count}`}
    >
      ×{count}
    </span>
  );
}
```

- [ ] **Step 4: Implement NotInLibraryBadge**

```tsx
// app/src/components/NotInLibraryBadge.tsx
import type { Card } from '@shared/types';
import { useLibraryStore } from '../stores/libraryStore';
import { isBasicLand } from '../lib/basics';

type Props = { card: Card };

export default function NotInLibraryBadge({ card }: Props) {
  const owned = useLibraryStore((s) => s.owned);
  if (!owned) return null;
  if (isBasicLand(card)) return null;
  if (owned.has(card.oracleId)) return null;
  return (
    <span
      className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-500"
      aria-label="Not in your library"
      title="Not in your library"
    />
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd app && npx vitest run src/components/OwnedBadge.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add app/src/components/OwnedBadge.tsx app/src/components/OwnedBadge.test.tsx app/src/components/NotInLibraryBadge.tsx
git commit -m "feat(app): add OwnedBadge and NotInLibraryBadge components"
```

---

## Task 9 — `LibraryStatusBadge` + top-nav mount + startup hydration

**Files:**
- Create: `app/src/components/LibraryStatusBadge.tsx`
- Modify: `app/src/App.tsx:21-25` (hydrate libraryStore at startup), `App.tsx:54` (mount the badge in the top nav next to HelpMenu)

- [ ] **Step 1: Implement LibraryStatusBadge**

```tsx
// app/src/components/LibraryStatusBadge.tsx
import { useLibraryStore } from '../stores/libraryStore';

export default function LibraryStatusBadge() {
  const owned = useLibraryStore((s) => s.owned);
  const enabled = useLibraryStore((s) => s.enabled);

  if (!owned) {
    return <span className="text-xs text-neutral-500">No library</span>;
  }
  return (
    <span
      className={`text-xs ${enabled ? 'text-neutral-200' : 'text-neutral-500'}`}
      aria-label={enabled ? 'Library active' : 'Library loaded but inactive'}
    >
      Library: {owned.size.toLocaleString()} cards
    </span>
  );
}
```

This is a presentational badge with no interactivity for v1; clicking-to-scroll into FilterPanel is a small polish that can land later — the spec calls for it but isn't critical for the feature to work.

- [ ] **Step 2: Hydrate libraryStore + mount the badge in `App.tsx`**

Edit `app/src/App.tsx`:

```tsx
// add to imports
import { useLibraryStore } from './stores/libraryStore';
import LibraryStatusBadge from './components/LibraryStatusBadge';

// inside the App() useEffect at line ~21:
  useEffect(() => {
    useGraphStore.getState().hydrate(ARTIFACT_URL);
    useDeckStore.getState().load();
    useLibraryStore.getState().hydrate();
  }, []);

// inside the nav, just before <HelpMenu />:
          <LibraryStatusBadge />
          <HelpMenu />
```

- [ ] **Step 3: Run the type check**

Run: `cd app && npm run build`
Expected: PASS (tsc clean, vite build succeeds).

- [ ] **Step 4: Commit**

```bash
git add app/src/components/LibraryStatusBadge.tsx app/src/App.tsx
git commit -m "feat(app): mount LibraryStatusBadge in nav + hydrate libraryStore at startup"
```

---

## Task 10 — `LibraryImportSummary` component

**Files:**
- Create: `app/src/components/LibraryImportSummary.tsx`
- Test: `app/src/components/LibraryImportSummary.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// app/src/components/LibraryImportSummary.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LibraryImportSummary from './LibraryImportSummary';

const baseResult = {
  owned: new Map([['a', 1], ['b', 2]]),
  unknownNames: [
    { name: 'Frobulator', setCode: 'dmu', quantity: 1 },
  ],
  unknownSets: [
    { name: 'Tarmogoyf', setCode: 'mh3', quantity: 2 },
    { name: 'Sol Ring',  setCode: 'cmd', quantity: 1 },
  ],
  unparseableLines: [],
};

describe('LibraryImportSummary', () => {
  it('shows the totals header (cards + copies)', () => {
    render(<LibraryImportSummary result={baseResult} />);
    expect(screen.getByText(/2 cards/)).toBeInTheDocument();
    expect(screen.getByText(/3 copies/)).toBeInTheDocument();
  });

  it('renders three group headers with their counts', () => {
    render(<LibraryImportSummary result={baseResult} />);
    expect(screen.getByRole('button', { name: /Unknown names \(1\)/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Unknown sets \(2\)/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Unparseable rows \(0\)/ })).toBeInTheDocument();
  });

  it('expands unknown-names by default; collapses unknown-sets by default', () => {
    render(<LibraryImportSummary result={baseResult} />);
    expect(screen.getByText(/Frobulator/)).toBeInTheDocument();
    expect(screen.queryByText(/Tarmogoyf/)).not.toBeInTheDocument();
  });

  it('expands unknown-sets when its header is clicked', () => {
    render(<LibraryImportSummary result={baseResult} />);
    fireEvent.click(screen.getByRole('button', { name: /Unknown sets/ }));
    expect(screen.getByText(/Tarmogoyf/)).toBeInTheDocument();
    expect(screen.getByText(/Sol Ring/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run src/components/LibraryImportSummary.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement LibraryImportSummary**

```tsx
// app/src/components/LibraryImportSummary.tsx
import { useState } from 'react';
import type { ImportRowSummary, LibraryImportResult } from '../lib/libraryImport';

type Props = { result: LibraryImportResult };

function Group({
  title, rows, initialOpen,
}: { title: string; rows: ImportRowSummary[]; initialOpen: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <div className="mt-3 border-t border-neutral-800 pt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left text-xs font-medium text-neutral-300"
      >
        <span>{open ? '▼' : '▶'} {title} ({rows.length})</span>
      </button>
      {open && rows.length > 0 && (
        <ul className="mt-2 max-h-48 overflow-y-auto text-xs text-neutral-400">
          {rows.map((r, i) => (
            <li key={`${r.name}-${r.setCode}-${i}`}>
              {r.quantity}× {r.name} ({r.setCode || '—'})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function LibraryImportSummary({ result }: Props) {
  const cardCount = result.owned.size;
  let copyCount = 0;
  for (const n of result.owned.values()) copyCount += n;

  return (
    <div>
      <p className="text-sm text-neutral-200">
        Imported <strong>{cardCount.toLocaleString()}</strong> cards
        ({copyCount.toLocaleString()} copies)
      </p>
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
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npx vitest run src/components/LibraryImportSummary.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add app/src/components/LibraryImportSummary.tsx app/src/components/LibraryImportSummary.test.tsx
git commit -m "feat(app): add LibraryImportSummary component"
```

---

## Task 11 — `ImportLibraryModal`

**Files:**
- Create: `app/src/components/ImportLibraryModal.tsx`
- Test: `app/src/components/ImportLibraryModal.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// app/src/components/ImportLibraryModal.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ImportLibraryModal from './ImportLibraryModal';
import { useGraphStore } from '../stores/graphStore';
import { useLibraryStore } from '../stores/libraryStore';
import type { Card } from '@shared/types';
import { STANDARD_SET_CODES } from '@shared/sets';

function makeCard(oracleId: string, name: string, printings: string[]): Card {
  return {
    oracleId, name, set: printings[0]!, printings, collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [],
    typeLine: '', types: [], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null,
    rarity: 'common', imageUrl: '', tags: [],
  };
}

const KNOWN_SET = STANDARD_SET_CODES[0]!;

beforeEach(() => {
  useGraphStore.setState({
    cards: new Map([['bolt-id', makeCard('bolt-id', 'Lightning Bolt', [KNOWN_SET])]]),
  } as never);
  useLibraryStore.setState({ owned: null, enabled: false, meta: null });
});

function makeCsvFile(text: string): File {
  return new File([text], 'collection.csv', { type: 'text/csv' });
}

describe('ImportLibraryModal', () => {
  it('shows the file picker initially', () => {
    render(<ImportLibraryModal onClose={() => {}} />);
    expect(screen.getByLabelText(/Choose Manabox CSV/i)).toBeInTheDocument();
  });

  it('parses, resolves, and shows a summary after a valid file is picked', async () => {
    render(<ImportLibraryModal onClose={() => {}} />);
    const csv =
      '"Name","Set code","Set name","Collector number","Foil","Rarity","Quantity"\n' +
      `"Lightning Bolt","${KNOWN_SET}","x","1","normal","common","4"`;
    const input = screen.getByLabelText(/Choose Manabox CSV/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeCsvFile(csv)] } });
    expect(await screen.findByText(/1 cards/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Use this library/i })).toBeEnabled();
  });

  it('disables "Use this library" when nothing resolves and shows a hint', async () => {
    render(<ImportLibraryModal onClose={() => {}} />);
    const csv =
      '"Name","Set code","Set name","Collector number","Foil","Rarity","Quantity"\n' +
      '"Frobulator","mh3","x","1","normal","common","1"';
    const input = screen.getByLabelText(/Choose Manabox CSV/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeCsvFile(csv)] } });
    expect(await screen.findByText(/No matching cards/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Use this library/i })).toBeDisabled();
  });

  it('shows the parse error and keeps the import button disabled when the header is bad', async () => {
    render(<ImportLibraryModal onClose={() => {}} />);
    const csv = '"NotAColumn"\n"x"';
    const input = screen.getByLabelText(/Choose Manabox CSV/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeCsvFile(csv)] } });
    expect(await screen.findByText(/Missing required column/i)).toBeInTheDocument();
  });

  it('Cancel closes without writing a library', async () => {
    const onClose = vi.fn();
    render(<ImportLibraryModal onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(onClose).toHaveBeenCalled();
    expect(useLibraryStore.getState().owned).toBeNull();
  });

  it('"Use this library" writes the library and calls onClose', async () => {
    const onClose = vi.fn();
    render(<ImportLibraryModal onClose={onClose} />);
    const csv =
      '"Name","Set code","Set name","Collector number","Foil","Rarity","Quantity"\n' +
      `"Lightning Bolt","${KNOWN_SET}","x","1","normal","common","4"`;
    const input = screen.getByLabelText(/Choose Manabox CSV/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeCsvFile(csv)] } });
    await screen.findByText(/1 cards/);
    fireEvent.click(screen.getByRole('button', { name: /Use this library/i }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(useLibraryStore.getState().owned?.get('bolt-id')).toBe(4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run src/components/ImportLibraryModal.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement ImportLibraryModal**

```tsx
// app/src/components/ImportLibraryModal.tsx
import { useState } from 'react';
import { STANDARD_SET_CODES } from '@shared/sets';
import { useGraphStore } from '../stores/graphStore';
import { useLibraryStore } from '../stores/libraryStore';
import { parseManaboxCsv, resolveLibrary, type LibraryImportResult } from '../lib/libraryImport';
import LibraryImportSummary from './LibraryImportSummary';

type Props = { onClose: () => void };

const KNOWN_SET_CODES = new Set(STANDARD_SET_CODES.map((c) => c.toLowerCase()));

export default function ImportLibraryModal({ onClose }: Props) {
  const cards = useGraphStore((s) => s.cards);
  const importLibrary = useLibraryStore((s) => s.importLibrary);

  const [result, setResult] = useState<LibraryImportResult | null>(null);
  const [filename, setFilename] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    setError(null);
    setResult(null);
    setFilename(file.name);
    try {
      const text = await file.text();
      const parsed = parseManaboxCsv(text);
      const r = resolveLibrary(parsed, cards, KNOWN_SET_CODES);
      setResult(r);
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-[40rem] max-w-[92vw] rounded-lg border border-neutral-700 bg-neutral-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-library-title"
      >
        <h3 id="import-library-title" className="text-lg font-semibold">
          Import library
        </h3>
        <p className="mt-1 text-xs text-neutral-400">
          Pick a Manabox CSV backup. We'll only show cards that are in both your library and our graph.
        </p>

        <label className="mt-4 inline-flex cursor-pointer items-center rounded border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm hover:bg-neutral-700">
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
        {filename && <span className="ml-2 text-xs text-neutral-400">{filename}</span>}

        {error && (
          <p className="mt-3 rounded bg-rose-900/30 px-3 py-2 text-xs text-rose-200">
            {error}
          </p>
        )}

        {result && (
          <div className="mt-4">
            <LibraryImportSummary result={result} />
            {result.owned.size === 0 && (
              <p className="mt-3 text-xs text-amber-300">
                No matching cards found. Pick a different file.
              </p>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="rounded border border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-800"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400"
            onClick={handleUse}
            disabled={!result || result.owned.size === 0 || busy}
          >
            Use this library
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npx vitest run src/components/ImportLibraryModal.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add app/src/components/ImportLibraryModal.tsx app/src/components/ImportLibraryModal.test.tsx
git commit -m "feat(app): add ImportLibraryModal"
```

---

## Task 12 — `LibrarySection` + mount in `FilterPanel`

**Files:**
- Create: `app/src/components/LibrarySection.tsx`
- Test: `app/src/components/LibrarySection.test.tsx`
- Modify: `app/src/components/FilterPanel.tsx` (mount `<LibrarySection />` at the top of the panel body)

- [ ] **Step 1: Write the failing test**

```tsx
// app/src/components/LibrarySection.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LibrarySection from './LibrarySection';
import { useLibraryStore } from '../stores/libraryStore';

beforeEach(() => useLibraryStore.setState({ owned: null, enabled: false, meta: null }));

describe('LibrarySection', () => {
  it('renders the empty state with an Import button', () => {
    render(<LibrarySection />);
    expect(screen.getByText(/Import a Manabox CSV backup/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Import library/i })).toBeInTheDocument();
  });

  it('opens the import modal when Import is clicked', () => {
    render(<LibrarySection />);
    fireEvent.click(screen.getByRole('button', { name: /Import library/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders the loaded state with totals + toggle + actions', () => {
    useLibraryStore.setState({
      owned: new Map([['a', 4], ['b', 1]]),
      enabled: true,
      meta: { importedAt: Date.now(), sourceFilename: 'col.csv',
              unknownNames: [], unknownSets: [], unparseableLines: [] },
    });
    render(<LibrarySection />);
    expect(screen.getByText(/2 cards/)).toBeInTheDocument();
    expect(screen.getByText(/5 copies/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Library only/i)).toBeChecked();
    expect(screen.getByRole('button', { name: /Re-import/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /View report/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Clear/i })).toBeInTheDocument();
  });

  it('toggling "Library only" persists via setEnabled', () => {
    useLibraryStore.setState({
      owned: new Map([['a', 4]]),
      enabled: true,
      meta: { importedAt: Date.now(), sourceFilename: 'col.csv',
              unknownNames: [], unknownSets: [], unparseableLines: [] },
    });
    render(<LibrarySection />);
    fireEvent.click(screen.getByLabelText(/Library only/i));
    expect(useLibraryStore.getState().enabled).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run src/components/LibrarySection.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement LibrarySection**

```tsx
// app/src/components/LibrarySection.tsx
import { useState } from 'react';
import { useLibraryStore } from '../stores/libraryStore';
import ImportLibraryModal from './ImportLibraryModal';
import LibraryImportSummary from './LibraryImportSummary';

export default function LibrarySection() {
  const owned = useLibraryStore((s) => s.owned);
  const enabled = useLibraryStore((s) => s.enabled);
  const meta = useLibraryStore((s) => s.meta);
  const setEnabled = useLibraryStore((s) => s.setEnabled);
  const clearLibrary = useLibraryStore((s) => s.clearLibrary);

  const [showImport, setShowImport] = useState(false);
  const [showReport, setShowReport] = useState(false);

  if (!owned) {
    return (
      <section className="mb-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Library</h4>
        <p className="mt-1 text-xs text-neutral-500">Import a Manabox CSV backup.</p>
        <button
          type="button"
          className="mt-2 rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs hover:bg-neutral-700"
          onClick={() => setShowImport(true)}
        >
          Import library
        </button>
        {showImport && <ImportLibraryModal onClose={() => setShowImport(false)} />}
      </section>
    );
  }

  const cardCount = owned.size;
  let copyCount = 0;
  for (const n of owned.values()) copyCount += n;
  const importedDate = meta ? new Date(meta.importedAt).toLocaleDateString() : '';

  return (
    <section className="mb-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Library</h4>
      <p className="mt-1 text-xs text-neutral-300">
        {cardCount.toLocaleString()} cards · {copyCount.toLocaleString()} copies
      </p>
      <p className="text-xs text-neutral-500">Imported {importedDate}</p>
      <label className="mt-2 flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => void setEnabled(e.target.checked)}
          aria-label="Library only"
        />
        Library only
      </label>
      <div className="mt-2 flex flex-wrap gap-1">
        <button
          type="button"
          className="rounded border border-neutral-700 px-2 py-0.5 text-xs hover:bg-neutral-800"
          onClick={() => setShowImport(true)}
        >
          Re-import
        </button>
        <button
          type="button"
          className="rounded border border-neutral-700 px-2 py-0.5 text-xs hover:bg-neutral-800"
          onClick={() => setShowReport(true)}
        >
          View report
        </button>
        <button
          type="button"
          className="rounded border border-rose-700/50 px-2 py-0.5 text-xs text-rose-300 hover:bg-rose-900/30"
          onClick={() => {
            if (confirm('Clear your library? You can re-import any time.')) void clearLibrary();
          }}
        >
          Clear
        </button>
      </div>

      {showImport && <ImportLibraryModal onClose={() => setShowImport(false)} />}
      {showReport && meta && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowReport(false)}
        >
          <div
            className="w-[36rem] max-w-[92vw] rounded-lg border border-neutral-700 bg-neutral-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3 className="text-lg font-semibold">Library import report</h3>
            <div className="mt-3">
              <LibraryImportSummary
                result={{
                  owned, unknownNames: meta.unknownNames, unknownSets: meta.unknownSets,
                  unparseableLines: meta.unparseableLines,
                }}
              />
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="rounded border border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-800"
                onClick={() => setShowReport(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Mount LibrarySection at the top of FilterPanel**

Edit `app/src/components/FilterPanel.tsx`: add `import LibrarySection from './LibrarySection';` and render `<LibrarySection />` as the first child of the panel body. Place it above the existing first filter section (color / type / etc.).

- [ ] **Step 5: Run tests**

Run: `cd app && npx vitest run src/components/LibrarySection.test.tsx src/components/FilterPanel.test.tsx`
Expected: PASS (LibrarySection tests + FilterPanel tests unchanged).

- [ ] **Step 6: Commit**

```bash
git add app/src/components/LibrarySection.tsx app/src/components/LibrarySection.test.tsx app/src/components/FilterPanel.tsx
git commit -m "feat(app): add LibrarySection (empty + loaded states) and mount it in FilterPanel"
```

---

## Task 13 — `CardGrid` shows `OwnedBadge`

**Files:**
- Modify: `app/src/components/CardGrid.tsx` (mount `<OwnedBadge>` on each tile)

- [ ] **Step 1: Identify the tile element**

Read `app/src/components/CardGrid.tsx` to find where each card tile renders (typically a `<div>` per card with image + name + cost). Pick a sensible mounting point — usually the bottom-right corner of the tile.

- [ ] **Step 2: Edit CardGrid.tsx**

Add import:

```tsx
import OwnedBadge from './OwnedBadge';
```

Inside the per-card tile JSX, add (positioned via Tailwind absolute):

```tsx
<OwnedBadge card={card} className="absolute bottom-1 right-1" />
```

Ensure the tile wrapper is `relative` (most likely already is for hover affordances).

- [ ] **Step 3: Verify tests still pass**

Run: `cd app && npm test`
Expected: PASS (no test asserts on absence of OwnedBadge; the existing CardGrid tests don't seed library data, so `OwnedBadge` renders nothing and is invisible).

- [ ] **Step 4: Commit**

```bash
git add app/src/components/CardGrid.tsx
git commit -m "feat(app): show OwnedBadge on each CardGrid tile"
```

---

## Task 14 — `DeckPanel` — owned counts, missing summary, badges, (N+1) warning

**Files:**
- Modify: `app/src/components/DeckPanel.tsx`
- Modify: `app/src/components/DeckPanel.test.tsx`

This task has the most surface area. Walk through it in three small edits.

- [ ] **Step 1: Write failing tests for the per-row "current/owned" display**

Append to `app/src/components/DeckPanel.test.tsx` a new describe block. The exact test setup depends on existing helpers in that file; use the same pattern. Sketch:

```tsx
import { useLibraryStore } from '../stores/libraryStore';

describe('DeckPanel — library quantity overlay', () => {
  beforeEach(() => useLibraryStore.setState({ owned: null, enabled: false, meta: null }));

  it('shows current/owned for non-basics when a library is loaded', () => {
    useLibraryStore.setState({
      owned: new Map([['bolt-id', 3]]),
      enabled: true,
      meta: null,
    });
    // (use the existing test setup to render a deck with 2× Lightning Bolt)
    // assert text "2/3" appears in that row.
  });

  it('does not show owned count for basic lands', () => {
    useLibraryStore.setState({
      owned: new Map([['mtn-id', 8]]),
      enabled: true,
      meta: null,
    });
    // render a deck with 20× Mountain
    // assert "20" shows but "20/8" does not.
  });

  it('renders NotInLibraryBadge for a deck card not in the library', () => {
    useLibraryStore.setState({
      owned: new Map([['mtn-id', 8]]),  // bolt-id NOT here
      enabled: true,
      meta: null,
    });
    // render a deck with 1× Lightning Bolt
    expect(screen.getByLabelText(/Not in your library/i)).toBeInTheDocument();
  });

  it('shows the Missing: N summary line', () => {
    useLibraryStore.setState({
      owned: new Map([['bolt-id', 1]]),
      enabled: true,
      meta: null,
    });
    // render a deck with 4× Lightning Bolt + 24× Mountain
    expect(screen.getByText(/Missing: 3/)).toBeInTheDocument();
  });

  it('shows Missing: 0 as a green check', () => {
    useLibraryStore.setState({
      owned: new Map([['bolt-id', 4], ['mtn-id', 24]]),
      enabled: true,
      meta: null,
    });
    // render a deck with 4× Lightning Bolt + 24× Mountain
    expect(screen.getByLabelText(/Library is fully stocked/i)).toBeInTheDocument();
  });
});
```

(Use the existing `render`/`renderDeck` helper in `DeckPanel.test.tsx`. If none exists, build cards inline as in the OwnedBadge test.)

- [ ] **Step 2: Run tests to verify failure**

Run: `cd app && npx vitest run src/components/DeckPanel.test.tsx`
Expected: FAIL on the new describe block.

- [ ] **Step 3: Update `DeckPanel.tsx`**

At the top of the `DeckPanel` component body, add:

```tsx
import { useLibraryStore } from '../stores/libraryStore';
import NotInLibraryBadge from './NotInLibraryBadge';
import { isBasicLand } from '../lib/basics';

// inside DeckPanel():
const owned = useLibraryStore((s) => s.owned);
```

Find the deck-row rendering. From the existing file (`DeckPanel.tsx:272`), rows iterate over entries with shape `{ oracleId, count, name }` and look up the full `Card` via `cards.get(oracleId)`. In the row JSX, replace the existing `{r.count}×` span with a small helper:

```tsx
function rowCountLabel(card: Card | undefined, count: number, owned: Map<string, number> | null): JSX.Element {
  if (!owned || !card || isBasicLand(card)) {
    return <span className="tabular-nums text-neutral-500">{count}×</span>;
  }
  const have = owned.get(card.oracleId) ?? 0;
  const short = have < count;
  return (
    <span className={`tabular-nums ${short ? 'text-amber-300' : 'text-neutral-500'}`}>
      {count}/{have}
    </span>
  );
}
```

Call it: `{rowCountLabel(card, r.count, owned)}` — where `card` is the already-looked-up Card. Right after the card name on the same row, render `<NotInLibraryBadge card={card} />` when `card` exists.

For the missing-cards summary, add near the top of the rendered panel (above the existing per-type list, below the deck name / total count):

```tsx
const missing = useMemo(() => {
  if (!owned || !deck) return null;
  let m = 0;
  for (const r of deck.workingCards) {
    const card = cards.get(r.oracleId);
    if (!card || isBasicLand(card)) continue;
    const have = owned.get(r.oracleId) ?? 0;
    if (r.count > have) m += r.count - have;
  }
  return m;
}, [owned, deck, cards]);

// In the JSX:
{owned && missing !== null && (
  missing === 0
    ? <p aria-label="Library is fully stocked" className="text-xs text-emerald-400">✓ Library covers this deck</p>
    : <p className="text-xs text-amber-300">Missing: {missing} cards</p>
)}
```

Replace `cards` and `deck` with whatever local names DeckPanel uses — read the top of the component to see.

- [ ] **Step 4: Run tests**

Run: `cd app && npx vitest run src/components/DeckPanel.test.tsx`
Expected: PASS.

- [ ] **Step 5: Add the (N+1)-warning toast on add**

The toast API (`app/src/stores/toastStore.ts`) is `useToastStore.getState().show(message: string)`. `deckStore.addCard(oracleId, qty, name?)` (`deckStore.ts:118`) increments a card's count.

Edit `AddToDeckButton.tsx`. Inside the click handler, after the existing `addCard` call (or just before, computing the post-state):

```tsx
import { useToastStore } from '../stores/toastStore';
import { useLibraryStore } from '../stores/libraryStore';
import { useDeckStore } from '../stores/deckStore';
import { isBasicLand } from '../lib/basics';

// ... existing imports / hooks
// inside the existing add handler, right after `await addCard(card.oracleId, qty, card.name)`:
const owned = useLibraryStore.getState().owned;
if (owned && !isBasicLand(card)) {
  const have = owned.get(card.oracleId) ?? 0;
  // Read the post-add count straight from the store — addCard has resolved.
  const activeDeck = useDeckStore.getState().decks.find(
    (d) => d.id === useDeckStore.getState().activeDeckId,
  );
  const entry = activeDeck?.workingCards.find((c) => c.oracleId === card.oracleId);
  const newCount = entry?.count ?? qty;
  if (newCount > have) {
    useToastStore.getState().show(
      `Your library has ${have}× ${card.name}; deck now wants ${newCount}.`,
    );
  }
}
```

(If `AddToDeckButton`'s click handler isn't `async` today, await `addCard` so the post-state read is correct. If `useDeckStore` exposes a cleaner selector for "active deck's count of oracleId X", prefer that — check `useActiveDeck` in `deckStore.ts`.)

- [ ] **Step 6: Run the full app test suite**

Run: `cd app && npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/src/components/DeckPanel.tsx app/src/components/DeckPanel.test.tsx app/src/components/AddToDeckButton.tsx
git commit -m "feat(app): deck editor surfaces owned counts, missing summary, and over-N warnings"
```

---

## Task 15 — `InteractionsPanel` and `DeckGraphPage` edge filtering

**Files:**
- Modify: `app/src/components/InteractionsPanel.tsx`
- Modify: `app/src/pages/DeckGraphPage.tsx`

- [ ] **Step 1: Plumb the library filter into InteractionsPanel**

In `app/src/components/InteractionsPanel.tsx`:

```tsx
import { useLibraryStore } from '../stores/libraryStore';
import { useMemo } from 'react';

const enabled = useLibraryStore((s) => s.enabled);
const owned = useLibraryStore((s) => s.owned);
const libraryFilter = useMemo(
  () => (enabled && owned ? new Set(owned.keys()) : null),
  [enabled, owned],
);
```

Find the place where edges are listed (a `.map` over edges from `graphStore`). Wrap that source with a filter:

```tsx
const visibleEdges = libraryFilter
  ? edges.filter((e) => libraryFilter.has(e.source) && libraryFilter.has(e.target))
  : edges;
```

Then render `visibleEdges` everywhere `edges` used to be rendered.

- [ ] **Step 2: Same treatment for DeckGraphPage**

In `app/src/pages/DeckGraphPage.tsx`, find the edge-listing code (likely a `useMemo` building the graph for the visualization). Add the same `libraryFilter` and filter the edges (but NOT the deck's own cards — those always render per the spec):

```tsx
const visibleEdges = libraryFilter
  ? allEdges.filter((e) => libraryFilter.has(e.source) && libraryFilter.has(e.target))
  : allEdges;
```

- [ ] **Step 3: Run tests + build**

Run: `cd app && npm test`
Expected: PASS (existing tests unaffected — library store default leaves filter off).

- [ ] **Step 4: Smoke test in dev**

Run: `cd app && npm run dev`
Manually verify:
1. With no library loaded, InteractionsPanel and DeckGraphPage look unchanged.
2. After importing a small CSV (use `app/tests/fixtures/manabox-sample.csv`), edges to non-library cards disappear from both views.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/InteractionsPanel.tsx app/src/pages/DeckGraphPage.tsx
git commit -m "feat(app): hide edges to non-library cards in InteractionsPanel + DeckGraphPage"
```

---

## Task 16 — Playwright e2e

**Files:**
- Create: `app/tests/e2e/library-import.spec.ts`

- [ ] **Step 1: Look at existing e2e patterns**

Run: `ls app/tests/e2e && cat app/tests/e2e/*.spec.ts | head -80`
Note the imports, the base URL, how the test waits for hydration.

- [ ] **Step 2: Write the spec**

```ts
// app/tests/e2e/library-import.spec.ts
import { test, expect } from '@playwright/test';
import path from 'node:path';

test('imports a Manabox CSV and filters the browser to the owned subset', async ({ page }) => {
  await page.goto('/');

  // Wait for the initial card grid to render.
  await expect(page.getByText(/cards loaded|results/i).first()).toBeVisible({ timeout: 15_000 });
  const initialCount = await page.locator('[data-test-id="card-tile"]').count();

  // Open the FilterPanel's Library section.
  await page.getByRole('button', { name: /Import library/i }).click();

  // Upload the fixture.
  const fixture = path.resolve(__dirname, '../fixtures/manabox-sample.csv');
  await page.setInputFiles('input[aria-label="Choose Manabox CSV"]', fixture);

  // Wait for the summary to render, then accept.
  await expect(page.getByText(/cards/).first()).toBeVisible();
  await page.getByRole('button', { name: /Use this library/i }).click();

  // Header badge updates.
  await expect(page.getByText(/Library: /)).toBeVisible();

  // Card grid shrinks dramatically.
  const afterCount = await page.locator('[data-test-id="card-tile"]').count();
  expect(afterCount).toBeLessThan(initialCount);

  // Toggle "Library only" off — full set returns.
  await page.getByLabel(/Library only/i).uncheck();
  const restoredCount = await page.locator('[data-test-id="card-tile"]').count();
  expect(restoredCount).toBeGreaterThan(afterCount);
});
```

If `data-test-id="card-tile"` doesn't exist on tiles, either add it in `CardGrid.tsx` (one attribute on the tile root) or use a different selector that uniquely picks tiles (e.g., `[role="article"]`). Prefer adding the data attribute — it's stable across DOM tweaks.

- [ ] **Step 3: Run the e2e**

Run: `cd app && npm run e2e`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/tests/e2e/library-import.spec.ts app/src/components/CardGrid.tsx  # if you added the data-test-id
git commit -m "test(app): add e2e for Manabox library import + toggle"
```

---

## Final verification

- [ ] **Step 1: Run the full repo gate**

Run: `npm test` (from the repo root)
Expected: PASS — pipeline + shared types + app vitest + app build.

- [ ] **Step 2: Manual smoke**

Run: `cd app && npm run dev`
Manually verify:
1. Header shows `No library` initially.
2. FilterPanel has a "Library" section at the top with `[Import library]`.
3. Import the fixture CSV.
4. Header now says `Library: N cards`.
5. Card grid shrinks; deck graph + interactions panel filter edges.
6. Toggle "Library only" off → full grid returns.
7. Build a deck containing more copies than owned → warning toast fires.
8. DeckPanel shows `current/owned` per non-basic, `Missing: N` header line.
9. `View report` shows the unknown-names / unknown-sets groups.
10. `Clear` removes the library and reverts everything.

- [ ] **Step 3: Tag the release**

If the change is being shipped: bump `package.json` and tag per the repo's release convention. (Skip if executing as a feature branch without immediate release.)

---

## Self-review notes (post-write)

Spec coverage:
- ✅ Data model (library + prefs Dexie rows): Tasks 5, 6
- ✅ CSV parser + resolver: Tasks 3, 4
- ✅ Singleton library, auto-enable on first import, preserve toggle on re-import: Task 6
- ✅ Library overlay (graphStore untouched): Tasks 7, 15
- ✅ FilterPanel integration with `libraryFilter`: Task 7
- ✅ InteractionsPanel + DeckGraphPage edge filter: Task 15
- ✅ LibraryStatusBadge in nav, hydrate at startup: Task 9
- ✅ LibrarySection (empty + loaded), ImportLibraryModal, LibraryImportSummary: Tasks 10, 11, 12
- ✅ OwnedBadge + NotInLibraryBadge: Task 8
- ✅ Deck-editor owned counts, missing summary, badges, (N+1) warning, basics exempt: Task 14
- ✅ Migration test: Task 5
- ✅ E2E: Task 16
- ✅ Empty-CSV / all-unknown CSV blocks import: Task 11 (test + implementation)
- ✅ Cross-set credit by name; unknown-set classification: Task 4
- ✅ Basic lands handled correctly: Tasks 1, 8, 14
