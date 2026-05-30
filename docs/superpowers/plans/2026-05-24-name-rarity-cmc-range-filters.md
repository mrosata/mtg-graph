# Name / Rarity / CMC-range filters — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a card-name filter to the left sidebar, surface the existing `rarities` filter as UI in both `FilterPanel` and `InteractionsPanel`, turn the single CMC-max input into a min/max pair in both panels, and restyle the left-bar Search/Colors/Rarity/CMC section to the compact "Option B" mockup.

**Architecture:** All changes are in the `app/` SPA. The pipeline, artifact, and graph store are untouched. The `Filter` type already has `cmcMin`, `cmcMax`, and `rarities` wired through `applyFilter`; we only add a new `name?: string` field plus UI controls. Restyle is tailwind-class swaps in `FilterPanel.tsx` only — `InteractionsPanel` keeps its visual density and gains controls inline.

**Tech Stack:** TypeScript, React, Vite, Vitest, React Testing Library, Tailwind.

**Spec:** `docs/superpowers/specs/2026-05-24-name-rarity-cmc-range-filters-design.md`

---

## File Structure

- `app/src/lib/filter.ts` — add `name?: string` to `Filter`, add one clause in `applyFilter`.
- `app/src/lib/filter.test.ts` — new cases: name substring, name case-insensitivity, cmcMin+max combination.
- `app/src/components/FilterPanel.tsx` — restyle the Search/Colors/CMC section per Option B; add Name input; add Rarity row; replace CMC-max with CMC-min + CMC-max pair.
- `app/src/components/FilterPanel.test.tsx` — new UI tests for Name, Rarity, CMC-min.
- `app/src/components/InteractionsPanel.tsx` — add Rarity chip row under the existing color row; add a `CMC ≥` input next to the existing `CMC ≤`.
- `app/src/components/InteractionsPanel.test.tsx` — new UI tests for Rarity and CMC-min.

No other files change. Pipeline, stores, deck graph, and routing are untouched.

---

## Task 1: Add `name` filter to `applyFilter`

**Files:**
- Modify: `app/src/lib/filter.ts`
- Test: `app/src/lib/filter.test.ts`

- [ ] **Step 1: Write failing tests in `app/src/lib/filter.test.ts`**

Add these `it` blocks inside the existing `describe('applyFilter', ...)`:

```ts
it('filters by name substring (case-insensitive)', () => {
  const cards = [
    card({ oracleId: 'bolt', name: 'Lightning Bolt' }),
    card({ oracleId: 'chain', name: 'Chain Lightning' }),
    card({ oracleId: 'counter', name: 'Counterspell' }),
  ];
  expect(applyFilter(cards, { name: 'lightning' }).map((c) => c.oracleId))
    .toEqual(['bolt', 'chain']);
});

it('returns all cards when name filter is empty string', () => {
  const cards = [card({ oracleId: 'a', name: 'Anything' })];
  expect(applyFilter(cards, { name: '' }).map((c) => c.oracleId)).toEqual(['a']);
});

it('combines name with other filters via AND', () => {
  const cards = [
    card({ oracleId: 'r_bolt', name: 'Lightning Bolt', colors: ['R'] }),
    card({ oracleId: 'u_bolt', name: 'Lightning Bolt of Mine', colors: ['U'] }),
  ];
  expect(applyFilter(cards, { name: 'lightning', colors: ['R'] }).map((c) => c.oracleId))
    .toEqual(['r_bolt']);
});

it('filters by cmcMin combined with cmcMax', () => {
  const cards = [
    card({ oracleId: 'one', cmc: 1 }),
    card({ oracleId: 'three', cmc: 3 }),
    card({ oracleId: 'five', cmc: 5 }),
  ];
  expect(applyFilter(cards, { cmcMin: 2, cmcMax: 4 }).map((c) => c.oracleId))
    .toEqual(['three']);
});
```

- [ ] **Step 2: Run tests, expect failures**

