# Deck Page — Manual Test Spec

**For:** `/deck` route (DeckPage — the "Active Deck" list view).
**Sibling route:** `/deck/graph` (DeckGraphPage — see `2026-05-24-deck-graph-viz-manual-tests.md`).
**Purpose:** Human-runnable smoke tests, structured so each case can later be lifted into a Playwright spec at `app/tests/e2e/deck-page.spec.ts`. Each case names stable selectors (test IDs, ARIA roles, exact text) — those are the contracts the future spec will assert on.

**Page composition (read this once):**
DeckPage is a thin wrapper that renders a `BrowserShell` with a small top-of-page segmented control. The shell renders, left-to-right:
1. Left aside (`width: 260px`): `FilterPanel`.
2. Center column: a header row showing `{N} cards`, then a `CardGrid` (full Standard pool filtered by FilterPanel).
3. Right rail (`width: 360px` expanded, `72px` collapsed): `DeckPanel` (or `DeckPanelCollapsed`).

The "Active Deck" UI users care about lives entirely in the right rail (`DeckPanel`). The center grid is just the browser surface re-used so users can add cards without leaving the page.

**Test environment:**
- Dev server at `http://localhost:5173`.
- Artifact present: `app/public/data/cards-standard.json` (run `npm run build:cards -- --standard` if absent).
- Reset state before suite: open browser devtools → Application → IndexedDB → delete `mtg-graph` database. Application → Local Storage → clear `mtg-graph:activeDeckId` and `mtg-graph:deckPanelCollapsed`. Reload.

**Selector conventions used below:**
- `role:button name:"Copy as text"` — ARIA role + accessible name (Playwright: `getByRole('button', { name: 'Copy as text' })`).
- `testid:graph-canvas` — `data-testid` attribute (none on this page today — see TBD notes).
- `text:"8 cards"` — visible text match (Playwright: `getByText('8 cards')`).
- `selector:[data-oracle-id="<oracleId>"]` — raw CSS, for card list row lookup.
- `selector:[data-cmc="<n>"]` — raw CSS, for MiniManaCurve bar lookup (collapsed only).
- `selector:[data-type-count="Creature"]` — raw CSS, for collapsed type-pill count lookup.
- `selector:[data-color="U"]` — raw CSS, for ColorPipBar segment lookup (collapsed only).

---

## Suite 1 — No active deck

### 1.1 No active deck → DeckPanel empty-state copy

**Preconditions:** Fresh IndexedDB; no `mtg-graph:activeDeckId` in localStorage.

**Steps:**
1. Navigate to `http://localhost:5173/deck`.

**Expected:**
- Top nav visible: `Browse`, `Decks`, `Active Deck` links.
- Segmented control `List | Graph` visible at the top of the content area.
- Left filter panel and center card grid both render (the browser shell is independent of deck state).
- Right rail shows the literal text: `No active deck. Create or select one from Decks.`
- No collapse chevron in the rail (the collapse control is suppressed when there is no deck).
- No ManaCurve, no card list, no `Copy as text` button.

**Selectors:**
- Assertion: `role:navigation` contains `role:link name:"Browse"`, `role:link name:"Decks"`, `role:link name:"Active Deck"`.
- Assertion: `text:"List"` visible inside the segmented control.
- Assertion: `role:link name:"Graph"` has `href="/deck/graph"`.
- Assertion: `text:/No active deck\. Create or select one from Decks\./` visible.
- Assertion: `role:button name:"Collapse deck panel"` does NOT exist.
- Assertion: `role:button name:"Copy as text"` does NOT exist.

**TBD selector:** The "No active deck" copy is a plain `<p>` with no `role` or `data-testid`. Text matching is the only contract today. Future enhancement: add `data-testid="deck-panel-empty"` for a more stable selector.

**Note on missing CTA:** Unlike `/deck/graph` (which renders an explicit `Pick or create one` link to `/decks`), this page's empty-state copy is informational only — no link element. If a CTA link is desired here, that's a future enhancement to track separately.

---

## Suite 2 — Empty active deck

### 2.1 Empty active deck → header + curve but no card rows

**Preconditions:** Create a deck named "Empty Test" via `/decks` (or `useDeckStore.getState().createDeck('Empty Test')` from the console). Don't add any cards.

