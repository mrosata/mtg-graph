# Deck Graph Viz — Manual Test Spec

**For:** `/deck/graph` route (DeckGraphPage).
**Implementation:** [plan](../plans/2026-05-24-deck-graph-viz.md) · [design](./2026-05-24-deck-graph-viz-design.md)
**Purpose:** Human-runnable smoke tests, structured so each case can later be lifted into a Playwright spec at `app/tests/e2e/deck-graph.spec.ts`. Each case names stable selectors (test IDs, ARIA roles, exact text) — those are the contracts the future spec will assert on.

**Test environment:**
- Dev server at `http://localhost:5173`
- Artifact present: `app/public/data/cards-standard.json` (run `npm run build:cards -- --standard` if absent)
- Reset state before suite: open browser devtools → Application → IndexedDB → delete `mtg-graph` database. Reload.

**Selector conventions used below:**
- `role:button name:"Add to deck"` — ARIA role + accessible name (Playwright: `getByRole('button', { name: 'Add to deck' })`)
- `testid:graph-canvas` — `data-testid` attribute (Playwright: `getByTestId('graph-canvas')`)
- `text:"Refresh suggestions"` — visible text match (Playwright: `getByText('Refresh suggestions')`)
- `selector:[data-node-id="<oracleId>"]` — raw CSS, for graph SVG node lookup
- `selector:[data-edge]` — raw CSS for edge `<line>` elements
- `selector:[data-edge-multimark]` — multi-family marker circle

---

## Suite 1 — Empty state

### 1.1 No active deck → CTA

**Preconditions:** No deck exists (fresh IndexedDB).

**Steps:**
1. Navigate to `http://localhost:5173/deck/graph`.

**Expected:**
- Text "No active deck." visible.
- Link with text "Pick or create one" visible, pointing to `/decks`.
- No canvas, no pill row.

**Selectors:**
- Assertion: `text:"No active deck."`
- Assertion: `role:link name:"Pick or create one"` has `href="/decks"`

---

### 1.2 Empty active deck → CTA

**Preconditions:** Create a deck named "Empty Test" via `/decks`. Don't add any cards.

**Steps:**
1. Navigate to `/deck/graph`.

**Expected:**
- Text "Empty Test is empty." visible.
- Link "Pick a card from the browser to start exploring" visible, pointing to `/`.

**Selectors:**
- Assertion: `text:/Empty Test is empty/`
- Assertion: `role:link name:/Pick a card from the browser/` has `href="/"`

---

## Suite 2 — Initial render with a populated deck

**Suite preconditions for cases 2.x and 3.x and 4.x:** Build a small Sultai-leaning test deck of ~10 cards with mixed mechanics. From `/`, search for and add 1 copy each of:
- Sheoldred, the Apocalypse (lifegain payoff)
- Bloodletter of Aclazotz (lifegain trigger)
- Cultivate (ramp)
- Llanowar Elves (ramp)
- Doom Blade or similar destroy-creature (destruction)
- Counterspell (counter-magic) — if absent in Standard, substitute any U counter
- Frantic Search (card selection)
- Liliana of the Veil (graveyard / themes)
- Reanimate-type creature (themes)
- Any vanilla creature

Confirm the active deck is set, then navigate to `/deck/graph`.

### 2.1 Page chrome renders

**Steps:** Land on `/deck/graph`.

**Expected:**
- Top-left: `← <deck name>` link to `/deck`.
- Top-right: segmented `List | Graph` with `Graph` highlighted (amber).
- Pill row visible below header with sections: Mode, Families, Colors, Refresh.
- Canvas visible below pill row.

**Selectors:**
- Assertion: `role:link name:/← /` (back to deck)
- Assertion: `text:"List"` is a `role:link` with `href="/deck"`
- Assertion: `text:"Graph"` exists but is NOT a link (current page indicator)
- Assertion: `testid:graph-canvas` visible
- Assertion: `role:button name:"Refresh suggestions"` exists, disabled

---

### 2.2 Color pills auto-init from deck identity

**Preconditions:** Sultai deck (B/U/G).

**Steps:** Land on `/deck/graph`.

**Expected:**
- B, U, G color pills are `aria-pressed="true"`.
- W, R color pills are `aria-pressed="false"`.

