# Per-group AND/OR tag filter mode — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-group AND/OR toggle to the FilterPanel's Interactions and Deck themes sections, so users can switch each section's tag-matching mode independently. The two groups remain ANDed together.

**Architecture:** Extend the existing `Filter` type with two optional mode flags (`interactionTagsMode`, `themeTagsMode`, default `'and'`). Extend `applyFilter` with an optional `tagCatalog` argument; when provided, it partitions `f.tags` by `tagDef.category` and evaluates each group with its own mode. Modes persist in the URL as `imode=or` / `tmode=or` (default omitted). A small AND/OR pill is added to `TagFilterSection` and rendered only when ≥2 tags are selected in that section and both `mode`/`onModeChange` are provided.

**Tech Stack:** TypeScript, React, Vite, vitest, React Testing Library, react-router-dom.

**Spec:** `docs/superpowers/specs/2026-06-01-and-or-tag-filter-mode-design.md`

---

## File Structure

**Modify:**
- `app/src/lib/filter.ts` — extend `Filter` and `applyFilter`.
- `app/src/lib/filter.test.ts` — new test cases.
- `app/src/components/filters/TagFilterSection.tsx` — new props + toggle UI; header layout tweak.
- `app/src/components/filters/TagFilterSection.test.tsx` — new test cases.
- `app/src/components/BrowserShell.tsx` — read/write `imode`/`tmode` URL params; route through `filterForPanel` / `handleFilterChange`.
- `app/src/components/BrowserShell.test.tsx` — new test cases (uses a small `URLProbe` helper).
- `app/src/components/FilterPanel.tsx` — wire `mode`/`onModeChange` into each `TagFilterSection`; pass `tagCatalog` into `applyFilter`.
- `app/src/components/FilterPanel.test.tsx` — new test cases.

**No new files.**

---

## Task 1: Extend the filter type and `applyFilter`

**Files:**
- Modify: `app/src/lib/filter.ts:10-27` (Filter type), `app/src/lib/filter.ts:33-68` (applyFilter)
- Test: `app/src/lib/filter.test.ts`

- [ ] **Step 1: Add the failing tests**

Append the following to `app/src/lib/filter.test.ts` (inside the existing `describe('applyFilter', ...)` block — add before its closing `});`):

```ts
  describe('tag mode (interaction / theme)', () => {
    const catalog = new Map<string, import('@shared/types').TagDef>([
      ['i1', { tagId: 'i1', axis: 'effect', label: 'i1', description: '', pairsWith: [] }],
      ['i2', { tagId: 'i2', axis: 'effect', label: 'i2', description: '', pairsWith: [] }],
      ['t1', { tagId: 't1', axis: 'effect', label: 't1', description: '', pairsWith: [], category: 'theme' }],
      ['t2', { tagId: 't2', axis: 'effect', label: 't2', description: '', pairsWith: [], category: 'theme' }],
    ]);

    function withTags(id: string, tagIds: string[]) {
      return card({
        oracleId: id,
        tags: tagIds.map((tid) => ({ tagId: tid, axis: 'effect', source: 'rule', ruleId: 'r' })),
      });
    }

    const cards = [
      withTags('a', ['i1']),
      withTags('b', ['i2']),
      withTags('c', ['i1', 'i2']),
      withTags('d', ['i1', 't1']),
      withTags('e', ['i1', 'i2', 't1', 't2']),
    ];

    it('without tagCatalog, ANDs all f.tags together (back-compat)', () => {
      const f: Filter = { tags: ['i1', 'i2'] };
      const out = applyFilter(cards, f);
      expect(out.map((c) => c.oracleId)).toEqual(['c', 'e']);
    });

    it('with tagCatalog, default (no mode) ANDs within interactions', () => {
      const f: Filter = { tags: ['i1', 'i2'] };
      const out = applyFilter(cards, f, undefined, catalog);
      expect(out.map((c) => c.oracleId)).toEqual(['c', 'e']);
    });

    it('interactionTagsMode=or matches any selected interaction', () => {
      const f: Filter = { tags: ['i1', 'i2'], interactionTagsMode: 'or' };
      const out = applyFilter(cards, f, undefined, catalog);
      expect(out.map((c) => c.oracleId)).toEqual(['a', 'b', 'c', 'd', 'e']);
    });

    it('themeTagsMode=or matches any selected theme', () => {
      const f: Filter = { tags: ['t1', 't2'], themeTagsMode: 'or' };
      const out = applyFilter(cards, f, undefined, catalog);
      expect(out.map((c) => c.oracleId)).toEqual(['d', 'e']);
    });

    it('themeTagsMode=and (default) requires all themes', () => {
      const f: Filter = { tags: ['t1', 't2'] };
      const out = applyFilter(cards, f, undefined, catalog);
      expect(out.map((c) => c.oracleId)).toEqual(['e']);
    });

    it('mixed: interactions OR, themes AND (groups ANDed)', () => {
      const f: Filter = {
        tags: ['i1', 'i2', 't1', 't2'],
        interactionTagsMode: 'or',
        themeTagsMode: 'and',
      };
      const out = applyFilter(cards, f, undefined, catalog);
      expect(out.map((c) => c.oracleId)).toEqual(['e']);
    });

    it('mixed: interactions AND, themes OR', () => {
      const f: Filter = {
        tags: ['i1', 'i2', 't1'],
        interactionTagsMode: 'and',
        themeTagsMode: 'or',
      };
      const out = applyFilter(cards, f, undefined, catalog);
      expect(out.map((c) => c.oracleId)).toEqual(['e']);
    });

    it('tags missing from the catalog are treated as interactions', () => {
      const f: Filter = { tags: ['i1', 'unknown'], interactionTagsMode: 'or' };
      const out = applyFilter(cards, f, undefined, catalog);
      expect(out.map((c) => c.oracleId)).toEqual(['a', 'c', 'd', 'e']);
    });
  });
```