**Steps:**
1. Navigate to `/deck`.

**Expected:**
- Right rail shows the deck name `Empty Test` as a clickable `<h2>` (cursor pointer, hover underline).
- Under it: `text:"0 cards"`.
- `Copy as text` button visible (clicking it copies an empty string to clipboard).
- `Collapse deck panel` button visible.
- ManaCurve renders 8 amber bars all at height 0 (a flat baseline).
- Legality warnings list visible with at least one entry: "Standard requires at least 60 cards; this deck has only 0.".
- No type sections (Creatures, Instants, etc.) and no card rows.

**Selectors:**
- Assertion: `role:heading level:2 name:"Empty Test"` visible.
- Assertion: `text:"0 cards"` visible.
- Assertion: `role:button name:"Copy as text"` visible.
- Assertion: `role:button name:"Collapse deck panel"` visible.
- Assertion: `text:/at least 60 cards.*this deck has only 0/` visible.
- Assertion: no `role:listitem` with `[data-oracle-id]` in the rail.

**Note on missing empty-CTA:** Again, unlike the graph page (which links to `/` from an empty deck), this page surfaces no in-rail CTA back to the browser — the user is expected to use the center card grid that's already showing. If a "Browse cards" hint is desired, that's a future enhancement.

---

## Suite 3 — Header / chrome

**Suite preconditions for cases 3.x, 4.x, 5.x, 6.x:** Create or activate a small ~8-card Sultai-leaning test deck. From the console:
```js
const store = useDeckStore.getState();
await store.createDeck('Sultai Test');
const add = (id) => store.addCard(id, 1);
// Add via the center grid by clicking + on each card row, OR add programmatically once you know oracleIds.
```
Easier: navigate to `/`, search and add 1 copy each of ~8 cards across types — at minimum one Creature, one Instant, one Sorcery, one Land.

### 3.1 Top nav links

**Steps:** Land on `/deck`.

**Expected:**
- Top nav row has exactly three links, in order: `Browse` → `/`, `Decks` → `/decks`, `Active Deck` → `/deck`.
- `Active Deck` has `font-semibold` class (NavLink `isActive` state); the other two do not.

**Selectors:**
- Assertion: `role:link name:"Browse"` has `href="/"`.
- Assertion: `role:link name:"Decks"` has `href="/decks"`.
- Assertion: `role:link name:"Active Deck"` has `href="/deck"`.
- Assertion: `role:link name:"Active Deck"` has class matching `/font-semibold/`.

---

### 3.2 List | Graph segmented control

**Steps:** Land on `/deck`. Inspect the top-right segmented control.

