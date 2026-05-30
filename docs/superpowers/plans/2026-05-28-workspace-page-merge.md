# Workspace Page Merge — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse `/` (Browse) and `/deck` (Active Deck) into a single Workspace route at `/`. The page renders the BrowserShell unconditionally and adds the action bar + DeckPanel rail only when `activeDeckId` is set. Rename `/deck/graph` to `/graph`. Add a conditional "active deck name" breadcrumb in the top nav.

**Architecture:** Today's BrowserPage and DeckPage are 90% the same wrapper around `BrowserShell`. The merge consolidates them into one component (`WorkspacePage`) that conditionally renders the deck-specific chrome based on `activeDeckId`. All URL tag handling already lives in `BrowserShell` (commit `e661e0d`), so neither branch needs filter wiring. Routing changes in `App.tsx` are mechanical: drop `/deck`, rename `/deck/graph` → `/graph`, swap the "Active Deck" `NavLink` for a conditional breadcrumb `<span>`.

**Tech Stack:** React 18 + TypeScript, react-router-dom v6, Zustand (deck store), Vitest + React Testing Library, react-joyride (tours). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-05-28-workspace-page-merge-design.md`.

---

## File Structure

**Renamed / replaced:**

| Before | After | Note |
|---|---|---|
| `app/src/pages/BrowserPage.tsx` | `app/src/pages/WorkspacePage.tsx` | git rename + content rewrite |
| (none) | `app/src/pages/WorkspacePage.test.tsx` | New test file |

**Deleted:**

| File | Reason |
|---|---|
| `app/src/pages/DeckPage.tsx` | Logic merges into WorkspacePage |
| `app/src/pages/DeckPage.test.tsx` | Cmd-S coverage moves to WorkspacePage.test.tsx |

**Modified:**

| File | Change |
|---|---|
| `app/src/App.tsx` | Routes: drop `/deck`, rename `/deck/graph` → `/graph`. Nav: drop "Active Deck" NavLink, add conditional breadcrumb. Import: `BrowserPage` → `WorkspacePage`. |
| `app/src/pages/DecksPage.tsx` | `navigate('/deck')` → `navigate('/')` in two places (lines 56, 61). |
| `app/src/pages/DecksPage.test.tsx` | Assertion updates: `'/deck'` → `'/'`. |
| `app/src/pages/DeckGraphPage.tsx` | Internal `<Link to="/deck">` → `<Link to="/">` in two places (lines 316, 322). Label "← {deck.name}" stays. |
| `app/src/wizard/selectors.ts` | `tourForPathname`: drop `/deck` mapping; rename `/deck/graph` → `/graph`. Keep `TOUR_IDS.navActiveDeck` (now targets the breadcrumb). |
| `app/src/wizard/tours.ts` | Drop the `navActiveDeck` step from the global tour (target may not exist when no deck active). Other tours unchanged. |

---

## Task 1: Rename BrowserPage to WorkspacePage with no behavior change

**Files:**
- Rename: `app/src/pages/BrowserPage.tsx` → `app/src/pages/WorkspacePage.tsx`
- Modify: `app/src/App.tsx` (import path only)

- [ ] **Step 1: Rename the file with `git mv` to preserve history**

```bash
cd /Users/Dada/mtg-graph
git mv app/src/pages/BrowserPage.tsx app/src/pages/WorkspacePage.tsx
```

- [ ] **Step 2: Update the import in `app/src/App.tsx`**

Change line 3 from:

```ts
import BrowserPage from './pages/BrowserPage';
```

to:

```ts
import WorkspacePage from './pages/WorkspacePage';
```

And line 54 from:

```tsx
<Route path="/" element={<BrowserPage />} />
```

to:

```tsx
<Route path="/" element={<WorkspacePage />} />
```

- [ ] **Step 3: Verify the build and tests still pass**

```bash
cd /Users/Dada/mtg-graph/app && npm test
```

Expected: 449 tests pass, build clean. This is a pure rename — no behavior change.

- [ ] **Step 4: Commit**

```bash
cd /Users/Dada/mtg-graph
git add app/src/pages/WorkspacePage.tsx app/src/App.tsx
git commit -m "refactor(pages): rename BrowserPage to WorkspacePage