**Selectors:**
- Assertion: `role:button name:"Black"` has `aria-pressed="true"`
- Assertion: `role:button name:"Blue"` has `aria-pressed="true"`
- Assertion: `role:button name:"Green"` has `aria-pressed="true"`
- Assertion: `role:button name:"White"` has `aria-pressed="false"`
- Assertion: `role:button name:"Red"` has `aria-pressed="false"`

---

### 2.3 Family pills only show present families

**Steps:** Land on `/deck/graph`.

**Expected:**
- Family pills render for at least: Destruction, Resources, Card Selection, Lifegain, Themes.
- Family pills do NOT render for families with zero edges in the graph (e.g. Set Mechanics, Tribes — unless your deck happens to include those).
- Each present-family pill has a count badge (`·N`).

**Selectors:**
- Assertion: `role:button name:/Destruction/` exists
- Assertion: `role:button name:/Resources/` exists
- Assertion: text inside Destruction pill matches `/·\d+/`

---

### 2.4 Deck nodes have amber stroke, candidates do not

**Steps:** Land on `/deck/graph`. Inspect SVG nodes via devtools.

**Expected:**
- Nodes for cards in deck (e.g. Sheoldred) have `circle stroke="#fbbf24"`.
- Nodes for candidates have `circle stroke="#3a3a3a"`.

**Selectors:**
- Assertion: `[data-node-id="<oracleId-of-Sheoldred>"] circle` has `stroke="#fbbf24"`
- Pick any node ID not in your deck list. Assertion: that node's circle has `stroke="#3a3a3a"`.

---

### 2.5 Edges colored by dominant family

**Steps:** Land on `/deck/graph`. Inspect at least 3 edges in devtools.

**Expected:**
- Each `line[data-edge]` has a `stroke` matching one of the family hex colors from `tagFamilies.ts` (e.g. `#ef4444`, `#22c55e`, `#f97316`).
- Edges incident to a hot card (e.g. Sheoldred with lifegain connections) include orange (`#f97316`) lines.

**Selectors:**
- Assertion: `[data-edge]` count > 0
- Assertion: at least one edge has `stroke="#f97316"` (lifegain)

---

### 2.6 Multi-family edge marker

**Steps:** Land on `/deck/graph`. Look for `[data-edge-multimark]` elements in devtools.

**Expected:**
- If any pair has edges in 2+ families (likely for Sheoldred ↔ Bloodletter), at least one `[data-edge-multimark]` circle exists near the midpoint of that edge.

**Selectors:**
- Assertion (conditional on multi-family edge existing): `[data-edge-multimark]` count ≥ 1

---

## Suite 3 — Interactivity

### 3.1 Click candidate → drawer opens

**Steps:**
1. Land on `/deck/graph`.
2. Click any candidate node (no amber ring).

**Expected:**
- Right-side drawer slides in (width ~320px).
- Drawer header: small caption "Selected · candidate" + card name.
- Card image, mana cost, type line all visible.
- "Connects to N cards in your deck" with at least one family swatch listed.
- Primary button: "+ Add to deck".

**Selectors:**
- Action: click `[data-node-id="<oracleId>"]`
- Assertion: `text:"Selected · candidate"` visible
- Assertion: `role:heading name:/<card name>/` visible
- Assertion: `role:img name:/<card name>/` has non-empty `src`
- Assertion: `role:button name:/Add to deck/` visible

---

### 3.2 Click deck member → drawer shows remove controls

**Steps:**
1. Land on `/deck/graph`.
2. Click a node that's in the deck (amber ring), e.g. Sheoldred.

**Expected:**
- Drawer caption: "Selected · in deck".
- Primary button: "Remove one copy (1 in deck)".
- If `deckCount > 1`, secondary button "Remove all copies" also visible.

**Selectors:**
- Action: click `[data-node-id="<oracleId-of-Sheoldred>"]`
- Assertion: `text:"Selected · in deck"` visible
- Assertion: `role:button name:/Remove one copy/` visible

---

### 3.3 Add to deck — mutation lands, candidate stays put

**Steps:**
1. Note the position of 5 candidate nodes near a specific reference (e.g. the top edge).
2. Click a candidate node; drawer opens.
3. Click "+ Add to deck".

