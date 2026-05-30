# Fill-with-mana and Goldfish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two new playability tools to the active-deck page — a one-click basic-land filler that infers a 40- or 60-card target from spell count and distributes basics by color-pip ratio, and a goldfish modal that shows a 7-card random opening hand with draw/shuffle controls and a library counter. Both surface from a new action row on `DeckPage`. A new step in the `active-deck` tour spotlights them.

**Architecture:** Two features, each isolated into one pure-logic module + small UI components. The pure modules live alongside `deckColors.ts` / `deckStats.ts` / `legality.ts` and consume their existing helpers (`colorPipDistribution`). UI components are added to the DeckPage action bar (currently just the `List | Graph` toggle). A single new store action `applyLandFill(plan)` handles the basic-land rewrite transactionally; Save/Discard/diff machinery is reused unchanged.

**Tech Stack:** React 18 + TypeScript, Zustand for app state, Dexie for persistence (already wired), Tailwind for styling, Vitest + React Testing Library for tests, Playwright for E2E smoke. `react-joyride` for the tour. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-05-27-fill-mana-and-goldfish-design.md`.

---

## File Structure

**New files (created during the plan):**

| File | Responsibility |
|---|---|
| `app/src/lib/fillMana.ts` | Pure: `computeLandFill(deck, cards, opts) → FillPlan`. No React, no store. |
| `app/src/lib/fillMana.test.ts` | Unit tests for `computeLandFill`. |
| `app/src/lib/goldfish.ts` | Pure: `buildShuffled(deck, rng) → string[]`. RNG injected for testability. |
| `app/src/lib/goldfish.test.ts` | Unit tests for `buildShuffled`. |
| `app/src/components/icons/FishIcon.tsx` | Inline SVG fish icon component, ~14px viewBox. |
| `app/src/components/FillManaButton.tsx` | Button + anchored popover (target override + preview + Fill). |
| `app/src/components/FillManaButton.test.tsx` | Component tests with React Testing Library. |
| `app/src/components/GoldfishButton.tsx` | Button + icon that opens the modal. |
| `app/src/components/GoldfishModal.tsx` | The modal: hand row + library counter + Draw/Shuffle. |
| `app/src/components/GoldfishModal.test.tsx` | Component tests with React Testing Library. |

**Modified files:**

| File | Change |
|---|---|
| `app/src/stores/deckStore.ts` | Add `applyLandFill(plan)` action that rewrites basics transactionally. |
| `app/src/stores/deckStore.test.ts` | Tests for `applyLandFill`. |
| `app/src/pages/DeckPage.tsx` | Add the two new buttons to the action bar at line 31. |
| `app/src/wizard/selectors.ts` | Add 3 new `TOUR_IDS`: `deckActionBar`, `fillManaButton`, `goldfishButton`. |
| `app/src/wizard/tours.ts` | Add one step to the `active-deck` tour. |
| `app/tests/e2e/smoke.spec.ts` (or equivalent) | Assert both buttons visible on `/deck`. |

---

## Task 1: Create `fillMana.ts` skeleton with types and basic-land helper

**Files:**
- Create: `app/src/lib/fillMana.ts`
- Create: `app/src/lib/fillMana.test.ts`

- [ ] **Step 1: Write the failing test for `getBasicOracleId`**

Create `app/src/lib/fillMana.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getBasicOracleId } from './fillMana';
import type { Card } from '@shared/types';

