# Decks Page — Manual Test Spec

**For:** `/decks` route (DecksPage).
**Source:** `app/src/pages/DecksPage.tsx`, `app/src/stores/deckStore.ts`, `app/src/components/ConfirmModal.tsx`, `app/src/App.tsx`
**Purpose:** Human-runnable smoke tests, structured so each case can later be lifted into a Playwright spec at `app/tests/e2e/decks-page.spec.ts`. Each case names stable selectors (test IDs, ARIA roles, exact text) — those are the contracts the future spec will assert on.

**Test environment:**
- Dev server at `http://localhost:5173`
- Artifact present: `app/public/data/cards-standard.json` (run `npm run build:cards -- --standard` if absent)
- Reset state before suite: open browser devtools → Application → IndexedDB → delete `mtg-graph` database. Also clear `localStorage` key `mtg-graph:activeDeckId`. Reload.

**Selector conventions used below:**
- `role:button name:"New deck"` — ARIA role + accessible name (Playwright: `getByRole('button', { name: 'New deck' })`)
- `testid:foo` — `data-testid` attribute (Playwright: `getByTestId('foo')`)
- `text:"No decks yet."` — visible text match (Playwright: `getByText('No decks yet.')`)
- `role:link name:"Decks"` — `NavLink` rendered as anchor with accessible name
- `selector:li` — raw CSS, for list-row lookup (each deck is an `<li>`)

**Known stable-selector gaps (flagged inline as TODOs):**
- Each deck `<li>` has no `data-testid`, no `role`, and no `aria-label`. Tests must scope by the visible deck name then traverse to the `<li>`. Future enhancement: add `data-testid="deck-row"` + `data-deck-id="<id>"` to each row.
- The "Active" badge is a bare `<span>` with text "Active". No role; matchers must check inner text.
- The mana-color band (left edge of each row) is a bare `<div>` with inline `background` style — no selector; positional/visual-only.
- The `New deck` button has no testid; matched by `role:button name:"New deck"`.
- The inline rename `<input>` has no testid; matched by `role:textbox` scoped to the row, or by `defaultValue`.
- The "Delete" buttons share an accessible name across all rows; tests must scope by the parent `<li>` first.

---

## Suite 1 — Empty state

### 1.1 No decks → empty message

**Preconditions:** Fresh IndexedDB (no decks). `localStorage` cleared.

**Steps:**
1. Navigate to `http://localhost:5173/decks`.

**Expected:**
- Page heading "Decks" visible at top-left.
- "New deck" button visible top-right.
- List body shows the placeholder row "No decks yet.".
- No `<li>` rows for actual decks present.

**Selectors:**
- Assertion: `role:heading name:"Decks"` visible
- Assertion: `role:button name:"New deck"` visible
- Assertion: `text:"No decks yet."` visible
- Assertion: count of `<ul> > li` excluding the placeholder = 0

---

### 1.2 No CTA other than the "New deck" button

**Preconditions:** Empty deck list.

**Steps:** Land on `/decks`.

**Expected:**
- The only call-to-action is the top-right "New deck" button. No separate "Create your first deck" hero.
- Note: this is a deliberate minimal design — the empty-state copy is just "No decks yet." next to the always-visible "New deck" button.

**Selectors:**
- Assertion: `role:button name:"New deck"` is the only visible action.

---

## Suite 2 — Create deck

### 2.1 Click "New deck" creates a deck and navigates to /deck

**Preconditions:** Empty deck list.

**Steps:**
1. Land on `/decks`.
2. Click the "New deck" button.

**Expected:**
- A new deck is persisted (Dexie `decks` table now has 1 row).
- The new deck's `name` is `"Untitled Deck 1"` (the format is `Untitled Deck ${decks.length + 1}` at creation time).
- The new deck becomes the active deck (`localStorage["mtg-graph:activeDeckId"]` set; `useDeckStore.activeDeckId` matches new id).
- URL changes to `/deck` (programmatic navigation via `useNavigate`).

**Selectors:**
- Action: click `role:button name:"New deck"`
- Assertion: `page.url()` pathname is `/deck`
- Assertion: `localStorage.getItem('mtg-graph:activeDeckId')` is non-null
- Assertion (after navigating back to `/decks`): `text:"Untitled Deck 1"` visible

---

### 2.2 Second deck increments the default name

**Preconditions:** One deck already exists named "Untitled Deck 1".

