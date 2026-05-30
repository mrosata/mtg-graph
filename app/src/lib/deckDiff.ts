import type { Deck, DeckCard } from './db';

function indexByOracleId(entries: DeckCard[]): Map<string, DeckCard> {
  const out = new Map<string, DeckCard>();
  for (const e of entries) out.set(e.oracleId, e);
  return out;
}

// Assumes both card lists hold at most one entry per oracleId — an invariant the
// deckStore enforces in addCard/removeCard. With that invariant, equal length
// plus per-id count match is sufficient for equality.
export function isDirty(deck: Deck): boolean {
  if (deck.originalCards.length !== deck.workingCards.length) return true;
  const orig = indexByOracleId(deck.originalCards);
  for (const w of deck.workingCards) {
    const o = orig.get(w.oracleId);
    if (!o || o.count !== w.count) return true;
  }
  return false;
}

export function added(deck: Deck): DeckCard[] {
  const orig = indexByOracleId(deck.originalCards);
  return deck.workingCards.filter((w) => !orig.has(w.oracleId));
}

export function removed(deck: Deck): DeckCard[] {
  const work = indexByOracleId(deck.workingCards);
  const out: DeckCard[] = [];
  for (const o of deck.originalCards) {
    const w = work.get(o.oracleId);
    if (!w || w.count === 0) out.push(o);
  }
  return out;
}
