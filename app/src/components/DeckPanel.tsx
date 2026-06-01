import { useMemo, useRef, useState } from 'react';
import { useGraphStore } from '../stores/graphStore';
import { useActiveDeck, useDeckStore } from '../stores/deckStore';
import { useLibraryStore } from '../stores/libraryStore';
import { deckLegality } from '../lib/legality';
import { manaCurveBuckets, TYPE_ORDER, TYPE_PLURAL, type DeckType } from '../lib/deckStats';
import { useDeckPanelCollapsed } from '../lib/useDeckPanelCollapsed';
import ManaCurve from './ManaCurve';
import DeckPanelCollapsed from './DeckPanelCollapsed';
import HoverCardPreview from './HoverCardPreview';
import CardListRow, { CountControls } from './CardListRow';
import NotInLibraryBadge from './NotInLibraryBadge';
import { deckToArenaText } from '../lib/deckExport';
import { useToastStore } from '../stores/toastStore';
import { added, removed, isDirty } from '../lib/deckDiff';
import { TOUR_IDS } from '../wizard/selectors';
import { isBasicLand } from '../lib/basics';
import type { Card } from '@shared/types';

type Props = {
  onCardClick?: (oracleId: string) => void;
  drawerOpen?: boolean;
};

function rowCountLabel(
  card: Card | undefined,
  count: number,
  owned: Map<string, number> | null,
): React.JSX.Element {
  if (!owned || !card || isBasicLand(card)) {
    return <span className="font-mono tabular text-xs text-vellum-dim">{count}×</span>;
  }
  const have = owned.get(card.oracleId) ?? 0;
  const short = have < count;
  return (
    <span className={`font-mono tabular text-xs ${short ? 'text-brass-hi' : 'text-vellum-dim'}`}>
      {count}/{have}
    </span>
  );
}

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
  const owned = useLibraryStore((s) => s.owned);
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

  const missing = useMemo(() => {
    if (!owned || !deck) return null;
    let m = 0;
    for (const r of deck.workingCards) {
      const card = cards.get(r.oracleId);
      if (!card || isBasicLand(card)) continue;
      const have = owned.get(r.oracleId) ?? 0;
      if (r.count > have) m += r.count - have;
    }
    return m;
  }, [owned, deck, cards]);

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
        <p className="p-4 font-head italic text-vellum-mute">No active deck. Create or select one from Decks.</p>
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
                className="focus-brass w-full rounded border border-ink-line bg-ink-raised px-2 py-1 font-head text-2xl italic text-vellum"
              />
            ) : (
              <h2
                onClick={startEditingName}
                className="cursor-pointer truncate font-head text-2xl italic text-vellum transition-colors hover:text-brass-hi"
                title="Click to rename"
              >
                {deck.name}{dirty ? '*' : ''}
              </h2>
            )}
            <p className="font-mono tabular text-xs text-vellum-dim">{total} cards</p>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => saveDeck(deck.id)}
                disabled={!dirty}
                className="focus-brass rounded-full bg-brass px-3 py-0.5 text-xs font-semibold text-ink-bg transition-colors hover:bg-brass-hi disabled:cursor-not-allowed disabled:bg-ink-raised disabled:text-vellum-dim disabled:hover:bg-ink-raised"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => discardChanges(deck.id)}
                disabled={!dirty}
                className="focus-brass rounded-full border border-mana-r/50 px-3 py-0.5 text-xs text-mana-r transition-colors hover:bg-mana-r/10 hover:text-mana-r disabled:cursor-not-allowed disabled:border-ink-line disabled:text-vellum-dim disabled:hover:bg-transparent"
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
                className="focus-brass ml-auto text-xs text-brass transition-colors hover:text-brass-hi"
              >
                Export
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            aria-label="Collapse deck panel"
            className="focus-brass shrink-0 rounded p-1 text-vellum-dim transition-colors hover:bg-ink-raised hover:text-brass-hi"
          >
            <svg
              viewBox="0 0 16 16"
              width="14"
              height="14"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 3L5 8l5 5" />
            </svg>
          </button>
        </div>
        <div data-tour-id={TOUR_IDS.manaCurve}>
          <ManaCurve countsByCmc={curve} max={Math.max(...curve)} />
        </div>
        {warnings.length > 0 && (
          <ul className="space-y-1">
            {warnings.map((w, i) => (
              <li key={i} className="text-xs text-brass-hi">{w.message}</li>
            ))}
          </ul>
        )}
        {owned && missing !== null && (
          missing === 0
            ? (
              <p
                aria-label="Library is fully stocked"
                className="font-head italic text-xs text-vellum-mute"
              >
                <span aria-hidden="true" className="mr-1 text-brass">✓</span>
                Library covers this deck.
              </p>
            )
            : <p className="font-mono tabular text-xs text-brass-hi">Missing: {missing} cards</p>
        )}
        <div className="space-y-3">
          {TYPE_ORDER.filter((t) => grouped[t]?.length).map((t) => (
            <div key={t}>
              <h3
                ref={(el) => { sectionRefs.current[t] = el; }}
                className="eyebrow"
              >
                {TYPE_PLURAL[t]}
              </h3>
              <ul className="mt-1 space-y-0.5">
                {(grouped[t] ?? []).map((e) => {
                  const rowCard = cards.get(e.oracleId);
                  return (
                    <CardListRow
                      key={e.oracleId}
                      oracleId={e.oracleId}
                      name={e.name}
                      count={e.count}
                      manaCost={rowCard?.manaCost ?? null}
                      onAdd={(qty) => addCard(e.oracleId, qty, rowCard?.name)}
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
                        if (rowCard?.imageUrl) setHoverUrl(rowCard.imageUrl);
                      }}
                      onMouseLeave={() => setHoverUrl(null)}
                      rightSlot={
                        <>
                          {rowCountLabel(rowCard, e.count, owned)}
                          {rowCard && <NotInLibraryBadge card={rowCard} />}
                        </>
                      }
                    />
                  );
                })}
              </ul>
            </div>
          ))}
          {grouped['Unknown']?.length ? (
            <div>
              <h3 className="eyebrow">Unknown</h3>
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
                    <span className="truncate text-vellum-dim" title={e.oracleId}>{e.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {removedEntries.length > 0 && (
            <div>
              <h3 className="eyebrow">Removed cards</h3>
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
                        className="focus-brass flex w-full items-center gap-2 rounded px-1 py-0.5 text-left text-sm text-vellum-mute transition-colors hover:bg-ink-raised/50 hover:text-vellum"
                      >
                        <span className="font-mono tabular text-vellum-dim">{r.count}×</span>
                        <span className="truncate">{displayName}</span>
                        <span className="ml-auto text-xs text-vellum-dim">Restore</span>
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

