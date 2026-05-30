# Graph History Navigation Design

**Date:** 2026-05-26
**Status:** Approved for planning
**Scope:** `app/src/pages/DeckGraphPage.tsx`, `app/src/components/deckGraph/*`, one new hook

## Problem

On `/deck/graph`, clicking a card opens its drawer (`selectedOracleId`) but does not change the URL or push a browser-history entry. Hitting browser-back from the graph either jumps off the page entirely or undoes a filter toggle — never "undo my last card hop." Sharing a URL never preserves which card was selected. There are also no on-canvas controls to walk through navigation history, which makes the feature undiscoverable even after URL state lands.

## Goals

1. **Every node selection change is reflected in the URL** and pushes a browser-history entry, so browser back/forward walks the user through prior selections.
2. **On-canvas back/forward buttons** mirror browser history with correct enabled/disabled state at the boundaries, giving the feature a visible affordance.
3. **No regressions** to existing URL params (`mode`, `focus`, `colors`, `off_fam`) or filter behavior.

## Non-goals

- An independent "graph-only" navigation stack separate from browser history.
- Capturing filter toggles as anything other than their current pushes (they already push; no change).
- A breadcrumb/recently-viewed UI on the canvas.
- Auto-broadening filters or mode when a cold-loaded `?selected=X` isn't in the graph.

## Decisions (from brainstorming)

- **Scope:** Selection + focus changes go to URL/history. Filters keep current behavior. (Q1: B)
- **Canvas buttons:** Mirror `history.back()` / `history.forward()` with disabled state at boundaries. (Q2: B)
- **Stale `?selected`:** Silently strip via `setSearchParams(..., { replace: true })`. (Q3a: i)
- **Drawer close:** Pushes a history entry (back reopens). (Q3b: push)
- **Focus mode:** Continues to clear selection. (Q3c: i)
- **No breadcrumb component.**

## URL schema

Add one query param to `/deck/graph`. Full schema:

```
/deck/graph?mode=<deck|focus>&focus=<oracleId>&selected=<oracleId>&colors=<csv>&off_fam=<csv>
```

- `selected=<oracleId>` — card whose drawer is open. Absent ⇒ drawer closed.
- Validation on read: if `selected` does not appear in the current `expandedGraph.nodes`, strip it with `replace: true` (no history entry).
- Same-node selection is a no-op: if the click target equals the current `selected`, do not call `setSearchParams`.

## Component changes

### `DeckGraphPage.tsx`

- **Remove** `const [selectedOracleId, setSelectedOracleId] = useState<string | null>(null)`.
- **Derive** `const selectedOracleId = searchParams.get('selected')` instead.
- **Add** helper:
  ```ts
  const setSelected = (id: string | null) => {
    if (id === selectedOracleId) return;
    updateUrl((next) => {
      if (id === null) next.delete('selected');
      else next.set('selected', id);
    });
  };
  ```
- **Replace** every `setSelectedOracleId(...)` call site with `setSelected(...)`:
  - `GraphCanvas` `onSelect`
  - `GraphCanvas` `onFocus` (still clears selection, but combined into one `updateUrl` call alongside the focus mutation so it produces a single history entry)
  - `SelectionDrawer` `onClose`
  - `SelectionDrawer` `onSelectNeighbor`
  - The existing effect at line 159–163 that clears `selectedOracleId` when it drops out of `expandedGraph` becomes the URL-stripping behavior (use `replace: true` here, not push — this is an automatic reconciliation, not a user navigation).
- **Render** the new `<CanvasNavButtons>` as a sibling overlay inside the graph wrapper `<div className="min-w-0 flex-1">` (positioned absolute, top-left).

### `useNavStack.ts` (new, `app/src/lib/`)

Small hook exposing `{ canBack, canForward, goBack, goForward }`.

Mechanism:

1. On mount, seed `history.state` with `{ ...existing, __navIdx: 0 }` via `history.replaceState` if `__navIdx` is missing. Track a ref `maxIdxRef = useRef(0)` and state `currentIdx`.
2. Patch new entries: expose a `markPush()` function that, called immediately after a `setSearchParams(next)` (push variant), reads the now-current `history.state`, sets `__navIdx = currentIdx + 1` (the browser truncates forward history on push, so the new entry is always one past the current index — never past the prior max), writes it back with `history.replaceState`, then sets both `currentIdx` and `maxIdxRef.current` to that new value.
3. `popstate` listener: read `history.state.__navIdx`. Set `currentIdx` to that value (or 0 if missing). Do not touch `maxIdxRef` — forward remains reachable until a new push.
4. `canBack = currentIdx > 0`; `canForward = currentIdx < maxIdxRef.current`.
5. `goBack = () => history.back()`; `goForward = () => history.forward()`.

