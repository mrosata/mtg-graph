import { describe, it, expect } from 'vitest';
import { typeCounts, manaCurveBuckets, colorPipDistribution } from './deckStats';
import type { Card } from '@shared/types';
import type { Deck } from './db';

function card(id: string, types: string[], opts: Partial<Card> = {}): Card {
  return {
    oracleId: id, name: id, set: 't', printings: ['t'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [],
    typeLine: '', types, subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null,
    rarity: 'common', imageUrl: '', tags: [],
    ...opts,
  };
}

function deck(entries: { oracleId: string; count: number }[]): Deck {
  return {
    id: 'd', name: 'd', format: 'standard',
    originalCards: entries, workingCards: entries, createdAt: 0, updatedAt: 0,
  };
}

describe('typeCounts', () => {
  it('returns empty object for an empty deck', () => {
    expect(typeCounts(deck([]), new Map())).toEqual({});
  });

  it('counts by primary type, respecting TYPE_ORDER', () => {
    const cards = new Map<string, Card>([
      ['bear', card('bear', ['Creature'])],
      ['bolt', card('bolt', ['Instant'])],
      ['gear', card('gear', ['Artifact', 'Creature'])], // Creature wins
    ]);
    const d = deck([
      { oracleId: 'bear', count: 4 },
      { oracleId: 'bolt', count: 3 },
      { oracleId: 'gear', count: 2 },
    ]);
    expect(typeCounts(d, cards)).toEqual({ Creature: 6, Instant: 3 });
  });

  it('skips cards missing from the map', () => {
    const cards = new Map<string, Card>([
      ['bear', card('bear', ['Creature'])],
    ]);
    const d = deck([
      { oracleId: 'bear', count: 4 },
      { oracleId: 'ghost', count: 1 },
    ]);
    expect(typeCounts(d, cards)).toEqual({ Creature: 4 });
  });
});

describe('manaCurveBuckets', () => {
  it('returns an 8-length array of zeros for an empty deck', () => {
    expect(manaCurveBuckets(deck([]), new Map())).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('buckets non-land cards by cmc, collapsing 7+ into index 7', () => {
    const cards = new Map<string, Card>([
      ['c0', card('c0', ['Creature'], { cmc: 0 })],
      ['c3', card('c3', ['Sorcery'], { cmc: 3 })],
      ['c8', card('c8', ['Creature'], { cmc: 8 })],
      ['c9', card('c9', ['Creature'], { cmc: 9 })],
      ['land', card('land', ['Land'], { cmc: 0 })],
    ]);
    const d = deck([
      { oracleId: 'c0', count: 1 },
      { oracleId: 'c3', count: 2 },
      { oracleId: 'c8', count: 1 },
      { oracleId: 'c9', count: 1 },
      { oracleId: 'land', count: 24 },
    ]);
    expect(manaCurveBuckets(d, cards)).toEqual([1, 0, 0, 2, 0, 0, 0, 2]);
  });
});

describe('colorPipDistribution', () => {
  const zero = { W: 0, U: 0, B: 0, R: 0, G: 0 };

  it('returns all zeros for an empty deck', () => {
    expect(colorPipDistribution(deck([]), new Map())).toEqual(zero);
  });

  it('counts pure pips weighted by entry count', () => {
    const cards = new Map<string, Card>([
      ['bolt', card('bolt', ['Instant'], { manaCost: '{R}' })],
      ['rage', card('rage', ['Sorcery'], { manaCost: '{2}{R}{R}' })],
    ]);
    const d = deck([
      { oracleId: 'bolt', count: 4 },
      { oracleId: 'rage', count: 2 },
    ]);
    expect(colorPipDistribution(d, cards)).toEqual({ W: 0, U: 0, B: 0, R: 8, G: 0 });
  });

  it('hybrid pips contribute 0.5 to each side', () => {
    const cards = new Map<string, Card>([
      ['hybrid', card('hybrid', ['Creature'], { manaCost: '{W/U}' })],
    ]);
    const d = deck([{ oracleId: 'hybrid', count: 2 }]);
    expect(colorPipDistribution(d, cards)).toEqual({ W: 1, U: 1, B: 0, R: 0, G: 0 });
  });

  it('phyrexian pips count fully toward the color', () => {
    const cards = new Map<string, Card>([
      ['gitaxian', card('gitaxian', ['Sorcery'], { manaCost: '{U/P}' })],
    ]);
    const d = deck([{ oracleId: 'gitaxian', count: 4 }]);
    expect(colorPipDistribution(d, cards)).toEqual({ W: 0, U: 4, B: 0, R: 0, G: 0 });
  });

  it('ignores lands, colorless, and generic mana', () => {
    const cards = new Map<string, Card>([
      ['land', card('land', ['Land'], { manaCost: null })],
      ['gen', card('gen', ['Artifact'], { manaCost: '{3}{C}' })],
      ['mox', card('mox', ['Artifact'], { manaCost: null })],
    ]);
    const d = deck([
      { oracleId: 'land', count: 24 },
      { oracleId: 'gen', count: 4 },
      { oracleId: 'mox', count: 1 },
    ]);
    expect(colorPipDistribution(d, cards)).toEqual(zero);
  });

  it('2-brid pips contribute 0.5 to the colored side only', () => {
    const cards = new Map<string, Card>([
      ['flagstones', card('flagstones', ['Creature'], { manaCost: '{2/W}{2/W}' })],
    ]);
    const d = deck([{ oracleId: 'flagstones', count: 4 }]);
    expect(colorPipDistribution(d, cards)).toEqual({ W: 4, U: 0, B: 0, R: 0, G: 0 });
  });
});