**Steps:**
1. Navigate to `/decks`.
2. Click "New deck".
3. Navigate back to `/decks`.

**Expected:**
- A second `<li>` row appears with name "Untitled Deck 2".
- The new deck is now active (replaces the previous active marker).

**Selectors:**
- Action: click `role:button name:"New deck"`
- Assertion: `text:"Untitled Deck 2"` visible
- Assertion: the `<li>` containing "Untitled Deck 2" also contains `text:"Active"`
- Assertion: the `<li>` containing "Untitled Deck 1" does NOT contain `text:"Active"`

---

## Suite 3 — Deck list rendering

**Preconditions for cases 3.x:** Seed three decks via the UI or via `useDeckStore.getState().createDeck`. Add a few cards to each so they have non-zero color identity and card counts. Example:
- "Mono-Red Aggro" — 4× Lightning Bolt-like creature (R)
- "Azorius Control" — 2× Counterspell, 2× a W creature (W, U)
- "Empty Brew" — 0 cards

Make "Azorius Control" the active deck.

### 3.1 Each deck renders as a row with name, count, colors, and updated time

**Steps:** Land on `/decks`.

**Expected:** For each deck, the `<li>` contains:
- The deck `name` rendered as a `<span>` with class `font-semibold`.
- A color band (left edge `<div>` 1px wide) whose gradient reflects the deck's `colorIdentity` (from `deckColors(deck, cards)`).
- A `<ManaCost>` rendering of the color identity (e.g. `{W}{U}` for Azorius). Plain text colors aren't expected — symbols only.
- Footer text: `"· N cards · updated <relative time>"` where N is the sum of `card.count` and the relative time is from `relativeTime(d.updatedAt)` (e.g. "just now", "5 minutes ago").
- A "Delete" button on the right.

**Selectors:**
- Assertion: `text:"Azorius Control"` visible
- Assertion: the `<li>` containing "Azorius Control" matches `text:/· \d+ cards · updated/`
- Assertion: the `<li>` containing "Empty Brew" matches `text:"· 0 cards · updated"`
- Assertion: each `<li>` contains a `role:button name:"Delete"`
- TODO (selector gap): the `<ManaCost>` element has no testid. Future enhancement: add `data-testid="deck-row-colors"` so tests can assert which symbols rendered. For now, snapshot inner text or count `<img>` symbols.

---

### 3.2 Active deck shows an "Active" badge

**Preconditions:** "Azorius Control" is the active deck.

**Steps:** Land on `/decks`.

**Expected:**
- The `<li>` for "Azorius Control" contains an inline `<span>` with visible text "Active" (uppercased via CSS) and amber background styling.
- Non-active deck rows do NOT contain the text "Active".

**Selectors:**
- Assertion: the `<li>` containing `text:"Azorius Control"` also contains `text:"Active"`
- Assertion: the `<li>` containing `text:"Mono-Red Aggro"` does NOT contain `text:"Active"`
- TODO (selector gap): the "Active" badge has no `data-testid` or `role`. Future enhancement: `data-testid="active-badge"` or `aria-label="active deck"`.

---

### 3.3 Empty-deck row shows "0 cards"

**Steps:** Land on `/decks` with "Empty Brew" present.

**Expected:**
- "Empty Brew" row's footer reads `"· 0 cards · updated <time>"`.
- Its color band defaults to gray (`#444`) since `deckColors` returns `[]`.

**Selectors:**
- Assertion: the `<li>` containing `text:"Empty Brew"` matches `text:/· 0 cards · updated/`

---

## Suite 4 — Set active deck

### 4.1 Clicking a deck row activates and navigates

**Preconditions:** Two decks. Neither is active (clear `localStorage["mtg-graph:activeDeckId"]` and reload).

**Steps:**
1. Land on `/decks`.
2. Click anywhere on the "Mono-Red Aggro" row (not on the name span, not on Delete — e.g. click the row body padding area).

**Expected:**
- `useDeckStore.activeDeckId` is set to the Mono-Red deck's id.
- `localStorage["mtg-graph:activeDeckId"]` is updated to the same id.
- URL navigates to `/deck` (via `useNavigate('/deck')`).

**Selectors:**
- Action: click the `<li>` containing `text:"Mono-Red Aggro"` (Playwright: `page.getByText('Mono-Red Aggro').locator('xpath=ancestor::li').click()`)
- Assertion: `page.url()` pathname is `/deck`
- Assertion: `localStorage.getItem('mtg-graph:activeDeckId')` equals the Mono-Red deck's id