Run: `cd app && npm test -- filter.test`
Expected: 4 new failures — the name cases fail because `Filter.name` doesn't exist (TS error or no effect), and cmcMin case fails for the same reason in the type (cmcMin is on the type but the test will pass — re-check after step 3).

Note: `cmcMin` already exists on the type. The cmcMin+cmcMax test will pass on first run if the type is unchanged. Keep it anyway — it's a regression net.

- [ ] **Step 3: Add `name` field and filter clause in `app/src/lib/filter.ts`**

Add `name?: string;` between `text?: string;` and `tags?: string[];` in the `Filter` type:

```ts
export type Filter = {
  colors?: Color[];
  cmcMin?: number;
  cmcMax?: number;
  types?: string[];
  subtypes?: string[];
  keywords?: string[];
  rarities?: Rarity[];
  sets?: string[];
  text?: string;
  name?: string;
  tags?: string[];
};
```

Add this clause inside `applyFilter`'s `.filter` callback, immediately after the `f.text` clause:

```ts
if (f.name && !c.name.toLowerCase().includes(f.name.toLowerCase())) return false;
```

- [ ] **Step 4: Run tests, expect passes**

Run: `cd app && npm test -- filter.test`
Expected: all `applyFilter` tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/filter.ts app/src/lib/filter.test.ts
git commit -m "$(cat <<'EOF'
feat(app): add name substring filter to applyFilter

Case-insensitive substring match on card.name. AND-combines with all
other filter fields. Adds regression coverage for cmcMin+cmcMax.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: FilterPanel — restyle Search section + add Name input

**Files:**
- Modify: `app/src/components/FilterPanel.tsx` (the existing "Oracle text" section)
- Test: `app/src/components/FilterPanel.test.tsx`

- [ ] **Step 1: Write failing tests in `app/src/components/FilterPanel.test.tsx`**

Add inside the existing `describe('FilterPanel', ...)`:

```ts
it('emits filter object when card name is typed', () => {
  const onChange = vi.fn();
  render(<FilterPanel value={{}} onChange={onChange} cards={[]} tagCatalog={new Map()} />);
  fireEvent.change(screen.getByLabelText('Card name'), { target: { value: 'bolt' } });
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ name: 'bolt' }));
});

it('clears the name when the input is emptied', () => {
  const onChange = vi.fn();
  render(<FilterPanel value={{ name: 'bolt' }} onChange={onChange} cards={[]} tagCatalog={new Map()} />);
  fireEvent.change(screen.getByLabelText('Card name'), { target: { value: '' } });
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ name: undefined }));
});
```

The existing test `it('emits filter object when text typed', ...)` already uses `getByLabelText('Oracle text')`; it must keep passing after the restyle. The new section uses `aria-label="Oracle text"`, which satisfies `getByLabelText`.

- [ ] **Step 2: Run tests, expect failures**

Run: `cd app && npm test -- FilterPanel`
Expected: 2 new failures — no element with label "Card name".

- [ ] **Step 3: Delete the old Oracle-text section in `app/src/components/FilterPanel.tsx`**

Find this block (around lines 119–133) and delete it entirely:

```tsx
      <section>
        <label
          htmlFor="text-filter"
          className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500"
        >
          Oracle text
        </label>
        <input
          id="text-filter"
          type="text"
          value={value.text ?? ''}
          onChange={(e) => onChange({ ...value, text: e.target.value || undefined })}
          className="mt-2 w-full rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-sm focus:border-neutral-600 focus:outline-none"
        />
      </section>
```

- [ ] **Step 4: Insert the new combined `Search` section as the *first* section in the returned JSX**

The current first section is `Colors` (around line 79: `<section>` containing `Colors` label). Insert this new section *immediately before* the Colors section so Search becomes the topmost group:

```tsx
      <section>
        <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
          Search
        </label>
        <div className="mt-2 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 focus-within:border-neutral-600">
            <svg
              width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              className="flex-shrink-0 text-neutral-500"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder="Card name"
              aria-label="Card name"
              value={value.name ?? ''}
              onChange={(e) => onChange({ ...value, name: e.target.value || undefined })}
              className="w-full bg-transparent text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 focus-within:border-neutral-600">
            <svg
              width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              className="flex-shrink-0 text-neutral-500"
              aria-hidden="true"
            >
              <path d="M4 6h16M4 12h10M4 18h16" />
            </svg>
            <input
              type="text"
              placeholder="Oracle text contains…"
              aria-label="Oracle text"
              value={value.text ?? ''}
              onChange={(e) => onChange({ ...value, text: e.target.value || undefined })}
              className="w-full bg-transparent text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none"
            />
          </div>
        </div>
      </section>
```

After this step the section order is: **Search → Colors → CMC → Sets → Interactions → Themes**. Tasks 3–5 then restyle Colors, insert Rarity between Colors and CMC, and convert CMC.

- [ ] **Step 5: Run tests, expect passes**

Run: `cd app && npm test -- FilterPanel`
Expected: all FilterPanel tests pass (including the pre-existing `emits filter object when text typed`).

- [ ] **Step 6: Commit**