**Expected:**
- That candidate's node gains an amber stroke (now classified as deck member).
- Other candidates' positions do not jump or shuffle (only the clicked node's class changes).
- The "Refresh suggestions" button now shows `+1` badge and is enabled.
- The deck-card count in the page header increments (was N, now N+1).

**Selectors:**
- Action: click `[data-node-id="<targetId>"]` then click `role:button name:/Add to deck/`
- Assertion: `[data-node-id="<targetId>"] circle` now has `stroke="#fbbf24"`
- Assertion: `role:button name:"Refresh suggestions"` is no longer disabled and contains `text:"+1"`

---

### 3.4 Refresh suggestions — resets badge and brings in next candidates

**Steps (continuation of 3.3):**
1. With `+1` badge showing, click "Refresh suggestions".

**Expected:**
- Badge disappears; Refresh button becomes disabled again.
- A new candidate fills the slot that was vacated by the promotion.
- The newly-added deck node remains visible (still amber-ringed).

**Selectors:**
- Action: click `role:button name:"Refresh suggestions"`
- Assertion: `role:button name:"Refresh suggestions"` is now `disabled`
- Assertion: total node count in `[data-node-id]` matches `deckCount + 50` (or `deckCount` if pool < 50)

---

### 3.5 Remove one copy — deck member becomes candidate

**Steps:**
1. Click a deck member node (e.g. Cultivate, count = 1).
2. In drawer, click "Remove one copy".

**Expected:**
- Node's amber stroke is removed (now neutral).
- Drawer either stays open showing the node as a candidate, OR auto-closes if the node has no incident edges to any remaining deck card.
- Refresh badge shows `+1`.

**Selectors:**
- Action: click `[data-node-id="<oracleId>"]` then `role:button name:/Remove one copy/`
- Assertion: `role:button name:"Refresh suggestions"` text matches `/\+1/`

---

### 3.6 Remove all copies — requires confirmation

**Preconditions:** Have a card with count ≥ 2 in the deck. If you don't, add a second copy first via Browser page.

**Steps:**
1. Click the deck node for that card.
2. Click "Remove all copies".

**Expected:**
- A `role:dialog` appears with title "Remove all copies?".
- Cancel button keeps card in deck.
- Confirm button (labeled "Remove") removes all copies.

**Selectors:**
- Action: click `role:button name:"Remove all copies"`
- Assertion: `role:dialog` visible
- Action: click `role:button name:"Remove"`
- Assertion: `role:dialog` no longer visible
- Assertion: corresponding `[data-node-id]` either has neutral stroke or is no longer in the DOM

---

### 3.7 Drawer closes on Esc

**Steps:**
1. Open the drawer (click any node).
2. Press Escape.

**Expected:**
- Drawer is no longer visible.

**Selectors:**
- Action: click node, then press Escape
- Assertion: `text:"Selected · candidate"` and `text:"Selected · in deck"` both no longer visible

---

### 3.8 Drawer closes when selected node leaves the graph

**Steps:**
1. Click a deck member with deck count = 1 (will be promoted to candidate but probably stays if it has edges).
2. Toggle off every family pill so that node loses all incident edges and drops from the candidate pool.

**Expected:**
- Drawer auto-closes when the node's `[data-node-id]` disappears from the DOM.

**Selectors:**
- Setup: select a node, then click every present family pill to turn off.
- Assertion: drawer caption text no longer visible.

---

## Suite 4 — Filters

### 4.1 Toggle off a family — its edges and dependent candidates vanish

**Steps:**
1. Count current `[data-edge]` elements (note number).
2. Click the "Destruction" pill (turns off).

**Expected:**
- Destruction pill has `aria-pressed="false"` and visible strike-through.
- All red `[data-edge][stroke="#ef4444"]` lines disappear.
- Some candidates whose ONLY edges to the deck were destruction-family disappear from the canvas.
- Other pills still show their counts; non-destruction edges remain.

**Selectors:**
- Action: click `role:button name:/Destruction/`
- Assertion: `role:button name:/Destruction/` has `aria-pressed="false"`
- Assertion: count of `[data-edge][stroke="#ef4444"]` === 0
- Assertion: total `[data-edge]` count < previous total

---

### 4.2 Toggle off a color — cards containing that color drop out

**Steps:**
1. Note candidate count and IDs.
2. Click the "Blue" color pill (turns off).

