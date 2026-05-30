# Graph bridge expansion (2nd-degree reach on selection) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a node is selected in deck-graph mode, augment the rendered graph with up to 20 off-canvas "bridge" nodes that both link to the selected card and reach back into the deck — rendered with dashed strokes to convey their transient nature.

**Architecture:** A new pure function `expandWithBridges(base, selectedId, ...)` composes around the existing `buildDeckGraph` output. `DeckGraphPage` memoizes the expansion on selection change and passes the augmented graph to `GraphCanvas` (which renders the new `cls: 'bridge'` nodes and `kind: 'bridge'` edges with distinct dashed styling) and to `SelectionDrawer` (which renders a bridge badge on the appropriate neighbor rows). No artifact or backend changes.

**Tech Stack:** TypeScript, React, Vite, Vitest, React Testing Library, d3-force, Playwright (for E2E).

**Spec:** `docs/superpowers/specs/2026-05-24-graph-bridge-expansion-design.md`

---

## File map

- **Modify** `app/src/lib/deckGraph.ts` — type changes; new `expandWithBridges` function.
- **Modify** `app/src/lib/deckGraph.test.ts` — add `kind: 'base'` to existing test helpers; new `describe('expandWithBridges', ...)` suite.
- **Modify** `app/src/components/deckGraph/GraphCanvas.tsx` — read `n.cls === 'bridge'` for dashed node stroke; read `e.kind === 'bridge'` for dashed edge stroke and elevated opacity on non-incident bridge↔deck edges.
- **Modify** `app/src/components/deckGraph/GraphCanvas.test.tsx` — add `kind: 'base'` to test helpers; new test cases for bridge node + edge styling.
- **Modify** `app/src/components/deckGraph/SelectionDrawer.tsx` — accept optional `nodesById` prop; render a small bridge indicator on rows where the neighbor's `cls === 'bridge'`.
- **Modify** `app/src/components/deckGraph/SelectionDrawer.test.tsx` — add `kind: 'base'` to test helpers; one new case asserting the bridge indicator renders for bridge neighbors only.
- **Modify** `app/src/pages/DeckGraphPage.tsx` — memo `expandedGraph` from `graph + selectedOracleId`; pass `expandedGraph` to `GraphCanvas`; pass `nodesById` derived from `expandedGraph` to `SelectionDrawer`.
- **Modify** `app/tests/e2e/deck-graph.spec.ts` — add Suite 10 with a tolerant smoke test for bridge expansion.

---

## Task 1: Type plumbing (`kind` on `GraphEdge`, `'bridge'` on `GraphNodeCls`)

**Files:**
- Modify: `app/src/lib/deckGraph.ts`
- Test: `app/src/lib/deckGraph.test.ts`
- Test: `app/src/components/deckGraph/GraphCanvas.test.tsx`
- Test: `app/src/components/deckGraph/SelectionDrawer.test.tsx`

The current `GraphEdge` has no `kind` field and `GraphNodeCls` is `'deck' | 'candidate'`. We're adding `kind: 'base' | 'bridge'` (with all existing builders defaulting to `'base'`) and extending the cls union with `'bridge'`. This task is type-only — no behavior change.

- [ ] **Step 1: Update the type definitions in `app/src/lib/deckGraph.ts`**

Replace the existing `GraphNodeCls` and `GraphEdge` type declarations:

```ts
export type GraphNodeCls = 'deck' | 'candidate' | 'bridge';

export type GraphEdge = {
  source: string;
  target: string;
  dominantFamily: FamilyId;
  totalEdgeCount: number;
  weight: number;
  familyBreakdown: FamilyBreakdownEntry[];
  kind: 'base' | 'bridge';
};
```

- [ ] **Step 2: Default existing edges produced by `buildDeckGraph` to `kind: 'base'`**

In `buildDeckGraph`, locate the loop that builds the `edges` array (around the `for (const acc of edgeAccs.values())` block) and add `kind: 'base'` to the pushed object:

```ts
edges.push({
  source: acc.a,
  target: acc.b,
  dominantFamily,
  totalEdgeCount: totalCount,
  weight,
  familyBreakdown: breakdown,
  kind: 'base',
});
```

- [ ] **Step 3: Update test helpers that construct `GraphEdge` objects inline**

In `app/src/lib/deckGraph.test.ts`, the `neighborStats` describe block defines:

```ts
function graphEdge(source: string, target: string, weight: number, totalEdgeCount: number): GraphEdge {
  return {
    source, target,
    dominantFamily: 'destruction',
    totalEdgeCount,
    weight,
    familyBreakdown: [{ familyId: 'destruction', count: totalEdgeCount, score: weight }],
  };
}
```

Add `kind: 'base'` to the returned object:

```ts
function graphEdge(source: string, target: string, weight: number, totalEdgeCount: number): GraphEdge {
  return {
    source, target,
    dominantFamily: 'destruction',
    totalEdgeCount,
    weight,
    familyBreakdown: [{ familyId: 'destruction', count: totalEdgeCount, score: weight }],
    kind: 'base',
  };
}
```

In `app/src/components/deckGraph/GraphCanvas.test.tsx`, the `graph()` helper builds an inline edge. Update it:

```ts
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
      kind: 'base',
    }],
  };
}
```

In `app/src/components/deckGraph/SelectionDrawer.test.tsx`, the `lifegainEdge` helper and the inline edge in `'lists each family with a count…'` need updating:

```ts
function lifegainEdge(source: string, target: string, count = 2): GraphEdge {
  return {
    source, target,
    dominantFamily: 'lifegain', totalEdgeCount: count, weight: count,
    familyBreakdown: [{ familyId: 'lifegain', count, score: 1 + 0.3 * (count - 1) }],
    kind: 'base',
  };
}
```

And the inline edge inside `incidentEdges` in the "shared interactions" test:

```ts
{
  source: 'frantic', target: 'bloodgift',
  dominantFamily: 'card-selection', totalEdgeCount: 1, weight: 1,
  familyBreakdown: [{ familyId: 'card-selection', count: 1, score: 1 }],
  kind: 'base',
},
```

- [ ] **Step 4: Run the test suites to verify types compile and existing tests still pass**

Run from repo root: `npm run test:pipeline`
Expected: PASS (no app tests in this run; just confirms pipeline + shared types still compile cleanly).

Then run from `app/`: `npm test -- --run`
Expected: PASS — every existing test still passes with the new `kind` field plumbed through.

Then run from `app/`: `npm run build`
Expected: PASS — `tsc` confirms `noUncheckedIndexedAccess` and the new type fields are wired correctly.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/deckGraph.ts app/src/lib/deckGraph.test.ts \
  app/src/components/deckGraph/GraphCanvas.test.tsx \
  app/src/components/deckGraph/SelectionDrawer.test.tsx