```bash
git add app/src/components/FilterPanel.tsx app/src/components/FilterPanel.test.tsx
git commit -m "$(cat <<'EOF'
feat(app): add Card name input + restyle Search section in FilterPanel

Combines name and oracle-text searches into one Search section with
leading icons and a compact chip look (Option B). Existing oracle
text behavior preserved; tests updated for the new label.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: FilterPanel — restyle the Colors row

**Files:**
- Modify: `app/src/components/FilterPanel.tsx`

The existing test `emits filter object when color toggled` uses `screen.getByRole('button', { name: 'R' })`. The new buttons keep accessible name "R" via `aria-label`, so no new test is needed here — this task is purely visual.

- [ ] **Step 1: Add a color-style map near the top of the file**

After the existing `const COLORS: Color[] = ['W', 'U', 'B', 'R', 'G'];` line, add:

```ts
const COLOR_STYLES: Record<Color, string> = {
  W: 'bg-amber-50 text-amber-900 border-amber-200',
  U: 'bg-blue-100 text-blue-900 border-blue-200',
  B: 'bg-neutral-800 text-neutral-300 border-neutral-700',
  R: 'bg-red-100 text-red-900 border-red-200',
  G: 'bg-emerald-100 text-emerald-900 border-emerald-200',
};
```

- [ ] **Step 2: Replace the Colors `<section>`**

Find this block (around lines 79–98):

```tsx
      <section>
        <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
          Colors
        </label>
        <div className="mt-2 flex gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => toggleColor(c)}
              className={`h-7 w-7 rounded border text-sm font-semibold transition ${
                value.colors?.includes(c)
                  ? 'border-amber-500 bg-amber-500 text-black'
                  : 'border-neutral-800 text-neutral-300 hover:border-neutral-600'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </section>
```

Replace with:

```tsx
      <section>
        <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
          Colors
        </label>
        <div className="mt-2 flex gap-1.5">
          {COLORS.map((c) => {
            const on = value.colors?.includes(c) ?? false;
            return (
              <button
                key={c}
                type="button"
                aria-label={c}
                aria-pressed={on}
                onClick={() => toggleColor(c)}
                className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold transition ${COLOR_STYLES[c]} ${on ? 'ring-2 ring-amber-400/70' : 'opacity-30 hover:opacity-60'}`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </section>
```

- [ ] **Step 3: Run tests**

Run: `cd app && npm test -- FilterPanel`
Expected: all FilterPanel tests still pass, including `emits filter object when color toggled`.

- [ ] **Step 4: Commit**

```bash
git add app/src/components/FilterPanel.tsx
git commit -m "$(cat <<'EOF'
style(app): restyle FilterPanel color toggles as mana-colored circles

Each W/U/B/R/G is a round chip in its mana family colors; selected
toggles get an amber ring, unselected fade to opacity-30.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: FilterPanel — add Rarity row

**Files:**
- Modify: `app/src/components/FilterPanel.tsx`
- Test: `app/src/components/FilterPanel.test.tsx`

- [ ] **Step 1: Write failing tests**

Add inside the existing `describe('FilterPanel', ...)`:

```ts
it('emits filter object when a rarity is toggled', () => {
  const onChange = vi.fn();
  render(<FilterPanel value={{}} onChange={onChange} cards={[]} tagCatalog={new Map()} />);
  fireEvent.click(screen.getByRole('button', { name: 'rare' }));
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ rarities: ['rare'] }));
});

it('removes a rarity from the filter when toggled off', () => {
  const onChange = vi.fn();
  render(<FilterPanel value={{ rarities: ['rare', 'mythic'] }} onChange={onChange} cards={[]} tagCatalog={new Map()} />);
  fireEvent.click(screen.getByRole('button', { name: 'rare' }));
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ rarities: ['mythic'] }));
});
```

- [ ] **Step 2: Run tests, expect failures**

Run: `cd app && npm test -- FilterPanel`
Expected: 2 new failures — no button named "rare".

- [ ] **Step 3: Update the `Rarity` import and add a toggle handler in `app/src/components/FilterPanel.tsx`**

Change the existing types import line:

```ts
import type { Card, Color, TagDef } from '@shared/types';
```

to:

```ts
import type { Card, Color, Rarity, TagDef } from '@shared/types';
```

Add this constant block under the existing `COLOR_STYLES` block:

```ts
const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'mythic'];
const RARITY_STYLES: Record<Rarity, { letter: string; on: string }> = {
  common: { letter: 'C', on: 'bg-neutral-800 text-neutral-200 border-neutral-600' },
  uncommon: { letter: 'U', on: 'bg-gradient-to-br from-slate-700 to-slate-900 text-slate-200 border-slate-500' },
  rare: { letter: 'R', on: 'bg-gradient-to-br from-amber-950 to-stone-950 text-amber-300 border-amber-700' },
  mythic: { letter: 'M', on: 'bg-gradient-to-br from-orange-950 to-stone-950 text-orange-300 border-orange-700' },
};
```

Add this handler next to the existing `toggleColor`, `toggleSet`, `toggleTag` functions (inside the component body):

```tsx
const toggleRarity = (r: Rarity) => {
  const rarities = value.rarities ?? [];
  onChange({
    ...value,
    rarities: rarities.includes(r) ? rarities.filter((x) => x !== r) : [...rarities, r],
  });
};
```

- [ ] **Step 4: Insert the Rarity `<section>` immediately after the Colors `<section>` (before the CMC section)**

```tsx
      <section>
        <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
          Rarity
        </label>
        <div className="mt-2 flex gap-1.5">
          {RARITIES.map((r) => {
            const on = value.rarities?.includes(r) ?? false;
            const style = RARITY_STYLES[r];
            return (
              <button
                key={r}
                type="button"
                aria-label={r}
                aria-pressed={on}
                onClick={() => toggleRarity(r)}
                className={`flex h-6 min-w-6 items-center justify-center rounded border px-1.5 text-[11px] font-bold transition ${style.on} ${on ? '' : 'opacity-30 hover:opacity-60'}`}
              >
                {style.letter}
              </button>
            );
          })}
        </div>
      </section>
```

- [ ] **Step 5: Run tests, expect passes**

Run: `cd app && npm test -- FilterPanel`
Expected: all FilterPanel tests pass, including the 2 new rarity tests.

- [ ] **Step 6: Commit**

```bash
git add app/src/components/FilterPanel.tsx app/src/components/FilterPanel.test.tsx
git commit -m "$(cat <<'EOF'
feat(app): add Rarity filter row to FilterPanel

Four small letter chips (C/U/R/M) with rarity-themed gradients; OR
semantics across selected rarities, matching the existing applyFilter
behavior.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: FilterPanel — convert CMC max → CMC min/max pair

**Files:**
- Modify: `app/src/components/FilterPanel.tsx`
- Test: `app/src/components/FilterPanel.test.tsx`

- [ ] **Step 1: Write failing test**

Add inside the existing `describe('FilterPanel', ...)`:

```ts
it('emits filter object when CMC min is set', () => {
  const onChange = vi.fn();
  render(<FilterPanel value={{}} onChange={onChange} cards={[]} tagCatalog={new Map()} />);
  fireEvent.change(screen.getByLabelText('CMC min'), { target: { value: '2' } });
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ cmcMin: 2 }));
});

