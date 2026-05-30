# Deck Graph Visualization — Design

**Date:** 2026-05-24
**Status:** Draft
**Target release:** v0.9 (post v0.8 typed-permanent split)

## Summary

A force-directed graph view of an active deck plus its strongest non-deck candidates, accessible at `/deck/:id/graph`. Edges are colored by mechanic family and weighted by interaction count. Family and color pills at the top let the user filter; toggling a pill re-ranks the candidate pool and reflows the graph. Clicking a node opens a side drawer that exposes a single "Add to deck" or "Remove" button — the only path for deck mutation, by design.

The widget targets two deck-building activities at once: discovering high-synergy cards to add, and auditing how the cards already in the deck connect to each other.

## Goals

- Show, in a single view, both the deck's internal synergy and the strongest external candidates for inclusion.
- Make mechanic-level structure visible at a glance via edge color and weight.
- Let the user interactively narrow scope by mechanic family or by mana color, with the graph recomposing in response.
- Provide a safe (no fat-finger) path to mutate the deck from within the graph.

## Non-goals (v1)

- Candidate↔candidate edges in the rendered graph (deck↔* only).
- Group/cluster bubble nodes ("+12 more").
- Right-click or hover-based +/− shortcuts.
- Candidate-count slider in the UI.
- Persisting graph layout between page visits.
- Touch / mobile-first interaction.
- Multi-deck overlays.

## User flows

### Flow A — Discover candidates

1. User is on `/deck/:id` (DeckPage). Clicks the **Graph** segment in the page header.
2. Lands on `/deck/:id/graph`. Sees their 47 deck cards ringed in amber plus 50 candidate cards arranged by mechanic affinity.
3. Notices a cluster of orange (Lifegain) edges pulling toward several Lifegain payoffs they don't have. Clicks one — the right drawer opens.
4. Reads the card's connections to their deck. Clicks **Add to deck**. The node gains an amber ring and is now a deck member. Other candidates are *not* re-ranked — the rest of the graph stays put. When ready for a fresh round of suggestions, the user clicks **Refresh suggestions** in the pill row; the candidate pool is recomputed against the new deck.

### Flow B — Audit internal synergy

1. User toggles off every candidate color except the deck's identity (B and G for a Golgari deck), filters to a single family (say, Resources). Sees only the in-deck cards plus their internal resource connections.
2. A creature with no edges to anything sits alone in a corner. They click it, read the drawer, decide it doesn't earn its slot, and click **Remove one copy**.

### Flow C — Card focus drill-in

1. User double-clicks a node (in or out of deck). View switches to focus mode; that card and its 1-hop neighborhood are centered. A focused-card chip appears in the pill row with an × to return.
2. Or: user toggles **Card focus** mode in the pill row, then picks a card from the deck panel overlay.

## Architecture

### Routing

- New route: `/deck/:id/graph` rendered by `DeckGraphPage.tsx` (sibling of `DeckPage`, not nested).
- The existing `DeckPage` gets a segmented `List` / `Graph` control in its header; the `Graph` segment navigates to the new route. The graph page has the inverse control.
- Both pages share the deck-name header. The graph page does **not** mount `DeckPanel` by default — a collapsed `<deckname> · <count> cards` pill in the header pops `DeckPanel` as an overlay drawer on click.
- Empty-deck case: render a "Pick a card from the browser to start exploring" CTA instead of mounting the canvas.

### Data flow

```
graphStore (read-only) ──┐
deckStore (active deck) ─┼──► buildDeckGraph(deck, store, filters)
local filter state ──────┘            │
                                      ▼
                       { nodes, edges } (memoized)
                                      │
                                      ▼
                            <GraphCanvas /> ── d3-force simulation
                                      │
                                      ▼
                              onSelect(oracleId)
                                      │
                                      ▼
                          <SelectionDrawer /> ── deckStore.add/remove
```

