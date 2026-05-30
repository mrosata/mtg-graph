import type { Card, Color } from '@shared/types';
import type { Deck } from './db';

const WUBRG: Color[] = ['W', 'U', 'B', 'R', 'G'];

export function deckColors(deck: Deck, cards: Map<string, Card>): Color[] {
  const present = new Set<Color>();
  for (const entry of deck.workingCards) {
    const card = cards.get(entry.oracleId);
    if (!card) continue;
    for (const c of card.colorIdentity) present.add(c);
  }
  return WUBRG.filter((c) => present.has(c));
}
