import { useMemo } from 'react';
import type { Filter, Scope } from '../lib/filter';
import { applyFilter } from '../lib/filter';
import type { Card, Color, Rarity, TagDef } from '@shared/types';
import { STANDARD_SETS, UPCOMING_SETS } from '@shared/sets';
import { useActiveDeck } from '../stores/deckStore';
import { useGraphStore } from '../stores/graphStore';
import { useLibraryStore } from '../stores/libraryStore';
import { deckThemes } from '../lib/deckThemes';
import { useFilterSectionCollapsed } from '../lib/useFilterSectionCollapsed';
import { TOUR_IDS } from '../wizard/selectors';
import TagFilterSection from './filters/TagFilterSection';

const SETS_STORAGE_KEY = 'mtg-graph:filter-sets-collapsed';
const INTERACTIONS_STORAGE_KEY = 'mtg-graph:filter-interactions-collapsed';
const THEMES_STORAGE_KEY = 'mtg-graph:filter-themes-collapsed';

const COLORS: Color[] = ['W', 'U', 'B', 'R', 'G'];

const COLOR_STYLES: Record<Color, string> = {
  W: 'bg-amber-50 text-amber-900 border-amber-200',
  U: 'bg-blue-100 text-blue-900 border-blue-200',
  B: 'bg-neutral-800 text-neutral-300 border-neutral-700',
  R: 'bg-red-100 text-red-900 border-red-200',
  G: 'bg-emerald-100 text-emerald-900 border-emerald-200',
};

const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'mythic'];
const RARITY_STYLES: Record<Rarity, { letter: string; on: string }> = {
  common: { letter: 'C', on: 'bg-neutral-800 text-neutral-200 border-neutral-600' },
  uncommon: { letter: 'U', on: 'bg-gradient-to-br from-slate-700 to-slate-900 text-slate-200 border-slate-500' },
  rare: { letter: 'R', on: 'bg-gradient-to-br from-amber-950 to-stone-950 text-amber-300 border-amber-700' },
  mythic: { letter: 'M', on: 'bg-gradient-to-br from-orange-950 to-stone-950 text-orange-300 border-orange-700' },
};

type Props = {
  value: Filter;
  onChange: (next: Filter) => void;
  cards: Card[];
  tagCatalog: Map<string, TagDef>;
};

