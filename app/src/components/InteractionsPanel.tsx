// app/src/components/InteractionsPanel.tsx
import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useGraphStore } from '../stores/graphStore';
import { useActiveDeck } from '../stores/deckStore';
import { getNeighbors, type Neighbor } from '../lib/traversal';
import { applyFilter, type Filter } from '../lib/filter';
import { useDeckPanelCollapsed } from '../lib/useDeckPanelCollapsed';
import HoverCardPreview from './HoverCardPreview';
import type { Card, Color, Rarity, TagDef } from '@shared/types';

// Mirror DeckPanel's hover-preview anchoring: hardcoded widths + the shared
// deck-panel-collapsed state. The preview always sits to the left of the
// drawer (and the deck rail when an active deck is present).
const DRAWER_WIDTH = 420;
const DECK_PANEL_EXPANDED = 360;
const DECK_PANEL_COLLAPSED = 72;
const PREVIEW_WIDTH = 320;
const PREVIEW_GAP = 12;

const COLORS: Color[] = ['W', 'U', 'B', 'R', 'G'];
const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'mythic'];
const RARITY_LETTERS: Record<Rarity, string> = {
  common: 'C', uncommon: 'U', rare: 'R', mythic: 'M',
};

// Either tag's category determines the reason's section. Theme edges always have
// theme tags on both ends, so checking either side is sufficient.
function reasonCategory(
  tagCatalog: Map<string, TagDef>,
  sourceTagId: string,
  targetTagId: string,
): 'interaction' | 'theme' {
  if (tagCatalog.get(sourceTagId)?.category === 'theme') return 'theme';
  if (tagCatalog.get(targetTagId)?.category === 'theme') return 'theme';
  return 'interaction';
}

function splitByCategory(
  neighbors: Neighbor[],
  tagCatalog: Map<string, TagDef>,
): { interactionNeighbors: Neighbor[]; themeNeighbors: Neighbor[] } {
  const interaction: Neighbor[] = [];
  const theme: Neighbor[] = [];
  for (const n of neighbors) {
    const iReasons = n.reasons.filter((r) => reasonCategory(tagCatalog, r.sourceTagId, r.targetTagId) === 'interaction');
    const tReasons = n.reasons.filter((r) => reasonCategory(tagCatalog, r.sourceTagId, r.targetTagId) === 'theme');
    if (iReasons.length) interaction.push({ ...n, reasons: iReasons });
    if (tReasons.length) theme.push({ ...n, reasons: tReasons });
  }
  return { interactionNeighbors: interaction, themeNeighbors: theme };
}

function tagCounts(neighbors: Neighbor[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const n of neighbors) {
    const seen = new Set<string>();
    for (const r of n.reasons) {
      const neighborTag = r.direction === 'outbound' ? r.targetTagId : r.sourceTagId;
      if (seen.has(neighborTag)) continue;
      seen.add(neighborTag);
      counts.set(neighborTag, (counts.get(neighborTag) ?? 0) + 1);
    }
  }
  return counts;
}

function applyNeighborFilter(neighbors: Neighbor[], cards: Map<string, Card>, filter: Filter): Neighbor[] {
  const neighborCards = neighbors
    .map((n) => cards.get(n.oracleId))
    .filter((c): c is Card => !!c);
  const matching = new Set(applyFilter(neighborCards, filter).map((c) => c.oracleId));
  return neighbors.filter((n) => matching.has(n.oracleId));
}

type Props = {
  oracleId: string;
  onFocusCard: (oracleId: string) => void;
};

type TabKey = 'interactions' | 'themes';