`DeckGraphPage` calls `useNavStack()` once and wires `markPush()` into `updateUrl`:

```ts
function updateUrl(mutate: (next: URLSearchParams) => void, opts?: { replace?: boolean }) {
  const next = new URLSearchParams(searchParams);
  mutate(next);
  setSearchParams(next, opts);
  if (!opts?.replace) markPush();
}
```

### `CanvasNavButtons.tsx` (new, `app/src/components/deckGraph/`)

Props: `{ canBack: boolean; canForward: boolean; onBack: () => void; onForward: () => void }`.

Layout: two circular icon buttons (chevron-left / chevron-right) absolutely positioned at top-left, ~12px inset, 32px diameter, semi-transparent `bg-neutral-900/60` with `bg-neutral-800/80` on hover, white chevron. Disabled state: `opacity-40 cursor-not-allowed`, no hover treatment, `disabled` attribute set so it doesn't fire `onClick`.

Accessibility: `aria-label="Go back"` / `"Go forward"`. Add `TOUR_IDS.deckGraphNavBack` and `TOUR_IDS.deckGraphNavForward` to `app/src/wizard/selectors.ts` and apply via `data-tour-id`.

## Data flow

```
User clicks node
  → GraphCanvas onSelect(id)
  → DeckGraphPage setSelected(id)
  → updateUrl(next => next.set('selected', id))
  → setSearchParams(next)  [push]
  → markPush() bumps __navIdx + maxIdx
  → re-render: searchParams.get('selected') === id, drawer opens

User clicks browser-back (or canvas ⟵)
  → popstate fires
  → React Router updates searchParams
  → useNavStack reads history.state.__navIdx → setCurrentIdx
  → re-render: drawer reflects prior selected, canBack/canForward update
```

## Caveat (called out in brainstorming)

Filter toggles already push, so browser-back interleaves filter changes and selection changes. The canvas buttons mirror that — they are a literal browser-history walker, not a selection-only walker. This is intentional per Q1/Q2.

## Testing

### `useNavStack.test.ts` (new)
- Initial state: `canBack=false`, `canForward=false`, `currentIdx=0`.
- After one `markPush()`: `canBack=true`, `canForward=false`, `currentIdx=1`.
- After back (`popstate` with `__navIdx=0`): `canBack=false`, `canForward=true`.
- After back-then-forward (`popstate` with `__navIdx=1`): `canBack=true`, `canForward=false`.
- After back-then-new-push: forward should disable (`maxIdx` resets to `currentIdx + 1` on push, not just incremented).

### `DeckGraphPage.test.tsx` (extend or new)
- Cold-load `?selected=X` (X in graph) opens drawer on X.
- Cold-load stale `?selected=X` strips param and renders no drawer.
- Click node → URL has `?selected=<id>`.
- Click same node twice → URL changes once.
- Drawer close → URL has no `selected`.
- Browser back after two selections → prior selection restored.

### `CanvasNavButtons.test.tsx` (new)
- Both disabled when `canBack/canForward=false`.
- `onBack`/`onForward` fired on click when enabled.
- `aria-label` present.

### Run gate
`npm test` from repo root (pipeline + app vitest + app build).

## Files touched

| File | Change |
|---|---|
| `app/src/pages/DeckGraphPage.tsx` | Derive `selectedOracleId` from URL; replace setter call sites; mount overlay. |
| `app/src/lib/useNavStack.ts` | **New** hook. |
| `app/src/lib/useNavStack.test.ts` | **New** tests. |
| `app/src/components/deckGraph/CanvasNavButtons.tsx` | **New** component. |
| `app/src/components/deckGraph/CanvasNavButtons.test.tsx` | **New** tests. |
| `app/src/wizard/selectors.ts` | Add `deckGraphNavBack`, `deckGraphNavForward` tour ids. |
| (existing) `DeckGraphPage` component test | Extend or add cold-load/click/back coverage. |
