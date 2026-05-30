# Workspace Page Merge — collapse `/` and `/deck` into one route

**Date:** 2026-05-28
**Status:** Approved direction

## Purpose

Today the app has two near-identical browsing pages (`/` and `/deck`) whose only structural difference is whether the right-side `DeckPanel` rail and the action bar are rendered. The split forces every "go look at cards" interaction to pick a side — and historically, that pick has caused bugs (theme chips on `/deck` jumping to `/` and dropping the deck rail; see `fix(nav): preserve route when clicking theme/interaction tag chips`, commit `e661e0d`).

Collapse the two pages into a single Workspace at `/`. Page chrome adapts on `activeDeckId`: rail and action bar appear when a deck is active, disappear when it isn't. This matches the user's mental model: "you either have a deck active or you don't."

## Routes

After the change:

```
/         — Workspace (BrowserShell + conditional deck chrome)
/decks    — Deck list (unchanged)
/graph    — Active-deck force-directed graph view (was /deck/graph)
```

`/deck` and `/deck/graph` are removed entirely. No redirects: this app has no backend, no public links, no bookmarks worth preserving.

## Top nav

```
Browse | Decks  [| {active deck name}]
```

The third item appears only when `activeDeckId` is set. It's a plain text indicator (`<span>`), not a `<NavLink>` — clicking it does nothing because the rail is already visible on `/`. The label is the active deck's name from `deckStore`. This solves the discoverability problem ("which deck am I looking at?") without inventing a deck-switcher widget.

If/when a deck-switcher is wanted later, this spot becomes the natural anchor for the dropdown.

## Workspace page (`/`)

One component file. Conceptually two render states driven by `activeDeckId`:

**No active deck** — identical to today's `BrowserPage`:
- No action bar, no `ImportSummary`.
- `BrowserShell` mounted with no `rightRail`.
- `showHoverPreview` on.

**Active deck** — identical to today's `DeckPage`:
- Action bar strip between top nav and `BrowserShell`: `FillManaButton`, `GoldfishButton`, List/Graph toggle.
  - The List/Graph toggle's "Graph" link points at `/graph` (renamed from `/deck/graph`).
- `ImportSummary` immediately below the action bar.
- `BrowserShell` mounted with `rightRail={({ onCardClick, drawerOpen }) => <DeckPanel ... />}`.
- Cmd-S handler installed (save active deck if dirty).
- `<Toast />` rendered at the bottom.

The `BrowserShell` invocation itself is the same in both branches — `BrowserShell` already owns URL tag filtering (after Part 1's refactor, commit `e661e0d`), so neither branch needs to handle it.

`showHoverPreview` stays on in the no-deck branch (today's behavior). The active-deck branch leaves it off (today's `DeckPage` doesn't pass it) — `DeckPanel`/`InteractionsPanel` render their own anchored hover previews already.

## Deck activation flow

- `/decks` page: when the user clicks a deck card, it sets `activeDeckId` and routes to `/` (was `/deck`).
- New-deck creation auto-activates and routes to `/` (was `/deck`).
- No new "clear active deck" affordance: switching means picking a different deck on `/decks` or deleting the current active deck. Matches existing behavior.

## Migration / cleanup

| File | Change |
|---|---|
| `app/src/pages/DeckPage.tsx` | Delete. Logic moves into the workspace page. |
| `app/src/pages/BrowserPage.tsx` | Rename to `WorkspacePage.tsx` (git rename) and replace contents. The semantic role has shifted — "browse" was the no-deck-active mode, "workspace" covers both. |
| `app/src/App.tsx` | Drop the `/deck` and `/deck/graph` routes. Add `/graph` route. Update the top nav: remove the "Active Deck" `NavLink`; add the conditional active-deck-name indicator. |
| `app/src/pages/DecksPage.tsx` | Change `navigate('/deck')` to `navigate('/')` in the activation handler. |
| `app/src/pages/DeckGraphPage.tsx` | Any internal links pointing back to `/deck` switch to `/`. |
| `app/src/wizard/selectors.ts` | `TOUR_IDS.navActiveDeck` — repurpose for the breadcrumb element (so the existing tour step still has a target) or drop if no tour step references it. Verify during implementation by grepping `navActiveDeck`. |
| `app/src/wizard/tours.ts` | Update any step that referenced the removed "Active Deck" link. |

## Tests

- `app/src/pages/DeckPage.test.tsx` — port the Cmd-S coverage to the new workspace page's test file. Same behavior, same setup.
- Add a workspace page test: with no `activeDeckId`, the action bar and rail are not rendered; with an `activeDeckId`, both render.
- Add an `App.tsx`-level (or top-nav) test: the active-deck breadcrumb appears when `activeDeckId` is set and shows the active deck's name.
- `app/src/pages/DecksPage.test.tsx` — assert post-click navigation goes to `/`, not `/deck`.
- Existing `BrowserShell` tests are untouched.

## Out of scope

- Deck-switcher dropdown in the nav (Q2 option C). Defer until there's a real "user has many decks" usability gap.
- Folding `/graph` into a query-param mode of `/` (Q4 option C). The two views render genuinely different things (CardGrid vs. force simulation); folding them would be more refactor than the URL cleanup is worth.
- Any visual restyling of the rail, action bar, or BrowserShell layout.
- Any backend, sharing, or auth concerns — none exist in this app.

## Risks and unknowns

- **Tour selector drift.** If `TOUR_IDS.navActiveDeck` is referenced in `wizard/tours.ts` as a tour step target, removing the nav link silently breaks the tour. Mitigation: grep during implementation and explicitly handle (repurpose for breadcrumb, or remove the step).
- **DeckGraphPage assumptions.** The graph page may rely on being navigated to from `/deck` (e.g., for the "back" button or breadcrumb). The implementation step should grep `/deck` references inside `DeckGraphPage.tsx` and update them.
- **localStorage `activeDeckId` hydration timing.** `deckStore.load()` populates `activeDeckId` asynchronously from IndexedDB. The workspace page must handle the transient "no active deck yet" state at mount without flashing a stale render. Today's `DeckPage` already deals with this because the rail just doesn't render when there's no active deck; the merged page inherits the same behavior, so no new mitigation needed.
