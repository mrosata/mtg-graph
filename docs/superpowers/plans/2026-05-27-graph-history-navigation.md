# Graph History Navigation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every node selection on `/deck/graph` a URL change and a browser-history entry, and surface a pair of canvas back/forward buttons that mirror browser history with correct enabled/disabled state.

**Architecture:** Add a `selected=<oracleId>` URL param. Selection state stops being React local state and becomes URL-derived. A small `useNavStack` hook stamps a monotonic `__navIdx` into `history.state` on each push and listens to `popstate`, exposing `{ canBack, canForward, goBack, goForward }`. A new `CanvasNavButtons` overlay component renders chevron buttons inside the graph container.

**Tech Stack:** TypeScript, React, React Router (v6), Vite, Vitest, React Testing Library.

**Spec:** `docs/superpowers/specs/2026-05-26-graph-history-navigation-design.md`

---

## File map

- **Modify** `app/src/wizard/selectors.ts` — add two new tour ID keys.
- **Create** `app/src/lib/useNavStack.ts` — hook that tracks navigation index in `history.state`.
- **Create** `app/src/lib/useNavStack.test.ts` — unit tests for the hook.
- **Create** `app/src/components/deckGraph/CanvasNavButtons.tsx` — chevron overlay component.
- **Create** `app/src/components/deckGraph/CanvasNavButtons.test.tsx` — component tests.
- **Modify** `app/src/pages/DeckGraphPage.tsx` — derive `selectedOracleId` from URL, route all setter call sites through a `setSelected` helper, wire `useNavStack`, render the overlay.
- **Create** `app/src/pages/DeckGraphPage.test.tsx` — integration tests for URL-driven selection and history behavior.

---

## Task 1: Add tour IDs for the new nav buttons

**Files:**
- Modify: `app/src/wizard/selectors.ts`

The new canvas buttons need stable `data-tour-id` attributes so the wizard tour system can target them later. We're only adding the IDs in this task — wiring them into tour definitions in `tours.ts` is out of scope.

- [ ] **Step 1: Add the two new TOUR_IDS entries**

In `app/src/wizard/selectors.ts`, extend the `TOUR_IDS` const inside the `// Deck graph page` section. Replace:

```ts
  // Deck graph page
  graphCanvas: 'graph-canvas',
  pillRow: 'pill-row',
  deckGraphBackLink: 'deck-graph-back-link',
} as const;
```

with:

```ts
  // Deck graph page
  graphCanvas: 'graph-canvas',
  pillRow: 'pill-row',
  deckGraphBackLink: 'deck-graph-back-link',
  deckGraphNavBack: 'deck-graph-nav-back',
  deckGraphNavForward: 'deck-graph-nav-forward',
} as const;
```

- [ ] **Step 2: Verify nothing breaks**

Run: `cd app && npm test -- --run selectors`
Expected: No failures (the file has no direct tests but its imports must still resolve).

Then: `cd app && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/src/wizard/selectors.ts
git commit -m "feat(wizard): tour IDs for canvas back/forward buttons"
```

---

## Task 2: Build `useNavStack` hook (TDD)

**Files:**
- Create: `app/src/lib/useNavStack.ts`
- Create: `app/src/lib/useNavStack.test.ts`

The hook tracks where we are in a session's navigation history by writing a monotonic `__navIdx` into `history.state` on each push, and reading it back on `popstate`. `canBack` / `canForward` derive from a stored `maxIdx` ref and the current index state.

Critical invariant: when the user navigates **back** then **pushes a new entry**, the browser truncates forward history. So on `markPush`, the new index must be `currentIdx + 1`, not `maxIdx + 1`, and `maxIdx` resets to `currentIdx + 1` as well. Otherwise `canForward` would lie.

- [ ] **Step 1: Write the failing test file**