---

### 4.2 Clicking another row switches the active deck

**Preconditions:** "Azorius Control" is active.

**Steps:**
1. Land on `/decks`.
2. Click the "Mono-Red Aggro" row.
3. Navigate back to `/decks`.

**Expected:**
- "Mono-Red Aggro" now has the "Active" badge.
- "Azorius Control" no longer has the badge.
- `localStorage["mtg-graph:activeDeckId"]` updated to Mono-Red's id.

**Selectors:**
- Action: click the `<li>` for "Mono-Red Aggro"
- Assertion (after returning to `/decks`): the `<li>` for "Mono-Red Aggro" contains `text:"Active"`
- Assertion: the `<li>` for "Azorius Control" does NOT contain `text:"Active"`

---

### 4.3 Clicking the name span does NOT activate or navigate (enters rename mode)

**Preconditions:** Active deck is unset.

**Steps:**
1. Land on `/decks`.
2. Click directly on the name text "Mono-Red Aggro".

**Expected:**
- The click is captured by the span's `onClick` with `e.stopPropagation()`; the row's `onClick` (which would activate + navigate) does NOT fire.
- The name swaps to an editable `<input>` (rename mode — covered in Suite 5).
- URL stays on `/decks`.
- `activeDeckId` is unchanged.

**Selectors:**
- Action: click `text:"Mono-Red Aggro"` (the span, not the row)
- Assertion: an `<input>` with `defaultValue="Mono-Red Aggro"` is visible
- Assertion: `page.url()` pathname is still `/decks`

---

### 4.4 Clicking the Delete button does NOT activate or navigate

**Preconditions:** Active deck is unset.

**Steps:**
1. Land on `/decks`.
2. Click the "Delete" button on the "Mono-Red Aggro" row.

**Expected:**
- The click is captured by the button's `onClick` with `e.stopPropagation()`; the row's `onClick` does NOT fire.
- Confirmation modal appears (Suite 6).
- `activeDeckId` is unchanged.
- URL stays on `/decks`.

**Selectors:**
- Action: scope to the `<li>` for "Mono-Red Aggro", then click `role:button name:"Delete"` inside
- Assertion: `role:dialog` visible with title "Delete deck?"
- Assertion: `page.url()` pathname is still `/decks`

---

## Suite 5 — Rename deck (inline edit)

### 5.1 Clicking the name span enters edit mode

**Steps:**
1. Land on `/decks`.
2. Click the name text "Mono-Red Aggro".

**Expected:**
- The `<span>` is replaced by an `<input>` with `autoFocus`, `defaultValue="Mono-Red Aggro"`.
- The input has the same row context (Delete button still visible alongside).

**Selectors:**
- Action: click `text:"Mono-Red Aggro"`
- Assertion: `role:textbox` with `defaultValue="Mono-Red Aggro"` visible
- Assertion: the input is focused (`document.activeElement === input`)

---

### 5.2 Typing a new name and blurring commits the rename

**Steps:**
1. Enter edit mode on "Mono-Red Aggro" (Suite 5.1).
2. Clear the field and type "Burn Deck".
3. Click outside the input (blur).

**Expected:**
- `renameDeck(id, "Burn Deck")` runs; the deck's `name` updates and `updatedAt` is bumped.
- Input is replaced by a `<span>` showing "Burn Deck".
- Row's relative-time footer may now read "just now".
- Persisted to Dexie (`db.decks.get(id).name === "Burn Deck"`).

**Selectors:**
- Action: change input value, then click outside (or programmatically blur)
- Assertion: `text:"Burn Deck"` visible
- Assertion: `text:"Mono-Red Aggro"` NOT visible

---

### 5.3 Enter key blurs (and commits)

**Steps:**
1. Enter edit mode.
2. Change value to "Quick Burn".
3. Press Enter.

**Expected:**
- The Enter handler calls `(e.target as HTMLInputElement).blur()`, which triggers the same commit flow as 5.2.
- Name renders as "Quick Burn".

**Selectors:**
- Action: type then press Enter
- Assertion: `text:"Quick Burn"` visible

---

### 5.4 Escape cancels edit without committing

**Steps:**
1. Enter edit mode on "Quick Burn".
2. Change value to "Garbage Name".
3. Press Escape.