**Expected:**
- Blue pill has `aria-pressed="false"`.
- Any candidate whose `colorIdentity` contains U is removed from canvas.
- Counts on family pills update if their edges were only via blue cards.

**Selectors:**
- Action: click `role:button name:"Blue"`
- Assertion: `role:button name:"Blue"` has `aria-pressed="false"`
- Assertion: every visible candidate node's underlying card has `colorIdentity` excluding U

---

### 4.3 Toggle all families off — empty-canvas message

**Steps:**
1. Click every active family pill until all are off.

**Expected:**
- Canvas area shows text "No edges match the current filters.".
- Pills remain interactive and on-screen so user can re-enable.

**Selectors:**
- Action: click each `role:button[aria-pressed="true"]` inside the family pill group
- Assertion: `text:/No edges match/` visible
- Assertion: family pill buttons still rendered (zero visible nodes is OK)

---

## Suite 5 — Mode toggle and card focus

### 5.1 Double-click a node → focus mode engages

**Steps:**
1. Land on `/deck/graph` (deck mode).
2. Double-click a node (deck or candidate), e.g. Sheoldred.

**Expected:**
- Mode pill switches to "Card focus" highlighted.
- A chip appears in the Mode group: card name + `×` button.
- Graph re-renders: only Sheoldred and its 1-hop neighbors are visible.
- Sheoldred is rendered with amber stroke (the focused card is the "deck" of size 1).

**Selectors:**
- Action: double-click `[data-node-id="<oracleId>"]`
- Assertion: `text:"Sheoldred, the Apocalypse"` (or whatever card) visible in the pill row chip
- Assertion: `role:button name:"Card focus"` has the active style (background color)
- Assertion: `[data-node-id]` count is small (1 + hop neighbors), not full deck

---

### 5.2 × on focus chip returns to deck mode

**Steps (continuation of 5.1):**
1. Click the `×` button in the focus chip.

**Expected:**
- Mode pill returns to "Deck" highlighted.
- Full deck graph re-renders.
- Focus chip disappears.

**Selectors:**
- Action: click `role:button name:"Clear focused card"`
- Assertion: `role:button name:"Deck"` is active
- Assertion: focus chip no longer visible

---

### 5.3 Mode toggle to "Card focus" with no focus set — no-op

**Steps:**
1. From deck mode (no focus), click "Card focus" mode button.

**Expected:**
- Mode pill shows "Card focus" active.
- Graph either remains the deck graph OR shows empty state. (Current implementation: deck graph remains since `focusOracleId === null`.)
- Behavior is acceptable as long as it doesn't crash. Double-click any node to enter actual focus.

---

## Suite 6 — Navigation

### 6.1 Back link returns to deck list view

**Steps:** Click `← <deck name>` link in header.

**Expected:** Navigates to `/deck` (DeckPage / List view).

**Selectors:**
- Action: click `role:link name:/← /`
- Assertion: URL pathname is `/deck`
- Assertion: `text:"List"` is the active segment, `text:"Graph"` is a link

---

### 6.2 List → Graph toggle from DeckPage

**Steps:**
1. Navigate to `/deck`.
2. In the top-right segmented control, click "Graph".

**Expected:** Navigates to `/deck/graph`.

**Selectors:**
- Action: click `role:link name:"Graph"`
- Assertion: URL pathname is `/deck/graph`

---

## Suite 7 — Zoom & pan

### 7.1 Scroll wheel zooms in/out

**Steps:**
1. Land on `/deck/graph`.
2. Hover the canvas, scroll wheel up (zoom in) then down (zoom out).

**Expected:**
- Graph scales smoothly under the cursor (zoom is anchored at cursor position).
- Scale clamps at minimum 0.4× and maximum 3×.
- Nodes/edges remain interactive at any scale (click still selects).

**Selectors / future Playwright contract:**
- Action: `page.locator('[data-testid="graph-canvas"]').dispatchEvent('wheel', { deltaY: -100 })`
- Assertion: `[data-layer="zoom-target"]` has a `transform` attribute matching `/translate\([\d.\-]+,[\d.\-]+\) scale\([\d.]+\)/` with scale > 1 after zoom-in.

---

### 7.2 Drag on empty space pans the graph

**Steps:**
1. Land on `/deck/graph`.
2. Click-and-drag on an empty area of the canvas (not on a node or edge).