Create `app/src/lib/useNavStack.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNavStack } from './useNavStack';

function firePopstate() {
  window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
}

describe('useNavStack', () => {
  beforeEach(() => {
    // Reset history to a known baseline before each test. jsdom keeps the same
    // window across tests, so prior pushState calls would otherwise leak.
    window.history.replaceState(null, '', '/test');
  });

  afterEach(() => {
    window.history.replaceState(null, '', '/test');
  });

  it('starts with canBack=false and canForward=false', () => {
    const { result } = renderHook(() => useNavStack());
    expect(result.current.canBack).toBe(false);
    expect(result.current.canForward).toBe(false);
  });

  it('enables canBack after one markPush', () => {
    const { result } = renderHook(() => useNavStack());
    act(() => {
      window.history.pushState(null, '', '/test?selected=a');
      result.current.markPush();
    });
    expect(result.current.canBack).toBe(true);
    expect(result.current.canForward).toBe(false);
  });

  it('enables canForward after navigating back', () => {
    const { result } = renderHook(() => useNavStack());
    act(() => {
      window.history.pushState(null, '', '/test?selected=a');
      result.current.markPush();
    });
    // Simulate browser-back: replace current state with idx=0, fire popstate.
    act(() => {
      window.history.replaceState({ __navIdx: 0 }, '', '/test');
      firePopstate();
    });
    expect(result.current.canBack).toBe(false);
    expect(result.current.canForward).toBe(true);
  });

  it('re-disables canForward after back-then-new-push (forward stack truncates)', () => {
    const { result } = renderHook(() => useNavStack());
    // Push A then B.
    act(() => {
      window.history.pushState(null, '', '/test?selected=a');
      result.current.markPush();
    });
    act(() => {
      window.history.pushState(null, '', '/test?selected=b');
      result.current.markPush();
    });
    // Back to A.
    act(() => {
      window.history.replaceState({ __navIdx: 1 }, '', '/test?selected=a');
      firePopstate();
    });
    expect(result.current.canForward).toBe(true);
    // Push C from A — should clobber B in the forward stack.
    act(() => {
      window.history.pushState(null, '', '/test?selected=c');
      result.current.markPush();
    });
    expect(result.current.canForward).toBe(false);
    expect(result.current.canBack).toBe(true);
  });

  it('goBack and goForward delegate to window.history', () => {
    const { result } = renderHook(() => useNavStack());
    const backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    const fwdSpy = vi.spyOn(window.history, 'forward').mockImplementation(() => {});
    result.current.goBack();
    result.current.goForward();
    expect(backSpy).toHaveBeenCalledTimes(1);
    expect(fwdSpy).toHaveBeenCalledTimes(1);
    backSpy.mockRestore();
    fwdSpy.mockRestore();
  });
});
```

Also add the `vi` import at the top — replace the first line with:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `cd app && npm test -- --run useNavStack`
Expected: Test file fails to import — `useNavStack` does not exist yet.

- [ ] **Step 3: Implement the hook**

Create `app/src/lib/useNavStack.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from 'react';

type NavState = { __navIdx?: number; [k: string]: unknown };

function readIdx(): number {
  const s = window.history.state as NavState | null;
  return typeof s?.__navIdx === 'number' ? s.__navIdx : 0;
}

function writeIdx(idx: number) {
  const existing = (window.history.state as NavState | null) ?? {};
  window.history.replaceState({ ...existing, __navIdx: idx }, '');
}

export function useNavStack() {
  const [currentIdx, setCurrentIdx] = useState<number>(() => readIdx());
  const maxIdxRef = useRef<number>(currentIdx);

  // Seed history.state with __navIdx if missing, so future reads are consistent.
  useEffect(() => {
    const s = window.history.state as NavState | null;
    if (typeof s?.__navIdx !== 'number') {
      writeIdx(0);
    }
  }, []);

  useEffect(() => {
    const onPop = () => {
      const idx = readIdx();
      setCurrentIdx(idx);
      // Do NOT touch maxIdxRef — forward stays reachable until a new push.
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const markPush = useCallback(() => {
    // Called immediately after a push. Browser truncated forward history, so the
    // new entry's index is currentIdx + 1 — never past the prior max.
    const next = currentIdx + 1;
    writeIdx(next);
    maxIdxRef.current = next;
    setCurrentIdx(next);
  }, [currentIdx]);

  const goBack = useCallback(() => {
    window.history.back();
  }, []);

  const goForward = useCallback(() => {
    window.history.forward();
  }, []);

  return {
    canBack: currentIdx > 0,
    canForward: currentIdx < maxIdxRef.current,
    markPush,
    goBack,
    goForward,
  };
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `cd app && npm test -- --run useNavStack`
Expected: All 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/useNavStack.ts app/src/lib/useNavStack.test.ts
git commit -m "feat(graph): useNavStack hook for browser-history index tracking"
```

