# UI Polish: /decks page, Browser page, FilterPanel

Date: 2026-05-22
Status: Design — pending implementation plan

## Overview

This spec covers seven UI/UX improvements across three areas of the app: the `/decks` page, the Browser page, and the FilterPanel. The goals are (a) a more polished and visually informative decks list, (b) a less cramped browser layout with better card readability, and (c) a richer left-sidebar filter that can express compound interaction queries.

The pipeline and graph data model are untouched. All changes are in `app/`.

## Section 1 — `/decks` page

### Behavior

- The page becomes a navigational list. No "active deck" UI on this page; the radio is removed entirely.
- Each deck is a single row.
- Clicking the **deck name text** swaps it to an inline `<input>` for renaming. Commits on blur / Enter. Cancels on Escape. Matches the existing DeckPanel name-editing pattern.
- Clicking **anywhere else in the row** calls `setActiveDeck(deck.id)` and navigates to `/deck`.
- The **Delete** button on the right uses `stopPropagation` so it never activates the row.
- An **"Active" pill** appears next to the deck name on the currently active deck (the deck whose id equals `activeDeckId`). Purely informational; lets the user see which deck their AddToDeckButton is targeting when they return to /decks.
- Zero decks → existing "No decks yet" empty state. No auto-creation.

### Visual layout

Each row is roughly 56px tall with a 4px color band on the left edge:

```
┌─┬────────────────────────────────────────────┬────────┐
│█│ Boros Convoke v3              [Active]     │ Delete │
│█│ {W}{U}{R} · 60 cards · updated 2d ago      │        │
│█│                                            │        │
└─┴────────────────────────────────────────────┴────────┘
```

- The left color band is a top-to-bottom CSS gradient (`linear-gradient(180deg, ...)`) with one stop per color in `colorIdentity`, ordered WUBRG. Mono-color decks render as a solid band of that color. Empty / colorless decks get a neutral gray.
- Mana pips on the meta line use the existing `<ManaCost>` component, rendering one symbol per color in `colorIdentity` (e.g. `{W}{U}{R}`). One pip per color, not one per card.
- "updated Nd ago" is computed from `deck.updatedAt` via a small relative-time formatter (no new dependency).

### Color computation

New module:

```ts
// app/src/lib/deckColors.ts
export function deckColors(deck: Deck, cards: Map<string, Card>): Color[]
```

Returns the union of every card's `colorIdentity`, sorted in WUBRG order. Pure function, easy to test. Memoized at the page level via `useMemo` keyed on `deck.id, deck.updatedAt`.

### Component changes

- `app/src/pages/DecksPage.tsx` — replace `<li>` markup with the new row structure; remove the radio; wire row click → `setActiveDeck` + `navigate`; scope the rename input to the name text only.
- `app/src/lib/deckColors.ts` — new.

### Tests

- `app/src/lib/deckColors.test.ts` — mixed-color deck, mono deck, empty deck, colorless-only deck.
- Adjust DecksPage tests (if any exist): rename "clicking radio activates deck" → "clicking row activates deck and navigates"; add "clicking the name text enters edit mode" (does not navigate); ensure delete button's click does not activate the row.

## Section 2 — Browser page

### Drawer reserves space (item 4)

Today `CardDetailDrawer` is `position: fixed` with `right-0 top-12`, overlapping the grid. The fix is structural:

- `BrowserPage` becomes a 3-column flex layout: `[FilterPanel 240px] [grid wrapper, flex:1] [CardDetailDrawer 420px]`.
- When `focused` is null, the drawer column unmounts; the grid wrapper expands to fill.
- `CardDetailDrawer` loses its `fixed`/`right-0`/`top-12` classes — it becomes an in-flow flex child.
- The grid wrapper measures its own width **and height** via `ResizeObserver` on a ref. `CardGrid` is passed both measured dimensions instead of the current `window.inner*` math. This replaces the existing one-shot computation, which never updates on window resize — fixing a latent bug.

### Hover preview (item 5)

Hover state lives in `BrowserPage`; `CardGrid` only fires callbacks.

- `CardGrid` accepts `onHoverCard(card | null)`. Per-cell `onMouseEnter` schedules a 300ms timer that calls `onHoverCard(card)`. `onMouseLeave` clears the timer and calls `onHoverCard(null)`. Quick scans don't flash because mouse-leave cancels the pending timer.
- `BrowserPage` owns the `hoveredCard` state and renders the preview at its level, outside `react-window`'s virtualized cells so it can anchor to the viewport.
- Preview is `position: fixed`, `pointer-events: none`, 440px wide. The `pointer-events: none` is critical so clicks pass through to whatever card is underneath.
- Anchor: when `focused` is set (drawer open), preview anchors to the **left** of the drawer (`right: 440px`). When the drawer is closed, preview anchors to the **right edge** of the viewport (`right: 16px`). Vertically centered.
- z-index above the grid but below the drawer.
- The hovered card is cleared whenever `focused` changes (so clicking a card and opening the drawer immediately dismisses any lingering preview).

### Component changes

- `app/src/pages/BrowserPage.tsx` — restructure layout into three columns; lift hover state and render preview at this level; pass measured width to CardGrid.
- `app/src/components/CardGrid.tsx` — accept `onHover(card | null)` prop; wire `onMouseEnter`/`onMouseLeave` with the delay.
- `app/src/components/CardDetailDrawer.tsx` — remove `fixed` positioning, accept width via container.

### Tests

- Playwright e2e: extend the existing smoke to assert "opening the drawer does not cause horizontal overflow" (proxy for the no-overlap fix).
- Component test for CardGrid is optional — hover behavior is too DOM-dependent for RTL to assert cleanly. Skip unless trivial.