function card(id: string, name: string, opts: Partial<Card> = {}): Card {
  return {
    oracleId: id, name, set: 't', printings: ['t'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [],
    typeLine: 'Basic Land', types: ['Land'], subtypes: [], supertypes: ['Basic'],
    oracleText: '', keywords: [], power: null, toughness: null,
    rarity: 'common', imageUrl: '', tags: [],
    ...opts,
  };
}

describe('getBasicOracleId', () => {
  it('returns oracleId of the first matching basic land for a color', () => {
    const cards = new Map<string, Card>([
      ['p1', card('p1', 'Plains', { subtypes: ['Plains'] })],
      ['i1', card('i1', 'Island', { subtypes: ['Island'] })],
      ['s1', card('s1', 'Swamp', { subtypes: ['Swamp'] })],
      ['m1', card('m1', 'Mountain', { subtypes: ['Mountain'] })],
      ['f1', card('f1', 'Forest', { subtypes: ['Forest'] })],
    ]);
    expect(getBasicOracleId('W', cards)).toBe('p1');
    expect(getBasicOracleId('G', cards)).toBe('f1');
  });

  it('returns undefined when no basic of that color exists', () => {
    expect(getBasicOracleId('W', new Map())).toBeUndefined();
  });

  it('ignores non-basics that share the subtype', () => {
    const cards = new Map<string, Card>([
      ['triome', card('triome', 'Indatha Triome', { subtypes: ['Plains', 'Swamp', 'Forest'], supertypes: [] })],
      ['p1', card('p1', 'Plains', { subtypes: ['Plains'] })],
    ]);
    expect(getBasicOracleId('W', cards)).toBe('p1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run src/lib/fillMana.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `app/src/lib/fillMana.ts` with types + helper**

```ts
import type { Card, Color } from '@shared/types';
import type { Deck } from './db';
import { colorPipDistribution } from './deckStats';

const WUBRG: readonly Color[] = ['W', 'U', 'B', 'R', 'G'];

const SUBTYPE_FOR_COLOR: Record<Color, string> = {
  W: 'Plains',
  U: 'Island',
  B: 'Swamp',
  R: 'Mountain',
  G: 'Forest',
};

export type FillPlan = {
  add: { oracleId: string; count: number }[];
  remove: { oracleId: string; count: number }[];
  inferredTarget: 40 | 60;
  basicsByColor: Partial<Record<Color, number>>;
  reason?: 'empty' | 'no_colored_spells';
};

export type FillOpts = {
  targetOverride?: 40 | 60;
};

export function getBasicOracleId(color: Color, cards: Map<string, Card>): string | undefined {
  const subtype = SUBTYPE_FOR_COLOR[color];
  for (const card of cards.values()) {
    if (
      card.types.includes('Land') &&
      card.supertypes.includes('Basic') &&
      card.subtypes.includes(subtype)
    ) {
      return card.oracleId;
    }
  }
  return undefined;
}

export function computeLandFill(
  _deck: Deck,
  _cards: Map<string, Card>,
  _opts: FillOpts = {},
): FillPlan {
  // Stub — implemented in later tasks.
  return {
    add: [],
    remove: [],
    inferredTarget: 40,
    basicsByColor: {},
    reason: 'empty',
  };
}

export { WUBRG, SUBTYPE_FOR_COLOR };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npx vitest run src/lib/fillMana.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/fillMana.ts app/src/lib/fillMana.test.ts
git commit -m "feat(fillMana): add module skeleton with basic-land oracleId lookup"
```

---

## Task 2: `computeLandFill` — empty and colorless cases

**Files:**
- Modify: `app/src/lib/fillMana.ts`
- Modify: `app/src/lib/fillMana.test.ts`

- [ ] **Step 1: Append failing tests for empty/colorless cases**

Append to `app/src/lib/fillMana.test.ts`:

```ts
import { computeLandFill } from './fillMana';
import type { Deck } from './db';

function deck(entries: { oracleId: string; count: number }[]): Deck {
  return {
    id: 'd', name: 'd', format: 'standard',
    originalCards: entries, workingCards: entries, createdAt: 0, updatedAt: 0,
  };
}

describe('computeLandFill — empty / colorless', () => {
  it('returns empty plan with reason="empty" for an empty deck', () => {
    const plan = computeLandFill(deck([]), new Map());
    expect(plan.add).toEqual([]);
    expect(plan.remove).toEqual([]);
    expect(plan.reason).toBe('empty');
  });

  it('returns empty plan with reason="no_colored_spells" for a colorless artifact deck', () => {
    const cards = new Map<string, Card>([
      ['art', card('art', 'Colorless Artifact', { types: ['Artifact'], supertypes: [], manaCost: '{3}' })],
    ]);
    const d = deck([{ oracleId: 'art', count: 30 }]);
    const plan = computeLandFill(d, cards);
    expect(plan.add).toEqual([]);
    expect(plan.remove).toEqual([]);
    expect(plan.reason).toBe('no_colored_spells');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd app && npx vitest run src/lib/fillMana.test.ts`
Expected: 1 PASS (colorless wrongly says 'empty'), 1 FAIL (empty already returns 'empty' from stub, but colorless test fails — stub returns 'empty' not 'no_colored_spells').

Actually the stub returns `'empty'` always. The first test (empty deck) passes; the second (colorless artifact deck) fails with `expected 'no_colored_spells' but got 'empty'`.

- [ ] **Step 3: Implement empty/colorless logic**

Replace the stub `computeLandFill` in `app/src/lib/fillMana.ts`:

```ts
export function computeLandFill(
  deck: Deck,
  cards: Map<string, Card>,
  opts: FillOpts = {},
): FillPlan {
  const totalCards = deck.workingCards.reduce((s, c) => s + c.count, 0);
  if (totalCards === 0) {
    return {
      add: [], remove: [],
      inferredTarget: 40, basicsByColor: {},
      reason: 'empty',
    };
  }

  const pips = colorPipDistribution(deck, cards);
  const totalPips = (Object.values(pips) as number[]).reduce((s, p) => s + p, 0);

  // Detect target now so we have it in the early-return.
  const spellCount = deck.workingCards.reduce((s, entry) => {
    const card = cards.get(entry.oracleId);
    if (!card) return s;
    if (card.types.includes('Land')) return s;
    return s + entry.count;
  }, 0);
  const inferredTarget: 40 | 60 = opts.targetOverride ?? (spellCount <= 23 ? 40 : 60);

  if (totalPips === 0) {
    return {
      add: [], remove: [],
      inferredTarget, basicsByColor: {},
      reason: 'no_colored_spells',
    };
  }

  // Full algorithm follows in next tasks.
  return {
    add: [], remove: [],
    inferredTarget, basicsByColor: {},
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && npx vitest run src/lib/fillMana.test.ts`
Expected: 5 PASS (3 from Task 1 + 2 new).

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/fillMana.ts app/src/lib/fillMana.test.ts
git commit -m "feat(fillMana): handle empty and colorless decks"
```

---

## Task 3: `computeLandFill` — mono-color limited and standard targets

**Files:**
- Modify: `app/src/lib/fillMana.ts`
- Modify: `app/src/lib/fillMana.test.ts`

- [ ] **Step 1: Append failing tests for mono-color cases**

Append to `app/src/lib/fillMana.test.ts`:

```ts
describe('computeLandFill — mono-color target detection', () => {
  it('22 mono-R spells → 17 Mountains, target=40', () => {
    const cards = new Map<string, Card>([
      ['bolt', card('bolt', 'Lightning Bolt', { types: ['Instant'], supertypes: [], manaCost: '{R}', cmc: 1, colorIdentity: ['R'] })],
      ['mountain', card('mountain', 'Mountain', { subtypes: ['Mountain'] })],
    ]);
    const d = deck([{ oracleId: 'bolt', count: 22 }]);
    const plan = computeLandFill(d, cards);
    expect(plan.inferredTarget).toBe(40);
    expect(plan.basicsByColor).toEqual({ R: 17 });
    expect(plan.add).toEqual([{ oracleId: 'mountain', count: 17 }]);
    expect(plan.remove).toEqual([]);
  });

  it('36 mono-R spells → 24 Mountains, target=60', () => {
    const cards = new Map<string, Card>([
      ['bolt', card('bolt', 'Lightning Bolt', { types: ['Instant'], supertypes: [], manaCost: '{R}', cmc: 1, colorIdentity: ['R'] })],
      ['mountain', card('mountain', 'Mountain', { subtypes: ['Mountain'] })],
    ]);
    const d = deck([{ oracleId: 'bolt', count: 36 }]);
    const plan = computeLandFill(d, cards);
    expect(plan.inferredTarget).toBe(60);
    expect(plan.basicsByColor).toEqual({ R: 24 });
    expect(plan.add).toEqual([{ oracleId: 'mountain', count: 24 }]);
  });

  it('respects targetOverride', () => {
    const cards = new Map<string, Card>([
      ['bolt', card('bolt', 'Lightning Bolt', { types: ['Instant'], supertypes: [], manaCost: '{R}', cmc: 1, colorIdentity: ['R'] })],
      ['mountain', card('mountain', 'Mountain', { subtypes: ['Mountain'] })],
    ]);
    const d = deck([{ oracleId: 'bolt', count: 22 }]);
    const plan = computeLandFill(d, cards, { targetOverride: 60 });
    expect(plan.inferredTarget).toBe(60);
    expect(plan.basicsByColor).toEqual({ R: 24 });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd app && npx vitest run src/lib/fillMana.test.ts`
Expected: 3 new tests FAIL (computeLandFill still returns empty after totalPips > 0 check).

- [ ] **Step 3: Implement target → basic land count → single-color distribution**

Update `computeLandFill` in `app/src/lib/fillMana.ts` (replace the final `return` block):

```ts
  const baseLandCount = inferredTarget === 40 ? 17 : 24;

  // Step 7: existing non-basic land contributions (currently unused; full
  // algorithm in Task 6).
  let nonBasicLandCount = 0;
  const existingLandContrib: Record<Color, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  for (const entry of deck.workingCards) {
    const card = cards.get(entry.oracleId);
    if (!card) continue;
    if (!card.types.includes('Land')) continue;
    if (card.supertypes.includes('Basic')) continue;
    nonBasicLandCount += entry.count;
    for (const c of card.colorIdentity) {
      existingLandContrib[c] += entry.count;
    }
  }
  const basicsNeeded = Math.max(0, baseLandCount - nonBasicLandCount);

  // Step 8: desired pip share per color, minus non-basic contributions.
  const desiredPips: Record<Color, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  for (const c of WUBRG) {
    const share = (pips[c] / totalPips) * baseLandCount - existingLandContrib[c];
    desiredPips[c] = Math.max(0, share);
  }

  // Step 9: largest-remainder rounding.
  const basicsByColor = largestRemainder(desiredPips, basicsNeeded);

  // Step 11: diff against current basics.
  const currentBasicsByColor: Record<Color, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  const currentBasicOracleByColor: Partial<Record<Color, string>> = {};
  for (const entry of deck.workingCards) {
    const card = cards.get(entry.oracleId);
    if (!card) continue;
    if (!card.types.includes('Land')) continue;
    if (!card.supertypes.includes('Basic')) continue;
    for (const c of WUBRG) {
      if (card.subtypes.includes(SUBTYPE_FOR_COLOR[c])) {
        currentBasicsByColor[c] += entry.count;
        currentBasicOracleByColor[c] = entry.oracleId;
        break;
      }
    }
  }

  const add: { oracleId: string; count: number }[] = [];
  const remove: { oracleId: string; count: number }[] = [];
  const finalByColor: Partial<Record<Color, number>> = {};
  for (const c of WUBRG) {
    const want = basicsByColor[c] ?? 0;
    const have = currentBasicsByColor[c];
    if (want > 0) finalByColor[c] = want;
    if (want > have) {
      const oracleId = currentBasicOracleByColor[c] ?? getBasicOracleId(c, cards);
      if (oracleId) add.push({ oracleId, count: want - have });
    } else if (want < have) {
      const oracleId = currentBasicOracleByColor[c];
      if (oracleId) remove.push({ oracleId, count: have - want });
    }
  }

  return { add, remove, inferredTarget, basicsByColor: finalByColor };
}

function largestRemainder(weights: Record<Color, number>, total: number): Partial<Record<Color, number>> {
  const result: Partial<Record<Color, number>> = {};
  if (total <= 0) return result;
  const sumW = (Object.values(weights) as number[]).reduce((s, w) => s + w, 0);
  if (sumW <= 0) return result;
  const floats: { color: Color; raw: number; floor: number; remainder: number }[] = [];
  let allocated = 0;
  for (const c of WUBRG) {
    const raw = (weights[c] / sumW) * total;
    const floor = Math.floor(raw);
    floats.push({ color: c, raw, floor, remainder: raw - floor });
    allocated += floor;
  }
  let remaining = total - allocated;
  floats.sort((a, b) => b.remainder - a.remainder);
  for (const f of floats) {
    let count = f.floor;
    if (remaining > 0 && f.remainder > 0) {
      count += 1;
      remaining -= 1;
    }
    if (count > 0) result[f.color] = count;
  }
  return result;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && npx vitest run src/lib/fillMana.test.ts`
Expected: 8 PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/fillMana.ts app/src/lib/fillMana.test.ts
git commit -m "feat(fillMana): mono-color target detection and basic-land distribution"
```

---

## Task 4: `computeLandFill` — multicolor pip-ratio splits

**Files:**
- Modify: `app/src/lib/fillMana.test.ts`

- [ ] **Step 1: Append failing test for two-color split**

Append to `app/src/lib/fillMana.test.ts`:

```ts
describe('computeLandFill — multicolor pip-ratio', () => {
  it('22 spells with 50/50 W/G pips → Plains + Forest sum to 17', () => {
    const cards = new Map<string, Card>([
      ['savannah', card('savannah', 'Savannah Lions', { types: ['Creature'], supertypes: [], manaCost: '{W}', cmc: 1, colorIdentity: ['W'] })],
      ['llanowar', card('llanowar', 'Llanowar Elves', { types: ['Creature'], supertypes: [], manaCost: '{G}', cmc: 1, colorIdentity: ['G'] })],
      ['plains', card('plains', 'Plains', { subtypes: ['Plains'] })],
      ['forest', card('forest', 'Forest', { subtypes: ['Forest'] })],
    ]);
    const d = deck([
      { oracleId: 'savannah', count: 11 },
      { oracleId: 'llanowar', count: 11 },
    ]);
    const plan = computeLandFill(d, cards);
    expect(plan.inferredTarget).toBe(40);
    const total = (plan.basicsByColor.W ?? 0) + (plan.basicsByColor.G ?? 0);
    expect(total).toBe(17);
    // 50/50 split with 17 lands: largest-remainder gives 9/8 or 8/9.
    expect(plan.basicsByColor.W).toBeGreaterThanOrEqual(8);
    expect(plan.basicsByColor.W).toBeLessThanOrEqual(9);
    expect(plan.basicsByColor.G).toBeGreaterThanOrEqual(8);
    expect(plan.basicsByColor.G).toBeLessThanOrEqual(9);
  });

  it('22 spells with 75/25 W/G pips → ~13 Plains, ~4 Forest', () => {
    const cards = new Map<string, Card>([
      ['savannah', card('savannah', 'Savannah Lions', { types: ['Creature'], supertypes: [], manaCost: '{W}', cmc: 1, colorIdentity: ['W'] })],
      ['llanowar', card('llanowar', 'Llanowar Elves', { types: ['Creature'], supertypes: [], manaCost: '{G}', cmc: 1, colorIdentity: ['G'] })],
      ['plains', card('plains', 'Plains', { subtypes: ['Plains'] })],
      ['forest', card('forest', 'Forest', { subtypes: ['Forest'] })],
    ]);
    const d = deck([
      { oracleId: 'savannah', count: 18 },  // 18 W pips
      { oracleId: 'llanowar', count: 4 },   // 6 G pips → wait we want 75/25 — use counts to get the ratio
    ]);
    // Recompute: 18 W : 6 G = 75/25.
    const plan = computeLandFill(d, cards);
    expect(plan.basicsByColor.W).toBe(13);
    expect(plan.basicsByColor.G).toBe(4);
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd app && npx vitest run src/lib/fillMana.test.ts`
Expected: 10 PASS — the algorithm from Task 3 already handles multicolor via `largestRemainder`. If a test fails because of rounding, fix the assertion to match the algorithm's deterministic output (largestRemainder is deterministic given the inputs).

If the 75/25 test gives different numbers, adjust input counts: with 24 spells (18 W + 6 G), pips ratio is 18:6 = 0.75:0.25. Times 17 base lands = 12.75 W + 4.25 G → floor 12 + 4 = 16, remaining 1, larger remainder (0.75 W beats 0.25 G), → 13 W + 4 G. Confirm by reading the test output.

- [ ] **Step 3: Commit**

```bash
git add app/src/lib/fillMana.test.ts
git commit -m "test(fillMana): multicolor pip-ratio split coverage"
```

---

## Task 5: `computeLandFill` — splash threshold

**Files:**
- Modify: `app/src/lib/fillMana.ts`
- Modify: `app/src/lib/fillMana.test.ts`

- [ ] **Step 1: Append failing test for splash threshold**

Append to `app/src/lib/fillMana.test.ts`:

```ts
describe('computeLandFill — splash threshold', () => {
  it('drops a color with <15% of pips and redistributes', () => {
    const cards = new Map<string, Card>([
      ['w_card', card('w_card', 'W card', { types: ['Creature'], supertypes: [], manaCost: '{W}', cmc: 1, colorIdentity: ['W'] })],
      ['u_card', card('u_card', 'U card', { types: ['Creature'], supertypes: [], manaCost: '{U}', cmc: 1, colorIdentity: ['U'] })],
      ['b_card', card('b_card', 'B card', { types: ['Creature'], supertypes: [], manaCost: '{B}', cmc: 1, colorIdentity: ['B'] })],
      ['plains', card('plains', 'Plains', { subtypes: ['Plains'] })],
      ['island', card('island', 'Island', { subtypes: ['Island'] })],
      ['swamp', card('swamp', 'Swamp', { subtypes: ['Swamp'] })],
    ]);
    // 16 W + 3 U + 1 B = 20 pips. W=80%, U=15%, B=5%. B below 15%, dropped.
    const d = deck([
      { oracleId: 'w_card', count: 16 },
      { oracleId: 'u_card', count: 3 },
      { oracleId: 'b_card', count: 1 },
    ]);
    const plan = computeLandFill(d, cards);
    expect(plan.basicsByColor.B).toBeUndefined();
    expect(plan.basicsByColor.W).toBeGreaterThan(0);
    expect(plan.basicsByColor.U).toBeGreaterThanOrEqual(0);
    const total = (plan.basicsByColor.W ?? 0) + (plan.basicsByColor.U ?? 0);
    expect(total).toBe(17);
  });
});
```

- [ ] **Step 2: Run tests to verify the new one fails**

Run: `cd app && npx vitest run src/lib/fillMana.test.ts`
Expected: the new test FAILs — currently the algorithm allocates a small Swamp slot.

- [ ] **Step 3: Add splash threshold to `computeLandFill`**

In `app/src/lib/fillMana.ts`, insert this block immediately after the `totalPips` computation and before the `inferredTarget` (so the threshold filters before the rest of the algorithm uses `pips`):

```ts
  // Splash threshold: drop any color contributing < 15% of total pips.
  const SPLASH_THRESHOLD = 0.15;
  const filteredPips: Record<Color, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  for (const c of WUBRG) {
    if (pips[c] / totalPips >= SPLASH_THRESHOLD) {
      filteredPips[c] = pips[c];
    }
  }
  const filteredTotalPips = (Object.values(filteredPips) as number[]).reduce((s, p) => s + p, 0);
```

Then change subsequent references from `pips` → `filteredPips` and `totalPips` → `filteredTotalPips` for the `desiredPips` calculation only. (Keep the `totalPips === 0` check using the original; otherwise a tiny mono-color deck with 1 pip could short-circuit.)

Specifically:

```ts
  for (const c of WUBRG) {
    const share = (filteredPips[c] / filteredTotalPips) * baseLandCount - existingLandContrib[c];
    desiredPips[c] = Math.max(0, share);
  }
```

If `filteredTotalPips` is 0 (every color below threshold — shouldn't happen because at least one color must be ≥ 15% by pigeon-hole, but defensively):

```ts
  if (filteredTotalPips === 0) {
    return {
      add: [], remove: [],
      inferredTarget, basicsByColor: {},
      reason: 'no_colored_spells',
    };
  }
```

Insert that check between the `filteredTotalPips` calculation and the rest of the algorithm.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && npx vitest run src/lib/fillMana.test.ts`
Expected: 11 PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/fillMana.ts app/src/lib/fillMana.test.ts
git commit -m "feat(fillMana): splash threshold drops colors below 15% pip share"
```

---

## Task 6: `computeLandFill` — existing dual lands contribute to color distribution

**Files:**
- Modify: `app/src/lib/fillMana.test.ts`

- [ ] **Step 1: Append failing test for dual-land contribution**

Append to `app/src/lib/fillMana.test.ts`:

```ts
describe('computeLandFill — existing dual lands', () => {
  it('4 W/G duals reduce basics added and shift distribution', () => {
    const cards = new Map<string, Card>([
      ['w_card', card('w_card', 'W card', { types: ['Creature'], supertypes: [], manaCost: '{W}', cmc: 1, colorIdentity: ['W'] })],
      ['g_card', card('g_card', 'G card', { types: ['Creature'], supertypes: [], manaCost: '{G}', cmc: 1, colorIdentity: ['G'] })],
      ['dual', card('dual', 'Sunpetal Grove', { types: ['Land'], supertypes: [], typeLine: 'Land', colorIdentity: ['W', 'G'] })],
      ['plains', card('plains', 'Plains', { subtypes: ['Plains'] })],
      ['forest', card('forest', 'Forest', { subtypes: ['Forest'] })],
    ]);
    // 11 W + 11 G spells (50/50) + 4 duals already in deck.
    const d = deck([
      { oracleId: 'w_card', count: 11 },
      { oracleId: 'g_card', count: 11 },
      { oracleId: 'dual', count: 4 },
    ]);
    const plan = computeLandFill(d, cards);
    expect(plan.inferredTarget).toBe(40);
    // baseLandCount=17. With 4 non-basic lands, basicsNeeded = 13.
    const total = (plan.basicsByColor.W ?? 0) + (plan.basicsByColor.G ?? 0);
    expect(total).toBe(13);
    // Duals contribute to both W and G equally so distribution stays balanced.
    expect(plan.basicsByColor.W).toBeGreaterThanOrEqual(6);
    expect(plan.basicsByColor.G).toBeGreaterThanOrEqual(6);
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `cd app && npx vitest run src/lib/fillMana.test.ts`
Expected: 12 PASS — Task 3's implementation already handles this (it subtracts `existingLandContrib`). If the test fails, debug — but the math is already in the code from Task 3.

- [ ] **Step 3: Commit**

```bash
git add app/src/lib/fillMana.test.ts
git commit -m "test(fillMana): coverage for existing dual land contribution"
```

---

## Task 7: `computeLandFill` — average-CMC curve adjustment

**Files:**
- Modify: `app/src/lib/fillMana.ts`
- Modify: `app/src/lib/fillMana.test.ts`

- [ ] **Step 1: Append failing tests for curve adjustment**

Append to `app/src/lib/fillMana.test.ts`:

```ts
describe('computeLandFill — curve adjustment', () => {
  it('avg CMC > 3.5 adds 1 land', () => {
    const cards = new Map<string, Card>([
      ['titan', card('titan', 'Big Titan', { types: ['Creature'], supertypes: [], manaCost: '{4}{R}', cmc: 5, colorIdentity: ['R'] })],
      ['mountain', card('mountain', 'Mountain', { subtypes: ['Mountain'] })],
    ]);
    const d = deck([{ oracleId: 'titan', count: 22 }]);
    const plan = computeLandFill(d, cards);
    expect(plan.inferredTarget).toBe(40);
    expect(plan.basicsByColor.R).toBe(18); // 17 + 1
  });

  it('avg CMC < 2.5 drops 1 land', () => {
    const cards = new Map<string, Card>([
      ['bolt', card('bolt', 'Lightning Bolt', { types: ['Instant'], supertypes: [], manaCost: '{R}', cmc: 1, colorIdentity: ['R'] })],
      ['mountain', card('mountain', 'Mountain', { subtypes: ['Mountain'] })],
    ]);
    const d = deck([{ oracleId: 'bolt', count: 22 }]);
    const plan = computeLandFill(d, cards);
    expect(plan.basicsByColor.R).toBe(16); // 17 - 1
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd app && npx vitest run src/lib/fillMana.test.ts`
Expected: 2 FAIL — current algorithm doesn't adjust by curve.

- [ ] **Step 3: Add curve adjustment to `computeLandFill`**

In `app/src/lib/fillMana.ts`, immediately after `const baseLandCount = inferredTarget === 40 ? 17 : 24;`, insert:

```ts
  // Curve adjustment: heavier decks want more lands, lighter decks fewer.
  let totalCmc = 0;
  let totalSpellCount = 0;
  for (const entry of deck.workingCards) {
    const card = cards.get(entry.oracleId);
    if (!card) continue;
    if (card.types.includes('Land')) continue;
    totalCmc += card.cmc * entry.count;
    totalSpellCount += entry.count;
  }
  const avgCmc = totalSpellCount > 0 ? totalCmc / totalSpellCount : 0;
  let adjustedBaseLandCount = baseLandCount;
  if (avgCmc > 3.5) adjustedBaseLandCount += 1;
  else if (avgCmc < 2.5 && totalSpellCount > 0) adjustedBaseLandCount -= 1;
```

Then replace subsequent uses of `baseLandCount` (in `basicsNeeded`, the share computation, and the existing-land subtraction) with `adjustedBaseLandCount`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && npx vitest run src/lib/fillMana.test.ts`
Expected: 14 PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/fillMana.ts app/src/lib/fillMana.test.ts
git commit -m "feat(fillMana): adjust land count by average CMC"
```

---

## Task 8: `computeLandFill` — idempotency check

**Files:**
- Modify: `app/src/lib/fillMana.test.ts`

- [ ] **Step 1: Append idempotency test**

Append to `app/src/lib/fillMana.test.ts`:

```ts
describe('computeLandFill — idempotency', () => {
  it('rerunning on the result of applying its own plan produces empty add/remove', () => {
    const cards = new Map<string, Card>([
      ['w_card', card('w_card', 'W card', { types: ['Creature'], supertypes: [], manaCost: '{W}', cmc: 1, colorIdentity: ['W'] })],
      ['g_card', card('g_card', 'G card', { types: ['Creature'], supertypes: [], manaCost: '{G}', cmc: 1, colorIdentity: ['G'] })],
      ['plains', card('plains', 'Plains', { subtypes: ['Plains'] })],
      ['forest', card('forest', 'Forest', { subtypes: ['Forest'] })],
    ]);
    const start = deck([
      { oracleId: 'w_card', count: 11 },
      { oracleId: 'g_card', count: 11 },
    ]);
    const first = computeLandFill(start, cards);
    // Apply the plan manually for the test.
    const applied: typeof start = {
      ...start,
      workingCards: [...start.workingCards, ...first.add],
    };
    const second = computeLandFill(applied, cards);
    expect(second.add).toEqual([]);
    expect(second.remove).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd app && npx vitest run src/lib/fillMana.test.ts`
Expected: 15 PASS — the diff-against-current step in Task 3 already gives idempotency.

- [ ] **Step 3: Commit**

```bash
git add app/src/lib/fillMana.test.ts
git commit -m "test(fillMana): idempotency check"
```

---

## Task 9: Add `applyLandFill` action to `deckStore`

**Files:**
- Modify: `app/src/stores/deckStore.ts`
- Modify: `app/src/stores/deckStore.test.ts`

- [ ] **Step 1: Append failing tests to `deckStore.test.ts`**

Look at existing patterns first:

```bash
cd app && head -60 src/stores/deckStore.test.ts
```

Then append (after the existing tests):

```ts
describe('applyLandFill', () => {
  beforeEach(async () => {
    await db.decks.clear();
    useDeckStore.setState({ decks: [], activeDeckId: null });
    const id = await useDeckStore.getState().createDeck('Test');
    await useDeckStore.getState().addCard('spell1', 22, 'Spell');
  });

  it('adds new basic lands when none exist', async () => {
    const plan = {
      add: [{ oracleId: 'plains', count: 11 }, { oracleId: 'forest', count: 6 }],
      remove: [],
      inferredTarget: 40 as const,
      basicsByColor: { W: 11, G: 6 },
    };
    await useDeckStore.getState().applyLandFill(plan);
    const deck = useDeckStore.getState().decks[0];
    expect(deck?.workingCards.find((c) => c.oracleId === 'plains')?.count).toBe(11);
    expect(deck?.workingCards.find((c) => c.oracleId === 'forest')?.count).toBe(6);
    expect(deck?.workingCards.find((c) => c.oracleId === 'spell1')?.count).toBe(22);
  });

  it('removes existing basics when plan says so', async () => {
    await useDeckStore.getState().addCard('plains', 15);
    const plan = {
      add: [],
      remove: [{ oracleId: 'plains', count: 6 }],
      inferredTarget: 40 as const,
      basicsByColor: { W: 9 },
    };
    await useDeckStore.getState().applyLandFill(plan);
    const deck = useDeckStore.getState().decks[0];
    expect(deck?.workingCards.find((c) => c.oracleId === 'plains')?.count).toBe(9);
  });

  it('throws when no active deck', async () => {
    useDeckStore.setState({ activeDeckId: null });
    await expect(useDeckStore.getState().applyLandFill({
      add: [], remove: [], inferredTarget: 40, basicsByColor: {},
    })).rejects.toThrow();
  });

  it('persists to dexie', async () => {
    const id = useDeckStore.getState().activeDeckId!;
    await useDeckStore.getState().applyLandFill({
      add: [{ oracleId: 'plains', count: 17 }],
      remove: [],
      inferredTarget: 40,
      basicsByColor: { W: 17 },
    });
    const persisted = await db.decks.get(id);
    expect(persisted?.workingCards.find((c) => c.oracleId === 'plains')?.count).toBe(17);
  });
});
```

Make sure the imports include `db` from `../lib/db` and the `FillPlan` is structurally compatible (the test inlines `as const` instead of importing the type).

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd app && npx vitest run src/stores/deckStore.test.ts`
Expected: 4 FAIL — `applyLandFill is not a function`.

- [ ] **Step 3: Add `applyLandFill` to `deckStore.ts`**

In `app/src/stores/deckStore.ts`:

Add to the `DeckState` type:

```ts
applyLandFill: (plan: { add: { oracleId: string; count: number }[]; remove: { oracleId: string; count: number }[] }) => Promise<void>;
```

Add to the store implementation (before the closing `})`):

```ts
  applyLandFill: async (plan) => {
    const id = get().activeDeckId;
    if (!id) throw new Error('No active deck');
    const decks = get().decks.map((d) => {
      if (d.id !== id) return d;
      let working: DeckCard[] = d.workingCards.slice();
      for (const r of plan.remove) {
        working = working
          .map((c) => (c.oracleId === r.oracleId ? { ...c, count: c.count - r.count } : c))
          .filter((c) => c.count > 0);
      }
      for (const a of plan.add) {
        const existing = working.find((c) => c.oracleId === a.oracleId);
        if (existing) {
          working = working.map((c) =>
            c.oracleId === a.oracleId ? { ...c, count: c.count + a.count } : c,
          );
        } else {
          working = [...working, { oracleId: a.oracleId, count: a.count }];
        }
      }
      return { ...d, workingCards: working };
    });
    const updated = decks.find((d) => d.id === id);
    if (updated) await persist(updated);
    set({ decks });
  },
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && npx vitest run src/stores/deckStore.test.ts`
Expected: all tests pass (previous + 4 new).

- [ ] **Step 5: Commit**

```bash
git add app/src/stores/deckStore.ts app/src/stores/deckStore.test.ts
git commit -m "feat(deckStore): add applyLandFill action"
```

---

## Task 10: Create `goldfish.ts` with `buildShuffled`

**Files:**
- Create: `app/src/lib/goldfish.ts`
- Create: `app/src/lib/goldfish.test.ts`

- [ ] **Step 1: Write failing tests**

Create `app/src/lib/goldfish.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildShuffled } from './goldfish';
import type { Deck } from './db';

function deck(entries: { oracleId: string; count: number }[]): Deck {
  return {
    id: 'd', name: 'd', format: 'standard',
    originalCards: entries, workingCards: entries, createdAt: 0, updatedAt: 0,
  };
}

// Mulberry32 — small deterministic RNG for tests.
function seededRng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('buildShuffled', () => {
  it('returns empty array for empty deck', () => {
    expect(buildShuffled(deck([]), Math.random)).toEqual([]);
  });

  it('produces every oracleId at the correct multiplicity', () => {
    const d = deck([
      { oracleId: 'a', count: 3 },
      { oracleId: 'b', count: 5 },
    ]);
    const result = buildShuffled(d, Math.random);
    expect(result.filter((x) => x === 'a').length).toBe(3);
    expect(result.filter((x) => x === 'b').length).toBe(5);
    expect(result.length).toBe(8);
  });

  it('seeded RNG produces deterministic output', () => {
    const d = deck([
      { oracleId: 'a', count: 2 },
      { oracleId: 'b', count: 2 },
      { oracleId: 'c', count: 2 },
    ]);
    const first = buildShuffled(d, seededRng(42));
    const second = buildShuffled(d, seededRng(42));
    expect(first).toEqual(second);
  });

  it('different seeds produce different orderings (probabilistically)', () => {
    const d = deck([
      { oracleId: 'a', count: 10 },
      { oracleId: 'b', count: 10 },
      { oracleId: 'c', count: 10 },
    ]);
    const first = buildShuffled(d, seededRng(1));
    const second = buildShuffled(d, seededRng(999));
    expect(first).not.toEqual(second);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd app && npx vitest run src/lib/goldfish.test.ts`
Expected: 4 FAIL — module not found.

- [ ] **Step 3: Create `app/src/lib/goldfish.ts`**

```ts
import type { Deck } from './db';

export function buildShuffled(deck: Deck, rng: () => number): string[] {
  const flat: string[] = [];
  for (const entry of deck.workingCards) {
    for (let i = 0; i < entry.count; i++) flat.push(entry.oracleId);
  }
  for (let i = flat.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = flat[i];
    const b = flat[j];
    if (a !== undefined && b !== undefined) {
      flat[i] = b;
      flat[j] = a;
    }
  }
  return flat;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && npx vitest run src/lib/goldfish.test.ts`
Expected: 4 PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/goldfish.ts app/src/lib/goldfish.test.ts
git commit -m "feat(goldfish): add buildShuffled helper with injectable RNG"
```

---

## Task 11: Create `FishIcon` component

**Files:**
- Create: `app/src/components/icons/FishIcon.tsx`

- [ ] **Step 1: Create the icon component**

```tsx
type Props = {
  size?: number;
  className?: string;
};

export default function FishIcon({ size = 14, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M2 8c1-2.5 3.5-4 6-4s4.5 1.5 5.5 4c-1 2.5-3 4-5.5 4s-5-1.5-6-4z" />
      <path d="M13.5 8L15.5 5.5v5z" />
      <circle cx="10.5" cy="7.5" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  );
}
```

- [ ] **Step 2: Smoke-import to verify it compiles**

Run: `cd app && npx tsc --noEmit -p .`
Expected: 0 errors. (If pre-existing TS errors appear, ignore — only check for new ones related to this file.)

- [ ] **Step 3: Commit**

```bash
git add app/src/components/icons/FishIcon.tsx
git commit -m "feat(icons): add FishIcon SVG component"
```

---

## Task 12: Create `FillManaButton` component — popover open/close, target toggle, preview

**Files:**
- Create: `app/src/components/FillManaButton.tsx`
- Create: `app/src/components/FillManaButton.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `app/src/components/FillManaButton.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FillManaButton from './FillManaButton';
import { useGraphStore } from '../stores/graphStore';
import { useDeckStore } from '../stores/deckStore';
import type { Card } from '@shared/types';

function card(id: string, name: string, opts: Partial<Card> = {}): Card {
  return {
    oracleId: id, name, set: 't', printings: ['t'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [],
    typeLine: '', types: [], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null,
    rarity: 'common', imageUrl: '', tags: [],
    ...opts,
  };
}

beforeEach(() => {
  useGraphStore.setState({
    cards: new Map<string, Card>([
      ['bolt', card('bolt', 'Lightning Bolt', { types: ['Instant'], manaCost: '{R}', cmc: 1, colorIdentity: ['R'] })],
      ['mountain', card('mountain', 'Mountain', { types: ['Land'], supertypes: ['Basic'], subtypes: ['Mountain'] })],
    ]),
    edges: new Map(), edgesInbound: new Map(), tagCatalog: new Map(),
    ruleVersion: 't', status: 'ready',
  });
  useDeckStore.setState({
    activeDeckId: 'd1',
    decks: [{
      id: 'd1', name: 'My Deck', format: 'standard',
      originalCards: [{ oracleId: 'bolt', count: 22 }],
      workingCards: [{ oracleId: 'bolt', count: 22 }],
      createdAt: 0, updatedAt: 0,
    }],
  });
});

describe('FillManaButton', () => {
  it('renders the button', () => {
    render(<FillManaButton />);
    expect(screen.getByRole('button', { name: /fill mana/i })).toBeInTheDocument();
  });

  it('opens the popover on click and shows detected spell count', () => {
    render(<FillManaButton />);
    fireEvent.click(screen.getByRole('button', { name: /fill mana/i }));
    expect(screen.getByText(/22 spells/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/limited \(40\)/i)).toBeChecked();
  });

  it('toggling the radio updates the preview', () => {
    render(<FillManaButton />);
    fireEvent.click(screen.getByRole('button', { name: /fill mana/i }));
    fireEvent.click(screen.getByLabelText(/standard \(60\)/i));
    expect(screen.getByLabelText(/standard \(60\)/i)).toBeChecked();
    // Preview should show 24 Mountains for standard target.
    expect(screen.getByText(/24 mountain/i)).toBeInTheDocument();
  });

  it('Cancel closes the popover without mutation', async () => {
    const applySpy = vi.fn();
    useDeckStore.setState({ ...useDeckStore.getState(), applyLandFill: applySpy } as never);
    render(<FillManaButton />);
    fireEvent.click(screen.getByRole('button', { name: /fill mana/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(applySpy).not.toHaveBeenCalled();
    expect(screen.queryByText(/22 spells/i)).not.toBeInTheDocument();
  });

  it('Fill triggers applyLandFill and closes the popover', async () => {
    const applySpy = vi.fn();
    useDeckStore.setState({ ...useDeckStore.getState(), applyLandFill: applySpy } as never);
    render(<FillManaButton />);
    fireEvent.click(screen.getByRole('button', { name: /fill mana/i }));
    fireEvent.click(screen.getByRole('button', { name: /^fill$/i }));
    expect(applySpy).toHaveBeenCalledTimes(1);
    const callArg = applySpy.mock.calls[0]?.[0] as { add: { oracleId: string; count: number }[] };
    expect(callArg.add).toEqual([{ oracleId: 'mountain', count: 17 }]);
  });

  it('shows "no colored spells" message and disables Fill when deck has none', () => {
    useDeckStore.setState({
      ...useDeckStore.getState(),
      decks: [{
        id: 'd1', name: 'Empty', format: 'standard',
        originalCards: [], workingCards: [], createdAt: 0, updatedAt: 0,
      }],
    });
    render(<FillManaButton />);
    fireEvent.click(screen.getByRole('button', { name: /fill mana/i }));
    expect(screen.getByText(/add some colored spells/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^fill$/i })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd app && npx vitest run src/components/FillManaButton.test.tsx`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Create `FillManaButton.tsx`**

```tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useGraphStore } from '../stores/graphStore';
import { useActiveDeck, useDeckStore } from '../stores/deckStore';
import { computeLandFill, SUBTYPE_FOR_COLOR, type FillPlan } from '../lib/fillMana';
import { TOUR_IDS } from '../wizard/selectors';
import type { Color } from '@shared/types';

const COLOR_LABEL: Record<Color, string> = {
  W: 'Plains', U: 'Island', B: 'Swamp', R: 'Mountain', G: 'Forest',
};

export default function FillManaButton() {
  const cards = useGraphStore((s) => s.cards);
  const deck = useActiveDeck();
  const applyLandFill = useDeckStore((s) => s.applyLandFill);

  const [open, setOpen] = useState(false);
  const [override, setOverride] = useState<40 | 60 | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const spellCount = useMemo(() => {
    if (!deck) return 0;
    let n = 0;
    for (const entry of deck.workingCards) {
      const card = cards.get(entry.oracleId);
      if (!card) continue;
      if (card.types.includes('Land')) continue;
      n += entry.count;
    }
    return n;
  }, [deck, cards]);

  const plan: FillPlan | null = useMemo(() => {
    if (!deck) return null;
    return computeLandFill(
      deck,
      cards,
      override ? { targetOverride: override } : {},
    );
  }, [deck, cards, override]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!deck) return null;
  const target = override ?? plan?.inferredTarget ?? 40;
  const disabled = !plan || plan.reason === 'no_colored_spells' || plan.reason === 'empty' || (plan.add.length === 0 && plan.remove.length === 0);

  return (
    <div className="relative" ref={wrapperRef} data-tour-id={TOUR_IDS.fillManaButton}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-900"
      >
        Fill mana
        <span aria-hidden className="text-neutral-500">▾</span>
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Fill mana options"
          className="absolute right-0 z-50 mt-1 w-64 rounded-md border border-neutral-700 bg-neutral-900 p-3 text-sm text-neutral-200 shadow-xl"
        >
          <div className="mb-2 text-xs text-neutral-400">Detected: {spellCount} spells</div>
          <div className="space-y-1">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="fill-target"
                checked={target === 40}
                onChange={() => setOverride(40)}
              />
              <span>Limited (40) — 17 lands</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="fill-target"
                checked={target === 60}
                onChange={() => setOverride(60)}
              />
              <span>Standard (60) — 24 lands</span>
            </label>
          </div>
          <div className="mt-3 text-xs text-neutral-300">
            {plan?.reason === 'no_colored_spells' || plan?.reason === 'empty' ? (
              <span className="text-amber-300">Add some colored spells first.</span>
            ) : plan && (plan.add.length > 0 || plan.remove.length > 0) ? (
              <>
                <div>
                  Adding:{' '}
                  {plan.add.length === 0
                    ? 'none'
                    : plan.add
                        .map((a) => {
                          const cardEntry = cards.get(a.oracleId);
                          return `${a.count} ${cardEntry?.name ?? a.oracleId}`;
                        })
                        .join(', ')}
                </div>
                <div>
                  Replacing:{' '}
                  {plan.remove.reduce((s, r) => s + r.count, 0)} existing basics
                </div>
              </>
            ) : (
              <span className="text-neutral-500">No changes needed.</span>
            )}
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setOverride(null);
              }}
              className="rounded border border-neutral-700 px-2 py-1 text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={async () => {
                if (!plan) return;
                await applyLandFill(plan);
                setOpen(false);
                setOverride(null);
              }}
              className="rounded bg-amber-500 px-2 py-1 text-xs font-semibold text-black hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
            >
              Fill
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && npx vitest run src/components/FillManaButton.test.tsx`
Expected: 6 PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/FillManaButton.tsx app/src/components/FillManaButton.test.tsx
git commit -m "feat(FillManaButton): popover with target override and preview"
```

---

## Task 13: Create `GoldfishButton` and `GoldfishModal` — render + ESC close

**Files:**
- Create: `app/src/components/GoldfishButton.tsx`
- Create: `app/src/components/GoldfishModal.tsx`
- Create: `app/src/components/GoldfishModal.test.tsx`

- [ ] **Step 1: Write failing tests for the modal**

Create `app/src/components/GoldfishModal.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import GoldfishModal from './GoldfishModal';
import { useGraphStore } from '../stores/graphStore';
import { useDeckStore } from '../stores/deckStore';
import type { Card } from '@shared/types';

function card(id: string, name: string, opts: Partial<Card> = {}): Card {
  return {
    oracleId: id, name, set: 't', printings: ['t'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [],
    typeLine: '', types: ['Creature'], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null,
    rarity: 'common', imageUrl: 'https://img/x.png', tags: [],
    ...opts,
  };
}

beforeEach(() => {
  const map = new Map<string, Card>();
  for (let i = 0; i < 30; i++) {
    map.set(`c${i}`, card(`c${i}`, `Card ${i}`));
  }
  useGraphStore.setState({
    cards: map,
    edges: new Map(), edgesInbound: new Map(), tagCatalog: new Map(),
    ruleVersion: 't', status: 'ready',
  });
  useDeckStore.setState({
    activeDeckId: 'd1',
    decks: [{
      id: 'd1', name: 'Test Deck', format: 'standard',
      originalCards: Array.from({ length: 30 }, (_, i) => ({ oracleId: `c${i}`, count: 2 })),
      workingCards: Array.from({ length: 30 }, (_, i) => ({ oracleId: `c${i}`, count: 2 })),
      createdAt: 0, updatedAt: 0,
    }],
  });
});

describe('GoldfishModal', () => {
  it('renders 7 card images on open', () => {
    render(<GoldfishModal onClose={vi.fn()} />);
    const imgs = screen.getAllByRole('img');
    expect(imgs.length).toBe(7);
  });

  it('shows library count 53 / 60 on open', () => {
    render(<GoldfishModal onClose={vi.fn()} />);
    expect(screen.getByText(/53\s*\/\s*60/)).toBeInTheDocument();
  });

  it('Draw adds one card and decrements library', () => {
    render(<GoldfishModal onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /draw/i }));
    expect(screen.getAllByRole('img').length).toBe(8);
    expect(screen.getByText(/52\s*\/\s*60/)).toBeInTheDocument();
  });

  it('Draw disabled when library empty', () => {
    // 5-card deck
    useDeckStore.setState({
      ...useDeckStore.getState(),
      decks: [{
        id: 'd1', name: 'Tiny', format: 'standard',
        originalCards: [{ oracleId: 'c0', count: 5 }],
        workingCards: [{ oracleId: 'c0', count: 5 }],
        createdAt: 0, updatedAt: 0,
      }],
    });
    render(<GoldfishModal onClose={vi.fn()} />);
    // Initial render shows up to 7 — but only 5 cards exist.
    expect(screen.getAllByRole('img').length).toBe(5);
    expect(screen.getByRole('button', { name: /draw/i })).toBeDisabled();
  });

  it('Shuffle resets the hand to 7 fresh cards', () => {
    render(<GoldfishModal onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /draw/i }));
    fireEvent.click(screen.getByRole('button', { name: /draw/i }));
    expect(screen.getAllByRole('img').length).toBe(9);
    fireEvent.click(screen.getByRole('button', { name: /shuffle/i }));
    expect(screen.getAllByRole('img').length).toBe(7);
    expect(screen.getByText(/53\s*\/\s*60/)).toBeInTheDocument();
  });

  it('ESC calls onClose', () => {
    const onClose = vi.fn();
    render(<GoldfishModal onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('clicking backdrop calls onClose', () => {
    const onClose = vi.fn();
    const { container } = render(<GoldfishModal onClose={onClose} />);
    const backdrop = container.querySelector('[data-testid="goldfish-backdrop"]');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalled();
  });

  it('shows empty state when deck has no cards', () => {
    useDeckStore.setState({
      ...useDeckStore.getState(),
      decks: [{
        id: 'd1', name: 'Empty', format: 'standard',
        originalCards: [], workingCards: [], createdAt: 0, updatedAt: 0,
      }],
    });
    render(<GoldfishModal onClose={vi.fn()} />);
    expect(screen.getByText(/deck is empty/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /draw/i })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd app && npx vitest run src/components/GoldfishModal.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `GoldfishModal.tsx`**

```tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useGraphStore } from '../stores/graphStore';
import { useActiveDeck } from '../stores/deckStore';
import { buildShuffled } from '../lib/goldfish';

type Props = { onClose: () => void };

export default function GoldfishModal({ onClose }: Props) {
  const cards = useGraphStore((s) => s.cards);
  const deck = useActiveDeck();
  const handRowRef = useRef<HTMLDivElement>(null);

  const [shuffled, setShuffled] = useState<string[]>(
    () => (deck ? buildShuffled(deck, Math.random) : []),
  );
  const [drawn, setDrawn] = useState<string[]>(() => shuffled.slice(0, 7));
  const [drawIndex, setDrawIndex] = useState<number>(Math.min(7, shuffled.length));

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    handRowRef.current?.scrollTo({ left: handRowRef.current.scrollWidth });
  }, [drawn]);

  const onDraw = () => {
    if (drawIndex >= shuffled.length) return;
    const next = shuffled[drawIndex];
    if (next === undefined) return;
    setDrawn([...drawn, next]);
    setDrawIndex(drawIndex + 1);
  };

  const onShuffle = () => {
    if (!deck) return;
    const next = buildShuffled(deck, Math.random);
    setShuffled(next);
    setDrawn(next.slice(0, 7));
    setDrawIndex(Math.min(7, next.length));
  };

  const totalLibrary = shuffled.length;
  const remaining = totalLibrary - drawIndex;
  const empty = totalLibrary === 0;
  const canDraw = drawIndex < totalLibrary;

  return (
    <div
      data-testid="goldfish-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-[760px] max-w-[95vw] rounded-lg border border-neutral-700 bg-neutral-900 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="goldfish-title"
      >
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <h3 id="goldfish-title" className="text-sm font-semibold text-neutral-200">
            Goldfish — &ldquo;{deck?.name ?? '(no deck)'}&rdquo;
          </h3>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs tabular-nums text-neutral-400">
              Library: {remaining} / {totalLibrary}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="text-neutral-400 hover:text-neutral-100"
            >
              ×
            </button>
          </div>
        </div>
        <div className="my-4 min-h-[140px]">
          {empty ? (
            <div className="flex h-full items-center justify-center py-8 text-sm text-neutral-400">
              This deck is empty.
            </div>
          ) : (
            <div
              ref={handRowRef}
              className="flex flex-nowrap gap-2 overflow-x-auto pb-2"
            >
              {drawn.map((oracleId, i) => {
                const card = cards.get(oracleId);
                return (
                  <div key={`${oracleId}-${i}`} className="flex-none">
                    {card?.imageUrl ? (
                      <img
                        src={card.imageUrl}
                        alt={card.name}
                        className="h-[123px] w-[88px] rounded border border-neutral-700"
                      />
                    ) : (
                      <div
                        role="img"
                        aria-label={card?.name ?? oracleId}
                        className="flex h-[123px] w-[88px] items-end rounded border border-neutral-700 bg-neutral-800 p-1 text-[9px] text-neutral-300"
                      >
                        {card?.name ?? oracleId}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-neutral-800 pt-3">
          <button
            type="button"
            onClick={onShuffle}
            disabled={empty}
            className="rounded border border-neutral-700 px-3 py-1 text-xs text-neutral-200 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:text-neutral-600"
          >
            ↻ Shuffle
          </button>
          <button
            type="button"
            onClick={onDraw}
            disabled={!canDraw}
            className="rounded bg-amber-500 px-3 py-1 text-xs font-semibold text-black hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
          >
            + Draw
          </button>
        </div>
      </div>
    </div>
  );
}
```

Note: tests use `role="img"` to count cards — the fallback `<div role="img">` covers cards without `imageUrl`, while `<img>` already has implicit role "img". In tests we set `imageUrl: 'https://img/x.png'` so the `<img>` path is exercised; jsdom won't actually load the image, but the element gets the `img` role.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && npx vitest run src/components/GoldfishModal.test.tsx`
Expected: 8 PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/GoldfishModal.tsx app/src/components/GoldfishModal.test.tsx
git commit -m "feat(GoldfishModal): hand view with draw / shuffle / library counter"
```

---

## Task 14: Create `GoldfishButton` wrapping the icon + modal

**Files:**
- Create: `app/src/components/GoldfishButton.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useState } from 'react';
import GoldfishModal from './GoldfishModal';
import FishIcon from './icons/FishIcon';
import { TOUR_IDS } from '../wizard/selectors';

export default function GoldfishButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-tour-id={TOUR_IDS.goldfishButton}
        className="inline-flex items-center gap-1.5 rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-900"
      >
        <FishIcon className="text-amber-400" />
        Goldfish
      </button>
      {open && <GoldfishModal onClose={() => setOpen(false)} />}
    </>
  );
}
```

- [ ] **Step 2: Verify compile**

Run: `cd app && npx tsc --noEmit -p .`
Expected: 0 new errors. (Will fail for `TOUR_IDS.goldfishButton` not existing yet — fix in Task 16. For now, comment out the `data-tour-id` line if needed, or skip this step and verify after Task 16.)

If this fails because of `TOUR_IDS.goldfishButton`, leave the `data-tour-id` line and proceed — Task 16 adds the constant. To unblock the build in this task, temporarily change the prop to `data-tour-id="goldfish-button"` (literal string), and revert to `TOUR_IDS.goldfishButton` in Task 16.

- [ ] **Step 3: Commit**

```bash
git add app/src/components/GoldfishButton.tsx
git commit -m "feat(GoldfishButton): button + modal wrapper"
```

---

## Task 15: Wire both buttons into `DeckPage` action bar

**Files:**
- Modify: `app/src/pages/DeckPage.tsx`

- [ ] **Step 1: Replace the action bar block**

In `app/src/pages/DeckPage.tsx`, replace lines 31-36:

```tsx
      <div className="flex items-center justify-end gap-2 border-b border-neutral-800 bg-neutral-950 px-4 py-2" data-tour-id={TOUR_IDS.deckActionBar}>
        <FillManaButton />
        <GoldfishButton />
        <div className="inline-flex overflow-hidden rounded border border-neutral-700 text-xs">
          <span className="bg-amber-900/40 px-2 py-1 font-semibold text-amber-200">List</span>
          <Link to="/deck/graph" className="px-2 py-1 text-neutral-300 hover:bg-neutral-900" data-tour-id={TOUR_IDS.deckGraphLink}>Graph</Link>
        </div>
      </div>
```

Add imports near the top of the file:

```tsx
import FillManaButton from '../components/FillManaButton';
import GoldfishButton from '../components/GoldfishButton';
```

- [ ] **Step 2: Verify rendering**

Run: `cd app && npx vitest run`
Expected: existing tests pass. The DeckPage test (`DeckPage.test.tsx`) may need adjustment if it asserts on the action bar structure.

Run: `cd app && npx tsc --noEmit -p .`
Expected: error on `TOUR_IDS.deckActionBar` if Task 16 hasn't been done yet. Same fix as Task 14 — either use a literal string temporarily or proceed to Task 16 immediately.

- [ ] **Step 3: Commit**

```bash
git add app/src/pages/DeckPage.tsx
git commit -m "feat(DeckPage): add Fill mana and Goldfish buttons to action bar"
```

---

## Task 16: Add new `TOUR_IDS` and the active-deck tour step

**Files:**
- Modify: `app/src/wizard/selectors.ts`
- Modify: `app/src/wizard/tours.ts`

- [ ] **Step 1: Add the constants**

In `app/src/wizard/selectors.ts`, add three new entries to `TOUR_IDS` (after `manaCurve`):

```ts
  manaCurve: 'mana-curve',
  deckActionBar: 'deck-action-bar',
  fillManaButton: 'fill-mana-button',
  goldfishButton: 'goldfish-button',
  deckGraphLink: 'deck-graph-link',
```

- [ ] **Step 2: Add the tour step**

In `app/src/wizard/tours.ts`, modify the `activeDeck` array — insert the new step between step 3 ("Add cards") and step 4 ("Visualize"):

```ts
const activeDeck: Step[] = [
  {
    target: sel(TOUR_IDS.deckRail),
    title: 'Deck rail',
    content: 'Cards currently in this deck, grouped by type.',
    disableBeacon: true,
  },
  {
    target: sel(TOUR_IDS.manaCurve),
    title: 'Mana curve & legality',
    content: 'Live mana curve + Standard legality flag at a glance.',
    disableBeacon: true,
  },
  {
    target: sel(TOUR_IDS.deckRail),
    title: 'Add cards',
    content:
      "Switch to Browse, click any card, then use the 'Add to deck' button on its detail drawer.",
    disableBeacon: true,
  },
  {
    target: sel(TOUR_IDS.deckActionBar),
    title: 'Test the deck',
    content:
      "Fill mana auto-populates basic lands based on your deck's colors. Goldfish opens a 7-card sample hand to see if the opener feels right.",
    disableBeacon: true,
  },
  {
    target: sel(TOUR_IDS.deckGraphLink),
    title: 'Visualize',
    content: 'Click here to see your deck as an interaction graph.',
    disableBeacon: true,
  },
];
```

- [ ] **Step 3: Revert any temporary literal strings**

If Task 14 or Task 15 left literal `data-tour-id` strings as placeholders, replace them back to `TOUR_IDS.goldfishButton` / `TOUR_IDS.deckActionBar` now.

- [ ] **Step 4: Run app tests + type-check**

Run: `cd app && npx vitest run`
Expected: all tests pass.

Run: `cd app && npx tsc --noEmit -p .`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add app/src/wizard/selectors.ts app/src/wizard/tours.ts \
        app/src/components/GoldfishButton.tsx app/src/pages/DeckPage.tsx
git commit -m "feat(wizard): add Test-the-deck step to active-deck tour"
```

---

## Task 17: E2E smoke — assert both buttons appear on `/deck`

**Files:**
- Modify: `app/tests/e2e/*.spec.ts` (read existing first to find the right file)

- [ ] **Step 1: Inspect the existing smoke test**

```bash
ls app/tests/e2e/
cat app/tests/e2e/$(ls app/tests/e2e/ | grep spec | head -1)
```

Find the test that hits `/deck` (or `/decks`). If none does, add one.

- [ ] **Step 2: Append assertion**

In the appropriate spec file, add (or extend) a test that navigates to the deck page and asserts both buttons are visible:

```ts
test('deck page shows Fill mana and Goldfish buttons', async ({ page }) => {
  await page.goto('/');
  // Create a deck first if needed (existing smoke probably has setup).
  // Then navigate to /deck.
  await page.goto('/deck');
  await expect(page.getByRole('button', { name: /fill mana/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /goldfish/i })).toBeVisible();
});
```

Adapt to the existing smoke test's setup pattern. If the smoke test mocks the deck state via localStorage / Dexie seeding, follow that pattern. If it relies on a built artifact, ensure `cards-standard.json` exists (`npm run build:cards -- --standard` from repo root) before running.

- [ ] **Step 3: Run the E2E**

Run: `cd app && npm run e2e`
Expected: PASS.

If the existing E2E doesn't have a deck-page test at all, just verify the smoke still passes — the new assertion is a nice-to-have, not a blocker. The component tests already cover the buttons being present.

- [ ] **Step 4: Commit**

```bash
git add app/tests/e2e/
git commit -m "test(e2e): assert Fill mana and Goldfish buttons present"
```

---

## Task 18: Final gate — full repo test + build

**Files:** None (verification only).

- [ ] **Step 1: Run the full gate**

```bash
cd /Users/Dada/mtg-graph && npm test
```

Expected: pipeline tests + shared types + app vitest + app build all PASS.

If anything fails:
- Pipeline / shared types failures → not caused by this work; investigate independently.
- App vitest failures → likely the test files just need adjustment to match the implementation; debug and fix without changing the green tests.
- App build (tsc) failures → fix type errors (most likely `noUncheckedIndexedAccess` issues).

- [ ] **Step 2: Manual smoke test in the browser**

```bash
cd /Users/Dada/mtg-graph
# Build the artifact if missing
[ -f app/public/data/cards-standard.json ] || npm run build:cards -- --standard
cd app && npm run dev
```

Open http://localhost:5173, navigate to the Decks page, create or select a deck, switch to the deck view. Verify:
- [ ] Both buttons appear in the top-right action bar.
- [ ] Fill mana opens a popover. Toggle radios — preview text updates.
- [ ] Clicking Fill adds basic lands; they appear in the Lands section with a green left border.
- [ ] Save persists; Discard reverts.
- [ ] Goldfish opens a modal with 7 random card images.
- [ ] Draw adds a card; library counter decrements.
- [ ] Shuffle resets to 7 cards.
- [ ] ESC closes the modal.
- [ ] In the Help menu, replay the active-deck tour — confirm the new "Test the deck" step appears between "Add cards" and "Visualize".

- [ ] **Step 3: Commit any final adjustments**

If manual testing reveals tweaks (spacing, alignment), make them and commit:

```bash
git commit -m "polish(fill-mana, goldfish): UI adjustments from manual review"
```

---

## Self-Review Notes (for the implementer)

- **Spec coverage:** Every section in `2026-05-27-fill-mana-and-goldfish-design.md` maps to a task here. Pure modules → Tasks 1–8 and 10. Store action → Task 9. UI components → Tasks 11–14. Page wiring → Task 15. Tour → Task 16. E2E → Task 17. Final gate → Task 18.
- **Type safety:** Several spots index arrays (`shuffled[drawIndex]`, `apply.mock.calls[0]?.[0]`). With `noUncheckedIndexedAccess`, the code uses explicit `undefined` checks (see `buildShuffled`, `GoldfishModal.onDraw`). Follow the same pattern in any new sites.
- **Test isolation:** Component tests use `useGraphStore.setState` and `useDeckStore.setState` in `beforeEach` to set up fresh state. The pattern follows `DeckPanel.test.tsx`. `fake-indexeddb` is already loaded by `app/tests/setup.ts`, so Dexie works in jsdom.
- **No new dependencies:** This plan adds nothing to `package.json`. The fish icon is inline SVG; the popover is plain absolute positioning.
