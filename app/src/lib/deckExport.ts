import type { Card } from '@shared/types';
import type { Deck } from './db';

export function deckToArenaText(deck: Deck, cards: Map<string, Card>): string {
  const cardLines = deck.workingCards
    .map((entry) => {
      const card = cards.get(entry.oracleId);
      if (!card) return null;
      return `${entry.count} ${card.name}`;
    })
    .filter((line): line is string => line !== null);

  const body = cardLines.length > 0 ? `\n${cardLines.join('\n')}` : '';
  return `About\nName ${deck.name}\n\nDeck${body}`;
}
