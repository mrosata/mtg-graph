# Wizard Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a guided walkthrough to the app: one global intro plus per-page tours that auto-run on first visit, skippable, replayable from a "?" icon in the nav.

**Architecture:** A single `<Joyride>` instance is mounted at the app root via `<WizardProvider>`. A Zustand store tracks `activeTour`, `stepIndex`, and `seenTours` (persisted in localStorage). A hook keyed on `location.pathname` opens the right tour on route change. UI elements carry stable `data-tour-id` attributes; tour steps reference them via centralized selector constants.

**Tech Stack:** React 18, TypeScript (noUncheckedIndexedAccess: true), Zustand, react-router-dom v6, react-joyride, vitest + React Testing Library, Playwright for E2E.

**Spec:** `docs/superpowers/specs/2026-05-26-wizard-onboarding-design.md`

**Working directory note:** All `npm` commands below are run from `app/` unless prefixed with `(from repo root)`. Tests are vitest-based and use the existing setup at `app/tests/setup.ts`.

---

## File Structure

**New files (all under `app/src/wizard/` unless noted):**
- `selectors.ts` — `data-tour-id` string constants + `TourId` type
- `wizardStore.ts` — Zustand store
- `wizardStore.test.ts`
- `tours.ts` — tour step registries
- `useAutoStartTour.ts` — route-change driven auto-open hook
- `useAutoStartTour.test.tsx`
- `HelpMenu.tsx` — "?" button + popover
- `HelpMenu.test.tsx`
- `WizardProvider.tsx` — mounts `<Joyride>`, wires callback
- `app/tests/e2e/wizard.spec.ts` — Playwright E2E

**Modified files:**
- `app/package.json` — add `react-joyride`
- `app/src/App.tsx` — wrap in `<WizardProvider>`, add `<HelpMenu>` to nav
- `app/src/components/FilterPanel.tsx` — add `data-tour-id`
- `app/src/components/filters/TagFilterSection.tsx` — add `data-tour-id`
- `app/src/components/CardGrid.tsx` — add `data-tour-id`
- `app/src/pages/DecksPage.tsx` — add `data-tour-id`s on list, New Deck, Import buttons
- `app/src/components/DeckPanel.tsx` — add `data-tour-id`s on rail + mana curve
- `app/src/pages/DeckPage.tsx` — add `data-tour-id` on Graph link
- `app/src/pages/DeckGraphPage.tsx` — add `data-tour-id` on back link
- `app/src/components/deckGraph/GraphCanvas.tsx` — add `data-tour-id` on canvas wrapper
- `app/src/components/deckGraph/PillRow.tsx` — add `data-tour-id`

---

## Task 1: Add react-joyride dependency

**Files:**
- Modify: `app/package.json`

- [ ] **Step 1: Install**

Run (from `app/`):
```bash
npm install react-joyride@^2.7.0
```

Expected: package added under `dependencies`. The latest 2.x is compatible with React 18.

- [ ] **Step 2: Verify install**

Run:
```bash
grep '"react-joyride"' package.json
```

Expected: `"react-joyride": "^2.7.0"`.

- [ ] **Step 3: Verify build still passes**

Run (from repo root):
```bash
npm run test:pipeline
```

Then (from `app/`):
```bash
npm run build
```

