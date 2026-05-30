# Card-name, rarity, and CMC-range filters

**Date:** 2026-05-24
**Status:** Spec — pending implementation plan

## Goal

Expand the left-sidebar filter set on `BrowserPage` and the inline filter set on `InteractionsPanel` so users can narrow by **card name**, **rarity**, and a **CMC range** (min + max). Restyle the left-sidebar Search / Colors / CMC section to a more compact, modern look.

## Scope

### Functional

1. **Card name filter** — new `name` substring filter, case-insensitive, on `card.name`. UI in `FilterPanel` only.
2. **Rarity filter** — UI in both `FilterPanel` and `InteractionsPanel`. The `Filter.rarities` field already exists on `app/src/lib/filter.ts` and is already applied by `applyFilter`; this change adds UI only.
3. **CMC range** — both panels currently show only a `CMC max` input. Add a `CMC min` input alongside it in both. `Filter.cmcMin` is already on the type and applied by `applyFilter`; this change adds UI only.
4. **Restyle** the FilterPanel Search / Colors / Rarity / CMC area to match the approved "Option B: two-up compact" mockup (see Visual reference).

### Non-functional

- Match existing dark-theme tailwind palette (`bg-neutral-950`, amber-500 accents).
- All new controls keyboard-accessible and labelled for screen readers.
- Inline JSX — no new shared components extracted.

### Out of scope

- `deckGraph/PillRow.tsx` — keeps its color-only filter. No rarity, no CMC range, no restyle.
- Sort controls, "clear all" controls, persistence of filter state.
- Auto-clamping or swapping `cmcMin > cmcMax`. The empty result is acceptable feedback.
- Fuzzy or tokenised name matching. Simple substring is sufficient (matches Scryfall's bare-name behaviour).

## Data model

```ts
export type Filter = {
  colors?: Color[];
  cmcMin?: number;     // unchanged on the type; new UI binds to it
  cmcMax?: number;
  types?: string[];
  subtypes?: string[];
  keywords?: string[];
  rarities?: Rarity[]; // unchanged on the type; new UI binds to it
  sets?: string[];
  text?: string;       // oracle text (unchanged)
  name?: string;       // NEW: case-insensitive substring on card.name
  tags?: string[];
};
```

One new clause in `applyFilter`:

```ts
if (f.name && !c.name.toLowerCase().includes(f.name.toLowerCase())) return false;
```

`Rarity` is already `'common' | 'uncommon' | 'rare' | 'mythic'` in `shared/types.ts` — no new types.

## Visual reference

**Approved direction: Option B — two-up compact.**

Left-sidebar panel sections, in order:
1. **Search** — single "Search" section label, then two stacked inputs: "Card name" (with magnifier icon) and "Oracle text contains…" (with text-lines icon). Each input is a rounded `bg-neutral-900` chip with a leading icon. Icons are inline SVG (no new dependency); the app does not use an icon library.
2. **Colors** — five mana-colored circles (W/U/B/R/G), 28px, ring on selected, `opacity-30` on unselected.
3. **Rarity** — four small letter chips (`C` neutral, `U` slate-blue, `R` amber, `M` orange) at 24×24 with rarity-themed gradients; `opacity-30` on unselected.
4. **CMC** — two side-by-side labeled inputs ("min" / "max"), each in its own rounded chip; equal width via `flex-1`.
5. Sets / Interactions / Deck themes sections unchanged.

`InteractionsPanel` keeps its existing tight visual style. It gets:
- A small rarity chip row immediately under the existing color row (same density as the color row).
- A `CMC ≥` number input directly left of the existing `CMC ≤` input.

## Files changed

- `app/src/lib/filter.ts` — add `name?: string` to `Filter`, add one `if` clause to `applyFilter`.
- `app/src/lib/filter.test.ts` — cases for `name` (substring, case-insensitivity, undefined-vs-empty), `cmcMin + cmcMax` combination, `rarities`.
- `app/src/components/FilterPanel.tsx` — restyle the Search / Colors / CMC section; add Name input; add Rarity row; replace `CMC max` with `min` + `max` pair.
- `app/src/components/FilterPanel.test.tsx` — UI tests: Name input fires `onChange`, rarity toggle fires `onChange`, CMC min fires `onChange`.
- `app/src/components/InteractionsPanel.tsx` — add rarity row under the color row; add `CMC ≥` input next to existing `CMC ≤`.
- `app/src/components/InteractionsPanel.test.tsx` — UI tests: rarity toggle narrows the result list, CMC min narrows the result list.

No changes to:
- `pipeline/**` — no rule, type, or artifact changes.
- `deckGraph/PillRow.tsx` and `pages/DeckGraphPage.tsx`.
- Stores, deck logic, or routing.

## Testing strategy

TDD per project convention. For each new filter clause and each new UI control:
1. Add failing test.
2. Implement.
3. Verify green.
4. Commit.

Run `npm test` (the full repo gate: pipeline tests + shared types + app vitest + app build) before declaring done.

## Risks

- **Inline JSX duplication** — the rarity row is written twice (FilterPanel vs InteractionsPanel) at different visual densities. Acceptable per the design discussion; if a third call site appears later, extract.
- **`applyFilter` runs on every keystroke** for both name and oracle-text inputs. This is already true for `text`; the dataset is 4,446 cards in the worst case; no debouncing needed.
- **Visual restyle** affects only the left sidebar of `BrowserPage`. Snapshots of unrelated components should not change.

## Open questions

None at design time.
