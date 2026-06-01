import { useEffect, useMemo, useState } from 'react';
import type { TagAxis, TagDef } from '@shared/types';
import { TOUR_IDS } from '../../wizard/selectors';
import SelectedTagChips from './SelectedTagChips';
import { useFilterSectionCollapsed } from '../../lib/useFilterSectionCollapsed';

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

const AXIS_ORDER: TagAxis[] = ['trigger', 'effect', 'condition'];
const AXIS_LABEL: Record<TagAxis, string> = {
  trigger: 'Triggers',
  effect: 'Effects',
  condition: 'Conditions',
};

// Per-axis decoration for the small inline group headings. The dot + thin
// underline give each axis sub-list its own identity without shouting.
const AXIS_DOT: Record<TagAxis, string> = {
  trigger: 'bg-mana-u',
  effect: 'bg-brass',
  condition: 'bg-[#b388e8]',
};
const AXIS_UNDERLINE: Record<TagAxis, string> = {
  trigger: 'from-mana-u/50',
  effect: 'from-brass/60',
  condition: 'from-[#b388e8]/50',
};
const AXIS_ACCENT_TEXT: Record<TagAxis, string> = {
  trigger: 'text-mana-u',
  effect: 'text-brass',
  condition: 'text-[#b388e8]',
};

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export default function TagFilterSection({
  title, tags, groupByAxis, pinnedTagIds, selected, onToggle, zeroResultPreview, storageKey,
  mode, onModeChange,
}: Props) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 150);
  const [collapsed, setCollapsed] = useFilterSectionCollapsed(
    storageKey ?? null,
    storageKey ? true : false,
  );

  const catalog = useMemo(() => new Map(tags.map((t) => [t.tagId, t])), [tags]);

  const matches = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return tags;
    return tags.filter((t) => t.label.toLowerCase().includes(q));
  }, [tags, debouncedSearch]);

  const pinnedSet = useMemo(
    () => new Set(pinnedTagIds && !groupByAxis ? pinnedTagIds : []),
    [pinnedTagIds, groupByAxis],
  );

  const pinned = matches.filter((t) => pinnedSet.has(t.tagId));
  const unpinned = matches.filter((t) => !pinnedSet.has(t.tagId));

  function renderRow(t: TagDef) {
    const isSelected = selected.includes(t.tagId);
    const isMuted = !isSelected && zeroResultPreview?.(t.tagId) === true;
    return (
      <li key={t.tagId}>
        <label
          aria-disabled={isMuted || undefined}
          className={`flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm transition-colors hover:bg-ink-raised/60 ${
            isMuted
              ? 'italic text-vellum-dim/60'
              : isSelected
                ? 'text-vellum'
                : 'text-vellum-mute'
          }`}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggle(t.tagId)}
            aria-label={t.label}
            className="h-3.5 w-3.5 accent-[#d4a44a]"
          />
          <span className="truncate">{t.label}</span>
        </label>
      </li>
    );
  }

  function renderAxisGroup(axis: TagAxis, items: TagDef[]) {
    return (
      <div key={axis} className="mt-3">
        <div className="flex items-center gap-1.5">
          <span aria-hidden="true" className={`inline-block h-1.5 w-1.5 rounded-full ${AXIS_DOT[axis]}`} />
          <span className={`eyebrow ${AXIS_ACCENT_TEXT[axis]}`}>{AXIS_LABEL[axis]}</span>
        </div>
        <div
          aria-hidden="true"
          className={`mt-1 h-px w-full bg-gradient-to-r ${AXIS_UNDERLINE[axis]} via-transparent to-transparent`}
        />
        {items.length === 0 ? (
          <p className="mt-1 text-xs italic text-vellum-dim/70">(no matches)</p>
        ) : (
          <ul className="mt-1 space-y-0.5">{items.map(renderRow)}</ul>
        )}
      </div>
    );
  }

  function renderGenericGroup(label: string, items: TagDef[]) {
    return (
      <div key={label} className="mt-3">
        <div className="eyebrow">{label}</div>
        {items.length === 0 ? (
          <p className="mt-1 text-xs italic text-vellum-dim/70">(no matches)</p>
        ) : (
          <ul className="mt-1 space-y-0.5">{items.map(renderRow)}</ul>
        )}
      </div>
    );
  }

  function renderBody() {
    if (groupByAxis) {
      return AXIS_ORDER.map((axis) =>
        renderAxisGroup(axis, unpinned.filter((t) => t.axis === axis)),
      );
    }
    return (
      <>
        {pinned.length > 0 && renderGenericGroup('Your deck wants', pinned)}
        {renderGenericGroup('All themes', unpinned)}
      </>
    );
  }

  return (
    <div data-tour-id={TOUR_IDS.tagFilterSection}>
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
      <SelectedTagChips
        selected={selected}
        catalog={catalog}
        onRemove={onToggle}
      />
      {!collapsed && (
        <>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${title.toLowerCase()}…`}
            className="focus-brass mt-2 w-full rounded-md border border-ink-line bg-ink-raised px-2 py-1 text-sm text-vellum placeholder:text-vellum-dim focus:outline-none"
          />
          <div className="scrollbar-slim max-h-72 overflow-y-auto pr-1">{renderBody()}</div>
        </>
      )}
    </div>
  );
}
