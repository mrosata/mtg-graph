# Browser Page — Manual Test Spec

**For:** `/` route (BrowserPage → BrowserShell).
**Purpose:** Human-runnable smoke tests, structured so each case can later be lifted into a Playwright spec at `app/tests/e2e/browser.spec.ts`. Each case names stable selectors (test IDs, ARIA roles, exact text) — those are the contracts the future spec will assert on.

**Test environment:**
- Dev server at `http://localhost:5173`
- Artifact present: `app/public/data/cards-standard.json` (run `npm run build:cards -- --standard` if absent)
- Reset state before suite: open browser devtools → Application → IndexedDB → delete `mtg-graph` database. Reload.

**Selector conventions used below:**
- `role:button name:"Add to deck"` — ARIA role + accessible name (Playwright: `getByRole('button', { name: 'Add to deck' })`)
- `testid:hover-card-preview` — `data-testid` attribute (Playwright: `getByTestId('hover-card-preview')`)
- `text:"cards"` — visible text match (Playwright: `getByText('cards')`)
- `label:"Oracle text"` — `<label htmlFor=…>` association (Playwright: `getByLabel('Oracle text')`)
- `selector:[role="dialog"]` — raw CSS, for the ConfirmModal lookup

---

## Suite 1 — Initial hydration

### 1.1 Loading state renders, then resolves

**Preconditions:** Fresh page load, artifact reachable.

**Steps:**
1. Navigate to `http://localhost:5173/`.

**Expected:**
- Briefly, text "Loading card data…" visible (may be too fast to see locally with a warm cache).
- Within ~15s, "Loading…" is replaced by the main browser layout.

**Selectors:**
- Assertion (transient): `text:/Loading card data/`
- Assertion (final): `text:/^\d+ cards$/` visible inside the header bar (see 1.2 for exact selector)

---

### 1.2 Header bar shows filtered card count

**Steps:** Land on `/`. Wait for hydration.

**Expected:**
- A header bar above the grid shows `<N>` followed by the literal word `cards`, where N matches the total card count of the loaded artifact.
- For the default `cards-standard.json`, N is 4,000+.

**Selectors:**
- Assertion: `text:/^\d+ cards$/` visible (matches the count + word together via the parent header bar)
- Assertion: `text:"cards"` visible

---

### 1.3 Left filter panel renders all sections

**Steps:** Land on `/`. Inspect the left panel.

**Expected:**
- Sections render in this order: **Colors**, **CMC max**, **Oracle text**, **Sets** (collapsible), **Interactions**, **Deck themes**.
- Colors row shows five buttons labeled `W`, `U`, `B`, `R`, `G`.
- CMC max is an empty `<input type="number">`.
- Oracle text is an empty `<input type="text">` with its label "Oracle text".

**Selectors:**
- Assertion: `text:"Colors"` visible
- Assertion: `text:"CMC max"` visible
- Assertion: `label:"Oracle text"` visible (label `for="text-filter"`)
- Assertion: `text:"Sets"` visible
- Assertion: `text:"Interactions"` visible
- Assertion: `text:"Deck themes"` visible
- Assertion: each of `role:button name:"W"`, `name:"U"`, `name:"B"`, `name:"R"`, `name:"G"` visible

---

### 1.4 Card grid renders card images

**Steps:** Land on `/`. Scroll if necessary.

**Expected:**
- Grid contains many `role:button` elements, each wrapping an `<img>` with the card's `name` as alt text.
- Clicking a card opens the drawer (see Suite 3).

**Selectors:**
- Assertion: at least 10 `role:button` elements visible whose accessible name matches a card name (alt-text on the image is the accessible name).
- TODO: the grid uses `react-window` (virtualized) — no `data-testid` on the grid container. Future enhancement: add `data-testid="card-grid"` on the wrapper for a stable handle.

---

## Suite 2 — Filtering

### 2.1 Oracle text filter narrows the grid and updates the counter