**Expected:**
- Two segments: `List` and `Graph`.
- `List` is a `<span>` (not a link — it's the current-page indicator) with class `bg-amber-900/40` and amber text.
- `Graph` is a `role:link` with `href="/deck/graph"`.

**Selectors:**
- Assertion: `text:"List"` is NOT a link (use `getByText('List')` and assert tagName is `SPAN`).
- Assertion: `role:link name:"Graph"` has `href="/deck/graph"`.

**TBD selector:** The segmented control has no enclosing `role:group` or `data-testid`. Scope by class `inline-flex.*rounded.*border-neutral-700` or add a `data-testid="deck-view-toggle"` in a future change for cleaner scoping.

---

### 3.3 Deck name and total count

**Preconditions:** A deck named "Sultai Test" with 8 cards.

**Expected:**
- `role:heading level:2 name:"Sultai Test"` visible in the rail.
- Heading has `cursor-pointer hover:underline` and `title="Click to rename"`.
- Directly below: `text:"8 cards"` (the format is `{total} cards`, no pluralization handling — would render `1 cards` for a single-card deck).

**Selectors:**
- Assertion: `role:heading level:2 name:"Sultai Test"` visible.
- Assertion: `text:"8 cards"` visible.

---

### 3.4 Rename deck inline

**Steps:**
1. Click the deck-name heading.
2. The heading is replaced by a text input (`autoFocus`) pre-filled with the current name.
3. Edit to `Sultai v2` and press Enter (OR click outside to blur).

**Expected:**
- During edit: heading no longer rendered; an `<input>` with the current name is focused.
- On Enter or blur: input vanishes, heading re-renders with the new name, deck is persisted (reload preserves the new name).
- Escape (during edit) cancels and reverts.
- An empty / whitespace-only name is ignored (heading reverts to original).

**Selectors:**
- Action: click `role:heading level:2 name:"Sultai Test"`.
- Assertion: focused element is an `<input>` with value `"Sultai Test"`.
- Action: type `Sultai v2`, press Enter.
- Assertion: `role:heading level:2 name:"Sultai v2"` visible.

**TBD selector:** The rename input has no `aria-label` or `data-testid`. Future enhancement: add `aria-label="Deck name"` on the `<input>`.

---

### 3.5 Color identity pip bar — NOT rendered on expanded DeckPanel

**Expected:**
- Expanded `DeckPanel` does NOT render `ColorPipBar`.
- The pip bar is only present in the *collapsed* state (`DeckPanelCollapsed`). See Suite 9.

**Note:** This documents intent so future contributors don't accidentally assert on a pip bar on the expanded page.

---

### 3.6 Format — not surfaced

**Expected:**
- The deck `format` field (`'standard'`) is stored on each deck but is NOT rendered anywhere in `DeckPanel`.
- Legality warnings reference Standard implicitly (`Standard requires at least 60 cards…`) but the format is not labeled.

**Note:** If a "Format: Standard" badge is desired in the header, that's a future enhancement.

---

## Suite 4 — Card list (rows)

### 4.1 Cards grouped by primary type, in canonical order

**Preconditions:** Sultai Test deck with at least one card in each of Creature, Instant, Sorcery, Land (e.g. Llanowar Elves, Counterspell, Cultivate, Forest).

**Expected:**
- Section headings render in this exact order, top to bottom (only sections with ≥1 card appear): `Creatures`, `Planeswalkers`, `Instants`, `Sorceries`, `Artifacts`, `Enchantments`, `Battles`, `Lands`.
- Each heading is an `<h3>` with classes `text-xs uppercase tracking-wide text-neutral-400`.
- Cards with `types` containing none of the eight known types fall into an `Unknown` section at the bottom.

**Selectors:**
- Assertion: `role:heading level:3 name:"Creatures"` visible.
- Assertion: `role:heading level:3 name:"Lands"` visible.
- Assertion: the visual top-to-bottom order matches `TYPE_ORDER` (`bounding box .top` of `Creatures` < `Instants` < `Sorceries` < `Lands`).

---

### 4.2 Each row renders count controls, mana cost, and name

**Steps:** Inspect a single row (e.g. Counterspell).

**Expected (per row, which is an `<li>` with `data-oracle-id="<id>"`):**
- Leftmost: `role:group name:"Adjust copies"` containing:
  - `role:button name:"Remove one copy"` (disabled when count = 0).
  - `<span>` with `aria-label="{N} in deck"` showing the count (e.g. `1`).
  - `role:button name:"Add one copy"`.
- Middle: name button — a `<button>` containing the inline mana cost (rendered by `<ManaCost>` as `<ManaSymbol>` icons, NOT raw `{U}{U}` text) followed by the card name as `<span class="truncate">`.
- No card image inline in the row (image is shown via `HoverCardPreview` on hover — see 4.5).

**Selectors:**
- Assertion: `selector:[data-oracle-id="<counterspellOracleId>"]` exists.
- Assertion: within that row, `role:button name:"Add one copy"` exists.
- Assertion: within that row, `role:button name:"Remove one copy"` exists.
- Assertion: within that row, the name button contains `text:"Counterspell"`.
- Assertion: within that row, raw text `{U}{U}` does NOT appear (mana cost is rendered as symbol images, not literal braces).

---

### 4.3 Count badge reflects current count

**Expected:**
- The middle `<span>` between the `-` and `+` buttons shows the integer count.
- It has `aria-label="{N} in deck"` for screen-reader announcement.

**Selectors:**
- Assertion: within row for a card with count = 2, an element matching `selector:[aria-label="2 in deck"]` exists.

---

### 4.4 Name button is clickable (opens detail) — but only when an `onCardClick` is wired

**Steps:**
1. Click the name span (not the count buttons) of a row.

**Expected:**
- On DeckPage, `DeckPanel` is rendered via `BrowserShell`'s `rightRail` prop, which passes through `cardNav.push` as `onCardClick`. Clicking the name should push the card's `oracleId` into the URL as `?card=<oracleId>` and open the `CardDetailDrawer` in the shell.
- The row's name button has class `cursor-pointer hover:text-amber-200` when `onCardClick` is wired (which is always true on DeckPage).
- The count `+`/`-` buttons each `stopPropagation` on click and do NOT open the drawer.

**Selectors:**
- Action: within a row, click the name `<button>` (NOT the count group).
- Assertion: URL gains `?card=<oracleId>`.
- Assertion: `CardDetailDrawer` is visible in the page (look for the drawer's heading with the card name).
- Action: click `role:button name:"Add one copy"` within a row.
- Assertion: URL does NOT gain `?card=...` (event was stopped).

**TBD selector:** The name button has no `aria-label`. It's selectable by its visible text content (the card name), which is the practical Playwright contract: `getByRole('button', { name: 'Counterspell' })`.

---

### 4.5 Hover preview on row

**Steps:**
1. Hover the cursor over a card row.

**Expected:**
- After a short delay, a `HoverCardPreview` (mode: `cursor`) appears near the cursor showing the card's full image (`width=240`).
- On mouse move within the row, the preview follows the cursor.
- On mouse leave the row, the preview disappears.
- If the card has no `imageUrl` (e.g. a stub card not in the artifact), no preview shows.

**Selectors:**
- Action: `page.locator('[data-oracle-id="<id>"]').hover()`.
- Assertion: an `<img>` with `src` matching the Scryfall image URL pattern is visible.

**TBD selector:** `HoverCardPreview` has no `data-testid` and no consistent role/name. Scope by `<img>` tag with the expected `src` substring, or add `data-testid="hover-preview"` in a future change.

---

### 4.6 Unknown / orphan cards fall through to an `Unknown` section

**Preconditions:** A deck containing one card entry whose `oracleId` is NOT in the loaded artifact (e.g. seed `{ oracleId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', count: 1 }` via console).

**Expected:**
- A section heading `<h3>Unknown</h3>` appears below the known type sections.
- The row renders WITHOUT the wrapping `<button>` link (clicking the name does nothing — it's not a `CardListRow`, just an inline `<li>` with a `CountControls` group + a `<span class="truncate text-neutral-400">`).
- Display name is the persisted `name` field if present, otherwise the literal `Unknown card (oracleId: aaaaaaaa)` (first 8 chars of the id).

**Selectors:**
- Assertion: `role:heading level:3 name:"Unknown"` visible.
- Assertion: `text:/Unknown card \(oracleId: aaaaaaaa\)/` visible.

---

## Suite 5 — Increment / decrement / remove

### 5.1 Click `+` adds one copy

**Preconditions:** Counterspell at count = 1 in the deck.

**Steps:**
1. Click `role:button name:"Add one copy"` within Counterspell's row.

**Expected:**
- Count badge updates to `2` immediately.
- Header `{N} cards` updates from `8 cards` to `9 cards`.
- ManaCurve bar at CMC 2 (Counterspell) increases in height proportionally.
- IndexedDB row for the deck is updated (persists on reload).

**Selectors:**
- Action: click `role:button name:"Add one copy"` within `selector:[data-oracle-id="<id>"]`.
- Assertion: `selector:[aria-label="2 in deck"]` exists within that row.
- Assertion: `text:"9 cards"` visible.

---

### 5.2 Shift+click `+` adds 4 copies

**Steps:**
1. Shift+click `Add one copy` on Counterspell (currently 2).

**Expected:**
- Count jumps from 2 to 6 (added 4).
- Header updates: `8 cards` → `12 cards`.
- Legality warnings now include "Deck contains 6 copies of Counterspell; max 4 unless basic land.".

**Selectors:**
- Action: `page.getByRole('button', { name: 'Add one copy' }).click({ modifiers: ['Shift'] })`.
- Assertion: `selector:[aria-label="6 in deck"]` exists.
- Assertion: `text:/Deck contains 6 copies of Counterspell.*max 4/` visible.

---

### 5.3 Click `-` removes one copy

**Steps:** Click `role:button name:"Remove one copy"` on Counterspell (currently 6).

**Expected:**
- Count decreases to 5. Header decrements.
- Legality warning recomputes.

---

### 5.4 Shift+click `-` removes up to 4 copies (capped at current count)

**Steps:** Shift+click `Remove one copy` on Counterspell (currently 5).

**Expected:**
- Count drops from 5 to 1 (removed `min(4, 5) = 4`).
- If Counterspell is at count = 2 and you Shift+click `-`, it drops to 0 and the row disappears entirely (because `removeCard` filters out zero-count entries in `deckStore`).

---

### 5.5 Removing the last copy removes the row

**Preconditions:** Cultivate at count = 1.

**Steps:** Click `Remove one copy` on Cultivate.

**Expected:**
- Row for Cultivate is removed from the DOM (`[data-oracle-id="<cultivateId>"]` no longer exists).
- If Cultivate was the only Sorcery in the deck, the `Sorceries` `<h3>` heading is also removed.
- Header card count decrements.

**Selectors:**
- Action: click `role:button name:"Remove one copy"` within Cultivate's row.
- Assertion: `selector:[data-oracle-id="<cultivateId>"]` no longer exists.

---

### 5.6 `-` button is disabled at count = 0

**Expected:**
- In `CardListRow`, the `-` button has `disabled` attribute when `count === 0`. (In practice rows with count = 0 are filtered out before render, so this is mostly a guard. The disabled state IS reachable through the `Unknown` group when count = 0 is somehow persisted; in normal usage you won't see it.)

**Selectors:**
- Assertion (in synthetic test): `role:button name:"Remove one copy"` has `aria-disabled="true"` (HTML `disabled` attribute → ARIA implicit `disabled`).

---

## Suite 6 — Mana curve (full)

### 6.1 ManaCurve renders 8 bars

**Steps:** Land on `/deck` with a populated deck.

**Expected:**
- 8 amber (`bg-amber-500`) bars in a horizontal row, indexed 0–7.
- Each bar has `title="CMC {i}: {n}"` (or `CMC 7: {n}` — bucket 7 is "7+" but title text uses `7`).
- Bar heights are proportional to count, with the tallest bar at exactly the chart height (96px). All other bars scale down relative to the max.
- Below the bars: a row of 8 small labels `0 1 2 3 4 5 6 7+` (with the seventh labeled `7+`).
- Lands are EXCLUDED from the curve (per `manaCurveBuckets` — `if (card.types.includes('Land')) continue`).

**Selectors:**
- Assertion: 8 divs with class `bg-amber-500` exist inside the rail.
- Assertion: `text:"7+"` visible (the label, not a card).

**TBD selector:** The ManaCurve has no `role:img` or wrapping `data-testid`. Bars are bare divs with title attributes. Future enhancement: add `data-testid="mana-curve"` on the wrapping `<div>` and `data-cmc="{i}"` on each bar (note: `MiniManaCurve` already has `data-cmc` — adopt the same pattern here).

---

### 6.2 Curve updates live on add/remove

**Steps:**
1. Note the height of the CMC 2 bar.
2. Click `+` on Counterspell (CMC 2) twice.
3. Re-measure the CMC 2 bar.

**Expected:**
- The CMC 2 bar's height (in pixels) is now strictly greater than before.
- If CMC 2 becomes the new max, all OTHER bars rescale downward to maintain the 96px ceiling.

---

### 6.3 Adding a Land does NOT change the curve

**Steps:** Click `+` on Forest (a Land).

**Expected:**
- ManaCurve bars are visually unchanged (lands skipped).
- Header `{N} cards` increments (the land DOES count toward total card count).

---

## Suite 7 — Themes / tag highlights (not implemented on this page)

### 7.1 No themes display on DeckPage

**Expected:**
- `DeckPanel` does NOT render any list of deck themes (`deckThemes` is imported by `FilterPanel`, not `DeckPanel`).
- There is no "Themes" section, no tag chip list, and no `TagChip` usage in the rail.

**Note:** `deckThemes` is wired into `FilterPanel` (left aside) as a filter-by-theme affordance. If a "Top themes for this deck" summary is wanted in the right rail, that's a future enhancement.

---

## Suite 8 — Deck export

### 8.1 `Copy as text` writes plaintext lines to the clipboard

**Preconditions:** A deck with at least 2 cards: `4 Lightning Bolt` and `2 Counterspell` (or similar).

**Steps:**
1. Click `role:button name:"Copy as text"` in the rail.

**Expected:**
- `navigator.clipboard.writeText` is invoked with a string formatted as `${count} ${name}\n${count} ${name}…`, e.g.:
  ```
  4 Lightning Bolt
  2 Counterspell
  ```
- Card entries whose `oracleId` is NOT in the loaded artifact are SKIPPED (the export function returns `null` for them and filters out — see `deckToText`).
- No file download; no UI confirmation toast; the button simply writes to clipboard silently.

**Selectors:**
- Action: click `role:button name:"Copy as text"`.
- Assertion (Playwright): `await page.evaluate(() => navigator.clipboard.readText())` matches the expected text (requires `clipboard-read` permission in the test context — grant via `context.grantPermissions(['clipboard-read'])`).

**Note:** This is the only export affordance. No `.dec`/`.txt` file download, no Arena format, no MTGO format. If those are wanted, future enhancement.

---

## Suite 9 — Collapsed deck panel state

### 9.1 Collapse via the chevron

**Preconditions:** Active deck present. Rail is expanded (default).

**Steps:**
1. Click `role:button name:"Collapse deck panel"` (the `◀` chevron in the rail header).

**Expected:**
- Rail width animates from `360px` to `72px` over ~200ms (`transition-[width] duration-200 ease-out`).
- Expanded contents (name, ManaCurve, card list) are replaced by `DeckPanelCollapsed`.
- Collapsed state is persisted to `localStorage` under key `mtg-graph:deckPanelCollapsed` with value `"true"`.

**Selectors:**
- Action: click `role:button name:"Collapse deck panel"`.
- Assertion: `role:button name:"Expand deck panel"` now visible.
- Assertion (after transition): `role:heading level:2` for the deck name no longer visible.
- Assertion: `window.localStorage.getItem('mtg-graph:deckPanelCollapsed') === 'true'`.

---

### 9.2 Collapsed panel renders type pills, mini curve, and color bar

**Preconditions:** Sultai Test deck (mixed types & colors), collapsed state.

**Expected (top to bottom in the 72px rail):**
- `role:button name:"Expand deck panel"` — the toggle.
- `text:"{N}c"` (e.g. `8c`) — total count with `c` suffix, in `font-mono`.
- A vertical stack of per-type buttons (`data-stats` container), one per present type, each:
  - `role:button name:"Jump to {plural-lowercased}"` (e.g. "Jump to creatures").
  - Inside: a single letter (`C`, `P`, `I`, `S`, `A`, `E`, `B`, `L`) on the left, a count on the right.
  - The count `<span>` has `data-type-count="{Type}"` for selection.
  - Background color varies by type (`bg-emerald-700` for Creatures, `bg-sky-700` for Instants, etc.).
- `MiniManaCurve` — 8 thin (`w-2`) amber bars, each with `data-cmc="{i}"` and `title="CMC {i}: {n}"`.
- `ColorPipBar` — a single 3px-tall horizontal bar divided into segments by color identity, each segment with `data-color="{W|U|B|R|G}"`. If the deck has NO colored pips (e.g. all-colorless or all-lands), the bar is replaced by an empty placeholder `<div role="img" aria-label="No colored pips">`.

**Selectors:**
- Assertion: `text:"8c"` visible.
- Assertion: `role:button name:"Jump to creatures"` visible.
- Assertion: `selector:[data-type-count="Creature"]` text matches expected count.
- Assertion: 8 elements matching `selector:[data-cmc]` exist (one per CMC bucket).
- Assertion: at least one element matching `selector:[data-color]` exists for a colored deck.

---

### 9.3 Click a type pill — expands and scrolls to that section

**Preconditions:** Collapsed state, deck with multiple types.

**Steps:**
1. Click `role:button name:"Jump to instants"`.

**Expected:**
- `onJumpToType('Instant')` fires.
- Rail expands (collapsed state set back to `false`; localStorage updated).
- After expansion completes, the `Instants` `<h3>` section scrolls into view (`scrollIntoView({ behavior: 'smooth', block: 'start' })`).

**Selectors:**
- Action: click `role:button name:"Jump to instants"`.
- Assertion: `role:button name:"Collapse deck panel"` visible (expanded again).
- Assertion: `role:heading level:3 name:"Instants"` is in the viewport.

---

### 9.4 Collapsed state hydrates from localStorage on mount

**Preconditions:** Set `localStorage.setItem('mtg-graph:deckPanelCollapsed', 'true')`. Active deck present.

**Steps:**
1. Reload `/deck`.

**Expected:**
- Rail mounts directly in collapsed state — `role:button name:"Expand deck panel"` visible immediately, no flash of expanded content.

---

### 9.5 Collapse button is hidden when there is no active deck

**Preconditions:** No active deck.

**Expected:**
- Neither `Collapse deck panel` nor `Expand deck panel` button renders.
- Rail shows only the "No active deck. Create or select one from Decks." text.

**Note:** This matches the existing `DeckPanel.test.tsx` assertion (`queryByLabelText(/collapse deck panel/i)).not.toBeInTheDocument()`).

---

## Suite 10 — Navigation

### 10.1 Top nav navigates between top-level routes

**Steps:**
1. From `/deck`, click `role:link name:"Browse"`.

**Expected:** URL becomes `/`. The center grid is now full-bleed (no right rail), and the segmented control disappears.

**Steps:**
2. From `/`, click `role:link name:"Decks"`.

**Expected:** URL becomes `/decks`. The deck list page renders.

**Steps:**
3. From `/decks`, click `role:link name:"Active Deck"`.

**Expected:** URL becomes `/deck`. DeckPage renders with the previously-active deck in the rail.

---

### 10.2 Segmented `Graph` link navigates to deck graph view

**Steps:** Click `role:link name:"Graph"` in the segmented control.

**Expected:**
- URL becomes `/deck/graph`.
- `DeckGraphPage` renders (covered by `2026-05-24-deck-graph-viz-manual-tests.md`).
- The segmented control on that page now shows `Graph` as the active (non-link) segment and `List` as a `role:link` back to `/deck`.

**Selectors:**
- Action: click `role:link name:"Graph"`.
- Assertion: `page.url()` ends with `/deck/graph`.

---

### 10.3 Browser back from `/deck/graph` returns to `/deck`

**Steps:**
1. From `/deck`, click `Graph`.
2. Press browser Back.

**Expected:**
- URL returns to `/deck`.
- Segmented control's `List` segment is again the (active) span; `Graph` is again the link.

---

## Out of scope for this manual spec (covered by unit tests or not implemented)

- Drag-to-reorder cards within a type section → not implemented.
- Sideboard / commander zone → not implemented.
- Export to `.dec` / Arena / MTGO format → not implemented (only plaintext `count name` via "Copy as text").
- Deck format switching (Standard / Modern / etc.) → not surfaced in UI (stored on `Deck.format` but no UI to change it; legality only checks Standard rules).
- Deck themes summary in the right rail → not implemented (themes are in FilterPanel, not DeckPanel).
- Color identity pip bar in the expanded DeckPanel → not implemented (only in `DeckPanelCollapsed`).
- Format badge in the header → not implemented.
- Card images inline in rows → not implemented (only on hover, via `HoverCardPreview`).
- Confirmation modal for "remove last copy" → not implemented (one-click `-` will remove the row immediately when count goes to 0).
- URL state for which deck is active → not implemented (active deck id lives in `localStorage`, not the URL).

## Future Playwright translation notes

When lifting this to `app/tests/e2e/deck-page.spec.ts`:
- Seed decks directly into IndexedDB via `page.evaluate(() => useDeckStore.getState().createDeck(...))` to keep tests fast and deterministic.
- Set `mtg-graph:activeDeckId` in `localStorage` before navigating, OR rely on `createDeck` to set it as a side effect.
- For clipboard assertions in Suite 8, grant `clipboard-read` permission to the browser context: `await context.grantPermissions(['clipboard-read'])` before the test.
- For hover preview (Suite 4.5), use `page.locator('[data-oracle-id="<id>"]').hover()` and assert on the visible `<img>` element.
- The collapsed/expanded state transition runs a 200ms CSS transition. If asserting on post-transition layout, wait ~250ms or listen for the `transitionend` event.
- Several selectors are currently text-based or class-based; the TBD notes throughout this spec flag candidate `data-testid` additions to make the future Playwright suite less brittle. Land those `data-testid` additions before writing the e2e spec, if possible.
