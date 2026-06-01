import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeckStore } from '../stores/deckStore';
import { useGraphStore } from '../stores/graphStore';
import { useToastStore } from '../stores/toastStore';
import ConfirmModal from '../components/ConfirmModal';
import ImportDeckModal from '../components/ImportDeckModal';
import Toast from '../components/Toast';
import ManaCost from '../components/ManaCost';
import { deckColors } from '../lib/deckColors';
import { deckToArenaText } from '../lib/deckExport';
import { relativeTime } from '../lib/relativeTime';
import { isDirty } from '../lib/deckDiff';
import { TOUR_IDS } from '../wizard/selectors';
import type { Color } from '@shared/types';
import type { Deck } from '../lib/db';

// Mana-derived hex stops for the left band — tuned so the gradient reads as
// a hand-painted edge rather than the saturated WUBRG pips.
const BAND_HEX: Record<Color, string> = {
  W: '#f0e6c8',
  U: '#7eb6e8',
  B: '#7a6b86',
  R: '#e07772',
  G: '#82b97c',
};

function bandGradient(colors: Color[]): string {
  if (colors.length === 0) return '#3a3543';
  if (colors.length === 1) return BAND_HEX[colors[0]!];
  const stops = colors.map((c, i) => {
    const pct = (i / (colors.length - 1)) * 100;
    return `${BAND_HEX[c]} ${pct}%`;
  });
  return `linear-gradient(180deg, ${stops.join(', ')})`;
}

function manaSymbolString(colors: Color[]): string {
  return colors.map((c) => `{${c}}`).join('');
}

function ColorPips({ colors }: { colors: Color[] }) {
  if (colors.length === 0) return null;
  return (
    <span aria-hidden="true" className="inline-flex items-center gap-1">
      {colors.map((c) => (
        <span key={c} className={`pip pip-${c.toLowerCase()}`} />
      ))}
    </span>
  );
}

function TrefoilMark() {
  // Tiny brand-echo mark for the empty state. Three brass dots in a trefoil.
  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 44 44"
      aria-hidden="true"
      className="mb-4 opacity-70"
    >
      <g fill="none" stroke="#d4a44a" strokeWidth="1.2">
        <circle cx="22" cy="14" r="5" />
        <circle cx="14" cy="28" r="5" />
        <circle cx="30" cy="28" r="5" />
      </g>
      <circle cx="22" cy="22" r="1.2" fill="#f0c97a" />
    </svg>
  );
}

