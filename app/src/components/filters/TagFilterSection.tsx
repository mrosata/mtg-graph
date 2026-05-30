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
};

const AXIS_ORDER: TagAxis[] = ['trigger', 'effect', 'condition'];
const AXIS_LABEL: Record<TagAxis, string> = {
  trigger: 'Triggers',
  effect: 'Effects',
  condition: 'Conditions',
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
          className={`flex cursor-pointer items-center gap-2 text-sm ${
            isMuted ? 'italic text-neutral-600' : 'text-neutral-200'
          }`}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggle(t.tagId)}
            aria-label={t.label}
            className="h-3.5 w-3.5"
          />
          <span className="truncate">{t.label}</span>
        </label>
      </li>
    );
  }

  function renderGroup(label: string, items: TagDef[]) {
    return (
      <div key={label} className="mt-2">
        <div className="text-[10px] uppercase tracking-wide text-neutral-500">{label}</div>
        {items.length === 0 ? (
          <p className="text-xs italic text-neutral-600">(no matches)</p>
        ) : (
          <ul className="space-y-0.5">{items.map(renderRow)}</ul>
        )}
      </div>
    );
  }

  function renderBody() {
    if (groupByAxis) {
      return AXIS_ORDER.map((axis) =>
        renderGroup(AXIS_LABEL[axis], unpinned.filter((t) => t.axis === axis)),
      );
    }
    return (
      <>
        {pinned.length > 0 && renderGroup('Your deck wants', pinned)}
        {renderGroup('All themes', unpinned)}
      </>
    );
  }

  return (
    <div data-tour-id={TOUR_IDS.tagFilterSection}>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400 hover:text-neutral-200"
        >
          <span aria-hidden="true" className="inline-block w-3 text-neutral-500">
            {collapsed ? '▸' : '▾'}
          </span>
          <span>{title}</span>
          {selected.length > 0 && (
            <span className="ml-1 rounded bg-amber-500/15 px-1.5 text-[10px] tracking-normal text-amber-400">
              {selected.length}
            </span>
          )}
        </button>
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
            className="mt-2 w-full rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-sm focus:border-neutral-600 focus:outline-none"
          />
          <div className="scrollbar-slim max-h-72 overflow-y-auto pr-1">{renderBody()}</div>
        </>
      )}
    </div>
  );
}
