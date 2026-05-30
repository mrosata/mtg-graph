# Collapsible Deck Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 72px collapsed mode to the right-side `DeckPanel` on the `DeckPage` route, showing total count, type pills, mini mana curve, and WUBRG pip distribution. Choice persists via `localStorage`; clicking a type pill expands and scrolls to the matching section.

**Architecture:** `DeckPanel` owns its own width and collapse state. Existing rendering becomes the expanded branch; a new sibling `DeckPanelCollapsed` renders the sliver. Both consume the same pure stats helpers (`deckStats.ts`) so derived numbers are computed once. Persistence via a small `useDeckPanelCollapsed` hook around `localStorage`.

**Tech Stack:** React 18 + TypeScript + Tailwind, Vitest + jsdom + React Testing Library, Zustand stores, `mana-font` CSS classes (already in `package.json`).

**Spec:** `docs/superpowers/specs/2026-05-22-collapsible-deck-panel-design.md`

---

## File Structure

**New files:**
- `app/src/lib/deckStats.ts` — pure stats helpers (`typeCounts`, `manaCurveBuckets`, `colorPipDistribution`)
- `app/src/lib/deckStats.test.ts` — unit tests for the helpers
- `app/src/lib/useDeckPanelCollapsed.ts` — `localStorage`-backed boolean hook
- `app/src/lib/useDeckPanelCollapsed.test.ts` — hook tests
- `app/src/components/ColorPipBar.tsx` — WUBRG stacked horizontal bar
- `app/src/components/ColorPipBar.test.tsx`
- `app/src/components/MiniManaCurve.tsx` — compact curve, no axis labels (no separate test; covered via `DeckPanelCollapsed`)
- `app/src/components/DeckPanelCollapsed.tsx` — the 72px sliver
- `app/src/components/DeckPanelCollapsed.test.tsx`

**Modified files:**
- `app/src/components/DeckPanel.tsx` — wire up collapse state + chevron + ref-map for scroll-to-section, refactor inline curve calc to use `deckStats`
- `app/src/components/DeckPanel.test.tsx` — new tests for toggle + persistence + scroll-to-section
- `app/src/pages/DeckPage.tsx` — drop `w-[360px]` from the wrapping `<div>` so `DeckPanel` owns its width

---

### Task 0: Worktree setup

**Files:** none (git operation)

- [ ] **Step 1: Create the worktree on a new branch**

Run from `/Users/Dada/mtg-graph`:
```bash
git worktree add .worktrees/collapsible-deck-panel -b feat/collapsible-deck-panel main
cd .worktrees/collapsible-deck-panel
```

Expected: new directory `.worktrees/collapsible-deck-panel` exists at the same git revision as `main`. All subsequent file paths in this plan are relative to that worktree.

- [ ] **Step 2: Verify the baseline gate is green before any edits**

Run:
```bash
npm test
```

Expected: pipeline + app vitest + `app/npm run build` all pass. If anything fails here, stop and investigate — the failure is not caused by this work.

---

### Task 1: `deckStats.typeCounts`

**Files:**
- Create: `app/src/lib/deckStats.ts`
- Test: `app/src/lib/deckStats.test.ts`

- [ ] **Step 1: Write the failing test**

Create `app/src/lib/deckStats.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { typeCounts } from './deckStats';
import type { Card } from '@shared/types';
import type { Deck } from './db';

function card(id: string, types: string[], opts: Partial<Card> = {}): Card {
  return {
    oracleId: id, name: id, set: 't', printings: ['t'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [],
    typeLine: '', types, subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null,
    rarity: 'common', imageUrl: '', tags: [],
    ...opts,
  };
}

function deck(entries: { oracleId: string; count: number }[]): Deck {
  return {
    id: 'd', name: 'd', format: 'standard',
    cards: entries, createdAt: 0, updatedAt: 0,
  };
}

describe('typeCounts', () => {
  it('returns empty object for an empty deck', () => {
    expect(typeCounts(deck([]), new Map())).toEqual({});
  });

  it('counts by primary type, respecting TYPE_ORDER', () => {
    const cards = new Map<string, Card>([
      ['bear', card('bear', ['Creature'])],
      ['bolt', card('bolt', ['Instant'])],
      ['gear', card('gear', ['Artifact', 'Creature'])], // Creature wins
    ]);
    const d = deck([
      { oracleId: 'bear', count: 4 },
      { oracleId: 'bolt', count: 3 },
      { oracleId: 'gear', count: 2 },
    ]);
    expect(typeCounts(d, cards)).toEqual({ Creature: 6, Instant: 3 });
  });

  it('skips cards missing from the map', () => {
    const cards = new Map<string, Card>([
      ['bear', card('bear', ['Creature'])],
    ]);
    const d = deck([
      { oracleId: 'bear', count: 4 },
      { oracleId: 'ghost', count: 1 },
    ]);
    expect(typeCounts(d, cards)).toEqual({ Creature: 4 });
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run from `app/`:
```bash
npx vitest run src/lib/deckStats.test.ts
```

Expected: FAIL with `Cannot find module './deckStats'`.

- [ ] **Step 3: Implement `typeCounts`**

Create `app/src/lib/deckStats.ts`:
```ts
import type { Card } from '@shared/types';
import type { Deck } from './db';

export const TYPE_ORDER = [
  'Creature',
  'Planeswalker',
  'Instant',
  'Sorcery',
  'Artifact',
  'Enchantment',
  'Battle',
  'Land',
] as const;

export type DeckType = (typeof TYPE_ORDER)[number];

