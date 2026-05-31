import { useState } from 'react';
import { useActiveDeck, useDeckStore } from '../stores/deckStore';
import { useGraphStore } from '../stores/graphStore';
import { useLibraryStore } from '../stores/libraryStore';
import { useToastStore } from '../stores/toastStore';
import { isBasicLand } from '../lib/basics';
import ConfirmModal from './ConfirmModal';

type Props = { oracleId: string };

export default function AddToDeckButton({ oracleId }: Props) {
  const activeDeck = useActiveDeck();
  const activeDeckId = activeDeck?.id ?? null;
  const addCard = useDeckStore((s) => s.addCard);
  const removeCard = useDeckStore((s) => s.removeCard);
  const createDeck = useDeckStore((s) => s.createDeck);
  const cardName = useGraphStore((s) => s.cards.get(oracleId)?.name);
  const count = activeDeck?.workingCards.find((c) => c.oracleId === oracleId)?.count ?? 0;
  const [modalQty, setModalQty] = useState<number | null>(null);

  const handleAdd = async (e: React.MouseEvent) => {
    const qty = e.shiftKey ? 4 : 1;
    if (!activeDeckId) {
      setModalQty(qty);
      return;
    }
    await addCard(oracleId, qty, cardName);

    const ownedMap = useLibraryStore.getState().owned;
    const card = useGraphStore.getState().cards.get(oracleId);
    if (ownedMap && card && !isBasicLand(card)) {
      const have = ownedMap.get(oracleId) ?? 0;
      const deckState = useDeckStore.getState();
      const activeDeck = deckState.decks.find((d) => d.id === deckState.activeDeckId);
      const entry = activeDeck?.workingCards.find((c) => c.oracleId === oracleId);
      const newCount = entry?.count ?? 0;
      if (newCount > have) {
        useToastStore.getState().show(
          `Your library has ${have}× ${card.name}; deck now wants ${newCount}.`,
        );
      }
    }
  };

  const handleRemove = async (e: React.MouseEvent) => {
    if (!activeDeckId || count === 0) return;
    const qty = e.shiftKey ? Math.min(4, count) : 1;
    await removeCard(oracleId, qty);
  };

  const confirmCreate = async () => {
    if (modalQty == null) return;
    await createDeck('Untitled Deck');
    await addCard(oracleId, modalQty, cardName);
    setModalQty(null);
  };

  // No deck yet: single primary "Add to deck" CTA that opens the create-deck modal.
  if (!activeDeckId) {
    return (
      <>
        <button
          onClick={handleAdd}
          className="rounded bg-amber-500 px-3 py-1 text-sm font-semibold text-black transition hover:bg-amber-400"
          title="Click: add 1 • Shift+Click: add 4"
        >
          Add to deck
        </button>
        {modalQty !== null && (
          <ConfirmModal
            title="No active deck"
            message={
              <>
                Create a new deck and add {modalQty} {modalQty === 1 ? 'copy' : 'copies'} of this
                card?
              </>
            }
            confirmLabel="Create deck"
            onConfirm={confirmCreate}
            onCancel={() => setModalQty(null)}
          />
        )}
      </>
    );
  }

  // With an active deck and ≥1 copy: render the [-] [N] [+] segmented group.
  // With 0 copies: still render the group so primary action is visible, but
  // suppress the [-] segment so the user can't decrement below zero.
  return (
    <div
      role="group"
      aria-label="Adjust copies in deck"
      className="inline-flex select-none overflow-hidden rounded border border-amber-500/70 bg-neutral-900 shadow-sm"
    >
      {count > 0 && (
        <button
          type="button"
          onClick={handleRemove}
          className="flex h-8 w-8 items-center justify-center text-amber-300 transition hover:bg-amber-500/15 hover:text-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-400"
          title="Click: remove 1 • Shift+Click: remove up to 4"
          aria-label="Remove one copy"
        >
          <MinusIcon />
        </button>
      )}
      {count > 0 && (
        <span
          className="flex h-8 min-w-[2.25rem] items-center justify-center border-x border-amber-500/40 px-2 font-mono text-sm font-semibold text-amber-200"
          aria-label={`${count} in deck`}
        >
          {count}
        </span>
      )}
      <button
        type="button"
        onClick={handleAdd}
        className={`flex h-8 items-center gap-1.5 bg-amber-500 px-3 text-sm font-semibold text-black transition hover:bg-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-300 ${count > 0 ? '' : 'rounded'}`}
        title="Click: add 1 • Shift+Click: add 4"
        aria-label={count > 0 ? 'Add one copy' : 'Add to deck'}
      >
        <PlusIcon />
        {count === 0 && <span>Add to deck</span>}
      </button>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M3 8h10" />
    </svg>
  );
}