**Steps:**
1. Land on `/`. Note the current `<N> cards` value.
2. In the Oracle text input, type `greatest toughness among creatures` (unique to Abzan Monument).

**Expected:**
- The card count drops dramatically (often to 1).
- Grid shows only matching cards.
- Clearing the input restores the original count.

**Selectors:**
- Action: `label:"Oracle text"` → fill `"greatest toughness among creatures"`
- Assertion: `text:/^1 cards$/` visible (or whatever match count is real)
- Action: clear the input
- Assertion: counter returns to the original value

---

### 2.2 Color filter toggles narrow / restore

**Steps:**
1. Note current count.
2. Click the `R` button in the Colors row.
3. Click `R` again.

**Expected:**
- After step 2: count drops to the subset of cards whose `colors` include R; the `R` button gets an amber-filled style.
- After step 3: `R` toggles off; count returns to the unfiltered total.

**Selectors:**
- Action: click `role:button name:"R"`
- Assertion: `role:button name:"R"` has the active class (background `bg-amber-500`)
- Assertion: counter is lower than the unfiltered count
- Action: click `role:button name:"R"` again
- Assertion: counter returns to baseline

---

### 2.3 CMC max filter

**Steps:**
1. Note current count.
2. In the CMC max input, type `2`.

**Expected:**
- Count drops to cards with `cmc ≤ 2`.
- Clearing the field restores the original count.

**Selectors:**
- Action: locate the `<input type="number">` directly under the "CMC max" label; fill `2`
- Assertion: counter drops
- TODO: the CMC max input has no `id`/`name`/`aria-label`. Future enhancement: add `aria-label="CMC max"` or `id="cmc-max"` for a stable Playwright handle. Today the only stable lookup is "the number input adjacent to the CMC max label" via DOM relationship.

---

### 2.4 Set filter (collapsible)

**Steps:**
1. Click the "Sets" header button to expand.
2. Click the checkbox row whose set code is `tdm` (or any other Standard set).
3. Confirm the count drops.
4. Click "Clear" to remove all set filters.

**Expected:**
- The Sets section reveals a scrollable checkbox list; each row shows the lowercase set code and full set name.
- A toggled checkbox adds the set to the filter and a badge appears next to the "Sets" header (`1`, `2`, …).
- Counter shows only cards whose `printings` include the selected set codes.
- "Clear" button appears only when ≥1 set is selected and resets the filter to none.

**Selectors:**
- Action: click `role:button name:/Sets/`
- Action: click checkbox in the row containing `text:"tdm"`
- Assertion: header badge with `text:"1"` appears beside `text:"Sets"`
- Assertion: counter is reduced
- Action: click `role:button name:"Clear"` (inside the Sets section)
- Assertion: badge gone; counter restored
- TODO: set checkboxes don't carry a stable `aria-label`. Lookup is by the visible set code/name in the row's `<label>`. Future enhancement: add `aria-label={s.name}` to each checkbox.

---

### 2.5 Interactions tag filter

**Preconditions:** Sets / Colors filters all clear.

**Steps:**
1. Locate the "Interactions" section. If collapsed, click the header to expand.
2. In the search box "Search interactions…", type a fragment that matches a known tag, e.g. `destroy creature`.
3. Tick the checkbox for one matching tag (e.g. `Destroy creature`).

**Expected:**
- Grid count drops to only cards carrying that tag.
- A chip with the tag label appears in the SelectedTagChips area inside the Interactions section.
- A header bar chip (ActiveTagFilter) also appears beside the counter with the same label and an "×" button.