**Expected:**
- Whole graph translates with the cursor.
- Nodes and edges move together — relative positions preserved.
- Releasing mouse leaves the graph at the new offset.

**Selectors / future Playwright contract:**
- Action: `page.mouse.move(x1, y1); page.mouse.down(); page.mouse.move(x2, y2); page.mouse.up()` where (x1, y1) is on empty canvas.
- Assertion: `[data-layer="zoom-target"]` `transform` `translate` values changed.

---

### 7.3 Drag on a node does NOT pan

**Steps:**
1. Click-and-drag on a node's circle.

**Expected:**
- The graph does NOT pan.
- The drag is either consumed silently (no pan, no node move) or — when not consumed — should cause a click-select on mouseup.
- This matches the design: drag-from-node is intentionally filtered out of the zoom behavior so the user can't accidentally pan while reaching for a node.

**Selectors / future Playwright contract:**
- Action: `page.locator('[data-node-id="<id>"]').dispatchEvent('mousedown'); page.mouse.move(...); page.mouse.up()`
- Assertion: `[data-layer="zoom-target"]` `transform` unchanged from baseline.

---

### 7.4 Double-click on a node does NOT zoom

**Steps:**
1. Double-click any node.

**Expected:**
- Focus mode engages (covered in Suite 5.1).
- The zoom transform does NOT change (default d3-zoom dblclick-to-zoom is disabled).

**Selectors / future Playwright contract:**
- Action: `page.locator('[data-node-id="<id>"]').dblclick()`
- Assertion: `[data-layer="zoom-target"]` `transform` scale unchanged.

---

### 7.5 Reset zoom button restores identity transform

**Steps:**
1. Zoom in via wheel a few times AND pan via drag.
2. Click the **Reset zoom** button (top-right of canvas).

**Expected:**
- Smooth 250ms animation back to scale 1, translate (0, 0).
- All nodes re-fit to their original positions in the viewport.

**Selectors / future Playwright contract:**
- Action: `page.getByRole('button', { name: 'Reset zoom' }).click()`
- Assertion (after 300ms wait): `[data-layer="zoom-target"]` `transform` attribute is empty / null / `translate(0,0) scale(1)`.

---

### 7.6 Nodes, labels, and edges stay visually constant as zoom changes

**Steps:**
1. Land on `/deck/graph`. Measure (visually or via devtools `getBoundingClientRect`) the on-screen diameter of any node and the rendered px-size of its label.
2. Zoom in (wheel up) until scale ≈ 2×.
3. Re-measure the same node and label.

**Expected:**
- Node circle's on-screen diameter is unchanged (within a pixel).
- Label font size is unchanged.
- Edge stroke widths are unchanged.
- Node *positions* DO move outward — the camera zoomed in on a sub-region — but each node and label remains crisp at its design size.
- Implementation reference: each node group has an inner `<g>` whose `transform` attribute is rewritten every RAF tick as `scale(1/zoom.k)`. Edge lines and marker circles use SVG `vector-effect="non-scaling-stroke"` so strokes don't widen with zoom.

**Selectors / future Playwright contract:**
- Baseline: `const baseRect = await page.locator('[data-node-id="<id>"] circle').boundingBox()`
- Action: `for (let i = 0; i < 5; i++) await page.locator('[data-testid="graph-canvas"]').dispatchEvent('wheel', { deltaY: -100 })` (or use `page.mouse.wheel`)
- Wait ~100ms for RAF to settle.
- Assertion: `const newRect = await page.locator('[data-node-id="<id>"] circle').boundingBox(); expect(Math.abs(newRect.width - baseRect.width)).toBeLessThan(2)`
- Assertion: `[data-layer="zoom-target"]` transform reflects a scale > 1 (zoom did happen)
- Assertion: any `[data-node-id] > g` inner element has `transform` matching `/scale\([\d.]+\)/` where the value < 1

---

## Suite 8 — URL state synchronization

### 8.1 Toggling a family pill pushes a URL state

**Steps:**
1. Land on `/deck/graph`. Note the URL (should have only `?colors=B,U,G` for a Sultai deck on first mount).
2. Click the "Destruction" family pill to turn it off.

**Expected:**
- URL gains an `off_fam=destruction` parameter (or appends to existing `off_fam` list).
- Browser back button reverts the toggle (Destruction pill becomes on again).
- Forward button re-applies.

