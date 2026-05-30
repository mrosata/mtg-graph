import { useMemo, useRef, useState } from 'react';
import { useGraphStore } from '../stores/graphStore';
import { useActiveDeck, useDeckStore } from '../stores/deckStore';
import { deckLegality } from '../lib/legality';
import { manaCurveBuckets, TYPE_ORDER, TYPE_PLURAL, type DeckType } from '../lib/deckStats';
import { useDeckPanelCollapsed } from '../lib/useDeckPanelCollapsed';
import ManaCurve from './ManaCurve';
import DeckPanelCollapsed from './DeckPanelCollapsed';
import HoverCardPreview from './HoverCardPreview';
import CardListRow, { CountControls } from './CardListRow';
import { deckToArenaText } from '../lib/deckExport';
import { useToastStore } from '../stores/toastStore';
import { added, removed, isDirty } from '../lib/deckDiff';
import { TOUR_IDS } from '../wizard/selectors';

type Props = {
  onCardClick?: (oracleId: string) => void;
  drawerOpen?: boolean;
};

// Layout constants — keep these in sync with the panel widths in BrowserShell
// and DeckPanel. The hover preview anchors against the drawer's left edge (or
// the deck-panel's left edge when the drawer isn't open) so the drawer content
// stays visible while a user scans deck rows.
const PANEL_WIDTH_EXPANDED = 360;
const DRAWER_WIDTH = 420;
const PREVIEW_GAP = 12;
const PREVIEW_WIDTH = 280;

