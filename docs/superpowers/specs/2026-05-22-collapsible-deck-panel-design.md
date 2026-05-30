# Collapsible Deck Panel — Design

**Date:** 2026-05-22
**Status:** Approved for implementation
**Scope:** `app/` — UI only. No pipeline, artifact, or store-schema changes.

## Problem

The right-side `DeckPanel` on the `DeckPage` route is a fixed 360px rail
(`app/src/pages/DeckPage.tsx:83`). With the filter aside (260px) and an optional
card-detail drawer (420px), a user building a deck on a 1280px window is left
with ~240px of card grid. They have no way to reclaim that space while keeping
deck-level statistics visible.

## Goal

Let the user collapse the deck panel into a ~72px sliver that still shows the
deck's shape at a glance: total count, type breakdown, mana curve, color
distribution. Toggling is one click; the choice persists across reloads;
clicking a type widget in the collapsed view jumps back to that section of
the expanded view.

## Non-goals

- No changes to the deck data model, persistence layer (Dexie), or graph
  artifact.
- No hide-entirely state. Collapse is width-only; the rail is always present
  on `DeckPage`.
- No responsive auto-collapse. The user controls the state.
- No new e2e coverage; the existing Playwright smoke test continues to apply.

## UX

### Two width states

| State | Width | Notes |
| --- | --- | --- |
| Expanded | 360px | Unchanged from current behavior. |
| Collapsed | 72px | New compact sliver. |

Transition: `transition-[width] duration-200 ease-out`. Content swaps at state
boundaries (no cross-fade).

### Collapsed layout (top to bottom)

```
┌────────┐
│  ▶     │  24×24 chevron, top-right padding-inset, aria-label="Expand deck panel"
│        │
│  60c   │  total card count — font-mono, neutral-100
│        │
│ ┌────┐ │
│ │C 24│ │  type pills — 56×18, colored bg + uppercase letter + count
│ │I 12│ │  one row per type present in the deck (in TYPE_ORDER)
│ │S  8│ │  click = expand + scrollIntoView for the matching section
│ │A  4│ │  hover = native title tooltip with full type name
│ │L 20│ │
│ └────┘ │
│        │
│ ▁▃▅▇▅▃ │  MiniManaCurve 64×36, no axis labels
│        │  hover bar = native title "CMC 3: 8"
│        │
│ ▓▓░▓░  │  ColorPipBar 64×12, WUBRG order, segment widths proportional
└────────┘  hover segment = native title "{R}: 14 pips"
```

### Expanded layout

Unchanged except for a small `◀` chevron in the top-right of the header area
(aria-label="Collapse deck panel"). The chevron sits inline with the deck-name
heading so it does not displace existing content.

### Type pill palette

Subtle, tag-style backgrounds — not high-saturation. Letter is `text-neutral-100`.

| Type | Letter | Background |
| --- | --- | --- |
| Creature | C | `bg-emerald-700` |
| Planeswalker | P | `bg-purple-700` |
| Instant | I | `bg-sky-700` |
| Sorcery | S | `bg-rose-700` |
| Artifact | A | `bg-stone-600` |
| Enchantment | E | `bg-amber-700` |
| Battle | B | `bg-orange-700` |
| Land | L | `bg-neutral-700` |

Only types with `> 0` cards in the deck render. Order follows the existing
`TYPE_ORDER` constant in `DeckPanel.tsx`.

### Click-to-jump behavior

Clicking a collapsed type pill:
1. Sets `collapsed = false`.
2. In a microtask (`queueMicrotask` or `setTimeout(0)`), calls
   `scrollIntoView({ behavior: 'smooth', block: 'start' })` on the matching
   `<h3>` heading in the expanded view.

The expanded view attaches refs to each type heading via a `Record<string,
HTMLHeadingElement | null>` ref-map owned by `DeckPanel`.

## Architecture

### Files added

