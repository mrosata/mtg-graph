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

const COLOR_HEX: Record<Color, string> = {
  W: '#f4eecf',
  U: '#9bbedb',
  B: '#3a3a3a',
  R: '#e89a85',
  G: '#8ec78a',
};

function bandGradient(colors: Color[]): string {
  if (colors.length === 0) return '#444';
  if (colors.length === 1) return COLOR_HEX[colors[0]!];
  const stops = colors.map((c, i) => {
    const pct = (i / (colors.length - 1)) * 100;
    return `${COLOR_HEX[c]} ${pct}%`;
  });
  return `linear-gradient(180deg, ${stops.join(', ')})`;
}

function manaSymbolString(colors: Color[]): string {
  return colors.map((c) => `{${c}}`).join('');
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
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Decks</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setImportOpen(true)}
            className="rounded border border-neutral-700 px-3 py-1 text-sm"
            data-tour-id={TOUR_IDS.importButton}
          >
            Import
          </button>
          <button onClick={handleCreate} className="rounded bg-amber-500 px-3 py-1 text-black" data-tour-id={TOUR_IDS.newDeckButton}>
            New deck
          </button>
        </div>
      </div>
      <ul className="space-y-2" data-tour-id={TOUR_IDS.deckList}>
        {decks.length === 0 && <li className="py-4 text-neutral-500">No decks yet.</li>}
        {decks.map((d) => {
          const colors = deckColors(d, cards);
          const total = d.workingCards.reduce((s, c) => s + c.count, 0);
          const isActive = activeDeckId === d.id;
          const isEditing = editingId === d.id;
          return (
            <li
              key={d.id}
              onClick={() => !isEditing && openDeck(d.id)}
              className="flex cursor-pointer overflow-hidden rounded border border-neutral-800 bg-neutral-950 transition-colors hover:border-neutral-600"
            >
              <div className="w-1 self-stretch" style={{ background: bandGradient(colors) }} />
              <div className="flex flex-1 items-center gap-3 px-3 py-3">
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
                        className="bg-neutral-900 px-1 text-sm font-semibold"
                      />
                    ) : (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(d.id);
                        }}
                        className="cursor-text text-sm font-semibold hover:underline"
                      >
                        {d.name}{isDirty(d) ? '*' : ''}
                      </span>
                    )}
                    {isActive && (
                      <span className="rounded bg-amber-900 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-neutral-400">
                    <ManaCost cost={manaSymbolString(colors)} />
                    <span>· {total} cards · updated {relativeTime(d.updatedAt)}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    exportDeck(d);
                  }}
                  className="rounded border border-neutral-700 px-2 py-1 text-sm text-neutral-300 hover:border-neutral-500"
                >
                  Export
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPendingDelete({ id: d.id, name: d.name });
                  }}
                  className="rounded border border-neutral-700 px-2 py-1 text-sm text-red-400 hover:border-red-500"
                >
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {pendingDelete && (
        <ConfirmModal
          title="Delete deck?"
          message={
            <>
              Delete <span className="font-semibold text-neutral-100">{pendingDelete.name}</span>?
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
