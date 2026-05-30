# Graph bridge expansion (2nd-degree reach on selection)

**Status:** Draft (design phase)
**Date:** 2026-05-24
**Scope:** `app/src/lib/deckGraph.ts`, `app/src/pages/DeckGraphPage.tsx`, `app/src/components/deckGraph/{GraphCanvas,SelectionDrawer}.tsx`

## Problem

In deck graph mode, clicking a node opens the `SelectionDrawer` and shows the selected node's incident edges — but only to other nodes already on the canvas (deck cards + the top-50 candidates). The user can't see edges that go to cards *outside* the current view, and so can't tell whether a candidate is a **bridge** that opens up a sub-theme by pulling in additional cards that themselves connect back to the deck.

Concretely: when evaluating candidate X for inclusion, the user wants to know "does X reach back into my deck through other off-canvas cards?" That second-degree reach is the discovery signal that's currently invisible.

## Goal

When a node is selected, augment the graph with a bounded set of **bridge nodes** — cards not in the deck and not already in the base graph — that:

1. Have at least one edge to the selected node, AND
2. Have at least one edge to a deck card (other than the selected node itself, if it is a deck card).

The bridge nodes and their edges to both the selected node and the relevant deck cards render in the graph alongside the base view. They are transient: clearing or changing the selection clears the bridge set.

## Non-goals

- N-hop generalization. Only 2 degrees (selected → bridge → deck) for v1.
- Pinning, persistence, or multi-selection accumulation. Each new selection resets the bridge set.
- A standalone "show all deck bridges" overview. Bridges are a per-selection affordance only.
- Backend or artifact changes. No `RULE_VERSION` bump.

## User-visible behavior

| Action | Effect |
|---|---|
| Click a node (deck, candidate, or bridge) | Drawer opens, base + bridge nodes/edges render. Prior bridge expansion is replaced. |
| Click empty canvas / close drawer / press Escape | Drawer closes; bridge nodes disappear. |
| Click a bridge node | Becomes the new selection; bridges are recomputed from the new selected card. Uniform behavior with other node types. |
| Double-click a bridge node | Existing `focus` mode behavior (no change). |
| Toggle a family or color pill | Bridges recompute with the new filter applied. A bridge whose only reach-to-deck is via a filtered-off family/color disappears. |

Bridge nodes are styled distinctly from deck and candidate nodes:

- **Bridge node:** same radius formula as candidates (radius derived from edge count), **dashed neutral stroke** (`strokeDasharray="3 2"`, stroke `#3a3a3a`). Label color matches candidates.
- **Bridge edges** (selected↔bridge and bridge↔deck): dominant-family color and width formula match base edges, but rendered **dashed** (`strokeDasharray="4 3"`).
- **Bridge↔deck opacity:** these edges are not incident to the selected node, so the existing "non-incident edges dim to 0.25" rule would hide them. Override to 0.75 — they are the entire point of the expansion.

The `SelectionDrawer`'s "Connected cards" list includes bridges (because they are incident to the selected node). Each bridge neighbor row gets a small badge distinguishing it from a base candidate (e.g. dashed dot or a "via deck" marker), so the user can tell that a row represents a card pulled in by the expansion rather than a top-50 candidate.

The `SelectionDrawer`'s "Connects to N nodes · M cards in your deck" summary continues to count only edges of the selected node. Bridge↔deck edges are not edges of the selected node, so they do not inflate the summary.

## Architecture

Composable wrapper around the existing `buildDeckGraph` / `buildFocusedGraph` builders. The base graph is built unchanged; a new pure function `expandWithBridges` takes that output and a selected oracle id and returns an augmented `GraphOutput`.

Selection state lives in `DeckGraphPage` (existing). When `selectedOracleId` is non-null, `DeckGraphPage` memoizes the expanded graph and passes it to `GraphCanvas` and (transitively, via incident-edges derivation) to `SelectionDrawer`. When `selectedOracleId` is null, the base graph is passed unchanged.