- [ ] **Step 2: Run the tests, verify they fail**

Run from repo root:
```bash
cd app && npx vitest run src/lib/filter.test.ts
```

Expected: the 8 new cases fail (most because `interactionTagsMode`/`themeTagsMode` are unknown properties and `applyFilter` ignores them; some pass by accident — that's fine, the modal ones fail).

- [ ] **Step 3: Extend the Filter type**

In `app/src/lib/filter.ts`, replace lines 10–27 with:

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
  scope?: Scope;
  // When false/undefined (default), hide cards whose printings are entirely
  // in Commander companion products. Reprints (any non-commander printing)
  // are unaffected. Orthogonal to `scope`.
  includeCommander?: boolean;
  text?: string;
  name?: string;
  tags?: string[];
  // Per-group tag matching mode. Default 'and'. Only consulted when applyFilter
  // is called with a tagCatalog so it can partition tags by category.
  interactionTagsMode?: 'and' | 'or';
  themeTagsMode?: 'and' | 'or';
};
```

Also update the import at the top to bring in `TagDef`:

```ts
import type { Card, Color, Rarity, TagDef } from '@shared/types';
```

- [ ] **Step 4: Extend `applyFilter`**

Replace the `applyFilter` body (lines 33–68 in the pre-edit file) with:

```ts
export function applyFilter(
  cards: Card[],
  f: Filter,
  libraryFilter?: ReadonlySet<string>,
  tagCatalog?: Map<string, TagDef>,
): Card[] {
  return cards.filter((c) => {
    if (libraryFilter && !libraryFilter.has(c.oracleId)) return false;
    if (f.scope === 'standard' && !c.printings.some((p) => STANDARD_SET_SET.has(p))) return false;
    if (f.scope === 'unreleased') {
      if (!c.printings.some((p) => UPCOMING_SET_SET.has(p))) return false;
      if (c.supertypes.includes('Basic')) return false;
    }
    if (!f.includeCommander && c.printings.every((p) => COMMANDER_SET_SET.has(p))) return false;
    if (f.colors?.length) {
      if (c.colors.length === 0) return false;
      if (!c.colors.every((col) => f.colors!.includes(col))) return false;
    }
    if (f.cmcMin != null && c.cmc < f.cmcMin) return false;
    if (f.cmcMax != null && c.cmc > f.cmcMax) return false;
    if (f.types?.length && !c.types.some((t) => f.types!.includes(t))) return false;
    if (f.subtypes?.length && !c.subtypes.some((s) => f.subtypes!.includes(s))) return false;
    if (f.keywords?.length) {
      const lowerKw = c.keywords.map((k) => k.toLowerCase());
      if (!f.keywords.some((k) => lowerKw.includes(k.toLowerCase()))) return false;
    }
    if (f.rarities?.length && !f.rarities.includes(c.rarity)) return false;
    if (f.sets?.length && !c.printings.some((p) => f.sets!.includes(p))) return false;
    if (f.text && !c.oracleText.toLowerCase().includes(f.text.toLowerCase())) return false;
    if (f.name && !c.name.toLowerCase().includes(f.name.toLowerCase())) return false;
    if (f.tags?.length) {
      const cardTagIds = new Set(c.tags.map((t) => t.tagId));
      if (!tagCatalog) {
        if (!f.tags.every((id) => cardTagIds.has(id))) return false;
      } else {
        const interactionIds: string[] = [];
        const themeIds: string[] = [];
        for (const id of f.tags) {
          if (tagCatalog.get(id)?.category === 'theme') themeIds.push(id);
          else interactionIds.push(id);
        }
        if (interactionIds.length) {
          const mode = f.interactionTagsMode ?? 'and';
          const ok = mode === 'or'
            ? interactionIds.some((id) => cardTagIds.has(id))
            : interactionIds.every((id) => cardTagIds.has(id));
          if (!ok) return false;
        }
        if (themeIds.length) {
          const mode = f.themeTagsMode ?? 'and';
          const ok = mode === 'or'
            ? themeIds.some((id) => cardTagIds.has(id))
            : themeIds.every((id) => cardTagIds.has(id));
          if (!ok) return false;
        }
      }
    }
    return true;
  });
}
```

- [ ] **Step 5: Run the tests, verify they pass**

```bash
cd app && npx vitest run src/lib/filter.test.ts
```

Expected: all tests pass (existing + 8 new).

- [ ] **Step 6: Commit**

```bash
git add app/src/lib/filter.ts app/src/lib/filter.test.ts
git commit -m "$(cat <<'EOF'
filter: per-group AND/OR tag matching