- `app/src/components/DeckPanelCollapsed.tsx` — the sliver. Props: `deck`,
  `cards`, `onExpand`, `onJumpToType(type: string)`.
- `app/src/components/ColorPipBar.tsx` — reusable horizontal stacked bar.
  Props: `distribution: Record<Color, number>`, `width`, `height`.
- `app/src/components/MiniManaCurve.tsx` — compact curve (no axis labels).
  Props: `countsByCmc: number[]`, `width`, `height`.
- `app/src/lib/deckStats.ts` — pure helpers (see below).
- `app/src/lib/deckStats.test.ts`
- `app/src/lib/useDeckPanelCollapsed.ts` — `localStorage`-backed boolean hook.

### Files modified

- `app/src/components/DeckPanel.tsx` — orchestrates collapse state, owns the
  ref-map for type headings, branches between collapsed and expanded views,
  controls its own width. The current rendering becomes the expanded branch
  with a toggle chevron added to the header.
- `app/src/pages/DeckPage.tsx` — remove the hard-coded `w-[360px]` on the
  wrapping `<div>` so `DeckPanel` owns its own width. Keep `shrink-0`,
  `overflow-y-auto`, and `border-l`.

### `deckStats.ts` API

```ts
type Color = 'W' | 'U' | 'B' | 'R' | 'G';

export function typeCounts(
  deck: Deck,
  cards: Map<string, Card>,
): Record<string, number>;

export function manaCurveBuckets(
  deck: Deck,
  cards: Map<string, Card>,
): number[];  // length 8, index 7 = "7+", lands excluded

export function colorPipDistribution(
  deck: Deck,
  cards: Map<string, Card>,
): Record<Color, number>;
```

`colorPipDistribution` parses each non-land card's `manaCost` string, counts
`{W}/{U}/{B}/{R}/{G}` symbols, multiplies by the entry's `count`, and sums.
Hybrid pips (`{W/U}`, `{2/W}`, etc.) contribute 0.5 to each side. Phyrexian
pips (`{W/P}`) count as 1.0 to the listed color. Colorless and generic mana
(`{2}`, `{C}`) are ignored. Final values are rounded to one decimal for
display, but kept as floats internally for proportional widths.

The current `DeckPanel.tsx` computes its curve inline (lines 54–64). Refactor
it to call `manaCurveBuckets` so both views share one source of truth.

### `useDeckPanelCollapsed.ts`

```ts
export function useDeckPanelCollapsed(): readonly [boolean, (v: boolean) => void];
```

Reads `localStorage['mtg-graph:deck-panel-collapsed']` on init; defaults to
`false`. Writes on every update. Wraps both reads and writes in try/catch so
that storage-disabled environments (private mode, SSR) fall back to an
in-memory `useState`. No SSR is in scope today, but the guard is cheap.

## Visual details

- All numeric counts use `font-mono` for stable column widths.
- Chevron buttons are 24×24, transparent background, `text-neutral-400`
  hover `text-neutral-100`. Use the existing CSS chevron glyphs `◀` / `▶`
  rather than introducing an icon library.
- Type pills have `rounded-sm` corners, 6px horizontal padding, 2px vertical.
- `MiniManaCurve` reuses the bar-style of `ManaCurve.tsx` but with smaller
  bar widths (`w-2` instead of `w-6`), no `<div>` of CMC labels below, and
  the height passed in via props rather than hardcoded.