Expected: both green. (We haven't imported joyride yet, so adding it is a no-op at this stage.)

- [ ] **Step 4: Commit**

```bash
git add app/package.json app/package-lock.json
git commit -m "feat(wizard): add react-joyride dependency"
```

---

## Task 2: Selector constants + TourId type

**Files:**
- Create: `app/src/wizard/selectors.ts`

This file is the single source of truth for `data-tour-id` attribute values and the `TourId` union. Everything else imports from here.

- [ ] **Step 1: Create the file**

Write `app/src/wizard/selectors.ts`:

```ts
// data-tour-id values. Used by:
//   - components that render with `data-tour-id={TOUR_IDS.foo}`
//   - tour step definitions in tours.ts that target `[data-tour-id="foo"]`
//
// If you rename a key here without updating callers, the `error:target_not_found`
// path in WizardProvider will log a console warning and the affected step will
// be skipped.
export const TOUR_IDS = {
  // Global (in nav)
  navBrowse: 'nav-browse',
  navDecks: 'nav-decks',
  navActiveDeck: 'nav-active-deck',
  navHelp: 'nav-help',

  // Browse page
  filterPanel: 'filter-panel',
  tagFilterSection: 'tag-filter-section',
  cardGrid: 'card-grid',

  // Decks page
  deckList: 'deck-list',
  newDeckButton: 'new-deck-button',
  importButton: 'import-button',

  // Active deck page
  deckRail: 'deck-rail',
  manaCurve: 'mana-curve',
  deckGraphLink: 'deck-graph-link',

  // Deck graph page
  graphCanvas: 'graph-canvas',
  pillRow: 'pill-row',
  deckGraphBackLink: 'deck-graph-back-link',
} as const;

export type TourId = 'global' | 'browse' | 'decks' | 'active-deck' | 'deck-graph';

export const ALL_TOUR_IDS: TourId[] = ['global', 'browse', 'decks', 'active-deck', 'deck-graph'];

// Route → tour mapping used by useAutoStartTour and HelpMenu.
export function tourForPathname(pathname: string): TourId | null {
  if (pathname === '/') return 'browse';
  if (pathname === '/decks') return 'decks';
  if (pathname === '/deck') return 'active-deck';
  if (pathname === '/deck/graph') return 'deck-graph';
  return null;
}

// Human-readable label for the per-page Help menu item.
export function tourLabel(id: TourId): string {
  switch (id) {
    case 'global': return 'app intro';
    case 'browse': return 'Browse tour';
    case 'decks': return 'Decks tour';
    case 'active-deck': return 'Active Deck tour';
    case 'deck-graph': return 'Deck Graph tour';
  }
}
```

- [ ] **Step 2: Verify it type-checks**

Run (from `app/`):
```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/src/wizard/selectors.ts
git commit -m "feat(wizard): add selector constants and TourId type"
```

---

## Task 3: Wizard store (TDD)

**Files:**
- Create: `app/src/wizard/wizardStore.ts`
- Test: `app/src/wizard/wizardStore.test.ts`

The store exposes:
```ts
{
  activeTour: TourId | null;
  stepIndex: number;
  seenTours: Set<TourId>;
  openTour(id, opts?: { reset?: boolean }): void;
  closeTour(): void;
  skipAll(): void;
  markSeen(id): void;
  setStepIndex(i): void;
}
```

Persistence: reads `localStorage['mtg-graph:seen-tours:v1']` on creation; writes back on every `seenTours` mutation. localStorage failures are swallowed; `seenTours` stays in-memory.

Note about Zustand + tests: Zustand stores are singletons. Each test resets via `useWizardStore.setState({...initial...})`. We expose a `_resetForTesting` helper to make the intent explicit.

- [ ] **Step 1: Write the failing tests**

Write `app/src/wizard/wizardStore.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWizardStore, STORAGE_KEY, _resetForTesting } from './wizardStore';
import { ALL_TOUR_IDS } from './selectors';

describe('wizardStore', () => {
  beforeEach(() => {
    localStorage.clear();
    _resetForTesting();
  });

  it('starts with no active tour, empty seenTours, stepIndex 0', () => {
    const s = useWizardStore.getState();
    expect(s.activeTour).toBeNull();
    expect(s.stepIndex).toBe(0);
    expect(s.seenTours.size).toBe(0);
  });

  it('openTour sets activeTour and resets stepIndex', () => {
    useWizardStore.getState().setStepIndex(3);
    useWizardStore.getState().openTour('global');
    const s = useWizardStore.getState();
    expect(s.activeTour).toBe('global');
    expect(s.stepIndex).toBe(0);
  });

  it('closeTour clears activeTour', () => {
    useWizardStore.getState().openTour('browse');
    useWizardStore.getState().closeTour();
    expect(useWizardStore.getState().activeTour).toBeNull();
  });

  it('markSeen adds to seenTours and persists to localStorage', () => {
    useWizardStore.getState().markSeen('global');
    expect(useWizardStore.getState().seenTours.has('global')).toBe(true);
    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    expect(persisted).toContain('global');
  });

  it('skipAll marks every tour seen and persists', () => {
    useWizardStore.getState().skipAll();
    const seen = useWizardStore.getState().seenTours;
    for (const id of ALL_TOUR_IDS) expect(seen.has(id)).toBe(true);
    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    expect(persisted.length).toBe(ALL_TOUR_IDS.length);
  });

  it('openTour({ reset: true }) replays a seen tour without removing seenness', () => {
    useWizardStore.getState().markSeen('global');
    useWizardStore.getState().openTour('global', { reset: true });
    expect(useWizardStore.getState().activeTour).toBe('global');
    expect(useWizardStore.getState().seenTours.has('global')).toBe(true);
  });

  it('reads seenTours from localStorage on init', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['global', 'browse']));
    _resetForTesting();
    const s = useWizardStore.getState();
    expect(s.seenTours.has('global')).toBe(true);
    expect(s.seenTours.has('browse')).toBe(true);
    expect(s.seenTours.has('decks')).toBe(false);
  });

  it('survives localStorage throwing on write', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => useWizardStore.getState().markSeen('global')).not.toThrow();
    // In-memory mutation still happened
    expect(useWizardStore.getState().seenTours.has('global')).toBe(true);
    setItemSpy.mockRestore();
  });

  it('survives localStorage throwing on read at init', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('disabled');
    });
    expect(() => _resetForTesting()).not.toThrow();
    expect(useWizardStore.getState().seenTours.size).toBe(0);
    getItemSpy.mockRestore();
  });

  it('ignores junk in localStorage', () => {
    localStorage.setItem(STORAGE_KEY, '{"not":"an array"}');
    _resetForTesting();
    expect(useWizardStore.getState().seenTours.size).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run (from `app/`):
```bash
npm test -- --run src/wizard/wizardStore.test.ts
```

Expected: FAIL with "Cannot find module './wizardStore'" or similar.

- [ ] **Step 3: Implement the store**

Write `app/src/wizard/wizardStore.ts`:

```ts
import { create } from 'zustand';
import type { TourId } from './selectors';
import { ALL_TOUR_IDS } from './selectors';

export const STORAGE_KEY = 'mtg-graph:seen-tours:v1';

type WizardState = {
  activeTour: TourId | null;
  stepIndex: number;
  seenTours: Set<TourId>;
  openTour: (id: TourId, opts?: { reset?: boolean }) => void;
  closeTour: () => void;
  skipAll: () => void;
  markSeen: (id: TourId) => void;
  setStepIndex: (i: number) => void;
};

function readSeen(): Set<TourId> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    const valid = ALL_TOUR_IDS as readonly string[];
    return new Set(parsed.filter((x): x is TourId => typeof x === 'string' && valid.includes(x)));
  } catch {
    return new Set();
  }
}

function writeSeen(seen: Set<TourId>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(seen)));
  } catch {
    // Swallow; in-memory state remains authoritative for this session.
  }
}

function makeInitialState(): Pick<WizardState, 'activeTour' | 'stepIndex' | 'seenTours'> {
  return {
    activeTour: null,
    stepIndex: 0,
    seenTours: readSeen(),
  };
}

export const useWizardStore = create<WizardState>((set, get) => ({
  ...makeInitialState(),

  openTour: (id, _opts) => {
    // opts.reset is currently a no-op since openTour always resets stepIndex to 0.
    // The option is kept for forward compatibility (HelpMenu passes it explicitly
    // to signal "show this even if already seen", which is already the behavior).
    set({ activeTour: id, stepIndex: 0 });
  },

  closeTour: () => set({ activeTour: null, stepIndex: 0 }),

  skipAll: () => {
    const next = new Set<TourId>(ALL_TOUR_IDS);
    writeSeen(next);
    set({ seenTours: next });
  },

  markSeen: (id) => {
    const next = new Set(get().seenTours);
    next.add(id);
    writeSeen(next);
    set({ seenTours: next });
  },

  setStepIndex: (i) => set({ stepIndex: i }),
}));

