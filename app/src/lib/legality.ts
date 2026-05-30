import type { Card } from '@shared/types';
import type { Deck } from './db';

export type LegalityWarning = {
  severity: 'warning' | 'error';
  message: string;
  oracleId?: string;
};

export function deckLegality(deck: Deck, cards: Map<string, Card>): LegalityWarning[] {
  const warnings: LegalityWarning[] = [];

  const totalCount = deck.workingCards.reduce((s, c) => s + c.count, 0);
  if (totalCount < 60) {
    warnings.push({
      severity: 'warning',
      message: `Standard requires at least 60 cards; this deck has only ${totalCount}.`,
    });
  }

  for (const entry of deck.workingCards) {
    const card = cards.get(entry.oracleId);
    if (!card) {
      warnings.push({
        severity: 'warning',
        message: `Card ${entry.oracleId} is not in the loaded set.`,
        oracleId: entry.oracleId,
      });
      continue;
    }
    const isBasicLand =
      card.types.includes('Land') && card.supertypes.includes('Basic');
    if (!isBasicLand && entry.count > 4) {
      warnings.push({
        severity: 'warning',
        message: `Deck contains ${entry.count} copies of ${card.name}; max 4 unless basic land.`,
        oracleId: card.oracleId,
      });
    }
  }

  return warnings;
}