git commit -m "$(cat <<'EOF'
refactor(app): add kind field to GraphEdge and 'bridge' to GraphNodeCls

Type-only foundation for the bridge-expansion feature. All existing
GraphEdge constructions tagged 'base'. No behavior change.
EOF
)"
```

---

## Task 2: Implement `expandWithBridges` (TDD)

**Files:**
- Modify: `app/src/lib/deckGraph.ts` (add new function + types)
- Test: `app/src/lib/deckGraph.test.ts` (new describe block)

Pure function: takes a base graph + selected oracle id + the global edge maps, returns a new `GraphOutput` with up to 20 bridge nodes (`cls: 'bridge'`) and their edges (`kind: 'bridge'`) merged in. Algorithm details are in the spec under "Algorithm".

- [ ] **Step 1: Write the test scaffolding and the first failing test**

Append to `app/src/lib/deckGraph.test.ts`. First, after the existing `import` block, add `expandWithBridges` (and any helper types we'll need) to the imports:

```ts
import {
  scoreCandidate,
  buildDeckGraph,
  buildFocusedGraph,
  neighborStats,
  deckConnectionSummary,
  expandWithBridges,
  type CandidateScoreInput,
  type FilterState,
  type GraphEdge,
  type GraphInput,
  type GraphOutput,
} from './deckGraph';
```

Then add a new describe block at the bottom of the file:

```ts
describe('expandWithBridges', () => {
  // Helper: build a GraphOutput + edge maps from a flat list of InteractionEdges.
  // Returns the pieces needed to call expandWithBridges.
  function setup(opts: {
    deckIds: string[];
    deckCards: Card[];
    candidateCards: Card[];   // appear in base graph
    bridgeCards: Card[];      // exist in `cards` map only; off-canvas
    edges: InteractionEdge[];
    filters?: FilterState;
  }) {
    const cards = new Map<string, Card>();
    for (const c of [...opts.deckCards, ...opts.candidateCards, ...opts.bridgeCards]) {
      cards.set(c.oracleId, c);
    }
    const outbound = new Map<string, InteractionEdge[]>();
    const inbound = new Map<string, InteractionEdge[]>();
    for (const e of opts.edges) {
      const out = outbound.get(e.source) ?? [];
      out.push(e);
      outbound.set(e.source, out);
      const inb = inbound.get(e.target) ?? [];
      inb.push(e);
      inbound.set(e.target, inb);
    }
    const filters = opts.filters ?? noFilter;
    const base = buildDeckGraph({
      deckOracleIds: opts.deckIds, cards, outbound, inbound, filters,
    });
    return {
      base,
      cards,
      outbound,
      inbound,
      filters,
      deckOracleIds: new Set(opts.deckIds),
    };
  }

  it('returns base unchanged when selected id is not in the base graph', () => {
    const ctx = setup({
      deckIds: ['d1'], deckCards: [card('d1')],
      candidateCards: [], bridgeCards: [], edges: [],
    });
    const out = expandWithBridges({
      ...ctx,
      selectedId: 'missing',
    });
    expect(out).toBe(ctx.base);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails with "expandWithBridges is not exported"**

Run from `app/`: `npm test -- --run deckGraph`
Expected: FAIL with an export error (`Module has no exported member 'expandWithBridges'`).

- [ ] **Step 3: Add the type, the `MAX_BRIDGES` constant, and a stub implementation in `app/src/lib/deckGraph.ts`**

At the bottom of `app/src/lib/deckGraph.ts`:

```ts
export const MAX_BRIDGES = 20;

export type BridgeExpansionInput = {
  base: GraphOutput;
  selectedId: string;
  deckOracleIds: Set<string>;
  cards: Map<string, Card>;
  outbound: Map<string, InteractionEdge[]>;
  inbound: Map<string, InteractionEdge[]>;
  filters: FilterState;
};

export function expandWithBridges(input: BridgeExpansionInput): GraphOutput {
  const baseNodeIds = new Set(input.base.nodes.map((n) => n.id));
  if (!baseNodeIds.has(input.selectedId)) return input.base;
  // Real implementation lands in Step 5.
  return input.base;
}
```

- [ ] **Step 4: Re-run the test to confirm it passes (stub satisfies the first case)**

Run from `app/`: `npm test -- --run deckGraph`
Expected: PASS for the single `'returns base unchanged...'` test.

- [ ] **Step 5: Add the remaining 8 tests (still pre-implementation) to drive the full algorithm**

Append these tests to the `describe('expandWithBridges', ...)` block:

```ts
  it('adds a bridge node for an off-canvas neighbor that connects back to the deck', () => {
    const ctx = setup({
      deckIds: ['d1'],
      deckCards: [card('d1')],
      candidateCards: [card('c1')],
      bridgeCards: [card('br1')],
      edges: [
        edge('c1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies'),     // base graph
        edge('c1', 'br1', 'effect.destroy_creature', 'trigger.creature_dies'),    // selected → bridge
        edge('br1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies'),    // bridge → deck
      ],
    });
    const out = expandWithBridges({ ...ctx, selectedId: 'c1' });
    const bridgeNode = out.nodes.find((n) => n.id === 'br1');
    expect(bridgeNode?.cls).toBe('bridge');

    const bridgeEdges = out.edges.filter((e) => e.kind === 'bridge');
    const pairs = bridgeEdges.map((e) => [e.source, e.target].sort().join('|')).sort();
    expect(pairs).toEqual(['br1|c1', 'br1|d1']);
  });

  it('excludes neighbors with no path back to the deck', () => {
    const ctx = setup({
      deckIds: ['d1'],
      deckCards: [card('d1')],
      candidateCards: [card('c1')],
      bridgeCards: [card('lonely')],
      edges: [
        edge('c1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies'),
        edge('c1', 'lonely', 'effect.destroy_creature', 'trigger.creature_dies'), // no edge from lonely to deck
      ],
    });
    const out = expandWithBridges({ ...ctx, selectedId: 'c1' });
    expect(out.nodes.find((n) => n.id === 'lonely')).toBeUndefined();
  });

  it('does not add a node that is already in the base graph', () => {
    // c2 is a base-graph candidate AND a neighbor of c1. It must not be re-added.
    const ctx = setup({
      deckIds: ['d1'],
      deckCards: [card('d1')],
      candidateCards: [card('c1'), card('c2')],
      bridgeCards: [],
      edges: [
        edge('c1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies'),
        edge('c2', 'd1', 'effect.destroy_creature', 'trigger.creature_dies'),
        edge('c1', 'c2', 'effect.destroy_creature', 'trigger.creature_dies'),
      ],
    });
    const out = expandWithBridges({ ...ctx, selectedId: 'c1' });
    const c2Nodes = out.nodes.filter((n) => n.id === 'c2');
    expect(c2Nodes).toHaveLength(1);
    expect(c2Nodes[0]?.cls).toBe('candidate');
    // No bridge edges should have been emitted, since c2 isn't a bridge candidate.
    expect(out.edges.filter((e) => e.kind === 'bridge')).toHaveLength(0);
  });

  it('caps surviving bridges at MAX_BRIDGES, ranked by summed bridge-to-deck weight', () => {
    const deckIds = ['d1'];
    const deckCards = [card('d1')];
    const candidateCards = [card('c1')];
    const bridgeCards: Card[] = [];
    const edges: InteractionEdge[] = [
      edge('c1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies'),
    ];
    // 30 bridges, each connected to selected (c1) once.
    // The first 20 (br00..br19) also reach the deck multiple times — higher
    // reach-weight; they should be the ones kept. Br20..br29 reach the deck
    // only once (lower weight); they should be dropped.
    for (let i = 0; i < 30; i++) {
      const id = `br${String(i).padStart(2, '0')}`;
      bridgeCards.push(card(id));
      edges.push(edge('c1', id, 'effect.destroy_creature', 'trigger.creature_dies'));
      const reachCount = i < 20 ? 3 : 1;
      for (let k = 0; k < reachCount; k++) {
        edges.push(edge(id, 'd1', 'effect.destroy_creature', 'trigger.creature_dies'));
      }
    }
    const ctx = setup({ deckIds, deckCards, candidateCards, bridgeCards, edges });
    const out = expandWithBridges({ ...ctx, selectedId: 'c1' });
    const bridgeIds = out.nodes.filter((n) => n.cls === 'bridge').map((n) => n.id).sort();
    expect(bridgeIds).toHaveLength(20);
    // The high-weight 20 (br00..br19) win.
    expect(bridgeIds).toEqual(Array.from({ length: 20 }, (_, i) => `br${String(i).padStart(2, '0')}`));
  });

  it('drops a bridge whose only reach-to-deck edge is in a filtered-off family', () => {
    const ctx = setup({
      deckIds: ['d1'],
      deckCards: [card('d1')],
      candidateCards: [card('c1')],
      bridgeCards: [card('br1')],
      edges: [
        edge('c1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies'),
        edge('c1', 'br1', 'effect.destroy_creature', 'trigger.creature_dies'),
        edge('br1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies'),
      ],
      filters: {
        offFamilies: new Set(['destruction']),
        onColors: new Set(['W', 'U', 'B', 'R', 'G']),
      },
    });
    const out = expandWithBridges({ ...ctx, selectedId: 'c1' });
    expect(out.nodes.find((n) => n.id === 'br1')).toBeUndefined();
  });

  it('drops a colorless bridge when "C" is not in onColors', () => {
    const ctx = setup({
      deckIds: ['d1'],
      deckCards: [card('d1')],
      candidateCards: [card('c1')],
      bridgeCards: [card('br1', [])], // colorless
      edges: [
        edge('c1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies'),
        edge('c1', 'br1', 'effect.destroy_creature', 'trigger.creature_dies'),
        edge('br1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies'),
      ],
      filters: { offFamilies: new Set(), onColors: new Set(['B']) },
    });
    const out = expandWithBridges({ ...ctx, selectedId: 'c1' });
    expect(out.nodes.find((n) => n.id === 'br1')).toBeUndefined();
  });

  it('when selected is a deck card, bridges reach OTHER deck cards (not self)', () => {
    const ctx = setup({
      deckIds: ['d1', 'd2'],
      deckCards: [card('d1'), card('d2')],
      candidateCards: [],
      bridgeCards: [card('br1')],
      edges: [
        edge('d1', 'br1', 'effect.destroy_creature', 'trigger.creature_dies'),
        edge('br1', 'd2', 'effect.destroy_creature', 'trigger.creature_dies'),
        // bridge to selected itself — should NOT count as deck-reach.
        edge('br1', 'd1', 'effect.life_changed', 'condition.cares_lifegain'),
      ],
    });
    const out = expandWithBridges({ ...ctx, selectedId: 'd1' });
    const bridgeNode = out.nodes.find((n) => n.id === 'br1');
    expect(bridgeNode?.cls).toBe('bridge');
    // br1↔d2 should appear as a bridge edge; br1↔d1 should NOT (it's the
    // selected-to-bridge edge, family 'lifegain', kept as kind:'bridge' but
    // counted under selected↔bridge, not deck-reach).
    const bridgeEdges = out.edges.filter((e) => e.kind === 'bridge');
    const reachesD2 = bridgeEdges.some(
      (e) => [e.source, e.target].sort().join('|') === 'br1|d2',
    );
    expect(reachesD2).toBe(true);
  });

  it('ranks ties deterministically by card name ascending', () => {
    const ctx = setup({
      deckIds: ['d1'],
      deckCards: [card('d1')],
      candidateCards: [card('c1')],
      bridgeCards: [card('zeta'), card('alpha'), card('mike')],
      edges: [
        edge('c1', 'd1', 'effect.destroy_creature', 'trigger.creature_dies'),
        edge('c1', 'zeta', 'effect.destroy_creature', 'trigger.creature_dies'),
        edge('c1', 'alpha', 'effect.destroy_creature', 'trigger.creature_dies'),
        edge('c1', 'mike', 'effect.destroy_creature', 'trigger.creature_dies'),
        edge('zeta', 'd1', 'effect.destroy_creature', 'trigger.creature_dies'),
        edge('alpha', 'd1', 'effect.destroy_creature', 'trigger.creature_dies'),
        edge('mike', 'd1', 'effect.destroy_creature', 'trigger.creature_dies'),
      ],
    });
    const out = expandWithBridges({ ...ctx, selectedId: 'c1' });
    const bridgeNodes = out.nodes.filter((n) => n.cls === 'bridge');
    // All three have equal weight (1.0 each). Name tiebreak → alpha, mike, zeta.
    expect(bridgeNodes.map((n) => n.id)).toEqual(['alpha', 'mike', 'zeta']);
  });
```

- [ ] **Step 6: Run the suite and verify the new tests fail**

Run from `app/`: `npm test -- --run deckGraph`
Expected: 8 new tests FAIL (the stub still returns `base` unchanged for the cases that expect bridges).

- [ ] **Step 7: Replace the stub with the real implementation in `app/src/lib/deckGraph.ts`**

Replace the stub body of `expandWithBridges`:

```ts
export function expandWithBridges(input: BridgeExpansionInput): GraphOutput {
  const { base, selectedId, deckOracleIds, cards, outbound, inbound, filters } = input;
  const baseNodeIds = new Set(base.nodes.map((n) => n.id));
  if (!baseNodeIds.has(selectedId)) return base;

  const candidateIds = new Set<string>();
  function collectFromEdge(other: string, fam: FamilyId | undefined) {
    if (!fam || filters.offFamilies.has(fam)) return;
    if (other === selectedId) return;
    if (baseNodeIds.has(other)) return;
    if (deckOracleIds.has(other)) return;
    if (!cards.has(other)) return;
    candidateIds.add(other);
  }
  for (const e of outbound.get(selectedId) ?? []) {
    collectFromEdge(e.target, familyFor(e.reason.sourceTagId)?.id);
  }
  for (const e of inbound.get(selectedId) ?? []) {
    collectFromEdge(e.source, familyFor(e.reason.sourceTagId)?.id);
  }

  type BridgeData = {
    bridgeId: string;
    bridgeCard: Card;
    selectedFamilyCounts: Map<FamilyId, number>;
    deckFamilyCountsByDeckId: Map<string, Map<FamilyId, number>>;
  };
  const bridges: BridgeData[] = [];
  for (const bridgeId of candidateIds) {
    const bridgeCard = cards.get(bridgeId);
    if (!bridgeCard) continue;
    if (!colorAllowed(bridgeCard, filters.onColors)) continue;

    const selFamCounts = new Map<FamilyId, number>();
    function tallySel(fam: FamilyId | undefined) {
      if (!fam || filters.offFamilies.has(fam)) return;
      selFamCounts.set(fam, (selFamCounts.get(fam) ?? 0) + 1);
    }
    for (const e of outbound.get(selectedId) ?? []) {
      if (e.target === bridgeId) tallySel(familyFor(e.reason.sourceTagId)?.id);
    }
    for (const e of inbound.get(selectedId) ?? []) {
      if (e.source === bridgeId) tallySel(familyFor(e.reason.sourceTagId)?.id);
    }
    if (selFamCounts.size === 0) continue;

    const deckFamCounts = new Map<string, Map<FamilyId, number>>();
    function tallyDeck(deckId: string, fam: FamilyId | undefined) {
      if (!fam || filters.offFamilies.has(fam)) return;
      if (deckId === selectedId) return;
      if (!deckOracleIds.has(deckId)) return;
      let m = deckFamCounts.get(deckId);
      if (!m) {
        m = new Map<FamilyId, number>();
        deckFamCounts.set(deckId, m);
      }
      m.set(fam, (m.get(fam) ?? 0) + 1);
    }
    for (const e of outbound.get(bridgeId) ?? []) {
      tallyDeck(e.target, familyFor(e.reason.sourceTagId)?.id);
    }
    for (const e of inbound.get(bridgeId) ?? []) {
      tallyDeck(e.source, familyFor(e.reason.sourceTagId)?.id);
    }
    if (deckFamCounts.size === 0) continue;

    bridges.push({
      bridgeId,
      bridgeCard,
      selectedFamilyCounts: selFamCounts,
      deckFamilyCountsByDeckId: deckFamCounts,
    });
  }

  function weightFromFamCounts(m: Map<FamilyId, number>): number {
    let total = 0;
    for (const c of m.values()) total += 1 + WEIGHT_DIMINISH * (c - 1);
    return total;
  }
  type Ranked = BridgeData & { totalReachWeight: number };
  const ranked: Ranked[] = bridges.map((b) => {
    let total = 0;
    for (const m of b.deckFamilyCountsByDeckId.values()) total += weightFromFamCounts(m);
    return { ...b, totalReachWeight: total };
  });
  ranked.sort((a, b) =>
    b.totalReachWeight - a.totalReachWeight
    || a.bridgeCard.name.localeCompare(b.bridgeCard.name),
  );
  const top = ranked.slice(0, MAX_BRIDGES);

  function buildBridgeEdge(a: string, b: string, fams: Map<FamilyId, number>): GraphEdge {
    const breakdown: FamilyBreakdownEntry[] = [];
    let dominantFamily: FamilyId | null = null;
    let dominantCount = -1;
    let total = 0;
    for (const [fam, count] of fams) {
      total += count;
      breakdown.push({ familyId: fam, count, score: 1 + WEIGHT_DIMINISH * (count - 1) });
      if (count > dominantCount) {
        dominantCount = count;
        dominantFamily = fam;
      }
    }
    const weight = breakdown.reduce((s, e) => s + e.score, 0);
    return {
      source: a,
      target: b,
      dominantFamily: dominantFamily!,
      totalEdgeCount: total,
      weight,
      familyBreakdown: breakdown,
      kind: 'bridge',
    };
  }

  const bridgeEdges: GraphEdge[] = [];
  for (const b of top) {
    bridgeEdges.push(buildBridgeEdge(selectedId, b.bridgeId, b.selectedFamilyCounts));
    for (const [deckId, fams] of b.deckFamilyCountsByDeckId) {
      bridgeEdges.push(buildBridgeEdge(b.bridgeId, deckId, fams));
    }
  }

  const incidentCount = new Map<string, number>();
  for (const e of bridgeEdges) {
    incidentCount.set(e.source, (incidentCount.get(e.source) ?? 0) + 1);
    incidentCount.set(e.target, (incidentCount.get(e.target) ?? 0) + 1);
  }
  const bridgeNodes: GraphNode[] = top.map((b) => {
    const ec = incidentCount.get(b.bridgeId) ?? 0;
    return { id: b.bridgeId, cls: 'bridge', card: b.bridgeCard, radius: radiusFor(ec), edgeCount: ec };
  });

  return {
    nodes: [...base.nodes, ...bridgeNodes],
    edges: [...base.edges, ...bridgeEdges],
  };
}
```

- [ ] **Step 8: Run the tests; all 9 in the new describe block should pass**

Run from `app/`: `npm test -- --run deckGraph`
Expected: PASS for all `expandWithBridges` cases.

- [ ] **Step 9: Run the full app suite + build to ensure nothing else regressed**

Run from `app/`: `npm test -- --run`
Expected: PASS

Run from `app/`: `npm run build`
Expected: PASS — strict TS compile clean.

- [ ] **Step 10: Commit**

```bash
git add app/src/lib/deckGraph.ts app/src/lib/deckGraph.test.ts
git commit -m "$(cat <<'EOF'
feat(app): add expandWithBridges for 2nd-degree reach on graph selection

Pure function that augments a deck-graph output with up to 20 bridge
nodes — off-canvas cards that both link to the selected node and reach
back into the deck. Ranked by summed bridge-to-deck weight, deterministic
name tiebreak. Respects family + color filters.
EOF
)"
```

---

## Task 3: Wire `expandWithBridges` into `DeckGraphPage`

**Files:**
- Modify: `app/src/pages/DeckGraphPage.tsx`

`DeckGraphPage` owns selection state and the base graph memo. Add a downstream memo that runs the expansion when a selection exists, and pass the expanded graph to `GraphCanvas`. `presentFamilies` / `familyEdgeCounts` must continue to derive from the *base* graph (the pill row describes the stable base, not transient expansions).

- [ ] **Step 1: Add the import**

In `app/src/pages/DeckGraphPage.tsx`, extend the import from `../lib/deckGraph`:

```ts
import {
  buildDeckGraph,
  buildFocusedGraph,
  expandWithBridges,
  type ColorFilter,
  type FilterState,
  type GraphNode,
  type GraphOutput,
} from '../lib/deckGraph';
```

(We also pull `GraphNode` because we'll need it for the `nodesById` map in Task 5.)

- [ ] **Step 2: Add the `expandedGraph` memo**

Immediately after the existing `const graph: GraphOutput = useMemo(...)` block, add:

```ts
const expandedGraph: GraphOutput = useMemo(() => {
  if (!selectedOracleId) return graph;
  return expandWithBridges({
    base: graph,
    selectedId: selectedOracleId,
    deckOracleIds: new Set(refreshedDeckIds),
    cards,
    outbound,
    inbound,
    filters,
  });
}, [graph, selectedOracleId, refreshedDeckIds, cards, outbound, inbound, filters]);
```

- [ ] **Step 3: Update `selectedNode`, `incidentEdges`, and the canvas-selection-clearing effect to use `expandedGraph`**

Locate these three blocks and replace `graph` with `expandedGraph` in each:

```ts
useEffect(() => {
  if (selectedOracleId && !expandedGraph.nodes.some((n) => n.id === selectedOracleId)) {
    setSelectedOracleId(null);
  }
}, [expandedGraph, selectedOracleId]);
```

```ts
const selectedNode = useMemo(
  () => (selectedOracleId ? expandedGraph.nodes.find((n) => n.id === selectedOracleId) ?? null : null),
  [selectedOracleId, expandedGraph],
);
const incidentEdges = useMemo(
  () =>
    selectedOracleId
      ? expandedGraph.edges.filter((e) => e.source === selectedOracleId || e.target === selectedOracleId)
      : [],
  [selectedOracleId, expandedGraph],
);
```

**Do NOT change** the `presentFamilies` / `familyEdgeCounts` memo — leave it computing off `graph` (the base). The pill row should reflect the stable base graph, not the transient bridge expansion.

- [ ] **Step 4: Update the `GraphCanvas` prop to pass `expandedGraph`**

In the JSX:

```tsx
<GraphCanvas
  graph={expandedGraph}
  selectedId={selectedOracleId}
  hoveredId={hoveredOracleId}
  onSelect={setSelectedOracleId}
  onFocus={(id) => { setFocusOracleId(id); setSelectedOracleId(null); }}
/>
```

- [ ] **Step 5: Run the full app suite + build**

Run from `app/`: `npm test -- --run`
Expected: PASS (no test changes yet; the wiring should be transparent because the existing component tests don't trigger selection state).

Run from `app/`: `npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/src/pages/DeckGraphPage.tsx
git commit -m "$(cat <<'EOF'
feat(app): wire bridge expansion into DeckGraphPage

Augment the rendered graph with bridge nodes whenever a selection exists.
Pill row keeps deriving from the base graph; selection-clearing effect
and drawer derive from the expanded one so bridges show up as neighbors.
EOF
)"
```

---

## Task 4: `GraphCanvas` — render bridge nodes (dashed stroke) and bridge edges (dashed, elevated opacity)

**Files:**
- Modify: `app/src/components/deckGraph/GraphCanvas.tsx`
- Test: `app/src/components/deckGraph/GraphCanvas.test.tsx`

- [ ] **Step 1: Add failing test cases for bridge styling**

In `app/src/components/deckGraph/GraphCanvas.test.tsx`, add a new test inside the existing `describe('GraphCanvas', ...)` block. Use a helper that builds a graph with one of each cls:

```ts
function graphWithBridge(): GraphOutput {
  return {
    nodes: [
      { id: 'a', cls: 'deck',      card: makeCard('a', 'Alpha'),  radius: 14, edgeCount: 1 },
      { id: 'b', cls: 'candidate', card: makeCard('b', 'Beta'),   radius: 14, edgeCount: 1 },
      { id: 'c', cls: 'bridge',    card: makeCard('c', 'Charlie'), radius: 14, edgeCount: 2 },
    ],
    edges: [
      {
        source: 'a', target: 'b', dominantFamily: 'destruction',
        totalEdgeCount: 1, weight: 1,
        familyBreakdown: [{ familyId: 'destruction', count: 1, score: 1 }],
        kind: 'base',
      },
      {
        source: 'b', target: 'c', dominantFamily: 'destruction',
        totalEdgeCount: 1, weight: 1,
        familyBreakdown: [{ familyId: 'destruction', count: 1, score: 1 }],
        kind: 'bridge',
      },
      {
        source: 'c', target: 'a', dominantFamily: 'destruction',
        totalEdgeCount: 1, weight: 1,
        familyBreakdown: [{ familyId: 'destruction', count: 1, score: 1 }],
        kind: 'bridge',
      },
    ],
  };
}

it('renders bridge nodes with a dashed neutral stroke', () => {
  const { container } = render(
    <GraphCanvas graph={graphWithBridge()} selectedId="b" hoveredId={null} onSelect={() => {}} onFocus={() => {}} />,
  );
  const bridgeCircle = container.querySelector('[data-node-id="c"] circle:not([data-halo])');
  expect(bridgeCircle?.getAttribute('stroke-dasharray')).toBe('3 2');
  expect(bridgeCircle?.getAttribute('stroke')?.toLowerCase()).toBe('#3a3a3a');
});

it('renders bridge edges dashed', () => {
  const { container } = render(
    <GraphCanvas graph={graphWithBridge()} selectedId="b" hoveredId={null} onSelect={() => {}} onFocus={() => {}} />,
  );
  // Use data-bridge-edge to distinguish in the assertion (added in the impl step).
  const bridgeEdges = container.querySelectorAll('line[data-bridge-edge]');
  expect(bridgeEdges.length).toBeGreaterThan(0);
  for (const el of bridgeEdges) {
    expect(el.getAttribute('stroke-dasharray')).toBe('4 3');
  }
});

it('keeps every bridge edge at opacity ≥ 0.75 (incident: 1, non-incident bridge: 0.75)', () => {
  const { container } = render(
    <GraphCanvas graph={graphWithBridge()} selectedId="b" hoveredId={null} onSelect={() => {}} onFocus={() => {}} />,
  );
  // The b↔c bridge edge is incident to selected (b) → opacity 1.
  // The c↔a bridge edge is NOT incident to selected → should use elevated
  // 0.75, NOT the base-graph dim of 0.25.
  const bridgeEdges = container.querySelectorAll('line[data-bridge-edge]');
  expect(bridgeEdges.length).toBe(2);
  for (const el of bridgeEdges) {
    const op = Number(el.getAttribute('stroke-opacity') ?? '1');
    expect(op).toBeGreaterThanOrEqual(0.75);
  }
});
```

- [ ] **Step 2: Run the tests — confirm they fail**

Run from `app/`: `npm test -- --run GraphCanvas`
Expected: FAIL — bridge styling not yet implemented; `data-bridge-edge` doesn't exist; assertions fail.

- [ ] **Step 3: Implement bridge node + edge styling in `GraphCanvas.tsx`**

In the `<g data-layer="edges">` block, update the line element to:

```tsx
{graph.edges.map((e) => {
  const color = COLOR_BY_FAMILY.get(e.dominantFamily) ?? '#666';
  const width = 1 + Math.sqrt(Math.max(0, e.totalEdgeCount - 1));
  const isIncident =
    selectedId !== null && (e.source === selectedId || e.target === selectedId);
  const isBridge = e.kind === 'bridge';
  const opacity = isIncident ? 1 : isBridge ? 0.75 : 0.25;
  const key = `${e.source}|${e.target}`;
  const isMulti = e.familyBreakdown.length >= 2;
  const dashArray = isBridge ? '4 3' : undefined;
  return (
    <g key={key}>
      <line
        ref={(el) => { edgeRefs.current.set(key, el); }}
        stroke={color}
        strokeWidth={width}
        strokeOpacity={opacity}
        strokeDasharray={dashArray}
        vectorEffect="non-scaling-stroke"
        data-edge
        {...(isBridge ? { 'data-bridge-edge': '' } : {})}
      />
      {isMulti && (
        <g
          ref={(el) => { markRefs.current.set(key, el); }}
          data-edge-multimark
        >
          <circle
            r={3}
            fill={color}
            stroke="#0a0a0a"
            strokeWidth={1}
            opacity={opacity}
            vectorEffect="non-scaling-stroke"
          />
        </g>
      )}
    </g>
  );
})}
```

In the `<g data-layer="nodes">` block, update the main circle's stroke logic to handle the bridge cls:

```tsx
{graph.nodes.map((n) => {
  const isBridge = n.cls === 'bridge';
  const stroke =
    selectedId === n.id ? SELECTED
    : n.cls === 'deck'  ? AMBER
    : isBridge          ? '#3a3a3a'
    : NEUTRAL;
  const strokeWidth = selectedId === n.id ? 3 : n.cls === 'deck' ? 1.8 : 1;
  const strokeDash = isBridge ? '3 2' : undefined;
  const label =
    n.card.name.length > 14 ? n.card.name.slice(0, 13) + '…' : n.card.name;
  return (
    <g
      key={n.id}
      data-node-id={n.id}
      ref={(el) => { nodeOuterRefs.current.set(n.id, el); }}
      aria-label={n.card.name}
      role="button"
      tabIndex={0}
      style={{ cursor: 'pointer' }}
      onClick={(ev) => { ev.stopPropagation(); onSelect(n.id); }}
      onDoubleClick={(ev) => { ev.stopPropagation(); onFocus(n.id); }}
    >
      <g ref={(el) => { nodeInnerRefs.current.set(n.id, el); }}>
        <circle
          ref={(el) => { haloRefs.current.set(n.id, el); }}
          r={n.radius + 5}
          fill="none"
          stroke="#fbbf24"
          strokeWidth={2}
          strokeDasharray="3 2"
          opacity={0}
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
          data-halo
        />
        <circle
          r={n.radius}
          fill="#161616"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDash}
          vectorEffect="non-scaling-stroke"
        />
        <text
          textAnchor="middle"
          dy="0.35em"
          fontSize={10}
          fill={n.cls === 'deck' ? '#f5e0a0' : '#cccccc'}
          pointerEvents="none"
        >
          {label}
        </text>
      </g>
    </g>
  );
})}
```

- [ ] **Step 4: Re-run the canvas tests — should pass**

Run from `app/`: `npm test -- --run GraphCanvas`
Expected: PASS for all canvas tests (existing + 3 new bridge cases).

- [ ] **Step 5: Run the full app suite + build**

Run from `app/`: `npm test -- --run`
Expected: PASS.

Run from `app/`: `npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/src/components/deckGraph/GraphCanvas.tsx app/src/components/deckGraph/GraphCanvas.test.tsx
git commit -m "$(cat <<'EOF'
feat(app): render bridge nodes and edges with dashed strokes

Bridge nodes: dashed neutral (#3a3a3a) stroke. Bridge edges: dashed
(4 3), and the bridge-to-deck edges (not incident to the selected node)
get elevated opacity (0.75) so they stay readable.
EOF
)"
```

---

## Task 5: `SelectionDrawer` — bridge indicator on neighbor rows

**Files:**
- Modify: `app/src/lib/deckGraph.ts` (`NeighborStat` + `neighborStats` signature)
- Modify: `app/src/components/deckGraph/SelectionDrawer.tsx` (new optional `nodesById` prop; bridge indicator render)
- Modify: `app/src/components/deckGraph/SelectionDrawer.test.tsx` (new test case)
- Modify: `app/src/pages/DeckGraphPage.tsx` (thread `nodesById` into the drawer)

- [ ] **Step 1: Extend `NeighborStat` and `neighborStats` in `deckGraph.ts`**

Update `NeighborStat`:

```ts
export type NeighborStat = {
  oracleId: string;
  card: Card;
  weight: number;
  totalEdgeCount: number;
  familyBreakdown: FamilyBreakdownEntry[];
  deckCount: number;
  inDeck: boolean;
  cls?: GraphNodeCls;
};
```

Update `neighborStats` to accept an optional `nodesById` map. Replace the existing signature + body:

```ts
export function neighborStats(
  selectedId: string,
  incidentEdges: GraphEdge[],
  cards: Map<string, Card>,
  deckCounts: Map<string, number>,
  nodesById?: Map<string, GraphNode>,
): NeighborStat[] {
  const out: NeighborStat[] = [];
  for (const e of incidentEdges) {
    const neighborId = e.source === selectedId ? e.target : e.source;
    const card = cards.get(neighborId);
    if (!card) continue;
    const deckCount = deckCounts.get(neighborId) ?? 0;
    out.push({
      oracleId: neighborId,
      card,
      weight: e.weight,
      totalEdgeCount: e.totalEdgeCount,
      familyBreakdown: e.familyBreakdown,
      deckCount,
      inDeck: deckCount > 0,
      cls: nodesById?.get(neighborId)?.cls,
    });
  }
  out.sort((a, b) =>
    b.weight - a.weight
    || b.deckCount - a.deckCount
    || a.card.name.localeCompare(b.card.name),
  );
  return out;
}
```

(`nodesById` is optional — existing callers in tests that don't pass it get `cls: undefined`, which the drawer treats as "no indicator." This keeps the existing `neighborStats` tests passing untouched.)

- [ ] **Step 2: Add a failing test for the bridge indicator in `SelectionDrawer.test.tsx`**

Append to the bottom of the file:

```ts
describe('SelectionDrawer — bridge indicator', () => {
  function bridgeEdge(source: string, target: string): GraphEdge {
    return {
      source, target,
      dominantFamily: 'lifegain', totalEdgeCount: 1, weight: 1,
      familyBreakdown: [{ familyId: 'lifegain', count: 1, score: 1 }],
      kind: 'bridge',
    };
  }

  it('renders a bridge indicator on rows whose neighbor cls === "bridge"', () => {
    const sheoldred = makeCard('sheoldred', 'Sheoldred, the Apocalypse');
    const brCard = makeCard('br1', 'Bridge One');
    const candidateRowEdge = lifegainEdge('sheoldred', 'bloodgift');
    const bridgeRowEdge = bridgeEdge('br1', 'bloodgift');
    render(
      <SelectionDrawer
        {...defaultProps({
          incidentEdges: [candidateRowEdge, bridgeRowEdge],
          cards: new Map([['sheoldred', sheoldred], ['br1', brCard]]),
          deckCounts: new Map([['sheoldred', 4]]),
          nodesById: new Map<string, GraphNode>([
            ['sheoldred', { id: 'sheoldred', cls: 'candidate', card: sheoldred, radius: 14, edgeCount: 1 }],
            ['br1',       { id: 'br1',       cls: 'bridge',    card: brCard,    radius: 14, edgeCount: 2 }],
          ]),
        })}
      />,
    );
    const bridgeRow = document.querySelector('[data-oracle-id="br1"]')!;
    const candRow = document.querySelector('[data-oracle-id="sheoldred"]')!;
    expect(bridgeRow.querySelector('[data-bridge-indicator]')).not.toBeNull();
    expect(candRow.querySelector('[data-bridge-indicator]')).toBeNull();
  });
});
```

(`GraphNode` and `GraphEdge` are already imported at the top of the file — no import changes needed.)

Add the `nodesById` field to the `defaultProps` helper's return so the rest of the suite doesn't break — the new `SelectionDrawer` prop is required, so an empty map keeps types clean:

```ts
function defaultProps(overrides: Partial<React.ComponentProps<typeof SelectionDrawer>> = {}) {
  return {
    node: makeNode('candidate'),
    incidentEdges: [lifegainEdge('sheoldred', 'bloodgift')],
    deckCount: 0,
    cards: new Map<string, Card>([
      ['sheoldred', makeCard('sheoldred', 'Sheoldred, the Apocalypse')],
    ]),
    deckCounts: new Map<string, number>([['sheoldred', 4]]),
    nodesById: new Map<string, GraphNode>(),
    onAdd: vi.fn(),
    onRemoveOne: vi.fn(),
    onRemoveAll: vi.fn(),
    onClose: vi.fn(),
    onAddNeighbor: vi.fn(),
    onRemoveNeighbor: vi.fn(),
    onSelectNeighbor: vi.fn(),
    onHoverNeighbor: vi.fn(),
    onToggleFamily: vi.fn(),
    ...overrides,
  };
}
```

- [ ] **Step 3: Run the test — confirm it fails**

Run from `app/`: `npm test -- --run SelectionDrawer`
Expected: FAIL — `nodesById` prop doesn't exist on `SelectionDrawer`; `data-bridge-indicator` selector finds nothing.

- [ ] **Step 4: Update `SelectionDrawer.tsx` to accept `nodesById` and render the bridge indicator**

Update the imports:

```ts
import {
  deckConnectionSummary,
  neighborStats,
  type GraphEdge,
  type GraphNode,
  type NeighborStat,
} from '../../lib/deckGraph';
```

Update the `Props` type:

```ts
type Props = {
  node: GraphNode;
  incidentEdges: GraphEdge[];
  deckCount: number;
  cards: Map<string, Card>;
  deckCounts: Map<string, number>;
  nodesById: Map<string, GraphNode>;
  onAdd: () => void;
  onRemoveOne: () => void;
  onRemoveAll: () => void;
  onClose: () => void;
  onAddNeighbor: (oracleId: string, qty: number) => void | Promise<void>;
  onRemoveNeighbor: (oracleId: string, qty: number) => void | Promise<void>;
  onSelectNeighbor: (oracleId: string) => void;
  onHoverNeighbor: (oracleId: string | null) => void;
  onToggleFamily: (id: FamilyId) => void;
};
```

Update the function signature to destructure `nodesById`:

```ts
export default function SelectionDrawer({
  node,
  incidentEdges,
  deckCount,
  cards,
  deckCounts,
  nodesById,
  ...
```

Update the `neighborStats` call:

```ts
const neighbors = useMemo(
  () => neighborStats(node.id, incidentEdges, cards, deckCounts, nodesById),
  [node.id, incidentEdges, cards, deckCounts, nodesById],
);
```

Update the `NeighborBadges` helper at the bottom of the file to take a leading bridge indicator:

```tsx
function NeighborBadges({ stat }: { stat: NeighborStat }) {
  return (
    <span className="ml-1 flex shrink-0 items-center gap-1.5">
      {stat.cls === 'bridge' && (
        <span
          data-bridge-indicator
          title="Bridge: reachable via the selected card"
          aria-label="Bridge neighbor"
          className="inline-block h-2 w-2 rounded-full border border-dashed border-neutral-400"
        />
      )}
      <span className="flex items-center gap-0.5" aria-label="Shared families">
        {stat.familyBreakdown.map((b) => {
          const fd = FAMILY_DEFS.get(b.familyId);
          if (!fd) return null;
          return (
            <span
              key={b.familyId}
              title={`${fd.label} · ${b.count}`}
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: fd.color }}
            />
          );
        })}
      </span>
      <span
        className="font-mono text-[10px] text-neutral-500"
        title={`${stat.totalEdgeCount} shared interaction${stat.totalEdgeCount === 1 ? '' : 's'}`}
      >
        ×{stat.totalEdgeCount}
      </span>
    </span>
  );
}
```

- [ ] **Step 5: Pass `nodesById` into `SelectionDrawer` from `DeckGraphPage`**

In `app/src/pages/DeckGraphPage.tsx`, add a memo for `nodesById` after `expandedGraph`:

```ts
const nodesById = useMemo(() => {
  const m = new Map<string, GraphNode>();
  for (const n of expandedGraph.nodes) m.set(n.id, n);
  return m;
}, [expandedGraph]);
```

And add the prop in the JSX:

```tsx
<SelectionDrawer
  node={selectedNode}
  incidentEdges={incidentEdges}
  deckCount={selectedDeckCount}
  cards={cards}
  deckCounts={deckCountsByOracleId}
  nodesById={nodesById}
  onAdd={handleAdd}
  ...
/>
```

- [ ] **Step 6: Run the targeted test, then the full suite + build**

Run from `app/`: `npm test -- --run SelectionDrawer`
Expected: PASS.

Run from `app/`: `npm test -- --run`
Expected: PASS for all app tests.

Run from `app/`: `npm run build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/src/lib/deckGraph.ts app/src/components/deckGraph/SelectionDrawer.tsx \
  app/src/components/deckGraph/SelectionDrawer.test.tsx app/src/pages/DeckGraphPage.tsx
git commit -m "$(cat <<'EOF'
feat(app): show bridge indicator on bridge-cls neighbor rows in drawer

Thread a nodesById map into neighborStats so each NeighborStat knows its
node class. SelectionDrawer renders a dashed-border dot before the family
pills when the neighbor is a bridge — visually marks rows that came in
via the bridge expansion vs. base-graph candidates.
EOF
)"
```

---

## Task 6: E2E smoke for bridge expansion (tolerant)

**Files:**
- Modify: `app/tests/e2e/deck-graph.spec.ts`

Bridge expansion only fires when the selected card has off-canvas neighbors that reach back into the deck — that's a property of the loaded data, not something we can force deterministically against the real Sultai fixture. Write a tolerant test: click candidates one at a time; if any of them produces a dashed-stroke node, exercise the round-trip; if none do, skip.

- [ ] **Step 1: Append Suite 10 at the bottom of `app/tests/e2e/deck-graph.spec.ts`**

```ts
// =============================================================================
// Suite 10 — Bridge expansion (2nd-degree reach on selection)
// =============================================================================
test.describe('Suite 10 — Bridge expansion', () => {
  test.beforeEach(async ({ page }) => {
    await setupSultaiAndGoto(page);
  });

  test('10.1 Selecting a candidate that has bridges renders dashed bridge nodes; deselecting clears them', async ({ page }) => {
    const deckIds = new Set(SULTAI_TEST_DECK.map((c) => c.oracleId));
    const allIds = await page.locator('[data-node-id]').evaluateAll((els) =>
      els.map((el) => (el as Element).getAttribute('data-node-id')!).filter(Boolean),
    );
    const candidateIds = allIds.filter((id) => !deckIds.has(id));
    test.skip(candidateIds.length === 0, 'No candidates rendered');

    // Try each candidate until one produces a dashed (bridge) node.
    let foundBridge = false;
    for (const id of candidateIds) {
      const before = await page.locator('[data-node-id]').count();
      await page.locator(`[data-node-id="${id}"]`).first().click();
      // Wait a moment for the React memo + d3 re-init to settle.
      await page.waitForTimeout(150);
      const dashedCount = await page
        .locator('[data-node-id] circle[stroke-dasharray="3 2"]:not([data-halo])')
        .count();
      if (dashedCount > 0) {
        foundBridge = true;
        const after = await page.locator('[data-node-id]').count();
        expect(after).toBeGreaterThan(before);

        // Bridge edges should also be present and dashed.
        const dashedEdges = await page.locator('line[data-bridge-edge]').count();
        expect(dashedEdges).toBeGreaterThan(0);

        // Close the drawer; bridges should disappear.
        await page.keyboard.press('Escape');
        await page.waitForTimeout(150);
        const dashedAfter = await page
          .locator('[data-node-id] circle[stroke-dasharray="3 2"]:not([data-halo])')
          .count();
        expect(dashedAfter).toBe(0);
        break;
      }
      // No bridges from this candidate — close and try the next.
      await page.keyboard.press('Escape');
      await page.waitForTimeout(50);
    }
    test.skip(!foundBridge, 'No candidate in the rendered graph produced a bridge expansion');
  });
});
```

- [ ] **Step 2: Run only Suite 10 from `app/` to confirm it passes (or skips gracefully)**

Run from `app/`: `npm run e2e -- --grep "Suite 10"`
Expected: PASS (test runs, either asserts the round-trip or skips with the "no bridge" message).

If the test is consistently skipped on the Sultai fixture, that's acceptable — the unit + component tests cover the behavior; this is a smoke-level check that nothing throws.

- [ ] **Step 3: Run the full E2E suite to make sure nothing else regressed**

Run from `app/`: `npm run e2e`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/tests/e2e/deck-graph.spec.ts
git commit -m "$(cat <<'EOF'
test(app): e2e smoke for graph bridge expansion

Selects each candidate in turn until one produces a dashed bridge node,
then verifies bridges disappear on Escape. Skips gracefully if no
candidate yields a bridge for the current data set.
EOF
)"
```

---

## Task 7: Final full-gate verification

**Files:** none (verification + manual smoke)

- [ ] **Step 1: Run the full repo-level gate**

Run from repo root: `npm test`
Expected: PASS (pipeline + shared + app vitest + app build).

- [ ] **Step 2: Manual UI smoke**

```bash
cd app && npm run dev
```

Open the dev server. Pick or create a deck with several cards across multiple families. Navigate to `/deck/graph`. Click a candidate node. Confirm:

- One or more dashed-stroke bridge nodes appear (if the deck data supports any).
- The drawer's "Connected cards" list shows the new bridges with the dashed-dot indicator.
- Toggle a family pill that all bridges depend on; bridges that lose all reach disappear.
- Click a bridge node; the previous bridges clear and new bridges (for the now-selected bridge card) expand.
- Press Escape; the drawer closes and bridges disappear.

If a step doesn't behave as described, do not mark this task complete — diagnose and fix in a new commit (following the same TDD pattern as the earlier tasks).

- [ ] **Step 3: Final summary commit (optional)**

If any small follow-up tweaks come out of the manual smoke, commit each as a focused change. No empty commit needed if everything was clean.

---

## Verification commands cheatsheet

- Unit (lib): `cd app && npm test -- --run deckGraph`
- Unit (canvas): `cd app && npm test -- --run GraphCanvas`
- Unit (drawer): `cd app && npm test -- --run SelectionDrawer`
- App full: `cd app && npm test -- --run`
- Build: `cd app && npm run build`
- E2E: `cd app && npm run e2e`
- Repo gate: `npm test` (from root)
