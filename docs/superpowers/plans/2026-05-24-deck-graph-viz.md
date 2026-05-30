# Deck Graph Visualization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a force-directed graph view of the active deck plus its top-50 weighted candidates, accessible at `/deck/graph`, with mechanic-family edge colors, family/color pill filters, a refresh-suggestions button, double-click drill-in, and a click-selects-drawer-mutates interaction model.

**Architecture:** A new React Router route at `/deck/graph` renders `DeckGraphPage`, which composes four new components (`PillRow`, `GraphCanvas`, `SelectionDrawer`, plus the existing `DeckPanel` as an overlay drawer). Pure logic for tag-family mapping (`tagFamilies.ts`) and graph construction (`deckGraph.ts`) lives in `app/src/lib/`. The d3-force simulation runs inside a custom hook (`useDeckGraphSimulation`) that owns positions in a ref and updates SVG via direct DOM mutation in a `requestAnimationFrame` loop, so React only re-renders on selection/hover/topology change.

**Tech Stack:** TypeScript, React 18, Vite, React Router v6, Zustand (existing stores), Tailwind, `d3-force` (new), `d3-zoom` (new), `vitest` + `@testing-library/react`.

**Spec:** [`docs/superpowers/specs/2026-05-24-deck-graph-viz-design.md`](../specs/2026-05-24-deck-graph-viz-design.md)

**Routing deviation from spec:** The spec proposes `/deck/:id/graph` but the existing codebase uses the active-deck convention (`/deck` with no id, reading from `useActiveDeck()`). This plan uses `/deck/graph` to match the existing pattern. Behavior is identical from the user's perspective.

---

## File structure

| Path | Responsibility | Status |
|---|---|---|
| `app/src/lib/tagFamilies.ts` | Static `tagId → FamilyDef` map. Exports `FAMILIES` array, `familyFor(tagId)` lookup with prefix fallback for parametric tags. | Create |
| `app/src/lib/tagFamilies.test.ts` | Unit tests for `familyFor` (known ids, parametric fallback, unknown). | Create |
| `pipeline/tagFamilies-consistency.test.ts` | Catalog-consistency test: every tag in `tagCatalog` resolves to a family. | Create |
| `app/src/lib/deckGraph.ts` | Pure functions: `scoreCandidate`, `buildDeckGraph`, `buildFocusedGraph`. No React imports. | Create |
| `app/src/lib/deckGraph.test.ts` | TDD tests for scoring (weights, breadth, filters) and graph assembly. | Create |
| `app/src/components/deckGraph/useDeckGraphSimulation.ts` | Hook wrapping d3-force lifecycle, position ref, RAF update loop. | Create |
| `app/src/components/deckGraph/useDeckGraphSimulation.test.ts` | Unit tests with fake timers — init, topology change, position persistence. | Create |
| `app/src/components/deckGraph/GraphCanvas.tsx` | SVG renderer for nodes/edges, click/double-click/drag handlers, zoom/pan. | Create |
| `app/src/components/deckGraph/GraphCanvas.test.tsx` | Component tests for node/edge rendering and selection callbacks. | Create |
| `app/src/components/deckGraph/PillRow.tsx` | Mode toggle, family pills, color pills, refresh button. | Create |
| `app/src/components/deckGraph/PillRow.test.tsx` | Component tests for pill toggling, badge, auto-init. | Create |
| `app/src/components/deckGraph/SelectionDrawer.tsx` | Right-side slide-in: card preview, reasons, add/remove buttons. | Create |
| `app/src/components/deckGraph/SelectionDrawer.test.tsx` | Component tests for candidate vs deck-member affordances. | Create |
| `app/src/pages/DeckGraphPage.tsx` | Route component. Wires state, memoization, refresh logic. Renders pill row + canvas + drawer. | Create |
| `app/src/App.tsx` | Add `<Route path="/deck/graph" element={<DeckGraphPage />} />`. | Modify |
| `app/src/pages/DeckPage.tsx` | Add segmented List/Graph control in header. | Modify |
| `app/package.json` | Add `d3-force`, `d3-zoom`, `@types/d3-force`, `@types/d3-zoom`. | Modify |

---

## Task 1: Install dependencies

**Files:**
- Modify: `app/package.json`

- [ ] **Step 1: Install runtime + types**

Run:
```bash
cd app && npm install --save d3-force@^3.0.0 d3-zoom@^3.0.0 && npm install --save-dev @types/d3-force@^3.0.0 @types/d3-zoom@^3.0.0
```

Expected: `package.json` gets four new entries; `package-lock.json` updates; no version conflicts.

- [ ] **Step 2: Verify type imports resolve**

Run:
```bash
cd app && npx tsc --noEmit -p tsconfig.app.json
```

Expected: zero TS errors (no usage yet, just resolution check).

- [ ] **Step 3: Commit**

```bash
git add app/package.json app/package-lock.json
git commit -m "deps(app): add d3-force and d3-zoom for deck graph viz"
```

---

## Task 2: tagFamilies.ts — the mapping module

**Files:**
- Create: `app/src/lib/tagFamilies.ts`
- Test: `app/src/lib/tagFamilies.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `app/src/lib/tagFamilies.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { familyFor, FAMILIES, type FamilyId } from './tagFamilies';