it('emits filter object when CMC max is set', () => {
  const onChange = vi.fn();
  render(<FilterPanel value={{}} onChange={onChange} cards={[]} tagCatalog={new Map()} />);
  fireEvent.change(screen.getByLabelText('CMC max'), { target: { value: '6' } });
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ cmcMax: 6 }));
});

it('clears CMC min when input is emptied', () => {
  const onChange = vi.fn();
  render(<FilterPanel value={{ cmcMin: 2 }} onChange={onChange} cards={[]} tagCatalog={new Map()} />);
  fireEvent.change(screen.getByLabelText('CMC min'), { target: { value: '' } });
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ cmcMin: undefined }));
});
```

- [ ] **Step 2: Run tests, expect failures**

Run: `cd app && npm test -- FilterPanel`
Expected: 3 new failures — no element labeled "CMC min" or "CMC max".

- [ ] **Step 3: Replace the CMC `<section>` in `app/src/components/FilterPanel.tsx`**

Find this block (around lines 100–117):

```tsx
      <section>
        <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
          CMC max
        </label>
        <input
          type="number"
          min={0}
          max={20}
          value={value.cmcMax ?? ''}
          onChange={(e) =>
            onChange({
              ...value,
              cmcMax: e.target.value === '' ? undefined : Number(e.target.value),
            })
          }
          className="mt-2 w-20 rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-sm focus:border-neutral-600 focus:outline-none"
        />
      </section>