function primaryType(card: Card): DeckType | null {
  for (const t of TYPE_ORDER) {
    if (card.types.includes(t)) return t;
  }
  return null;
}

export function typeCounts(
  deck: Deck,
  cards: Map<string, Card>,
): Partial<Record<DeckType, number>> {
  const out: Partial<Record<DeckType, number>> = {};
  for (const entry of deck.cards) {
    const card = cards.get(entry.oracleId);
    if (!card) continue;
    const t = primaryType(card);
    if (!t) continue;
    out[t] = (out[t] ?? 0) + entry.count;
  }
  return out;
}
```

- [ ] **Step 4: Run test, verify it passes**

Run from `app/`:
```bash
npx vitest run src/lib/deckStats.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/deckStats.ts app/src/lib/deckStats.test.ts
git commit -m "feat(deck): typeCounts helper"
```

---

### Task 2: `deckStats.manaCurveBuckets`

**Files:**
- Modify: `app/src/lib/deckStats.ts`
- Test: `app/src/lib/deckStats.test.ts`

- [ ] **Step 1: Add failing test**

Append to `app/src/lib/deckStats.test.ts` (after the existing `describe`):
```ts
import { manaCurveBuckets } from './deckStats';

describe('manaCurveBuckets', () => {
  it('returns an 8-length array of zeros for an empty deck', () => {
    expect(manaCurveBuckets(deck([]), new Map())).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('buckets non-land cards by cmc, collapsing 7+ into index 7', () => {
    const cards = new Map<string, Card>([
      ['c0', card('c0', ['Creature'], { cmc: 0 })],
      ['c3', card('c3', ['Sorcery'], { cmc: 3 })],
      ['c8', card('c8', ['Creature'], { cmc: 8 })],
      ['c9', card('c9', ['Creature'], { cmc: 9 })],
      ['land', card('land', ['Land'], { cmc: 0 })],
    ]);
    const d = deck([
      { oracleId: 'c0', count: 1 },
      { oracleId: 'c3', count: 2 },
      { oracleId: 'c8', count: 1 },
      { oracleId: 'c9', count: 1 },
      { oracleId: 'land', count: 24 }, // excluded
    ]);
    expect(manaCurveBuckets(d, cards)).toEqual([1, 0, 0, 2, 0, 0, 0, 2]);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
npx vitest run src/lib/deckStats.test.ts
```

Expected: FAIL — `manaCurveBuckets` not exported.

- [ ] **Step 3: Implement `manaCurveBuckets`**

Append to `app/src/lib/deckStats.ts`:
```ts
export function manaCurveBuckets(
  deck: Deck,
  cards: Map<string, Card>,
): number[] {
  const buckets = new Array(8).fill(0);
  for (const entry of deck.cards) {
    const card = cards.get(entry.oracleId);
    if (!card) continue;
    if (card.types.includes('Land')) continue;
    const idx = Math.min(7, card.cmc);
    buckets[idx] += entry.count;
  }
  return buckets;
}
```

- [ ] **Step 4: Run test, verify it passes**

```bash
npx vitest run src/lib/deckStats.test.ts
```

Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/deckStats.ts app/src/lib/deckStats.test.ts
git commit -m "feat(deck): manaCurveBuckets helper"
```

---

### Task 3: `deckStats.colorPipDistribution`

**Files:**
- Modify: `app/src/lib/deckStats.ts`
- Test: `app/src/lib/deckStats.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `app/src/lib/deckStats.test.ts`:
```ts
import { colorPipDistribution } from './deckStats';

describe('colorPipDistribution', () => {
  const zero = { W: 0, U: 0, B: 0, R: 0, G: 0 };

  it('returns all zeros for an empty deck', () => {
    expect(colorPipDistribution(deck([]), new Map())).toEqual(zero);
  });

  it('counts pure pips weighted by entry count', () => {
    const cards = new Map<string, Card>([
      ['bolt', card('bolt', ['Instant'], { manaCost: '{R}' })],
      ['rage', card('rage', ['Sorcery'], { manaCost: '{2}{R}{R}' })],
    ]);
    const d = deck([
      { oracleId: 'bolt', count: 4 }, // 4 R
      { oracleId: 'rage', count: 2 }, // 4 R
    ]);
    expect(colorPipDistribution(d, cards)).toEqual({ W: 0, U: 0, B: 0, R: 8, G: 0 });
  });

  it('hybrid pips contribute 0.5 to each side', () => {
    const cards = new Map<string, Card>([
      ['hybrid', card('hybrid', ['Creature'], { manaCost: '{W/U}' })],
    ]);
    const d = deck([{ oracleId: 'hybrid', count: 2 }]);
    expect(colorPipDistribution(d, cards)).toEqual({ W: 1, U: 1, B: 0, R: 0, G: 0 });
  });

  it('phyrexian pips count fully toward the color', () => {
    const cards = new Map<string, Card>([
      ['gitaxian', card('gitaxian', ['Sorcery'], { manaCost: '{U/P}' })],
    ]);
    const d = deck([{ oracleId: 'gitaxian', count: 4 }]);
    expect(colorPipDistribution(d, cards)).toEqual({ W: 0, U: 4, B: 0, R: 0, G: 0 });
  });

  it('ignores lands, colorless, and generic mana', () => {
    const cards = new Map<string, Card>([
      ['land', card('land', ['Land'], { manaCost: null })],
      ['gen', card('gen', ['Artifact'], { manaCost: '{3}{C}' })],
      ['mox', card('mox', ['Artifact'], { manaCost: null })],
    ]);
    const d = deck([
      { oracleId: 'land', count: 24 },
      { oracleId: 'gen', count: 4 },
      { oracleId: 'mox', count: 1 },
    ]);
    expect(colorPipDistribution(d, cards)).toEqual(zero);
  });

  it('2-brid pips contribute 0.5 to the colored side only', () => {
    // {2/W} can be paid with 2 generic OR 1 white. Treat as half-white per Moxfield convention.
    const cards = new Map<string, Card>([
      ['flagstones', card('flagstones', ['Creature'], { manaCost: '{2/W}{2/W}' })],
    ]);
    const d = deck([{ oracleId: 'flagstones', count: 4 }]);
    expect(colorPipDistribution(d, cards)).toEqual({ W: 4, U: 0, B: 0, R: 0, G: 0 });
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
npx vitest run src/lib/deckStats.test.ts
```

Expected: FAIL — `colorPipDistribution` not exported.

- [ ] **Step 3: Implement `colorPipDistribution`**

Append to `app/src/lib/deckStats.ts`:
```ts
import type { Color } from '@shared/types';

const WUBRG: readonly Color[] = ['W', 'U', 'B', 'R', 'G'];

function pipContribution(symbol: string): Partial<Record<Color, number>> {
  // symbol is the inside of a `{...}` token, lowercase normalized
  const s = symbol.toLowerCase();
  // Pure single color: w, u, b, r, g
  if (WUBRG.map((c) => c.toLowerCase()).includes(s)) {
    return { [s.toUpperCase() as Color]: 1 };
  }
  // Phyrexian: <color>/p
  if (/^[wubrg]\/p$/.test(s)) {
    const c = (s[0] as string).toUpperCase() as Color;
    return { [c]: 1 };
  }
  // 2-brid: 2/<color> → 0.5 to the color, generic ignored
  if (/^2\/[wubrg]$/.test(s)) {
    const c = (s[2] as string).toUpperCase() as Color;
    return { [c]: 0.5 };
  }
  // Hybrid: <color>/<color>
  if (/^[wubrg]\/[wubrg]$/.test(s)) {
    const a = (s[0] as string).toUpperCase() as Color;
    const b = (s[2] as string).toUpperCase() as Color;
    return { [a]: 0.5, [b]: 0.5 };
  }
  return {};
}

export function colorPipDistribution(
  deck: Deck,
  cards: Map<string, Card>,
): Record<Color, number> {
  const out: Record<Color, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  for (const entry of deck.cards) {
    const card = cards.get(entry.oracleId);
    if (!card) continue;
    if (card.types.includes('Land')) continue;
    if (!card.manaCost) continue;
    const tokens = card.manaCost.match(/\{[^}]+\}/g) ?? [];
    for (const token of tokens) {
      const inner = token.slice(1, -1);
      const contrib = pipContribution(inner);
      for (const c of WUBRG) {
        out[c] += (contrib[c] ?? 0) * entry.count;
      }
    }
  }
  return out;
}
```

- [ ] **Step 4: Run test, verify it passes**

```bash
npx vitest run src/lib/deckStats.test.ts
```

Expected: all 11 tests pass (3 + 2 + 6).

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/deckStats.ts app/src/lib/deckStats.test.ts
git commit -m "feat(deck): colorPipDistribution helper"
```

---

### Task 4: `useDeckPanelCollapsed` hook

**Files:**
- Create: `app/src/lib/useDeckPanelCollapsed.ts`
- Test: `app/src/lib/useDeckPanelCollapsed.test.ts`

- [ ] **Step 1: Write the failing test**

Create `app/src/lib/useDeckPanelCollapsed.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDeckPanelCollapsed, STORAGE_KEY } from './useDeckPanelCollapsed';

beforeEach(() => {
  window.localStorage.clear();
});

describe('useDeckPanelCollapsed', () => {
  it('defaults to false', () => {
    const { result } = renderHook(() => useDeckPanelCollapsed());
    expect(result.current[0]).toBe(false);
  });

  it('hydrates from localStorage', () => {
    window.localStorage.setItem(STORAGE_KEY, 'true');
    const { result } = renderHook(() => useDeckPanelCollapsed());
    expect(result.current[0]).toBe(true);
  });

  it('persists updates to localStorage', () => {
    const { result } = renderHook(() => useDeckPanelCollapsed());
    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('true');
  });

  it('persists false explicitly', () => {
    window.localStorage.setItem(STORAGE_KEY, 'true');
    const { result } = renderHook(() => useDeckPanelCollapsed());
    act(() => result.current[1](false));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('false');
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
npx vitest run src/lib/useDeckPanelCollapsed.test.ts
```

Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the hook**

Create `app/src/lib/useDeckPanelCollapsed.ts`:
```ts
import { useCallback, useState } from 'react';

export const STORAGE_KEY = 'mtg-graph:deck-panel-collapsed';

function read(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function write(value: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
  } catch {
    // ignore — private mode etc.
  }
}

export function useDeckPanelCollapsed(): readonly [boolean, (value: boolean) => void] {
  const [collapsed, setCollapsed] = useState<boolean>(read);
  const set = useCallback((value: boolean) => {
    write(value);
    setCollapsed(value);
  }, []);
  return [collapsed, set] as const;
}
```

- [ ] **Step 4: Run test, verify it passes**

```bash
npx vitest run src/lib/useDeckPanelCollapsed.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/useDeckPanelCollapsed.ts app/src/lib/useDeckPanelCollapsed.test.ts
git commit -m "feat(deck): persisted collapse-state hook"
```

---

### Task 5: `ColorPipBar` component

**Files:**
- Create: `app/src/components/ColorPipBar.tsx`
- Test: `app/src/components/ColorPipBar.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `app/src/components/ColorPipBar.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ColorPipBar from './ColorPipBar';

describe('ColorPipBar', () => {
  it('renders one segment per non-zero color', () => {
    const { container } = render(
      <ColorPipBar distribution={{ W: 0, U: 4, B: 0, R: 8, G: 0 }} />,
    );
    const segments = container.querySelectorAll('[data-color]');
    expect(segments).toHaveLength(2);
    expect(segments[0]?.getAttribute('data-color')).toBe('U');
    expect(segments[1]?.getAttribute('data-color')).toBe('R');
  });

  it('segment widths are proportional to pip counts', () => {
    const { container } = render(
      <ColorPipBar distribution={{ W: 0, U: 4, B: 0, R: 8, G: 0 }} />,
    );
    const segments = container.querySelectorAll('[data-color]');
    expect((segments[0] as HTMLElement).style.width).toBe('33.33333333333333%');
    expect((segments[1] as HTMLElement).style.width).toBe('66.66666666666666%');
  });

  it('renders a placeholder when all counts are zero', () => {
    render(<ColorPipBar distribution={{ W: 0, U: 0, B: 0, R: 0, G: 0 }} />);
    expect(screen.getByLabelText(/no colored pips/i)).toBeInTheDocument();
  });

  it('exposes a tooltip per segment via title', () => {
    const { container } = render(
      <ColorPipBar distribution={{ W: 0, U: 4, B: 0, R: 8, G: 0 }} />,
    );
    const segments = container.querySelectorAll('[data-color]');
    expect(segments[0]?.getAttribute('title')).toMatch(/Blue.*4/);
    expect(segments[1]?.getAttribute('title')).toMatch(/Red.*8/);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
npx vitest run src/components/ColorPipBar.test.tsx
```

Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `ColorPipBar`**

Create `app/src/components/ColorPipBar.tsx`:
```tsx
import type { Color } from '@shared/types';

type Props = {
  distribution: Record<Color, number>;
};

const WUBRG: Color[] = ['W', 'U', 'B', 'R', 'G'];

const COLOR_BG: Record<Color, string> = {
  W: 'bg-yellow-100',
  U: 'bg-sky-300',
  B: 'bg-neutral-800',
  R: 'bg-red-500',
  G: 'bg-green-600',
};

const COLOR_NAME: Record<Color, string> = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
};

function fmt(n: number): string {
  return n % 1 === 0 ? n.toString() : n.toFixed(1);
}

export default function ColorPipBar({ distribution }: Props) {
  const total = WUBRG.reduce((s, c) => s + distribution[c], 0);
  if (total === 0) {
    return (
      <div
        role="img"
        aria-label="No colored pips"
        className="h-3 w-full rounded-sm bg-neutral-800"
      />
    );
  }
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-sm">
      {WUBRG.filter((c) => distribution[c] > 0).map((c) => (
        <div
          key={c}
          data-color={c}
          className={COLOR_BG[c]}
          style={{ width: `${(distribution[c] / total) * 100}%` }}
          title={`${COLOR_NAME[c]}: ${fmt(distribution[c])} pips`}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test, verify it passes**

```bash
npx vitest run src/components/ColorPipBar.test.tsx
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/ColorPipBar.tsx app/src/components/ColorPipBar.test.tsx
git commit -m "feat(deck): ColorPipBar component"
```

---

### Task 6: `MiniManaCurve` component

**Files:**
- Create: `app/src/components/MiniManaCurve.tsx`

(No separate test — the component is purely presentational and will be exercised through `DeckPanelCollapsed.test.tsx`.)

- [ ] **Step 1: Create `MiniManaCurve.tsx`**

Create `app/src/components/MiniManaCurve.tsx`:
```tsx
type Props = {
  countsByCmc: number[];
  heightPx?: number;
};

export default function MiniManaCurve({ countsByCmc, heightPx = 36 }: Props) {
  const max = Math.max(1, ...countsByCmc);
  return (
    <div className="flex items-end gap-0.5" style={{ height: heightPx }}>
      {countsByCmc.map((n, i) => (
        <div
          key={i}
          data-cmc={i}
          className="w-2 bg-amber-500"
          style={{ height: Math.round((n / max) * heightPx) }}
          title={`CMC ${i === 7 ? '7+' : i}: ${n}`}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Confirm it compiles**

Run from `app/`:
```bash
npx tsc --noEmit
```

Expected: no new TS errors.

- [ ] **Step 3: Commit**

```bash
git add app/src/components/MiniManaCurve.tsx
git commit -m "feat(deck): MiniManaCurve compact renderer"
```

---

### Task 7: `DeckPanelCollapsed` component

**Files:**
- Create: `app/src/components/DeckPanelCollapsed.tsx`
- Test: `app/src/components/DeckPanelCollapsed.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `app/src/components/DeckPanelCollapsed.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DeckPanelCollapsed from './DeckPanelCollapsed';
import { useGraphStore } from '../stores/graphStore';
import { useDeckStore } from '../stores/deckStore';
import type { Card } from '@shared/types';

function card(id: string, name: string, types: string[], cmc: number, manaCost: string | null): Card {
  return {
    oracleId: id, name, set: 't', printings: ['t'], collectorNumber: '1',
    manaCost, cmc, colors: [], colorIdentity: [],
    typeLine: '', types, subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null,
    rarity: 'common', imageUrl: '', tags: [],
  };
}

beforeEach(() => {
  useGraphStore.setState({
    cards: new Map<string, Card>([
      ['bolt', card('bolt', 'Lightning Bolt', ['Instant'], 1, '{R}')],
      ['bear', card('bear', 'Grizzly Bears', ['Creature'], 2, '{1}{G}')],
      ['mountain', card('mountain', 'Mountain', ['Land'], 0, null)],
    ]),
    edges: new Map(), edgesInbound: new Map(), tagCatalog: new Map(),
    ruleVersion: 't', status: 'ready',
  });
  useDeckStore.setState({
    activeDeckId: 'd1',
    decks: [{
      id: 'd1', name: 'My Deck', format: 'standard',
      cards: [
        { oracleId: 'bolt', count: 4 },
        { oracleId: 'bear', count: 4 },
        { oracleId: 'mountain', count: 20 },
      ],
      createdAt: 0, updatedAt: 0,
    }],
  });
});

describe('DeckPanelCollapsed', () => {
  it('shows total card count with "c" suffix', () => {
    render(<DeckPanelCollapsed onExpand={() => {}} onJumpToType={() => {}} />);
    expect(screen.getByText('28c')).toBeInTheDocument();
  });

  it('renders one pill per type present in the deck', () => {
    render(<DeckPanelCollapsed onExpand={() => {}} onJumpToType={() => {}} />);
    // Letters in pills: C (creature), I (instant), L (land)
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('I')).toBeInTheDocument();
    expect(screen.getByText('L')).toBeInTheDocument();
    // counts
    expect(screen.getByText('4', { selector: '[data-type-count="Creature"]' })).toBeInTheDocument();
    expect(screen.getByText('4', { selector: '[data-type-count="Instant"]' })).toBeInTheDocument();
    expect(screen.getByText('20', { selector: '[data-type-count="Land"]' })).toBeInTheDocument();
  });

  it('calls onExpand when the chevron is clicked', () => {
    const onExpand = vi.fn();
    render(<DeckPanelCollapsed onExpand={onExpand} onJumpToType={() => {}} />);
    fireEvent.click(screen.getByLabelText(/expand deck panel/i));
    expect(onExpand).toHaveBeenCalledTimes(1);
  });

  it('calls onJumpToType with the matching type when a pill is clicked', () => {
    const onJumpToType = vi.fn();
    render(<DeckPanelCollapsed onExpand={() => {}} onJumpToType={onJumpToType} />);
    fireEvent.click(screen.getByRole('button', { name: /jump to creatures/i }));
    expect(onJumpToType).toHaveBeenCalledWith('Creature');
  });

  it('renders nothing when there is no active deck', () => {
    useDeckStore.setState({ activeDeckId: null, decks: [] });
    const { container } = render(
      <DeckPanelCollapsed onExpand={() => {}} onJumpToType={() => {}} />,
    );
    // Still renders the chevron so the user can re-expand to the empty state.
    expect(screen.getByLabelText(/expand deck panel/i)).toBeInTheDocument();
    // But no stats widgets.
    expect(container.querySelector('[data-stats]')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
npx vitest run src/components/DeckPanelCollapsed.test.tsx
```

Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `DeckPanelCollapsed`**

Create `app/src/components/DeckPanelCollapsed.tsx`:
```tsx
import { useGraphStore } from '../stores/graphStore';
import { useDeckStore } from '../stores/deckStore';
import {
  typeCounts,
  manaCurveBuckets,
  colorPipDistribution,
  TYPE_ORDER,
  type DeckType,
} from '../lib/deckStats';
import MiniManaCurve from './MiniManaCurve';
import ColorPipBar from './ColorPipBar';

type Props = {
  onExpand: () => void;
  onJumpToType: (type: DeckType) => void;
};

const TYPE_LETTER: Record<DeckType, string> = {
  Creature: 'C',
  Planeswalker: 'P',
  Instant: 'I',
  Sorcery: 'S',
  Artifact: 'A',
  Enchantment: 'E',
  Battle: 'B',
  Land: 'L',
};

const TYPE_BG: Record<DeckType, string> = {
  Creature: 'bg-emerald-700',
  Planeswalker: 'bg-purple-700',
  Instant: 'bg-sky-700',
  Sorcery: 'bg-rose-700',
  Artifact: 'bg-stone-600',
  Enchantment: 'bg-amber-700',
  Battle: 'bg-orange-700',
  Land: 'bg-neutral-700',
};

const TYPE_PLURAL: Record<DeckType, string> = {
  Creature: 'Creatures',
  Planeswalker: 'Planeswalkers',
  Instant: 'Instants',
  Sorcery: 'Sorceries',
  Artifact: 'Artifacts',
  Enchantment: 'Enchantments',
  Battle: 'Battles',
  Land: 'Lands',
};

export default function DeckPanelCollapsed({ onExpand, onJumpToType }: Props) {
  const cards = useGraphStore((s) => s.cards);
  const deck = useDeckStore((s) =>
    s.activeDeckId ? s.decks.find((d) => d.id === s.activeDeckId) ?? null : null,
  );

  const total = deck?.cards.reduce((s, c) => s + c.count, 0) ?? 0;
  const counts = deck ? typeCounts(deck, cards) : {};
  const curve = deck ? manaCurveBuckets(deck, cards) : new Array(8).fill(0);
  const colors = deck
    ? colorPipDistribution(deck, cards)
    : { W: 0, U: 0, B: 0, R: 0, G: 0 };

  return (
    <div className="flex h-full flex-col items-center gap-3 p-2">
      <button
        type="button"
        onClick={onExpand}
        aria-label="Expand deck panel"
        className="self-end text-neutral-400 hover:text-neutral-100"
      >
        ▶
      </button>

      {deck && (
        <>
          <div className="font-mono text-sm text-neutral-100">{total}c</div>

          <div data-stats className="flex w-full flex-col gap-1">
            {TYPE_ORDER.filter((t) => (counts[t] ?? 0) > 0).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onJumpToType(t)}
                aria-label={`Jump to ${TYPE_PLURAL[t].toLowerCase()}`}
                className={`flex w-full items-center justify-between rounded-sm px-1.5 py-0.5 text-xs font-mono text-neutral-100 hover:brightness-110 ${TYPE_BG[t]}`}
                title={`${TYPE_PLURAL[t]}: ${counts[t]}`}
              >
                <span>{TYPE_LETTER[t]}</span>
                <span data-type-count={t}>{counts[t]}</span>
              </button>
            ))}
          </div>

          <div className="w-full">
            <MiniManaCurve countsByCmc={curve} />
          </div>

          <div className="w-full">
            <ColorPipBar distribution={colors} />
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test, verify it passes**

```bash
npx vitest run src/components/DeckPanelCollapsed.test.tsx
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/DeckPanelCollapsed.tsx app/src/components/DeckPanelCollapsed.test.tsx
git commit -m "feat(deck): DeckPanelCollapsed sliver"
```

---

### Task 8: Wire up collapse in `DeckPanel`

**Files:**
- Modify: `app/src/components/DeckPanel.tsx`
- Modify: `app/src/components/DeckPanel.test.tsx`

- [ ] **Step 1: Add failing tests for collapse behavior**

Open `app/src/components/DeckPanel.test.tsx` and append the new test cases at the end of the file, after the existing `describe('DeckPanel', ...)` block:

```tsx
import { fireEvent } from '@testing-library/react';
import { STORAGE_KEY } from '../lib/useDeckPanelCollapsed';

describe('DeckPanel — collapse toggle', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('starts expanded by default and shows the collapse chevron', () => {
    render(<DeckPanel />);
    expect(screen.getByLabelText(/collapse deck panel/i)).toBeInTheDocument();
    expect(screen.getByText(/Instants/)).toBeInTheDocument();
  });

  it('collapses when the chevron is clicked', () => {
    render(<DeckPanel />);
    fireEvent.click(screen.getByLabelText(/collapse deck panel/i));
    expect(screen.queryByText(/Instants/)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/expand deck panel/i)).toBeInTheDocument();
  });

  it('persists the collapsed state to localStorage', () => {
    render(<DeckPanel />);
    fireEvent.click(screen.getByLabelText(/collapse deck panel/i));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('true');
  });

  it('hydrates collapsed state from localStorage', () => {
    window.localStorage.setItem(STORAGE_KEY, 'true');
    render(<DeckPanel />);
    expect(screen.getByLabelText(/expand deck panel/i)).toBeInTheDocument();
    expect(screen.queryByText(/Instants/)).not.toBeInTheDocument();
  });

  it('clicking a collapsed pill expands and scrolls to that type', () => {
    const scrollSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollSpy;
    window.localStorage.setItem(STORAGE_KEY, 'true');
    render(<DeckPanel />);
    fireEvent.click(screen.getByRole('button', { name: /jump to instants/i }));
    // expanded view is back
    expect(screen.getByLabelText(/collapse deck panel/i)).toBeInTheDocument();
    // and scrollIntoView fired (deferred via microtask, but vitest fake timers aren't on,
    // so we just check it eventually got called by yielding to the microtask queue)
    return Promise.resolve().then(() => {
      expect(scrollSpy).toHaveBeenCalled();
    });
  });
});
```

Also add this import to the top of `DeckPanel.test.tsx` next to the existing vitest imports:
```ts
import { vi } from 'vitest';
```

- [ ] **Step 2: Run test, verify failures**

```bash
npx vitest run src/components/DeckPanel.test.tsx
```

Expected: the 4 original tests still pass; the 5 new tests fail because the toggle, chevron, and jump-to behavior are not implemented yet.

- [ ] **Step 3: Refactor `DeckPanel.tsx`**

Replace the entire contents of `app/src/components/DeckPanel.tsx` with:

```tsx
import { useMemo, useRef, useState } from 'react';
import { useGraphStore } from '../stores/graphStore';
import { useDeckStore } from '../stores/deckStore';
import { deckLegality } from '../lib/legality';
import { manaCurveBuckets, TYPE_ORDER, type DeckType } from '../lib/deckStats';
import { useDeckPanelCollapsed } from '../lib/useDeckPanelCollapsed';
import ManaCurve from './ManaCurve';
import ManaCost from './ManaCost';
import DeckPanelCollapsed from './DeckPanelCollapsed';
import { deckToText } from '../lib/deckExport';

type Props = {
  onCardClick?: (oracleId: string) => void;
};

const TYPE_PLURAL: Record<DeckType, string> = {
  Creature: 'Creatures',
  Planeswalker: 'Planeswalkers',
  Instant: 'Instants',
  Sorcery: 'Sorceries',
  Artifact: 'Artifacts',
  Enchantment: 'Enchantments',
  Battle: 'Battles',
  Land: 'Lands',
};

export default function DeckPanel({ onCardClick }: Props = {}) {
  const cards = useGraphStore((s) => s.cards);
  const deck = useDeckStore((s) =>
    s.activeDeckId ? s.decks.find((d) => d.id === s.activeDeckId) ?? null : null,
  );
  const renameDeck = useDeckStore((s) => s.renameDeck);

  const [collapsed, setCollapsed] = useDeckPanelCollapsed();
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [hover, setHover] = useState<{ url: string; x: number; y: number } | null>(null);

  const sectionRefs = useRef<Partial<Record<DeckType, HTMLHeadingElement | null>>>({});

  const startEditingName = () => {
    if (!deck) return;
    setNameDraft(deck.name);
    setEditingName(true);
  };

  const commitName = async () => {
    if (deck && nameDraft.trim() && nameDraft !== deck.name) {
      await renameDeck(deck.id, nameDraft.trim());
    }
    setEditingName(false);
  };

  const grouped = useMemo(() => {
    const out: Partial<Record<DeckType | 'Unknown', { oracleId: string; count: number; name: string }[]>> = {};
    if (!deck) return out;
    for (const entry of deck.cards) {
      const card = cards.get(entry.oracleId);
      if (!card) {
        (out['Unknown'] ||= []).push({ oracleId: entry.oracleId, count: entry.count, name: entry.oracleId });
        continue;
      }
      const primary = (TYPE_ORDER.find((t) => card.types.includes(t)) ?? null) as DeckType | null;
      const bucket = primary ?? 'Unknown';
      (out[bucket] ||= []).push({ oracleId: entry.oracleId, count: entry.count, name: card.name });
    }
    return out;
  }, [deck, cards]);

  const curve = useMemo(
    () => (deck ? manaCurveBuckets(deck, cards) : new Array(8).fill(0)),
    [deck, cards],
  );

  const total = deck?.cards.reduce((s, c) => s + c.count, 0) ?? 0;
  const warnings = deck ? deckLegality(deck, cards) : [];

  const jumpToType = (type: DeckType) => {
    setCollapsed(false);
    queueMicrotask(() => {
      sectionRefs.current[type]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const widthClass = collapsed ? 'w-[72px]' : 'w-[360px]';

  if (collapsed) {
    return (
      <div className={`h-full transition-[width] duration-200 ease-out ${widthClass}`}>
        <DeckPanelCollapsed onExpand={() => setCollapsed(false)} onJumpToType={jumpToType} />
      </div>
    );
  }

  if (!deck) {
    return (
      <div className={`h-full transition-[width] duration-200 ease-out ${widthClass}`}>
        <div className="flex items-start justify-between p-4">
          <p className="text-neutral-400">No active deck. Create or select one from Decks.</p>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            aria-label="Collapse deck panel"
            className="text-neutral-400 hover:text-neutral-100"
          >
            ◀
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full transition-[width] duration-200 ease-out ${widthClass}`}>
      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {editingName ? (
              <input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={commitName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitName();
                  if (e.key === 'Escape') setEditingName(false);
                }}
                className="w-full bg-neutral-900 px-1 text-lg font-semibold"
              />
            ) : (
              <h2
                onClick={startEditingName}
                className="cursor-pointer truncate text-lg font-semibold hover:underline"
                title="Click to rename"
              >
                {deck.name}
              </h2>
            )}
            <p className="text-xs text-neutral-400">{total} cards</p>
            <button
              onClick={() => navigator.clipboard.writeText(deckToText(deck, cards))}
              className="mt-1 text-xs text-amber-400 hover:underline"
            >
              Copy as text
            </button>
          </div>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            aria-label="Collapse deck panel"
            className="shrink-0 text-neutral-400 hover:text-neutral-100"
          >
            ◀
          </button>
        </div>
        <ManaCurve countsByCmc={curve} max={Math.max(...curve)} />
        {warnings.length > 0 && (
          <ul className="space-y-1">
            {warnings.map((w, i) => (
              <li key={i} className="text-xs text-amber-300">{w.message}</li>
            ))}
          </ul>
        )}
        <div className="space-y-3">
          {TYPE_ORDER.filter((t) => grouped[t]?.length).map((t) => (
            <div key={t}>
              <h3
                ref={(el) => { sectionRefs.current[t] = el; }}
                className="text-xs uppercase tracking-wide text-neutral-400"
              >
                {TYPE_PLURAL[t]}
              </h3>
              <ul>
                {(grouped[t] ?? []).map((e) => (
                  <li
                    key={e.oracleId}
                    onMouseEnter={(ev) => {
                      const card = cards.get(e.oracleId);
                      if (card?.imageUrl) setHover({ url: card.imageUrl, x: ev.clientX, y: ev.clientY });
                    }}
                    onMouseMove={(ev) => setHover((h) => (h ? { ...h, x: ev.clientX, y: ev.clientY } : null))}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => {
                      setHover(null);
                      onCardClick?.(e.oracleId);
                    }}
                    className={`flex justify-between text-sm hover:bg-neutral-900/50 ${onCardClick ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{e.count}</span>
                      <ManaCost cost={cards.get(e.oracleId)?.manaCost ?? null} />
                      <span>{e.name}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {grouped['Unknown']?.length ? (
            <div>
              <h3 className="text-xs uppercase tracking-wide text-neutral-400">Unknown</h3>
              <ul>
                {grouped['Unknown'].map((e) => (
                  <li key={e.oracleId} className="flex justify-between text-sm">
                    <span>{e.count} {e.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        {hover && (
          <img
            src={hover.url}
            alt=""
            className="pointer-events-none fixed z-50 w-60 rounded shadow-2xl"
            style={{
              left: Math.max(8, hover.x - 260),
              top: Math.max(8, Math.min(window.innerHeight - 340, hover.y - 100)),
            }}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run all DeckPanel tests, verify they pass**

```bash
npx vitest run src/components/DeckPanel.test.tsx src/components/DeckPanelCollapsed.test.tsx
```

Expected: all tests pass (4 original DeckPanel + 5 new toggle tests + 5 collapsed tests).

- [ ] **Step 5: Commit**

```bash
git add app/src/components/DeckPanel.tsx app/src/components/DeckPanel.test.tsx
git commit -m "feat(deck): collapsible DeckPanel with chevron toggle and jump-to-section"
```

---

### Task 9: Update `DeckPage` to let `DeckPanel` own its width

**Files:**
- Modify: `app/src/pages/DeckPage.tsx`

- [ ] **Step 1: Edit the wrapping `<div>` around `<DeckPanel>`**

In `app/src/pages/DeckPage.tsx` (line 83), change:

```tsx
<div className="scrollbar-slim h-full w-[360px] shrink-0 overflow-y-auto border-l border-neutral-800">
  <DeckPanel onCardClick={cardNav.push} />
</div>
```

to:

```tsx
<div className="scrollbar-slim h-full shrink-0 overflow-y-auto border-l border-neutral-800">
  <DeckPanel onCardClick={cardNav.push} />
</div>
```

(Only the removal of `w-[360px]`.)

- [ ] **Step 2: Re-run app tests**

```bash
cd app && npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/src/pages/DeckPage.tsx
git commit -m "feat(deck): let DeckPanel control its own width on DeckPage"
```

---

### Task 10: Full gate + manual verification

**Files:** none (verification)

- [ ] **Step 1: Run the full repo gate**

From the worktree root:
```bash
npm test
```

Expected: pipeline + shared types pass, app vitest passes, `app/npm run build` (tsc + vite production build) succeeds. If `tsc` reports a type error not caught by vitest, fix it and re-run; the build is the canonical type gate (CLAUDE.md, line 36).

- [ ] **Step 2: Start the dev server**

You may need a card-data artifact first. Run from worktree root, only if `app/public/data/cards-standard.json` is absent (check with `ls app/public/data/`):
```bash
npm run build:cards -- --standard
```

Then:
```bash
cd app && npm run dev
```

- [ ] **Step 3: Manually verify in browser**

Open `http://localhost:5173`, navigate to a deck, and confirm each:

- [ ] Click the `◀` chevron — panel collapses to ~72px, content swaps to the sliver, transition is smooth (~200ms).
- [ ] Click the `▶` chevron — panel re-expands, content returns.
- [ ] Reload the page while collapsed — panel re-opens collapsed.
- [ ] Reload while expanded — panel re-opens expanded.
- [ ] In collapsed mode, hover each widget — tooltips show correct counts (type pills, curve bars, color segments).
- [ ] Click a type pill in collapsed mode — panel expands, then scrolls so that section's heading is at the top of the visible area.
- [ ] On a deck with only lands (or empty deck), the sliver still renders without errors.
- [ ] Card grid actually reclaims the 288px when collapsed (resize browser to verify).

If any check fails, fix the issue, re-run `npm test`, and commit a fix.

- [ ] **Step 4: Stop the dev server.**

---

### Task 11: Merge back into `main` and clean up the worktree

**Files:** none (git operations)

- [ ] **Step 1: Push the branch (optional, for backup)**

If the user wants the branch on the remote:
```bash
git push -u origin feat/collapsible-deck-panel
```

Skip if the user only wants a local merge.

- [ ] **Step 2: Switch back to the main checkout**

From the worktree root:
```bash
cd /Users/Dada/mtg-graph
```

- [ ] **Step 3: Merge the feature branch**

```bash
git merge --ff-only feat/collapsible-deck-panel
```

If fast-forward isn't possible, the user has new commits on `main` since the worktree was created. Fall back to:
```bash
git merge --no-ff feat/collapsible-deck-panel -m "Merge feat/collapsible-deck-panel: collapsible deck panel"
```

- [ ] **Step 4: Re-run the gate on `main`**

```bash
npm test
```

Expected: pass. If anything fails, the merge produced a conflict resolution error — investigate.

- [ ] **Step 5: Remove the worktree**

```bash
git worktree remove .worktrees/collapsible-deck-panel
git branch -d feat/collapsible-deck-panel   # branch already merged
```

Expected: worktree directory gone, branch deleted (since it's merged).

---

## Self-Review

**Spec coverage:**
- ✅ Width-only collapse (Task 8) — 360 ↔ 72px controlled by `DeckPanel` itself.
- ✅ Collapsed layout: total + type pills + mini curve + color bar (Tasks 5, 6, 7).
- ✅ Type pill palette and letter mapping (Task 7).
- ✅ Click-to-expand + scroll-to-section (Task 8, `jumpToType`).
- ✅ Persistence via `localStorage` (Task 4).
- ✅ Mana pip distribution with hybrid/Phyrexian/2-brid rules (Task 3).
- ✅ `manaCurveBuckets` shared between expanded and collapsed (Tasks 2, 8).
- ✅ `DeckPage` width refactor (Task 9).
- ✅ Edge cases: empty deck, no active deck, only lands, localStorage unavailable (covered by `useDeckPanelCollapsed` hook + `DeckPanelCollapsed` rendering branch + ColorPipBar placeholder).
- ✅ Worktree workflow (Tasks 0, 11).

**Placeholder scan:** No "TBD" / "implement later" / "add appropriate error handling" — every step has concrete code or a concrete command.

**Type consistency:**
- `DeckType` exported from `deckStats.ts` and re-used in `DeckPanelCollapsed.tsx` and `DeckPanel.tsx` — consistent.
- `STORAGE_KEY` exported from `useDeckPanelCollapsed.ts` and imported by the DeckPanel test — consistent.
- `manaCurveBuckets(deck, cards)` signature matches the test and both callers.
- `colorPipDistribution` returns `Record<Color, number>` — matches `ColorPipBar`'s `distribution` prop.

No issues found.
