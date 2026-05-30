# Wizard Onboarding Design

**Status:** Draft
**Date:** 2026-05-26
**Owner:** Michael Rosata

## Goal

Give first-time visitors a guided walkthrough of the app: one global intro covering what the site is and how its top nav works, plus a short per-page tour the first time a user visits each page. Tours are skippable; a help icon in the nav lets users replay any tour on demand. Seen-state persists in localStorage.

## Non-goals

- Mobile/narrow-viewport tour support. Below 768px wide, tours are suppressed and the help menu shows a "best on a wider screen" hint.
- Persistent server-side seen-state. No backend exists, and one isn't planned for this feature.
- Multi-language copy. English only.
- In-tour interactivity beyond Next / Back / Skip / Close. No "try clicking this filter now and we'll wait" branching.
- Analytics on tour completion. Add later if needed.

## User stories

- As a brand-new visitor, the first time I load `/`, I see a 5-step intro explaining what the site does and what each nav tab is for, with an explicit Skip button.
- As a returning visitor on Browse who has never seen the Browse-specific tour, I see a short tour (4 steps) the first time I land on `/`.
- As a user who skipped the intro and wants to revisit it later, I click a "?" icon in the nav and choose "Show app intro" from a small popover.
- As a user reading the current page who wants a refresher on its features, I click the "?" icon and choose "Show {Page} tour".

## Approach

`react-joyride` (~25kb gz) drives the overlay, spotlight cutout, and tooltip. One `<Joyride>` instance is mounted at the app root and controlled by a Zustand store. Tour steps reference DOM elements by stable `data-tour-id` attributes rather than CSS class names, so refactors don't silently break tours.

Tours are a small registry (`tours.ts`) keyed by `TourId`. Auto-start logic on route change consults the store; if no tour is active and a relevant tour is unseen, the store opens it. The help menu replays tours on demand without unsetting their seen-state.

## Architecture

```
app/src/wizard/
  WizardProvider.tsx     # Mounts <Joyride>; reads activeTour/stepIndex from store
  wizardStore.ts         # Zustand: activeTour, stepIndex, seenTours
  tours.ts               # TOURS: Record<TourId, Step[]>
  useAutoStartTour.ts    # On route change, decide whether to open a tour
  HelpMenu.tsx           # The "?" button + 2-item popover in the nav
  selectors.ts           # Centralized data-tour-id="..." constants
```

**Tour IDs:** `'global' | 'browse' | 'decks' | 'active-deck' | 'deck-graph'`.

**Mounting:** `App.tsx` wraps its routes in `<WizardProvider>`. The provider mounts `<Joyride>` once and calls `useAutoStartTour()` to react to route changes.

**Target selectors:** Throughout the app, key UI elements carry a `data-tour-id="..."` attribute. The `selectors.ts` module exports string constants (`FILTER_PANEL = 'filter-panel'` etc.) used both by the component that sets the attribute and by the tour steps that reference it. One source of truth.

## State model

```ts
type TourId = 'global' | 'browse' | 'decks' | 'active-deck' | 'deck-graph';

type WizardState = {
  activeTour: TourId | null;
  stepIndex: number;
  seenTours: Set<TourId>;
  openTour: (id: TourId, opts?: { reset?: boolean }) => void;
  closeTour: () => void;
  skipAll: () => void;            // skip path: mark every tour seen
  markSeen: (id: TourId) => void;
  setStepIndex: (i: number) => void;
};
```

- `seenTours` is initialized from `localStorage['mtg-graph:seen-tours:v1']` on store creation.
- Every write to `seenTours` is persisted back. Wrapped in try/catch — if localStorage is unavailable (private browsing in some configurations), the store stays in-memory.
- `openTour(id, { reset: true })` replays an already-seen tour without removing it from `seenTours`.

**Back-to-back tour suppression** is achieved structurally rather than with a flag: `useAutoStartTour`'s effect is keyed on `[location.pathname]` only. When a tour completes the store updates `activeTour` and `seenTours`, but the effect does NOT re-fire on those changes — the user stays on the same route, the same effect dependency. So the next page-tour evaluation only happens when the user actually navigates. No flag needed.

