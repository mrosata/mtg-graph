import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Color } from '@shared/types';
import { useGraphStore } from '../stores/graphStore';
import { useActiveDeck, useDeckStore } from '../stores/deckStore';
import { useLibraryStore } from '../stores/libraryStore';
import { TOUR_IDS } from '../wizard/selectors';
import {
  buildDeckGraph,
  buildFocusedGraph,
  expandWithBridges,
  type ColorFilter,
  type FilterState,
  type GraphNode,
  type GraphOutput,
} from '../lib/deckGraph';
import { FAMILIES, type FamilyId } from '../lib/tagFamilies';
import { useNavStack } from '../lib/useNavStack';
import { useDocumentMeta } from '../lib/seo';
import CanvasNavButtons from '../components/deckGraph/CanvasNavButtons';
import GraphCanvas from '../components/deckGraph/GraphCanvas';
import PillRow from '../components/deckGraph/PillRow';
import SelectionDrawer from '../components/deckGraph/SelectionDrawer';
import Toast from '../components/Toast';

const ALL_COLORS: Color[] = ['W', 'U', 'B', 'R', 'G'];
const ALL_COLOR_FILTERS_SET = new Set<ColorFilter>([...ALL_COLORS, 'C']);
const FAMILY_ID_SET = new Set<FamilyId>(FAMILIES.map((f) => f.id));

type Mode = 'deck' | 'focus';

function parseOffFamilies(params: URLSearchParams): Set<FamilyId> {
  const raw = params.get('off_fam');
  if (!raw) return new Set();
  const result = new Set<FamilyId>();
  for (const tok of raw.split(',')) {
    const trimmed = tok.trim() as FamilyId;
    if (FAMILY_ID_SET.has(trimmed)) result.add(trimmed);
  }
  return result;
}

function parseOnColors(params: URLSearchParams, fallback: Set<ColorFilter>): Set<ColorFilter> {
  const raw = params.get('colors');
  if (raw === null) return fallback;
  if (raw === '') return new Set(); // explicit "all off" → no filter
  const result = new Set<ColorFilter>();
  for (const tok of raw.split(',')) {
    const trimmed = tok.trim().toUpperCase() as ColorFilter;
    if (ALL_COLOR_FILTERS_SET.has(trimmed)) result.add(trimmed);
  }
  return result;
}

function parseMode(params: URLSearchParams): Mode {
  return params.get('mode') === 'focus' ? 'focus' : 'deck';
}