export default function FilterPanel({ value, onChange, cards, tagCatalog }: Props) {
  const activeDeck = useActiveDeck();
  const graphCards = useGraphStore((s) => s.cards);

  const toggleColor = (c: Color) => {
    const colors = value.colors ?? [];
    onChange({
      ...value,
      colors: colors.includes(c) ? colors.filter((x) => x !== c) : [...colors, c],
    });
  };

  const toggleSet = (code: string) => {
    const sets = value.sets ?? [];
    onChange({
      ...value,
      sets: sets.includes(code) ? sets.filter((s) => s !== code) : [...sets, code],
    });
  };

  const toggleTag = (id: string) => {
    const tags = value.tags ?? [];
    onChange({
      ...value,
      tags: tags.includes(id) ? tags.filter((t) => t !== id) : [...tags, id],
    });
  };

  const toggleRarity = (r: Rarity) => {
    const rarities = value.rarities ?? [];
    onChange({
      ...value,
      rarities: rarities.includes(r) ? rarities.filter((x) => x !== r) : [...rarities, r],
    });
  };

  const allTags = useMemo(() => Array.from(tagCatalog.values()), [tagCatalog]);
  const interactionTags = useMemo(
    () => allTags.filter((t) => (t.category ?? 'interaction') !== 'theme'),
    [allTags],
  );
  const themeTags = useMemo(
    () => allTags.filter((t) => t.category === 'theme'),
    [allTags],
  );
  const pinnedThemeIds = useMemo(
    () => (activeDeck ? deckThemes(activeDeck, graphCards, tagCatalog) : []),
    [activeDeck, graphCards, tagCatalog],
  );

  const libraryEnabled = useLibraryStore((s) => s.enabled);
  const libraryOwned = useLibraryStore((s) => s.owned);

  const libraryFilter = useMemo(() => {
    if (!libraryEnabled || !libraryOwned) return undefined;
    return new Set(libraryOwned.keys());
  }, [libraryEnabled, libraryOwned]);

  const baseFiltered = useMemo(
    () => applyFilter(cards, value, libraryFilter),
    [cards, value, libraryFilter],
  );
  const themeZeroResult = useMemo(() => {
    const cache = new Map<string, boolean>();
    return (tagId: string) => {
      const cached = cache.get(tagId);
      if (cached !== undefined) return cached;
      const result = !baseFiltered.some((c) => c.tags.some((t) => t.tagId === tagId));
      cache.set(tagId, result);
      return result;
    };
  }, [baseFiltered]);

  const selectedTags = value.tags ?? [];
  const [setsCollapsed, setSetsCollapsed] = useFilterSectionCollapsed(SETS_STORAGE_KEY, true);

  const scope: Scope = value.scope ?? 'standard';
  const setsForScope = useMemo(() => {
    if (scope === 'unreleased') return UPCOMING_SETS;
    if (scope === 'all') return [...STANDARD_SETS, ...UPCOMING_SETS];
    return STANDARD_SETS;
  }, [scope]);
  const changeScope = (next: Scope) => {
    // Drop any set-checkbox selections that fall outside the new scope so the
    // count badge doesn't lie about hidden filters.
    const allowedCodes = new Set(
      (next === 'unreleased'
        ? UPCOMING_SETS
        : next === 'all'
          ? [...STANDARD_SETS, ...UPCOMING_SETS]
          : STANDARD_SETS
      ).map((s) => s.code),
    );
    const trimmedSets = (value.sets ?? []).filter((c) => allowedCodes.has(c));
    onChange({
      ...value,
      scope: next,
      sets: trimmedSets.length ? trimmedSets : undefined,
    });
  };

  const scopeOptions: { value: Scope; label: string }[] = [
    { value: 'standard', label: 'Standard' },
    { value: 'unreleased', label: 'Unreleased' },
    { value: 'all', label: 'All' },
  ];

  return (
    <div className="scrollbar-slim flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4" data-tour-id={TOUR_IDS.filterPanel}>
      <section>
        <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
          Scope
        </label>
        <div className="mt-2 flex rounded-lg border border-neutral-800 bg-neutral-900 p-0.5" role="radiogroup" aria-label="Scope">
          {scopeOptions.map((opt) => {
            const active = scope === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => changeScope(opt.value)}
                className={
                  'flex-1 rounded-md px-2 py-1 text-xs transition-colors ' +
                  (active
                    ? 'bg-neutral-700 text-neutral-50'
                    : 'text-neutral-400 hover:text-neutral-200')
                }
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-neutral-300">
          <input
            type="checkbox"
            checked={!!value.includeCommander}
            onChange={(e) =>
              onChange({
                ...value,
                includeCommander: e.target.checked ? true : undefined,
              })
            }
            className="h-3.5 w-3.5 accent-amber-500"
          />
          <span>Include Commander cards</span>
        </label>
      </section>

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

      <section className="border-t border-neutral-900 pt-3">
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
        />
      </section>

      <section className="border-t border-neutral-900 pt-3">
        <TagFilterSection
          title="Deck themes"
          tags={themeTags}
          pinnedTagIds={pinnedThemeIds}
          selected={selectedTags.filter((id) => tagCatalog.get(id)?.category === 'theme')}
          onToggle={toggleTag}
          zeroResultPreview={themeZeroResult}
          storageKey={THEMES_STORAGE_KEY}
        />
      </section>

      <section className="border-t border-neutral-900 pt-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setSetsCollapsed(!setsCollapsed)}
            className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400 hover:text-neutral-200"
          >
            <span aria-hidden="true" className="inline-block w-3 text-neutral-500">
              {setsCollapsed ? '▸' : '▾'}
            </span>
            <span>Sets</span>
            {value.sets?.length ? (
              <span className="ml-1 rounded bg-amber-500/15 px-1.5 text-[10px] tracking-normal text-amber-400">
                {value.sets.length}
              </span>
            ) : null}
          </button>
          {value.sets?.length ? (
            <button
              onClick={() => onChange({ ...value, sets: undefined })}
              className="text-[10px] uppercase tracking-wider text-neutral-500 hover:text-neutral-300"
            >
              Clear
            </button>
          ) : null}
        </div>
        {!setsCollapsed && (
          <ul className="scrollbar-slim mt-2 max-h-64 space-y-1 overflow-y-auto pr-1">
            {setsForScope.map((s) => {
              const checked = value.sets?.includes(s.code) ?? false;
              return (
                <li key={s.code}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSet(s.code)}
                      className="h-3.5 w-3.5 accent-amber-500"
                    />
                    <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                      {s.code}
                    </span>
                    <span className="truncate text-neutral-200">{s.name}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
