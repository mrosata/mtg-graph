# Per-group AND/OR toggle for tag filters

**Status:** design
**Date:** 2026-06-01
**Scope:** UI + filter logic + URL persistence
**Out of scope:** cross-group mode, chip-strip visualization, mode toggles on non-tag filters

## Problem

The Filter Panel's tag selections (Interactions and Deck themes) currently AND every selected tag together via `f.tags.every(...)` in `applyFilter` (`app/src/lib/filter.ts:62-65`). For a card to match, it must carry every selected tag.

This is too strict for common exploration: a user looking at, say, two graveyard-related effects often wants "either of these," not "both." The user wants a per-group toggle:

- Interactions: AND or OR
- Deck themes: AND or OR
- Between the two groups: always AND.

So `(has interaction A OR B) AND (has theme X AND Y)` is expressible.

## Design

### Filter shape (`app/src/lib/filter.ts`)

Keep `tags: string[]` flat (single URL-friendly list, smallest data shape change). Add two optional mode fields, both defaulting to `'and'`:

```ts
type Filter = {
  // ...existing fields
  tags?: string[];
  interactionTagsMode?: 'and' | 'or';  // default 'and'
  themeTagsMode?: 'and' | 'or';        // default 'and'
};
```

### `applyFilter` signature

```ts
applyFilter(
  cards: Card[],
  f: Filter,
  libraryFilter?: ReadonlySet<string>,
  tagCatalog?: Map<string, TagDef>,
): Card[]
```

When `tagCatalog` is supplied, `applyFilter` partitions `f.tags` by category — `tagDef.category === 'theme'` is a theme tag, anything else (including missing category) is an interaction tag, matching the partition already done in `FilterPanel.tsx:123-130`. Each group is evaluated with its own mode (`some` for OR, `every` for AND). The two group results are ANDed together.

When `tagCatalog` is omitted, behavior matches today's code (AND everything in `f.tags`), preserving backward compatibility for any non-UI caller and for tests that pre-date this change.

### URL persistence (`BrowserShell.tsx`)

Two new search params:

- `imode=or` → `interactionTagsMode: 'or'`
- `tmode=or` → `themeTagsMode: 'or'`

Encoding rule: only `'or'` writes a param; `'and'` (the default) omits it. Any param value other than `or` reads as `'and'`. Modes are merged into `filterForPanel` alongside the URL tags. Writing mode changes goes through the same `setSearchParams` flow used for `tag`.

### UI (`TagFilterSection.tsx`)

New optional props:

```ts
type Props = {
  // ...existing
  mode?: 'and' | 'or';
  onModeChange?: (next: 'and' | 'or') => void;
};
```

The toggle renders only when **both** props are supplied (so the Sets section, which reuses related patterns but not this component, stays unaffected; and any future reuse without these props is unchanged).

Visual: a small two-button segmented pill labelled "AND | OR", inline in the section header, immediately after the existing count badge. Active side gets the brass/active treatment used by the `Scope` segmented control (`FilterPanel.tsx:202-220`); inactive is muted.

Visibility: hidden when fewer than 2 tags are selected in that category (the toggle is meaningless with 0 or 1 selection; this also avoids drawing attention before the toggle is useful). When the toggle is hidden, the mode value is **preserved** (not auto-reset to AND) — a user who selects 3 tags, toggles to OR, then trims back to 1 tag should find OR still active when they re-add a tag.

Clicking the already-active side is a no-op (no `onModeChange` call) — keeps the handler idempotent and avoids spurious URL writes.

### Wiring (`FilterPanel.tsx`)

```ts
// Interactions section
<TagFilterSection
  // ...existing props
  mode={value.interactionTagsMode ?? 'and'}
  onModeChange={(m) =>
    onChange({
      ...value,
      interactionTagsMode: m === 'and' ? undefined : m,
    })
  }
/>

// Deck themes section — same with themeTagsMode
```

Storing `undefined` for the default keeps URL/state minimal (param absent ⇔ AND).

The existing `applyFilter` call inside FilterPanel (`FilterPanel.tsx:137`) gains the `tagCatalog` argument.

## Tests (TDD order)

1. **`app/src/lib/filter.test.ts`** — new cases:
   - OR within interactions: card with any one selected interaction matches.
   - AND within interactions: card with only one selected interaction does NOT match (regression for current behavior).
   - OR within themes: same pattern as interactions.
   - Mixed: `interactionTagsMode='or'` + `themeTagsMode='and'` → `(any interaction) AND (all themes)`.
   - When `tagCatalog` is omitted, behavior matches pre-change AND-everything.

2. **`app/src/components/filters/TagFilterSection.test.tsx`** — new cases:
   - Toggle renders when ≥2 tags are passed in `selected` and both `mode` and `onModeChange` are passed.
   - Toggle does not render when `selected.length < 2`.
   - Toggle does not render when `mode`/`onModeChange` are omitted.
   - Clicking the inactive side calls `onModeChange` with the right value.
   - Clicking the already-active side is a no-op (no `onModeChange` call) — keeps behavior idempotent.

3. **`app/src/components/BrowserShell.test.tsx`** — new cases:
   - URL `?imode=or` round-trips into `filterForPanel.interactionTagsMode === 'or'`.
   - URL `?tmode=or` same for themes.
   - Toggling Interactions mode in the panel writes `imode=or` to the URL.
   - Toggling Interactions mode back to AND removes `imode` from the URL.
   - `imode` and `tmode` are independent (changing one does not touch the other).

4. **`app/src/components/FilterPanel.test.tsx`** — wiring smoke:
   - Toggle in Interactions section invokes `onChange` with updated `interactionTagsMode` and leaves `themeTagsMode` untouched.
   - Toggle in Deck themes section invokes `onChange` with updated `themeTagsMode` and leaves `interactionTagsMode` untouched.

## Acceptance

- All existing tests pass with the new filter signature (the 4th arg is optional).
- New tests above pass.
- `npm test` from repo root is green (pipeline + app vitest + app build).
- Manual smoke: select 2 interactions and 2 themes; toggling Interactions to OR widens the result set; toggling Themes to OR widens further; URL reflects each toggle; reload preserves state.

## Out of scope

- Chip-strip visualization of OR (`SelectedTagChips.tsx` stays as-is).
- A cross-group mode toggle (interactions ↔ themes stays AND, per user spec).
- Mode toggles for Sets, Colors, Rarity, Types, Keywords (no signal these are needed).
- Default-mode customization per user (the default is AND for everyone).