applyFilter gains an optional tagCatalog argument. When supplied, it
partitions f.tags by category (theme vs interaction) and applies the
matching f.{interactionTagsMode,themeTagsMode} (default 'and') to each
group. The two groups are ANDed together. Without a tagCatalog, behavior
is unchanged (all tags ANDed).
EOF
)"
```

---

## Task 2: AND/OR toggle UI in `TagFilterSection`

**Files:**
- Modify: `app/src/components/filters/TagFilterSection.tsx`
- Test: `app/src/components/filters/TagFilterSection.test.tsx`

- [ ] **Step 1: Add the failing tests**

Append the following inside `describe('TagFilterSection', ...)` in `TagFilterSection.test.tsx`:

```tsx
  describe('mode toggle', () => {
    it('renders AND/OR toggle when 2+ tags are selected and mode/onModeChange are provided', () => {
      render(
        <TagFilterSection
          title="Interactions"
          tags={interactionTags}
          groupByAxis
          selected={['effect.draw', 'effect.deal_damage']}
          onToggle={() => {}}
          mode="and"
          onModeChange={() => {}}
        />,
      );
      expect(screen.getByRole('radio', { name: /^and$/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /^or$/i })).toBeInTheDocument();
    });

    it('does not render the toggle when only 1 tag is selected', () => {
      render(
        <TagFilterSection
          title="Interactions"
          tags={interactionTags}
          groupByAxis
          selected={['effect.draw']}
          onToggle={() => {}}
          mode="and"
          onModeChange={() => {}}
        />,
      );
      expect(screen.queryByRole('radio', { name: /^and$/i })).not.toBeInTheDocument();
    });

    it('does not render the toggle when mode/onModeChange are omitted', () => {
      render(
        <TagFilterSection
          title="Interactions"
          tags={interactionTags}
          groupByAxis
          selected={['effect.draw', 'effect.deal_damage']}
          onToggle={() => {}}
        />,
      );
      expect(screen.queryByRole('radio', { name: /^or$/i })).not.toBeInTheDocument();
    });

    it('marks the active mode with aria-checked', () => {
      render(
        <TagFilterSection
          title="Interactions"
          tags={interactionTags}
          groupByAxis
          selected={['effect.draw', 'effect.deal_damage']}
          onToggle={() => {}}
          mode="or"
          onModeChange={() => {}}
        />,
      );
      expect(screen.getByRole('radio', { name: /^or$/i })).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByRole('radio', { name: /^and$/i })).toHaveAttribute('aria-checked', 'false');
    });

    it('calls onModeChange with the clicked mode', () => {
      const onModeChange = vi.fn();
      render(
        <TagFilterSection
          title="Interactions"
          tags={interactionTags}
          groupByAxis
          selected={['effect.draw', 'effect.deal_damage']}
          onToggle={() => {}}
          mode="and"
          onModeChange={onModeChange}
        />,
      );
      fireEvent.click(screen.getByRole('radio', { name: /^or$/i }));
      expect(onModeChange).toHaveBeenCalledWith('or');
    });

    it('does not call onModeChange when the active side is clicked', () => {
      const onModeChange = vi.fn();
      render(
        <TagFilterSection
          title="Interactions"
          tags={interactionTags}
          groupByAxis
          selected={['effect.draw', 'effect.deal_damage']}
          onToggle={() => {}}
          mode="and"
          onModeChange={onModeChange}
        />,
      );
      fireEvent.click(screen.getByRole('radio', { name: /^and$/i }));
      expect(onModeChange).not.toHaveBeenCalled();
    });
  });