## localStorage schema

Key: `mtg-graph:seen-tours:v1`
Value: JSON-serialized array of tour IDs, e.g. `["global","browse"]`.

The `:v1` suffix is reserved for material content changes. Bumping to `:v2` causes the old key to be ignored — users see the rewritten tour content on next visit. We do NOT migrate; the cost of replaying a tour is trivial.

## Auto-start logic

```
useAutoStartTour() runs in WizardProvider, listens to useLocation():

// Effect deps: [location.pathname]. Runs on initial mount and on every
// navigation. Does NOT run when activeTour or seenTours change.

on pathname change (or mount):
  if activeTour != null: return            // tour mid-flight (user navigated mid-tour)
  if viewportWidth < 768: return           // narrow-viewport guard
  if graphStore.status != 'ready' && route requires graph data: return

  if 'global' not in seenTours:
    openTour('global')
  else if currentRouteTour not in seenTours:
    openTour(currentRouteTour)
```

Route → tour mapping:
- `/` → `browse`
- `/decks` → `decks`
- `/deck` → `active-deck`
- `/deck/graph` → `deck-graph`

A 200ms delay (`requestAnimationFrame` + `setTimeout`) between route mount and `openTour` lets the page render its `data-tour-id` elements before Joyride looks for them. The `global` tour's targets (nav links + help icon) render eagerly so it can open without the delay; the delay only applies to page tours.

## Joyride callback handling

```
on Joyride callback (data: CallBackProps):
  if data.status === 'finished':
    markSeen(activeTour)
    closeTour()
  else if data.status === 'skipped':
    skipAll()
    closeTour()
  else if data.action === 'close':
    markSeen(activeTour)                // dismiss-mid-tour means "I've seen enough"
    closeTour()
  else if data.type === 'step:after':
    setStepIndex(data.index + 1)
  else if data.type === 'error:target_not_found':
    console.warn(`[wizard] step ${activeTour}:${data.index} target not found, skipping`)
    setStepIndex(data.index + 1)
```

## Tour content

### `global` — 5 steps, runs once on first visit

Step 1 is a centered modal-style step (`placement: 'center'`, no target). Steps 2–5 point at nav elements.

1. **Welcome to MTG Graph** — "A tag-driven interaction graph over Standard. ~4,400 cards tagged across ~91 mechanics, ~340K interactions. Use it to discover cards that play together and build decks around them."
2. **Browse** *(target: Browse tab)* — "Filter the card pool by color, type, mana cost, set, and — most powerfully — by mechanic tags."
3. **Decks** *(target: Decks tab)* — "Your saved decks live here. Create, import, or delete decks."
4. **Active Deck** *(target: Active Deck tab)* — "The deck you're currently building. View, edit, see the mana curve, and visualize interactions as a graph."
5. **Help** *(target: help "?" icon)* — "Click here anytime to replay this intro or the tour for the page you're on."

### `browse` — 3 steps

1. **Filter panel** *(target: filter-panel)* — "Narrow down ~4,400 cards. Each section (colors, type, tags) is AND-combined."
2. **Tag filters** *(target: tag-filter-section)* — "Tags are the killer feature. Pick `effect.removal_destroy` and you'll get every Standard card that destroys a permanent."
3. **Card grid** *(target: card-grid)* — "Hover for a quick preview, click for full details. The detail drawer opens on the right and shows oracle text, every tag this card has, and a list of cards in Standard it *interacts with* — pulled from the graph."

(The original sketch had four steps; we folded the "drawer" step into the "grid" step to avoid pointing at UI that only exists after the user clicks a card.)

### `decks` — 3 steps

1. **Deck list** *(target: deck-list)* — "Your saved decks. Click one to make it active."
2. **New deck** *(target: new-deck-button)* — "Start an empty deck, then build it from the Browse page."
3. **Import** *(target: import-button)* — "Paste a Moxfield/Arena-format list to bring a deck in."