**Selectors / future Playwright contract:**
- Action: click `role:button name:/Destruction/`
- Assertion: `page.url()` includes `off_fam=destruction`
- Action: `page.goBack()`
- Assertion: `role:button name:/Destruction/` has `aria-pressed="true"`
- Assertion: `page.url()` does NOT include `off_fam`

---

### 8.2 Toggling a color pill pushes a URL state

**Steps:**
1. Note current URL `colors=B,U,G`.
2. Click "Blue" pill to turn off.

**Expected:**
- URL updates to `colors=B,G` (or whatever the remaining set is).
- Back button restores Blue.

**Selectors / future Playwright contract:**
- Action: click `role:button name:"Blue"`
- Assertion: `page.url()` includes `colors=B,G`

---

### 8.3 Color identity auto-init writes to URL on first mount

**Preconditions:** Active deck is a Sultai (B/U/G) deck. Navigate away from `/deck/graph` (e.g., to `/decks`).

**Steps:**
1. Navigate to `/deck/graph` directly (no query string).

**Expected:**
- URL is rewritten via `replace` (NOT push) to include `?colors=B,U,G` (order may vary).
- Browser back goes to wherever you were before `/deck/graph` (not to a "no-filter" graph state) — this is by design, the auto-init uses replace so the default isn't a back-step.

**Selectors / future Playwright contract:**
- Setup: `page.goto('/decks'); await page.waitForLoadState();`
- Action: `page.goto('/deck/graph')`
- Assertion (after first effect runs): `page.url()` includes `colors=` with the B, U, G letters.

---

### 8.4 Explicit `colors=` param in URL overrides auto-init

**Steps:**
1. Navigate directly to `/deck/graph?colors=W` (with a Sultai deck active).

**Expected:**
- Only "White" color pill is `aria-pressed="true"`.
- B, U, G pills are off — the URL is authoritative, no auto-init overwrite.
- Graph likely shows fewer/no candidates because the Sultai deck has no W cards (most candidates will be filtered out).

**Selectors / future Playwright contract:**
- Action: `page.goto('/deck/graph?colors=W')`
- Assertion: `role:button name:"White"` has `aria-pressed="true"`
- Assertion: `role:button name:"Blue"` has `aria-pressed="false"`

---

### 8.5 Empty `colors=` means all-off

**Steps:**
1. Navigate to `/deck/graph?colors=`.

**Expected:**
- All color pills off (`aria-pressed="false"`).
- Graph shows no candidates (all filtered by color).

---

### 8.6 Double-click a node updates URL with `mode=focus&focus=<id>`

**Steps:**
1. From `/deck/graph` deck mode, double-click any node.

**Expected:**
- URL gains `mode=focus` and `focus=<oracleId>`.
- Browser back returns to deck mode (no focus chip).

**Selectors / future Playwright contract:**
- Action: `page.locator('[data-node-id="<id>"]').dblclick()`
- Assertion: `page.url()` includes both `mode=focus` and `focus=<id>`

---

### 8.7 Clearing focus removes URL params

**Steps (continuation of 8.6):**
1. Click the `×` on the focused card chip.

**Expected:**
- `mode` and `focus` params removed from URL.
- Back button returns to focused mode (push history).

---

### 8.8 URL is shareable / reload-safe

**Steps:**
1. Toggle filters and enter focus mode so the URL has multiple params.
2. Copy the URL.
3. Open a new tab, paste, navigate.