`buildDeckGraph` is a pure function in `app/src/lib/deckGraph.ts`. It is memoized in `DeckGraphPage` on the key `(deckId, lastRefreshedDeckHash, filtersKey, mode, focusOracleId)`, where `lastRefreshedDeckHash` is the sorted-oracleId hash of the deck *at the time of the last refresh*. Live deck mutations update a separate `pendingMutationCount` for the Refresh button badge but do NOT invalidate the memo key, preserving the "mutations don't re-rank" policy. The d3-force simulation owns node positions in a ref; React renders only on selection, hover, or topology change.

### Mechanic families

A small static map at `app/src/lib/tagFamilies.ts` buckets the ~91 tag ids in `tagCatalog` into **~12 visual families**, each with `{ id, label, color }`. Derived from the v0.7 11-family implementer split, with Removal subdivided into three:

| Family ID | Label | Color (hex) |
|---|---|---|
| `destruction` | Destruction | `#ef4444` red |
| `counter-magic` | Counter-magic | `#a855f7` purple |
| `bounce-blink` | Bounce / Blink | `#06b6d4` cyan |
| `resources` | Resources (ramp, tokens) | `#22c55e` green |
| `tribes` | Tribes | `#ec4899` pink |
| `spellslinger` | Spellslinger | `#0ea5e9` sky |
| `card-selection` | Card Selection | `#eab308` yellow |
| `tap-untap-steal` | Tap/Untap & Steal/Copy | `#84cc16` lime |
| `lifegain` | Lifegain | `#f97316` orange |
| `themes` | Archetype Themes | `#a3a3a3` gray |
| `set-mechanics` | Set Mechanics | `#14b8a6` teal |
| `keywords` | Keyword Properties | `#64748b` slate |

A catalog-consistency unit test enforces that every tag id in `tagCatalog` resolves to a family — no orphans. The mapping ships hand-authored; future tags require a `tagFamilies.ts` entry alongside the rule (`pipeline/rules/aggregator.ts`-level auto-discovery is not extended for this; the mapping is an app-side concern).

### Candidate scoring

For each non-deck card `c`:

```
familyScore(f, c) = weight(f, edgeCountInFamilyF) * breadthBonus(distinctDeckCardsInFamilyF)
score(c)          = Σ over families f of familyScore(f, c)        // only over toggled-on families

weight(f, n)        = 1 + 0.3 * (n - 1)        // n ≥ 1; diminishing returns on multiplicity
breadthBonus(k)     = 1 + 0.2 * (k - 1)        // k ≥ 1; reward edges spread across more deck cards
```

A family pill toggled **off** contributes 0. The **color filter** applies as a hard pre-filter (Option B in design discussion): `score(c) = 0` unless `c.colorIdentity ⊆ toggledOnColors`. Pills are auto-initialized to the active deck's color identity (off for colors the deck doesn't already touch) so a Sultai (B/U/G) deck opens with W and R off by default.

Top `MAX_CANDIDATES = 50` candidates by `score` (descending) enter the rendered graph.

The `0.3` and `0.2` constants are starting points, tuned in implementation. Both diminishing-returns weighting and breadth bonus are sub-linear so a "hot" pair of cards with many edges doesn't crowd out a card bridging multiple deck members.

### Mutation vs filter re-ranking

To keep the graph visually stable through deck-building, **mutations do not re-rank candidates.** Adding a card promotes it from candidate-class to deck-member-class in place (gains the amber ring, scoring weight changes only for the displayed edge widths). Removing a card demotes a deck member to candidate-class in place if it still has any edges to the (remaining) deck, otherwise removes it from the graph.

A new card never "appears" as a result of a mutation. Re-ranking — picking the next top-50 candidates against the now-current deck — runs only when:
1. The user clicks **Refresh suggestions** in the pill row.
2. The user toggles a family or color pill.
3. The user switches between deck mode and card focus mode.
4. The active deck is changed externally (e.g. user picks a different deck).

The Refresh button shows a small badge with the count of pending changes (`+3` cards added since last refresh) so the user knows there's new state to see.

### Rendering