export default function DeckPanel({ onCardClick, drawerOpen = false }: Props = {}) {
  const cards = useGraphStore((s) => s.cards);
  const deck = useActiveDeck();
  const renameDeck = useDeckStore((s) => s.renameDeck);
  const addCard = useDeckStore((s) => s.addCard);
  const removeCard = useDeckStore((s) => s.removeCard);
  const saveDeck = useDeckStore((s) => s.saveDeck);
  const discardChanges = useDeckStore((s) => s.discardChanges);
  const restoreRemoved = useDeckStore((s) => s.restoreRemoved);
  const showToast = useToastStore((s) => s.show);

  const [collapsed, setCollapsed] = useDeckPanelCollapsed();
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [hoverUrl, setHoverUrl] = useState<string | null>(null);

  const sectionRefs = useRef<Partial<Record<DeckType, HTMLHeadingElement | null>>>({});

  const startEditingName = () => {
    if (!deck) return;
    setNameDraft(deck.name);
    setEditingName(true);
  };

  const commitName = async () => {
    if (deck && nameDraft.trim() && nameDraft !== deck.name) {
      await renameDeck(deck.id, nameDraft.trim());
    }
    setEditingName(false);
  };

  const grouped = useMemo(() => {
    const out: Partial<Record<DeckType | 'Unknown', { oracleId: string; count: number; name: string }[]>> = {};
    if (!deck) return out;
    for (const entry of deck.workingCards) {
      const card = cards.get(entry.oracleId);
      if (!card) {
        const name = entry.name ?? `Unknown card (oracleId: ${entry.oracleId.slice(0, 8)})`;
        (out['Unknown'] ||= []).push({ oracleId: entry.oracleId, count: entry.count, name });
        continue;
      }
      const primary = TYPE_ORDER.find((t) => card.types.includes(t)) ?? null;
      const bucket: DeckType | 'Unknown' = primary ?? 'Unknown';
      (out[bucket] ||= []).push({ oracleId: entry.oracleId, count: entry.count, name: card.name });
    }
    return out;
  }, [deck, cards]);

  const curve = useMemo(
    () => (deck ? manaCurveBuckets(deck, cards) : new Array(8).fill(0)),
    [deck, cards],
  );

  const total = deck?.workingCards.reduce((s, c) => s + c.count, 0) ?? 0;
  const dirty = deck ? isDirty(deck) : false;
  const addedSet = useMemo(() => new Set(deck ? added(deck).map((c) => c.oracleId) : []), [deck]);
  const removedEntries = useMemo(() => (deck ? removed(deck) : []), [deck]);
  const warnings = deck ? deckLegality(deck, cards) : [];

  const jumpToType = (type: DeckType) => {
    setCollapsed(false);
    queueMicrotask(() => {
      sectionRefs.current[type]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const widthClass = collapsed ? 'w-[72px]' : 'w-[360px]';

  if (collapsed) {
    return (
      <div className={`h-full transition-[width] duration-200 ease-out ${widthClass}`}>
        <DeckPanelCollapsed onExpand={() => setCollapsed(false)} onJumpToType={jumpToType} />
      </div>
    );
  }

  if (!deck) {
    return (
      <div className={`h-full transition-[width] duration-200 ease-out ${widthClass}`}>
        <p className="p-4 text-neutral-400">No active deck. Create or select one from Decks.</p>
      </div>
    );
  }

  return (
    <div className={`h-full transition-[width] duration-200 ease-out ${widthClass}`} data-tour-id={TOUR_IDS.deckRail}>
      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {editingName ? (
              <input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={commitName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitName();
                  if (e.key === 'Escape') setEditingName(false);
                }}
                className="w-full bg-neutral-900 px-1 text-lg font-semibold"
              />
            ) : (
              <h2
                onClick={startEditingName}
                className="cursor-pointer truncate text-lg font-semibold hover:underline"
                title="Click to rename"
              >
                {deck.name}{dirty ? '*' : ''}
              </h2>
            )}
            <p className="text-xs text-neutral-400">{total} cards</p>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => saveDeck(deck.id)}
                disabled={!dirty}
                className="rounded bg-amber-500 px-2 py-0.5 text-xs font-semibold text-black hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500 disabled:hover:bg-neutral-800"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => discardChanges(deck.id)}
                disabled={!dirty}
                className="rounded border border-red-500/50 px-2 py-0.5 text-xs text-red-400 hover:text-red-300 disabled:cursor-not-allowed disabled:border-neutral-800 disabled:text-neutral-600 disabled:hover:text-neutral-600"
              >
                Discard
              </button>
              <button
                onClick={async () => {
                  const text = deckToArenaText(deck, cards);
                  try {
                    await navigator.clipboard.writeText(text);
                    showToast(`Copied "${deck.name}" (${total} cards)`);
                  } catch {
                    showToast('Copy failed. Select the text and copy manually.');
                  }
                }}
                className="ml-auto text-xs text-amber-400 hover:underline"
              >
                Export
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            aria-label="Collapse deck panel"
            className="shrink-0 text-neutral-400 hover:text-neutral-100"
          >
            ◀
          </button>
        </div>
        <div data-tour-id={TOUR_IDS.manaCurve}>
          <ManaCurve countsByCmc={curve} max={Math.max(...curve)} />
        </div>
        {warnings.length > 0 && (
          <ul className="space-y-1">
            {warnings.map((w, i) => (
              <li key={i} className="text-xs text-amber-300">{w.message}</li>
            ))}
          </ul>
        )}
        <div className="space-y-3">
          {TYPE_ORDER.filter((t) => grouped[t]?.length).map((t) => (
            <div key={t}>
              <h3
                ref={(el) => { sectionRefs.current[t] = el; }}
                className="text-xs uppercase tracking-wide text-neutral-400"
              >
                {TYPE_PLURAL[t]}
              </h3>
              <ul className="mt-1 space-y-0.5">
                {(grouped[t] ?? []).map((e) => (
                  <CardListRow
                    key={e.oracleId}
                    oracleId={e.oracleId}
                    name={e.name}
                    count={e.count}
                    manaCost={cards.get(e.oracleId)?.manaCost ?? null}
                    onAdd={(qty) => addCard(e.oracleId, qty, cards.get(e.oracleId)?.name)}
                    onRemove={(qty) => removeCard(e.oracleId, qty)}
                    className={addedSet.has(e.oracleId) ? 'border-l-2 border-green-500 pl-1' : ''}
                    onClickName={
                      onCardClick
                        ? () => {
                            setHoverUrl(null);
                            onCardClick(e.oracleId);
                          }
                        : undefined
                    }
                    onMouseEnter={() => {
                      const card = cards.get(e.oracleId);
                      if (card?.imageUrl) setHoverUrl(card.imageUrl);
                    }}
                    onMouseLeave={() => setHoverUrl(null)}
                  />
                ))}
              </ul>
            </div>
          ))}
          {grouped['Unknown']?.length ? (
            <div>
              <h3 className="text-xs uppercase tracking-wide text-neutral-400">Unknown</h3>
              <ul className="mt-1 space-y-0.5">
                {grouped['Unknown'].map((e) => (
                  <li
                    key={e.oracleId}
                    data-testid="card-row"
                    className={`flex items-center gap-2 px-1 py-0.5 text-sm${
                      addedSet.has(e.oracleId) ? ' border-l-2 border-green-500 pl-1' : ''
                    }`}
                  >
                    <CountControls
                      count={e.count}
                      onAdd={(qty) => addCard(e.oracleId, qty)}
                      onRemove={(qty) => removeCard(e.oracleId, qty)}
                    />
                    <span className="truncate text-neutral-400" title={e.oracleId}>{e.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {removedEntries.length > 0 && (
            <div>
              <h3 className="text-xs uppercase tracking-wide text-neutral-400">Removed cards</h3>
              <ul className="mt-1 space-y-0.5">
                {removedEntries.map((r) => {
                  const displayName = cards.get(r.oracleId)?.name ?? r.name ?? `Unknown card (oracleId: ${r.oracleId.slice(0, 8)})`;
                  return (
                    <li
                      key={r.oracleId}
                      data-testid="removed-row"
                      className="border-l-2 border-red-500 pl-1"
                    >
                      <button
                        type="button"
                        onClick={() => restoreRemoved(r.oracleId)}
                        aria-label={`Restore ${displayName}`}
                        className="flex w-full items-center gap-2 rounded px-1 py-0.5 text-left text-sm text-neutral-300 hover:bg-neutral-900 hover:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
                      >
                        <span className="tabular-nums text-neutral-500">{r.count}×</span>
                        <span className="truncate">{displayName}</span>
                        <span className="ml-auto text-xs text-neutral-500">Restore</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
        {hoverUrl && (
          <HoverCardPreview
            mode="anchored"
            url={hoverUrl}
            width={PREVIEW_WIDTH}
            anchorRight={
              PANEL_WIDTH_EXPANDED + (drawerOpen ? DRAWER_WIDTH : 0) + PREVIEW_GAP
            }
            // Hide below the width where the preview would clip off the left
            // edge of the viewport. The preview may visually overlap the
            // filter sidebar at narrow widths — that's preferable to losing it.
            hideBelowPx={
              PREVIEW_WIDTH +
              (drawerOpen ? DRAWER_WIDTH : 0) +
              PANEL_WIDTH_EXPANDED +
              PREVIEW_GAP
            }
          />
        )}
      </div>
    </div>
  );
}

