import { describe, it, expect } from 'vitest';
import { deckThemes } from './deckThemes';
import type { Card, TagDef } from '@shared/types';
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

function tagDef(tagId: string, category: 'theme' | 'interaction' = 'interaction'): TagDef {
  return {
    tagId,
    axis: 'effect',
    label: tagId,
    description: '',
    pairsWith: [],
    category,
  };
}

function deck(entries: { oracleId: string; count: number }[]): Deck {
  return { id: 'd', name: 'D', format: 'standard', originalCards: entries, workingCards: entries, createdAt: 0, updatedAt: 0 };
}

describe('deckThemes', () => {
  const catalog = new Map<string, TagDef>([
    ['theme.tokens', tagDef('theme.tokens', 'theme')],
    ['theme.lifegain', tagDef('theme.lifegain', 'theme')],
    ['effect.deals_damage', tagDef('effect.deals_damage', 'interaction')],
  ]);

  it('returns empty array for an empty deck', () => {
    expect(deckThemes(deck([]), new Map(), catalog)).toEqual([]);
  });

  it('returns theme tag ids present on cards in the deck', () => {
    const cards = new Map([
      ['a', card({
        oracleId: 'a',
        tags: [
          { tagId: 'theme.tokens', axis: 'effect', evidence: '' },
          { tagId: 'effect.deals_damage', axis: 'effect', evidence: '' },
        ],
      })],
    ]);
    expect(deckThemes(deck([{ oracleId: 'a', count: 1 }]), cards, catalog)).toEqual(['theme.tokens']);
  });

  it('does not include non-theme (interaction) tags', () => {
    const cards = new Map([
      ['a', card({
        oracleId: 'a',
        tags: [{ tagId: 'effect.deals_damage', axis: 'effect', evidence: '' }],
      })],
    ]);
    expect(deckThemes(deck([{ oracleId: 'a', count: 1 }]), cards, catalog)).toEqual([]);
  });

  it('sorts by frequency descending', () => {
    const cards = new Map([
      ['a', card({ oracleId: 'a', tags: [{ tagId: 'theme.tokens', axis: 'effect', evidence: '' }] })],
      ['b', card({ oracleId: 'b', tags: [{ tagId: 'theme.lifegain', axis: 'effect', evidence: '' }] })],
      ['c', card({ oracleId: 'c', tags: [{ tagId: 'theme.lifegain', axis: 'effect', evidence: '' }] })],
    ]);
    const result = deckThemes(
      deck([
        { oracleId: 'a', count: 1 },
        { oracleId: 'b', count: 1 },
        { oracleId: 'c', count: 1 },
      ]),
      cards,
      catalog,
    );
    expect(result).toEqual(['theme.lifegain', 'theme.tokens']);
  });

  it('counts each card once regardless of deck count multiplier', () => {
    const cards = new Map([
      ['a', card({ oracleId: 'a', tags: [{ tagId: 'theme.tokens', axis: 'effect', evidence: '' }] })],
      ['b', card({ oracleId: 'b', tags: [{ tagId: 'theme.lifegain', axis: 'effect', evidence: '' }] })],
    ]);
    // 'a' has count 4 but should only be counted once for frequency purposes.
    const result = deckThemes(
      deck([{ oracleId: 'a', count: 4 }, { oracleId: 'b', count: 1 }]),
      cards,
      catalog,
    );
    expect(result).toEqual(['theme.tokens', 'theme.lifegain']);
  });

  it('skips deck entries whose card is missing from the catalog', () => {
    const cards = new Map([
      ['a', card({ oracleId: 'a', tags: [{ tagId: 'theme.tokens', axis: 'effect', evidence: '' }] })],
    ]);
    const result = deckThemes(
      deck([{ oracleId: 'a', count: 1 }, { oracleId: 'missing', count: 1 }]),
      cards,
      catalog,
    );
    expect(result).toEqual(['theme.tokens']);
  });
});