// Test-only helper: re-reads localStorage and resets in-memory fields.
// Keep this exported so wizardStore.test.ts can re-init the singleton between cases.
export function _resetForTesting(): void {
  useWizardStore.setState(makeInitialState());
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
npm test -- --run src/wizard/wizardStore.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/wizard/wizardStore.ts app/src/wizard/wizardStore.test.ts
git commit -m "feat(wizard): zustand store with localStorage persistence"
```

---

## Task 4: tours.ts (step registry)

**Files:**
- Create: `app/src/wizard/tours.ts`

Pure data. The Joyride `Step` type comes from `react-joyride`. We import it for type safety. No tests — the integration is exercised by E2E.

- [ ] **Step 1: Create the file**

Write `app/src/wizard/tours.ts`:

```ts
import type { Step } from 'react-joyride';
import { TOUR_IDS, type TourId } from './selectors';

const sel = (id: string): string => `[data-tour-id="${id}"]`;

const global: Step[] = [
  {
    target: 'body',
    placement: 'center',
    title: 'Welcome to MTG Graph',
    content:
      'A tag-driven interaction graph over Standard. ~4,400 cards tagged across ~91 mechanics, ~340K interactions. Use it to discover cards that play together and build decks around them.',
    disableBeacon: true,
  },
  {
    target: sel(TOUR_IDS.navBrowse),
    title: 'Browse',
    content:
      'Filter the card pool by color, type, mana cost, set, and — most powerfully — by mechanic tags.',
    disableBeacon: true,
  },
  {
    target: sel(TOUR_IDS.navDecks),
    title: 'Decks',
    content: 'Your saved decks live here. Create, import, or delete decks.',
    disableBeacon: true,
  },
  {
    target: sel(TOUR_IDS.navActiveDeck),
    title: 'Active Deck',
    content:
      'The deck you’re currently building. View, edit, see the mana curve, and visualize interactions as a graph.',
    disableBeacon: true,
  },
  {
    target: sel(TOUR_IDS.navHelp),
    title: 'Help',
    content: 'Click here anytime to replay this intro or the tour for the page you’re on.',
    disableBeacon: true,
  },
];

const browse: Step[] = [
  {
    target: sel(TOUR_IDS.filterPanel),
    title: 'Filter panel',
    content: 'Narrow down ~4,400 cards. Each section (colors, type, tags) is AND-combined.',
    disableBeacon: true,
  },
  {
    target: sel(TOUR_IDS.tagFilterSection),
    title: 'Tag filters',
    content:
      'Tags are the killer feature. Pick `effect.removal_destroy` and you’ll get every Standard card that destroys a permanent.',
    disableBeacon: true,
  },
  {
    target: sel(TOUR_IDS.cardGrid),
    title: 'Card grid',
    content:
      'Hover for a quick preview, click for full details. The detail drawer opens on the right and shows oracle text, every tag this card has, and a list of cards in Standard it interacts with — pulled from the graph.',
    disableBeacon: true,
  },
];

const decks: Step[] = [
  {
    target: sel(TOUR_IDS.deckList),
    title: 'Deck list',
    content: 'Your saved decks. Click one to make it active.',
    disableBeacon: true,
  },
  {
    target: sel(TOUR_IDS.newDeckButton),
    title: 'New deck',
    content: 'Start an empty deck, then build it from the Browse page.',
    disableBeacon: true,
  },
  {
    target: sel(TOUR_IDS.importButton),
    title: 'Import',
    content: 'Paste a Moxfield/Arena-format list to bring a deck in.',
    disableBeacon: true,
  },
];

const activeDeck: Step[] = [
  {
    target: sel(TOUR_IDS.deckRail),
    title: 'Deck rail',
    content: 'Cards currently in this deck, grouped by type.',
    disableBeacon: true,
  },
  {
    target: sel(TOUR_IDS.manaCurve),
    title: 'Mana curve & legality',
    content: 'Live mana curve + Standard legality flag at a glance.',
    disableBeacon: true,
  },
  {
    target: sel(TOUR_IDS.deckRail),
    title: 'Add cards',
    content:
      "Switch to Browse, click any card, then use the 'Add to deck' button on its detail drawer.",
    disableBeacon: true,
  },
  {
    target: sel(TOUR_IDS.deckGraphLink),
    title: 'Visualize',
    content: 'Click here to see your deck as an interaction graph.',
    disableBeacon: true,
  },
];

const deckGraph: Step[] = [
  {
    target: sel(TOUR_IDS.graphCanvas),
    title: 'Graph canvas',
    content: 'Nodes are cards, edges are interactions. Drag to pan, scroll to zoom.',
    disableBeacon: true,
  },
  {
    target: sel(TOUR_IDS.pillRow),
    title: 'Pill row',
    content: 'Toggle which interaction types appear. Filter to just removal, ramp, etc.',
    disableBeacon: true,
  },
  {
    target: sel(TOUR_IDS.graphCanvas),
    title: 'Selection drawer',
    content: 'Click any node to see why it’s connected — the specific tags that pair.',
    disableBeacon: true,
  },
  {
    target: sel(TOUR_IDS.deckGraphBackLink),
    title: 'Back to deck',
    content: 'Return to the active deck view.',
    disableBeacon: true,
  },
];

export const TOURS: Record<TourId, Step[]> = {
  global,
  browse,
  decks,
  'active-deck': activeDeck,
  'deck-graph': deckGraph,
};
```

- [ ] **Step 2: Verify it type-checks**

Run:
```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/src/wizard/tours.ts
git commit -m "feat(wizard): tour step registry for all five tours"
```

---

## Task 5: useAutoStartTour hook (TDD)

**Files:**
- Create: `app/src/wizard/useAutoStartTour.ts`
- Test: `app/src/wizard/useAutoStartTour.test.tsx`

The hook:
1. Listens to `useLocation().pathname` (re-runs on route change).
2. If a tour is already active, no-op.
3. If `window.innerWidth < 768`, no-op.
4. If the route requires graph data and graph is not `ready`, no-op (this only matters for the page tours, NOT the global tour).
5. If `'global'` is unseen → open global.
6. Else if `tourForPathname(pathname)` is unseen → open that.

Because the effect deps are `[pathname, status]`, an unseen tour will auto-open once the graph hydrates on the user's first visit. Subsequent same-route renders (e.g. tour close) do NOT trigger re-evaluation.

- [ ] **Step 1: Write the failing tests**

Write `app/src/wizard/useAutoStartTour.test.tsx`:

```tsx
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAutoStartTour } from './useAutoStartTour';
import { useWizardStore, _resetForTesting } from './wizardStore';
import { useGraphStore } from '../stores/graphStore';

function Harness({ navigateTo }: { navigateTo?: string }) {
  useAutoStartTour();
  const navigate = useNavigate();
  useEffect(() => {
    if (navigateTo) navigate(navigateTo);
  }, [navigate, navigateTo]);
  return null;
}

const originalInnerWidth = window.innerWidth;