### `active-deck` — 4 steps

1. **Deck rail** *(target: deck-rail)* — "Cards currently in this deck, grouped by type."
2. **Mana curve & legality** *(target: mana-curve)* — "Live mana curve + Standard legality flag at a glance."
3. **Add cards** *(target: deck-rail header — describes the Browse-flow rather than pointing at a button on this page)* — "Switch to Browse, click any card, then use the 'Add to deck' button on its detail drawer."
4. **Visualize** *(target: deck-graph-link)* — "Click here to see your deck as an interaction graph."

### `deck-graph` — 4 steps

1. **Graph canvas** *(target: graph-canvas)* — "Nodes are cards, edges are interactions. Drag to pan, scroll to zoom."
2. **Pill row** *(target: pill-row)* — "Toggle which interaction types appear. Filter to just removal, ramp, etc."
3. **Selection drawer** *(target: graph-canvas — copy describes "click a node")* — "Click any node to see why it's connected — the specific tags that pair."
4. **Back to deck** *(target: back-link)* — "Return to the active deck view."

## Help menu

A "?" `<button>` rendered in the top-right of the nav bar (`App.tsx` nav). Click opens a small dark-themed popover anchored below the button. Two items:

1. **Show app intro** — `openTour('global', { reset: true })`
2. **Show {Page} tour** — `openTour({currentPageTourId}, { reset: true })`. Label is derived from current route. If on a route with no tour (none today), hidden.

Popover closes on item click, on Esc, or on outside click. The button itself has `aria-label="Help"` and the popover items are real `<button>` elements (keyboard-accessible).

## Styling

Pass Joyride a `styles` prop matching the existing dark UI:

```ts
{
  options: {
    backgroundColor: '#1a1a1a',
    arrowColor: '#1a1a1a',
    textColor: '#e5e5e5',
    primaryColor: '#fafafa',           // match font-semibold nav active
    overlayColor: 'rgba(0,0,0,0.55)',
    zIndex: 10000,
  },
  tooltipContainer: { textAlign: 'left' },
  buttonNext: { backgroundColor: '#fafafa', color: '#0a0a0a' },
  buttonBack: { color: '#a3a3a3' },
  buttonSkip: { color: '#737373' },
  spotlight: { borderRadius: 6 },
}
```

Joyride's default tooltip layout is fine — we don't need a custom `tooltipComponent`.

## Edge cases

| Case | Handling |
|---|---|
| `data-tour-id` target missing (refactor drift) | Joyride emits `error:target_not_found`; we log a console warning and advance to the next step. |
| Browse page still loading the graph artifact | `useAutoStartTour` checks `graphStore.status === 'ready'` before opening tours that target ready-state elements. |
| Tour step requires UI that's not visible yet (e.g. card drawer) | Reword the step to describe the feature pointing at the affordance, not the post-interaction state. (Already done in tour content above.) |
| Viewport < 768px | Tours are suppressed. Help menu items disabled with a "Tours are best on a wider screen" tooltip. |
| localStorage throws | Caught and ignored. `seenTours` stays in-memory. Tours run once per session instead of once ever. |
| Back-to-back global → browse on first visit | `useAutoStartTour`'s effect is keyed on `[location.pathname]`. After the global tour closes on `/`, no effect re-fire happens until the user navigates. They get the browse tour the next time they revisit `/` (or whichever page they go to). |
| User reloads mid-tour | `activeTour` is not persisted. Reload means the tour ends; `seenTours` only updates on `finished` / `skipped` / `close`, so the user will see the tour fresh next time. |
| User refocuses tab during tour | No special handling. Joyride continues rendering. |

## Accessibility

- Help button has `aria-label="Help"`.
- Joyride's tooltips are keyboard-navigable by default (Tab focus, Esc to close). We don't override this.
- After tour close, focus returns to the previously focused element (Joyride default).
- All tour copy is plain English at ~9th-grade reading level. No jargon beyond MTG terms users would already know to be here.