---

## Task 3: Build `CanvasNavButtons` component (TDD)

**Files:**
- Create: `app/src/components/deckGraph/CanvasNavButtons.tsx`
- Create: `app/src/components/deckGraph/CanvasNavButtons.test.tsx`

A pure presentational component. Two chevron buttons in the top-left, semi-transparent, with proper disabled state and aria-labels.

- [ ] **Step 1: Write the failing test**

Create `app/src/components/deckGraph/CanvasNavButtons.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CanvasNavButtons from './CanvasNavButtons';

describe('CanvasNavButtons', () => {
  it('renders both buttons with aria-labels', () => {
    render(
      <CanvasNavButtons canBack canForward onBack={() => {}} onForward={() => {}} />,
    );
    expect(screen.getByRole('button', { name: 'Go back' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go forward' })).toBeInTheDocument();
  });

  it('disables back button when canBack=false', () => {
    render(
      <CanvasNavButtons canBack={false} canForward onBack={() => {}} onForward={() => {}} />,
    );
    expect(screen.getByRole('button', { name: 'Go back' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Go forward' })).not.toBeDisabled();
  });

  it('disables forward button when canForward=false', () => {
    render(
      <CanvasNavButtons canBack canForward={false} onBack={() => {}} onForward={() => {}} />,
    );
    expect(screen.getByRole('button', { name: 'Go forward' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Go back' })).not.toBeDisabled();
  });

  it('calls onBack and onForward when enabled buttons are clicked', async () => {
    const onBack = vi.fn();
    const onForward = vi.fn();
    render(
      <CanvasNavButtons canBack canForward onBack={onBack} onForward={onForward} />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Go back' }));
    await user.click(screen.getByRole('button', { name: 'Go forward' }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onForward).toHaveBeenCalledTimes(1);
  });

  it('does not call onBack when back button is disabled', async () => {
    const onBack = vi.fn();
    render(
      <CanvasNavButtons canBack={false} canForward onBack={onBack} onForward={() => {}} />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Go back' }));
    expect(onBack).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `cd app && npm test -- --run CanvasNavButtons`
Expected: Fails — module does not exist.

- [ ] **Step 3: Implement the component**

Create `app/src/components/deckGraph/CanvasNavButtons.tsx`:

```tsx
import { TOUR_IDS } from '../../wizard/selectors';

type Props = {
  canBack: boolean;
  canForward: boolean;
  onBack: () => void;
  onForward: () => void;
};

const BTN_BASE =
  'inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900/60 text-neutral-200 transition';
const BTN_ENABLED = 'hover:bg-neutral-800/80 hover:text-white';
const BTN_DISABLED = 'opacity-40 cursor-not-allowed';