export default function InteractionsPanel({ oracleId, onFocusCard }: Props) {
  const cards = useGraphStore((s) => s.cards);
  const outbound = useGraphStore((s) => s.edges);
  const inbound = useGraphStore((s) => s.edgesInbound);
  const tagCatalog = useGraphStore((s) => s.tagCatalog);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [deckCollapsed] = useDeckPanelCollapsed();

  const activeDeck = useActiveDeck();

  // The DeckPanel rail mounts whenever there is an active deck (Workspace at /
  // adapts on activeDeckId). The rail width here affects hover-preview anchoring.
  const hasDeckRail = activeDeck !== null;
  const deckRailWidth = hasDeckRail
    ? (deckCollapsed ? DECK_PANEL_COLLAPSED : DECK_PANEL_EXPANDED)
    : 0;

  function countInDeck(id: string): number {
    return activeDeck?.workingCards.find((c) => c.oracleId === id)?.count ?? 0;
  }

  const [tab, setTab] = useState<TabKey>('interactions');
  const [filter, setFilter] = useState<Filter>({});
  const [hoverUrl, setHoverUrl] = useState<string | null>(null);

  const neighbors = useMemo(() => getNeighbors(oracleId, outbound, inbound), [oracleId, outbound, inbound]);

  // Split each neighbor's reasons by category; a neighbor with both kinds of reasons
  // appears in both tabs, each list showing only the relevant reasons.
  const { interactionNeighbors, themeNeighbors } = useMemo(
    () => splitByCategory(neighbors, tagCatalog),
    [neighbors, tagCatalog],
  );

  const interactionTypeCounts = useMemo(() => tagCounts(interactionNeighbors), [interactionNeighbors]);
  const themeTypeCounts = useMemo(() => tagCounts(themeNeighbors), [themeNeighbors]);

  const filteredInteractions = useMemo(
    () => applyNeighborFilter(interactionNeighbors, cards, filter),
    [interactionNeighbors, cards, filter],
  );
  const filteredThemes = useMemo(
    () => applyNeighborFilter(themeNeighbors, cards, filter),
    [themeNeighbors, cards, filter],
  );

  function navigateToTag(tagId: string) {
    // Stay on the current route so the tag chip click doesn't drop deck context.
    // Tag list is toggled against the existing URL state to preserve other filters.
    const params = new URLSearchParams(searchParams);
    const existing = params.getAll('tag');
    params.delete('tag');
    const next = existing.includes(tagId)
      ? existing.filter((t) => t !== tagId)
      : [...existing, tagId];
    for (const t of next) params.append('tag', t);
    params.set('card', oracleId);
    navigate(`${location.pathname}?${params.toString()}`);
  }

  const activeNeighbors = tab === 'interactions' ? filteredInteractions : filteredThemes;
  const activeCounts = tab === 'interactions' ? interactionTypeCounts : themeTypeCounts;
  const activeTone =
    tab === 'themes'
      ? 'border-violet-700 text-violet-200 hover:border-violet-400 hover:bg-violet-950'
      : 'border-neutral-700 text-neutral-300 hover:border-amber-500 hover:bg-amber-950/40 hover:text-amber-200';
  const reasonTone = tab === 'themes' ? 'text-violet-300' : 'text-neutral-400';

  return (
    <div className="mt-4 border-t border-neutral-800 pt-3">
      <div className="mb-2 flex gap-1 border-b border-neutral-800">
        <TabButton
          active={tab === 'interactions'}
          onClick={() => setTab('interactions')}
          label={`Interactions (${filteredInteractions.length})`}
        />
        <TabButton
          active={tab === 'themes'}
          onClick={() => setTab('themes')}
          label={`Deck themes (${filteredThemes.length})`}
          accent="violet"
        />
      </div>

      {activeCounts.size > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {Array.from(activeCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([tagId, count]) => {
              const label = tagCatalog.get(tagId)?.label ?? tagId;
              const def = tagCatalog.get(tagId);
              return (
                <button
                  key={tagId}
                  onClick={() => navigateToTag(tagId)}
                  // No hover popup — `title` is intentionally omitted so the description
                  // doesn't appear as a native tooltip. Hover feedback is purely visual.
                  className={`rounded border px-1.5 py-0.5 text-[11px] transition-colors ${activeTone}`}
                  aria-label={`Show all cards tagged ${label}`}
                  aria-description={def?.description}
                >
                  {label} <span className="opacity-70">{count}</span>
                </button>
              );
            })}
        </div>
      )}

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

      <ul className="space-y-1">
        {activeNeighbors.map((n) => {
          const card = cards.get(n.oracleId)!;
          return (
            <li key={n.oracleId}>
              <button
                onClick={() => {
                  setHoverUrl(null);
                  onFocusCard(n.oracleId);
                }}
                onMouseEnter={() => {
                  if (card.imageUrl) setHoverUrl(card.imageUrl);
                }}
                onMouseLeave={() => setHoverUrl(null)}
                className="flex w-full items-center gap-2 rounded p-1 text-left hover:bg-neutral-900"
              >
                <img src={card.imageUrl} alt="" className="h-12 w-9 rounded object-contain" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-sm">{card.name}</div>
                    {countInDeck(n.oracleId) > 0 && (
                      <span className="shrink-0 rounded bg-amber-900 px-1.5 py-0.5 text-[10px] font-semibold text-amber-200">
                        ×{countInDeck(n.oracleId)}
                      </span>
                    )}
                  </div>
                  <div className={`truncate text-xs ${reasonTone}`}>
                    {n.reasons.map((r, i) => {
                      const src = tagCatalog.get(r.sourceTagId)?.label ?? r.sourceTagId;
                      const tgt = tagCatalog.get(r.targetTagId)?.label ?? r.targetTagId;
                      const arrow = r.direction === 'outbound' ? '→' : '←';
                      return (
                        <span key={i}>
                          {i > 0 && '; '}
                          {src} {arrow} {tgt}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {hoverUrl && (
        // Anchored against the drawer's left edge plus the deck rail's current
        // width — keeps the preview off both the interactions list and the
        // deck list as the right rail collapses/expands.
        <HoverCardPreview
          mode="anchored"
          url={hoverUrl}
          width={PREVIEW_WIDTH}
          anchorRight={DRAWER_WIDTH + deckRailWidth + PREVIEW_GAP}
          hideBelowPx={PREVIEW_WIDTH + DRAWER_WIDTH + deckRailWidth + PREVIEW_GAP}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  accent = 'amber',
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  accent?: 'amber' | 'violet';
}) {
  const activeColor = accent === 'violet' ? 'border-violet-500 text-violet-200' : 'border-amber-500 text-amber-200';
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
        active ? activeColor : 'border-transparent text-neutral-400 hover:text-neutral-200'
      }`}
    >
      {label}
    </button>
  );
}