Pure rename in preparation for the merge with DeckPage. Behavior unchanged."
```

---

## Task 2: Add the active-deck branch to WorkspacePage (TDD)

**Files:**
- Create: `app/src/pages/WorkspacePage.test.tsx`
- Modify: `app/src/pages/WorkspacePage.tsx`

- [ ] **Step 1: Write the failing test for the active-deck branch**

Create `app/src/pages/WorkspacePage.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WorkspacePage from './WorkspacePage';
import { useDeckStore } from '../stores/deckStore';
import { useGraphStore } from '../stores/graphStore';

// jsdom doesn't ship ResizeObserver; BrowserShell installs one on mount.
class StubResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
(globalThis as unknown as { ResizeObserver: typeof StubResizeObserver }).ResizeObserver = StubResizeObserver;

const seededDeck = {
  id: 'd1', name: 'TestDeck', format: 'standard' as const,
  originalCards: [{ oracleId: 'a', count: 4 }],
  workingCards: [{ oracleId: 'a', count: 2 }],
  createdAt: 0, updatedAt: 0,
};

beforeEach(() => {
  useGraphStore.setState({
    cards: new Map(),
    edges: new Map(),
    edgesInbound: new Map(),
    tagCatalog: new Map(),
    ruleVersion: 't',
    status: 'ready',
  });
  useDeckStore.setState({ decks: [], activeDeckId: null });
});

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <WorkspacePage />
    </MemoryRouter>,
  );
}

function dispatchSave(meta = true) {
  const ev = new KeyboardEvent('keydown', {
    key: 's', metaKey: meta, ctrlKey: !meta,
    bubbles: true, cancelable: true,
  });
  document.dispatchEvent(ev);
  return ev;
}

describe('WorkspacePage — no active deck', () => {
  it('does not render the deck action bar', () => {
    renderPage();
    expect(screen.queryByRole('button', { name: /goldfish/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /graph/i })).not.toBeInTheDocument();
  });

  it('does not preventDefault on Cmd-S', () => {
    renderPage();
    const ev = dispatchSave(true);
    expect(ev.defaultPrevented).toBe(false);
  });
});