## Section 3 — FilterPanel

### Filter shape

`Filter.tags` semantics change from OR to AND. Single line in `app/src/lib/filter.ts`:

```diff
- if (!f.tags.some((id) => cardTagIds.has(id))) return false;
+ if (!f.tags.every((id) => cardTagIds.has(id))) return false;
```

URL-driven `?tag=` params continue to feed the same `tags` array via `effectiveFilter` in BrowserPage. With AND semantics, stacking multiple URL tags now narrows further — fine, since the common case (one tag from InteractionsPanel) is unaffected.

### Panel order

The full FilterPanel section order, top to bottom:

1. Colors *(existing)*
2. CMC max *(existing)*
3. Oracle text *(existing)*
4. Sets *(existing)*
5. Interactions *(new)*
6. Deck themes *(new)*

### "Interactions" section

A new collapsible section in `FilterPanel`. Lists all `tagDef` entries whose `category` is not `'theme'` (the default), grouped by `axis`:

- **Triggers**, **Effects**, **Conditions** — three nested collapsibles, each expanded by default.
- A single search input at the top of the section filters all three sub-groups by tag `label` (case-insensitive substring). Empty search shows everything. The search input debounces at 150ms so typing doesn't thrash re-renders.
- A sub-group with zero matches after search collapses to a one-line "(no matches)" placeholder rather than disappearing — keeps the axis structure visible.
- Tag rows are checkboxes styled like the existing Sets list.
- Selected tags also appear as a "Selected" chip strip at the top of the section, each with an `×` to remove. The strip is also visible when the section is collapsed, so the user always sees what they've selected.

### "Deck themes" section

A second new collapsible. Lists all `tagDef` entries with `category === 'theme'`. Flat list (themes don't split cleanly by axis).

- If an active deck exists, themes that appear on at least one card in the deck are surfaced in a **"Your deck wants"** pinned sub-group at the top of the section. The search input filters across both pinned and unpinned themes (a pinned theme that doesn't match the search drops out of the pinned group; an unpinned one that does match stays in the main list).
- Same search input + selected-chips treatment as Interactions (same 150ms debounce).
- **Zero-result muting:** each unselected theme row renders muted (gray italic + `aria-disabled`) if selecting it would zero out the result set. The check counts `applyFilter(cards, {...effectiveFilter, tags: [...effectiveFilter.tags ?? [], themeId]}).length === 0`. Already-selected themes are never muted (otherwise they'd always read as zero-result against themselves). Muted rows are still clickable so the user can fix the situation by removing other filters; the styling is informational, not a hard disable.

### Shared subcomponents

```
app/src/components/filters/TagFilterSection.tsx
app/src/components/filters/SelectedTagChips.tsx
app/src/lib/deckThemes.ts
```

`TagFilterSection` props:

```ts
{
  title: string;
  tags: TagDef[];
  groupByAxis?: boolean;       // Interactions: true. Themes: false.
  pinnedTagIds?: string[];     // Themes: deck's themes. Interactions: undefined.
  selected: string[];
  onToggle: (tagId: string) => void;
  zeroResultPreview?: (tagId: string) => boolean; // when true → muted style
}
```

`groupByAxis` and `pinnedTagIds` are mutually exclusive in practice — Interactions uses the former, Themes uses the latter. The component does not need to support both simultaneously; if both are passed, `pinnedTagIds` wins.

`deckThemes(deck, cards, catalog)` returns the set of theme tag ids present on cards in the deck, sorted by frequency (descending). Empty deck returns `[]`.

### Performance note

Zero-result muting recomputes a filtered count for every theme on every filter change. With ~4.4k cards and ~20 themes, worst case is ~88k row scans per recompute — empirically fast for Standard, but if profiling shows jank, memoize the base-filtered set once per filter change and then test each theme against that smaller set (turns 88k into ~4.4k + 20·n, where n is the typical post-base-filter card count). The text and search inputs' 150ms debounce already prevents per-keystroke recomputes.

### Tests

- `app/src/lib/filter.test.ts` — extend with AND-mode tests: card with both required tags matches, card with only one does not.
- `app/src/lib/deckThemes.test.ts` — new.
- `app/src/components/filters/TagFilterSection.test.tsx` — new. Asserts: search filters across sub-groups, pinned ids render first, muted rows have `aria-disabled`, chip removal calls `onToggle`.
- Existing FilterPanel test stays green for the original sections.

## Out of scope

- No changes to the pipeline, graph builder, or rule catalog.
- No new tag definitions; the new filter sections operate on the existing catalog.
- No deck-format changes — `deck.cards`, `deck.colorIdentity`, etc. are read-only from the deck store.
- No persistence of filter state across reloads. The filter remains local component state. (URL-driven tag params already persist; that's unchanged.)

## Open questions resolved during brainstorming

- **Theme widget content:** "all themes, with active deck's themes pinned at top, muted rows for zero-result themes." (Q1)
- **Filter semantics:** unify on AND across all `tags` (including URL-driven). (Q2)
- **Filter structure:** grouped by axis + search + selected chips. (Q3)
- **Drawer layout:** reserve space in flex layout. (Q4)
- **Hover preview:** fixed anchor opposite the drawer, 300ms delay, 440px, pointer-events none. (Q5)
- **/decks interaction:** drop the radio entirely; row click activates + navigates; click-name-text edits. (Q6)
- **Deck table design:** card-stack rows with left color band, name + meta stacked, "Active" pill. (Decks mockup)
