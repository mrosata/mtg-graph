import { describe, it, expect } from 'vitest';
import { deckLegality, type LegalityWarning } from './legality';
import type { Card } from '@shared/types';
import type { Deck } from '../lib/db';

function card(id: string, types: string[], subtypes: string[] = []): Card {
  return {
    oracleId: id, name: id, set: 't', printings: ['t'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [],
    typeLine: '', types, subtypes, supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null,
    rarity: 'common', imageUrl: '', tags: [],
  };
}

function deck(cards: { oracleId: string; count: number }[]): Deck {
  return {
    id: 'd', name: 'd', format: 'standard',
    originalCards: cards, workingCards: cards, createdAt: 0, updatedAt: 0,
  };
}

const cards = new Map<string, Card>([
  ['lb', card('lb', ['Creature'])],
  ['cs', card('cs', ['Instant'])],
  ['plains', { ...card('plains', ['Land'], ['Plains']), supertypes: ['Basic'] }],
]);

describe('deckLegality', () => {
  it('warns when fewer than 60 cards', () => {
    const d = deck([{ oracleId: 'lb', count: 4 }]);
    const w = deckLegality(d, cards);
    expect(w.some((x) => x.severity === 'warning' && /60/.test(x.message))).toBe(true);
  });

  it('warns on more than 4 of a non-basic card', () => {
    const d = deck([{ oracleId: 'lb', count: 5 }]);
    const w = deckLegality(d, cards);
    expect(w.some((x) => /5 copies of lb/.test(x.message) && x.severity === 'warning')).toBe(true);
  });

  it('allows unlimited basic lands', () => {
    const d = deck([{ oracleId: 'plains', count: 24 }]);
    const w = deckLegality(d, cards);
    expect(w.filter((x) => x.oracleId === 'plains')).toEqual([]);
  });

  it('flags unknown cards (not in loaded set)', () => {
    const d = deck([{ oracleId: 'missing', count: 1 }]);
    const w = deckLegality(d, cards);
    expect(w.some((x) => x.oracleId === 'missing' && /not in the loaded set/.test(x.message))).toBe(true);
  });

  it('returns no warnings for a 60-card legal deck', () => {
    const d = deck([
      { oracleId: 'lb', count: 4 },
      { oracleId: 'cs', count: 4 },
      { oracleId: 'plains', count: 52 },
    ]);
    expect(deckLegality(d, cards)).toEqual([]);
  });
});
