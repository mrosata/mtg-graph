# Arena deck import/export — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users round-trip decks through the MTG Arena text format — paste/load-file to import on the Decks page; one-click clipboard export from the Decks list and the `DeckPanel` rail.

**Architecture:** Two pure modules in `app/src/lib/` do the heavy lifting (`deckExport.ts` for emission, `deckImport.ts` for parsing + resolving against the card index). One new Zustand action (`importDeck`) persists the resulting deck via the existing Dexie path. UI is one new modal, one tiny toast, and one inline summary panel. The store stays a pure persistence layer; surfacing skipped/unknown cards is the component's job.

**Tech Stack:** React + Vite + TypeScript SPA, Zustand stores, Dexie/IndexedDB, Vitest + React Testing Library, jsdom with fake-indexeddb. See `CLAUDE.md` for codebase conventions.

**Source spec:** `docs/superpowers/specs/2026-05-24-arena-deck-import-export-design.md`

---

## File map

New:
- `app/src/lib/deckImport.ts` — parser + resolver (pure)
- `app/src/lib/deckImport.test.ts`
- `app/src/stores/toastStore.ts` — one-slot Zustand store for toast messages
- `app/src/stores/importSummaryStore.ts` — one-slot Zustand store for the post-import summary
- `app/src/components/Toast.tsx` — portal-style fixed toast (auto-dismiss)
- `app/src/components/ImportDeckModal.tsx`
- `app/src/components/ImportDeckModal.test.tsx`
- `app/src/components/ImportSummary.tsx`

Modified:
- `app/src/lib/deckExport.ts` — replace `deckToText` with `deckToArenaText`
- `app/src/lib/deckExport.test.ts`
- `app/src/stores/deckStore.ts` — add `importDeck` action
- `app/src/stores/deckStore.test.ts`
- `app/src/components/DeckPanel.tsx` — rename "Copy as text" → "Export", call `deckToArenaText`, show toast
- `app/src/pages/DecksPage.tsx` — Import button, per-row Export button, mount `<Toast />` and `<ImportDeckModal />`
- `app/src/pages/DecksPage.test.tsx`
- `app/src/pages/DeckPage.tsx` — render `<ImportSummary />` when the store has a payload

---

## Task 1: `parseArenaDeck` (pure parser)

**Files:**
- Create: `app/src/lib/deckImport.ts`
- Create: `app/src/lib/deckImport.test.ts`

The parser walks lines once. It tracks the current section (`about` / `deck` / `sideboard` / `none`), reads `Name <…>` from `about`, accumulates `<count> <name>` entries from `deck`, sums counts in `sideboard`, and pushes anything that doesn't match the shape into `unparseableLines`. Lines starting with `//` or `#` are comments. Section headers are case-insensitive.

- [ ] **Step 1: Write the failing test file**

```typescript
// app/src/lib/deckImport.test.ts
import { describe, it, expect } from 'vitest';
import { parseArenaDeck } from './deckImport';

const EXAMPLE_1 = `About
Name 4-Color Dinosaurs

Deck
5 Swamp
3 Mountain
4 Zombify
2 Blood Crypt
1 Temple of Malice
3 Gishath, Sun's Avatar
4 Bitter Triumph
4 Saheeli's Lattice
3 Trumpeting Carnosaur
4 Ghalta, Stampede Tyrant
4 Palani's Hatcher
1 Raucous Theater
4 Conduit Pylons
2 Vaultborn Tyrant
1 Blazemire Verge
1 Razortrap Gorge
4 Starting Town
4 Melded Moxite
4 Foggy Swamp Visions
2 Raph & Mikey, Troublemakers`;

describe('parseArenaDeck', () => {
  it('parses the canonical About + Deck format', () => {
    const r = parseArenaDeck(EXAMPLE_1);
    expect(r.name).toBe('4-Color Dinosaurs');
    expect(r.entries).toHaveLength(20);
    expect(r.entries[0]).toEqual({ count: 5, name: 'Swamp' });
    expect(r.entries[5]).toEqual({ count: 3, name: "Gishath, Sun's Avatar" });
    expect(r.entries[19]).toEqual({ count: 2, name: 'Raph & Mikey, Troublemakers' });
    expect(r.sideboardCount).toBe(0);
    expect(r.unparseableLines).toEqual([]);
  });

  it('returns null name when About is missing', () => {
    const r = parseArenaDeck('Deck\n4 Lightning Bolt');
    expect(r.name).toBeNull();
    expect(r.entries).toEqual([{ count: 4, name: 'Lightning Bolt' }]);
  });

  it('returns null name when About has no Name line', () => {
    const r = parseArenaDeck('About\nCommander Some Card\n\nDeck\n4 Lightning Bolt');
    expect(r.name).toBeNull();
    expect(r.entries).toHaveLength(1);
  });

  it('matches section headers case-insensitively', () => {
    const r = parseArenaDeck('ABOUT\nName Mixed Case\n\ndeck\n2 Island');
    expect(r.name).toBe('Mixed Case');
    expect(r.entries).toEqual([{ count: 2, name: 'Island' }]);
  });

  it('ignores // and # comment lines', () => {
    const r = parseArenaDeck('Deck\n// a comment\n# another\n3 Forest');
    expect(r.entries).toEqual([{ count: 3, name: 'Forest' }]);
    expect(r.unparseableLines).toEqual([]);
  });

  it('ignores unknown lines inside About (Commander, Companion)', () => {
    const r = parseArenaDeck(
      'About\nName N\nCommander Krenko, Tin Street Kingpin\nCompanion Lurrus\n\nDeck\n4 Mountain',
    );
    expect(r.name).toBe('N');
    expect(r.entries).toEqual([{ count: 4, name: 'Mountain' }]);
    expect(r.unparseableLines).toEqual([]);
  });

  it('sums Sideboard counts without adding to entries', () => {
    const r = parseArenaDeck('Deck\n4 Forest\n\nSideboard\n2 Naturalize\n3 Veil of Summer');
    expect(r.entries).toEqual([{ count: 4, name: 'Forest' }]);
    expect(r.sideboardCount).toBe(5);
  });

  it('captures garbled lines inside Deck in unparseableLines', () => {
    const r = parseArenaDeck('Deck\nasdf\n3\nfoo Lightning Bolt\n4 Forest');
    expect(r.entries).toEqual([{ count: 4, name: 'Forest' }]);
    expect(r.unparseableLines).toEqual(['asdf', '3', 'foo Lightning Bolt']);
  });

  it('tolerates Windows-style CRLF line endings', () => {
    const r = parseArenaDeck('About\r\nName CRLF\r\n\r\nDeck\r\n2 Plains\r\n');
    expect(r.name).toBe('CRLF');
    expect(r.entries).toEqual([{ count: 2, name: 'Plains' }]);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
cd app && npm test -- src/lib/deckImport.test.ts
```

