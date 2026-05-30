import type { Card, Color } from '@shared/types';
import type { Deck } from './db';

export function buildShuffled(deck: Deck, rng: () => number): string[] {
  const flat: string[] = [];
  for (const entry of deck.workingCards) {
    for (let i = 0; i < entry.count; i++) flat.push(entry.oracleId);
  }
  for (let i = flat.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = flat[i];
    const b = flat[j];
    if (a !== undefined && b !== undefined) {
      flat[i] = b;
      flat[j] = a;
    }
  }
  return flat;
}

const WUBRG_ORDER: Record<Color, number> = { W: 0, U: 1, B: 2, R: 3, G: 4 };

function colorRank(card: Card): number {
  if (card.colorIdentity.length === 0) return 5;
  for (const c of ['W', 'U', 'B', 'R', 'G'] as const) {
    if (card.colorIdentity.includes(c)) return WUBRG_ORDER[c];
  }
  return 99;
}

// MTGA-style opening-hand sort: lands first, then by CMC ascending, then by
// color in WUBRG order. Used for the initial draw and on shuffle. Cards drawn
// via the Draw button after that should NOT be re-sorted — they append to the
// existing order.
export function sortOpeningHand(oracleIds: string[], cards: Map<string, Card>): string[] {
  return [...oracleIds].sort((a, b) => {
    const ca = cards.get(a);
    const cb = cards.get(b);
    if (!ca && !cb) return 0;
    if (!ca) return 1;
    if (!cb) return -1;
    const landA = ca.types.includes('Land') ? 0 : 1;
    const landB = cb.types.includes('Land') ? 0 : 1;
    if (landA !== landB) return landA - landB;
    if (ca.cmc !== cb.cmc) return ca.cmc - cb.cmc;
    return colorRank(ca) - colorRank(cb);
  });
}