export default function DeckGraphPage() {
  useDocumentMeta(
    'Deck Graph — MTG Graph',
    'Visualize card interactions and synergies in your Magic: The Gathering deck.',
  );
  const cards = useGraphStore((s) => s.cards);
  const outbound = useGraphStore((s) => s.edges);
  const inbound = useGraphStore((s) => s.edgesInbound);
  const deck = useActiveDeck();
  const addCard = useDeckStore((s) => s.addCard);
  const removeCard = useDeckStore((s) => s.removeCard);

  const [searchParams, setSearchParams] = useSearchParams();
  const navStack = useNavStack();

  const deckColorIdentity = useMemo<Set<ColorFilter>>(() => {
    // Always seed with 'C' so colorless cards (Sol Ring, etc.) are visible by
    // default; the user can untoggle it explicitly.
    if (!deck) return new Set<ColorFilter>([...ALL_COLORS, 'C']);
    const present = new Set<ColorFilter>(['C']);
    for (const entry of deck.workingCards) {
      const c = cards.get(entry.oracleId);
      if (!c) continue;
      for (const col of c.colorIdentity) present.add(col);
    }
    return present.size > 1 ? present : new Set<ColorFilter>([...ALL_COLORS, 'C']);
  }, [deck, cards]);

  // URL is the source of truth for these filters. On first mount with no
  // `colors` param, seed it from the deck's color identity so the pills
  // reflect a sensible default (and the URL becomes shareable).
  const initializedForDeckIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!deck) return;
    if (initializedForDeckIdRef.current === deck.id) return;
    if (searchParams.get('colors') !== null) {
      initializedForDeckIdRef.current = deck.id;
      return;
    }
    const next = new URLSearchParams(searchParams);
    next.set('colors', Array.from(deckColorIdentity).join(','));
    setSearchParams(next, { replace: true });
    initializedForDeckIdRef.current = deck.id;
  }, [deck, deckColorIdentity, searchParams, setSearchParams]);

  const offFamilies = useMemo(() => parseOffFamilies(searchParams), [searchParams]);
  const onColors = useMemo(
    () => parseOnColors(searchParams, deckColorIdentity),
    [searchParams, deckColorIdentity],
  );
  const mode = useMemo(() => parseMode(searchParams), [searchParams]);
  const focusOracleId = searchParams.get('focus');

  const selectedOracleId = searchParams.get('selected');
  const [hoveredOracleId, setHoveredOracleId] = useState<string | null>(null);

  // Snapshot the deck at refresh time. Memo key uses this, not live deck.
  const [refreshedDeckIds, setRefreshedDeckIds] = useState<string[]>(
    () => deck?.workingCards.map((c) => c.oracleId) ?? [],
  );
  useEffect(() => {
    if (deck && refreshedDeckIds.length === 0 && deck.workingCards.length > 0) {
      setRefreshedDeckIds(deck.workingCards.map((c) => c.oracleId));
    }
  }, [deck, refreshedDeckIds.length]);

  const pendingMutationCount = useMemo(() => {
    if (!deck) return 0;
    const liveSet = new Set(deck.workingCards.map((c) => c.oracleId));
    const snapSet = new Set(refreshedDeckIds);
    let diffs = 0;
    for (const id of liveSet) if (!snapSet.has(id)) diffs++;
    for (const id of snapSet) if (!liveSet.has(id)) diffs++;
    return diffs;
  }, [deck, refreshedDeckIds]);

  const filters: FilterState = useMemo(() => ({ offFamilies, onColors }), [offFamilies, onColors]);

  const graph: GraphOutput = useMemo(() => {
    if (mode === 'focus' && focusOracleId) {
      return buildFocusedGraph({
        focusOracleId, cards, outbound, inbound, filters,
      });
    }
    return buildDeckGraph({
      deckOracleIds: refreshedDeckIds, cards, outbound, inbound, filters,
    });
  }, [mode, focusOracleId, refreshedDeckIds, cards, outbound, inbound, filters]);

  const expandedGraph: GraphOutput = useMemo(() => {
    if (!selectedOracleId) return graph;
    // Focus mode mirrors buildFocusedGraph's singleton-deck stance: the focused
    // card *is* the deck for expansion purposes. Passing the full deck set here
    // would emit bridge edges to deck cards that aren't in base.nodes.
    const expansionDeck =
      mode === 'focus' && focusOracleId
        ? new Set([focusOracleId])
        : new Set(refreshedDeckIds);
    return expandWithBridges({
      base: graph,
      selectedId: selectedOracleId,
      deckOracleIds: expansionDeck,
      cards,
      outbound,
      inbound,
      filters,
    });
  }, [graph, mode, focusOracleId, selectedOracleId, refreshedDeckIds, cards, outbound, inbound, filters]);

  useEffect(() => {
    if (selectedOracleId && !expandedGraph.nodes.some((n) => n.id === selectedOracleId)) {
      const next = new URLSearchParams(searchParams);
      next.delete('selected');
      setSearchParams(next, { replace: true });
    }
  }, [expandedGraph, selectedOracleId, searchParams, setSearchParams]);

  const libraryEnabled = useLibraryStore((s) => s.enabled);
  const libraryOwned = useLibraryStore((s) => s.owned);
  const libraryFilter = useMemo(
    () => (libraryEnabled && libraryOwned ? new Set(libraryOwned.keys()) : null),
    [libraryEnabled, libraryOwned],
  );

  // When the library filter is active, hide edges where either endpoint isn't owned.
  // Deck-member nodes always render regardless (only edges are filtered).
  const visibleExpandedGraph = useMemo(() => {
    if (!libraryFilter) return expandedGraph;
    return {
      ...expandedGraph,
      edges: expandedGraph.edges.filter(
        (e) => libraryFilter.has(e.source) && libraryFilter.has(e.target),
      ),
    };
  }, [expandedGraph, libraryFilter]);

  const { presentFamilies, familyEdgeCounts } = useMemo(() => {
    const present = new Set<FamilyId>();
    const counts = new Map<FamilyId, number>();
    for (const e of graph.edges) {
      for (const b of e.familyBreakdown) {
        present.add(b.familyId);
        counts.set(b.familyId, (counts.get(b.familyId) ?? 0) + b.count);
      }
    }
    return { presentFamilies: present, familyEdgeCounts: counts };
  }, [graph]);

  const selectedNode = useMemo(
    () => (selectedOracleId ? visibleExpandedGraph.nodes.find((n) => n.id === selectedOracleId) ?? null : null),
    [selectedOracleId, visibleExpandedGraph],
  );
  const incidentEdges = useMemo(
    () =>
      selectedOracleId
        ? visibleExpandedGraph.edges.filter((e) => e.source === selectedOracleId || e.target === selectedOracleId)
        : [],
    [selectedOracleId, visibleExpandedGraph],
  );
  const nodesById = useMemo(() => {
    const m = new Map<string, GraphNode>();
    for (const n of visibleExpandedGraph.nodes) m.set(n.id, n);
    return m;
  }, [visibleExpandedGraph]);

  const deckCountsByOracleId = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of deck?.workingCards ?? []) m.set(c.oracleId, c.count);
    return m;
  }, [deck]);

  const selectedDeckCount = selectedOracleId
    ? deckCountsByOracleId.get(selectedOracleId) ?? 0
    : 0;
  const focusedCardName = focusOracleId ? cards.get(focusOracleId)?.name ?? focusOracleId : null;

  if (!deck) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div className="max-w-sm">
          <p className="font-head text-3xl italic text-vellum">No active deck.</p>
          <p className="mt-2 text-sm text-vellum-mute">
            The interaction graph needs a deck to draw from.
          </p>
          <Link
            to="/decks"
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-brass/40 bg-brass/10 px-4 py-1.5 text-sm font-semibold text-brass-hi transition-colors hover:bg-brass/20 hover:border-brass"
          >
            <span aria-hidden="true">→</span>
            <span>Pick or create one</span>
          </Link>
        </div>
      </div>
    );
  }

  if (deck.workingCards.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div className="max-w-sm">
          <p className="font-head text-3xl italic text-vellum">
            <span className="not-italic font-display text-2xl tracking-wider text-brass-hi">{deck.name}</span>
            <span className="mt-1 block">is empty.</span>
          </p>
          <p className="mt-3 text-sm text-vellum-mute">
            Add cards from the browser and the graph will draw their interactions.
          </p>
          <Link
            to="/"
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-brass/40 bg-brass/10 px-4 py-1.5 text-sm font-semibold text-brass-hi transition-colors hover:bg-brass/20 hover:border-brass"
          >
            <span aria-hidden="true">→</span>
            <span>Start with the browser</span>
          </Link>
        </div>
      </div>
    );
  }

  function updateUrl(mutate: (next: URLSearchParams) => void, opts?: { replace?: boolean }) {
    const next = new URLSearchParams(searchParams);
    mutate(next);
    setSearchParams(next, opts);
    if (!opts?.replace) navStack.markPush();
  }

  function setSelected(id: string | null) {
    if (id === selectedOracleId) return;
    updateUrl((next) => {
      if (id === null) next.delete('selected');
      else next.set('selected', id);
    });
  }

  const toggleFamily = (id: FamilyId) =>
    updateUrl((next) => {
      const cur = new Set(offFamilies);
      if (cur.has(id)) cur.delete(id); else cur.add(id);
      if (cur.size === 0) next.delete('off_fam');
      else next.set('off_fam', Array.from(cur).join(','));
    });

  const resetFamilies = () => updateUrl((next) => next.delete('off_fam'));

  const toggleColor = (c: ColorFilter) =>
    updateUrl((next) => {
      const cur = new Set(onColors);
      if (cur.has(c)) cur.delete(c); else cur.add(c);
      next.set('colors', Array.from(cur).join(','));
    });

  const setMode = (m: Mode) =>
    updateUrl((next) => {
      if (m === 'deck') {
        next.delete('mode');
        next.delete('focus');
      } else {
        next.set('mode', 'focus');
        // If no focus card is set yet but the user has a card selected in the
        // drawer, treat "Card focus" the same as double-clicking that card.
        if (!focusOracleId && selectedOracleId) {
          next.set('focus', selectedOracleId);
        }
      }
    });

  const setFocusOracleId = (id: string | null) =>
    updateUrl((next) => {
      if (id === null) {
        next.delete('focus');
        next.delete('mode');
      } else {
        next.set('focus', id);
        next.set('mode', 'focus');
        next.delete('selected');
      }
    });

  const handleRefresh = () => {
    setRefreshedDeckIds(deck.workingCards.map((c) => c.oracleId));
  };

  const handleAdd = async () => {
    if (!selectedNode) return;
    await addCard(selectedNode.id, 1, selectedNode.card.name);
  };
  const handleRemoveOne = async () => {
    if (!selectedNode) return;
    await removeCard(selectedNode.id, 1);
  };
  const handleRemoveAll = async () => {
    if (!selectedNode || selectedDeckCount === 0) return;
    await removeCard(selectedNode.id, selectedDeckCount);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-ink-line bg-ink-bg/70 px-4 py-2">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="group flex items-center gap-1.5 text-sm text-vellum-mute transition-colors hover:text-brass-hi"
            aria-label="Back to deck list"
            data-tour-id={TOUR_IDS.deckGraphBackLink}
          >
            <span aria-hidden="true" className="inline-block transition-transform group-hover:-translate-x-0.5">←</span>
            <span className="font-head italic text-[15px] leading-none">{deck.name}</span>
          </Link>
          <span className="font-mono tabular text-[11px] text-vellum-dim">
            · {deck.workingCards.reduce((s, c) => s + c.count, 0)} cards
          </span>
        </div>
        <div className="inline-flex overflow-hidden rounded-full border border-ink-line-2 bg-ink-panel/80 p-0.5 text-[11px]">
          <Link
            to="/"
            className="rounded-full px-2.5 py-1 font-semibold uppercase tracking-caps text-vellum-mute transition-colors hover:bg-ink-raised hover:text-vellum"
          >
            List
          </Link>
          <span className="rounded-full bg-brass/15 px-2.5 py-1 font-semibold uppercase tracking-caps text-brass-hi shadow-[inset_0_0_0_1px_rgba(212,164,74,0.45)]">
            Graph
          </span>
        </div>
      </div>

      <PillRow
        mode={mode}
        onModeChange={setMode}
        focusedCardName={focusedCardName}
        onClearFocus={() => setFocusOracleId(null)}
        canEnterFocus={!!focusOracleId || !!selectedOracleId}
        presentFamilies={presentFamilies}
        offFamilies={offFamilies}
        onToggleFamily={toggleFamily}
        onResetFamilies={resetFamilies}
        onColors={onColors}
        onToggleColor={toggleColor}
        pendingMutationCount={pendingMutationCount}
        onRefresh={handleRefresh}
        familyEdgeCounts={familyEdgeCounts}
      />

      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          <CanvasNavButtons
            canBack={navStack.canBack}
            canForward={navStack.canForward}
            onBack={navStack.goBack}
            onForward={navStack.goForward}
          />
          <GraphCanvas
            graph={visibleExpandedGraph}
            selectedId={selectedOracleId}
            hoveredId={hoveredOracleId}
            onSelect={setSelected}
            onFocus={setFocusOracleId}
          />
        </div>
        {selectedNode && (
          <SelectionDrawer
            node={selectedNode}
            incidentEdges={incidentEdges}
            deckCount={selectedDeckCount}
            cards={cards}
            deckCounts={deckCountsByOracleId}
            nodesById={nodesById}
            onAdd={handleAdd}
            onRemoveOne={handleRemoveOne}
            onRemoveAll={handleRemoveAll}
            onClose={() => setSelected(null)}
            onAddNeighbor={(id, qty) => addCard(id, qty, cards.get(id)?.name)}
            onRemoveNeighbor={(id, qty) => removeCard(id, qty)}
            onSelectNeighbor={(id) => setSelected(id)}
            onHoverNeighbor={setHoveredOracleId}
            onToggleFamily={toggleFamily}
          />
        )}
      </div>
      <Toast />
    </div>
  );
}