```

- [ ] **Step 2: Run the tests, verify they fail**

```bash
cd app && npx vitest run src/components/filters/TagFilterSection.test.tsx
```

Expected: the 6 new cases fail (no radio elements rendered).

- [ ] **Step 3: Update the `Props` type and add the toggle**

In `app/src/components/filters/TagFilterSection.tsx`, extend the `Props` type (around line 7-16) with:

```ts
type Props = {
  title: string;
  tags: TagDef[];
  groupByAxis?: boolean;
  pinnedTagIds?: string[];
  selected: string[];
  onToggle: (tagId: string) => void;
  zeroResultPreview?: (tagId: string) => boolean;
  storageKey?: string;
  mode?: 'and' | 'or';
  onModeChange?: (next: 'and' | 'or') => void;
};
```

Update the function signature (around line 52-54):

```ts
export default function TagFilterSection({
  title, tags, groupByAxis, pinnedTagIds, selected, onToggle, zeroResultPreview, storageKey,
  mode, onModeChange,
}: Props) {
```

Replace the existing header row (lines 154–171 in the pre-edit file, the `<div className="flex items-center justify-between">…</div>` block that wraps the collapse button) with this:

```tsx
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="group flex items-center gap-1.5 text-vellum-dim transition-colors hover:text-vellum"
        >
          <span aria-hidden="true" className="inline-block w-3 text-brass/70">
            {collapsed ? '▸' : '▾'}
          </span>
          <span className="eyebrow group-hover:text-vellum">{title}</span>
          {selected.length > 0 && (
            <span className="ml-1 rounded bg-brass/15 px-1.5 font-mono text-[10px] leading-5 tracking-normal text-brass-hi tabular">
              {selected.length}
            </span>
          )}
        </button>
        {mode !== undefined && onModeChange && selected.length >= 2 && (
          <div
            role="radiogroup"
            aria-label={`${title} match mode`}
            className="flex rounded-md border border-ink-line bg-ink-raised p-0.5"
          >
            {(['and', 'or'] as const).map((m) => {
              const active = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={m.toUpperCase()}
                  onClick={() => { if (!active) onModeChange(m); }}
                  className={
                    'focus-brass rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ' +
                    (active
                      ? 'bg-brass/20 text-brass-hi shadow-[inset_0_0_0_1px_rgba(212,164,74,0.35)]'
                      : 'text-vellum-dim hover:text-vellum')
                  }
                >
                  {m}
                </button>
              );
            })}
          </div>
        )}
      </div>
```

- [ ] **Step 4: Run the tests, verify they pass**

```bash
cd app && npx vitest run src/components/filters/TagFilterSection.test.tsx
```

Expected: all tests pass (existing + 6 new).

- [ ] **Step 5: Commit**

```bash
git add app/src/components/filters/TagFilterSection.tsx app/src/components/filters/TagFilterSection.test.tsx
git commit -m "$(cat <<'EOF'
filters: AND/OR mode toggle in TagFilterSection

New optional mode + onModeChange props render a small segmented
AND/OR pill in the section header. The toggle appears only when both
props are supplied AND the section has 2+ selected tags. Clicking the
already-active side is a no-op.
EOF
)"
```

---

## Task 3: URL persistence (`imode` / `tmode`) in `BrowserShell`

**Files:**
- Modify: `app/src/components/BrowserShell.tsx`
- Test: `app/src/components/BrowserShell.test.tsx`

- [ ] **Step 1: Add the failing tests**

In `app/src/components/BrowserShell.test.tsx`, add the following helper component after the existing imports (after line 6):

```tsx
import { useSearchParams } from 'react-router-dom';

