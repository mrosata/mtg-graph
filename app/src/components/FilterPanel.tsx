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
import LibrarySection from './LibrarySection';

const SETS_STORAGE_KEY = 'mtg-graph:filter-sets-collapsed';
const INTERACTIONS_STORAGE_KEY = 'mtg-graph:filter-interactions-collapsed';
const THEMES_STORAGE_KEY = 'mtg-graph:filter-themes-collapsed';

const COLORS: Color[] = ['W', 'U', 'B', 'R', 'G'];

// Per-color tokens for the iconic WUBRG filter pips. Each color gets:
//  - a glowing inner dot (semantic mana color)
//  - a letter that lights up brass when active, fades to vellum-dim when off
//  - a 28×28 ring with brass focus + active glow
const COLOR_DOT: Record<Color, string> = {
  W: 'bg-mana-w',
  U: 'bg-mana-u',
  B: 'bg-mana-b',
  R: 'bg-mana-r',
  G: 'bg-mana-g',
};

const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'mythic'];
// Refined rarity gradients: bone / silver / brass / ember-amaranth.
const RARITY_STYLES: Record<Rarity, { letter: string; on: string }> = {
  common: {
    letter: 'C',
    on: 'bg-gradient-to-br from-[#c8bfa8] to-[#8a8295] text-ink-bg border-vellum-dim/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]',
  },
  uncommon: {
    letter: 'U',
    on: 'bg-gradient-to-br from-[#d6d8db] to-[#6b6f76] text-ink-bg border-[#a4a8af] shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]',
  },
  rare: {
    letter: 'R',
    on: 'bg-gradient-to-br from-brass-hi to-brass-deep text-ink-bg border-brass shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_0_10px_rgba(212,164,74,0.35)]',
  },
  mythic: {
    letter: 'M',
    on: 'bg-gradient-to-br from-[#f0a86a] to-[#9b2a3d] text-vellum border-[#e07772] shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_0_10px_rgba(224,119,114,0.4)]',
  },
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

  const libraryEnabled = useLibraryStore((s) => s.enabled);
  const libraryOwned = useLibraryStore((s) => s.owned);

  const libraryFilter = useMemo(() => {
    if (!libraryEnabled || !libraryOwned) return undefined;
    return new Set(libraryOwned.keys());
  }, [libraryEnabled, libraryOwned]);

  // When library is active, derive the union of set codes and tag ids present
  // in the owned subset. Used to narrow Sets/Interactions/Themes filter
  // options so users only see filters they can actually exercise. Returns null
  // when library is inactive — callers fall back to the full universe.
  const libraryAvailable = useMemo<{ sets: Set<string>; tags: Set<string> } | null>(() => {
    if (!libraryFilter) return null;
    const sets = new Set<string>();
    const tags = new Set<string>();
    for (const oid of libraryFilter) {
      const card = graphCards.get(oid);
      if (!card) continue;
      for (const p of card.printings) sets.add(p);
      for (const t of card.tags) tags.add(t.tagId);
    }
    return { sets, tags };
  }, [libraryFilter, graphCards]);

  const allTags = useMemo(() => Array.from(tagCatalog.values()), [tagCatalog]);
  const interactionTags = useMemo(() => {
    const base = allTags.filter((t) => (t.category ?? 'interaction') !== 'theme');
    return libraryAvailable ? base.filter((t) => libraryAvailable.tags.has(t.tagId)) : base;
  }, [allTags, libraryAvailable]);
  const themeTags = useMemo(() => {
    const base = allTags.filter((t) => t.category === 'theme');
    return libraryAvailable ? base.filter((t) => libraryAvailable.tags.has(t.tagId)) : base;
  }, [allTags, libraryAvailable]);
  const pinnedThemeIds = useMemo(() => {
    const base = activeDeck ? deckThemes(activeDeck, graphCards, tagCatalog) : [];
    return libraryAvailable ? base.filter((id) => libraryAvailable.tags.has(id)) : base;
  }, [activeDeck, graphCards, tagCatalog, libraryAvailable]);

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
    const base =
      scope === 'unreleased' ? UPCOMING_SETS
        : scope === 'all' ? [...STANDARD_SETS, ...UPCOMING_SETS]
        : STANDARD_SETS;
    return libraryAvailable ? base.filter((s) => libraryAvailable.sets.has(s.code)) : base;
  }, [scope, libraryAvailable]);
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
      <LibrarySection />

      <section>
        <div className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-brass shadow-[0_0_6px_rgba(212,164,74,0.6)]" />
          <label className="eyebrow">Scope</label>
        </div>
        <div aria-hidden="true" className="brass-hairline-soft mt-1" />
        <div
          className="mt-2 flex rounded-lg border border-ink-line bg-ink-raised p-0.5"
          role="radiogroup"
          aria-label="Scope"
        >
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
                  'focus-brass flex-1 rounded-md px-2 py-1 text-xs transition-colors ' +
                  (active
                    ? 'bg-brass/15 text-brass-hi shadow-[inset_0_0_0_1px_rgba(212,164,74,0.35)]'
                    : 'text-vellum-mute hover:text-vellum')
                }
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-vellum-mute">
          <input
            type="checkbox"
            checked={!!value.includeCommander}
            onChange={(e) =>
              onChange({
                ...value,
                includeCommander: e.target.checked ? true : undefined,
              })
            }
            className="h-3.5 w-3.5 accent-[#d4a44a]"
          />
          <span>Include Commander cards</span>
        </label>
      </section>

      <section>
        <label className="eyebrow block">Search</label>
        <div className="mt-2 flex flex-col gap-1.5">
          <div className="focus-brass flex items-center gap-2 rounded-lg border border-ink-line bg-ink-raised px-2.5 py-1.5">
            <svg
              width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              className="flex-shrink-0 text-vellum-dim"
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
              className="w-full bg-transparent text-sm text-vellum placeholder:text-vellum-dim focus:outline-none"
            />
          </div>
          <div className="focus-brass flex items-center gap-2 rounded-lg border border-ink-line bg-ink-raised px-2.5 py-1.5">
            <svg
              width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              className="flex-shrink-0 text-vellum-dim"
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
              className="w-full bg-transparent text-sm text-vellum placeholder:text-vellum-dim focus:outline-none"
            />
          </div>
        </div>
      </section>

      <div aria-hidden="true" className="brass-hairline" />

      <section>
        <label className="eyebrow block">Colors</label>
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
                className={
                  'focus-brass relative flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-mono tabular transition ' +
                  (on
                    ? 'border-brass/60 bg-ink-raised text-brass-hi shadow-[inset_0_0_0_1px_rgba(0,0,0,0.4),0_0_10px_rgba(212,164,74,0.45)]'
                    : 'border-ink-line bg-ink-panel text-vellum-dim opacity-70 hover:opacity-100 hover:text-vellum')
                }
              >
                <span
                  aria-hidden="true"
                  className={
                    'pointer-events-none absolute inset-1 rounded-full ' +
                    COLOR_DOT[c] +
                    (on ? ' opacity-70' : ' opacity-25')
                  }
                  style={{ filter: on ? 'blur(0.5px)' : 'none' }}
                />
                <span className="relative z-10">{c}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <label className="eyebrow block">Rarity</label>
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
                className={
                  `focus-brass font-display flex h-6 min-w-6 items-center justify-center rounded border px-1.5 text-[11px] font-bold tracking-[0.12em] transition ${style.on} ` +
                  (on ? '' : 'opacity-35 hover:opacity-75')
                }
              >
                {style.letter}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <label className="eyebrow block">CMC</label>
        <div className="mt-2 flex gap-1.5">
          <div className="focus-brass flex flex-1 items-center gap-1.5 rounded-lg border border-ink-line bg-ink-raised px-2 py-1 shadow-[inset_0_1px_0_rgba(0,0,0,0.35)]">
            <span className="eyebrow !text-[9px] !tracking-[0.18em]">min</span>
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
              className="w-full min-w-0 bg-transparent font-mono tabular text-sm text-vellum focus:outline-none"
            />
          </div>
          <div className="focus-brass flex flex-1 items-center gap-1.5 rounded-lg border border-ink-line bg-ink-raised px-2 py-1 shadow-[inset_0_1px_0_rgba(0,0,0,0.35)]">
            <span className="eyebrow !text-[9px] !tracking-[0.18em]">max</span>
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
              className="w-full min-w-0 bg-transparent font-mono tabular text-sm text-vellum focus:outline-none"
            />
          </div>
        </div>
      </section>

      <div aria-hidden="true" className="brass-hairline" />

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
        />
      </section>

      <section className="border-t border-ink-line pt-3">
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

      <section className="border-t border-ink-line pt-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setSetsCollapsed(!setsCollapsed)}
            className="group flex items-center gap-1.5 text-vellum-dim transition-colors hover:text-vellum"
          >
            <span aria-hidden="true" className="inline-block w-3 text-brass/70">
              {setsCollapsed ? '▸' : '▾'}
            </span>
            <span className="eyebrow group-hover:text-vellum">Sets</span>
            {value.sets?.length ? (
              <span className="ml-1 rounded bg-brass/15 px-1.5 font-mono text-[10px] leading-5 tracking-normal text-brass-hi tabular">
                {value.sets.length}
              </span>
            ) : null}
          </button>
          {value.sets?.length ? (
            <button
              onClick={() => onChange({ ...value, sets: undefined })}
              className="eyebrow hover:text-vellum"
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
                  <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm transition-colors hover:bg-ink-raised/60">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSet(s.code)}
                      className="h-3.5 w-3.5 accent-[#d4a44a]"
                    />
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-vellum-dim">
                      {s.code}
                    </span>
                    <span className="truncate text-vellum-mute">{s.name}</span>
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