This approach was chosen over (a) inlining bridge logic in `buildDeckGraph` (couples builder to UI selection state) and (b) a parallel overlay layer in `GraphCanvas` with mid-simulation node insertion (significantly more d3-simulation work for a small "no reflow" UX gain — and reflow on selection change is acceptable, since base graph reflow already happens on filter change).

### Type changes (`app/src/lib/deckGraph.ts`)

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

`kind: 'bridge'` tags any edge introduced by `expandWithBridges`. Both the selected↔bridge edge and the bridge↔deck edge get `kind: 'bridge'`. Base graph edges keep `kind: 'base'`. All existing edges built by `buildDeckGraph` are tagged `'base'` at construction time.

### `expandWithBridges` (new pure function)

```ts
const MAX_BRIDGES = 20;

export type BridgeExpansionInput = {
  base: GraphOutput;
  selectedId: string;
  deckOracleIds: Set<string>;
  cards: Map<string, Card>;
  outbound: Map<string, InteractionEdge[]>;
  inbound: Map<string, InteractionEdge[]>;
  filters: FilterState;
};

export function expandWithBridges(input: BridgeExpansionInput): GraphOutput;
```

**Algorithm:**

1. `baseNodeIds = Set(base.nodes.map(n => n.id))`. If `selectedId` is not in `baseNodeIds`, return `base` unchanged (defensive against transient state where selection survives a filter change).
2. Walk `outbound.get(selectedId) ∪ inbound.get(selectedId)`. For each edge whose family passes `filters.offFamilies`, collect the *other* endpoint as a candidate bridge id, excluding:
   - `selectedId` itself (self-loops),
   - anything in `baseNodeIds` (already shown),
   - anything in `deckOracleIds` (deck cards belong to the base graph by construction).