```

Replace with:

```tsx
      <section>
        <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
          CMC
        </label>
        <div className="mt-2 flex gap-1.5">
          <div className="flex flex-1 items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1 focus-within:border-neutral-600">
            <span className="text-[10px] uppercase tracking-wider text-neutral-500">min</span>
            <input
              type="number"
              min={0}
              max={20}
              aria-label="CMC min"
              value={value.cmcMin ?? ''}
              onChange={(e) =>
                onChange({
                  ...value,
                  cmcMin: e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
              className="w-full min-w-0 bg-transparent text-sm text-neutral-100 focus:outline-none"
            />
          </div>
          <div className="flex flex-1 items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1 focus-within:border-neutral-600">
            <span className="text-[10px] uppercase tracking-wider text-neutral-500">max</span>
            <input
              type="number"
              min={0}
              max={20}
              aria-label="CMC max"
              value={value.cmcMax ?? ''}
              onChange={(e) =>
                onChange({
                  ...value,
                  cmcMax: e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
              className="w-full min-w-0 bg-transparent text-sm text-neutral-100 focus:outline-none"
            />
          </div>
        </div>
      </section>
```

Heads-up: the existing `mutes a theme that would yield zero results given current filters` test passes `value={{ cmcMax: -1 }}`. That continues to work because the input still binds to `value.cmcMax`.

- [ ] **Step 4: Run tests, expect passes**

Run: `cd app && npm test -- FilterPanel`
Expected: all FilterPanel tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/FilterPanel.tsx app/src/components/FilterPanel.test.tsx
git commit -m "$(cat <<'EOF'
feat(app): convert FilterPanel CMC max input into min/max range

Two side-by-side labeled inputs ("min" / "max") in matching chip
style. Both bind directly to Filter.cmcMin and Filter.cmcMax which
are already wired through applyFilter.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: InteractionsPanel — add Rarity row + CMC min

**Files:**
- Modify: `app/src/components/InteractionsPanel.tsx`
- Test: `app/src/components/InteractionsPanel.test.tsx`

- [ ] **Step 1: Write failing tests in `app/src/components/InteractionsPanel.test.tsx`**

Update the test fixtures to include cards with varied rarities and CMCs. Find the `beforeEach` and update the `cards` Map to include rarity + cmc on a couple of neighbors:

Add helper override at the top of the file (replace the existing `card` helper):

```ts
function card(
  id: string,
  name: string,
  colors: any[] = [],
  opts: { cmc?: number; rarity?: 'common' | 'uncommon' | 'rare' | 'mythic' } = {},
): Card {
  return {
    oracleId: id, name, set: 't', printings: ['t'], collectorNumber: '1',
    manaCost: null, cmc: opts.cmc ?? 0, colors, colorIdentity: colors,
    typeLine: '', types: [], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null,
    rarity: opts.rarity ?? 'common', imageUrl: '', tags: [],
  };
}
```

Update the `beforeEach` body's `cards` map entries for `B` and `C` to differ in rarity and CMC:

```ts
cards: new Map([
  ['A', card('A', 'AlphaCard')],
  ['B', card('B', 'BetaCard', ['R'], { cmc: 2, rarity: 'rare' })],
  ['C', card('C', 'GammaCard', ['W'], { cmc: 5, rarity: 'common' })],
  ['D', card('D', 'DeltaShrine')],
]),
```

Add these `it` blocks at the bottom of the `describe('InteractionsPanel', ...)`:

```ts
it('filters neighbors by rarity', () => {
  renderPanel();
  fireEvent.click(screen.getByRole('button', { name: 'rare' }));
  // Only BetaCard (rare) remains; GammaCard (common) is filtered out.
  expect(screen.getByText('BetaCard')).toBeInTheDocument();
  expect(screen.queryByText('GammaCard')).not.toBeInTheDocument();
});

it('filters neighbors by CMC min', () => {
  renderPanel();
  fireEvent.change(screen.getByLabelText('CMC min'), { target: { value: '3' } });
  // GammaCard (cmc 5) remains; BetaCard (cmc 2) is filtered out.
  expect(screen.getByText('GammaCard')).toBeInTheDocument();
  expect(screen.queryByText('BetaCard')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests, expect failures**

Run: `cd app && npm test -- InteractionsPanel`
Expected: 2 new failures — no button "rare", no input labeled "CMC min".

- [ ] **Step 3: Add a `Rarity` import and constants in `app/src/components/InteractionsPanel.tsx`**

Change the existing types import:

```ts
import type { Card, Color, TagDef } from '@shared/types';
```

to:

```ts
import type { Card, Color, Rarity, TagDef } from '@shared/types';
```

Add this constant just below the existing `const COLORS: Color[] = [...]` line:

```ts
const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'mythic'];
const RARITY_LETTERS: Record<Rarity, string> = {
  common: 'C', uncommon: 'U', rare: 'R', mythic: 'M',
};
```

- [ ] **Step 4: Update the existing color/CMC row to add `CMC ≥` input and a rarity row**

Find this block (around lines 180–207 in `InteractionsPanel.tsx`):

```tsx
      <div className="mb-2 flex flex-wrap gap-1">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() =>
              setFilter({
                ...filter,
                colors: filter.colors?.includes(c)
                  ? filter.colors.filter((x) => x !== c)
                  : [...(filter.colors ?? []), c],
              })
            }
            className={`h-6 w-6 rounded border text-xs ${filter.colors?.includes(c) ? 'bg-amber-500 text-black' : 'border-neutral-700'}`}
          >
            {c}
          </button>
        ))}
        <input
          type="number"
          placeholder="CMC ≤"
          min={0}
          value={filter.cmcMax ?? ''}
          onChange={(e) =>
            setFilter({ ...filter, cmcMax: e.target.value === '' ? undefined : Number(e.target.value) })
          }
          className="w-16 bg-neutral-900 px-1 text-sm"
        />
      </div>
```

Replace with:

```tsx
      <div className="mb-1 flex flex-wrap gap-1">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() =>
              setFilter({
                ...filter,
                colors: filter.colors?.includes(c)
                  ? filter.colors.filter((x) => x !== c)
                  : [...(filter.colors ?? []), c],
              })
            }
            className={`h-6 w-6 rounded border text-xs ${filter.colors?.includes(c) ? 'bg-amber-500 text-black' : 'border-neutral-700'}`}
          >
            {c}
          </button>
        ))}
        <input
          type="number"
          placeholder="CMC ≥"
          aria-label="CMC min"
          min={0}
          value={filter.cmcMin ?? ''}
          onChange={(e) =>
            setFilter({ ...filter, cmcMin: e.target.value === '' ? undefined : Number(e.target.value) })
          }
          className="w-16 bg-neutral-900 px-1 text-sm"
        />
        <input
          type="number"
          placeholder="CMC ≤"
          aria-label="CMC max"
          min={0}
          value={filter.cmcMax ?? ''}
          onChange={(e) =>
            setFilter({ ...filter, cmcMax: e.target.value === '' ? undefined : Number(e.target.value) })
          }
          className="w-16 bg-neutral-900 px-1 text-sm"
        />
      </div>
      <div className="mb-2 flex flex-wrap gap-1">
        {RARITIES.map((r) => {
          const on = filter.rarities?.includes(r) ?? false;
          return (
            <button
              key={r}
              type="button"
              aria-label={r}
              aria-pressed={on}
              onClick={() =>
                setFilter({
                  ...filter,
                  rarities: on
                    ? filter.rarities?.filter((x) => x !== r)
                    : [...(filter.rarities ?? []), r],
                })
              }
              className={`h-6 min-w-6 rounded border px-1.5 text-[11px] font-bold ${on ? 'border-amber-500 bg-amber-500/20 text-amber-200' : 'border-neutral-700 text-neutral-400'}`}
            >
              {RARITY_LETTERS[r]}
            </button>
          );
        })}
      </div>
```

- [ ] **Step 5: Run tests, expect passes**

Run: `cd app && npm test -- InteractionsPanel`
Expected: all InteractionsPanel tests pass, including the 2 new ones.

- [ ] **Step 6: Commit**

```bash
git add app/src/components/InteractionsPanel.tsx app/src/components/InteractionsPanel.test.tsx
git commit -m "$(cat <<'EOF'
feat(app): add rarity + CMC-min controls to InteractionsPanel

Adds a four-chip rarity row beneath the color row and a 'CMC ≥' input
next to the existing 'CMC ≤'. Existing applyColorCmc plumbing already
threads both rarities and cmcMin through applyFilter.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Final repo gate

**Files:** none modified — verification only.

- [ ] **Step 1: Run the full repo gate from the repo root**

Run: `npm test`

Expected: pipeline tests pass, shared-types tests pass, app vitest passes, `app/npm run build` (tsc + vite) succeeds.

If anything fails:
- TS error in app — usually `noUncheckedIndexedAccess` strict-mode catch in test fixtures. Fix inline.
- Component test failure unrelated to this work — check `git status`; if no other files changed, the failure is from this branch and must be addressed before declaring done.

- [ ] **Step 2: Manual smoke (optional but recommended)**

```
cd app && npm run dev
```

Visit `http://localhost:5173/`.

Verify on the BrowserPage left sidebar:
- "Card name" search input narrows results to cards whose names contain the typed substring.
- Five round mana-colored color toggles.
- "Rarity" row with four letter chips — clicking narrows results.
- "CMC" row shows two side-by-side min/max inputs; both narrow results correctly.
- Setting CMC min > CMC max yields zero results (acceptable; no clamping).

Open any card's detail drawer; on the InteractionsPanel:
- A "CMC ≥" input appears next to the existing "CMC ≤".
- A four-chip rarity row appears beneath the color row; clicking narrows the neighbor list.

- [ ] **Step 3: Declare done**

The plan is complete when `npm test` passes from the repo root, all commits from tasks 1–6 are present in the branch, and the manual smoke matches the expected behavior.
