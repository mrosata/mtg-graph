import { describe, it, expect } from 'vitest';
import { deckColors } from './deckColors';
import type { Card } from '@shared/types';
import type { Deck } from './db';

function card(overrides: Partial<Card>): Card {
  return {
    oracleId: 'x', name: 'X', set: 't', printings: ['t'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [],
    typeLine: '', types: [], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null,
    rarity: 'common', imageUrl: '', tags: [],
    ...overrides,
  };
}

function deck(cardEntries: { oracleId: string; count: number }[]): Deck {
  return {
    id: 'd', name: 'D', format: 'standard',
    originalCards: cardEntries, workingCards: cardEntries,
    createdAt: 0, updatedAt: 0,
  };
}

describe('deckColors', () => {
  it('returns empty array for an empty deck', () => {
    expect(deckColors(deck([]), new Map())).toEqual([]);
  });

  it('returns single color for a mono-color deck', () => {
    const cards = new Map([['a', card({ oracleId: 'a', colorIdentity: ['R'] })]]);
    expect(deckColors(deck([{ oracleId: 'a', count: 4 }]), cards)).toEqual(['R']);
  });

  it('returns union of color identities across the deck', () => {
    const cards = new Map([
      ['a', card({ oracleId: 'a', colorIdentity: ['W', 'U'] })],
      ['b', card({ oracleId: 'b', colorIdentity: ['U', 'R'] })],
    ]);
    expect(
      deckColors(deck([{ oracleId: 'a', count: 4 }, { oracleId: 'b', count: 2 }]), cards),
    ).toEqual(['W', 'U', 'R']);
  });

  it('sorts colors in WUBRG order regardless of input order', () => {
    const cards = new Map([
      ['a', card({ oracleId: 'a', colorIdentity: ['G'] })],
      ['b', card({ oracleId: 'b', colorIdentity: ['B'] })],
      ['c', card({ oracleId: 'c', colorIdentity: ['W'] })],
    ]);
    expect(
      deckColors(
        deck([
          { oracleId: 'a', count: 1 },
          { oracleId: 'b', count: 1 },
          { oracleId: 'c', count: 1 },
        ]),
        cards,
      ),
    ).toEqual(['W', 'B', 'G']);
  });

  it('returns empty array for colorless-only decks', () => {
    const cards = new Map([['a', card({ oracleId: 'a', colorIdentity: [] })]]);
    expect(deckColors(deck([{ oracleId: 'a', count: 4 }]), cards)).toEqual([]);
  });

  it('skips deck entries whose card is missing from the catalog', () => {
    const cards = new Map([['a', card({ oracleId: 'a', colorIdentity: ['U'] })]]);
    const result = deckColors(
      deck([{ oracleId: 'a', count: 1 }, { oracleId: 'missing', count: 1 }]),
      cards,
    );
    expect(result).toEqual(['U']);
  });
});