**Expected:**
- New tab loads with the same filter / focus state.
- Requires the same active deck to be set (deck id isn't in the URL); if no active deck, fallback CTA shows.

---

## Suite 9 — Browser history navigation (back / forward / reload)

This suite verifies the round-trip integrity of the URL ↔ filter state binding. Each filter toggle should produce exactly one back-step; back/forward should restore the exact prior visual state.

### 9.1 Back undoes a single filter toggle

**Preconditions:** Land on `/deck/graph` for a Sultai (B/U/G) deck. After auto-init, URL is `?colors=B,U,G`. No `off_fam` param.

**Steps:**
1. Click "Destruction" pill OFF.
2. Press browser Back.

**Expected:**
- After step 1: URL is `?colors=B,U,G&off_fam=destruction`; Destruction pill `aria-pressed="false"`.
- After step 2: URL is `?colors=B,U,G`; Destruction pill `aria-pressed="true"`; destruction edges visible again.

**Selectors / future Playwright contract:**
```
await page.locator('role=button[name="Refresh suggestions"]'); // ensure page settled
await page.getByRole('button', { name: /Destruction/ }).click();
expect(page.url()).toMatch(/off_fam=destruction/);
await page.goBack();
expect(page.url()).not.toMatch(/off_fam/);
await expect(page.getByRole('button', { name: /Destruction/ })).toHaveAttribute('aria-pressed', 'true');
```

---

### 9.2 Forward re-applies an undone toggle

**Steps (continuation of 9.1):**
1. From the state after Back (Destruction on), press browser Forward.

**Expected:**
- URL returns to `?colors=B,U,G&off_fam=destruction`; pill is off again.
- Graph state matches what it was after the original toggle (edges/nodes identical).

**Selectors / future Playwright contract:**
```
await page.goForward();
expect(page.url()).toMatch(/off_fam=destruction/);
await expect(page.getByRole('button', { name: /Destruction/ })).toHaveAttribute('aria-pressed', 'false');
```

---

### 9.3 Multi-step back through a sequence of toggles

**Preconditions:** Fresh `/deck/graph` for Sultai deck.

**Steps:**
1. Toggle Destruction OFF.   (URL has +off_fam=destruction)
2. Toggle Lifegain OFF.      (URL has +off_fam=destruction,lifegain)
3. Toggle Blue color OFF.    (URL has colors=B,G & off_fam=destruction,lifegain)
4. Press Back three times in succession.

**Expected:**
- Back #1: Blue pill ON again. URL has `colors=B,U,G` and `off_fam=destruction,lifegain`.
- Back #2: Lifegain pill ON again. URL has `colors=B,U,G` and `off_fam=destruction`.
- Back #3: Destruction pill ON again. URL has only `colors=B,U,G`.
- One more Back navigates away from `/deck/graph` (to whatever was before, e.g. `/deck` or `/`).

**Selectors / future Playwright contract:**
```
const sultaiUrl = page.url();
await page.getByRole('button', { name: /Destruction/ }).click();
await page.getByRole('button', { name: /Lifegain/ }).click();
await page.getByRole('button', { name: 'Blue' }).click();

await page.goBack();
await expect(page.getByRole('button', { name: 'Blue' })).toHaveAttribute('aria-pressed', 'true');
await page.goBack();
await expect(page.getByRole('button', { name: /Lifegain/ })).toHaveAttribute('aria-pressed', 'true');
await page.goBack();
expect(page.url()).toBe(sultaiUrl);
```

---

### 9.4 Multi-step forward replays the toggle sequence

**Steps (continuation of 9.3):**
1. From the fully-back state, press Forward three times.

**Expected:**
- Each Forward replays exactly one toggle in original order: Destruction off, then Lifegain off, then Blue off.
- Final URL matches the state after step 3 of 9.3.

---

### 9.5 Color auto-init does NOT add a back-step

**Preconditions:** Navigate from `/decks` to `/deck/graph` with NO query string. (Done by clicking a deck from /decks → /deck → Graph toggle, or by typing the URL.)

**Steps:**
1. Land on `/deck/graph`. URL is auto-rewritten to `?colors=B,U,G` via `setSearchParams(replace: true)`.
2. Press Back ONCE.

**Expected:**
- Back navigates to wherever you came from (e.g. `/deck`), NOT to a "no-colors" version of `/deck/graph`.
- The auto-init wrote with `replace`, so the URL history has exactly one entry for `/deck/graph` regardless of how many params were seeded.

**Selectors / future Playwright contract:**
```
await page.goto('/deck'); // wherever
await page.getByRole('link', { name: 'Graph' }).click();
expect(page.url()).toMatch(/colors=/); // auto-init wrote
await page.goBack();
expect(page.url()).not.toContain('/deck/graph');
```

---

### 9.6 Reload preserves URL state

**Steps:**
1. Toggle several filters so URL is `?colors=B,G&off_fam=destruction&mode=focus&focus=<oracleId>`.
2. Reload the page (`Ctrl+R` / `Cmd+R`).

**Expected:**
- All filter pills, color pills, mode toggle, and focused-card chip restored to pre-reload state.
- Graph shows identical nodes/edges (modulo non-deterministic d3-force positioning).

**Selectors / future Playwright contract:**
```
const before = page.url();
await page.reload();
expect(page.url()).toBe(before);
await expect(page.getByRole('button', { name: /Destruction/ })).toHaveAttribute('aria-pressed', 'false');
await expect(page.getByRole('button', { name: 'Blue' })).toHaveAttribute('aria-pressed', 'false');
```

---

### 9.7 Back from focus mode returns to deck mode

**Preconditions:** On `/deck/graph` in deck mode (URL has only `colors=...`).

**Steps:**
1. Double-click a node to enter focus mode. URL gains `mode=focus&focus=<id>`.
2. Press Back.

**Expected:**
- URL drops `mode` and `focus`.
- Mode toggle shows "Deck" active; focus chip gone; deck-mode graph rendered.

**Selectors / future Playwright contract:**
```
await page.locator('[data-node-id="<id>"]').dblclick();
expect(page.url()).toMatch(/mode=focus/);
await page.goBack();
expect(page.url()).not.toMatch(/mode=focus/);
await expect(page.getByRole('button', { name: 'Deck' })).toHaveClass(/amber/); // active style
```

---

### 9.8 Refresh-suggestions mutation does NOT push URL history

**Steps:**
1. Note the current URL.
2. Add a card via the drawer (creates a `+1` badge).
3. Click "Refresh suggestions".
4. Press Back.

**Expected:**
- The Refresh action updates the local `refreshedDeckIds` state but does NOT touch the URL.
- After step 4, Back navigates away from the toggle history (or back through prior filter toggles), NOT to a "pre-refresh" state.
- This is by design: refresh is a mutation snapshot, not a navigation event.

**Selectors / future Playwright contract:**
```
const before = page.url();
// ... add card, refresh ...
expect(page.url()).toBe(before);
```

---

### 9.9 Add/remove card does NOT push URL history

**Steps:**
1. Note URL.
2. Click a candidate, click "+ Add to deck" in the drawer.
3. Press Back.

**Expected:**
- URL unchanged by the Add action.
- Back navigates to wherever you were before the current `/deck/graph` view (or back through prior filter toggles), NOT to a "pre-add" version of the page.
- Card stays added (deckStore mutation is independent of URL state).

---

## Out of scope for this manual spec (covered by unit tests or not implemented)

- d3-force convergence timing → not asserted (visual smoke OK).
- Drag-to-pin individual nodes → not wired in v1 (`pin()` exists on the hook but no drag handlers; d3-zoom owns drag).
- "N cards not visualized" banner → not implemented in v1.
- Mobile / touch → out of scope (d3-zoom supports touch by default; no test cases written).
- Active deck id in URL → not yet (path is `/deck/graph`, reads from `useActiveDeck`); deck selection would need a separate URL scheme.

## Future Playwright translation notes

When lifting this to `app/tests/e2e/deck-graph.spec.ts`:
- Reuse the existing `smoke.spec.ts` pattern: navigate, wait for hydration via the `^\d+ cards$` text, then drive the UI.
- Suite 2 fixture decks should be seeded directly into IndexedDB via `page.evaluate(() => { ... })` rather than UI-driven to keep tests fast and deterministic.
- For the SVG selectors (`[data-node-id]`, `[data-edge]`, `[data-edge-multimark]`, `[data-layer="zoom-target"]`), Playwright handles SVG natively — no special setup needed.
- For the "Refresh badge" assertions, prefer matching against the button's text content rather than a separate selector for the badge span.
- The color filter auto-init depends on the deck's color identity at first mount — tests should set up the deck fully before navigating to `/deck/graph`.
- For Suite 7 (zoom/pan): use `page.mouse.wheel(0, -120)` for wheel zoom, `page.mouse.move + page.mouse.down/up` for drag-pan. Read back `[data-layer="zoom-target"]` transform attribute to assert zoom state. Allow ~300ms after `Reset zoom` for the d3-transition to finish before assertions.
- For Suite 8 (URL state): use `page.url()` and `URLSearchParams` to inspect; use `page.goBack()` / `page.goForward()` for history navigation. Note that the auto-init `colors` write uses `setSearchParams(..., { replace: true })` so the back stack is preserved — this is testable by checking `page.goBack()` lands on the previous route, not on a "no-colors" graph state.
