import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import ActiveTagFilter from './ActiveTagFilter';
import FilterPanel from './FilterPanel';
import CardGrid from './CardGrid';
import CardDetailDrawer from './CardDetailDrawer';
import HoverCardPreview from './HoverCardPreview';
import { applyFilter, type Filter } from '../lib/filter';
import { useGraphStore } from '../stores/graphStore';
import { useCardNav } from '../lib/useCardNav';
import type { Card } from '@shared/types';

type RightRailCtx = {
  onCardClick: (oracleId: string) => void;
  drawerOpen: boolean;
};

// `filter` carries only non-tag state. Tags are owned by the URL — see
// urlTags / setUrlTags below — so deep links survive across pages and clicking
// a theme chip in InteractionsPanel can update tags without clobbering local
// filter state.
type Props = {
  filter: Filter;
  onFilterChange: (next: Filter) => void;
  headerExtra?: ReactNode;
  showHoverPreview?: boolean;
  rightRail?: (ctx: RightRailCtx) => ReactNode;
};

export default function BrowserShell({
  filter,
  onFilterChange,
  headerExtra,
  showHoverPreview = false,
  rightRail,
}: Props) {
  const status = useGraphStore((s) => s.status);
  const cardsMap = useGraphStore((s) => s.cards);
  const tagCatalog = useGraphStore((s) => s.tagCatalog);
  const cards = useMemo(() => Array.from(cardsMap.values()), [cardsMap]);

  const [searchParams, setSearchParams] = useSearchParams();
  const focusedId = searchParams.get('card');
  const focused = focusedId ? cardsMap.get(focusedId) ?? null : null;

  const urlTags = useMemo(() => searchParams.getAll('tag'), [searchParams]);

  const setUrlTags = useCallback((tags: string[]) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('tag');
      for (const t of tags) next.append('tag', t);
      return next;
    });
  }, [setSearchParams]);

  const removeUrlTag = useCallback((tagId: string) => {
    setUrlTags(urlTags.filter((t) => t !== tagId));
  }, [urlTags, setUrlTags]);

  const filterForPanel: Filter = useMemo(
    () => ({ ...filter, tags: urlTags }),
    [filter, urlTags],
  );

  const handleFilterChange = useCallback((next: Filter) => {
    const nextTags = next.tags ?? [];
    const same =
      nextTags.length === urlTags.length &&
      nextTags.every((t, i) => t === urlTags[i]);
    if (!same) setUrlTags(nextTags);
    const { tags: _omit, ...rest } = next;
    onFilterChange(rest);
  }, [urlTags, setUrlTags, onFilterChange]);

  const [gridSize, setGridSize] = useState({ width: 0, height: 0 });
  const [hoveredCard, setHoveredCard] = useState<Card | null>(null);
  const gridElRef = useRef<HTMLDivElement | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const railListenerCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => { setHoveredCard(null); }, [focused]);

  const measureGrid = useCallback(() => {
    const el = gridElRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setGridSize({ width: rect.width, height: rect.height });
  }, []);

  // Callback refs: fire reliably on attach/detach, including the
  // loading→ready transition where the wrapped tree mounts late.
  const setGridWrapper = useCallback((el: HTMLDivElement | null) => {
    gridElRef.current = el;
    resizeObserverRef.current?.disconnect();
    resizeObserverRef.current = null;
    if (!el) return;
    measureGrid();
    const ro = new ResizeObserver(measureGrid);
    ro.observe(el);
    resizeObserverRef.current = ro;
  }, [measureGrid]);

  const setDeckRail = useCallback((el: HTMLDivElement | null) => {
    railListenerCleanupRef.current?.();
    railListenerCleanupRef.current = null;
    if (!el) return;
    const handler = (e: TransitionEvent) => {
      if (e.propertyName === 'width') measureGrid();
    };
    el.addEventListener('transitionend', handler);
    railListenerCleanupRef.current = () => el.removeEventListener('transitionend', handler);
  }, [measureGrid]);

  const writeCardParam = useCallback((id: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (id) next.set('card', id);
      else next.delete('card');
      return next;
    });
  }, [setSearchParams]);

  const cardNav = useCardNav(writeCardParam);

  const filtered = useMemo(() => applyFilter(cards, filterForPanel), [cards, filterForPanel]);

  if (status === 'loading') return <div className="p-8 text-neutral-400">Loading card data…</div>;
  if (status === 'error') return <div className="p-8 text-red-400">Failed to load card data.</div>;

  return (
    <div className="flex h-full min-h-0">
      <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-neutral-800 bg-[#0c0c0c]">
        <FilterPanel value={filterForPanel} onChange={handleFilterChange} cards={cards} tagCatalog={tagCatalog} />
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-3 border-b border-neutral-900 px-5 py-2.5 text-xs uppercase tracking-[0.14em] text-neutral-500">
          <span className="font-mono text-neutral-300">{filtered.length.toLocaleString()}</span>
          <span>cards</span>
          <ActiveTagFilter tagIds={urlTags} onRemove={removeUrlTag} />
          {headerExtra}
        </div>
        <div ref={setGridWrapper} className="min-h-0 min-w-0 flex-1 overflow-hidden">
          <CardGrid
            cards={filtered}
            onCardClick={(c) => cardNav.push(c.oracleId)}
            onHoverCard={showHoverPreview ? setHoveredCard : undefined}
            width={gridSize.width}
            height={gridSize.height}
          />
        </div>
      </div>
      {focused && (
        <div className="h-full w-[420px] shrink-0 border-l border-neutral-800">
          <CardDetailDrawer
            card={focused}
            onFocusCard={cardNav.push}
            onBack={cardNav.back}
            onForward={cardNav.forward}
            canBack={cardNav.canBack}
            canForward={cardNav.canForward}
          />
        </div>
      )}
      {rightRail && (
        <div ref={setDeckRail} className="scrollbar-slim h-full shrink-0 overflow-y-auto border-l border-neutral-800">
          {rightRail({ onCardClick: cardNav.push, drawerOpen: !!focused })}
        </div>
      )}
      {showHoverPreview && hoveredCard && hoveredCard.imageUrl && (
        <HoverCardPreview
          mode="anchored"
          url={hoveredCard.imageUrl}
          width={440}
          anchorRight={focused ? 440 : 16}
          hideBelowPx={focused ? 1140 : undefined}
        />
      )}
    </div>
  );
}
