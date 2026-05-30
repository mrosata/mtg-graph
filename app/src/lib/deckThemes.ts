import type { Card, TagDef } from '@shared/types';
import type { Deck } from './db';

export function deckThemes(
  deck: Deck,
  cards: Map<string, Card>,
  catalog: Map<string, TagDef>,
): string[] {
  const counts = new Map<string, number>();
  for (const entry of deck.workingCards) {
    const card = cards.get(entry.oracleId);
    if (!card) continue;
    const seen = new Set<string>();
    for (const tag of card.tags) {
      if (seen.has(tag.tagId)) continue;
      const def = catalog.get(tag.tagId);
      if (!def || def.category !== 'theme') continue;
      seen.add(tag.tagId);
      counts.set(tag.tagId, (counts.get(tag.tagId) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]))
    .map(([id]) => id);
}