function URLProbe() {
  const [sp] = useSearchParams();
  return <pre data-testid="url-params">{sp.toString()}</pre>;
}
```

Then append a new describe block inside the top-level `describe('BrowserShell', ...)`:

```tsx
  describe('tag mode URL persistence', () => {
    function renderWith(initial: string) {
      return render(
        <MemoryRouter initialEntries={[initial]}>
          <BrowserShell filter={{}} onFilterChange={() => {}} />
          <URLProbe />
        </MemoryRouter>,
      );
    }

    it('preserves imode=or from the initial URL', () => {
      const view = renderWith('/?imode=or');
      expect(view.getByTestId('url-params').textContent).toContain('imode=or');
    });

    it('preserves tmode=or from the initial URL', () => {
      const view = renderWith('/?tmode=or');
      expect(view.getByTestId('url-params').textContent).toContain('tmode=or');
    });

    it('preserves imode and tmode independently', () => {
      const view = renderWith('/?imode=or');
      expect(view.getByTestId('url-params').textContent).toContain('imode=or');
      expect(view.getByTestId('url-params').textContent).not.toContain('tmode=');
    });

    it('preserves imode alongside tags', () => {
      const view = renderWith('/?imode=or&tag=x&tag=y');
      const text = view.getByTestId('url-params').textContent ?? '';
      expect(text).toContain('imode=or');
      expect(text).toContain('tag=x');
      expect(text).toContain('tag=y');
    });
  });
```

(Note: these tests lock in that BrowserShell does not corrupt the URL when `imode`/`tmode` are present. The full read+toggle round trip — URL `imode=or` actually changing filter behavior — is covered by `FilterPanel.test.tsx` in Task 4 plus the manual smoke step. The write-side — clicking the toggle updating the URL — is exercised by manual smoke; we keep BrowserShell's unit test focused on the read side so we don't have to mount FilterPanel + a seeded store + a URL probe in the same test.)

- [ ] **Step 2: Run the tests, verify they fail**

```bash
cd app && npx vitest run src/components/BrowserShell.test.tsx
```

Expected: new tests pass already if the URL is reflected directly (since `URLProbe` reads raw `useSearchParams`). They MAY pass. If they pass, that just means the read-side plumbing is a no-op (URL → `useSearchParams`). The interesting behavior is on the FilterPanel side — proceed to step 3 to wire reads/writes into BrowserShell's `filterForPanel` and `handleFilterChange`.

- [ ] **Step 3: Read modes from the URL in `BrowserShell`**

In `app/src/components/BrowserShell.tsx`, add after the existing `urlTags` line (around line 48):

```tsx
  const urlInteractionMode = useMemo<'and' | 'or'>(
    () => (searchParams.get('imode') === 'or' ? 'or' : 'and'),
    [searchParams],
  );
  const urlThemeMode = useMemo<'and' | 'or'>(
    () => (searchParams.get('tmode') === 'or' ? 'or' : 'and'),
    [searchParams],
  );
```

Update `filterForPanel` (currently lines 63–66) to merge them in:

```tsx
  const filterForPanel: Filter = useMemo(
    () => ({
      ...filter,
      tags: urlTags,
      interactionTagsMode: urlInteractionMode === 'and' ? undefined : urlInteractionMode,
      themeTagsMode: urlThemeMode === 'and' ? undefined : urlThemeMode,
    }),
    [filter, urlTags, urlInteractionMode, urlThemeMode],
  );
```

- [ ] **Step 4: Write modes to the URL in `handleFilterChange`**

Replace the existing `handleFilterChange` (lines 68–76 in the pre-edit file) with:

```tsx
  const handleFilterChange = useCallback((next: Filter) => {
    const nextTags = next.tags ?? [];
    const sameTags =
      nextTags.length === urlTags.length &&
      nextTags.every((t, i) => t === urlTags[i]);
    const nextIMode = next.interactionTagsMode ?? 'and';
    const nextTMode = next.themeTagsMode ?? 'and';
    const sameModes = nextIMode === urlInteractionMode && nextTMode === urlThemeMode;
    if (!sameTags || !sameModes) {
      setSearchParams((prev) => {
        const sp = new URLSearchParams(prev);
        if (!sameTags) {
          sp.delete('tag');
          for (const t of nextTags) sp.append('tag', t);
        }
        if (nextIMode === 'or') sp.set('imode', 'or');
        else sp.delete('imode');
        if (nextTMode === 'or') sp.set('tmode', 'or');
        else sp.delete('tmode');
        return sp;
      });
    }
    const { tags: _omitTags, interactionTagsMode: _omitI, themeTagsMode: _omitT, ...rest } = next;
    onFilterChange(rest);
  }, [urlTags, urlInteractionMode, urlThemeMode, setSearchParams, onFilterChange]);