Expected: failure with "Failed to load url ./deckImport" (module doesn't exist).

- [ ] **Step 3: Implement the parser**

```typescript
// app/src/lib/deckImport.ts
export type ImportEntry = { count: number; name: string };

export type ParsedDeck = {
  name: string | null;
  entries: ImportEntry[];
  sideboardCount: number;
  unparseableLines: string[];
};

type Section = 'none' | 'about' | 'deck' | 'sideboard';

const CARD_LINE = /^(\d+)\s+(.+)$/;
const NAME_LINE = /^Name\s+(.+)$/i;

export function parseArenaDeck(text: string): ParsedDeck {
  let section: Section = 'none';
  let name: string | null = null;
  const entries: ImportEntry[] = [];
  let sideboardCount = 0;
  const unparseableLines: string[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith('//') || line.startsWith('#')) continue;

    const header = line.toLowerCase();
    if (header === 'about') { section = 'about'; continue; }
    if (header === 'deck') { section = 'deck'; continue; }
    if (header === 'sideboard') { section = 'sideboard'; continue; }

    if (section === 'about') {
      const m = line.match(NAME_LINE);
      if (m) name = m[1]!.trim();
      // Commander, Companion, anything else: silently ignored.
      continue;
    }

    if (section === 'deck' || section === 'sideboard') {
      const m = line.match(CARD_LINE);
      if (!m) { unparseableLines.push(line); continue; }
      const count = parseInt(m[1]!, 10);
      const cardName = m[2]!.trim();
      if (section === 'deck') entries.push({ count, name: cardName });
      else sideboardCount += count;
    }
  }

  return { name, entries, sideboardCount, unparseableLines };
}
```

- [ ] **Step 4: Re-run the test and confirm it passes**

```bash
cd app && npm test -- src/lib/deckImport.test.ts
```

Expected: 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/deckImport.ts app/src/lib/deckImport.test.ts
git commit -m "$(cat <<'EOF'
feat(app): add Arena deck-format parser (parseArenaDeck)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: `resolveImport` (name → oracleId resolver)

**Files:**
- Modify: `app/src/lib/deckImport.ts`
- Modify: `app/src/lib/deckImport.test.ts`

Builds a `Map<lowercase-name, oracleId>` from the card index, then for each parsed entry either resolves exactly, falls back to the multi-face front-face prefix (`"<entry> // "`), or routes the entry into `unknown`.

- [ ] **Step 1: Extend the test file**

Append to `app/src/lib/deckImport.test.ts`:

```typescript
import { resolveImport } from './deckImport';
import type { Card } from '@shared/types';

function makeCard(oracleId: string, name: string): Card {
  return {
    oracleId, name, set: 'tst', printings: ['tst'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [],
    typeLine: '', types: [], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null,
    rarity: 'common', imageUrl: '', tags: [],
  };
}

const FIXTURE_CARDS = new Map<string, Card>([
  ['swamp-id', makeCard('swamp-id', 'Swamp')],
  ['bolt-id',  makeCard('bolt-id',  'Lightning Bolt')],
  ['dfc-id',   makeCard('dfc-id',   'Aquatic Alchemist // Bubble Up')],
]);

describe('resolveImport', () => {
  it('resolves an exact name (case-insensitive)', () => {
    const parsed = parseArenaDeck('Deck\n4 lightning bolt');
    const r = resolveImport(parsed, FIXTURE_CARDS);
    expect(r.resolved).toEqual([{ oracleId: 'bolt-id', count: 4, name: 'Lightning Bolt' }]);
    expect(r.unknown).toEqual([]);
  });

  it('resolves a basic land', () => {
    const parsed = parseArenaDeck('Deck\n5 Swamp');
    const r = resolveImport(parsed, FIXTURE_CARDS);
    expect(r.resolved).toEqual([{ oracleId: 'swamp-id', count: 5, name: 'Swamp' }]);
  });

  it('resolves a multi-face card given only the front-face name', () => {
    const parsed = parseArenaDeck('Deck\n2 Aquatic Alchemist');
    const r = resolveImport(parsed, FIXTURE_CARDS);
    expect(r.resolved).toEqual([
      { oracleId: 'dfc-id', count: 2, name: 'Aquatic Alchemist // Bubble Up' },
    ]);
  });

  it('still resolves a multi-face card given the full "A // B" name', () => {
    const parsed = parseArenaDeck('Deck\n1 Aquatic Alchemist // Bubble Up');
    const r = resolveImport(parsed, FIXTURE_CARDS);
    expect(r.resolved[0]?.oracleId).toBe('dfc-id');
  });

  it('routes truly unknown names into the unknown list', () => {
    const parsed = parseArenaDeck('Deck\n4 Tarmogoyf\n2 Lightning Bolt');
    const r = resolveImport(parsed, FIXTURE_CARDS);
    expect(r.resolved).toEqual([{ oracleId: 'bolt-id', count: 2, name: 'Lightning Bolt' }]);
    expect(r.unknown).toEqual([{ count: 4, name: 'Tarmogoyf' }]);
  });

  it('passes sideboardCount and unparseableLines through unchanged', () => {
    const parsed = parseArenaDeck('Deck\nasdf\n4 Swamp\n\nSideboard\n2 Lightning Bolt');
    const r = resolveImport(parsed, FIXTURE_CARDS);
    expect(r.sideboardCount).toBe(2);
    expect(r.unparseableLines).toEqual(['asdf']);
  });
});
```

- [ ] **Step 2: Run the failing tests**

```bash
cd app && npm test -- src/lib/deckImport.test.ts
```

Expected: 6 new failures, "resolveImport is not exported".

- [ ] **Step 3: Implement the resolver**

Append to `app/src/lib/deckImport.ts`:

```typescript
import type { Card } from '@shared/types';

export type ResolvedEntry = { oracleId: string; count: number; name: string };

export type ImportResult = {
  resolved: ResolvedEntry[];
  unknown: ImportEntry[];
  sideboardCount: number;
  unparseableLines: string[];
};

const DFC_SEPARATOR = ' // ';

export function resolveImport(parsed: ParsedDeck, cards: Map<string, Card>): ImportResult {
  // Build the lookup once per call. Imports are rare; the artifact is loaded
  // once at startup. Caching across calls isn't worth the extra plumbing.
  const exactByLower = new Map<string, { oracleId: string; canonicalName: string }>();
  const frontFaceByLower = new Map<string, { oracleId: string; canonicalName: string }>();
  for (const card of cards.values()) {
    const lower = card.name.toLowerCase();
    exactByLower.set(lower, { oracleId: card.oracleId, canonicalName: card.name });
    const sepIdx = card.name.indexOf(DFC_SEPARATOR);
    if (sepIdx !== -1) {
      const front = card.name.slice(0, sepIdx).toLowerCase();
      // First-write-wins: with zero name collisions this can't realistically
      // collide, but be defensive in case the artifact later contains them.
      if (!frontFaceByLower.has(front)) {
        frontFaceByLower.set(front, { oracleId: card.oracleId, canonicalName: card.name });
      }
    }
  }

  const resolved: ResolvedEntry[] = [];
  const unknown: ImportEntry[] = [];
  for (const entry of parsed.entries) {
    const lower = entry.name.toLowerCase();
    const hit = exactByLower.get(lower) ?? frontFaceByLower.get(lower);
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

- [ ] **Step 4: Re-run the tests**

```bash
cd app && npm test -- src/lib/deckImport.test.ts
```

Expected: all 15 tests in the file pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/deckImport.ts app/src/lib/deckImport.test.ts
git commit -m "$(cat <<'EOF'
feat(app): add resolveImport — match parsed names against the card index

Includes a multi-face front-face fallback (Arena sometimes exports DFCs as
just the front name; the artifact stores them as "Front // Back").

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Replace `deckToText` with `deckToArenaText`

**Files:**
- Modify: `app/src/lib/deckExport.ts`
- Modify: `app/src/lib/deckExport.test.ts`
- Modify: `app/src/components/DeckPanel.tsx` (single import + single call site)

- [ ] **Step 1: Update the test file**

Replace the contents of `app/src/lib/deckExport.test.ts` with:

```typescript
import { describe, it, expect } from 'vitest';
import { deckToArenaText } from './deckExport';
import type { Card } from '@shared/types';
import type { Deck } from './db';

const cards = new Map<string, Card>([
  ['a', { oracleId: 'a', name: 'Lightning Bolt', set: 't', printings: ['t'], collectorNumber: '1', manaCost: '{R}', cmc: 1, colors: ['R'], colorIdentity: ['R'], typeLine: 'Instant', types: ['Instant'], subtypes: [], supertypes: [], oracleText: '', keywords: [], power: null, toughness: null, rarity: 'common', imageUrl: '', tags: [] }],
  ['b', { oracleId: 'b', name: 'Counterspell', set: 't', printings: ['t'], collectorNumber: '2', manaCost: '{U}{U}', cmc: 2, colors: ['U'], colorIdentity: ['U'], typeLine: 'Instant', types: ['Instant'], subtypes: [], supertypes: [], oracleText: '', keywords: [], power: null, toughness: null, rarity: 'common', imageUrl: '', tags: [] }],
  ['c', { oracleId: 'c', name: 'Aquatic Alchemist // Bubble Up', set: 't', printings: ['t'], collectorNumber: '3', manaCost: '{U}', cmc: 1, colors: ['U'], colorIdentity: ['U'], typeLine: 'Creature — Merfolk Wizard', types: ['Creature'], subtypes: ['Merfolk', 'Wizard'], supertypes: [], oracleText: '', keywords: [], power: '1', toughness: '1', rarity: 'common', imageUrl: '', tags: [] }],
]);

const deck: Deck = {
  id: 'd', name: 'My Deck', format: 'standard',
  cards: [{ oracleId: 'a', count: 4 }, { oracleId: 'b', count: 2 }],
  createdAt: 0, updatedAt: 0,
};

describe('deckToArenaText', () => {
  it('emits the canonical About/Deck format with card lines in insertion order', () => {
    expect(deckToArenaText(deck, cards)).toBe(
      'About\nName My Deck\n\nDeck\n4 Lightning Bolt\n2 Counterspell',
    );
  });

  it('skips entries whose oracleId is not in the card index', () => {
    const d: Deck = { ...deck, cards: [...deck.cards, { oracleId: 'missing', count: 1 }] };
    expect(deckToArenaText(d, cards)).toBe(
      'About\nName My Deck\n\nDeck\n4 Lightning Bolt\n2 Counterspell',
    );
  });

  it('emits multi-face cards with the full "Front // Back" name', () => {
    const d: Deck = { ...deck, name: 'DFC test', cards: [{ oracleId: 'c', count: 3 }] };
    expect(deckToArenaText(d, cards)).toBe(
      'About\nName DFC test\n\nDeck\n3 Aquatic Alchemist // Bubble Up',
    );
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
cd app && npm test -- src/lib/deckExport.test.ts
```

Expected: import error — `deckToArenaText` doesn't exist.

- [ ] **Step 3: Rewrite the module**

Replace the contents of `app/src/lib/deckExport.ts` with:

```typescript
import type { Card } from '@shared/types';
import type { Deck } from './db';

export function deckToArenaText(deck: Deck, cards: Map<string, Card>): string {
  const cardLines = deck.cards
    .map((entry) => {
      const card = cards.get(entry.oracleId);
      if (!card) return null;
      return `${entry.count} ${card.name}`;
    })
    .filter((line): line is string => line !== null);

  return `About\nName ${deck.name}\n\nDeck\n${cardLines.join('\n')}`;
}
```

- [ ] **Step 4: Migrate the sole caller in DeckPanel**

In `app/src/components/DeckPanel.tsx`, change the import on line 11:

```typescript
import { deckToArenaText } from '../lib/deckExport';
```

and the call site at line 122:

```typescript
onClick={() => navigator.clipboard.writeText(deckToArenaText(deck, cards))}
```

(Label stays "Copy as text" for now — Task 11 renames it to "Export" once the toast lands.)

- [ ] **Step 5: Re-run the export tests + the app build**

```bash
cd app && npm test -- src/lib/deckExport.test.ts && npm run build
```

Expected: deckExport tests pass, `vite build` succeeds (no TS errors from the dangling reference).

- [ ] **Step 6: Commit**

```bash
git add app/src/lib/deckExport.ts app/src/lib/deckExport.test.ts app/src/components/DeckPanel.tsx
git commit -m "$(cat <<'EOF'
feat(app): emit full Arena format from deckToArenaText (replaces deckToText)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: `toastStore` + `Toast` component

**Files:**
- Create: `app/src/stores/toastStore.ts`
- Create: `app/src/components/Toast.tsx`

One global slot, last-write-wins. The component reads the slot, sets a timeout, and clears the slot when the timeout fires or the user clicks the toast.

- [ ] **Step 1: Write the store**

```typescript
// app/src/stores/toastStore.ts
import { create } from 'zustand';

type ToastState = {
  message: string | null;
  show: (message: string) => void;
  dismiss: () => void;
};

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  show: (message) => set({ message }),
  dismiss: () => set({ message: null }),
}));
```

- [ ] **Step 2: Write the component**

```typescript
// app/src/components/Toast.tsx
import { useEffect } from 'react';
import { useToastStore } from '../stores/toastStore';

const AUTO_DISMISS_MS = 2500;

export default function Toast() {
  const message = useToastStore((s) => s.message);
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => window.clearTimeout(id);
  }, [message, dismiss]);

  if (!message) return null;

  return (
    <div
      role="status"
      onClick={dismiss}
      className="fixed bottom-4 right-4 z-50 cursor-pointer rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 shadow-lg"
    >
      {message}
    </div>
  );
}
```

- [ ] **Step 3: Smoke-test via build**

The component is exercised in Task 9's `DecksPage` test. No standalone unit test for it — it's a thin wrapper.

```bash
cd app && npm run build
```

Expected: build passes.

- [ ] **Step 4: Commit**

```bash
git add app/src/stores/toastStore.ts app/src/components/Toast.tsx
git commit -m "$(cat <<'EOF'
feat(app): add minimal Toast + toastStore (auto-dismiss, single slot)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: `importSummaryStore`

**Files:**
- Create: `app/src/stores/importSummaryStore.ts`

One-slot store carrying the most recent `ImportResult` from `DecksPage` → `DeckPage`. `DeckPage` reads it on mount and calls `clear()`.

- [ ] **Step 1: Write the store**

```typescript
// app/src/stores/importSummaryStore.ts
import { create } from 'zustand';
import type { ImportResult } from '../lib/deckImport';

type ImportSummaryState = {
  result: ImportResult | null;
  set: (result: ImportResult) => void;
  clear: () => void;
};

export const useImportSummaryStore = create<ImportSummaryState>((set) => ({
  result: null,
  set: (result) => set({ result }),
  clear: () => set({ result: null }),
}));
```

- [ ] **Step 2: Smoke-test via build**

```bash
cd app && npm run build
```

Expected: build passes.

- [ ] **Step 3: Commit**

```bash
git add app/src/stores/importSummaryStore.ts
git commit -m "$(cat <<'EOF'
feat(app): add importSummaryStore for the post-import inline panel

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: `importDeck` action on `deckStore`

**Files:**
- Modify: `app/src/stores/deckStore.ts`
- Modify: `app/src/stores/deckStore.test.ts`

Adds one action that mirrors how `createDeck` persists, but seeds the deck's `cards` from a `ResolvedEntry[]` and uses either the provided name or `"Imported deck N"` (the `Untitled Deck N` pattern from `DecksPage.tsx:46`).

- [ ] **Step 1: Add failing tests**

Append to `app/src/stores/deckStore.test.ts`:

```typescript
import type { ResolvedEntry } from '../lib/deckImport';

describe('importDeck', () => {
  it('creates a deck from resolved entries and sets it active', async () => {
    const entries: ResolvedEntry[] = [
      { oracleId: 'a', count: 4, name: 'Lightning Bolt' },
      { oracleId: 'b', count: 2, name: 'Counterspell' },
    ];
    const id = await useDeckStore.getState().importDeck('From Arena', entries);
    const deck = useDeckStore.getState().decks.find((d) => d.id === id)!;
    expect(deck.name).toBe('From Arena');
    expect(deck.cards).toEqual([
      { oracleId: 'a', count: 4, name: 'Lightning Bolt' },
      { oracleId: 'b', count: 2, name: 'Counterspell' },
    ]);
    expect(useDeckStore.getState().activeDeckId).toBe(id);
  });

  it('defaults to "Imported deck N" when no name is provided', async () => {
    await useDeckStore.getState().createDeck('Existing');
    const id = await useDeckStore.getState().importDeck(null, [
      { oracleId: 'a', count: 1, name: 'Lightning Bolt' },
    ]);
    const deck = useDeckStore.getState().decks.find((d) => d.id === id)!;
    expect(deck.name).toBe('Imported deck 2');
  });
});
```

- [ ] **Step 2: Run and confirm failures**

```bash
cd app && npm test -- src/stores/deckStore.test.ts
```

Expected: type errors — `importDeck` doesn't exist on the store.

- [ ] **Step 3: Add the action**

In `app/src/stores/deckStore.ts`:

Add the import near the top:

```typescript
import type { ResolvedEntry } from '../lib/deckImport';
```

Add to the `DeckState` type:

```typescript
  importDeck: (name: string | null, resolved: ResolvedEntry[]) => Promise<string>;
```

Add the implementation alongside `createDeck` (above `setActiveDeck`):

```typescript
  importDeck: async (name, resolved) => {
    const now = Date.now();
    const finalName = name ?? `Imported deck ${get().decks.length + 1}`;
    const deck: Deck = {
      id: newId(), name: finalName, format: 'standard',
      cards: resolved.map((e) => ({ oracleId: e.oracleId, count: e.count, name: e.name })),
      createdAt: now, updatedAt: now,
    };
    await persist(deck);
    writeActiveDeckId(deck.id);
    set({ decks: [...get().decks, deck], activeDeckId: deck.id });
    return deck.id;
  },
```

- [ ] **Step 4: Re-run the tests**

```bash
cd app && npm test -- src/stores/deckStore.test.ts
```

Expected: all tests in the file pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/stores/deckStore.ts app/src/stores/deckStore.test.ts
git commit -m "$(cat <<'EOF'
feat(app): add deckStore.importDeck action for Arena imports

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: `ImportDeckModal` component

**Files:**
- Create: `app/src/components/ImportDeckModal.tsx`
- Create: `app/src/components/ImportDeckModal.test.tsx`

The modal owns the textarea, the file-load link, the parse/resolve pipeline, the inline error display, and the success handoff (calls `importDeck`, writes the result into `importSummaryStore`, navigates to `/deck`).

- [ ] **Step 1: Write the failing test**

```typescript
// app/src/components/ImportDeckModal.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ImportDeckModal from './ImportDeckModal';
import { useDeckStore } from '../stores/deckStore';
import { useGraphStore } from '../stores/graphStore';
import { useImportSummaryStore } from '../stores/importSummaryStore';
import { db } from '../lib/db';
import type { Card } from '@shared/types';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function makeCard(id: string, name: string): Card {
  return {
    oracleId: id, name, set: 't', printings: ['t'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [],
    typeLine: '', types: [], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null,
    rarity: 'common', imageUrl: '', tags: [],
  };
}

async function setup() {
  await db.decks.clear();
  useDeckStore.setState({ decks: [], activeDeckId: null });
  useImportSummaryStore.getState().clear();
  useGraphStore.setState({
    cards: new Map([
      ['swamp', makeCard('swamp', 'Swamp')],
      ['bolt',  makeCard('bolt',  'Lightning Bolt')],
    ]),
    edges: new Map(), edgesInbound: new Map(), tagCatalog: new Map(),
    ruleVersion: 'test', status: 'ready',
  });
  mockNavigate.mockReset();
}

function renderModal(onClose = vi.fn()) {
  return render(
    <MemoryRouter>
      <ImportDeckModal onClose={onClose} />
    </MemoryRouter>,
  );
}

describe('ImportDeckModal', () => {
  beforeEach(setup);

  it('creates a deck from pasted Arena text and navigates to /deck', async () => {
    const onClose = vi.fn();
    renderModal(onClose);
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'About\nName Pasted\n\nDeck\n4 Swamp\n2 Lightning Bolt' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^import$/i }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/deck'));
    expect(onClose).toHaveBeenCalled();
    const decks = useDeckStore.getState().decks;
    expect(decks).toHaveLength(1);
    expect(decks[0]!.name).toBe('Pasted');
    expect(decks[0]!.cards.map((c) => c.oracleId)).toEqual(['swamp', 'bolt']);
  });

  it('writes the summary into importSummaryStore when there are unknown cards', async () => {
    renderModal();
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Deck\n4 Swamp\n3 Tarmogoyf' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^import$/i }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
    const summary = useImportSummaryStore.getState().result;
    expect(summary?.unknown).toEqual([{ count: 3, name: 'Tarmogoyf' }]);
  });

  it('shows an inline error and does not create a deck when no cards are found', async () => {
    renderModal();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /^import$/i }));

    expect(await screen.findByText(/no cards found/i)).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(useDeckStore.getState().decks).toHaveLength(0);
  });

  it('shows the Standard-only error when every card is unknown', async () => {
    renderModal();
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Deck\n4 Tarmogoyf\n2 Snapcaster Mage' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^import$/i }));

    expect(await screen.findByText(/only supports standard/i)).toBeInTheDocument();
    expect(useDeckStore.getState().decks).toHaveLength(0);
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    renderModal(onClose);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run and confirm it fails**

```bash
cd app && npm test -- src/components/ImportDeckModal.test.tsx
```

Expected: load error — `ImportDeckModal` doesn't exist.

- [ ] **Step 3: Implement the modal**

```typescript
// app/src/components/ImportDeckModal.tsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeckStore } from '../stores/deckStore';
import { useGraphStore } from '../stores/graphStore';
import { useImportSummaryStore } from '../stores/importSummaryStore';
import { parseArenaDeck, resolveImport } from '../lib/deckImport';

type Props = { onClose: () => void };

export default function ImportDeckModal({ onClose }: Props) {
  const cards = useGraphStore((s) => s.cards);
  const importDeck = useDeckStore((s) => s.importDeck);
  const setSummary = useImportSummaryStore((s) => s.set);
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleImport = async () => {
    const parsed = parseArenaDeck(text);
    const result = resolveImport(parsed, cards);
    if (parsed.entries.length === 0) {
      setError('No cards found. Paste an Arena-format decklist.');
      return;
    }
    if (result.resolved.length === 0) {
      setError(
        `None of the ${parsed.entries.length} cards are in our Standard set. mtg-graph currently only supports Standard.`,
      );
      return;
    }
    await importDeck(parsed.name, result.resolved);
    if (
      result.unknown.length > 0 ||
      result.sideboardCount > 0 ||
      result.unparseableLines.length > 0
    ) {
      setSummary(result);
    }
    onClose();
    navigate('/deck');
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const out = reader.result;
      if (typeof out === 'string') setText(out);
    };
    reader.onerror = () => setError("Couldn't read file.");
    reader.readAsText(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-[36rem] max-w-[90vw] rounded-lg border border-neutral-700 bg-neutral-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-deck-title"
      >
        <h3 id="import-deck-title" className="text-lg font-semibold">
          Import deck
        </h3>
        <p className="mt-1 text-xs text-neutral-400">
          Paste an MTG Arena-format decklist, or load it from a .txt file.
        </p>
        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setError(null); }}
          rows={12}
          className="mt-3 w-full rounded border border-neutral-700 bg-neutral-950 p-2 font-mono text-xs text-neutral-100"
          placeholder={'About\nName My Deck\n\nDeck\n4 Lightning Bolt\n…'}
        />
        <div className="mt-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs text-amber-400 hover:underline"
          >
            Load from file…
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,text/plain"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = '';
            }}
          />
        </div>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded border border-neutral-700 px-3 py-1 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            className="rounded bg-amber-500 px-3 py-1 text-sm font-semibold text-black hover:bg-amber-400"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Re-run the test**

```bash
cd app && npm test -- src/components/ImportDeckModal.test.tsx
```

Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/ImportDeckModal.tsx app/src/components/ImportDeckModal.test.tsx
git commit -m "$(cat <<'EOF'
feat(app): add ImportDeckModal (paste/file → parse → resolve → import)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: `ImportSummary` component

**Files:**
- Create: `app/src/components/ImportSummary.tsx`

A dismissible panel that reads from `importSummaryStore` and renders only when there's a payload. Mounts on `DeckPage` (Task 10 wires it).

- [ ] **Step 1: Write the component**

```typescript
// app/src/components/ImportSummary.tsx
import { useImportSummaryStore } from '../stores/importSummaryStore';

export default function ImportSummary() {
  const result = useImportSummaryStore((s) => s.result);
  const clear = useImportSummaryStore((s) => s.clear);

  if (!result) return null;

  const importedCount = result.resolved.reduce((s, e) => s + e.count, 0);
  const totalParsed = importedCount + result.unknown.reduce((s, e) => s + e.count, 0);

  return (
    <div
      role="status"
      className="m-4 rounded border border-amber-700/50 bg-amber-900/20 p-3 text-sm text-amber-100"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold">Imported {importedCount} of {totalParsed} cards.</p>
        <button
          onClick={clear}
          aria-label="Dismiss import summary"
          className="text-amber-300 hover:text-amber-100"
        >
          ×
        </button>
      </div>
      {result.unknown.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer">
            {result.unknown.reduce((s, e) => s + e.count, 0)} cards skipped — not in Standard.
            mtg-graph currently only supports Standard.
          </summary>
          <ul className="mt-1 list-disc pl-5 text-xs text-amber-200">
            {result.unknown.map((e, i) => (
              <li key={i}>{e.count} {e.name}</li>
            ))}
          </ul>
        </details>
      )}
      {result.sideboardCount > 0 && (
        <p className="mt-2 text-xs text-amber-200">
          {result.sideboardCount} sideboard cards skipped — sideboards aren't supported yet.
        </p>
      )}
      {result.unparseableLines.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-amber-200">
            {result.unparseableLines.length} unparseable lines skipped.
          </summary>
          <ul className="mt-1 list-disc pl-5 font-mono text-xs text-amber-200">
            {result.unparseableLines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Smoke-test via build**

The component is exercised end-to-end in Task 7's modal tests via the store and visually in dev. No standalone test.

```bash
cd app && npm run build
```

Expected: build passes.

- [ ] **Step 3: Commit**

```bash
git add app/src/components/ImportSummary.tsx
git commit -m "$(cat <<'EOF'
feat(app): add ImportSummary panel for post-import skipped-card report

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Wire `DecksPage` — Import button, per-row Export, toast mount

**Files:**
- Modify: `app/src/pages/DecksPage.tsx`
- Modify: `app/src/pages/DecksPage.test.tsx`

- [ ] **Step 1: Add failing tests**

Append to `app/src/pages/DecksPage.test.tsx`:

```typescript
import { useToastStore } from '../stores/toastStore';

describe('DecksPage import/export', () => {
  beforeEach(setup);
  beforeEach(() => {
    useToastStore.getState().dismiss();
  });

  it('opens the import modal when "Import" is clicked', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /import/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /import deck/i })).toBeInTheDocument();
  });

  it('row Export button copies Arena-format text to the clipboard and does not open the deck', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true, value: { writeText },
    });
    const id = await useDeckStore.getState().createDeck('Exportable');
    await useDeckStore.getState().setActiveDeck(id);
    await useDeckStore.getState().addCard('a', 4, 'a');

    renderPage();
    const exportButtons = screen.getAllByRole('button', { name: /export/i });
    fireEvent.click(exportButtons[0]!);

    await waitFor(() => expect(writeText).toHaveBeenCalled());
    const arg = writeText.mock.calls[0]![0] as string;
    expect(arg).toContain('About\nName Exportable\n\nDeck\n4 a');
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(useToastStore.getState().message).toMatch(/copied/i);
  });
});
```

- [ ] **Step 2: Run and confirm failures**

```bash
cd app && npm test -- src/pages/DecksPage.test.tsx
```

Expected: failures — no Import button, no Export button.

- [ ] **Step 3: Wire up `DecksPage`**

Replace `app/src/pages/DecksPage.tsx` with:

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeckStore } from '../stores/deckStore';
import { useGraphStore } from '../stores/graphStore';
import { useToastStore } from '../stores/toastStore';
import ConfirmModal from '../components/ConfirmModal';
import ImportDeckModal from '../components/ImportDeckModal';
import Toast from '../components/Toast';
import ManaCost from '../components/ManaCost';
import { deckColors } from '../lib/deckColors';
import { deckToArenaText } from '../lib/deckExport';
import { relativeTime } from '../lib/relativeTime';
import type { Color } from '@shared/types';
import type { Deck } from '../lib/db';

const COLOR_HEX: Record<Color, string> = {
  W: '#f4eecf',
  U: '#9bbedb',
  B: '#3a3a3a',
  R: '#e89a85',
  G: '#8ec78a',
};

function bandGradient(colors: Color[]): string {
  if (colors.length === 0) return '#444';
  if (colors.length === 1) return COLOR_HEX[colors[0]!];
  const stops = colors.map((c, i) => {
    const pct = (i / (colors.length - 1)) * 100;
    return `${COLOR_HEX[c]} ${pct}%`;
  });
  return `linear-gradient(180deg, ${stops.join(', ')})`;
}

function manaSymbolString(colors: Color[]): string {
  return colors.map((c) => `{${c}}`).join('');
}

export default function DecksPage() {
  const decks = useDeckStore((s) => s.decks);
  const activeDeckId = useDeckStore((s) => s.activeDeckId);
  const setActiveDeck = useDeckStore((s) => s.setActiveDeck);
  const createDeck = useDeckStore((s) => s.createDeck);
  const deleteDeck = useDeckStore((s) => s.deleteDeck);
  const renameDeck = useDeckStore((s) => s.renameDeck);
  const cards = useGraphStore((s) => s.cards);
  const showToast = useToastStore((s) => s.show);
  const navigate = useNavigate();
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const handleCreate = async () => {
    await createDeck(`Untitled Deck ${decks.length + 1}`);
    navigate('/deck');
  };

  const openDeck = (id: string) => {
    setActiveDeck(id);
    navigate('/deck');
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await deleteDeck(pendingDelete.id);
    setPendingDelete(null);
  };

  const exportDeck = async (deck: Deck) => {
    const text = deckToArenaText(deck, cards);
    try {
      await navigator.clipboard.writeText(text);
      const total = deck.cards.reduce((s, c) => s + c.count, 0);
      showToast(`Copied "${deck.name}" (${total} cards)`);
    } catch {
      showToast('Copy failed. Select the text and copy manually.');
    }
  };

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Decks</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setImportOpen(true)}
            className="rounded border border-neutral-700 px-3 py-1 text-sm"
          >
            Import
          </button>
          <button onClick={handleCreate} className="rounded bg-amber-500 px-3 py-1 text-black">
            New deck
          </button>
        </div>
      </div>
      <ul className="space-y-2">
        {decks.length === 0 && <li className="py-4 text-neutral-500">No decks yet.</li>}
        {decks.map((d) => {
          const colors = deckColors(d, cards);
          const total = d.cards.reduce((s, c) => s + c.count, 0);
          const isActive = activeDeckId === d.id;
          const isEditing = editingId === d.id;
          return (
            <li
              key={d.id}
              onClick={() => !isEditing && openDeck(d.id)}
              className="flex cursor-pointer overflow-hidden rounded border border-neutral-800 bg-neutral-950 transition-colors hover:border-neutral-600"
            >
              <div className="w-1 self-stretch" style={{ background: bandGradient(colors) }} />
              <div className="flex flex-1 items-center gap-3 px-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <input
                        autoFocus
                        defaultValue={d.name}
                        onClick={(e) => e.stopPropagation()}
                        onBlur={(e) => {
                          if (e.target.value.trim() && e.target.value !== d.name) {
                            renameDeck(d.id, e.target.value.trim());
                          }
                          setEditingId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="bg-neutral-900 px-1 text-sm font-semibold"
                      />
                    ) : (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(d.id);
                        }}
                        className="cursor-text text-sm font-semibold hover:underline"
                      >
                        {d.name}
                      </span>
                    )}
                    {isActive && (
                      <span className="rounded bg-amber-900 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-neutral-400">
                    <ManaCost cost={manaSymbolString(colors)} />
                    <span>· {total} cards · updated {relativeTime(d.updatedAt)}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    exportDeck(d);
                  }}
                  className="rounded border border-neutral-700 px-2 py-1 text-sm text-neutral-300 hover:border-neutral-500"
                >
                  Export
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPendingDelete({ id: d.id, name: d.name });
                  }}
                  className="rounded border border-neutral-700 px-2 py-1 text-sm text-red-400 hover:border-red-500"
                >
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {pendingDelete && (
        <ConfirmModal
          title="Delete deck?"
          message={
            <>
              Delete <span className="font-semibold text-neutral-100">{pendingDelete.name}</span>?
              This cannot be undone.
            </>
          }
          confirmLabel="Delete"
          destructive
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
      {importOpen && <ImportDeckModal onClose={() => setImportOpen(false)} />}
      <Toast />
    </div>
  );
}
```

- [ ] **Step 4: Re-run the tests**

```bash
cd app && npm test -- src/pages/DecksPage.test.tsx
```

Expected: all tests pass — both the existing ones and the two new import/export ones.

- [ ] **Step 5: Commit**

```bash
git add app/src/pages/DecksPage.tsx app/src/pages/DecksPage.test.tsx
git commit -m "$(cat <<'EOF'
feat(app): wire Import + per-row Export buttons on DecksPage

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Wire `DeckPage` to render `ImportSummary`

**Files:**
- Modify: `app/src/pages/DeckPage.tsx`

- [ ] **Step 1: Add `<ImportSummary />` above the deck list**

Replace `app/src/pages/DeckPage.tsx` with:

```typescript
import { useState } from 'react';
import { Link } from 'react-router-dom';
import BrowserShell from '../components/BrowserShell';
import DeckPanel from '../components/DeckPanel';
import ImportSummary from '../components/ImportSummary';
import type { Filter } from '../lib/filter';

export default function DeckPage() {
  const [filter, setFilter] = useState<Filter>({});

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
    </div>
  );
}
```

- [ ] **Step 2: Smoke-test via build**

```bash
cd app && npm run build
```

Expected: build passes.

- [ ] **Step 3: Commit**

```bash
git add app/src/pages/DeckPage.tsx
git commit -m "$(cat <<'EOF'
feat(app): render ImportSummary panel on DeckPage after Arena import

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Upgrade `DeckPanel` — rename "Copy as text" to "Export", show toast

**Files:**
- Modify: `app/src/components/DeckPanel.tsx`

- [ ] **Step 1: Import the toast store and add a handler**

Near the top of `DeckPanel.tsx`, add to the imports block:

```typescript
import { useToastStore } from '../stores/toastStore';
```

Inside the `DeckPanel` component, near the other store calls:

```typescript
const showToast = useToastStore((s) => s.show);
```

- [ ] **Step 2: Replace the export button (line 121-126 of the current file)**

Replace the existing button:

```typescript
<button
  onClick={() => navigator.clipboard.writeText(deckToArenaText(deck, cards))}
  className="mt-1 text-xs text-amber-400 hover:underline"
>
  Copy as text
</button>
```

with:

```typescript
<button
  onClick={async () => {
    const text = deckToArenaText(deck, cards);
    try {
      await navigator.clipboard.writeText(text);
      showToast(`Copied "${deck.name}" (${total} cards)`);
    } catch {
      showToast('Copy failed. Select the text and copy manually.');
    }
  }}
  className="mt-1 text-xs text-amber-400 hover:underline"
>
  Export
</button>
```

(`total` is already in scope at line 66 of `DeckPanel.tsx`.)

- [ ] **Step 3: Mount `<Toast />` on `DeckPage` and `DeckGraphPage`**

The toast component lives globally in `Toast.tsx`. It's already mounted on `DecksPage`. We need it on `DeckPage` and `DeckGraphPage` too so the toast is visible after clicking Export from `DeckPanel`.

In `app/src/pages/DeckPage.tsx`, add the import:

```typescript
import Toast from '../components/Toast';
```

and add `<Toast />` as the last child of the outer `<div className="flex h-full flex-col">`:

```typescript
      <div className="min-h-0 flex-1">
        <BrowserShell
          filter={filter}
          onFilterChange={setFilter}
          rightRail={({ onCardClick }) => <DeckPanel onCardClick={onCardClick} />}
        />
      </div>
      <Toast />
    </div>
```

In `app/src/pages/DeckGraphPage.tsx`, add the import:

```typescript
import Toast from '../components/Toast';
```

and add `<Toast />` as the last child of the outer return:

```typescript
        {selectedNode && (
          <SelectionDrawer ... />
        )}
      </div>
      <Toast />
    </div>
```

- [ ] **Step 4: Run the full app test gate to confirm nothing regressed**

```bash
cd app && npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/DeckPanel.tsx app/src/pages/DeckPage.tsx app/src/pages/DeckGraphPage.tsx
git commit -m "$(cat <<'EOF'
feat(app): rename DeckPanel "Copy as text" → "Export"; show toast feedback

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Full repo gate + manual smoke

**Files:** (none modified — verification only)

- [ ] **Step 1: Run the full repo gate**

```bash
npm test
```

Expected: pipeline + shared types pass, app vitest passes, `app/npm run build` (tsc + vite) passes. This is the canonical pre-merge gate from `CLAUDE.md`.

- [ ] **Step 2: Manual smoke in the dev server**

Pre-requisite: the artifact must exist. If `app/public/data/cards-standard.json` is missing, run from repo root:

```bash
npm run build:cards -- --standard
```

Then start the dev server:

```bash
cd app && npm run dev
```

In a browser at `http://localhost:5173`:

1. **Decks page → Import**: click Import. Paste Example 1 from the source spec. Click Import. Expect: navigation to `/deck`, a deck named "4-Color Dinosaurs" appears in the rail, no `ImportSummary` panel (all cards should resolve since the example is Standard).
2. **Decks page → Export per-row**: back on `/decks`, click Export on a deck row. Expect: bottom-right toast `Copied "<deck name>" (N cards)`; clipboard contains the full `About`/`Deck` text.
3. **DeckPanel Export**: on `/deck` with a loaded deck, click "Export" in the rail. Expect: same toast + clipboard.
4. **Unknown-card path**: from Decks page, Import. Paste `Deck\n4 Tarmogoyf\n2 Swamp`. Expect: deck created with just Swamp; `ImportSummary` panel appears on DeckPage showing "1 cards skipped" (i.e. 4 copies of Tarmogoyf). Click `×` to dismiss.
5. **All-unknown path**: Import `Deck\n4 Tarmogoyf`. Expect: inline error in the modal mentioning Standard-only; no deck created.
6. **Empty path**: Import with the textarea empty. Expect: inline "No cards found" error; no deck created.
7. **File load**: save Example 2 as a `.txt` file, click "Load from file…", pick the file. Expect: textarea populates; Import proceeds normally.

If any step fails, fix it before committing any leftover changes; the manual gate is the last line of defense before declaring the feature done.

- [ ] **Step 3: No commit unless step 2 surfaced a fix**

This task is verification, not change.

---

## Self-review checklist (post-write, pre-handoff)

- [x] Every spec section maps to at least one task:
  - Format → Tasks 1, 3
  - Library code → Tasks 1, 2, 3
  - Store API → Task 6
  - UI changes (`DecksPage`, `DeckPanel`, `ImportDeckModal`, `ImportSummary`, `Toast`) → Tasks 7, 8, 9, 10, 11
  - Edge cases & errors → covered by tests in Tasks 1, 2, 7
  - Testing — Unit + Component → Tasks 1, 2, 3, 6, 7, 9
- [x] No `TBD` / `TODO` / "implement appropriate X" placeholders.
- [x] Every function/property reference is defined in the same or an earlier task: `parseArenaDeck` (T1) → `resolveImport` (T2) → `deckToArenaText` (T3) → `useToastStore` / `Toast` (T4) → `useImportSummaryStore` (T5) → `importDeck` (T6) → `ImportDeckModal` (T7) → `ImportSummary` (T8) → `DecksPage` wiring (T9) → `DeckPage` wiring (T10) → `DeckPanel` upgrade (T11) → full gate (T12).
- [x] Each task ends in a commit with a conventional-style message matching the recent git log.