export default function DecksPage() {
  const decks = useDeckStore((s) => s.decks);
  const activeDeckId = useDeckStore((s) => s.activeDeckId);
  const setActiveDeck = useDeckStore((s) => s.setActiveDeck);
  const createDeck = useDeckStore((s) => s.createDeck);
  const deleteDeck = useDeckStore((s) => s.deleteDeck);
  const renameDeck = useDeckStore((s) => s.renameDeck);
  const cards = useGraphStore((s) => s.cards);
  const showToast = useToastStore((s) => s.show);
  const navigate = useNavigate();
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const handleCreate = async () => {
    await createDeck(`Untitled Deck ${decks.length + 1}`);
    navigate('/');
  };

  const openDeck = (id: string) => {
    setActiveDeck(id);
    navigate('/');
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await deleteDeck(pendingDelete.id);
    setPendingDelete(null);
  };

  const exportDeck = async (deck: Deck) => {
    const text = deckToArenaText(deck, cards);
    try {
      await navigator.clipboard.writeText(text);
      const total = deck.workingCards.reduce((s, c) => s + c.count, 0);
      showToast(`Copied "${deck.name}" (${total} cards)`);
    } catch {
      showToast('Copy failed. Select the text and copy manually.');
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-2 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-[0.18em] text-vellum">Decks</h1>
          <p className="mt-1 font-head italic text-vellum-mute">Your saved Standard decks</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setImportOpen(true)}
            className="focus-brass inline-flex items-center gap-1.5 rounded-full border border-ink-line-2 bg-ink-raised px-3.5 py-1.5 text-xs font-medium text-vellum-mute transition-colors hover:border-brass/60 hover:text-brass-hi"
            data-tour-id={TOUR_IDS.importButton}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M8 2v8m0 0 3-3m-3 3L5 7" />
              <path d="M3 12v1a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1" />
            </svg>
            Import
          </button>
          <button
            onClick={handleCreate}
            className="focus-brass inline-flex items-center gap-1.5 rounded-full bg-brass px-4 py-1.5 text-xs font-semibold text-ink-bg transition-colors hover:bg-brass-hi"
            data-tour-id={TOUR_IDS.newDeckButton}
          >
            <span aria-hidden="true" className="text-base leading-none">+</span>
            New deck
          </button>
        </div>
      </header>
      <div className="brass-hairline mb-6" />

      {decks.length === 0 ? (
        <ul className="mt-8 flex flex-col items-center justify-center text-center" data-tour-id={TOUR_IDS.deckList}>
          <li className="flex flex-col items-center">
            <TrefoilMark />
            <p className="font-head text-xl italic text-vellum-mute">
              No decks yet. Start a planeswalker's notebook.
            </p>
          </li>
        </ul>
      ) : (
        <ul className="page-enter space-y-2" data-tour-id={TOUR_IDS.deckList}>
          {decks.map((d) => {
            const colors = deckColors(d, cards);
            const total = d.workingCards.reduce((s, c) => s + c.count, 0);
            const isActive = activeDeckId === d.id;
            const isEditing = editingId === d.id;
            const dirty = isDirty(d);
            return (
              <li
                key={d.id}
                onClick={() => !isEditing && openDeck(d.id)}
                className="group flex cursor-pointer overflow-hidden rounded border border-ink-line bg-ink-panel transition-colors hover:border-brass/40"
              >
                <div
                  className="w-1.5 self-stretch shadow-[inset_-1px_0_0_rgba(0,0,0,0.4)] transition-[filter] group-hover:brightness-125"
                  style={{ background: bandGradient(colors) }}
                />
                <div className="flex flex-1 items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <input
                          autoFocus
                          defaultValue={d.name}
                          onClick={(e) => e.stopPropagation()}
                          onBlur={(e) => {
                            if (e.target.value.trim() && e.target.value !== d.name) {
                              renameDeck(d.id, e.target.value.trim());
                            }
                            setEditingId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="focus-brass rounded border border-ink-line-2 bg-ink-raised px-2 py-0.5 font-head text-xl italic text-vellum"
                        />
                      ) : (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(d.id);
                          }}
                          className={`cursor-text font-head text-xl italic text-vellum hover:text-brass-hi ${dirty ? 'text-brass-hi' : ''}`}
                          title={dirty ? 'Unsaved changes' : undefined}
                        >
                          {dirty ? `${d.name}*` : d.name}
                        </span>
                      )}
                      {isActive && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-brass/40 bg-brass/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-brass-hi">
                          <span aria-hidden="true" className="pip pip-w" style={{ background: '#f0c97a' }} />
                          Active
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-vellum-dim">
                      <ManaCost cost={manaSymbolString(colors)} />
                      <ColorPips colors={colors} />
                      <span aria-hidden="true" className="text-ink-line-2">·</span>
                      <span className="font-mono tabular text-vellum-mute">{total}</span>
                      <span>cards</span>
                      <span aria-hidden="true" className="text-ink-line-2">·</span>
                      <span>updated <span className="font-mono tabular text-vellum-mute">{relativeTime(d.updatedAt)}</span></span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      exportDeck(d);
                    }}
                    className="focus-brass inline-flex items-center gap-1 rounded border border-ink-line-2 bg-ink-raised/60 px-2.5 py-1 text-xs text-vellum-mute transition-colors hover:border-brass/50 hover:text-brass-hi"
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M8 10V2m0 0 3 3M8 2 5 5" />
                      <path d="M3 11v1a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1" />
                    </svg>
                    Export
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPendingDelete({ id: d.id, name: d.name });
                    }}
                    className="focus-brass inline-flex items-center gap-1 rounded border border-ink-line-2 bg-ink-raised/60 px-2.5 py-1 text-xs text-mana-r transition-colors hover:border-mana-r/50 hover:bg-mana-r/10"
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 4h10M6 4V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1m-5 0v9a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V4" />
                    </svg>
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {pendingDelete && (
        <ConfirmModal
          title="Delete deck?"
          message={
            <>
              Delete <span className="font-head italic text-vellum">{pendingDelete.name}</span>?
              This cannot be undone.
            </>
          }
          confirmLabel="Delete"
          destructive
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
      {importOpen && <ImportDeckModal onClose={() => setImportOpen(false)} />}
      <Toast />
    </div>
  );
}