```

This drops `setUrlTags` and replaces it with a single `setSearchParams` that handles tags + both modes atomically. Remove the now-unused `setUrlTags` helper (lines 50–57 in the pre-edit file), but keep `removeUrlTag` — update it to call `setSearchParams` directly:

```tsx
  const removeUrlTag = useCallback((tagId: string) => {
    setSearchParams((prev) => {
      const sp = new URLSearchParams(prev);
      const remaining = sp.getAll('tag').filter((t) => t !== tagId);
      sp.delete('tag');
      for (const t of remaining) sp.append('tag', t);
      return sp;
    });
  }, [setSearchParams]);
```

- [ ] **Step 5: Run the BrowserShell tests, verify they pass**

```bash
cd app && npx vitest run src/components/BrowserShell.test.tsx
```

Expected: all tests pass (existing + new).

- [ ] **Step 6: Commit**

```bash
git add app/src/components/BrowserShell.tsx app/src/components/BrowserShell.test.tsx
git commit -m "$(cat <<'EOF'
browser-shell: persist tag mode in the URL

imode=or and tmode=or in the URL flow into filterForPanel as
interactionTagsMode and themeTagsMode respectively. Writes coalesce
tag and mode changes into a single setSearchParams call. Default
('and') omits the param.
EOF
)"
```

---

## Task 4: Wire `TagFilterSection` mode props from `FilterPanel`

**Files:**
- Modify: `app/src/components/FilterPanel.tsx`
- Test: `app/src/components/FilterPanel.test.tsx`

- [ ] **Step 1: Add the failing tests**

Append the following inside `describe('FilterPanel', ...)` in `FilterPanel.test.tsx`:

```tsx
  it('renders the Interactions AND/OR toggle when 2+ interaction tags are selected', () => {
    const catalogWithTwo = new Map<string, TagDef>([
      ['effect.draw', { tagId: 'effect.draw', axis: 'effect', label: 'Draw cards', description: '', pairsWith: [] }],
      ['effect.burn', { tagId: 'effect.burn', axis: 'effect', label: 'Burn', description: '', pairsWith: [] }],
    ]);
    render(
      <FilterPanel
        value={{ tags: ['effect.draw', 'effect.burn'] }}
        onChange={() => {}}
        cards={[]}
        tagCatalog={catalogWithTwo}
      />,
    );
    // Open Interactions section.
    fireEvent.click(screen.getByRole('button', { name: /interactions/i }));
    expect(screen.getByRole('radiogroup', { name: /interactions match mode/i })).toBeInTheDocument();
  });

  it('does not render the Interactions toggle when only 1 interaction tag is selected', () => {
    const catalogWithOne = new Map<string, TagDef>([
      ['effect.draw', { tagId: 'effect.draw', axis: 'effect', label: 'Draw cards', description: '', pairsWith: [] }],
    ]);
    render(
      <FilterPanel
        value={{ tags: ['effect.draw'] }}
        onChange={() => {}}
        cards={[]}
        tagCatalog={catalogWithOne}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /interactions/i }));
    expect(screen.queryByRole('radiogroup', { name: /interactions match mode/i })).not.toBeInTheDocument();
  });

  it('clicking OR in the Interactions toggle emits interactionTagsMode=or', () => {
    const onChange = vi.fn();
    const catalogWithTwo = new Map<string, TagDef>([
      ['effect.draw', { tagId: 'effect.draw', axis: 'effect', label: 'Draw cards', description: '', pairsWith: [] }],
      ['effect.burn', { tagId: 'effect.burn', axis: 'effect', label: 'Burn', description: '', pairsWith: [] }],
    ]);
    render(
      <FilterPanel
        value={{ tags: ['effect.draw', 'effect.burn'] }}
        onChange={onChange}
        cards={[]}
        tagCatalog={catalogWithTwo}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /interactions/i }));
    const orBtn = screen
      .getAllByRole('radio', { name: /^or$/i })
      .find((el) => el.closest('[aria-label*="Interactions match mode" i]'));
    expect(orBtn).toBeDefined();
    fireEvent.click(orBtn!);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ interactionTagsMode: 'or' }),
    );
  });

  it('clicking AND when OR is active emits interactionTagsMode=undefined (default)', () => {
    const onChange = vi.fn();
    const catalogWithTwo = new Map<string, TagDef>([
      ['effect.draw', { tagId: 'effect.draw', axis: 'effect', label: 'Draw cards', description: '', pairsWith: [] }],
      ['effect.burn', { tagId: 'effect.burn', axis: 'effect', label: 'Burn', description: '', pairsWith: [] }],
    ]);
    render(
      <FilterPanel
        value={{ tags: ['effect.draw', 'effect.burn'], interactionTagsMode: 'or' }}
        onChange={onChange}
        cards={[]}
        tagCatalog={catalogWithTwo}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /interactions/i }));
    const andBtn = screen
      .getAllByRole('radio', { name: /^and$/i })
      .find((el) => el.closest('[aria-label*="Interactions match mode" i]'));
    expect(andBtn).toBeDefined();
    fireEvent.click(andBtn!);
    const last = onChange.mock.calls.at(-1)?.[0];
    expect(last).toBeDefined();
    expect(last.interactionTagsMode).toBeUndefined();
  });

  it('toggling the Themes mode does not affect interactionTagsMode', () => {
    const onChange = vi.fn();
    const catalogMixed = new Map<string, TagDef>([
      ['effect.draw', { tagId: 'effect.draw', axis: 'effect', label: 'Draw cards', description: '', pairsWith: [] }],
      ['theme.tokens', { tagId: 'theme.tokens', axis: 'effect', label: 'Tokens', description: '', pairsWith: [], category: 'theme' }],
      ['theme.lifegain', { tagId: 'theme.lifegain', axis: 'effect', label: 'Lifegain', description: '', pairsWith: [], category: 'theme' }],
    ]);
    render(
      <FilterPanel
        value={{
          tags: ['theme.tokens', 'theme.lifegain'],
          interactionTagsMode: 'or',
        }}
        onChange={onChange}
        cards={[]}
        tagCatalog={catalogMixed}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /deck themes/i }));
    const orBtn = screen
      .getAllByRole('radio', { name: /^or$/i })
      .find((el) => el.closest('[aria-label*="Deck themes match mode" i]'));
    expect(orBtn).toBeDefined();
    fireEvent.click(orBtn!);
    const last = onChange.mock.calls.at(-1)?.[0];
    expect(last.themeTagsMode).toBe('or');
    expect(last.interactionTagsMode).toBe('or');
  });