export default function CanvasNavButtons({ canBack, canForward, onBack, onForward }: Props) {
  return (
    <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5">
      <button
        type="button"
        aria-label="Go back"
        title="Back (browser history)"
        disabled={!canBack}
        onClick={onBack}
        data-tour-id={TOUR_IDS.deckGraphNavBack}
        className={`${BTN_BASE} ${canBack ? BTN_ENABLED : BTN_DISABLED}`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Go forward"
        title="Forward (browser history)"
        disabled={!canForward}
        onClick={onForward}
        data-tour-id={TOUR_IDS.deckGraphNavForward}
        className={`${BTN_BASE} ${canForward ? BTN_ENABLED : BTN_DISABLED}`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `cd app && npm test -- --run CanvasNavButtons`
Expected: All 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/deckGraph/CanvasNavButtons.tsx app/src/components/deckGraph/CanvasNavButtons.test.tsx
git commit -m "feat(graph): CanvasNavButtons overlay component"
```

---

## Task 4: Refactor `DeckGraphPage` selection to be URL-derived

**Files:**
- Modify: `app/src/pages/DeckGraphPage.tsx`

This is the load-bearing refactor: `selectedOracleId` stops being React local state and becomes a derived value from the `selected` search param. All setter call sites route through a `setSelected` helper that writes via `updateUrl`. The reconciliation effect (selected card dropped out of `expandedGraph`) becomes a URL-stripping replace.

**No new behavior in this task** — the integration with `useNavStack` and `CanvasNavButtons` happens in Task 5. This keeps the refactor isolated so tests can confirm equivalence first.

- [ ] **Step 1: Remove the local `selectedOracleId` state and derive from URL**

In `app/src/pages/DeckGraphPage.tsx`, find:

```tsx
  const [selectedOracleId, setSelectedOracleId] = useState<string | null>(null);
  const [hoveredOracleId, setHoveredOracleId] = useState<string | null>(null);
```

Replace with:

```tsx
  const selectedOracleId = searchParams.get('selected');
  const [hoveredOracleId, setHoveredOracleId] = useState<string | null>(null);
```

(Leave the `useState` import in place — it's still needed for `hoveredOracleId` and `refreshedDeckIds`.)

- [ ] **Step 2: Replace the reconciliation effect to strip the URL param**

Find:

```tsx
  useEffect(() => {
    if (selectedOracleId && !expandedGraph.nodes.some((n) => n.id === selectedOracleId)) {
      setSelectedOracleId(null);
    }
  }, [expandedGraph, selectedOracleId]);
```

Replace with:

```tsx
  useEffect(() => {
    if (selectedOracleId && !expandedGraph.nodes.some((n) => n.id === selectedOracleId)) {
      const next = new URLSearchParams(searchParams);
      next.delete('selected');
      setSearchParams(next, { replace: true });
    }
  }, [expandedGraph, selectedOracleId, searchParams, setSearchParams]);
```

The `replace: true` matters: this is automatic reconciliation, not user navigation — it must not push a history entry.

- [ ] **Step 3: Add the `setSelected` helper inside the component body**

Inside `DeckGraphPage`, just after the existing `updateUrl` function definition (around line 231–235, the function that's `function updateUrl(mutate: ...)`), add:

```tsx
  function setSelected(id: string | null) {
    if (id === selectedOracleId) return;
    updateUrl((next) => {
      if (id === null) next.delete('selected');
      else next.set('selected', id);
    });
  }
```

- [ ] **Step 4: Route all selection-changing call sites through `setSelected`**

Find the `setMode` function (around line 254–267) and look at its current shape — it deletes `focus`/`mode` when switching to deck mode. No change needed there.

Find the `setFocusOracleId` function:

```tsx
  const setFocusOracleId = (id: string | null) =>
    updateUrl((next) => {
      if (id === null) {
        next.delete('focus');
        next.delete('mode');
      } else {
        next.set('focus', id);
        next.set('mode', 'focus');
      }
    });
```

Replace with a version that also clears `selected` in the same URL update (so focus mode is a single history entry, not two):

```tsx
  const setFocusOracleId = (id: string | null) =>
    updateUrl((next) => {
      if (id === null) {
        next.delete('focus');
        next.delete('mode');
      } else {
        next.set('focus', id);
        next.set('mode', 'focus');
        next.delete('selected');
      }
    });
```

Now find the `<GraphCanvas>` JSX (around line 331–337):

```tsx
          <GraphCanvas
            graph={expandedGraph}
            selectedId={selectedOracleId}
            hoveredId={hoveredOracleId}
            onSelect={setSelectedOracleId}
            onFocus={(id) => { setFocusOracleId(id); setSelectedOracleId(null); }}
          />
```

Replace `setSelectedOracleId` with `setSelected`, and drop the redundant `setSelectedOracleId(null)` in `onFocus` (the new `setFocusOracleId` clears `selected` itself):

```tsx
          <GraphCanvas
            graph={expandedGraph}
            selectedId={selectedOracleId}
            hoveredId={hoveredOracleId}
            onSelect={setSelected}
            onFocus={setFocusOracleId}
          />
```

Find the `<SelectionDrawer>` JSX (around line 340–357). Replace:

```tsx
            onClose={() => setSelectedOracleId(null)}
            ...
            onSelectNeighbor={(id) => setSelectedOracleId(id)}
```

with:

```tsx
            onClose={() => setSelected(null)}
            ...
            onSelectNeighbor={(id) => setSelected(id)}
```

- [ ] **Step 5: Verify there are no remaining references to `setSelectedOracleId`**

Run: `grep -n "setSelectedOracleId" app/src/pages/DeckGraphPage.tsx`
Expected: No output.

- [ ] **Step 6: Run type check and existing test suite**

Run: `cd app && npx tsc --noEmit`
Expected: No errors.

Run: `cd app && npm test`
Expected: All tests pass. (No new tests yet — Task 6 adds the DeckGraphPage integration tests. This step just confirms the refactor didn't break anything reachable from existing tests.)

- [ ] **Step 7: Commit**

```bash
git add app/src/pages/DeckGraphPage.tsx
git commit -m "refactor(graph): derive selectedOracleId from URL"
```

---

## Task 5: Integrate `useNavStack` + `CanvasNavButtons` into `DeckGraphPage`

**Files:**
- Modify: `app/src/pages/DeckGraphPage.tsx`

Wire the hook so `updateUrl` calls `markPush()` on every push (not on replace). Render `<CanvasNavButtons>` as a sibling overlay inside the graph container.

- [ ] **Step 1: Add imports**

In `app/src/pages/DeckGraphPage.tsx`, add to the existing component-imports block:

```tsx
import CanvasNavButtons from '../components/deckGraph/CanvasNavButtons';
```

And add to the lib-imports area (near the top with other `../lib/...` imports):

```tsx
import { useNavStack } from '../lib/useNavStack';
```

- [ ] **Step 2: Call the hook inside the component**

Near the other hook calls at the top of `DeckGraphPage` (just after the `const [searchParams, setSearchParams] = useSearchParams();` line), add:

```tsx
  const navStack = useNavStack();
```

- [ ] **Step 3: Extend `updateUrl` to call `markPush` on pushes**

Find:

```tsx
  function updateUrl(mutate: (next: URLSearchParams) => void) {
    const next = new URLSearchParams(searchParams);
    mutate(next);
    setSearchParams(next);
  }
```

Replace with:

```tsx
  function updateUrl(mutate: (next: URLSearchParams) => void, opts?: { replace?: boolean }) {
    const next = new URLSearchParams(searchParams);
    mutate(next);
    setSearchParams(next, opts);
    if (!opts?.replace) navStack.markPush();
  }
```

(Existing callers pass no opts and continue to push — only the new reconciliation effect from Task 4 uses `replace: true`, but it calls `setSearchParams` directly, not `updateUrl`. No caller change needed.)

- [ ] **Step 4: Render the buttons as a sibling overlay inside the graph container**

Find the graph container `<div>`:

```tsx
        <div className="min-w-0 flex-1">
          <GraphCanvas
            graph={expandedGraph}
            ...
          />
        </div>
```

Make the container `relative` (so the absolutely-positioned overlay anchors to it) and add the overlay above `<GraphCanvas>`:

```tsx
        <div className="relative min-w-0 flex-1">
          <CanvasNavButtons
            canBack={navStack.canBack}
            canForward={navStack.canForward}
            onBack={navStack.goBack}
            onForward={navStack.goForward}
          />
          <GraphCanvas
            graph={expandedGraph}
            selectedId={selectedOracleId}
            hoveredId={hoveredOracleId}
            onSelect={setSelected}
            onFocus={setFocusOracleId}
          />
        </div>
```

- [ ] **Step 5: Type-check and run full suite**

Run: `cd app && npx tsc --noEmit`
Expected: No errors.

Run: `cd app && npm test`
Expected: All tests pass.

- [ ] **Step 6: Manual smoke check**

Run: `cd app && npm run dev`
- Open `http://localhost:5173/deck/graph` with an active deck.
- Click a card — URL should gain `?selected=<oracleId>`, drawer opens.
- Click a different card — URL updates, drawer updates.
- Click the canvas back button (top-left chevron-left) — drawer reverts to prior card.
- Click forward — drawer advances again.
- Browser back/forward should behave identically.
- Close the drawer (X) — URL loses `selected`, back reopens it.

Stop the dev server (Ctrl-C) once verified.

- [ ] **Step 7: Commit**

```bash
git add app/src/pages/DeckGraphPage.tsx
git commit -m "feat(graph): canvas back/forward buttons + history-pushing selection"
```

---

## Task 6: Integration tests for URL-driven selection

**Files:**
- Create: `app/src/pages/DeckGraphPage.test.tsx`

End-to-end behavior tests at the React Testing Library level: cold-load with `?selected=`, click changes URL, stale `?selected=` is stripped, drawer close clears URL.

The component depends on Zustand stores (`useGraphStore`, `useDeckStore`) — initialize both with a tiny fixture before each test, similar to `DeckPage.test.tsx`.

- [ ] **Step 1: Inspect the existing DeckPage test for setup patterns**

Run: `head -40 app/src/pages/DeckPage.test.tsx`
Note: how `useGraphStore.setState` and `useDeckStore.setState` are reset in `beforeEach`, and how `MemoryRouter` wraps the page.

- [ ] **Step 2: Write the test file**

Create `app/src/pages/DeckGraphPage.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import DeckGraphPage from './DeckGraphPage';
import { useDeckStore } from '../stores/deckStore';
import { useGraphStore } from '../stores/graphStore';
import type { Card } from '@shared/types';

function makeCard(id: string, name: string): Card {
  return {
    oracleId: id,
    name,
    set: 'tst',
    collectorNumber: '1',
    printings: ['tst'],
    colors: [],
    colorIdentity: [],
    typeLine: 'Creature',
    manaCost: '{1}',
    cmc: 1,
    oracleText: '',
    imageUrl: '',
    legalities: {},
    keywords: [],
    rarity: 'common',
  } as Card;
}

function seedStores() {
  // Two cards, one edge between them, so `expandedGraph.nodes` contains both.
  const cardA = makeCard('a', 'Alpha');
  const cardB = makeCard('b', 'Bravo');
  const cards = new Map<string, Card>([['a', cardA], ['b', cardB]]);

  // edges: Map<oracleId, InteractionEdge[]> — minimal shape understood by deckGraph.
  const edges = new Map<string, Array<{
    target: string; effectTag: string; consumerTag: string;
  }>>([
    ['a', [{ target: 'b', effectTag: 'effect.destroy', consumerTag: 'condition.is_creature' }]],
  ]);
  const edgesInbound = new Map<string, Array<{
    source: string; effectTag: string; consumerTag: string;
  }>>([
    ['b', [{ source: 'a', effectTag: 'effect.destroy', consumerTag: 'condition.is_creature' }]],
  ]);

  useGraphStore.setState({
    cards,
    edges: edges as unknown as ReturnType<typeof useGraphStore.getState>['edges'],
    edgesInbound: edgesInbound as unknown as ReturnType<typeof useGraphStore.getState>['edgesInbound'],
    tagCatalog: new Map(),
    ruleVersion: 't',
    status: 'ready',
  });

  useDeckStore.setState({
    activeDeckId: 'd1',
    decks: [{
      id: 'd1', name: 'Test', format: 'standard',
      originalCards: [{ oracleId: 'a', count: 1 }, { oracleId: 'b', count: 1 }],
      workingCards: [{ oracleId: 'a', count: 1 }, { oracleId: 'b', count: 1 }],
      createdAt: 0, updatedAt: 0,
    }],
  });
}

function LocationProbe({ onChange }: { onChange: (loc: { pathname: string; search: string }) => void }) {
  const loc = useLocation();
  onChange({ pathname: loc.pathname, search: loc.search });
  return null;
}

function renderPage(initialEntries: string[] = ['/deck/graph']) {
  let currentLocation = { pathname: '', search: '' };
  const utils = render(
    <MemoryRouter initialEntries={initialEntries}>
      <LocationProbe onChange={(loc) => { currentLocation = loc; }} />
      <Routes>
        <Route path="/deck/graph" element={<DeckGraphPage />} />
      </Routes>
    </MemoryRouter>,
  );
  return { ...utils, getLocation: () => currentLocation };
}

beforeEach(() => {
  seedStores();
});

afterEach(() => {
  cleanup();
  useGraphStore.setState({
    cards: new Map(), edges: new Map(), edgesInbound: new Map(),
    tagCatalog: new Map(), ruleVersion: 't', status: 'ready',
  });
  useDeckStore.setState({ decks: [], activeDeckId: null });
  vi.restoreAllMocks();
});

describe('DeckGraphPage — URL-driven selection', () => {
  it('cold-loads with ?selected=<id> and opens the drawer for that card', async () => {
    renderPage(['/deck/graph?selected=a']);
    // SelectionDrawer renders the card name. Wait for the simulation to settle
    // enough for the drawer to mount.
    expect(await screen.findByText('Alpha', { selector: 'h2, [data-testid="drawer-title"], *' })).toBeTruthy();
  });

  it('strips ?selected=<id> when the card is not in the current graph', async () => {
    const { getLocation } = renderPage(['/deck/graph?selected=ghost']);
    // After mount + reconciliation effect, `selected` should be gone.
    await act(async () => { await Promise.resolve(); });
    expect(getLocation().search).not.toContain('selected=ghost');
  });

  it('clicking a node updates the URL with ?selected=<id>', async () => {
    const { getLocation } = renderPage(['/deck/graph']);
    const user = userEvent.setup();
    // The node renders as a <g role="button" aria-label="Alpha">.
    const node = await screen.findByRole('button', { name: 'Alpha' });
    await user.click(node);
    expect(getLocation().search).toContain('selected=a');
  });

  it('clicking the same node twice only updates the URL once', async () => {
    const { getLocation } = renderPage(['/deck/graph']);
    const user = userEvent.setup();
    const node = await screen.findByRole('button', { name: 'Alpha' });
    await user.click(node);
    const firstSearch = getLocation().search;
    await user.click(node);
    expect(getLocation().search).toBe(firstSearch);
  });

  it('closing the drawer removes ?selected from the URL', async () => {
    const { getLocation } = renderPage(['/deck/graph?selected=a']);
    const user = userEvent.setup();
    const closeBtn = await screen.findByRole('button', { name: /close/i });
    await user.click(closeBtn);
    expect(getLocation().search).not.toContain('selected=');
  });
});
```

NOTE: If `SelectionDrawer`'s close button does not match `name: /close/i`, run `grep -n "aria-label" app/src/components/deckGraph/SelectionDrawer.tsx` and substitute the actual aria-label. If the card name in the drawer is rendered with a different selector pattern, adjust the `findByText` query accordingly — the goal is "the drawer for Alpha is visible," not the exact matcher.

- [ ] **Step 3: Run the test file**

Run: `cd app && npm test -- --run DeckGraphPage`
Expected: All 5 tests pass.

If a test fails due to a query-selector mismatch (e.g. close button label differs), inspect the relevant component and adjust the query — the assertions about URL changes are the load-bearing part.

- [ ] **Step 4: Commit**

```bash
git add app/src/pages/DeckGraphPage.test.tsx
git commit -m "test(graph): integration tests for URL-driven selection"
```

---

## Task 7: Final verification gate

**Files:** (none — verification only)

- [ ] **Step 1: Run the full repo gate**

Run from the repo root: `npm test`
Expected: pipeline + shared types pass; app vitest passes; `app/npm run build` (tsc + vite) succeeds.

If anything fails, fix it before declaring complete. Common gotchas:
- `noUncheckedIndexedAccess` errors at type-check time — add explicit checks or non-null assertions where the invariant is obvious.
- A wizard tour-step targeting a tour ID we added but didn't wire up will log a console warning, not fail. That's expected — tour wiring is out of scope.

- [ ] **Step 2: Verify git status is clean apart from intended commits**

Run: `git status`
Expected: Working tree clean; the 6 commits from this plan visible in `git log --oneline -10`.

---

## Self-review summary

- **Spec coverage:** All five spec sections (URL schema, component changes, hook behavior, canvas buttons, testing) are covered by Tasks 1–6. The "stale `?selected`" stripping (Q3a), drawer-close pushes (Q3b), and focus-mode clearing selection (Q3c) are all wired in Task 4. The filter-toggle-interleaves-with-selection caveat is intentional behavior, not a task.
- **Placeholder scan:** No "TBD" / "implement later" / "add validation". One inline NOTE in Task 6 telling the engineer to adapt a query selector if the close button label differs — that's a real instruction, not a placeholder.
- **Type consistency:** `useNavStack` returns `{ canBack, canForward, markPush, goBack, goForward }` in Task 2 and is consumed with those exact names in Task 5. `setSelected(id: string | null)` signature is consistent across Task 4 call sites. `CanvasNavButtons` prop names `{ canBack, canForward, onBack, onForward }` match between Task 3 definition and Task 5 usage.