function setViewportWidth(w: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: w, writable: true });
}

function setGraphReady() {
  useGraphStore.setState({ status: 'ready' });
}

function setGraphLoading() {
  useGraphStore.setState({ status: 'loading' });
}

describe('useAutoStartTour', () => {
  beforeEach(() => {
    localStorage.clear();
    _resetForTesting();
    setViewportWidth(1280);
    setGraphReady();
  });

  afterEach(() => {
    setViewportWidth(originalInnerWidth);
  });

  it('opens the global tour on first mount when global is unseen', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Harness />
      </MemoryRouter>,
    );
    expect(useWizardStore.getState().activeTour).toBe('global');
  });

  it('opens the browse tour on / when global is seen and browse is unseen', () => {
    useWizardStore.getState().markSeen('global');
    render(
      <MemoryRouter initialEntries={['/']}>
        <Harness />
      </MemoryRouter>,
    );
    expect(useWizardStore.getState().activeTour).toBe('browse');
  });

  it('opens nothing when both global and current-page tours are seen', () => {
    useWizardStore.getState().markSeen('global');
    useWizardStore.getState().markSeen('browse');
    render(
      <MemoryRouter initialEntries={['/']}>
        <Harness />
      </MemoryRouter>,
    );
    expect(useWizardStore.getState().activeTour).toBeNull();
  });

  it('does not double-open when a tour is already active', () => {
    useWizardStore.getState().openTour('decks');
    render(
      <MemoryRouter initialEntries={['/']}>
        <Harness />
      </MemoryRouter>,
    );
    // No change — the in-flight tour wins.
    expect(useWizardStore.getState().activeTour).toBe('decks');
  });

  it('suppresses tours below 768px viewport width', () => {
    setViewportWidth(500);
    render(
      <MemoryRouter initialEntries={['/']}>
        <Harness />
      </MemoryRouter>,
    );
    expect(useWizardStore.getState().activeTour).toBeNull();
  });

  it('does not open page tour while graph is loading (but does open global)', () => {
    setGraphLoading();
    useWizardStore.getState().markSeen('global');
    render(
      <MemoryRouter initialEntries={['/']}>
        <Harness />
      </MemoryRouter>,
    );
    // browse needs graph data → suppressed
    expect(useWizardStore.getState().activeTour).toBeNull();
  });

  it('opens the global tour even when graph is still loading', () => {
    setGraphLoading();
    render(
      <MemoryRouter initialEntries={['/']}>
        <Harness />
      </MemoryRouter>,
    );
    // global targets nav elements only, which exist immediately
    expect(useWizardStore.getState().activeTour).toBe('global');
  });

  it('does not re-fire after the tour closes on the same pathname', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Harness />
      </MemoryRouter>,
    );
    // global opens
    expect(useWizardStore.getState().activeTour).toBe('global');
    // simulate user finishing the tour
    useWizardStore.getState().markSeen('global');
    useWizardStore.getState().closeTour();
    // we're still on /. The hook's effect deps are [pathname, status] — neither
    // changed, so no re-evaluation; browse tour must not auto-open.
    expect(useWizardStore.getState().activeTour).toBeNull();
  });

  it('opens the page tour after navigating to a different route', () => {
    useWizardStore.getState().markSeen('global');
    const { rerender } = render(
      <MemoryRouter initialEntries={['/decks']}>
        <Harness />
      </MemoryRouter>,
    );
    expect(useWizardStore.getState().activeTour).toBe('decks');

    // Simulate finishing the decks tour, then navigating to /deck/graph.
    useWizardStore.getState().markSeen('decks');
    useWizardStore.getState().closeTour();
    rerender(
      <MemoryRouter initialEntries={['/deck/graph']}>
        <Harness />
      </MemoryRouter>,
    );
    // New pathname → effect re-fires → deck-graph tour opens.
    expect(useWizardStore.getState().activeTour).toBe('deck-graph');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
npm test -- --run src/wizard/useAutoStartTour.test.tsx
```

Expected: FAIL ("Cannot find module './useAutoStartTour'").

- [ ] **Step 3: Implement the hook**

Write `app/src/wizard/useAutoStartTour.ts`:

```ts
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useWizardStore } from './wizardStore';
import { useGraphStore } from '../stores/graphStore';
import { tourForPathname, type TourId } from './selectors';

const MIN_VIEWPORT_WIDTH = 768;

function routeNeedsGraph(pathname: string): boolean {
  return pathname === '/' || pathname.startsWith('/deck');
}

export function useAutoStartTour(): void {
  const pathname = useLocation().pathname;
  const graphStatus = useGraphStore((s) => s.status);

  useEffect(() => {
    const { activeTour, seenTours, openTour } = useWizardStore.getState();
    if (activeTour) return;
    if (window.innerWidth < MIN_VIEWPORT_WIDTH) return;

    if (!seenTours.has('global')) {
      openTour('global');
      return;
    }

    if (routeNeedsGraph(pathname) && graphStatus !== 'ready') return;

    const pageTour: TourId | null = tourForPathname(pathname);
    if (pageTour && !seenTours.has(pageTour)) {
      openTour(pageTour);
    }
    // Intentionally NOT including activeTour / seenTours in deps. This effect
    // fires only on pathname change (and on graph hydration). When a tour
    // closes on the same route, no re-evaluation happens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, graphStatus]);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
npm test -- --run src/wizard/useAutoStartTour.test.tsx
```

Expected: all tests PASS.

If the "does not re-fire" test fails, double-check that the effect deps are exactly `[pathname, graphStatus]` and that mutating state via `useWizardStore.getState()` (rather than reading via selectors) doesn't trigger React updates inside the effect.

- [ ] **Step 5: Commit**

```bash
git add app/src/wizard/useAutoStartTour.ts app/src/wizard/useAutoStartTour.test.tsx
git commit -m "feat(wizard): useAutoStartTour hook with route-change keying"
```

---

## Task 6: HelpMenu component (TDD)

**Files:**
- Create: `app/src/wizard/HelpMenu.tsx`
- Test: `app/src/wizard/HelpMenu.test.tsx`

Renders a "?" button. Click → opens a popover with two items:
1. "Show app intro" → `openTour('global', { reset: true })`
2. "Show {Page} tour" → `openTour(currentPageTour, { reset: true })`. Hidden if `currentPageTour === null`.

Closes on item click, Esc, or outside click.

- [ ] **Step 1: Write the failing tests**

Write `app/src/wizard/HelpMenu.test.tsx`:

```tsx
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HelpMenu from './HelpMenu';
import { useWizardStore, _resetForTesting } from './wizardStore';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <HelpMenu />
    </MemoryRouter>,
  );
}

describe('HelpMenu', () => {
  beforeEach(() => {
    localStorage.clear();
    _resetForTesting();
  });

  it('renders a help button with aria-label', () => {
    renderAt('/');
    const btn = screen.getByRole('button', { name: /help/i });
    expect(btn).toBeInTheDocument();
  });

  it('opens a popover with two items when clicked on /decks', () => {
    renderAt('/decks');
    fireEvent.click(screen.getByRole('button', { name: /help/i }));
    expect(screen.getByRole('button', { name: /show app intro/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /show decks tour/i })).toBeInTheDocument();
  });

  it('shows only the app intro item on a route with no page tour', () => {
    // No such route today, but contractually the menu should degrade.
    renderAt('/some-unknown-route');
    fireEvent.click(screen.getByRole('button', { name: /help/i }));
    expect(screen.getByRole('button', { name: /show app intro/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /show .* tour/i })).toBeNull();
  });

  it('clicking "Show app intro" opens the global tour and closes the popover', () => {
    renderAt('/');
    fireEvent.click(screen.getByRole('button', { name: /help/i }));
    fireEvent.click(screen.getByRole('button', { name: /show app intro/i }));
    expect(useWizardStore.getState().activeTour).toBe('global');
    // popover dismissed
    expect(screen.queryByRole('button', { name: /show app intro/i })).toBeNull();
  });

  it('clicking the per-page item opens that tour with the correct id', () => {
    renderAt('/deck/graph');
    fireEvent.click(screen.getByRole('button', { name: /help/i }));
    fireEvent.click(screen.getByRole('button', { name: /show deck graph tour/i }));
    expect(useWizardStore.getState().activeTour).toBe('deck-graph');
  });

  it('Escape closes the popover', () => {
    renderAt('/');
    fireEvent.click(screen.getByRole('button', { name: /help/i }));
    expect(screen.getByRole('button', { name: /show app intro/i })).toBeInTheDocument();
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });
    expect(screen.queryByRole('button', { name: /show app intro/i })).toBeNull();
  });

  it('outside click closes the popover', () => {
    renderAt('/');
    fireEvent.click(screen.getByRole('button', { name: /help/i }));
    expect(screen.getByRole('button', { name: /show app intro/i })).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('button', { name: /show app intro/i })).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
npm test -- --run src/wizard/HelpMenu.test.tsx
```

Expected: FAIL ("Cannot find module './HelpMenu'").

- [ ] **Step 3: Implement the component**

Write `app/src/wizard/HelpMenu.tsx`:

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useWizardStore } from './wizardStore';
import { TOUR_IDS, tourForPathname, tourLabel, type TourId } from './selectors';

export default function HelpMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pathname = useLocation().pathname;
  const pageTour: TourId | null = tourForPathname(pathname);
  const openTour = useWizardStore((s) => s.openTour);

  // Close on Esc.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  const launch = useCallback(
    (id: TourId) => {
      openTour(id, { reset: true });
      setOpen(false);
    },
    [openTour],
  );

  return (
    <div ref={containerRef} className="relative ml-auto">
      <button
        type="button"
        aria-label="Help"
        data-tour-id={TOUR_IDS.navHelp}
        onClick={() => setOpen((o) => !o)}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-700 text-sm text-neutral-300 hover:border-neutral-500 hover:text-neutral-100"
      >
        ?
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-9 z-50 w-56 overflow-hidden rounded border border-neutral-700 bg-neutral-900 text-sm shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => launch('global')}
            className="block w-full px-3 py-2 text-left text-neutral-200 hover:bg-neutral-800"
          >
            Show {tourLabel('global')}
          </button>
          {pageTour && (
            <button
              type="button"
              role="menuitem"
              onClick={() => launch(pageTour)}
              className="block w-full px-3 py-2 text-left text-neutral-200 hover:bg-neutral-800"
            >
              Show {tourLabel(pageTour)}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
npm test -- --run src/wizard/HelpMenu.test.tsx
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/wizard/HelpMenu.tsx app/src/wizard/HelpMenu.test.tsx
git commit -m "feat(wizard): HelpMenu component with replay popover"
```

---

## Task 7: WizardProvider

**Files:**
- Create: `app/src/wizard/WizardProvider.tsx`

Mounts a single `<Joyride>`. Calls `useAutoStartTour()`. Wires Joyride's callback to the store.

No unit test for the provider itself — its integration is covered by the E2E test in Task 10. Joyride's tooltip rendering is a library concern; we'd be testing the library, not us.

- [ ] **Step 1: Create the file**

Write `app/src/wizard/WizardProvider.tsx`:

```tsx
import { useCallback } from 'react';
import type { ReactNode } from 'react';
import Joyride, { ACTIONS, EVENTS, STATUS, type CallBackProps } from 'react-joyride';
import { useWizardStore } from './wizardStore';
import { TOURS } from './tours';
import { useAutoStartTour } from './useAutoStartTour';

const JOYRIDE_STYLES = {
  options: {
    backgroundColor: '#1a1a1a',
    arrowColor: '#1a1a1a',
    textColor: '#e5e5e5',
    primaryColor: '#fafafa',
    overlayColor: 'rgba(0,0,0,0.55)',
    zIndex: 10000,
  },
  tooltipContainer: { textAlign: 'left' as const },
  buttonNext: { backgroundColor: '#fafafa', color: '#0a0a0a' },
  buttonBack: { color: '#a3a3a3' },
  buttonSkip: { color: '#737373' },
  spotlight: { borderRadius: 6 },
};

export default function WizardProvider({ children }: { children: ReactNode }) {
  useAutoStartTour();

  const activeTour = useWizardStore((s) => s.activeTour);
  const stepIndex = useWizardStore((s) => s.stepIndex);
  const markSeen = useWizardStore((s) => s.markSeen);
  const closeTour = useWizardStore((s) => s.closeTour);
  const skipAll = useWizardStore((s) => s.skipAll);
  const setStepIndex = useWizardStore((s) => s.setStepIndex);

  // noUncheckedIndexedAccess: TOURS[activeTour] is typed Step[] | undefined.
  // The `?? []` is the fallback; in practice activeTour is always a valid TourId.
  const steps: Step[] = activeTour ? (TOURS[activeTour] ?? []) : [];

  const handleCallback = useCallback(
    (data: CallBackProps) => {
      const { status, action, type, index } = data;
      if (!activeTour) return;

      if (status === STATUS.FINISHED) {
        markSeen(activeTour);
        closeTour();
        return;
      }
      if (status === STATUS.SKIPPED) {
        skipAll();
        closeTour();
        return;
      }
      if (action === ACTIONS.CLOSE) {
        markSeen(activeTour);
        closeTour();
        return;
      }
      if (type === EVENTS.STEP_AFTER) {
        setStepIndex(index + 1);
        return;
      }
      if (type === EVENTS.TARGET_NOT_FOUND) {
        // eslint-disable-next-line no-console
        console.warn(`[wizard] step ${activeTour}:${index} target not found, skipping`);
        setStepIndex(index + 1);
      }
    },
    [activeTour, markSeen, closeTour, skipAll, setStepIndex],
  );

  return (
    <>
      <Joyride
        run={activeTour !== null}
        steps={steps}
        stepIndex={stepIndex}
        continuous
        showSkipButton
        showProgress
        disableScrolling
        styles={JOYRIDE_STYLES}
        callback={handleCallback}
      />
      {children}
    </>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run:
```bash
npx tsc --noEmit
```

Expected: no errors.

If you see "STATUS / ACTIONS / EVENTS not exported from react-joyride", check the installed version and adjust imports. As of react-joyride 2.7, these are named exports; older versions might require `import { ACTIONS } from 'react-joyride/lib/...'`.

- [ ] **Step 3: Commit**

```bash
git add app/src/wizard/WizardProvider.tsx
git commit -m "feat(wizard): WizardProvider mounting Joyride with dark theme"
```

---

## Task 8: Wire WizardProvider + HelpMenu into App.tsx

**Files:**
- Modify: `app/src/App.tsx`

- [ ] **Step 1: Read the current file**

Confirm `app/src/App.tsx` matches what was inspected during planning. If it has diverged, adapt the edit below to the current shape.

- [ ] **Step 2: Modify App.tsx**

Edit `app/src/App.tsx`. The full new contents:

```tsx
import { useEffect } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import BrowserPage from './pages/BrowserPage';
import DecksPage from './pages/DecksPage';
import DeckPage from './pages/DeckPage';
import DeckGraphPage from './pages/DeckGraphPage';
import { useGraphStore } from './stores/graphStore';
import { useDeckStore } from './stores/deckStore';
import WizardProvider from './wizard/WizardProvider';
import HelpMenu from './wizard/HelpMenu';
import { TOUR_IDS } from './wizard/selectors';

const ARTIFACT_URL = (() => {
  const set = import.meta.env.VITE_SET_CODE ?? 'standard';
  return `/data/cards-${set}.json`;
})();

export default function App() {
  useEffect(() => {
    useGraphStore.getState().hydrate(ARTIFACT_URL);
    useDeckStore.getState().load();
  }, []);

  return (
    <WizardProvider>
      <div className="flex h-screen flex-col bg-neutral-950 text-neutral-100">
        <nav className="flex shrink-0 items-center gap-4 border-b border-neutral-800 px-4 py-3">
          <NavLink
            to="/"
            end
            data-tour-id={TOUR_IDS.navBrowse}
            className={({ isActive }) => isActive ? 'font-semibold' : ''}
          >
            Browse
          </NavLink>
          <NavLink
            to="/decks"
            data-tour-id={TOUR_IDS.navDecks}
            className={({ isActive }) => isActive ? 'font-semibold' : ''}
          >
            Decks
          </NavLink>
          <NavLink
            to="/deck"
            data-tour-id={TOUR_IDS.navActiveDeck}
            className={({ isActive }) => isActive ? 'font-semibold' : ''}
          >
            Active Deck
          </NavLink>
          <HelpMenu />
        </nav>
        <div className="min-h-0 flex-1">
          <Routes>
            <Route path="/" element={<BrowserPage />} />
            <Route path="/decks" element={<DecksPage />} />
            <Route path="/deck" element={<DeckPage />} />
            <Route path="/deck/graph" element={<DeckGraphPage />} />
          </Routes>
        </div>
      </div>
    </WizardProvider>
  );
}
```

Key changes:
- Added `end` to the Browse `NavLink` so `/deck` and `/decks` don't also activate it.
- Added `data-tour-id` on each `NavLink`.
- `HelpMenu` uses `ml-auto` internally to push itself right; we added `items-center` on the `<nav>` to align the help button with the text links.

- [ ] **Step 3: Verify the existing test for nav still passes**

Run from repo root:
```bash
npm test
```

Expected: all suites green. (BrowserShell tests, DecksPage tests, etc.) If `npm test` from root is slow, run `npm test` from `app/` first to catch unit-test regressions faster.

- [ ] **Step 4: Manually verify in the dev server**

Run (from `app/`):
```bash
npm run dev
```

Open http://localhost:5173. You should see the global tour appear within ~1 second. Click through it (or skip). Confirm:
- The "?" button is visible in the top-right of the nav.
- Clicking "?" opens a popover with two items.
- Refreshing the page does NOT re-trigger the global tour (localStorage remembered).

Stop the dev server (Ctrl-C).

- [ ] **Step 5: Commit**

```bash
git add app/src/App.tsx
git commit -m "feat(wizard): mount WizardProvider, add HelpMenu and nav tour ids"
```

---

## Task 9: Add data-tour-id to Browse-page targets

**Files:**
- Modify: `app/src/components/FilterPanel.tsx`
- Modify: `app/src/components/filters/TagFilterSection.tsx`
- Modify: `app/src/components/CardGrid.tsx`

- [ ] **Step 1: Add data-tour-id to FilterPanel root**

Open `app/src/components/FilterPanel.tsx`. Find the outermost `<div>` or `<section>` returned by the default export (the panel root). Add `data-tour-id={TOUR_IDS.filterPanel}`.

Add the import at the top:
```ts
import { TOUR_IDS } from '../wizard/selectors';
```

Example (the exact attribute to add — locate the outer container):
```tsx
<div className="..." data-tour-id={TOUR_IDS.filterPanel}>
  {/* ...existing children... */}
</div>
```

- [ ] **Step 2: Add data-tour-id to TagFilterSection**

Open `app/src/components/filters/TagFilterSection.tsx`. Find the outermost element of the section (the wrapper around the "Tags" label + tag list). Add `data-tour-id={TOUR_IDS.tagFilterSection}`.

Add at the top:
```ts
import { TOUR_IDS } from '../../wizard/selectors';
```

Add the attribute:
```tsx
<section data-tour-id={TOUR_IDS.tagFilterSection}>
  {/* ...existing children... */}
</section>
```

- [ ] **Step 3: Add data-tour-id to CardGrid**

Open `app/src/components/CardGrid.tsx`. Add `data-tour-id={TOUR_IDS.cardGrid}` to the outer container that wraps the grid.

Add at the top:
```ts
import { TOUR_IDS } from '../wizard/selectors';
```

- [ ] **Step 4: Run unit + component tests**

From `app/`:
```bash
npm test
```

Expected: all green. `data-*` attributes don't affect any existing assertions.

- [ ] **Step 5: Manually verify in dev**

Run `npm run dev`. From the help menu, choose "Show Browse tour" — confirm the three steps land on the filter panel, tag filter section, and card grid respectively.

- [ ] **Step 6: Commit**

```bash
git add app/src/components/FilterPanel.tsx app/src/components/filters/TagFilterSection.tsx app/src/components/CardGrid.tsx
git commit -m "feat(wizard): data-tour-id on browse-page targets"
```

---

## Task 10: Add data-tour-id to Decks-page targets

**Files:**
- Modify: `app/src/pages/DecksPage.tsx`

- [ ] **Step 1: Add attributes**

Open `app/src/pages/DecksPage.tsx`. Add the import:
```ts
import { TOUR_IDS } from '../wizard/selectors';
```

Locate the existing markup:
- The `<ul>` listing decks → add `data-tour-id={TOUR_IDS.deckList}`.
- The "New deck" button (around line 91 in the source as of this plan) → add `data-tour-id={TOUR_IDS.newDeckButton}`.
- The "Import" button (around line 86) → add `data-tour-id={TOUR_IDS.importButton}`.

Example edits:
```tsx
<button
  onClick={() => setImportOpen(true)}
  data-tour-id={TOUR_IDS.importButton}
  className="rounded border border-neutral-700 px-3 py-1 text-sm"
>
  Import
</button>
<button
  onClick={handleCreate}
  data-tour-id={TOUR_IDS.newDeckButton}
  className="rounded bg-amber-500 px-3 py-1 text-black"
>
  New deck
</button>
```

```tsx
<ul data-tour-id={TOUR_IDS.deckList} className="space-y-2">
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: all green.

- [ ] **Step 3: Manually verify**

`npm run dev`, navigate to `/decks`. From the help menu, choose "Show Decks tour" — confirm the three steps land correctly.

- [ ] **Step 4: Commit**

```bash
git add app/src/pages/DecksPage.tsx
git commit -m "feat(wizard): data-tour-id on decks-page targets"
```

---

## Task 11: Add data-tour-id to Active-deck-page targets

**Files:**
- Modify: `app/src/components/DeckPanel.tsx`
- Modify: `app/src/pages/DeckPage.tsx`

- [ ] **Step 1: Add data-tour-id to DeckPanel rail + mana curve**

Open `app/src/components/DeckPanel.tsx`. Add the import:
```ts
import { TOUR_IDS } from '../wizard/selectors';
```

The deck panel renders a top-level wrapper (the rail) containing the mana curve, deck name, type sections, etc. Add `data-tour-id={TOUR_IDS.deckRail}` to the outermost rail container.

Find the `<ManaCurve>` element and wrap (or annotate) so it carries `data-tour-id={TOUR_IDS.manaCurve}`. Easiest: wrap with a div, e.g.:
```tsx
<div data-tour-id={TOUR_IDS.manaCurve}>
  <ManaCurve buckets={curve} />
</div>
```
…or, if `<ManaCurve>` already renders a div, add a prop or modify it to accept a wrapper attribute. **Prefer the wrapper-div approach** — it requires no change to `<ManaCurve>` itself.

- [ ] **Step 2: Add data-tour-id to the Graph link in DeckPage**

Open `app/src/pages/DeckPage.tsx`. Add the import:
```ts
import { TOUR_IDS } from '../wizard/selectors';
```

Find the existing `<Link to="/deck/graph" ...>` element. Add `data-tour-id={TOUR_IDS.deckGraphLink}`:
```tsx
<Link
  to="/deck/graph"
  data-tour-id={TOUR_IDS.deckGraphLink}
  className="px-2 py-1 text-neutral-300 hover:bg-neutral-900"
>
  Graph
</Link>
```

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: all green.

- [ ] **Step 4: Manually verify**

`npm run dev`. You'll need an active deck — if none exists, create one from `/decks` first. Navigate to `/deck`. From the help menu, choose "Show Active Deck tour" — confirm all four steps land correctly.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/DeckPanel.tsx app/src/pages/DeckPage.tsx
git commit -m "feat(wizard): data-tour-id on active-deck-page targets"
```

---

## Task 12: Add data-tour-id to Deck-graph-page targets

**Files:**
- Modify: `app/src/components/deckGraph/GraphCanvas.tsx`
- Modify: `app/src/components/deckGraph/PillRow.tsx`
- Modify: `app/src/pages/DeckGraphPage.tsx`

- [ ] **Step 1: Add data-tour-id to GraphCanvas wrapper**

Open `app/src/components/deckGraph/GraphCanvas.tsx`. Add the import:
```ts
import { TOUR_IDS } from '../../wizard/selectors';
```

Find the outermost element returned (the wrapper around the SVG/canvas) and add `data-tour-id={TOUR_IDS.graphCanvas}`.

- [ ] **Step 2: Add data-tour-id to PillRow**

Open `app/src/components/deckGraph/PillRow.tsx`. Add the import:
```ts
import { TOUR_IDS } from '../../wizard/selectors';
```

Add the attribute to the outermost element:
```tsx
<div data-tour-id={TOUR_IDS.pillRow} className="...">
```

- [ ] **Step 3: Add data-tour-id to the back link on DeckGraphPage**

Open `app/src/pages/DeckGraphPage.tsx`. Add the import:
```ts
import { TOUR_IDS } from '../wizard/selectors';
```

Find the "back to deck" link/button (the element that returns the user to `/deck`). It is rendered near the top of the page. Add `data-tour-id={TOUR_IDS.deckGraphBackLink}`.

If there are multiple candidate elements, use the visible Link/Button whose label/aria suggests "Back" or "List" — whichever is the user-facing return affordance for this page.

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: all green. PillRow / GraphCanvas tests should not change behavior.

- [ ] **Step 5: Manually verify**

`npm run dev`. With an active deck, navigate to `/deck/graph`. From the help menu, choose "Show Deck Graph tour" — confirm all four steps land correctly. Watch the browser console for any `[wizard] target not found` warnings; if seen, the corresponding component needs the attribute added or moved.

- [ ] **Step 6: Commit**

```bash
git add app/src/components/deckGraph/GraphCanvas.tsx app/src/components/deckGraph/PillRow.tsx app/src/pages/DeckGraphPage.tsx
git commit -m "feat(wizard): data-tour-id on deck-graph-page targets"
```

---

## Task 13: E2E test

**Files:**
- Create: `app/tests/e2e/wizard.spec.ts`

The test verifies the headline scenarios. Joyride renders the tooltip in a portal at document body level with role `dialog`; we assert on visible step content rather than internal class names.

- [ ] **Step 1: Write the test**

Write `app/tests/e2e/wizard.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import { waitForHydration } from './helpers';

const STORAGE_KEY = 'mtg-graph:seen-tours:v1';

async function clearSeenTours(page: import('@playwright/test').Page) {
  await page.addInitScript((key) => {
    window.localStorage.removeItem(key);
  }, STORAGE_KEY);
}

test.describe('wizard onboarding', () => {
  test('global tour auto-runs on first visit and persists seenness on finish', async ({ page, context }) => {
    await context.clearCookies();
    await clearSeenTours(page);
    await page.goto('/');
    await waitForHydration(page);

    // Joyride renders tooltips as role=dialog with the step title as accessible name.
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Welcome to MTG Graph')).toBeVisible();

    // Click through to finish.
    for (let i = 0; i < 4; i++) {
      await page.getByRole('button', { name: /Next/i }).click();
    }
    await page.getByRole('button', { name: /Last|Done|Finish/i }).click();

    await expect(page.getByRole('dialog')).toBeHidden();

    const seen = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? '[]'), STORAGE_KEY);
    expect(seen).toContain('global');
  });

  test('skip marks all tours seen', async ({ page, context }) => {
    await context.clearCookies();
    await clearSeenTours(page);
    await page.goto('/');
    await waitForHydration(page);

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /Skip/i }).click();
    await expect(page.getByRole('dialog')).toBeHidden();

    const seen = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? '[]'), STORAGE_KEY);
    expect(seen).toEqual(expect.arrayContaining(['global', 'browse', 'decks', 'active-deck', 'deck-graph']));
  });

  test('help menu replays the global tour', async ({ page }) => {
    // Pre-mark global as seen so it doesn't auto-run.
    await page.addInitScript((key) => {
      window.localStorage.setItem(key, JSON.stringify(['global', 'browse', 'decks', 'active-deck', 'deck-graph']));
    }, STORAGE_KEY);

    await page.goto('/');
    await waitForHydration(page);

    // No auto tour.
    await expect(page.getByRole('dialog')).toBeHidden();

    // Open help menu, click "Show app intro".
    await page.getByRole('button', { name: 'Help' }).click();
    await page.getByRole('button', { name: /Show app intro/i }).click();

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Welcome to MTG Graph')).toBeVisible();
  });

  test('page tour does not auto-run on same route after global finishes', async ({ page, context }) => {
    await context.clearCookies();
    await clearSeenTours(page);
    await page.goto('/');
    await waitForHydration(page);

    // Finish the global tour.
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 });
    for (let i = 0; i < 4; i++) {
      await page.getByRole('button', { name: /Next/i }).click();
    }
    await page.getByRole('button', { name: /Last|Done|Finish/i }).click();
    await expect(page.getByRole('dialog')).toBeHidden();

    // We are still on /. The browse tour must NOT auto-run.
    // Give Joyride a tick to settle and confirm no dialog comes back.
    await page.waitForTimeout(500);
    await expect(page.getByRole('dialog')).toBeHidden();

    // Navigate to /decks → decks tour appears.
    await page.getByRole('link', { name: 'Decks' }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });
  });
});
```

A note on button labels: react-joyride 2.7 uses "Next" for intermediate steps and "Last" (or sometimes "Done") for the final step. The OR-regex covers both. If your installed version uses a different label, update the regex to match. You can inspect the actual labels by running `npm run dev`, completing the global tour, and watching the button.

- [ ] **Step 2: Run the E2E suite**

From `app/`:
```bash
npm run e2e -- wizard.spec.ts
```

Expected: all four cases pass.

If the test for "page tour does not auto-run on same route" fails because the browse tour appears, recheck Task 5 — the `useAutoStartTour` effect's deps must be exactly `[pathname, graphStatus]` (not including `activeTour`).

- [ ] **Step 3: Commit**

```bash
git add app/tests/e2e/wizard.spec.ts
git commit -m "test(wizard): e2e for first-visit, skip, replay, no-back-to-back"
```

---

## Task 14: Final verification

- [ ] **Step 1: Full repo test gate**

From repo root:
```bash
npm test
```

Expected: pipeline + shared + app vitest + app build all green.

- [ ] **Step 2: Full E2E run**

From `app/`:
```bash
npm run e2e
```

Expected: all suites pass (smoke + decks + deck-page + deck-graph + wizard).

- [ ] **Step 3: Manual smoke**

Run `npm run dev`. With a fresh localStorage:
- Land on `/`. Global tour appears. Click Skip. Reload. No tour.
- Open dev tools, run `localStorage.clear()`, reload. Global tour appears. Step through all 5. The final step points at the "?" button.
- Click the "?" button. Popover opens. Click "Show Browse tour" — browse tour appears. Step through it.
- Click the "?" button. Click "Show app intro" — global tour replays from step 1.
- Navigate to `/decks`. Decks tour appears (first visit). Step through.
- Navigate to `/deck`. Active Deck tour appears.
- Navigate to `/deck/graph`. Deck Graph tour appears.
- Resize the browser to <768px wide. Reload. No auto-tour.

- [ ] **Step 4: No console warnings in normal flow**

While doing the manual smoke above, watch the dev console. There should be NO `[wizard] target not found` warnings. If any appear, that step's target wasn't wired correctly — find the offending `data-tour-id` and fix.

Once all verification passes, the feature is complete. No additional commit needed.