```

- [ ] **Step 2: Run the tests, verify they fail**

```bash
cd app && npx vitest run src/components/FilterPanel.test.tsx
```

Expected: the 5 new cases fail (no mode toggle rendered yet from FilterPanel; `interactionTagsMode` not in any onChange call).

- [ ] **Step 3: Wire mode props in `FilterPanel.tsx`**

Update the Interactions section (currently lines 386–398) to:

```tsx
      <section className="pt-1">
        <TagFilterSection
          title="Interactions"
          tags={interactionTags}
          groupByAxis
          selected={selectedTags.filter((id) => {
            const def = tagCatalog.get(id);
            return def && (def.category ?? 'interaction') !== 'theme';
          })}
          onToggle={toggleTag}
          storageKey={INTERACTIONS_STORAGE_KEY}
          mode={value.interactionTagsMode ?? 'and'}
          onModeChange={(m) =>
            onChange({
              ...value,
              interactionTagsMode: m === 'and' ? undefined : m,
            })
          }
        />
      </section>
```

Update the Deck themes section (currently lines 400–410) to:

```tsx
      <section className="border-t border-ink-line pt-3">
        <TagFilterSection
          title="Deck themes"
          tags={themeTags}
          pinnedTagIds={pinnedThemeIds}
          selected={selectedTags.filter((id) => tagCatalog.get(id)?.category === 'theme')}
          onToggle={toggleTag}
          zeroResultPreview={themeZeroResult}
          storageKey={THEMES_STORAGE_KEY}
          mode={value.themeTagsMode ?? 'and'}
          onModeChange={(m) =>
            onChange({
              ...value,
              themeTagsMode: m === 'and' ? undefined : m,
            })
          }
        />
      </section>