**Selectors:**
- Action: type in `placeholder:"Search interactions…"` input
- Action: click checkbox `aria-label:"Destroy creature"` (or whichever tag label)
- Assertion: counter reduces
- Assertion: `role:button name:/Remove Destroy creature filter/` visible (the ActiveTagFilter chip's × button)
- Assertion: `role:button name:/Remove Destroy creature/` visible (the SelectedTagChips chip's × button — note label differs slightly: header chip says "Remove X filter", SelectedTagChips says "Remove X")

---

### 2.6 Deck themes tag filter

**Steps:**
1. Expand "Deck themes" section.
2. Tick a theme tag (e.g. `Tokens matter`).

**Expected:**
- Grid count drops to cards carrying that theme tag.
- Selected chip appears at top of the Deck themes section.
- Header ActiveTagFilter chip also appears (violet-toned because category is theme).

**Selectors:**
- Action: click checkbox `aria-label:/Tokens matter/`
- Assertion: counter reduces
- Assertion: a chip with the theme's label visible in the header bar

---

### 2.7 Muted theme rows when filter yields zero results

**Preconditions:** Apply a strict filter (e.g. CMC max = 0) that few cards match.

**Steps:**
1. Set CMC max to `0`.
2. Inspect the Deck themes section.

**Expected:**
- Themes that would have zero results under the current filter render as italic, muted (text-neutral-600), with `aria-disabled="true"` on the row `<label>`.
- The checkbox is still clickable but the muting signals the no-op.

**Selectors:**
- Assertion: at least one Deck themes `<label aria-disabled="true">` is present in the DOM

---

### 2.8 Tag filter persists in URL

**Steps:**
1. Tick a tag in Interactions.
2. Note the URL — it should contain `?tag=<tagId>`.
3. Reload the page.

**Expected:**
- The tag remains selected after reload; the grid is still filtered.
- Counter, header chip, and Interactions checkbox state all restored.

**Selectors:**
- Assertion: `page.url()` includes `tag=`
- After reload: same chip/checkbox/count state visible

---

## Suite 3 — Card click → drawer

### 3.1 Clicking a card opens the right-side drawer

**Steps:**
1. Land on `/`. Filter to `greatest toughness among creatures` so Abzan Monument is easy to find.
2. Click the Abzan Monument card.

**Expected:**
- A 420-wide drawer slides in from the right.
- Drawer shows: previous/next nav buttons, card image, card name as `<h2>`, type line, "Add to deck" button, oracle text, tag chips, then the InteractionsPanel.
- The URL gains `?card=<oracleId>` parameter.

**Selectors:**
- Action: click `role:button name:/Abzan Monument/`
- Assertion: `role:heading name:"Abzan Monument"` visible
- Assertion: `role:img name:"Abzan Monument"` visible with non-empty `src`
- Assertion: `text:/Creature|Artifact|Land|Enchantment|Instant|Sorcery|Planeswalker|Battle/` visible (type line)
- Assertion: `role:button name:"Add to deck"` visible
- Assertion: `page.url()` includes `card=`

---

### 3.2 Drawer drawer-nav back/forward stack

**Preconditions:** Drawer is open for some card.

**Steps:**
1. Click a card chip in the InteractionsPanel neighbor list — drawer focus changes to neighbor.
2. Click the "Previous card" nav button (chevron-left, top-left of drawer).
3. Click "Next card" nav button.

**Expected:**
- After step 1: drawer re-renders with the neighbor's content; URL `card=` updates.
- After step 2: drawer returns to the original card.
- After step 3: drawer returns to the neighbor again.
- Both buttons become disabled at the stack edges.

**Selectors:**
- Action: click `role:button name:"Previous card"`
- Assertion: drawer heading reflects original card
- Action: click `role:button name:"Next card"`
- Assertion: drawer heading reflects neighbor card

---

### 3.3 Esc closes the drawer

**Steps:**
1. With drawer open, press `Escape`.

**Expected:**
- Drawer disappears.
- `card=` removed from URL.

**Selectors:**
- Action: press `Escape`
- Assertion: `role:heading name:"Abzan Monument"` no longer visible
- Assertion: `page.url()` does not include `card=`

---

### 3.4 Tag chips render below oracle text

**Steps:**
1. Open the drawer for a card with multiple tags (e.g. any modal-removal card or a lifegain payoff).

**Expected:**
- Below the oracle text is a flex-wrap row of `<span>` chips, one per tag (after parent/child chip collapse).
- Each chip has `title` set to the tag's description (browser-native tooltip on hover).

**Selectors:**
- Assertion: drawer contains ≥1 `<span>` with class containing `rounded` and `text-xs` (the TagChip element). TODO: TagChip has no testid; the chips are visually distinct but selector-fragile. Future enhancement: add `data-testid="tag-chip"`.

---

## Suite 4 — Interactions panel

### 4.1 Tab strip — Interactions vs Deck themes

**Preconditions:** Drawer open for a card with at least one interaction edge and one theme edge (e.g. a lifegain payoff in a card pool with several themes).

**Steps:**
1. Inspect the tabs at the top of the InteractionsPanel.

**Expected:**
- Two tab buttons: `Interactions (N)` and `Deck themes (M)`, where N and M are the filtered neighbor counts in each category.
- The active tab has an amber (interactions) or violet (themes) underline.

**Selectors:**
- Assertion: `role:button name:/Interactions \(\d+\)/` visible
- Assertion: `role:button name:/Deck themes \(\d+\)/` visible

---

### 4.2 Tag-count chips list dominant relationship tags

**Steps:**
1. With Interactions tab active, inspect the row of small chips above the neighbor list.

**Expected:**
- One chip per tag, sorted by descending count, each formatted `<label> <count>`.
- Hover does NOT produce a native tooltip (the chip intentionally omits `title`).
- Each chip is a `<button>` with `aria-label="Show all cards tagged <label>"`.

**Selectors:**
- Assertion: ≥1 `role:button name:/Show all cards tagged/` visible inside the panel

---

### 4.3 Click a tag-count chip → navigates to filtered grid

**Steps:**
1. Click any tag-count chip in the InteractionsPanel.

**Expected:**
- URL updates: `?card=<currentId>&tag=<chipTagId>`.
- The grid behind the drawer updates to only cards carrying the chip's tag (the drawer stays open on the original card).
- ActiveTagFilter chip appears in header bar with the tag's label.
- Clicking the same chip a second time removes the tag (toggle behavior, on `/` only).

**Selectors:**
- Action: click `role:button name:/Show all cards tagged Lifegain/`
- Assertion: `page.url()` includes `tag=`
- Assertion: header chip with that tag label appears
- Action: click the same chip again
- Assertion: `page.url()` no longer includes that tag

---

### 4.4 Neighbor row click jumps drawer to neighbor

**Steps:**
1. In the InteractionsPanel neighbor `<ul>`, click any row.

**Expected:**
- Drawer focus updates to the neighbor card (image, name, type line, oracle text, tags all swap).
- URL `card=` updates to neighbor's oracleId.
- "Previous card" nav button is now enabled (history exists).

**Selectors:**
- Action: click the `role:button` row whose content includes the neighbor's name
- Assertion: `role:heading name:/<neighbor name>/` visible
- Assertion: `role:button name:"Previous card"` is enabled

---

### 4.5 Hover a neighbor row → image preview appears

**Steps:**
1. Hover over a neighbor row (don't click).

**Expected:**
- A `data-testid="hover-card-preview"` image fades in, anchored 440px from the right edge of the viewport.
- The preview is hidden when window width < 1020px (anchored mode `hideBelowPx`).
- Mouse leave removes the preview.

**Selectors:**
- Action: hover over a neighbor `role:button` in the list
- Assertion: `testid:hover-card-preview` visible (only at viewport widths ≥ 1020px)

---

### 4.6 Neighbor row shows in-deck badge when applicable

**Preconditions:** Active deck contains at least one neighbor card.

**Steps:**
1. Open drawer for a card whose neighbor is in your active deck.

**Expected:**
- That neighbor's row shows a small amber `×<N>` badge in the top-right of the row.

**Selectors:**
- Assertion: text like `text:/^×\d+$/` visible inside one of the neighbor rows

---

### 4.7 Color / CMC quick-filter for neighbor list

**Steps:**
1. In the InteractionsPanel, click one of the color buttons (e.g. `U`) or set the `CMC ≤` input to `2`.

**Expected:**
- Neighbor list and tab counts both drop to neighbors matching the local filter.
- Filter is local to the panel and does NOT change the URL or the main grid.

**Selectors:**
- Action: click `role:button name:"U"` inside the InteractionsPanel
- Assertion: tab count next to "Interactions" decreases

---

## Suite 5 — Active tag filter (header chips)

### 5.1 Header chip mirrors selected tag

**Preconditions:** No tags selected.

**Steps:**
1. Tick a tag in the Interactions filter section.

**Expected:**
- A chip appears in the page header bar (right of the `<N> cards` text), tone amber for interaction tags / violet for theme tags.
- The chip's text is the tag's `label` (not `tagId`).

**Selectors:**
- Assertion: `role:button name:/Remove .+ filter/` visible in the header

---

### 5.2 Header chip × removes the filter

**Steps:**
1. With a tag chip in the header, click its `×` button.

**Expected:**
- Tag removed: header chip disappears, Interactions checkbox un-ticks, grid count restored, URL `?tag=` parameter dropped.

**Selectors:**
- Action: click `role:button name:/Remove <label> filter/`
- Assertion: chip no longer in DOM
- Assertion: `page.url()` no longer contains `tag=`

---

### 5.3 Multiple active tag chips coexist

**Steps:**
1. Select two different tags (e.g. one Interaction and one Theme).

**Expected:**
- Header shows two chips side-by-side.
- URL has two `tag=` params (`?tag=a&tag=b`).
- Removing one leaves the other intact.

**Selectors:**
- Assertion: two `role:button name:/Remove .+ filter/` chips visible

---

## Suite 6 — Add to deck

### 6.1 First-add prompts ConfirmModal when no active deck

**Preconditions:** No active deck (fresh IndexedDB).

**Steps:**
1. Open drawer for Abzan Monument.
2. Click `+ Add to deck`.

**Expected:**
- A `role:dialog` modal appears with title "No active deck" and message "Create a new deck and add 1 copy of this card?".
- Confirm button labeled "Create deck"; cancel labeled "Cancel".

**Selectors:**
- Action: click `role:button name:"Add to deck"`
- Assertion: `role:dialog` visible with `aria-labelledby="confirm-modal-title"`
- Assertion: `role:heading name:"No active deck"` inside the dialog
- Assertion: `role:button name:"Create deck"` visible
- Assertion: `role:button name:"Cancel"` visible

---

### 6.2 Cancel keeps zero cards

**Steps (continuation of 6.1):**
1. Click "Cancel".

**Expected:**
- Modal closes. No deck created. The Add to deck button still shows the no-deck single-CTA form.

**Selectors:**
- Action: click `role:button name:"Cancel"`
- Assertion: `role:dialog` no longer visible
- Assertion: `role:button name:"Add to deck"` still visible (no `[-] [N] [+]` segmented group yet)

---

### 6.3 Confirm creates a deck and adds the card

**Steps (re-do 6.1 then):**
1. Click "Create deck".

**Expected:**
- Modal closes. A new deck called "Untitled Deck" is created in IndexedDB.
- The Add to deck UI in the drawer switches to the `[-] [count] [+]` segmented group.
- Count reads `1`.

**Selectors:**
- Action: click `role:button name:"Create deck"`
- Assertion: `role:group name:"Adjust copies in deck"` visible
- Assertion: `text:"1"` (the count cell) visible inside that group, with `aria-label:"1 in deck"`
- Assertion: `role:button name:"Add one copy"` visible
- Assertion: `role:button name:"Remove one copy"` visible

---

### 6.4 + button increments the count

**Steps:**
1. With ≥1 copy in deck, click `+` (Add one copy) twice.

**Expected:**
- Count cell increments from 1 → 2 → 3.
- IndexedDB deck record reflects the change.

**Selectors:**
- Action: click `role:button name:"Add one copy"` twice
- Assertion: count cell `aria-label:"3 in deck"`

---

### 6.5 Shift+Click adds 4 at a time

**Steps:**
1. With the drawer's `[-] [N] [+]` showing, Shift+Click the `+` button.

**Expected:**
- Count jumps by 4 (e.g. 3 → 7). For the first add when no deck exists, the modal still appears with "4 copies" in the message.

**Selectors:**
- Action: click `role:button name:"Add one copy"` with `{ shiftKey: true }` (Playwright: `.click({ modifiers: ['Shift'] })`)
- Assertion: count cell `aria-label` advances by 4

---

### 6.6 − button decrements (won't go below 0)

**Steps:**
1. Click `−` (Remove one copy) until count reaches 0.

**Expected:**
- Count decrements one per click. At 0, the `−` button and count cell both disappear (only the "Add to deck" CTA remains).

**Selectors:**
- Action: click `role:button name:"Remove one copy"` repeatedly
- Assertion at 0: `role:button name:"Remove one copy"` not visible; `role:button name:"Add to deck"` visible

---

## Suite 7 — Hover preview

### 7.1 Hovering a grid card surfaces a preview after delay

**Steps:**
1. Hover over a card in the grid for ~300ms (do not click).

**Expected:**
- A `data-testid="hover-card-preview"` image fades in, anchored on the right side of the viewport (mode `anchored`).
- The preview width is 440px when no drawer is open, anchored at right=16.
- Moving the mouse off the card removes the preview.

**Selectors:**
- Action: hover `role:button name:/<card name>/`, wait ~300ms
- Assertion: `testid:hover-card-preview` visible
- Action: move mouse off the card
- Assertion: `testid:hover-card-preview` no longer visible

---

### 7.2 Preview shifts left when drawer is open

**Steps:**
1. Open drawer for any card.
2. Hover a different grid card.

**Expected:**
- Preview anchors at right=440 (clearing the drawer), and `hideBelowPx` becomes 1140 so it auto-hides on narrower windows.

**Selectors:**
- Assertion: `testid:hover-card-preview` visible only at viewport widths ≥ 1140px

---

### 7.3 Preview is hidden when image URL is missing

**Steps:**
1. Hover a card lacking an `imageUrl` (rare; e.g. some unfinished records).

**Expected:**
- No preview renders.

**Selectors:**
- Assertion: `testid:hover-card-preview` not in DOM

---

## Suite 8 — Deck panel on browser

The DeckPanel is NOT rendered on the Browser page (`/`). The right rail only shows on the Active Deck page (`/deck`). This suite stays as a reminder until that changes.

### 8.1 Browser page has no deck rail

**Steps:** Land on `/` with any deck state.

**Expected:**
- No DeckPanel widget on the right side.
- Only filter panel (left), grid (center), and — when a card is selected — the CardDetailDrawer (right of grid).

**Selectors:**
- Assertion: `role:button name:"Collapse deck panel"` not visible
- Assertion: `role:button name:"Expand deck panel"` not visible

**Note:** If we later add a third "always-visible deck mini-rail on Browser", port the relevant cases from `2026-05-24-deck-graph-viz-manual-tests.md` Suite 4 (deck panel collapse/expand interactions).

---

## Suite 9 — Keyboard navigation

`useCardNav` (`/Users/Dada/mtg-graph/app/src/lib/useCardNav.ts`) is a drawer-scoped history stack. It does NOT bind arrow keys today — Esc is the only keyboard contract.

### 9.1 Esc closes the drawer

**Steps:**
1. Open drawer for any card.
2. Press `Escape`.

**Expected:**
- Drawer closes; `card=` removed from URL; back stack collapses.

**Selectors:**
- Action: press `Escape`
- Assertion: `role:heading name:/<card name>/` no longer visible

---

### 9.2 Esc inside ConfirmModal cancels the modal

**Preconditions:** Trigger the ConfirmModal via 6.1 (no active deck, click Add to deck).

**Steps:**
1. Press `Escape` while the modal is open.

**Expected:**
- Modal closes (same effect as clicking Cancel). The drawer behind it remains open.

**Selectors:**
- Action: press `Escape`
- Assertion: `role:dialog` no longer visible
- Assertion: `role:heading name:/<card name>/` (drawer) still visible

---

### 9.3 No arrow-key navigation between cards

**Steps:**
1. With the grid focused (after closing the drawer), press `ArrowRight` and `ArrowDown`.

**Expected:**
- No card navigation occurs from arrow keys today. Focus moves via standard browser focus-traversal (Tab/Shift+Tab) only.

**Selectors:**
- TODO: arrow-key inter-card nav is not yet implemented in `useCardNav`. If/when implemented, add cases here to assert that ArrowLeft/Right cycles the drawer through the grid order.

---

## Suite 10 — Top navigation

### 10.1 Three top-nav links: Browse / Decks / Active Deck

**Steps:** Inspect the top `<nav>`.

**Expected:**
- Three `NavLink` elements: "Browse" (to `/`), "Decks" (to `/decks`), "Active Deck" (to `/deck`).
- The link for the current route has `font-semibold` style applied.

**Selectors:**
- Assertion: `role:link name:"Browse"` visible
- Assertion: `role:link name:"Decks"` visible
- Assertion: `role:link name:"Active Deck"` visible

---

### 10.2 Browse link returns to the browser page

**Preconditions:** On `/decks`.

**Steps:** Click "Browse".

**Expected:** Navigates to `/`. The `<N> cards` header shows.

**Selectors:**
- Action: click `role:link name:"Browse"`
- Assertion: `page.url()` ends with `/`
- Assertion: `text:/^\d+ cards$/` visible

---

### 10.3 Decks link goes to decks list

**Steps:** Click "Decks".

**Expected:** Navigates to `/decks`.

**Selectors:**
- Action: click `role:link name:"Decks"`
- Assertion: `page.url()` ends with `/decks`

---

### 10.4 Active Deck link goes to current deck

**Preconditions:** An active deck exists (e.g. via 6.3).

**Steps:** Click "Active Deck".

**Expected:** Navigates to `/deck`. The DeckPanel rail shows on the right.

**Selectors:**
- Action: click `role:link name:"Active Deck"`
- Assertion: `page.url()` ends with `/deck`
- Assertion: `role:button name:"Collapse deck panel"` visible

---

## Out of scope for this manual spec (covered elsewhere or not implemented)

- DeckPanel internals (collapsed state, jump-to-type, name editing, copy-as-text) — covered by `DeckPage` and `DeckPanel` unit tests.
- Arrow-key grid navigation — not implemented (see 9.3).
- Type-line / subtype / keyword / rarity filters — present in `Filter` type but no UI surface in FilterPanel today. Future enhancement.
- Card grid `data-testid` — currently absent (flagged TODO in 1.4).
- CMC max `aria-label` — currently absent (flagged TODO in 2.3).

## Future Playwright translation notes

When lifting this to `app/tests/e2e/browser.spec.ts`:
- Reuse the existing `smoke.spec.ts` pattern: navigate, wait for `^\d+ cards$` text, then drive the UI.
- For Suite 6 deck-state cases, prefer seeding IndexedDB via `page.evaluate(() => { /* useDeckStore.getState().createDeck(...) */ })` rather than walking the modal UI each time.
- For Suite 7 hover-preview cases, `page.locator(selector).hover()` plus a short `waitForTimeout(350)` covers the 300ms scheduled-hover delay.
- For TODO selectors flagged above (`data-testid` on CardGrid, `aria-label` on CMC max input, `data-testid` on TagChip), add the attributes in a small follow-up patch before writing the Playwright spec so the spec can use stable selectors.