- **Tech:** SVG nodes/edges with React for the DOM; `d3-force` for the simulation only. Standard React + d3-force pattern: d3 mutates `x/y` on nodes in place each tick; a `requestAnimationFrame` loop copies positions into SVG `transform` attributes via direct DOM refs (no React re-render per tick). React re-renders only on selection, hover, or topology change.
- **Why SVG over canvas:** at the 120-node ceiling, SVG is fine and keeps hit-testing/dragging trivial.
- **Node visuals:** circle, radius scaled by edge-count-to-deck (clamped). Deck members get a thin amber stroke; candidates get a neutral stroke. Selected node gets a colored stroke + halo. Background of each circle holds a small thumbnail of the card image, masked to the circle.
- **Edge visuals (v1):** straight line, one per `(source, target)` pair. When the pair has edges in multiple families, the line is drawn in the **dominant family's color** (the family with the highest `familyScore` contribution to that pair), and its width sums across families: `stroke-width = 1 + sqrt(totalEdgeCount - 1)`. A small ring marker at the line's midpoint indicates a multi-family pair (single ring = 2 families, double = 3+). The full per-family breakdown is shown in the selection drawer when either endpoint is selected. Non-selected edges sit at 25% opacity; on selection or hover of an incident node they go to full opacity. Parallel-offset rendering for multi-family pairs is deferred to v2 (geometric complexity not worth v1 risk).
- **Force config:** `forceLink(...).distance(d => 80 / Math.sqrt(d.weight))`, `forceManyBody().strength(-180)`, `forceCenter()` at canvas midpoint, `forceCollide(d => d.r + 4)`. `alphaDecay(0.05)` so it settles in ~2s.
- **Stability under filter changes:** topology change reheats with `alpha(0.3).restart()` rather than rebuilding the simulation. Surviving nodes keep `x/y` and pinned state; new nodes spawn at the centroid of their connected deck nodes; removed nodes disappear.
- **Zoom/pan:** `d3-zoom` with extent `[0.4, 3]`. Drag on background pans; drag on a node pins it via `fx/fy`. Double-click on background un-pins all.

### Components (all new, under `app/src/components/deckGraph/`)

1. **`DeckGraphPage.tsx`** — route component. Owns local UI state: `filters` (sets of toggled-off family ids and color ids), `mode: 'deck' | 'focus'`, `focusOracleId: string | null`, `selectedOracleId: string | null`. Pulls deck via `useActiveDeck()` and graph data via `useGraphStore()`. Memoizes `buildDeckGraph(...)` and passes the result down.

2. **`PillRow.tsx`** — sticky pill bar with four groups:
   - **Mode** — segmented control (Deck / Card focus). In focus mode shows a chip with the focused card name + `×` to exit.
   - **Families** — one pill per family present in the *last-refreshed* graph. Off-state: dim + strike-through. Tiny color swatch left of the label.
   - **Colors** — five `<ManaSymbol>`-styled pip buttons. On first mount, pills are auto-initialized to the deck's color identity (off for colors the deck doesn't touch).
   - **Refresh suggestions** — a primary button on the far right, with a `+N` badge counting deck mutations since the last refresh. Disabled when count = 0.

3. **`GraphCanvas.tsx`** — SVG renderer. Pure presentational: takes `{nodes, edges, selectedId, onSelect, onFocus}`. Owns the d3-force simulation via `useDeckGraphSimulation`.

4. **`SelectionDrawer.tsx`** — right-side slide-in (width 320px), same Tailwind transition as `CardDetailDrawer`. Shows: card image (reuses `HoverCardPreview` styling), mana cost (`<ManaCost>`), type line, "Connects to N cards in your deck" with reasons grouped by family. Bottom: a primary button:
   - Candidate → **+ Add to deck**
   - Deck member → **Remove one copy** + a secondary **Remove all copies** that requires `<ConfirmModal>`.

   Closes on `Esc`, `×`, or when the selected node leaves the graph (e.g. last copy removed and the card drops off the candidate list).

5. **`useDeckGraphSimulation.ts`** — hook wrapping d3-force lifecycle. Manages init, restart on topology change, position ref, cleanup. Extracted so `GraphCanvas` stays readable and the simulation is unit-testable against a fake clock.