## Testing

### Unit (`wizardStore.test.ts`)

- `openTour('global')` sets `activeTour='global'`, `stepIndex=0`.
- `markSeen('global')` adds to `seenTours`, writes to localStorage.
- `skipAll()` populates all 5 tour IDs.
- Re-instantiating the store reads `seenTours` from localStorage.
- localStorage-throws path: store creation succeeds, mutations are in-memory only.
- `openTour('global', { reset: true })` works when `global` is already in `seenTours`.

### Hook (`useAutoStartTour.test.tsx`)

- Global unseen + on `/` + graph ready + ≥768px viewport → opens `global`.
- Global seen, browse unseen, on `/` → opens `browse`.
- Both seen, on `/` → opens nothing.
- `activeTour` already set → no-op.
- Effect does not re-fire when `activeTour` transitions from `'global'` to `null` on the same pathname (test by rendering the hook, mounting on `/`, completing the global tour, asserting no auto-open of `browse`).
- Viewport < 768px → no-op.
- Graph not ready, on `/` → no-op (waits).

### Component (`HelpMenu.test.tsx`)

- Renders "?" button with `aria-label="Help"`.
- Click opens popover with two items.
- "Show app intro" → `openTour('global', { reset: true })`.
- Context-aware label: on `/decks`, second item reads "Show Decks tour" and dispatches `openTour('decks', { reset: true })`.
- Esc closes popover.
- Outside click closes popover.

### E2E (`app/tests/e2e/wizard.spec.ts`)

- Fresh localStorage → land on `/` → global tour appears with 5 steps. Click through to finish → localStorage contains `["global"]`.
- Click skip on global step 2 → localStorage contains all 5 tour IDs → reload → no tour.
- Click help → "Show app intro" → tour re-runs even with `global` in seenTours.
- Finish global on `/`, navigate to `/decks` → decks tour appears.
- Finish global on `/`, stay on `/`, no further tour appears until user navigates away and back (or to another page).

### Explicitly not tested

- Visual fidelity of Joyride tooltips (library concern).
- Per-step target resolution as a unit test (the `error:target_not_found` console warning is the dev signal; an exhaustive "every step's target exists" assertion is brittle and overkill).
- Joyride internals (scrolling, positioning math).

## Dependencies to add

- `react-joyride` (`app/package.json`).

## Files to touch

**New:**
- `app/src/wizard/WizardProvider.tsx`
- `app/src/wizard/wizardStore.ts`
- `app/src/wizard/wizardStore.test.ts`
- `app/src/wizard/tours.ts`
- `app/src/wizard/useAutoStartTour.ts`
- `app/src/wizard/useAutoStartTour.test.tsx`
- `app/src/wizard/HelpMenu.tsx`
- `app/src/wizard/HelpMenu.test.tsx`
- `app/src/wizard/selectors.ts`
- `app/tests/e2e/wizard.spec.ts`

**Modified:**
- `app/src/App.tsx` — wrap routes in `<WizardProvider>`, render `<HelpMenu>` in nav.
- `app/src/components/FilterPanel.tsx` — add `data-tour-id`s.
- `app/src/components/CardGrid.tsx` — add `data-tour-id`.
- `app/src/components/filters/TagFilterSection.tsx` — add `data-tour-id`.
- `app/src/pages/DecksPage.tsx` — add `data-tour-id`s on list, new-deck button, import button.
- `app/src/components/DeckPanel.tsx` — add `data-tour-id`s on deck rail, mana curve, deck-graph link.
- `app/src/pages/DeckGraphPage.tsx` — add `data-tour-id`s on graph canvas, pill row, back link.
- `app/package.json` — add `react-joyride`.

## Out of scope (deferred)

- Server-persisted seen-state.
- Analytics on tour completion.
- Per-step "try it now" interactivity.
- Mobile-friendly tour layout.
- Localization beyond English.
- A "what's new" changelog tour that fires when `RULE_VERSION` bumps. (Could be a future use of the same infra.)
