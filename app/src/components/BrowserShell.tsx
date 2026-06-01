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
import { useLibraryStore } from '../stores/libraryStore';
import { useCardNav } from '../lib/useCardNav';
import type { Card } from '@shared/types';

type RightRailCtx = {
  onCardClick: (oracleId: string) => void;
  drawerOpen: boolean;
};

// `filter` carries only non-URL state. Tags and tag modes are owned by the
// URL — see urlTags / urlInteractionMode / urlThemeMode below — so deep
// links survive across pages and clicking a theme chip in InteractionsPanel
// can update tags without clobbering local filter state.
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

  const urlInteractionMode = useMemo<'and' | 'or'>(
    () => (searchParams.get('imode') === 'or' ? 'or' : 'and'),
    [searchParams],
  );
  const urlThemeMode = useMemo<'and' | 'or'>(
    () => (searchParams.get('tmode') === 'or' ? 'or' : 'and'),
    [searchParams],
  );

  const removeUrlTag = useCallback((tagId: string) => {
    setSearchParams((prev) => {
      const sp = new URLSearchParams(prev);
      const remaining = sp.getAll('tag').filter((t) => t !== tagId);
      sp.delete('tag');
      for (const t of remaining) sp.append('tag', t);
      return sp;
    });
  }, [setSearchParams]);

  const filterForPanel: Filter = useMemo(
    () => ({
      ...filter,
      tags: urlTags,
      interactionTagsMode: urlInteractionMode === 'and' ? undefined : urlInteractionMode,
      themeTagsMode: urlThemeMode === 'and' ? undefined : urlThemeMode,
    }),
    [filter, urlTags, urlInteractionMode, urlThemeMode],
  );

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

  const libraryEnabled = useLibraryStore((s) => s.enabled);
  const libraryOwned = useLibraryStore((s) => s.owned);
  const libraryFilter = useMemo(() => {
    if (!libraryEnabled || !libraryOwned) return undefined;
    return new Set(libraryOwned.keys());
  }, [libraryEnabled, libraryOwned]);

  const filtered = useMemo(
    () => applyFilter(cards, filterForPanel, libraryFilter, tagCatalog),
    [cards, filterForPanel, libraryFilter, tagCatalog],
  );

  if (status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center" role="status" aria-live="polite">
        <div className="flex flex-col items-center gap-3">
          <div
            aria-hidden="true"
            className="h-6 w-6 animate-spin rounded-full border-2 border-brass/30 border-t-brass"
          />
          <p className="eyebrow text-vellum-dim">loading card data</p>
        </div>
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center" role="alert">
        <div className="max-w-sm">
          <p className="font-head text-2xl italic text-vellum">The grimoire is missing.</p>
          <p className="mt-2 text-sm text-vellum-mute">
            Failed to load card data. Run <code className="font-mono text-brass-hi">npm run build:cards -- --standard</code> at the repo root, then refresh.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 page-enter">
      <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-ink-line bg-ink-panel/60">
        <FilterPanel value={filterForPanel} onChange={handleFilterChange} cards={cards} tagCatalog={tagCatalog} />
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-3 border-b border-ink-line bg-ink-bg/60 px-5 py-2.5">
          <span className="font-mono tabular text-[15px] font-semibold text-vellum">
            {filtered.length.toLocaleString()}
          </span>
          <span className="eyebrow">cards</span>
          <span aria-hidden="true" className="h-3 w-px bg-ink-line-2" />
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
        <div className="h-full w-[420px] shrink-0 border-l border-ink-line bg-ink-panel/40">
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
        <div ref={setDeckRail} className="scrollbar-slim h-full shrink-0 overflow-y-auto border-l border-ink-line bg-ink-panel/40">
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