describe('WorkspacePage — active deck', () => {
  beforeEach(() => {
    useDeckStore.setState({ decks: [seededDeck], activeDeckId: 'd1' });
  });

  it('renders the deck action bar (Goldfish + Graph link)', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /goldfish/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /graph/i })).toBeInTheDocument();
  });

  it('Graph link points to /graph (not /deck/graph)', () => {
    renderPage();
    const graphLink = screen.getByRole('link', { name: /graph/i });
    expect(graphLink.getAttribute('href')).toBe('/graph');
  });

  it('Cmd-S calls saveDeck and preventDefaults when dirty', () => {
    const saveSpy = vi.spyOn(useDeckStore.getState(), 'saveDeck');
    renderPage();
    const ev = dispatchSave(true);
    expect(ev.defaultPrevented).toBe(true);
    expect(saveSpy).toHaveBeenCalledWith('d1');
  });

  it('Ctrl-S also triggers save', () => {
    const saveSpy = vi.spyOn(useDeckStore.getState(), 'saveDeck');
    renderPage();
    const ev = dispatchSave(false);
    expect(ev.defaultPrevented).toBe(true);
    expect(saveSpy).toHaveBeenCalledWith('d1');
  });

  it('removes the Cmd-S listener on unmount', () => {
    const saveSpy = vi.spyOn(useDeckStore.getState(), 'saveDeck');
    const { unmount } = renderPage();
    unmount();
    cleanup();
    const ev = dispatchSave(true);
    expect(ev.defaultPrevented).toBe(false);
    expect(saveSpy).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test and confirm the active-deck assertions fail**

```bash
cd /Users/Dada/mtg-graph/app && npx vitest run src/pages/WorkspacePage.test.tsx
```

Expected: the "no active deck" group passes (current behavior); the active-deck group fails because WorkspacePage doesn't yet render the action bar or install the Cmd-S handler.

- [ ] **Step 3: Implement the active-deck branch in `WorkspacePage.tsx`**

Replace the entire file contents with:

```tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import BrowserShell from '../components/BrowserShell';
import DeckPanel from '../components/DeckPanel';
import FillManaButton from '../components/FillManaButton';
import GoldfishButton from '../components/GoldfishButton';
import ImportSummary from '../components/ImportSummary';
import Toast from '../components/Toast';
import { useDeckStore } from '../stores/deckStore';
import { isDirty } from '../lib/deckDiff';
import { TOUR_IDS } from '../wizard/selectors';
import type { Filter } from '../lib/filter';

export default function WorkspacePage() {
  const [filter, setFilter] = useState<Filter>({});
  const activeDeckId = useDeckStore((s) => s.activeDeckId);
  const hasActiveDeck = activeDeckId !== null;

  useEffect(() => {
    if (!hasActiveDeck) return;
    function onKeyDown(e: KeyboardEvent) {
      const isSave = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's' && !e.shiftKey && !e.altKey;
      if (!isSave) return;
      const { activeDeckId: id, decks, saveDeck } = useDeckStore.getState();
      if (!id) return;
      e.preventDefault();
      const active = decks.find((d) => d.id === id);
      if (active && isDirty(active)) void saveDeck(id);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [hasActiveDeck]);

  if (!hasActiveDeck) {
    return (
      <BrowserShell
        filter={filter}
        onFilterChange={setFilter}
        showHoverPreview
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div
        className="flex items-center justify-end gap-2 border-b border-neutral-800 bg-neutral-950 px-4 py-2"
        data-tour-id={TOUR_IDS.deckActionBar}
      >
        <FillManaButton />
        <GoldfishButton />
        <div className="inline-flex overflow-hidden rounded border border-neutral-700 text-xs">
          <span className="bg-amber-900/40 px-2 py-1 font-semibold text-amber-200">List</span>
          <Link
            to="/graph"
            className="px-2 py-1 text-neutral-300 hover:bg-neutral-900"
            data-tour-id={TOUR_IDS.deckGraphLink}
          >
            Graph
          </Link>
        </div>
      </div>
      <ImportSummary />
      <div className="min-h-0 flex-1">
        <BrowserShell
          filter={filter}
          onFilterChange={setFilter}
          rightRail={({ onCardClick, drawerOpen }) => (
            <DeckPanel onCardClick={onCardClick} drawerOpen={drawerOpen} />
          )}
        />
      </div>
      <Toast />
    </div>
  );
}
```

Note: the Graph link points to `/graph` (the future route — added in Task 3). The route doesn't exist yet at this step, but the link rendering is testable in isolation.

- [ ] **Step 4: Run the test suite**

```bash
cd /Users/Dada/mtg-graph/app && npx vitest run src/pages/WorkspacePage.test.tsx
```

Expected: all 7 tests pass.

- [ ] **Step 5: Run the full test suite to catch regressions**

```bash
cd /Users/Dada/mtg-graph/app && npm test
```

Expected: all tests pass. Both DeckPage and WorkspacePage tests will coexist (DeckPage still mounted on `/deck`).

- [ ] **Step 6: Commit**

```bash
cd /Users/Dada/mtg-graph
git add app/src/pages/WorkspacePage.tsx app/src/pages/WorkspacePage.test.tsx
git commit -m "feat(pages): WorkspacePage adapts on activeDeckId

When a deck is active, the page renders the action bar (FillMana,
Goldfish, List/Graph toggle) and the DeckPanel rail plus the Cmd-S save
hotkey. Without an active deck it behaves like the old BrowserPage.

Graph link points to /graph; the route gets added in the routing task."
```

---

## Task 3: Switch routing to `/` for everything; rename `/deck/graph` → `/graph`

**Files:**
- Modify: `app/src/App.tsx`
- Modify: `app/src/pages/DecksPage.tsx`
- Modify: `app/src/pages/DecksPage.test.tsx`
- Modify: `app/src/pages/DeckGraphPage.tsx`
- Delete: `app/src/pages/DeckPage.tsx`
- Delete: `app/src/pages/DeckPage.test.tsx`

- [ ] **Step 1: Update `app/src/App.tsx` — routes, nav, breadcrumb**

Replace the file contents with:

```tsx
import { useEffect } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import WorkspacePage from './pages/WorkspacePage';
import DecksPage from './pages/DecksPage';
import DeckGraphPage from './pages/DeckGraphPage';
import { useGraphStore } from './stores/graphStore';
import { useActiveDeck, useDeckStore } from './stores/deckStore';
import WizardProvider from './wizard/WizardProvider';
import HelpMenu from './wizard/HelpMenu';
import { TOUR_IDS } from './wizard/selectors';

const ARTIFACT_URL = (() => {
  const set = import.meta.env.VITE_SET_CODE ?? 'standard';
  return `/data/cards-${set}.json`;
})();

export default function App() {
  const activeDeck = useActiveDeck();

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
          {activeDeck && (
            <span
              className="text-neutral-400"
              data-tour-id={TOUR_IDS.navActiveDeck}
              aria-label={`Active deck: ${activeDeck.name}`}
            >
              {activeDeck.name}
            </span>
          )}
          <HelpMenu />
        </nav>
        <div className="min-h-0 flex-1">
          <Routes>
            <Route path="/" element={<WorkspacePage />} />
            <Route path="/decks" element={<DecksPage />} />
            <Route path="/graph" element={<DeckGraphPage />} />
          </Routes>
        </div>
      </div>
    </WizardProvider>
  );
}
```

Changes from before: dropped `DeckPage` import, dropped `/deck` and `/deck/graph` routes, added `/graph` route, replaced "Active Deck" `NavLink` with a conditional `<span>` showing the active deck name. The breadcrumb still carries `TOUR_IDS.navActiveDeck` so future tour steps can target it.

- [ ] **Step 2: Update `app/src/pages/DecksPage.tsx` — navigation targets**

Line 56:

```ts
navigate('/deck');
```

becomes:

```ts
navigate('/');
```

Line 61:

```ts
navigate('/deck');
```

becomes:

```ts
navigate('/');
```

- [ ] **Step 3: Update `app/src/pages/DecksPage.test.tsx` — assertion updates**

In the existing test file, find each `toHaveBeenCalledWith('/deck')` and replace with `toHaveBeenCalledWith('/')`. The test names also reference "/deck"; update them to "/" for consistency:

- Line 60: `it('creates a deck and navigates to /deck', ...)` → `it('creates a deck and navigates to /', ...)`
- Line 63: `expect(mockNavigate).toHaveBeenCalledWith('/deck')` → `expect(mockNavigate).toHaveBeenCalledWith('/')`
- Line 66: `it('clicking a deck row activates the deck and navigates', ...)` (name stays — it doesn't reference the route)
- Line 78: `expect(mockNavigate).toHaveBeenCalledWith('/deck')` → `expect(mockNavigate).toHaveBeenCalledWith('/')`

- [ ] **Step 4: Update `app/src/pages/DeckGraphPage.tsx` — internal links**

Line 316:

```tsx
<Link to="/deck" className="text-sm text-neutral-400 hover:text-neutral-200" aria-label="Back to deck list" data-tour-id={TOUR_IDS.deckGraphBackLink}>
```

becomes:

```tsx
<Link to="/" className="text-sm text-neutral-400 hover:text-neutral-200" aria-label="Back to deck list" data-tour-id={TOUR_IDS.deckGraphBackLink}>
```

Line 322:

```tsx
<Link to="/deck" className="px-2 py-1 text-neutral-300 hover:bg-neutral-900">List</Link>
```

becomes:

```tsx
<Link to="/" className="px-2 py-1 text-neutral-300 hover:bg-neutral-900">List</Link>
```

- [ ] **Step 5: Delete `app/src/pages/DeckPage.tsx` and `app/src/pages/DeckPage.test.tsx`**

```bash
cd /Users/Dada/mtg-graph
git rm app/src/pages/DeckPage.tsx app/src/pages/DeckPage.test.tsx
```

- [ ] **Step 6: Run the full test suite**

```bash
cd /Users/Dada/mtg-graph/app && npm test
```

Expected: all tests pass. The wizard `tourForPathname` mapping for `/deck` and `/deck/graph` is now stale but will still compile because it only returns strings — the next task cleans it up.

- [ ] **Step 7: Commit**

```bash
cd /Users/Dada/mtg-graph
git add app/src/App.tsx app/src/pages/DecksPage.tsx app/src/pages/DecksPage.test.tsx app/src/pages/DeckGraphPage.tsx
git add -u app/src/pages/DeckPage.tsx app/src/pages/DeckPage.test.tsx
git commit -m "refactor(routing): collapse /deck into /; rename /deck/graph to /graph

Drops the redundant /deck route. The Workspace page at / adapts on
activeDeckId so the deck rail + action bar appear when a deck is active.
The Active Deck NavLink becomes a conditional breadcrumb showing the
deck name."
```

---

## Task 4: Update wizard tours and selectors

**Files:**
- Modify: `app/src/wizard/selectors.ts`
- Modify: `app/src/wizard/tours.ts`

- [ ] **Step 1: Update `tourForPathname` in `app/src/wizard/selectors.ts`**

Replace lines 46-52:

```ts
export function tourForPathname(pathname: string): TourId | null {
  if (pathname === '/') return 'browse';
  if (pathname === '/decks') return 'decks';
  if (pathname === '/deck') return 'active-deck';
  if (pathname === '/deck/graph') return 'deck-graph';
  return null;
}
```

becomes:

```ts
export function tourForPathname(pathname: string): TourId | null {
  if (pathname === '/') return 'browse';
  if (pathname === '/decks') return 'decks';
  if (pathname === '/graph') return 'deck-graph';
  return null;
}
```

Note: `TOUR_IDS.navActiveDeck` stays defined — it now targets the breadcrumb element. The `active-deck` tour is still listed in `ALL_TOUR_IDS` so it can be manually triggered from the HelpMenu when on `/` with an active deck.

- [ ] **Step 2: Drop the `navActiveDeck` step from the global tour in `app/src/wizard/tours.ts`**

Remove this block (lines 28-34):

```ts
  {
    target: sel(TOUR_IDS.navActiveDeck),
    title: 'Active Deck',
    content:
      'The deck you\'re currently building. View, edit, see the mana curve, and visualize interactions as a graph.',
    disableBeacon: true,
  },
```

The global tour now goes directly from `navDecks` to `navHelp`. Removed because the breadcrumb is only present when a deck is active, and the global tour fires on first visit when nothing is selected — pointing at a missing element would log `error:target_not_found`.

- [ ] **Step 3: Run the test suite and build**

```bash
cd /Users/Dada/mtg-graph/app && npm test
```

Expected: all tests pass, including the wizard tests in `app/src/wizard/`.

- [ ] **Step 4: Commit**

```bash
cd /Users/Dada/mtg-graph
git add app/src/wizard/selectors.ts app/src/wizard/tours.ts
git commit -m "chore(wizard): update tour routing for merged workspace

tourForPathname drops the /deck mapping and points /deck/graph's
replacement (/graph) at the deck-graph tour. The navActiveDeck step in
the global tour is dropped because the breadcrumb only renders when an
active deck exists; first-visit users would hit error:target_not_found."
```

---

## Task 5: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full repo gate**

```bash
cd /Users/Dada/mtg-graph && npm test
```

Expected: pipeline + shared tests pass, app vitest passes, app build (`tsc + vite`) clean.

- [ ] **Step 2: Manual browser smoke (HUMAN STEP — call out if skipping)**

```bash
cd /Users/Dada/mtg-graph/app && npm run dev
```

Open `http://localhost:5173` and verify:
- `/` with no active deck: no rail, no action bar, no breadcrumb.
- `/decks` → click a deck → routes to `/`, breadcrumb shows deck name, rail + action bar appear.
- On `/` with active deck: click a theme chip in InteractionsPanel — stays on `/` with the deck rail still visible.
- Click "Graph" in the action bar → routes to `/graph` (force-directed view).
- Click "← {deck name}" on `/graph` → routes back to `/` with the rail visible.
- `/deck` and `/deck/graph` URLs no longer resolve (no route matches, page is blank but not crashed).

If unable to run the dev server, state so explicitly in the completion report and do not claim browser verification.

- [ ] **Step 3: No commit needed — verification only.**

If any issue surfaces during browser smoke, fix in a new commit (or amend the relevant task's commit if the issue is small).

---

## Self-review notes

- **Spec coverage:**
  - Routes section → Task 3 step 1 (App.tsx) ✓
  - Top nav → Task 3 step 1 (breadcrumb in App.tsx) ✓
  - Workspace page (`/`) → Task 2 (full implementation) ✓
  - Deck activation flow → Task 3 steps 2–3 (DecksPage) ✓
  - Migration / cleanup → Task 3 steps 4–5 + Task 4 ✓
  - Tests → Task 2 step 1 (new WorkspacePage tests) + Task 3 step 3 (DecksPage updates) ✓
- **Risks called out in the spec:**
  - Tour selector drift → handled in Task 4
  - DeckGraphPage `/deck` references → handled in Task 3 step 4
  - localStorage hydration timing → no new mitigation needed; current behavior carries over