- `ColorPipBar`:
  - 5 segments in WUBRG order
  - Each segment uses the corresponding mana-font color: white = `bg-yellow-100`,
    blue = `bg-sky-300`, black = `bg-neutral-800`, red = `bg-red-500`, green = `bg-green-600`.
  - Segments with zero pips are not rendered (skip — don't render a 0-width div).
  - Container has `rounded-sm` and `overflow-hidden`.
  - When `totalPips === 0`, render a single `bg-neutral-800` placeholder bar.

## Edge cases

- **Empty deck (zero cards):** sliver renders chevron, `0c`, no type pills,
  curve bars all zero-height, color bar shows the placeholder. No crash.
- **No active deck:** existing "No active deck" message renders in expanded
  mode. Collapse toggle stays disabled (hidden) when there is no active deck —
  there's nothing to summarize.
- **Deck with only lands:** type pills show just `L 20`, curve is all zeros
  (lands excluded), color bar is the placeholder.
- **Cards missing from `cards` map** (deck references an oracleId not in the
  artifact): excluded from all stats — same behavior as the existing
  `Unknown` group in the expanded view, which the collapsed view does not
  display.
- **localStorage throws:** hook falls back to `useState` silently.

## Tests

### `deckStats.test.ts` (pure)

- `typeCounts`: empty deck → `{}`; mixed deck → correct counts; primary type
  is the first match in `TYPE_ORDER` (a creature-artifact counts as Creature).
- `manaCurveBuckets`: lands excluded; CMC ≥ 7 collapses into bucket 7;
  counts respect entry `count`.
- `colorPipDistribution`: pure pips, hybrid pips (½ each side), Phyrexian
  pips (full to color), generic mana ignored, lands ignored, empty deck
  returns all zeros.

### `ColorPipBar.test.tsx`

- Renders 5 segments for a full WUBRG deck.
- Segment widths sum to 100% (proportional).
- Zero-pip deck renders the placeholder (single neutral bar), no NaN
  widths.

### `DeckPanelCollapsed.test.tsx`

- Renders total count, type pills (only present types), `MiniManaCurve`,
  `ColorPipBar`.
- Clicking the chevron calls `onExpand`.
- Clicking a type pill calls `onJumpToType` with the right type.

### `DeckPanel.test.tsx` (additions to existing file)

- Toggle chevron flips between collapsed and expanded renderings.
- Toggling writes to `localStorage['mtg-graph:deck-panel-collapsed']`.
- Hydrates from `localStorage` on mount.
- Existing tests (grouped by type, total count, legality warnings, empty
  state) continue to pass against the expanded view.

`scrollIntoView` is mocked at the prototype level (jsdom doesn't implement
it); assertions verify it was called with the expected element, not the
visual outcome.

### No e2e

The existing Playwright smoke (`app/tests/e2e/`) does not currently exercise
the deck panel beyond load; this change does not extend it.

## Implementation order (TDD)

1. `deckStats.ts` + tests (red → green).
2. `useDeckPanelCollapsed.ts`.
3. `ColorPipBar.tsx` + test.
4. `MiniManaCurve.tsx` (no test — pure presentational, covered by
   `DeckPanelCollapsed.test.tsx`).
5. `DeckPanelCollapsed.tsx` + test.
6. `DeckPanel.tsx` refactor: extract expanded branch, add chevron, wire up
   ref-map, branch on collapsed state. Update its test file.
7. `DeckPage.tsx`: remove `w-[360px]`.
8. `npm test` (full gate). `npm run dev` for manual browser verification:
   toggle, reload persistence, pill jump-to-section, animation smoothness,
   hover titles.

## Worktree workflow

1. `git worktree add .worktrees/collapsible-deck-panel -b feat/collapsible-deck-panel main`
2. Implement steps 1–8 above in the worktree.
3. Report status to user. User reviews locally.
4. On approval: merge `feat/collapsible-deck-panel` into `main`, fast-forward
   if clean otherwise no-ff merge commit. Remove the worktree with
   `git worktree remove .worktrees/collapsible-deck-panel`.

## Out of scope (future ideas)

- Auto-collapse below a viewport width threshold.
- Per-card row in collapsed view (the user's original "list without names"
  thought) — left aside in favor of aggregate type counts.
- Color-identity-based distribution as an alternative metric — current spec
  commits to mana pip distribution.
- Drag-to-resize the panel between the two states.