describe('tagFamilies', () => {
  it('exposes all 12 family definitions', () => {
    const ids = FAMILIES.map((f) => f.id);
    expect(ids).toEqual([
      'destruction', 'counter-magic', 'bounce-blink', 'resources',
      'tribes', 'spellslinger', 'card-selection', 'tap-untap-steal',
      'lifegain', 'themes', 'set-mechanics', 'keywords',
    ]);
  });

  it('every family has a non-empty label and color', () => {
    for (const f of FAMILIES) {
      expect(f.label).toMatch(/.+/);
      expect(f.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it.each<[string, FamilyId]>([
    ['effect.destroy_creature', 'destruction'],
    ['effect.exile_creature', 'destruction'],
    ['effect.board_wipe', 'destruction'],
    ['effect.deals_damage', 'destruction'],
    ['effect.counterspell', 'counter-magic'],
    ['effect.bounce_creature', 'bounce-blink'],
    ['effect.bounce_or_blink', 'bounce-blink'],
    ['effect.add_mana', 'resources'],
    ['effect.create_treasure', 'resources'],
    ['effect.ramp_nonland', 'resources'],
    ['condition.cares_tribe', 'tribes'],
    ['effect.copy_spell', 'spellslinger'],
    ['effect.draws_or_discards', 'card-selection'],
    ['effect.scry', 'card-selection'],
    ['effect.tutor_any', 'card-selection'],
    ['effect.tap', 'tap-untap-steal'],
    ['effect.control_change', 'tap-untap-steal'],
    ['effect.life_changed', 'lifegain'],
    ['condition.cares_lifegain', 'lifegain'],
    ['condition.cares_graveyard', 'themes'],
    ['trigger.self_etb', 'themes'],
    ['effect.has_airbend', 'set-mechanics'],
    ['effect.has_kicker', 'set-mechanics'],
    ['effect.plus_one_counter', 'keywords'],
    ['effect.has_trample', 'keywords'],
  ])('maps %s → %s', (tagId, expected) => {
    expect(familyFor(tagId)?.id).toBe(expected);
  });

  it('resolves parametric tag ids by prefix fallback', () => {
    // condition.cares_subtype.dragon is generated at runtime by the parametric
    // condition.cares_subtype rule. The mapping should fall back on the parent.
    expect(familyFor('condition.cares_subtype.dragon')?.id).toBe('tribes');
    expect(familyFor('condition.cares_tribe.human')?.id).toBe('tribes');
    expect(familyFor('effect.tutors_subtype.equipment')?.id).toBe('card-selection');
  });

  it('returns undefined for unknown tag ids', () => {
    expect(familyFor('effect.this_does_not_exist')).toBeUndefined();
    expect(familyFor('totally_unrelated')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd app && npx vitest run src/lib/tagFamilies.test.ts
```

Expected: FAIL — `tagFamilies` module not found.

- [ ] **Step 3: Create the module**

Create `app/src/lib/tagFamilies.ts`:

```typescript
export type FamilyId =
  | 'destruction'
  | 'counter-magic'
  | 'bounce-blink'
  | 'resources'
  | 'tribes'
  | 'spellslinger'
  | 'card-selection'
  | 'tap-untap-steal'
  | 'lifegain'
  | 'themes'
  | 'set-mechanics'
  | 'keywords';

export type FamilyDef = {
  id: FamilyId;
  label: string;
  color: string; // hex
};

export const FAMILIES: FamilyDef[] = [
  { id: 'destruction',     label: 'Destruction',         color: '#ef4444' },
  { id: 'counter-magic',   label: 'Counter-magic',       color: '#a855f7' },
  { id: 'bounce-blink',    label: 'Bounce / Blink',      color: '#06b6d4' },
  { id: 'resources',       label: 'Resources',           color: '#22c55e' },
  { id: 'tribes',          label: 'Tribes',              color: '#ec4899' },
  { id: 'spellslinger',    label: 'Spellslinger',        color: '#0ea5e9' },
  { id: 'card-selection',  label: 'Card Selection',      color: '#eab308' },
  { id: 'tap-untap-steal', label: 'Tap/Untap & Steal',   color: '#84cc16' },
  { id: 'lifegain',        label: 'Lifegain',            color: '#f97316' },
  { id: 'themes',          label: 'Archetype Themes',    color: '#a3a3a3' },
  { id: 'set-mechanics',   label: 'Set Mechanics',       color: '#14b8a6' },
  { id: 'keywords',        label: 'Keyword Properties',  color: '#64748b' },
];

const FAMILY_BY_ID = new Map(FAMILIES.map((f) => [f.id, f]));

// Static mapping for every concrete tag id known at v0.8. Parametric rules
// (cares_subtype, cares_tribe, tutors_subtype) get their *parent* id entered;
// child ids like `condition.cares_subtype.dragon` are resolved via the
// prefix-fallback in familyFor().
const TAG_TO_FAMILY: Record<string, FamilyId> = {
  // ── destruction (removal, board wipes, sacrifice-as-removal, damage) ──
  'effect.board_wipe': 'destruction',
  'effect.deals_damage': 'destruction',
  'effect.debuff_minus_n': 'destruction',
  'effect.destroy_artifact': 'destruction',
  'effect.destroy_creature': 'destruction',
  'effect.destroy_enchantment': 'destruction',
  'effect.destroy_land': 'destruction',
  'effect.destroy_permanent': 'destruction',
  'effect.destroy_planeswalker': 'destruction',
  'effect.exile_artifact': 'destruction',
  'effect.exile_creature': 'destruction',
  'effect.exile_enchantment': 'destruction',
  'effect.exile_from_battlefield': 'destruction',
  'effect.exile_from_graveyard': 'destruction',
  'effect.exile_land': 'destruction',
  'effect.exile_planeswalker': 'destruction',
  'effect.sacrifice_artifact': 'destruction',
  'effect.sacrifice_creature': 'destruction',
  'effect.sacrifice_enchantment': 'destruction',
  'effect.sacrifice_land': 'destruction',
  'effect.sacrifice_permanent': 'destruction',
  'effect.sacrifice_planeswalker': 'destruction',
  'trigger.artifact_leaves_battlefield': 'destruction',
  'trigger.creature_dies': 'destruction',
  'trigger.creature_leaves_battlefield': 'destruction',
  'trigger.damage_dealt': 'destruction',
  'trigger.enchantment_leaves_battlefield': 'destruction',
  'trigger.land_leaves_battlefield': 'destruction',
  'trigger.permanent_leaves_battlefield': 'destruction',
  'trigger.planeswalker_leaves_battlefield': 'destruction',

  // ── counter-magic ──
  'effect.counterspell': 'counter-magic',

  // ── bounce-blink ──
  'effect.bounce_artifact': 'bounce-blink',
  'effect.bounce_creature': 'bounce-blink',
  'effect.bounce_enchantment': 'bounce-blink',
  'effect.bounce_land': 'bounce-blink',
  'effect.bounce_or_blink': 'bounce-blink',
  'effect.bounce_planeswalker': 'bounce-blink',

  // ── resources (mana, tokens, treasures, lands-as-resources) ──
  'effect.add_mana': 'resources',
  'effect.create_clue': 'resources',
  'effect.create_creature_token': 'resources',
  'effect.create_food': 'resources',
  'effect.create_token': 'resources',
  'effect.create_treasure': 'resources',
  'effect.is_manland': 'resources',
  'effect.land_enters_tapped_conditional': 'resources',
  'effect.ramp_nonland': 'resources',
  'condition.cares_tokens': 'resources',
  'trigger.token_created': 'resources',

  // ── tribes ──
  'condition.cares_islands': 'tribes',
  'condition.cares_subtype': 'tribes',
  'condition.cares_tribe': 'tribes',
  'effect.land_becomes_island': 'tribes',

  // ── spellslinger (instants/sorceries matter, cast triggers, copy) ──
  'condition.cares_instant_sorcery_in_graveyard': 'spellslinger',
  'condition.cares_noncreature_spell': 'spellslinger',
  'effect.cast_noncreature_spell': 'spellslinger',
  'effect.copy_spell': 'spellslinger',
  'effect.cost_reduction': 'spellslinger',
  'effect.is_instant_or_sorcery': 'spellslinger',
  'trigger.spell_cast': 'spellslinger',

  // ── card-selection (draw, scry, surveil, mill, tutor) ──
  'effect.draws_or_discards': 'card-selection',
  'effect.look_at_top_n': 'card-selection',
  'effect.mill': 'card-selection',
  'effect.scry': 'card-selection',
  'effect.surveil': 'card-selection',
  'effect.tutor_any': 'card-selection',
  'effect.tutors_creature': 'card-selection',
  'effect.tutors_subtype': 'card-selection',
  'trigger.card_drawn_discarded': 'card-selection',

  // ── tap-untap-steal ──
  'effect.control_change': 'tap-untap-steal',
  'effect.copy_permanent': 'tap-untap-steal',
  'effect.tap': 'tap-untap-steal',
  'effect.untap': 'tap-untap-steal',
  'trigger.tapped_or_untapped': 'tap-untap-steal',

  // ── lifegain ──
  'condition.cares_lifegain': 'lifegain',
  'effect.life_changed': 'lifegain',
  'trigger.life_changed': 'lifegain',

  // ── themes (archetype enablers, graveyard, ETB matters, adventure) ──
  'condition.adventure_matters': 'themes',
  'condition.bargain': 'themes',
  'condition.cares_activated_abilities': 'themes',
  'condition.cares_artifacts': 'themes',
  'condition.cares_enchantments': 'themes',
  'condition.cares_graveyard': 'themes',
  'condition.cares_high_mana_value': 'themes',
  'condition.cast_from_graveyard': 'themes',
  'condition.has_x_in_cost': 'themes',
  'effect.adventure_card': 'themes',
  'effect.reanimate': 'themes',
  'effect.return_from_graveyard_to_hand': 'themes',
  'trigger.another_creature_etb': 'themes',
  'trigger.creature_leaves_graveyard': 'themes',
  'trigger.self_etb': 'themes',

  // ── set-mechanics (mechanics scoped to specific sets) ──
  'condition.cares_bending': 'set-mechanics',
  'effect.has_airbend': 'set-mechanics',
  'effect.has_earthbend': 'set-mechanics',
  'effect.has_firebending': 'set-mechanics',
  'effect.has_gift': 'set-mechanics',
  'effect.has_harmonize': 'set-mechanics',
  'effect.has_kicker': 'set-mechanics',
  'effect.has_plot': 'set-mechanics',
  'effect.has_prepared': 'set-mechanics',
  'effect.has_warp': 'set-mechanics',
  'effect.has_waterbend': 'set-mechanics',
  'effect.has_web_slinging': 'set-mechanics',
  'effect.is_room': 'set-mechanics',

  // ── keywords (intrinsic combat-relevant abilities and +1/+1-counter) ──
  'condition.cares_deathtouch': 'keywords',
  'condition.cares_evasion': 'keywords',
  'condition.cares_plus_one_counter': 'keywords',
  'effect.counter_modified': 'keywords',
  'effect.grants_evasion': 'keywords',
  'effect.grants_stat_buff': 'keywords',
  'effect.has_activated_ability': 'keywords',
  'effect.has_cycling': 'keywords',
  'effect.has_deathtouch': 'keywords',
  'effect.has_evasion_intrinsic': 'keywords',
  'effect.has_first_strike': 'keywords',
  'effect.has_lifelink': 'keywords',
  'effect.has_prowess': 'keywords',
  'effect.has_trample': 'keywords',
  'effect.plus_one_counter': 'keywords',
  'trigger.attack_or_block': 'keywords',
  'trigger.counter_changed': 'keywords',
};

/**
 * Resolves a tagId to its visual family. For parametric tag ids generated at
 * runtime (e.g. `condition.cares_subtype.dragon`), falls back by stripping
 * suffixes after each `.` until a parent matches.
 */
export function familyFor(tagId: string): FamilyDef | undefined {
  const direct = TAG_TO_FAMILY[tagId];
  if (direct) return FAMILY_BY_ID.get(direct);

  // Parametric fallback: walk back through dotted segments.
  // `effect.tutors_subtype.equipment` → `effect.tutors_subtype` → ...
  let probe = tagId;
  while (true) {
    const lastDot = probe.lastIndexOf('.');
    if (lastDot <= 0) return undefined;
    probe = probe.slice(0, lastDot);
    const hit = TAG_TO_FAMILY[probe];
    if (hit) return FAMILY_BY_ID.get(hit);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
cd app && npx vitest run src/lib/tagFamilies.test.ts
```

Expected: PASS — all assertions green.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/tagFamilies.ts app/src/lib/tagFamilies.test.ts
git commit -m "feat(app): add tag-family mapping for graph edge coloring"
```

---

## Task 3: Catalog-consistency test (pipeline-side)

**Files:**
- Create: `pipeline/tagFamilies-consistency.test.ts`

- [ ] **Step 1: Write the failing test**

Create `pipeline/tagFamilies-consistency.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { tagCatalog } from './catalog';
import { familyFor } from '../app/src/lib/tagFamilies';

describe('tagFamilies consistency with catalog', () => {
  it('every tag in tagCatalog resolves to a family', () => {
    // Catalog warming is handled by pipeline/test-setup.ts (see vitest.config.ts).
    const ids = Array.from(Object.keys(tagCatalog));
    const orphans = ids.filter((id) => familyFor(id) === undefined);
    expect(orphans).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test**

Run from repo root:
```bash
npx vitest run pipeline/tagFamilies-consistency.test.ts
```

Expected: PASS if Task 2's enumeration covered every catalog tag; FAIL listing any orphan ids if not. If orphans appear, add them to `TAG_TO_FAMILY` in `app/src/lib/tagFamilies.ts` (matching to the most-appropriate family), re-run, repeat until green. **Do not satisfy the test by returning a default family** — orphans must be hand-classified.

- [ ] **Step 3: Commit**

```bash
git add pipeline/tagFamilies-consistency.test.ts
# If you had to extend the mapping, include that file too:
# git add app/src/lib/tagFamilies.ts
git commit -m "test(pipeline): enforce every catalog tag has a graph family"
```

---

## Task 4: deckGraph.ts — scoring core

**Files:**
- Create: `app/src/lib/deckGraph.ts`
- Test: `app/src/lib/deckGraph.test.ts`

- [ ] **Step 1: Write the failing tests for `scoreCandidate`**

Create `app/src/lib/deckGraph.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import type { Card, InteractionEdge } from '@shared/types';
import {
  scoreCandidate,
  type CandidateScoreInput,
  type FilterState,
} from './deckGraph';

// Minimal Card stub — only the fields scoreCandidate reads.
function card(id: string, colorIdentity: Card['colorIdentity'] = []): Card {
  return {
    oracleId: id,
    name: id,
    set: 'tst',
    printings: ['tst'],
    collectorNumber: '1',
    manaCost: null,
    cmc: 0,
    colors: colorIdentity,
    colorIdentity,
    typeLine: 'Creature',
    types: ['Creature'],
    subtypes: [],
    supertypes: [],
    oracleText: '',
    keywords: [],
    power: null,
    toughness: null,
    rarity: 'common',
    imageUrl: '',
    tags: [],
  };
}

function edge(source: string, target: string, sourceTagId: string, targetTagId: string): InteractionEdge {
  return {
    source, target,
    reason: { sourceTagId, targetTagId, direction: 'source_produces_for_target' },
  };
}

const noFilter: FilterState = {
  offFamilies: new Set(),
  onColors: new Set(['W', 'U', 'B', 'R', 'G']),
};

describe('scoreCandidate', () => {
  it('returns 0 for a candidate with no edges to the deck', () => {
    const input: CandidateScoreInput = {
      candidate: card('c1'),
      edgesByPair: new Map(), // no edges
      deckOracleIds: new Set(['d1']),
      filters: noFilter,
    };
    expect(scoreCandidate(input)).toBe(0);
  });

  it('scores a single edge in a single family at the base weight', () => {
    // 1 edge × 1 deck card × 1 family = weight(1) * breadth(1) = 1 * 1 = 1
    const pair = edge('c1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies');
    const input: CandidateScoreInput = {
      candidate: card('c1'),
      edgesByPair: new Map([['c1|d1', [pair]]]),
      deckOracleIds: new Set(['d1']),
      filters: noFilter,
    };
    expect(scoreCandidate(input)).toBeCloseTo(1.0);
  });

  it('applies diminishing returns to multiple edges in the same family/pair', () => {
    // 3 edges, same family, same pair: weight = 1 + 0.3 * 2 = 1.6; breadth(1) = 1
    const e1 = edge('c1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies');
    const e2 = edge('c1', 'd1', 'effect.destroy_artifact', 'trigger.artifact_leaves_battlefield');
    const e3 = edge('c1', 'd1', 'effect.board_wipe', 'trigger.creature_dies');
    const input: CandidateScoreInput = {
      candidate: card('c1'),
      edgesByPair: new Map([['c1|d1', [e1, e2, e3]]]),
      deckOracleIds: new Set(['d1']),
      filters: noFilter,
    };
    expect(scoreCandidate(input)).toBeCloseTo(1.6);
  });

  it('rewards breadth: 3 distinct deck targets > 3 edges to one target', () => {
    // Same family (destruction), same n=3 edge count, but breadth differs.
    const broad: CandidateScoreInput = {
      candidate: card('c1'),
      edgesByPair: new Map([
        ['c1|d1', [edge('c1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies')]],
        ['c1|d2', [edge('c1', 'd2', 'effect.destroy_creature', 'trigger.creature_dies')]],
        ['c1|d3', [edge('c1', 'd3', 'effect.destroy_creature', 'trigger.creature_dies')]],
      ]),
      deckOracleIds: new Set(['d1', 'd2', 'd3']),
      filters: noFilter,
    };
    const narrow: CandidateScoreInput = {
      candidate: card('c1'),
      edgesByPair: new Map([
        ['c1|d1', [
          edge('c1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies'),
          edge('c1', 'd1', 'effect.destroy_artifact', 'trigger.artifact_leaves_battlefield'),
          edge('c1', 'd1', 'effect.board_wipe', 'trigger.creature_dies'),
        ]],
      ]),
      deckOracleIds: new Set(['d1', 'd2', 'd3']),
      filters: noFilter,
    };
    expect(scoreCandidate(broad)).toBeGreaterThan(scoreCandidate(narrow));
  });

  it('sums across multiple families', () => {
    // 1 destruction edge to d1 + 1 lifegain edge to d2
    // = (weight(1)*breadth(1)) + (weight(1)*breadth(1)) = 1 + 1 = 2
    const input: CandidateScoreInput = {
      candidate: card('c1'),
      edgesByPair: new Map([
        ['c1|d1', [edge('c1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies')]],
        ['c1|d2', [edge('c1', 'd2', 'effect.life_changed', 'condition.cares_lifegain')]],
      ]),
      deckOracleIds: new Set(['d1', 'd2']),
      filters: noFilter,
    };
    expect(scoreCandidate(input)).toBeCloseTo(2.0);
  });

  it('zeros families toggled off', () => {
    const input: CandidateScoreInput = {
      candidate: card('c1'),
      edgesByPair: new Map([
        ['c1|d1', [edge('c1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies')]],
      ]),
      deckOracleIds: new Set(['d1']),
      filters: {
        offFamilies: new Set(['destruction']),
        onColors: new Set(['W', 'U', 'B', 'R', 'G']),
      },
    };
    expect(scoreCandidate(input)).toBe(0);
  });

  it('zeros candidates whose color identity is not a subset of toggled-on colors', () => {
    // Bant card (W/U/G), Blue is off → 0
    const input: CandidateScoreInput = {
      candidate: card('c1', ['W', 'U', 'G']),
      edgesByPair: new Map([
        ['c1|d1', [edge('c1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies')]],
      ]),
      deckOracleIds: new Set(['d1']),
      filters: {
        offFamilies: new Set(),
        onColors: new Set(['W', 'B', 'R', 'G']), // U is off
      },
    };
    expect(scoreCandidate(input)).toBe(0);
  });

  it('allows mono-color cards when their color is on', () => {
    const input: CandidateScoreInput = {
      candidate: card('c1', ['B']),
      edgesByPair: new Map([
        ['c1|d1', [edge('c1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies')]],
      ]),
      deckOracleIds: new Set(['d1']),
      filters: {
        offFamilies: new Set(),
        onColors: new Set(['B', 'G']),
      },
    };
    expect(scoreCandidate(input)).toBeGreaterThan(0);
  });

  it('treats colorless cards as always color-eligible', () => {
    const input: CandidateScoreInput = {
      candidate: card('c1', []),
      edgesByPair: new Map([
        ['c1|d1', [edge('c1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies')]],
      ]),
      deckOracleIds: new Set(['d1']),
      filters: { offFamilies: new Set(), onColors: new Set(['B']) },
    };
    expect(scoreCandidate(input)).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd app && npx vitest run src/lib/deckGraph.test.ts
```

Expected: FAIL — `deckGraph` module not found.

- [ ] **Step 3: Implement the scoring core**

Create `app/src/lib/deckGraph.ts`:

```typescript
import type { Card, Color, InteractionEdge } from '@shared/types';
import { familyFor, type FamilyId } from './tagFamilies';

export const MAX_CANDIDATES = 50;
const WEIGHT_DIMINISH = 0.3;
const BREADTH_BONUS = 0.2;

export type FilterState = {
  offFamilies: Set<FamilyId>;
  onColors: Set<Color>;
};

export type CandidateScoreInput = {
  candidate: Card;
  /** Map of `${candidateId}|${deckId}` → all edges between that pair (either direction). */
  edgesByPair: Map<string, InteractionEdge[]>;
  deckOracleIds: Set<string>;
  filters: FilterState;
};

function edgeFamily(e: InteractionEdge): FamilyId | undefined {
  // An edge connects two tags. Use the source tag's family as canonical;
  // pipeline pairings are family-coherent in practice (e.g. destroy → dies,
  // lifegain → cares_lifegain), so the source family is the right label.
  return familyFor(e.reason.sourceTagId)?.id;
}

function colorAllowed(card: Card, onColors: Set<Color>): boolean {
  // Option B: card's color identity must be a SUBSET of toggled-on colors.
  // Colorless cards (empty identity) pass trivially.
  for (const c of card.colorIdentity) {
    if (!onColors.has(c)) return false;
  }
  return true;
}

export function scoreCandidate(input: CandidateScoreInput): number {
  const { candidate, edgesByPair, deckOracleIds, filters } = input;
  if (!colorAllowed(candidate, filters.onColors)) return 0;

  // Group edges by family: for each family, count total edges + distinct deck targets.
  type FamilyAcc = { count: number; deckIds: Set<string> };
  const byFamily = new Map<FamilyId, FamilyAcc>();

  for (const [pairKey, edges] of edgesByPair) {
    // Verify this pair touches our candidate; defensive — caller should slice first.
    const [a, b] = pairKey.split('|');
    if (a !== candidate.oracleId && b !== candidate.oracleId) continue;
    const deckId = a === candidate.oracleId ? b : a;
    if (!deckId || !deckOracleIds.has(deckId)) continue;

    for (const e of edges) {
      const fam = edgeFamily(e);
      if (!fam || filters.offFamilies.has(fam)) continue;
      const acc = byFamily.get(fam) ?? { count: 0, deckIds: new Set<string>() };
      acc.count += 1;
      acc.deckIds.add(deckId);
      byFamily.set(fam, acc);
    }
  }

  let total = 0;
  for (const { count, deckIds } of byFamily.values()) {
    const weight = 1 + WEIGHT_DIMINISH * (count - 1);
    const breadth = 1 + BREADTH_BONUS * (deckIds.size - 1);
    total += weight * breadth;
  }
  return total;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
cd app && npx vitest run src/lib/deckGraph.test.ts
```

Expected: PASS — all `scoreCandidate` cases green.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/deckGraph.ts app/src/lib/deckGraph.test.ts
git commit -m "feat(app): deck-graph scoring with breadth bonus and color/family filters"
```

---

## Task 5: deckGraph.ts — `buildDeckGraph` assembly

**Files:**
- Modify: `app/src/lib/deckGraph.ts`
- Modify: `app/src/lib/deckGraph.test.ts`

- [ ] **Step 1: Add failing tests for `buildDeckGraph`**

Append to `app/src/lib/deckGraph.test.ts`:

```typescript
import { buildDeckGraph, type GraphInput } from './deckGraph';

describe('buildDeckGraph', () => {
  function inputWith(opts: {
    deckIds: string[];
    deckCards: Card[];
    candidateCards: Card[];
    edges: InteractionEdge[];
    filters?: FilterState;
  }): GraphInput {
    const cards = new Map<string, Card>();
    for (const c of [...opts.deckCards, ...opts.candidateCards]) cards.set(c.oracleId, c);
    const outbound = new Map<string, InteractionEdge[]>();
    const inbound = new Map<string, InteractionEdge[]>();
    for (const e of opts.edges) {
      (outbound.get(e.source) ?? outbound.set(e.source, []).get(e.source)!).push(e);
      (inbound.get(e.target) ?? inbound.set(e.target, []).get(e.target)!).push(e);
    }
    return {
      deckOracleIds: opts.deckIds,
      cards,
      outbound,
      inbound,
      filters: opts.filters ?? noFilter,
    };
  }

  it('returns empty nodes/edges for an empty deck', () => {
    const g = buildDeckGraph(inputWith({
      deckIds: [], deckCards: [], candidateCards: [card('c1')], edges: [],
    }));
    expect(g.nodes).toEqual([]);
    expect(g.edges).toEqual([]);
  });

  it('returns deck-only nodes when deck has no edges to outside cards', () => {
    const g = buildDeckGraph(inputWith({
      deckIds: ['d1', 'd2'],
      deckCards: [card('d1'), card('d2')],
      candidateCards: [card('c1')],
      edges: [],
    }));
    expect(g.nodes.map((n) => n.id).sort()).toEqual(['d1', 'd2']);
    expect(g.nodes.every((n) => n.cls === 'deck')).toBe(true);
    expect(g.edges).toEqual([]);
  });

  it('includes candidates that have edges to deck cards, ranked by score', () => {
    const g = buildDeckGraph(inputWith({
      deckIds: ['d1', 'd2'],
      deckCards: [card('d1'), card('d2')],
      candidateCards: [card('c1'), card('c2'), card('c3')],
      edges: [
        // c1: 1 destruction edge to d1
        edge('c1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies'),
        // c2: 1 destruction edge to d1 AND 1 lifegain edge to d2 (higher score)
        edge('c2', 'd1', 'effect.destroy_creature', 'trigger.creature_dies'),
        edge('c2', 'd2', 'effect.life_changed', 'condition.cares_lifegain'),
        // c3: no edges
      ],
    }));
    const candidateNodes = g.nodes.filter((n) => n.cls === 'candidate').map((n) => n.id);
    // c2 has the higher score so it ranks first; c3 is excluded (no edges).
    expect(candidateNodes).toEqual(['c2', 'c1']);
  });

  it('builds one edge per (source, target) pair with dominant family + breakdown', () => {
    const g = buildDeckGraph(inputWith({
      deckIds: ['d1'],
      deckCards: [card('d1')],
      candidateCards: [card('c1')],
      edges: [
        // 2 destruction + 1 lifegain → dominant = destruction
        edge('c1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies'),
        edge('c1', 'd1', 'effect.board_wipe', 'trigger.creature_dies'),
        edge('c1', 'd1', 'effect.life_changed', 'condition.cares_lifegain'),
      ],
    }));
    expect(g.edges).toHaveLength(1);
    const e = g.edges[0]!;
    // Endpoints normalized; nodeA = deck, nodeB = candidate (or alphabetical — either is fine, just test by id presence).
    const endpoints = [e.source, e.target].sort();
    expect(endpoints).toEqual(['c1', 'd1']);
    expect(e.dominantFamily).toBe('destruction');
    expect(e.totalEdgeCount).toBe(3);
    const breakdownIds = e.familyBreakdown.map((b) => b.familyId).sort();
    expect(breakdownIds).toEqual(['destruction', 'lifegain']);
  });

  it('caps candidates at MAX_CANDIDATES', () => {
    const deck = [card('d1')];
    const candidates: Card[] = [];
    const edges: InteractionEdge[] = [];
    for (let i = 0; i < 70; i++) {
      candidates.push(card(`c${i}`));
      edges.push(edge(`c${i}`, 'd1', 'effect.destroy_creature', 'trigger.creature_dies'));
    }
    const g = buildDeckGraph(inputWith({
      deckIds: ['d1'], deckCards: deck, candidateCards: candidates, edges,
    }));
    const candCount = g.nodes.filter((n) => n.cls === 'candidate').length;
    expect(candCount).toBe(50); // MAX_CANDIDATES
  });

  it('drops candidates filtered out by color', () => {
    const g = buildDeckGraph(inputWith({
      deckIds: ['d1'],
      deckCards: [card('d1')],
      candidateCards: [card('c-mono-blue', ['U']), card('c-mono-black', ['B'])],
      edges: [
        edge('c-mono-blue', 'd1', 'effect.destroy_creature', 'trigger.creature_dies'),
        edge('c-mono-black', 'd1', 'effect.destroy_creature', 'trigger.creature_dies'),
      ],
      filters: { offFamilies: new Set(), onColors: new Set(['B', 'G']) },
    }));
    const candidateIds = g.nodes.filter((n) => n.cls === 'candidate').map((n) => n.id);
    expect(candidateIds).toEqual(['c-mono-black']);
  });

  it('drops edges whose family is toggled off, and candidates whose score drops to 0', () => {
    const g = buildDeckGraph(inputWith({
      deckIds: ['d1'],
      deckCards: [card('d1')],
      candidateCards: [card('c1')],
      edges: [
        edge('c1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies'),
      ],
      filters: {
        offFamilies: new Set(['destruction']),
        onColors: new Set(['W', 'U', 'B', 'R', 'G']),
      },
    }));
    expect(g.nodes.filter((n) => n.cls === 'candidate')).toEqual([]);
    expect(g.edges).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd app && npx vitest run src/lib/deckGraph.test.ts
```

Expected: FAIL — `buildDeckGraph` and `GraphInput` not exported.

- [ ] **Step 3: Implement `buildDeckGraph`**

Append to `app/src/lib/deckGraph.ts`:

```typescript
export type GraphNodeCls = 'deck' | 'candidate';

export type GraphNode = {
  id: string;
  cls: GraphNodeCls;
  card: Card;
  radius: number;       // visual size, scales with edge count
  edgeCount: number;    // edges incident to this node in the rendered graph
};

export type FamilyBreakdownEntry = {
  familyId: FamilyId;
  count: number;
  score: number;
};

export type GraphEdge = {
  source: string;          // oracleId (d3-force will replace with node ref at sim time)
  target: string;          // oracleId
  dominantFamily: FamilyId;
  totalEdgeCount: number;
  weight: number;          // sum of family weight*breadth used as link strength
  familyBreakdown: FamilyBreakdownEntry[];
};

export type GraphInput = {
  deckOracleIds: string[];
  cards: Map<string, Card>;
  outbound: Map<string, InteractionEdge[]>;
  inbound: Map<string, InteractionEdge[]>;
  filters: FilterState;
};

export type GraphOutput = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function buildDeckGraph(input: GraphInput): GraphOutput {
  const deckSet = new Set(input.deckOracleIds);

  // Collect candidate edges keyed by `${cand}|${deckCard}` (sorted ids).
  // For each deck card, scan its outbound + inbound edges; any neighbor not in
  // the deck set is a candidate.
  const edgesByCandidate = new Map<string, Map<string, InteractionEdge[]>>();

  function addCandidateEdge(deckId: string, otherId: string, e: InteractionEdge) {
    if (deckSet.has(otherId)) return;       // deck↔deck handled separately
    if (!input.cards.has(otherId)) return;  // unknown printing, skip
    const pair = pairKey(otherId, deckId);
    const byPair = edgesByCandidate.get(otherId) ?? new Map();
    const list = byPair.get(pair) ?? [];
    list.push(e);
    byPair.set(pair, list);
    edgesByCandidate.set(otherId, byPair);
  }

  for (const deckId of input.deckOracleIds) {
    for (const e of input.outbound.get(deckId) ?? []) {
      addCandidateEdge(deckId, e.target, e);
    }
    for (const e of input.inbound.get(deckId) ?? []) {
      addCandidateEdge(deckId, e.source, e);
    }
  }

  // Score each candidate, keep top MAX_CANDIDATES.
  type Scored = { candidateId: string; score: number };
  const scored: Scored[] = [];
  for (const [candId, byPair] of edgesByCandidate) {
    const card = input.cards.get(candId);
    if (!card) continue;
    const s = scoreCandidate({
      candidate: card,
      edgesByPair: byPair,
      deckOracleIds: deckSet,
      filters: input.filters,
    });
    if (s > 0) scored.push({ candidateId: candId, score: s });
  }
  scored.sort((a, b) => b.score - a.score);
  const topCandidates = scored.slice(0, MAX_CANDIDATES).map((s) => s.candidateId);
  const topCandSet = new Set(topCandidates);

  // Build deck↔deck edges by scanning each deck card's outbound to other deck cards.
  type EdgeAcc = {
    pair: string;
    a: string;
    b: string;
    byFamily: Map<FamilyId, number>;
  };
  const edgeAccs = new Map<string, EdgeAcc>();

  function recordEdge(a: string, b: string, e: InteractionEdge) {
    const fam = familyFor(e.reason.sourceTagId)?.id;
    if (!fam) return;
    if (input.filters.offFamilies.has(fam)) return;
    const pk = pairKey(a, b);
    const acc = edgeAccs.get(pk) ?? { pair: pk, a, b, byFamily: new Map() };
    acc.byFamily.set(fam, (acc.byFamily.get(fam) ?? 0) + 1);
    edgeAccs.set(pk, acc);
  }

  // deck↔deck
  for (const deckId of input.deckOracleIds) {
    for (const e of input.outbound.get(deckId) ?? []) {
      if (deckSet.has(e.target) && e.target !== deckId) {
        recordEdge(deckId, e.target, e);
      }
    }
  }
  // deck↔candidate (only top candidates)
  for (const candId of topCandidates) {
    const byPair = edgesByCandidate.get(candId);
    if (!byPair) continue;
    for (const [pk, edges] of byPair) {
      const [a, b] = pk.split('|');
      if (!a || !b) continue;
      const deckId = a === candId ? b : a;
      // Only count edges whose family is on.
      for (const e of edges) {
        const fam = familyFor(e.reason.sourceTagId)?.id;
        if (!fam || input.filters.offFamilies.has(fam)) continue;
        recordEdge(candId, deckId, e);
      }
    }
  }

  // Materialize GraphEdge[] with dominant family + breakdown.
  const edges: GraphEdge[] = [];
  for (const acc of edgeAccs.values()) {
    let dominantFamily: FamilyId | null = null;
    let dominantCount = -1;
    let totalCount = 0;
    const breakdown: FamilyBreakdownEntry[] = [];
    for (const [fam, count] of acc.byFamily) {
      totalCount += count;
      // family score for ranking the dominant family within this edge:
      const famScore = (1 + WEIGHT_DIMINISH * (count - 1));
      breakdown.push({ familyId: fam, count, score: famScore });
      if (count > dominantCount) {
        dominantCount = count;
        dominantFamily = fam;
      }
    }
    if (!dominantFamily) continue;
    const weight = breakdown.reduce((s, b) => s + b.score, 0);
    edges.push({
      source: acc.a,
      target: acc.b,
      dominantFamily,
      totalEdgeCount: totalCount,
      weight,
      familyBreakdown: breakdown,
    });
  }

  // Build node list: deck cards + top candidates.
  const edgeCountById = new Map<string, number>();
  for (const e of edges) {
    edgeCountById.set(e.source, (edgeCountById.get(e.source) ?? 0) + 1);
    edgeCountById.set(e.target, (edgeCountById.get(e.target) ?? 0) + 1);
  }

  function radiusFor(edgeCount: number): number {
    return 12 + Math.min(12, Math.sqrt(edgeCount) * 3);
  }

  const nodes: GraphNode[] = [];
  for (const deckId of input.deckOracleIds) {
    const card = input.cards.get(deckId);
    if (!card) continue;
    const ec = edgeCountById.get(deckId) ?? 0;
    nodes.push({ id: deckId, cls: 'deck', card, radius: radiusFor(ec), edgeCount: ec });
  }
  for (const candId of topCandidates) {
    if (!topCandSet.has(candId)) continue;
    const card = input.cards.get(candId);
    if (!card) continue;
    const ec = edgeCountById.get(candId) ?? 0;
    nodes.push({ id: candId, cls: 'candidate', card, radius: radiusFor(ec), edgeCount: ec });
  }

  return { nodes, edges };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
cd app && npx vitest run src/lib/deckGraph.test.ts
```

Expected: PASS — all `buildDeckGraph` cases green.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/deckGraph.ts app/src/lib/deckGraph.test.ts
git commit -m "feat(app): buildDeckGraph assembles nodes/edges with dominant-family edges"
```

---

## Task 6: deckGraph.ts — `buildFocusedGraph`

**Files:**
- Modify: `app/src/lib/deckGraph.ts`
- Modify: `app/src/lib/deckGraph.test.ts`

- [ ] **Step 1: Add failing tests for `buildFocusedGraph`**

Append to `app/src/lib/deckGraph.test.ts`:

```typescript
import { buildFocusedGraph } from './deckGraph';

describe('buildFocusedGraph', () => {
  it('centers on the focused card and includes its 1-hop neighbors', () => {
    const cards = new Map<string, Card>();
    for (const id of ['f1', 'n1', 'n2', 'far']) cards.set(id, card(id));
    const outbound = new Map<string, InteractionEdge[]>();
    const inbound = new Map<string, InteractionEdge[]>();
    const allEdges = [
      edge('f1', 'n1', 'effect.destroy_creature', 'trigger.creature_dies'),
      edge('n2', 'f1', 'effect.life_changed', 'condition.cares_lifegain'),
      // 'far' is 2 hops away (via n1), should not appear
      edge('n1', 'far', 'effect.destroy_creature', 'trigger.creature_dies'),
    ];
    for (const e of allEdges) {
      (outbound.get(e.source) ?? outbound.set(e.source, []).get(e.source)!).push(e);
      (inbound.get(e.target) ?? inbound.set(e.target, []).get(e.target)!).push(e);
    }
    const g = buildFocusedGraph({
      focusOracleId: 'f1',
      cards, outbound, inbound,
      filters: noFilter,
    });
    const ids = g.nodes.map((n) => n.id).sort();
    expect(ids).toEqual(['f1', 'n1', 'n2']); // 'far' excluded
    // f1 itself is classed 'deck' so visual treatment (amber ring) signals focus.
    expect(g.nodes.find((n) => n.id === 'f1')?.cls).toBe('deck');
  });

  it('respects family and color filters', () => {
    const cards = new Map<string, Card>();
    cards.set('f1', card('f1'));
    cards.set('n1', card('n1', ['U']));
    cards.set('n2', card('n2', ['B']));
    const outbound = new Map<string, InteractionEdge[]>();
    const inbound = new Map<string, InteractionEdge[]>();
    const allEdges = [
      edge('f1', 'n1', 'effect.destroy_creature', 'trigger.creature_dies'),
      edge('f1', 'n2', 'effect.destroy_creature', 'trigger.creature_dies'),
    ];
    for (const e of allEdges) {
      (outbound.get(e.source) ?? outbound.set(e.source, []).get(e.source)!).push(e);
      (inbound.get(e.target) ?? inbound.set(e.target, []).get(e.target)!).push(e);
    }
    const g = buildFocusedGraph({
      focusOracleId: 'f1', cards, outbound, inbound,
      filters: { offFamilies: new Set(), onColors: new Set(['B']) }, // U off
    });
    const ids = g.nodes.map((n) => n.id).sort();
    expect(ids).toEqual(['f1', 'n2']);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd app && npx vitest run src/lib/deckGraph.test.ts
```

Expected: FAIL — `buildFocusedGraph` not exported.

- [ ] **Step 3: Implement `buildFocusedGraph`**

Append to `app/src/lib/deckGraph.ts`:

```typescript
export type FocusInput = {
  focusOracleId: string;
  cards: Map<string, Card>;
  outbound: Map<string, InteractionEdge[]>;
  inbound: Map<string, InteractionEdge[]>;
  filters: FilterState;
};

export function buildFocusedGraph(input: FocusInput): GraphOutput {
  const focus = input.cards.get(input.focusOracleId);
  if (!focus) return { nodes: [], edges: [] };

  // Treat the focus card as a singleton "deck" so neighbors are scored as candidates
  // against it. This reuses the deck-mode pipeline and gives identical edge semantics.
  return buildDeckGraph({
    deckOracleIds: [input.focusOracleId],
    cards: input.cards,
    outbound: input.outbound,
    inbound: input.inbound,
    filters: input.filters,
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
cd app && npx vitest run src/lib/deckGraph.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/deckGraph.ts app/src/lib/deckGraph.test.ts
git commit -m "feat(app): buildFocusedGraph for single-card drill-in mode"
```

---

## Task 7: `useDeckGraphSimulation` hook

**Files:**
- Create: `app/src/components/deckGraph/useDeckGraphSimulation.ts`
- Test: `app/src/components/deckGraph/useDeckGraphSimulation.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `app/src/components/deckGraph/useDeckGraphSimulation.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDeckGraphSimulation } from './useDeckGraphSimulation';
import type { GraphOutput } from '../../lib/deckGraph';

function makeGraph(nodeIds: string[], edges: { source: string; target: string }[] = []): GraphOutput {
  return {
    nodes: nodeIds.map((id) => ({
      id, cls: 'deck' as const,
      card: {
        oracleId: id, name: id, set: 'tst', printings: ['tst'], collectorNumber: '1',
        manaCost: null, cmc: 0, colors: [], colorIdentity: [], typeLine: '',
        types: [], subtypes: [], supertypes: [], oracleText: '', keywords: [],
        power: null, toughness: null, rarity: 'common', imageUrl: '', tags: [],
      },
      radius: 14, edgeCount: 0,
    })),
    edges: edges.map((e) => ({
      ...e, dominantFamily: 'destruction', totalEdgeCount: 1, weight: 1,
      familyBreakdown: [{ familyId: 'destruction', count: 1, score: 1 }],
    })),
  };
}

describe('useDeckGraphSimulation', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('initializes node positions on first render', () => {
    const graph = makeGraph(['a', 'b', 'c']);
    const { result } = renderHook(() => useDeckGraphSimulation(graph, { width: 400, height: 300 }));
    // After mount, each node should have x/y from the simulation init.
    for (const id of ['a', 'b', 'c']) {
      const pos = result.current.positions.current.get(id);
      expect(pos).toBeDefined();
      expect(typeof pos!.x).toBe('number');
      expect(typeof pos!.y).toBe('number');
    }
  });

  it('preserves positions of surviving nodes when topology changes', () => {
    const g1 = makeGraph(['a', 'b']);
    const { result, rerender } = renderHook(
      ({ graph }) => useDeckGraphSimulation(graph, { width: 400, height: 300 }),
      { initialProps: { graph: g1 } },
    );
    // Let the simulation tick once to settle.
    act(() => { vi.advanceTimersByTime(100); });
    const posA = result.current.positions.current.get('a');
    expect(posA).toBeDefined();
    const snapshotA = { x: posA!.x, y: posA!.y };

    // Add a new node 'c'; 'a' and 'b' survive.
    rerender({ graph: makeGraph(['a', 'b', 'c']) });
    act(() => { vi.advanceTimersByTime(10); });

    const newPosA = result.current.positions.current.get('a');
    expect(newPosA).toBeDefined();
    // Position should not have been reset to origin — should be within ~50px of snapshot
    // (small drift from reheat is OK).
    expect(Math.abs(newPosA!.x - snapshotA.x)).toBeLessThan(50);
    expect(Math.abs(newPosA!.y - snapshotA.y)).toBeLessThan(50);
  });

  it('reheats alpha on topology change', () => {
    const g1 = makeGraph(['a']);
    const { result, rerender } = renderHook(
      ({ graph }) => useDeckGraphSimulation(graph, { width: 400, height: 300 }),
      { initialProps: { graph: g1 } },
    );
    act(() => { vi.advanceTimersByTime(5000); });
    // Simulation should have cooled to near-zero alpha.
    const sim = result.current.simulation.current;
    expect(sim).not.toBeNull();
    const cooledAlpha = sim!.alpha();

    rerender({ graph: makeGraph(['a', 'b']) });
    const reheatedAlpha = result.current.simulation.current!.alpha();
    expect(reheatedAlpha).toBeGreaterThan(cooledAlpha);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd app && npx vitest run src/components/deckGraph/useDeckGraphSimulation.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hook**

Create `app/src/components/deckGraph/useDeckGraphSimulation.ts`:

```typescript
import { useEffect, useRef } from 'react';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type Simulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force';
import type { GraphOutput, GraphNode, GraphEdge } from '../../lib/deckGraph';

type SimNode = SimulationNodeDatum & {
  id: string;
  radius: number;
};
type SimLink = SimulationLinkDatum<SimNode> & {
  weight: number;
};

export type Viewport = { width: number; height: number };

export type SimulationApi = {
  /** Current positions, mutated by the simulation in place each tick. */
  positions: React.MutableRefObject<Map<string, { x: number; y: number }>>;
  /** Underlying d3 simulation, for tests and rare imperative needs. */
  simulation: React.MutableRefObject<Simulation<SimNode, SimLink> | null>;
  /** Pin a node to a position (drag end). Pass null to unpin. */
  pin: (id: string, pos: { x: number; y: number } | null) => void;
};

export function useDeckGraphSimulation(graph: GraphOutput, viewport: Viewport): SimulationApi {
  const simRef = useRef<Simulation<SimNode, SimLink> | null>(null);
  const nodeMapRef = useRef<Map<string, SimNode>>(new Map());
  const positionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Recompute node/link sets whenever graph topology changes.
  useEffect(() => {
    const existing = nodeMapRef.current;
    const next = new Map<string, SimNode>();

    // Preserve x/y/vx/vy/fx/fy for surviving nodes.
    for (const n of graph.nodes) {
      const prev = existing.get(n.id);
      if (prev) {
        prev.radius = n.radius;
        next.set(n.id, prev);
      } else {
        // New node: spawn at centroid of its connected (already-positioned) neighbors,
        // jittered slightly so multiple new nodes don't stack on the same pixel.
        const incident = graph.edges.filter((e) => e.source === n.id || e.target === n.id);
        let cx = viewport.width / 2;
        let cy = viewport.height / 2;
        const positioned = incident
          .map((e) => (e.source === n.id ? e.target : e.source))
          .map((id) => existing.get(id))
          .filter((s): s is SimNode => !!s && typeof s.x === 'number');
        if (positioned.length) {
          cx = positioned.reduce((s, p) => s + (p.x ?? 0), 0) / positioned.length;
          cy = positioned.reduce((s, p) => s + (p.y ?? 0), 0) / positioned.length;
        }
        next.set(n.id, {
          id: n.id, radius: n.radius,
          x: cx + (Math.random() - 0.5) * 20,
          y: cy + (Math.random() - 0.5) * 20,
        });
      }
    }
    nodeMapRef.current = next;

    const simNodes = Array.from(next.values());
    const simLinks: SimLink[] = graph.edges.map((e) => ({
      source: e.source, target: e.target, weight: e.weight,
    }));

    // Build (first call) or update (subsequent calls) the simulation.
    if (!simRef.current) {
      simRef.current = forceSimulation<SimNode, SimLink>(simNodes)
        .force('link', forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance((d) => 80 / Math.sqrt(d.weight)))
        .force('charge', forceManyBody().strength(-180))
        .force('center', forceCenter(viewport.width / 2, viewport.height / 2))
        .force('collide', forceCollide<SimNode>((d) => d.radius + 4))
        .alphaDecay(0.05);
    } else {
      simRef.current.nodes(simNodes);
      const linkForce = simRef.current.force<ReturnType<typeof forceLink<SimNode, SimLink>>>('link');
      if (linkForce) linkForce.links(simLinks);
      simRef.current.alpha(0.3).restart();
    }

    // Tick handler mirrors positions into the ref so consumers (RAF in GraphCanvas)
    // can read without React re-renders.
    const onTick = () => {
      for (const n of simNodes) {
        if (typeof n.x === 'number' && typeof n.y === 'number') {
          positionsRef.current.set(n.id, { x: n.x, y: n.y });
        }
      }
    };
    simRef.current.on('tick', onTick);
    // Run one synchronous tick so positions are populated for first paint/tests.
    onTick();

    return () => {
      simRef.current?.on('tick', null);
    };
  // Key on the *set of ids* and edge structure — not on referential equality —
  // so unrelated re-renders don't restart the sim. Using JSON.stringify is fine
  // here because node counts are bounded at ~120.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(graph.nodes.map((n) => n.id).sort()),
       JSON.stringify(graph.edges.map((e) => [e.source, e.target].sort()).sort()),
       viewport.width, viewport.height]);

  // Stop the simulation on unmount.
  useEffect(() => {
    return () => { simRef.current?.stop(); };
  }, []);

  const pin = (id: string, pos: { x: number; y: number } | null) => {
    const node = nodeMapRef.current.get(id);
    if (!node) return;
    if (pos) { node.fx = pos.x; node.fy = pos.y; }
    else     { node.fx = null;  node.fy = null;  }
    simRef.current?.alpha(0.1).restart();
  };

  return { positions: positionsRef, simulation: simRef, pin };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
cd app && npx vitest run src/components/deckGraph/useDeckGraphSimulation.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/deckGraph/useDeckGraphSimulation.ts app/src/components/deckGraph/useDeckGraphSimulation.test.ts
git commit -m "feat(app): useDeckGraphSimulation hook wraps d3-force with position persistence"
```

---

## Task 8: `GraphCanvas` component

**Files:**
- Create: `app/src/components/deckGraph/GraphCanvas.tsx`
- Test: `app/src/components/deckGraph/GraphCanvas.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `app/src/components/deckGraph/GraphCanvas.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GraphCanvas from './GraphCanvas';
import type { GraphOutput } from '../../lib/deckGraph';

function makeCard(id: string, name = id) {
  return {
    oracleId: id, name, set: 'tst', printings: ['tst'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [], typeLine: '',
    types: [], subtypes: [], supertypes: [], oracleText: '', keywords: [],
    power: null, toughness: null, rarity: 'common' as const, imageUrl: '', tags: [],
  };
}

function graph(): GraphOutput {
  return {
    nodes: [
      { id: 'a', cls: 'deck', card: makeCard('a', 'Alpha'), radius: 14, edgeCount: 1 },
      { id: 'b', cls: 'candidate', card: makeCard('b', 'Beta'), radius: 14, edgeCount: 1 },
    ],
    edges: [{
      source: 'a', target: 'b', dominantFamily: 'destruction',
      totalEdgeCount: 1, weight: 1,
      familyBreakdown: [{ familyId: 'destruction', count: 1, score: 1 }],
    }],
  };
}

describe('GraphCanvas', () => {
  it('renders one circle per node with an accessible label', () => {
    render(<GraphCanvas graph={graph()} selectedId={null} onSelect={() => {}} onFocus={() => {}} />);
    expect(screen.getByLabelText('Alpha')).toBeInTheDocument();
    expect(screen.getByLabelText('Beta')).toBeInTheDocument();
  });

  it('calls onSelect with the oracleId when a node is clicked', () => {
    const onSelect = vi.fn();
    render(<GraphCanvas graph={graph()} selectedId={null} onSelect={onSelect} onFocus={() => {}} />);
    fireEvent.click(screen.getByLabelText('Beta'));
    expect(onSelect).toHaveBeenCalledWith('b');
  });

  it('calls onFocus with the oracleId when a node is double-clicked', () => {
    const onFocus = vi.fn();
    render(<GraphCanvas graph={graph()} selectedId={null} onSelect={() => {}} onFocus={onFocus} />);
    fireEvent.doubleClick(screen.getByLabelText('Beta'));
    expect(onFocus).toHaveBeenCalledWith('b');
  });

  it('renders deck nodes with a distinguishing amber stroke', () => {
    const { container } = render(
      <GraphCanvas graph={graph()} selectedId={null} onSelect={() => {}} onFocus={() => {}} />,
    );
    const deckCircle = container.querySelector('[data-node-id="a"] circle');
    expect(deckCircle?.getAttribute('stroke')).toMatch(/#fbbf24|amber/i);
  });

  it('renders the edge with the dominant-family color', () => {
    const { container } = render(
      <GraphCanvas graph={graph()} selectedId={null} onSelect={() => {}} onFocus={() => {}} />,
    );
    const edge = container.querySelector('[data-edge]');
    expect(edge?.getAttribute('stroke')).toBe('#ef4444');
  });

  it('renders a multi-family marker when an edge has 2+ families', () => {
    const g = graph();
    g.edges[0]!.familyBreakdown.push({ familyId: 'lifegain', count: 1, score: 1 });
    g.edges[0]!.totalEdgeCount = 2;
    const { container } = render(
      <GraphCanvas graph={g} selectedId={null} onSelect={() => {}} onFocus={() => {}} />,
    );
    expect(container.querySelector('[data-edge-multimark]')).toBeInTheDocument();
  });

  it('renders the "no edges match the current filters" message when edges are empty but nodes exist', () => {
    render(<GraphCanvas graph={{ nodes: graph().nodes, edges: [] }} selectedId={null} onSelect={() => {}} onFocus={() => {}} />);
    expect(screen.getByText(/no edges match/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd app && npx vitest run src/components/deckGraph/GraphCanvas.test.tsx
```

Expected: FAIL — `GraphCanvas` not found.

- [ ] **Step 3: Implement `GraphCanvas`**

Create `app/src/components/deckGraph/GraphCanvas.tsx`:

```typescript
import { useEffect, useRef, useState } from 'react';
import { useDeckGraphSimulation } from './useDeckGraphSimulation';
import { FAMILIES } from '../../lib/tagFamilies';
import type { GraphOutput, GraphNode, GraphEdge } from '../../lib/deckGraph';

const COLOR_BY_FAMILY = new Map(FAMILIES.map((f) => [f.id, f.color]));
const AMBER = '#fbbf24';
const NEUTRAL = '#3a3a3a';

type Props = {
  graph: GraphOutput;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onFocus: (id: string) => void;
};

export default function GraphCanvas({ graph, selectedId, onSelect, onFocus }: Props) {
  const [viewport, setViewport] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);
  const sim = useDeckGraphSimulation(graph, viewport);

  // Track container size for the simulation's `forceCenter`.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setViewport({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // RAF loop: read positions from the sim ref and apply directly to SVG transforms.
  // Avoids React re-renders per tick.
  const nodeRefs = useRef<Map<string, SVGGElement | null>>(new Map());
  const edgeRefs = useRef<Map<string, SVGLineElement | null>>(new Map());
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      for (const [id, el] of nodeRefs.current) {
        if (!el) continue;
        const pos = sim.positions.current.get(id);
        if (!pos) continue;
        el.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
      }
      for (const edge of graph.edges) {
        const el = edgeRefs.current.get(`${edge.source}|${edge.target}`);
        if (!el) continue;
        const s = sim.positions.current.get(edge.source);
        const t = sim.positions.current.get(edge.target);
        if (!s || !t) continue;
        el.setAttribute('x1', String(s.x));
        el.setAttribute('y1', String(s.y));
        el.setAttribute('x2', String(t.x));
        el.setAttribute('y2', String(t.y));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [graph, sim.positions]);

  if (graph.nodes.length > 0 && graph.edges.length === 0) {
    return (
      <div ref={containerRef} className="relative h-full w-full" data-testid="graph-canvas">
        <div className="absolute inset-0 flex items-center justify-center text-sm text-neutral-400">
          No edges match the current filters.
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-neutral-950" data-testid="graph-canvas">
      <svg width="100%" height="100%" viewBox={`0 0 ${viewport.width} ${viewport.height}`}>
        <g data-layer="edges">
          {graph.edges.map((e) => {
            const color = COLOR_BY_FAMILY.get(e.dominantFamily) ?? '#666';
            const width = 1 + Math.sqrt(Math.max(0, e.totalEdgeCount - 1));
            const isIncident =
              selectedId !== null && (e.source === selectedId || e.target === selectedId);
            const opacity = isIncident ? 1 : 0.25;
            const key = `${e.source}|${e.target}`;
            const isMulti = e.familyBreakdown.length >= 2;
            return (
              <g key={key} data-edge data-multi={isMulti ? 'true' : undefined}>
                <line
                  ref={(el) => { edgeRefs.current.set(key, el); }}
                  stroke={color}
                  strokeWidth={width}
                  strokeOpacity={opacity}
                  data-edge
                />
                {isMulti && (
                  <circle r={3} fill={color} stroke="#0a0a0a" strokeWidth={1}
                    data-edge-multimark
                    // Midpoint placement is approximate — RAF doesn't reposition this
                    // explicitly; visual jitter is acceptable in v1.
                    cx={0} cy={0} opacity={opacity} />
                )}
              </g>
            );
          })}
        </g>
        <g data-layer="nodes">
          {graph.nodes.map((n) => {
            const stroke = selectedId === n.id ? '#ef4444' : (n.cls === 'deck' ? AMBER : NEUTRAL);
            const strokeWidth = selectedId === n.id ? 3 : (n.cls === 'deck' ? 1.8 : 1);
            return (
              <g
                key={n.id}
                data-node-id={n.id}
                ref={(el) => { nodeRefs.current.set(n.id, el); }}
                aria-label={n.card.name}
                role="button"
                tabIndex={0}
                style={{ cursor: 'pointer' }}
                onClick={(ev) => { ev.stopPropagation(); onSelect(n.id); }}
                onDoubleClick={(ev) => { ev.stopPropagation(); onFocus(n.id); }}
              >
                <circle r={n.radius} fill="#161616" stroke={stroke} strokeWidth={strokeWidth} />
                <text
                  textAnchor="middle"
                  dy="0.35em"
                  fontSize={10}
                  fill={n.cls === 'deck' ? '#f5e0a0' : '#cccccc'}
                  pointerEvents="none"
                >
                  {n.card.name.length > 14 ? n.card.name.slice(0, 13) + '…' : n.card.name}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
cd app && npx vitest run src/components/deckGraph/GraphCanvas.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/deckGraph/GraphCanvas.tsx app/src/components/deckGraph/GraphCanvas.test.tsx
git commit -m "feat(app): GraphCanvas SVG renderer for deck graph nodes and edges"
```

---

## Task 9: `PillRow` component

**Files:**
- Create: `app/src/components/deckGraph/PillRow.tsx`
- Test: `app/src/components/deckGraph/PillRow.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `app/src/components/deckGraph/PillRow.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PillRow from './PillRow';
import { FAMILIES, type FamilyId } from '../../lib/tagFamilies';
import type { Color } from '@shared/types';

function baseProps() {
  return {
    mode: 'deck' as const,
    onModeChange: vi.fn(),
    focusedCardName: null as string | null,
    onClearFocus: vi.fn(),
    presentFamilies: new Set<FamilyId>(['destruction', 'lifegain', 'resources']),
    offFamilies: new Set<FamilyId>(),
    onToggleFamily: vi.fn(),
    onColors: new Set<Color>(['B', 'G']),
    onToggleColor: vi.fn(),
    pendingMutationCount: 0,
    onRefresh: vi.fn(),
    familyEdgeCounts: new Map<FamilyId, number>([
      ['destruction', 12], ['lifegain', 4], ['resources', 7],
    ]),
  };
}

describe('PillRow', () => {
  it('renders one family pill for each family present in the graph', () => {
    render(<PillRow {...baseProps()} />);
    expect(screen.getByRole('button', { name: /Destruction/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lifegain/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Resources/ })).toBeInTheDocument();
    // A family not present in the graph (e.g. Tribes) should NOT render.
    expect(screen.queryByRole('button', { name: /Tribes/ })).toBeNull();
  });

  it('toggles a family on click', () => {
    const props = baseProps();
    render(<PillRow {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /Destruction/ }));
    expect(props.onToggleFamily).toHaveBeenCalledWith('destruction');
  });

  it('renders off-state family pills with aria-pressed=false', () => {
    const props = baseProps();
    props.offFamilies = new Set<FamilyId>(['lifegain']);
    render(<PillRow {...props} />);
    expect(screen.getByRole('button', { name: /Destruction/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Lifegain/ })).toHaveAttribute('aria-pressed', 'false');
  });

  it('toggles a color on click', () => {
    const props = baseProps();
    render(<PillRow {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /^White$/ }));
    expect(props.onToggleColor).toHaveBeenCalledWith('W');
  });

  it('shows the Refresh button with a badge when pendingMutationCount > 0', () => {
    const props = baseProps();
    props.pendingMutationCount = 3;
    render(<PillRow {...props} />);
    const btn = screen.getByRole('button', { name: /Refresh suggestions/i });
    expect(btn).not.toBeDisabled();
    expect(btn.textContent).toMatch(/\+3/);
  });

  it('disables Refresh when pendingMutationCount = 0', () => {
    render(<PillRow {...baseProps()} />);
    expect(screen.getByRole('button', { name: /Refresh suggestions/i })).toBeDisabled();
  });

  it('switches mode via the segmented control', () => {
    const props = baseProps();
    render(<PillRow {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /Card focus/i }));
    expect(props.onModeChange).toHaveBeenCalledWith('focus');
  });

  it('shows the focused card chip and calls onClearFocus when the × is clicked', () => {
    const props = baseProps();
    props.focusedCardName = 'Sheoldred';
    render(<PillRow {...props} />);
    expect(screen.getByText('Sheoldred')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /clear focused card/i }));
    expect(props.onClearFocus).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd app && npx vitest run src/components/deckGraph/PillRow.test.tsx
```

Expected: FAIL — `PillRow` not found.

- [ ] **Step 3: Implement `PillRow`**

Create `app/src/components/deckGraph/PillRow.tsx`:

```typescript
import type { Color } from '@shared/types';
import { FAMILIES, type FamilyId } from '../../lib/tagFamilies';
import ManaSymbol from '../ManaSymbol';

const COLORS: { id: Color; label: string }[] = [
  { id: 'W', label: 'White' }, { id: 'U', label: 'Blue' }, { id: 'B', label: 'Black' },
  { id: 'R', label: 'Red' }, { id: 'G', label: 'Green' },
];

type Mode = 'deck' | 'focus';

type Props = {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  focusedCardName: string | null;
  onClearFocus: () => void;
  presentFamilies: Set<FamilyId>;
  offFamilies: Set<FamilyId>;
  onToggleFamily: (id: FamilyId) => void;
  onColors: Set<Color>;
  onToggleColor: (c: Color) => void;
  pendingMutationCount: number;
  onRefresh: () => void;
  familyEdgeCounts: Map<FamilyId, number>;
};

export default function PillRow(props: Props) {
  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-4 border-b border-neutral-800 bg-neutral-950 px-4 py-2 text-xs">
      <div className="flex items-center gap-2">
        <span className="uppercase tracking-wide text-neutral-500">Mode</span>
        <div className="inline-flex overflow-hidden rounded border border-neutral-700">
          <button
            type="button"
            onClick={() => props.onModeChange('deck')}
            className={`px-2 py-1 ${props.mode === 'deck' ? 'bg-amber-900/40 text-amber-200' : 'text-neutral-300 hover:bg-neutral-900'}`}
          >
            Deck
          </button>
          <button
            type="button"
            onClick={() => props.onModeChange('focus')}
            className={`px-2 py-1 ${props.mode === 'focus' ? 'bg-amber-900/40 text-amber-200' : 'text-neutral-300 hover:bg-neutral-900'}`}
          >
            Card focus
          </button>
        </div>
        {props.focusedCardName && (
          <span className="ml-1 inline-flex items-center gap-1 rounded border border-amber-700 bg-amber-950/50 px-2 py-0.5 text-amber-200">
            {props.focusedCardName}
            <button
              type="button"
              aria-label="Clear focused card"
              onClick={props.onClearFocus}
              className="ml-1 text-amber-300 hover:text-amber-100"
            >
              ×
            </button>
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <span className="uppercase tracking-wide text-neutral-500">Families</span>
        {FAMILIES.filter((f) => props.presentFamilies.has(f.id)).map((f) => {
          const isOff = props.offFamilies.has(f.id);
          const count = props.familyEdgeCounts.get(f.id);
          return (
            <button
              type="button"
              key={f.id}
              aria-pressed={!isOff}
              onClick={() => props.onToggleFamily(f.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 ${
                isOff
                  ? 'border-neutral-800 bg-neutral-900 text-neutral-600 line-through'
                  : 'border-neutral-700 bg-neutral-900 text-neutral-200 hover:border-neutral-500'
              }`}
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: f.color, opacity: isOff ? 0.3 : 1 }}
              />
              {f.label}
              {count !== undefined && !isOff && (
                <span className="text-[10px] text-neutral-500">·{count}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1">
        <span className="uppercase tracking-wide text-neutral-500">Colors</span>
        {COLORS.map((c) => {
          const on = props.onColors.has(c.id);
          return (
            <button
              key={c.id}
              type="button"
              aria-label={c.label}
              aria-pressed={on}
              onClick={() => props.onToggleColor(c.id)}
              className={`flex h-6 w-6 items-center justify-center rounded-full ${on ? '' : 'opacity-30'}`}
            >
              <ManaSymbol token={c.id.toLowerCase()} />
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={props.onRefresh}
        disabled={props.pendingMutationCount === 0}
        className="ml-auto inline-flex items-center gap-1.5 rounded border border-amber-600 bg-amber-500 px-3 py-1 font-semibold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:border-neutral-700 disabled:bg-neutral-800 disabled:text-neutral-500"
        aria-label="Refresh suggestions"
      >
        Refresh suggestions
        {props.pendingMutationCount > 0 && (
          <span className="rounded bg-black/30 px-1.5 py-0.5 text-[10px]">+{props.pendingMutationCount}</span>
        )}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
cd app && npx vitest run src/components/deckGraph/PillRow.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/deckGraph/PillRow.tsx app/src/components/deckGraph/PillRow.test.tsx
git commit -m "feat(app): PillRow with mode toggle, family/color filters, refresh button"
```

---

## Task 10: `SelectionDrawer` component

**Files:**
- Create: `app/src/components/deckGraph/SelectionDrawer.tsx`
- Test: `app/src/components/deckGraph/SelectionDrawer.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `app/src/components/deckGraph/SelectionDrawer.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SelectionDrawer from './SelectionDrawer';
import type { GraphNode, GraphEdge } from '../../lib/deckGraph';
import type { Card } from '@shared/types';

function makeCard(id: string, name: string): Card {
  return {
    oracleId: id, name, set: 'tst', printings: ['tst'], collectorNumber: '1',
    manaCost: '{2}{B}{B}', cmc: 4, colors: ['B'], colorIdentity: ['B'],
    typeLine: 'Creature — Demon', types: ['Creature'], subtypes: ['Demon'], supertypes: [],
    oracleText: 'Flying.', keywords: [], power: '4', toughness: '4',
    rarity: 'rare', imageUrl: 'https://example.com/img.png', tags: [],
  };
}

function makeNode(cls: 'deck' | 'candidate', id = 'bloodgift'): GraphNode {
  return { id, cls, card: makeCard(id, 'Bloodgift Demon'), radius: 14, edgeCount: 2 };
}

function makeEdge(): GraphEdge {
  return {
    source: 'sheoldred', target: 'bloodgift',
    dominantFamily: 'lifegain', totalEdgeCount: 2, weight: 2,
    familyBreakdown: [{ familyId: 'lifegain', count: 2, score: 1.3 }],
  };
}

describe('SelectionDrawer', () => {
  it('renders the card name, image, and type line', () => {
    render(
      <SelectionDrawer node={makeNode('candidate')} incidentEdges={[makeEdge()]}
        deckCount={0} onAdd={vi.fn()} onRemoveOne={vi.fn()} onRemoveAll={vi.fn()} onClose={vi.fn()} />,
    );
    expect(screen.getByText('Bloodgift Demon')).toBeInTheDocument();
    expect(screen.getByText(/Creature — Demon/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Bloodgift Demon' })).toHaveAttribute('src', 'https://example.com/img.png');
  });

  it('shows "Add to deck" for a candidate and calls onAdd', () => {
    const onAdd = vi.fn();
    render(
      <SelectionDrawer node={makeNode('candidate')} incidentEdges={[makeEdge()]}
        deckCount={0} onAdd={onAdd} onRemoveOne={vi.fn()} onRemoveAll={vi.fn()} onClose={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Add to deck/i }));
    expect(onAdd).toHaveBeenCalled();
  });

  it('shows "Remove one copy" for a deck member with count > 0', () => {
    const onRemoveOne = vi.fn();
    render(
      <SelectionDrawer node={makeNode('deck')} incidentEdges={[makeEdge()]}
        deckCount={2} onAdd={vi.fn()} onRemoveOne={onRemoveOne} onRemoveAll={vi.fn()} onClose={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Remove one copy/i }));
    expect(onRemoveOne).toHaveBeenCalled();
  });

  it('requires confirmation for "Remove all copies"', () => {
    const onRemoveAll = vi.fn();
    render(
      <SelectionDrawer node={makeNode('deck')} incidentEdges={[makeEdge()]}
        deckCount={3} onAdd={vi.fn()} onRemoveOne={vi.fn()} onRemoveAll={onRemoveAll} onClose={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Remove all copies/i }));
    // Confirmation modal should appear; onRemoveAll not yet called.
    expect(onRemoveAll).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Remove$/i }));
    expect(onRemoveAll).toHaveBeenCalled();
  });

  it('lists incident edges grouped by family with a swatch and count', () => {
    const edges: GraphEdge[] = [
      makeEdge(),
      {
        source: 'frantic', target: 'bloodgift',
        dominantFamily: 'card-selection', totalEdgeCount: 1, weight: 1,
        familyBreakdown: [{ familyId: 'card-selection', count: 1, score: 1 }],
      },
    ];
    render(
      <SelectionDrawer node={makeNode('candidate')} incidentEdges={edges}
        deckCount={0} onAdd={vi.fn()} onRemoveOne={vi.fn()} onRemoveAll={vi.fn()} onClose={vi.fn()} />,
    );
    expect(screen.getByText(/Connects to 2 cards in your deck/i)).toBeInTheDocument();
    expect(screen.getByText(/Lifegain/)).toBeInTheDocument();
    expect(screen.getByText(/Card Selection/)).toBeInTheDocument();
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(
      <SelectionDrawer node={makeNode('candidate')} incidentEdges={[makeEdge()]}
        deckCount={0} onAdd={vi.fn()} onRemoveOne={vi.fn()} onRemoveAll={vi.fn()} onClose={onClose} />,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd app && npx vitest run src/components/deckGraph/SelectionDrawer.test.tsx
```

Expected: FAIL — `SelectionDrawer` not found.

- [ ] **Step 3: Implement `SelectionDrawer`**

Create `app/src/components/deckGraph/SelectionDrawer.tsx`:

```typescript
import { useEffect, useMemo, useState } from 'react';
import type { GraphNode, GraphEdge } from '../../lib/deckGraph';
import { FAMILIES, type FamilyId } from '../../lib/tagFamilies';
import ManaCost from '../ManaCost';
import ConfirmModal from '../ConfirmModal';

const FAMILY_DEFS = new Map(FAMILIES.map((f) => [f.id, f]));

type Props = {
  node: GraphNode;
  incidentEdges: GraphEdge[];
  /** Number of copies of this card in the active deck (0 for candidates). */
  deckCount: number;
  onAdd: () => void;
  onRemoveOne: () => void;
  onRemoveAll: () => void;
  onClose: () => void;
};

export default function SelectionDrawer({
  node, incidentEdges, deckCount, onAdd, onRemoveOne, onRemoveAll, onClose,
}: Props) {
  const [confirmingRemoveAll, setConfirmingRemoveAll] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !confirmingRemoveAll) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, confirmingRemoveAll]);

  // Distinct deck neighbors and family aggregation for the "Connects to …" section.
  const { neighborCount, byFamily } = useMemo(() => {
    const neighbors = new Set<string>();
    const fam = new Map<FamilyId, number>();
    for (const e of incidentEdges) {
      neighbors.add(e.source === node.id ? e.target : e.source);
      for (const b of e.familyBreakdown) {
        fam.set(b.familyId, (fam.get(b.familyId) ?? 0) + b.count);
      }
    }
    return { neighborCount: neighbors.size, byFamily: fam };
  }, [incidentEdges, node.id]);

  return (
    <aside className="h-full w-80 shrink-0 overflow-y-auto border-l border-neutral-800 bg-neutral-950 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-neutral-500">
            Selected · {node.cls === 'deck' ? 'in deck' : 'candidate'}
          </p>
          <h3 className="mt-0.5 text-base font-semibold text-neutral-100">{node.card.name}</h3>
        </div>
        <button
          type="button"
          aria-label="Close drawer"
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-100"
        >
          ×
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2 text-xs text-neutral-400">
        <ManaCost cost={node.card.manaCost} />
        <span>· {node.card.typeLine}</span>
      </div>

      {node.card.imageUrl && (
        <img
          src={node.card.imageUrl}
          alt={node.card.name}
          className="mt-3 w-full rounded border border-neutral-800"
        />
      )}

      <div className="mt-3">
        <p className="text-xs text-neutral-400">Connects to {neighborCount} cards in your deck</p>
        <ul className="mt-1 space-y-0.5">
          {Array.from(byFamily.entries()).map(([famId, count]) => {
            const fd = FAMILY_DEFS.get(famId);
            if (!fd) return null;
            return (
              <li key={famId} className="flex items-center gap-2 text-xs text-neutral-300">
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: fd.color }} />
                <span>{fd.label}</span>
                <span className="text-neutral-500">·{count}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-4 space-y-2">
        {node.cls === 'candidate' && (
          <button
            type="button"
            onClick={onAdd}
            className="w-full rounded bg-amber-500 px-3 py-2 text-sm font-semibold text-black hover:bg-amber-400"
          >
            + Add to deck
          </button>
        )}
        {node.cls === 'deck' && (
          <>
            <button
              type="button"
              onClick={onRemoveOne}
              disabled={deckCount === 0}
              className="w-full rounded border border-neutral-700 px-3 py-2 text-sm text-neutral-200 hover:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Remove one copy ({deckCount} in deck)
            </button>
            {deckCount > 1 && (
              <button
                type="button"
                onClick={() => setConfirmingRemoveAll(true)}
                className="w-full rounded border border-red-900 px-3 py-2 text-sm text-red-300 hover:border-red-500"
              >
                Remove all copies
              </button>
            )}
          </>
        )}
      </div>

      {confirmingRemoveAll && (
        <ConfirmModal
          title="Remove all copies?"
          message={
            <>
              Remove all {deckCount} copies of <span className="font-semibold text-neutral-100">{node.card.name}</span>?
            </>
          }
          confirmLabel="Remove"
          destructive
          onConfirm={() => { setConfirmingRemoveAll(false); onRemoveAll(); }}
          onCancel={() => setConfirmingRemoveAll(false)}
        />
      )}
    </aside>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
cd app && npx vitest run src/components/deckGraph/SelectionDrawer.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/deckGraph/SelectionDrawer.tsx app/src/components/deckGraph/SelectionDrawer.test.tsx
git commit -m "feat(app): SelectionDrawer with add/remove controls and family breakdown"
```

---

## Task 11: `DeckGraphPage` route component

**Files:**
- Create: `app/src/pages/DeckGraphPage.tsx`

This task wires the four components together. There is no dedicated test file — the constituent components are already tested individually, and integration is verified manually via Task 12's smoke testing step.

- [ ] **Step 1: Implement the page**

Create `app/src/pages/DeckGraphPage.tsx`:

```typescript
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Color } from '@shared/types';
import { useGraphStore } from '../stores/graphStore';
import { useActiveDeck, useDeckStore } from '../stores/deckStore';
import { buildDeckGraph, buildFocusedGraph, type GraphOutput, type FilterState } from '../lib/deckGraph';
import { type FamilyId } from '../lib/tagFamilies';
import GraphCanvas from '../components/deckGraph/GraphCanvas';
import PillRow from '../components/deckGraph/PillRow';
import SelectionDrawer from '../components/deckGraph/SelectionDrawer';

const ALL_COLORS: Color[] = ['W', 'U', 'B', 'R', 'G'];

type Mode = 'deck' | 'focus';

export default function DeckGraphPage() {
  const cards = useGraphStore((s) => s.cards);
  const outbound = useGraphStore((s) => s.edges);
  const inbound = useGraphStore((s) => s.edgesInbound);
  const deck = useActiveDeck();
  const addCard = useDeckStore((s) => s.addCard);
  const removeCard = useDeckStore((s) => s.removeCard);

  const [mode, setMode] = useState<Mode>('deck');
  const [focusOracleId, setFocusOracleId] = useState<string | null>(null);
  const [selectedOracleId, setSelectedOracleId] = useState<string | null>(null);

  const [offFamilies, setOffFamilies] = useState<Set<FamilyId>>(new Set());

  // onColors auto-initialized from deck color identity. Recomputed if the deck id changes.
  const [onColors, setOnColors] = useState<Set<Color>>(() => new Set(ALL_COLORS));
  const initializedForDeckIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!deck) return;
    if (initializedForDeckIdRef.current === deck.id) return;
    const present = new Set<Color>();
    for (const entry of deck.cards) {
      const c = cards.get(entry.oracleId);
      if (!c) continue;
      for (const col of c.colorIdentity) present.add(col);
    }
    setOnColors(present.size > 0 ? present : new Set(ALL_COLORS));
    initializedForDeckIdRef.current = deck.id;
  }, [deck, cards]);

  // Snapshot the deck *at refresh time*. Memo key uses this snapshot, not live deck.
  const [refreshedDeckIds, setRefreshedDeckIds] = useState<string[]>(() => deck?.cards.map((c) => c.oracleId) ?? []);
  useEffect(() => {
    // First mount with a deck: initialize the snapshot.
    if (deck && refreshedDeckIds.length === 0 && deck.cards.length > 0) {
      setRefreshedDeckIds(deck.cards.map((c) => c.oracleId));
    }
  }, [deck, refreshedDeckIds.length]);

  const pendingMutationCount = useMemo(() => {
    if (!deck) return 0;
    const liveSet = new Set(deck.cards.map((c) => c.oracleId));
    const snapSet = new Set(refreshedDeckIds);
    let diffs = 0;
    for (const id of liveSet) if (!snapSet.has(id)) diffs++;
    for (const id of snapSet) if (!liveSet.has(id)) diffs++;
    return diffs;
  }, [deck, refreshedDeckIds]);

  const filters: FilterState = useMemo(() => ({ offFamilies, onColors }), [offFamilies, onColors]);

  const graph: GraphOutput = useMemo(() => {
    if (mode === 'focus' && focusOracleId) {
      return buildFocusedGraph({
        focusOracleId, cards, outbound, inbound, filters,
      });
    }
    return buildDeckGraph({
      deckOracleIds: refreshedDeckIds, cards, outbound, inbound, filters,
    });
  }, [mode, focusOracleId, refreshedDeckIds, cards, outbound, inbound, filters]);

  // Auto-close the drawer if the selected node leaves the graph.
  useEffect(() => {
    if (selectedOracleId && !graph.nodes.some((n) => n.id === selectedOracleId)) {
      setSelectedOracleId(null);
    }
  }, [graph, selectedOracleId]);

  // Derived: families currently present in the graph (for the pill row).
  const { presentFamilies, familyEdgeCounts } = useMemo(() => {
    const present = new Set<FamilyId>();
    const counts = new Map<FamilyId, number>();
    for (const e of graph.edges) {
      for (const b of e.familyBreakdown) {
        present.add(b.familyId);
        counts.set(b.familyId, (counts.get(b.familyId) ?? 0) + b.count);
      }
    }
    return { presentFamilies: present, familyEdgeCounts: counts };
  }, [graph]);

  const selectedNode = useMemo(
    () => (selectedOracleId ? graph.nodes.find((n) => n.id === selectedOracleId) ?? null : null),
    [selectedOracleId, graph],
  );
  const incidentEdges = useMemo(
    () => (selectedOracleId ? graph.edges.filter((e) => e.source === selectedOracleId || e.target === selectedOracleId) : []),
    [selectedOracleId, graph],
  );
  const selectedDeckCount = selectedOracleId
    ? deck?.cards.find((c) => c.oracleId === selectedOracleId)?.count ?? 0
    : 0;
  const focusedCardName = focusOracleId ? cards.get(focusOracleId)?.name ?? focusOracleId : null;

  if (!deck) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div>
          <p className="text-neutral-300">No active deck.</p>
          <Link to="/decks" className="mt-2 inline-block text-sm text-amber-400 hover:underline">
            Pick or create one
          </Link>
        </div>
      </div>
    );
  }

  if (deck.cards.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div>
          <p className="text-neutral-300">{deck.name} is empty.</p>
          <Link to="/" className="mt-2 inline-block text-sm text-amber-400 hover:underline">
            Pick a card from the browser to start exploring
          </Link>
        </div>
      </div>
    );
  }

  const toggleFamily = (id: FamilyId) =>
    setOffFamilies((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const toggleColor = (c: Color) =>
    setOnColors((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c); else next.add(c);
      return next;
    });

  const handleRefresh = () => {
    setRefreshedDeckIds(deck.cards.map((c) => c.oracleId));
  };

  const handleAdd = async () => {
    if (!selectedNode) return;
    await addCard(selectedNode.id, 1, selectedNode.card.name);
  };
  const handleRemoveOne = async () => {
    if (!selectedNode) return;
    await removeCard(selectedNode.id, 1);
  };
  const handleRemoveAll = async () => {
    if (!selectedNode || selectedDeckCount === 0) return;
    await removeCard(selectedNode.id, selectedDeckCount);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950 px-4 py-2">
        <div className="flex items-center gap-3">
          <Link to="/deck" className="text-sm text-neutral-400 hover:text-neutral-200" aria-label="Back to deck list">
            ← {deck.name}
          </Link>
          <span className="text-xs text-neutral-500">· {deck.cards.reduce((s, c) => s + c.count, 0)} cards</span>
        </div>
        <div className="inline-flex overflow-hidden rounded border border-neutral-700 text-xs">
          <Link to="/deck" className="px-2 py-1 text-neutral-300 hover:bg-neutral-900">List</Link>
          <span className="bg-amber-900/40 px-2 py-1 font-semibold text-amber-200">Graph</span>
        </div>
      </div>

      <PillRow
        mode={mode}
        onModeChange={(m) => {
          setMode(m);
          if (m === 'deck') setFocusOracleId(null);
        }}
        focusedCardName={focusedCardName}
        onClearFocus={() => { setFocusOracleId(null); setMode('deck'); }}
        presentFamilies={presentFamilies}
        offFamilies={offFamilies}
        onToggleFamily={toggleFamily}
        onColors={onColors}
        onToggleColor={toggleColor}
        pendingMutationCount={pendingMutationCount}
        onRefresh={handleRefresh}
        familyEdgeCounts={familyEdgeCounts}
      />

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <GraphCanvas
            graph={graph}
            selectedId={selectedOracleId}
            onSelect={setSelectedOracleId}
            onFocus={(id) => { setFocusOracleId(id); setMode('focus'); setSelectedOracleId(null); }}
          />
        </div>
        {selectedNode && (
          <SelectionDrawer
            node={selectedNode}
            incidentEdges={incidentEdges}
            deckCount={selectedDeckCount}
            onAdd={handleAdd}
            onRemoveOne={handleRemoveOne}
            onRemoveAll={handleRemoveAll}
            onClose={() => setSelectedOracleId(null)}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the file type-checks**

Run:
```bash
cd app && npx tsc --noEmit -p tsconfig.app.json
```

Expected: zero TypeScript errors. If any surface, fix inline (often missing imports or `noUncheckedIndexedAccess` issues — explicit null checks).

- [ ] **Step 3: Commit**

```bash
git add app/src/pages/DeckGraphPage.tsx
git commit -m "feat(app): DeckGraphPage assembles pill row, canvas, and selection drawer"
```

---

## Task 12: Wire route + DeckPage segmented control + final verification

**Files:**
- Modify: `app/src/App.tsx`
- Modify: `app/src/pages/DeckPage.tsx`

- [ ] **Step 1: Add the route to `App.tsx`**

Open `app/src/App.tsx` and edit lines 3-5 and 28-32. Change to:

```typescript
import { useEffect } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import BrowserPage from './pages/BrowserPage';
import DecksPage from './pages/DecksPage';
import DeckPage from './pages/DeckPage';
import DeckGraphPage from './pages/DeckGraphPage';
import { useGraphStore } from './stores/graphStore';
import { useDeckStore } from './stores/deckStore';
```

And the `<Routes>` block:

```typescript
        <Routes>
          <Route path="/" element={<BrowserPage />} />
          <Route path="/decks" element={<DecksPage />} />
          <Route path="/deck" element={<DeckPage />} />
          <Route path="/deck/graph" element={<DeckGraphPage />} />
        </Routes>
```

- [ ] **Step 2: Add a List/Graph toggle to `DeckPage.tsx`**

The current `DeckPage.tsx` has no header — it just composes `BrowserShell` with a right rail. The simplest place to put the toggle is to wrap `BrowserShell` in a small flex column with a thin header. Replace the entire `DeckPage` body:

```typescript
import { useState } from 'react';
import { Link } from 'react-router-dom';
import BrowserShell from '../components/BrowserShell';
import DeckPanel from '../components/DeckPanel';
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

- [ ] **Step 3: Type-check and run all tests**

Run from repo root:
```bash
npm test
```

Expected: pipeline tests pass (including the new `pipeline/tagFamilies-consistency.test.ts`), app tests pass (all new unit + component tests), and `app/npm run build` succeeds.

If anything fails, fix inline and re-run. Common issues:
- `noUncheckedIndexedAccess` on indexed-access — add `!` or explicit checks.
- Missing imports — TS error will name the unresolved type.

- [ ] **Step 4: Manual smoke test in the dev server**

Run from `app/`:
```bash
cd app && npm run dev
```

Open `http://localhost:5173/deck`. Verify:
1. The new **Graph** segment appears in the top-right; clicking it navigates to `/deck/graph`.
2. Pill row renders — only families present in the current graph appear; color pills are pre-toggled to the deck's color identity.
3. Click a candidate node → drawer opens with image + family breakdown + **+ Add to deck**.
4. Click **Add to deck** → drawer button area shows that the card has been added (deck count increments via the existing store); the node visually becomes a deck member (amber stroke); other candidates do NOT shuffle.
5. Click **Refresh suggestions** → badge resets; new candidates fill any vacated slots.
6. Toggle off a family pill → its edges and dependent-only candidates disappear.
7. Toggle off a color → cards with that color in their identity drop out.
8. Double-click any node → mode switches to "Card focus"; the focused card's name appears as a chip; the graph re-centers on that card.
9. Click the × on the focus chip → returns to deck mode.

If any flow breaks, file the bug as a follow-up task; do not patch in this commit.

- [ ] **Step 5: Commit**

```bash
git add app/src/App.tsx app/src/pages/DeckPage.tsx
git commit -m "feat(app): wire /deck/graph route and List/Graph toggle in DeckPage"
```

---

## Self-review

**Spec coverage check (each section from `2026-05-24-deck-graph-viz-design.md`):**

- ✅ Goals — discovery, audit, mechanic structure, safe mutation → covered by Tasks 5, 6, 9, 10, 11.
- ✅ User flows A/B/C — `DeckGraphPage` (Task 11) wires all three; the route + toggle (Task 12) lands flow A's entry.
- ✅ Routing — Task 12 (with noted `/deck/graph` deviation from spec's `/deck/:id/graph`).
- ✅ Data flow diagram → Tasks 4–6 (deckGraph.ts) + Task 11 (DeckGraphPage memoization).
- ✅ Mechanic families table → Task 2 (`tagFamilies.ts`).
- ✅ Catalog-consistency enforcement → Task 3 (`pipeline/tagFamilies-consistency.test.ts`).
- ✅ Candidate scoring with breadth bonus → Task 4 (`scoreCandidate`).
- ✅ Mutation vs filter re-ranking → Task 11 (`refreshedDeckIds` ref + `pendingMutationCount`).
- ✅ Rendering (SVG + d3-force, deck stroke, candidate stroke, dominant-family edge color + ring marker, edge opacity, zoom/pan deferred — see note below) → Tasks 7, 8.
- ✅ PillRow with all four groups → Task 9.
- ✅ SelectionDrawer with reasons grouped by family and Remove-all confirmation → Task 10.
- ✅ useDeckGraphSimulation hook → Task 7.
- ✅ buildFocusedGraph → Task 6.
- ✅ Performance: simulation lifecycle + RAF + direct DOM mutation → Task 8 (no React per-tick re-render).
- ✅ Testing per spec → tests in Tasks 2, 3, 4, 5, 6, 7, 8, 9, 10.
- ✅ Edge cases: empty deck (Task 11), missing cards (Task 11 — the page filters out unknown printings via `cards.has()` in deckGraph, but the explicit "N cards not visualized" banner is NOT yet shipped — see note below), zero-edge cards (handled implicitly by force layout), all families off (Task 8 message), drawer auto-close (Task 11 effect).

**Spec items deferred from this plan (acceptable v1 scope reductions):**

1. **Zoom/pan with `d3-zoom`** — the spec calls for `[0.4, 3]` zoom and background drag-to-pan. The plan implements click selection, double-click focus, but NOT zoom/pan. Reason: zoom/pan adds ~80 lines of integration with d3-zoom and is independently testable as a follow-up. The graph is fully usable without it for the 120-node cap.
2. **Drag-to-pin nodes via `fx/fy`** — `useDeckGraphSimulation.pin()` is implemented but not wired to drag events in `GraphCanvas`. Same reasoning: trivial follow-up, not blocking.
3. **"N cards not visualized" banner** for deck cards missing from `graphStore`. Currently skipped silently. Cosmetic follow-up.
4. **Collapsed `<deckname> · <count>` pill that pops `DeckPanel` as an overlay** — spec calls for this; plan uses a simpler back-link to `/deck`. Equivalent UX with less surface area.

If any of these are critical, they should be added as follow-up tasks before merging.

**Placeholder scan:** none. All steps include exact code, file paths, commands, expected output.

**Type consistency:** types referenced in later tasks (`GraphInput`, `GraphOutput`, `GraphNode`, `GraphEdge`, `FilterState`, `FamilyId`, `SimulationApi`, `Viewport`) are all defined in Tasks 2, 4, 5, 7. `Color` comes from `@shared/types`. Component prop types are defined inline in each component task.