3. For each candidate bridge id, check its `outbound` ∪ `inbound` for at least one edge whose other endpoint is in `deckOracleIds` (≠ `selectedId` if selected is a deck card) and whose family passes `filters.offFamilies`. Also check `colorAllowed(bridgeCard, filters.onColors)`. Drop bridges that fail any check.
4. For each surviving bridge id, aggregate two pair-keyed edge accumulators using the same `pairKey` + `byFamily` pattern as `buildDeckGraph`:
   - **selected↔bridge** (always at least one — that's what made it a candidate),
   - **bridge↔deck** (one entry per reached deck card, filtered to allowed families).
5. Rank surviving bridges by the **summed weight of their bridge↔deck edges** (more deck-reach = more interesting). Tiebreak: bridge card name, ascending. Take top `MAX_BRIDGES`.
6. Construct `GraphNode` entries for the surviving bridges (`cls: 'bridge'`, `radius` computed via the existing `radiusFor` on total incident bridge-edge count).
7. Construct `GraphEdge` entries (`kind: 'bridge'`) for the selected↔bridge and bridge↔deck pairs of surviving bridges, following the dominant-family / breakdown / weight conventions already used by `buildDeckGraph`.
8. Return `{ nodes: [...base.nodes, ...bridgeNodes], edges: [...base.edges, ...bridgeEdges] }`.

**Determinism:** ranking ties broken by card name keeps the output stable across re-renders.

### `DeckGraphPage` wiring

```ts
const expandedGraph = useMemo(() => {
  if (!selectedOracleId) return graph;
  return expandWithBridges({
    base: graph,
    selectedId: selectedOracleId,
    deckOracleIds: new Set(refreshedDeckIds),
    cards, outbound, inbound, filters,
  });
}, [graph, selectedOracleId, refreshedDeckIds, cards, outbound, inbound, filters]);
```

Pass `expandedGraph` to `GraphCanvas`. The existing `selectedNode` and `incidentEdges` memos move to compute off `expandedGraph` rather than `graph` so the drawer naturally surfaces bridge neighbors. The existing `useEffect` that clears `selectedOracleId` when it disappears from the graph continues to operate against `expandedGraph` (which is a superset of `graph` while a selection exists — so the effect only fires when selection points to a node missing from the base graph, which is the same condition as today).

`presentFamilies` and `familyEdgeCounts` continue to derive from `graph` (the base), not `expandedGraph` — the pill row should describe the base graph's family distribution, not the transient expansion.

### `GraphCanvas` rendering

- Node `<circle>` rendering: read `n.cls`. If `'bridge'`, use stroke `#3a3a3a` with `strokeDasharray="3 2"`; otherwise existing deck/candidate logic.
- Edge `<line>` rendering: read `e.kind`. If `'bridge'`, set `strokeDasharray="4 3"`. The incident-edge opacity rule changes: bridge↔deck edges (kind === 'bridge' AND neither endpoint is the selected node) get opacity 0.75 instead of 0.25. All other edges use the existing rule.
- Click and double-click handlers on `<g data-node-id>` are unchanged — they already operate uniformly on any node.
- The d3 simulation in `useDeckGraphSimulation` consumes `expandedGraph` as a single graph; no special handling needed for the bridge subset. Reflow on selection change is expected and consistent with reflow on filter change.

### `SelectionDrawer` changes

- `neighborStats` already returns one `NeighborStat` per incident edge of the selected node. Extend `NeighborStat` to carry `cls: GraphNodeCls` of the neighbor, populated inside `neighborStats` by looking up the neighbor's oracle id in a `nodesById` map derived from the expanded graph (passed as a new argument). The call site in `SelectionDrawer` builds and passes the map.
- `CardListRow`'s `rightSlot` (currently `NeighborBadges`) renders a small bridge indicator before the family pills when the neighbor's `cls === 'bridge'` — a dashed circle outline at the same size as the family pill dots. Tooltip: `"Bridge: reachable via the selected card"`.
- "Connects to N nodes · M cards in your deck" summary logic is unchanged. It counts deck-incident edges *of the selected node*. Bridge↔deck edges are not edges of the selected node and do not contribute.

### `PillRow` changes

None. The existing filters apply through `filters` passed into `expandWithBridges`.

## Testing

### Unit (`app/src/lib/deckGraph.test.ts`)

New `describe('expandWithBridges', ...)` block:

1. **Happy path** — selected candidate X has off-canvas neighbor Y; Y connects to deck card D. Assert Y appears as a `cls: 'bridge'` node, and both selected↔Y and Y↔D edges exist with `kind: 'bridge'`.
2. **No reach** — X's neighbor Z connects to nothing in the deck → Z excluded.
3. **Already on canvas** — X's neighbor is already a top-50 candidate in `base.nodes` → no duplicate node added; no extra edges.
4. **Cap enforced** — construct 30 valid bridges → exactly 20 returned, ranked by summed bridge↔deck weight (test asserts the top-20 weight set).
5. **Filter respected (family)** — bridge whose only reach-to-deck is via a filtered-off family is excluded; a bridge that retains reach via an allowed family stays but its filtered-off edges don't appear.
6. **Filter respected (color)** — colorless bridge with `'C'` toggled off is excluded.
7. **Selected is a deck card** — bridges are non-deck neighbors of the selected deck card that connect back to *other* deck cards (the selected card doesn't count as its own deck-reach target).
8. **Selection absent from graph** — `selectedId` not in `base.nodes` → returns `base` unchanged.
9. **Determinism** — same inputs produce the same output node order (name tiebreak).

### Component

- `GraphCanvas.test.tsx`: render a graph including a bridge node; assert the bridge node's `<circle>` has `strokeDasharray="3 2"`. Assert a bridge↔deck edge `<line>` has `strokeDasharray="4 3"` and the higher opacity.
- `SelectionDrawer.test.tsx`: render with one base-candidate neighbor and one bridge neighbor; assert the bridge row contains the bridge indicator and the candidate row does not.

### E2E (`app/tests/e2e/deck-graph.spec.ts`)

One smoke test: load a fixture deck whose graph yields at least one bridge candidate; click the originating card; assert at least one node with dashed stroke renders; click empty canvas; assert no dashed nodes remain.

## Rollout

- No artifact changes; no `RULE_VERSION` bump.
- No persistence; no migration.
- Purely additive UI behavior behind selection state. No feature flag.

## Open questions

None at design time. All clarifications resolved in the brainstorming conversation.