### Pure logic modules (under `app/src/lib/`)

- **`tagFamilies.ts`** — the `tagId → FamilyDef` map plus `FAMILIES: FamilyDef[]`.
- **`deckGraph.ts`** — `buildDeckGraph(deck, graphStore, filters)` and `buildFocusedGraph(focusId, graphStore, filters)`. Pure, no React imports.

## Performance budget

- **Node cap:** 120 visible (60 deck + 60 candidates max). `MAX_CANDIDATES` default 50.
- **`buildDeckGraph` cost:** O(deck cards × avg neighbors per card). 60 × ~40 ≈ 2.4k edge traversals. Sub-millisecond, memoized.
- **Simulation:** ~60fps for 120 nodes, settles in ~2s, idles when `alpha < alphaMin`. Verified via React DevTools profiler before merge — React must not re-render per tick.

## Testing

Same TDD shape as the rest of the app — vitest for pure modules and components, no e2e additions for v1.

- **`tagFamilies.test.ts`** — every `tagId` in `tagCatalog` resolves to a family; no orphans (run via `pipeline/test-setup.ts`'s warmed catalog).
- **`deckGraph.test.ts`** — fixture decks → asserts on `{nodes, edges}`. Cases: empty deck, single-card deck, mono-removal deck (asserts diminishing-returns is sub-linear in same-family edge count), multi-family deck. Filter cases: one family off / one color off / both — drops the expected nodes and re-ranks. Breadth-bonus case: a card with 1 edge to each of 3 deck members outscores a card with 3 edges to a single deck member when family weights tie. Color filter case: a B/U/G card is excluded when Blue is toggled off (Option B strict-subset behavior).
- **`useDeckGraphSimulation.test.ts`** — with fake timers: topology change reheats; surviving nodes keep `x/y`; new nodes spawn at the centroid of their connected deck nodes.
- **`PillRow.test.tsx`** — toggling a pill calls the right callback; off-state has expected aria attrs; only families present in the last-refreshed graph render; Refresh button disables when `pendingMutationCount = 0` and shows `+N` badge when > 0; colors auto-init from deck color identity on first mount.
- **`SelectionDrawer.test.tsx`** — candidate selection shows "Add to deck"; deck-member selection shows remove controls; "Remove all" requires confirmation.

## Edge cases

- **Empty deck:** placeholder CTA, no canvas mount, no simulation.
- **Deck has cards not in `graphStore`** (unknown printing): skipped in graph computation; surfaced as a small "N cards not visualized" banner at the top of the canvas.
- **Vanilla card with zero edges:** rendered as a floating deck node with no incident edges; positioned by `forceCenter` + `forceCollide`.
- **All families filtered off:** empty canvas + "No edges match the current filters" message. Pills remain interactive.
- **Selected node leaves the graph mid-session** (last copy removed): drawer auto-closes.
- **Browser back from focus mode:** the focused-card chip's `×` and the URL back-button both return to deck mode without leaving the page.

## Dependencies

- `d3-force` (~30 KB) — new dependency.
- `d3-zoom` (~25 KB) — new dependency.
- No new fonts, no new images.

## Open questions

None blocking. The scoring constants (`0.3` diminishing-returns factor, `0.2` breadth bonus) and the exact node-radius scaling formula are tunable during implementation; spec values are starting points.

## Out-of-scope follow-ups

- Candidate↔candidate edges (toggle).
- Group/cluster bubble nodes ("+12 more sacrifice synergies").
- Hover +/− controls and right-click shortcuts (for users who graduate past the drawer).
- Slider for `MAX_CANDIDATES`.
- Layout persistence across page visits.
- Touch input.
- Multi-deck overlays for comparison.
- Parallel-offset rendering for multi-family edges (v1 uses dominant-family single line + midpoint ring marker).
- Drag-vs-click pixel threshold tuning (v1: a click that moves more than ~3px is treated as a drag; specific UX polish deferred).
- Soft color filter (Option C — off-color score penalty rather than hard exclusion).