```

- [ ] **Step 4: Pass `tagCatalog` into `applyFilter` inside `FilterPanel`**

The `baseFiltered` memo currently (lines 136–139) calls `applyFilter(cards, value, libraryFilter)`. Update to include the catalog:

```tsx
  const baseFiltered = useMemo(
    () => applyFilter(cards, value, libraryFilter, tagCatalog),
    [cards, value, libraryFilter, tagCatalog],
  );
```

- [ ] **Step 5: Pass `tagCatalog` into `applyFilter` inside `BrowserShell`**

In `app/src/components/BrowserShell.tsx`, update the `filtered` memo (currently lines 135–138) to include the catalog:

```tsx
  const filtered = useMemo(
    () => applyFilter(cards, filterForPanel, libraryFilter, tagCatalog),
    [cards, filterForPanel, libraryFilter, tagCatalog],
  );
```

- [ ] **Step 6: Run the FilterPanel tests, verify they pass**

```bash
cd app && npx vitest run src/components/FilterPanel.test.tsx
```

Expected: all tests pass (existing + 5 new).

- [ ] **Step 7: Run the full app test suite**

```bash
cd app && npx vitest run
```

Expected: every test in `app/` passes. Investigate any failure.

- [ ] **Step 8: Commit**

```bash
git add app/src/components/FilterPanel.tsx app/src/components/FilterPanel.test.tsx app/src/components/BrowserShell.tsx
git commit -m "$(cat <<'EOF'
filter-panel: wire AND/OR mode toggle into both tag sections

Interactions and Deck themes each get their own mode + onModeChange
prop, bound to value.interactionTagsMode / themeTagsMode. The default
('and') is stored as undefined so it doesn't bloat URL state.
applyFilter is now called with tagCatalog from both FilterPanel and
BrowserShell so the new per-group mode logic takes effect.
EOF
)"
```

---

## Task 5: Full gate + manual smoke

- [ ] **Step 1: Run the full repo test gate**

From the repo root:

```bash
npm test
```

Expected: pipeline + shared types pass, app vitest passes, app `tsc + vite build` passes. Fix any TS-only failure that vitest didn't surface.

- [ ] **Step 2: Manual UI smoke**

Start the dev server:

```bash
cd app && npm run dev
```

Open http://localhost:5173. Verify:
- Open the FilterPanel. The Interactions and Deck themes sections look unchanged at 0–1 selections.
- Select 2 interaction tags. The AND | OR pill appears in the Interactions header. Default highlight is AND.
- Click OR. URL gains `imode=or`. Result set widens (more cards matched).
- Reload the page. The pill stays on OR; result set is still the wider one.
- Click AND. URL drops `imode`. Result set narrows.
- Repeat for Deck themes with at least 2 theme tags selected — toggling writes `tmode=or` independently of `imode`.
- Cross-group: with 2 interactions in OR mode AND 2 themes in AND mode, verify result is `(any interaction) AND (all themes)` by checking a couple of known cards.
- Bookmark a URL with `?tag=...&imode=or&tmode=or&...`. Open it in a fresh tab. Filter state restores correctly.

- [ ] **Step 3: Final cleanup commit (only if changes are needed)**

If smoke surfaces a regression, fix it, add the corresponding test, run `npm test`, and commit:

```bash
git add -A
git commit -m "fix: <one-line description>"
```

If smoke passes cleanly, no additional commit needed.

---

## Self-review notes

- **Spec coverage:** Filter shape (Task 1) ✓, applyFilter signature (Task 1) ✓, URL persistence (Task 3) ✓, UI toggle (Task 2) ✓, wiring (Task 4) ✓, all four test suites in the spec are covered (Tasks 1–4) ✓, manual smoke matches spec acceptance criteria (Task 5) ✓.
- **Placeholders:** none — every step has the code or command it needs.
- **Type consistency:** `interactionTagsMode` / `themeTagsMode` use the same union (`'and' | 'or'`) in Filter, applyFilter, TagFilterSection props, and FilterPanel wiring. URL encoding consistently uses `imode` / `tmode` with `or` as the only non-default value. `tagCatalog` is `Map<string, TagDef>` everywhere it's passed.
- **Idempotency:** mode toggle handlers no-op on the active side (Task 2). FilterPanel handlers store `undefined` for default to avoid URL bloat (Task 4).