**Expected:**
- `setEditingId(null)` runs without calling `renameDeck`.
- Original name "Quick Burn" is still shown (the input was a `defaultValue` not a controlled value, so its visual state was changing but the deck's stored name was untouched).

**Selectors:**
- Action: type "Garbage Name", press Escape
- Assertion: `text:"Quick Burn"` visible
- Assertion: `text:"Garbage Name"` NOT visible

---

### 5.5 Blur with empty or unchanged value is a no-op

**Steps:**
1. Enter edit mode on "Quick Burn".
2. Clear the input completely (empty string).
3. Click outside (blur).

**Expected:**
- The blur handler short-circuits because `e.target.value.trim()` is falsy.
- Name remains "Quick Burn" (no rename, no `updatedAt` bump).

Repeat with the input unchanged (still "Quick Burn"):
- Blur handler short-circuits because `e.target.value !== d.name` is false.
- No rename fires.

**Selectors:**
- Action: clear input, blur
- Assertion: `text:"Quick Burn"` still visible

---

### 5.6 Clicking the input itself does NOT navigate

**Steps:**
1. Enter edit mode.
2. Click inside the input field.

**Expected:**
- The input's `onClick` calls `e.stopPropagation()`, so the row's `onClick` (activate + navigate) does NOT fire.
- URL stays on `/decks`. Input remains focused.

**Selectors:**
- Action: click the input element
- Assertion: `page.url()` pathname is still `/decks`

---

## Suite 6 — Delete deck (with confirmation)

### 6.1 Delete button opens a confirmation modal

**Steps:**
1. Land on `/decks` with at least one deck.
2. Click the "Delete" button on the "Burn Deck" row.

**Expected:**
- A `role:dialog` appears centered with backdrop.
- Dialog title: "Delete deck?".
- Dialog body contains: "Delete " + the deck name (bold) + "? This cannot be undone."
- Two buttons: "Cancel" and "Delete" (the destructive variant — red background).
- Background scroll is overlaid by the modal backdrop.

**Selectors:**
- Action: scope to `<li>` containing "Burn Deck", click `role:button name:"Delete"` inside
- Assertion: `role:dialog` visible with `aria-modal="true"` and `aria-labelledby="confirm-modal-title"`
- Assertion: `role:heading name:"Delete deck?"` visible (id `confirm-modal-title`)
- Assertion: dialog text contains "Burn Deck" and "This cannot be undone."
- Assertion: `role:button name:"Cancel"` and `role:button name:"Delete"` both visible in dialog

---

### 6.2 Cancel keeps the deck

**Steps (continuation of 6.1):**
1. Click "Cancel" in the dialog.

**Expected:**
- Dialog disappears.
- "Burn Deck" row still present in the list.
- Dexie row not removed.

**Selectors:**
- Action: click `role:button name:"Cancel"` inside the dialog
- Assertion: `role:dialog` no longer visible
- Assertion: `text:"Burn Deck"` still visible

---

### 6.3 Backdrop click cancels (modal `onClick` on backdrop calls onCancel)

**Steps:**
1. Open the delete confirmation for "Burn Deck".
2. Click the dark backdrop area outside the dialog box.

**Expected:**
- Dialog dismisses. The backdrop has `onClick={onCancel}`; the inner dialog stops propagation so backdrop clicks only fire outside the box.
- Deck NOT deleted.

**Selectors:**
- Action: click the backdrop (CSS: `.fixed.inset-0.z-50` outside the inner box)
- Assertion: `role:dialog` no longer visible
- Assertion: `text:"Burn Deck"` still visible

---

### 6.4 Escape key cancels

**Steps:**
1. Open the delete confirmation for "Burn Deck".
2. Press Escape.

**Expected:**
- `ConfirmModal`'s keydown listener calls `onCancel`. Dialog dismisses.
- Deck NOT deleted.

**Selectors:**
- Action: press Escape
- Assertion: `role:dialog` no longer visible
- Assertion: `text:"Burn Deck"` still visible

---

### 6.5 Confirm deletes the deck (non-active)

**Preconditions:** "Burn Deck" exists and is NOT the active deck.

**Steps:**
1. Open delete confirmation for "Burn Deck".
2. Click the red "Delete" button.

**Expected:**
- `deleteDeck(id)` runs, removing the row from Dexie.
- Dialog closes.
- "Burn Deck" row disappears from the list.
- `activeDeckId` unchanged (since we deleted a non-active deck).

**Selectors:**
- Action: click `role:button name:"Delete"` inside the dialog
- Assertion: `role:dialog` no longer visible
- Assertion: `text:"Burn Deck"` not visible
- Assertion: `localStorage.getItem('mtg-graph:activeDeckId')` unchanged

---

### 6.6 Deleting the ACTIVE deck clears `activeDeckId`

**Preconditions:** "Azorius Control" exists and IS the active deck.

**Steps:**
1. Click "Delete" on "Azorius Control" row.
2. Confirm.

**Expected:**
- Deck removed from Dexie and the list.
- `useDeckStore.activeDeckId` becomes `null`.
- `localStorage["mtg-graph:activeDeckId"]` is removed (key not present).
- Other decks remain; none auto-promoted to active.

**Selectors:**
- Action: confirm delete on the active deck
- Assertion: `localStorage.getItem('mtg-graph:activeDeckId')` is `null`
- Assertion: no `<li>` in the list contains `text:"Active"`

---

## Suite 7 — Navigate to deck details

### 7.1 Clicking a non-active deck row navigates to `/deck`

Already covered by Suite 4.1 (the activation + navigation are coupled in `openDeck`).

**Selectors:**
- Action: click an `<li>` (off the name span and off the Delete button)
- Assertion: `page.url()` pathname is `/deck`

---

### 7.2 Clicking the active deck row still navigates to `/deck`

**Preconditions:** "Azorius Control" is active.

**Steps:**
1. Land on `/decks`.
2. Click the "Azorius Control" row.

**Expected:**
- `setActiveDeck(id)` runs (re-setting the same id is a no-op for the store but still writes to `localStorage`).
- `navigate('/deck')` fires.
- URL changes to `/deck`.

**Selectors:**
- Action: click the `<li>` for "Azorius Control"
- Assertion: `page.url()` pathname is `/deck`

---

### 7.3 No direct link to `/deck/graph` from `/decks`

**Steps:** Inspect the page for links.

**Expected:**
- `/decks` only routes the user to `/deck` (List view), not directly to `/deck/graph`. The List→Graph toggle lives on the DeckPage / DeckGraphPage header.
- Not a bug; just documenting the current navigation contract.

**Selectors:**
- Assertion: no `role:link name:"Graph"` rendered on `/decks`

---

## Suite 8 — Persistence

### 8.1 Reload preserves deck list (IndexedDB)

**Preconditions:** Create three decks via the UI.

**Steps:**
1. Land on `/decks`. Verify all three rows present.
2. Reload (Cmd+R).

**Expected:**
- After reload, `useDeckStore.load()` runs from `App.tsx`'s mount effect, reading from Dexie.
- All three deck rows re-render with their names, counts, and updated times.

**Selectors:**
- Action: `page.reload()`
- Assertion: all three deck names visible in their `<li>` rows

---

### 8.2 Reload preserves the active deck (localStorage)

**Preconditions:** "Azorius Control" is active.

**Steps:**
1. Land on `/decks`. Verify the "Active" badge on the Azorius row.
2. Reload.

**Expected:**
- `activeDeckId` is restored synchronously from `localStorage["mtg-graph:activeDeckId"]` on store init (`readActiveDeckId()`).
- After Dexie load completes, the id is validated and kept since the deck still exists.
- The "Active" badge re-renders on the Azorius row.

**Selectors:**
- Action: `page.reload()`
- Assertion: the `<li>` for "Azorius Control" contains `text:"Active"`
- Assertion: `localStorage.getItem('mtg-graph:activeDeckId')` unchanged

---

### 8.3 Stale localStorage active-id is dropped if the deck is gone

**Preconditions:**
1. Create a deck "Ghost", set it active.
2. In devtools, delete only the Ghost row from IndexedDB → Application → IndexedDB → `mtg-graph` → `decks`. Leave `localStorage["mtg-graph:activeDeckId"]` pointing at it.

**Steps:**
1. Reload `/decks`.

**Expected:**
- `load()` reads decks; finds no row matching the stored id.
- `activeDeckId` is set to `null`; `localStorage["mtg-graph:activeDeckId"]` is removed (key deleted, not set to "null").
- No "Active" badge anywhere in the rendered list.

**Selectors:**
- Action: `page.reload()` (after manual Dexie tampering)
- Assertion: `localStorage.getItem('mtg-graph:activeDeckId')` is `null`
- Assertion: no `<li>` contains `text:"Active"`

---

### 8.4 Rename persists across reload

**Steps:**
1. Rename "Mono-Red Aggro" → "Quick Burn" via Suite 5.
2. Reload.

**Expected:**
- After reload, the row shows "Quick Burn", confirming `persist(deck)` wrote through to Dexie.

**Selectors:**
- Assertion (post-reload): `text:"Quick Burn"` visible

---

### 8.5 Delete persists across reload

**Steps:**
1. Delete "Quick Burn" via Suite 6.
2. Reload.

**Expected:**
- The row is gone post-reload (Dexie row removed).

**Selectors:**
- Assertion (post-reload): `text:"Quick Burn"` not visible

---

## Suite 9 — Top nav

The top navigation lives in `App.tsx` and renders three `NavLink`s. It is present on every route, including `/decks`.

### 9.1 Three nav links render

**Steps:** Land on `/decks`.

**Expected:**
- Nav contains three links with these accessible names and hrefs:
  - "Browse" → `/`
  - "Decks" → `/decks`
  - "Active Deck" → `/deck`
- Active route (`/decks`) renders the "Decks" link with class `font-semibold` (the `NavLink` active class).

**Selectors:**
- Assertion: `role:link name:"Browse"` has `href="/"`
- Assertion: `role:link name:"Decks"` has `href="/decks"`
- Assertion: `role:link name:"Active Deck"` has `href="/deck"`
- Assertion: `role:link name:"Decks"` has class matching `/font-semibold/`

---

### 9.2 Browse link navigates to `/`

**Steps:** Click the "Browse" nav link.

**Expected:** URL pathname becomes `/`. Browse page renders.

**Selectors:**
- Action: click `role:link name:"Browse"`
- Assertion: `page.url()` pathname is `/`

---

### 9.3 Active Deck link navigates to `/deck`

**Steps:** Click the "Active Deck" nav link.

**Expected:** URL pathname becomes `/deck`. If an active deck is set, the DeckPage renders for it. If not, DeckPage's empty state shows (separate from `/decks` empty state).

**Selectors:**
- Action: click `role:link name:"Active Deck"`
- Assertion: `page.url()` pathname is `/deck`

---

### 9.4 Decks link is a no-op when already on `/decks`

**Steps:** On `/decks`, click the "Decks" nav link.

**Expected:** URL stays `/decks`. No re-mount visible to the user beyond router re-render.

**Selectors:**
- Action: click `role:link name:"Decks"`
- Assertion: `page.url()` pathname is `/decks`

---

## Out of scope for this manual spec (covered by unit tests or not implemented)

- The DeckPage / DeckGraphPage UI — covered by `2026-05-24-deck-graph-viz-manual-tests.md`.
- Card-add / card-remove flows on a deck — handled in BrowserPage tooltip and DeckPanel, not DecksPage.
- Format gating (`format: 'standard'`) — set automatically at create time; no UI to change it.
- Deck duplicate / clone — not implemented in v1.
- Deck export (TXT / JSON) — not surfaced from `/decks`; lives on DeckPage.
- Drag-to-reorder decks — not implemented; rows render in Dexie insertion order.
- Search / filter the deck list — not implemented in v1.

## Future Playwright translation notes

When lifting this to `app/tests/e2e/decks-page.spec.ts`:
- Reuse the smoke-spec pattern: navigate, wait for hydration via the `^\d+ cards$` text on `/`, then click "Decks" in the nav and assert from there.
- Seed deck state directly via `page.evaluate(() => { ... })` calling `useDeckStore.getState().createDeck('...')` and `addCard(...)` — UI-driven seeding is too slow for many cases.
- Reset state per test with `page.evaluate(async () => { await indexedDB.deleteDatabase('mtg-graph'); localStorage.removeItem('mtg-graph:activeDeckId'); })`, then reload.
- For row-scoped clicks, prefer `page.getByText('<deck name>').locator('xpath=ancestor::li')` until rows gain a `data-testid` (see selector-gap TODOs at the top).
- For Suite 6 (delete modal), the ConfirmModal renders as a fixed-position overlay — `page.getByRole('dialog')` will return it; `getByRole('button', { name: 'Delete' })` inside that dialog targets the destructive confirm button (distinct from the row's "Delete" button).
- For Suite 5 (rename), `page.getByDisplayValue('Old Name')` is the simplest input selector since there's no testid.
- For Suite 8 (persistence), use `page.reload()` and re-assert; the `App.tsx` mount effect re-runs `useDeckStore.getState().load()`.
