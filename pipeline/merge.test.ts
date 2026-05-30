import { describe, it, expect } from 'vitest';
import { mergeCardsAcrossSets } from './merge';
import type { Card } from '../shared/types';

function card(oracleId: string, set: string): Card {
  return {
    oracleId, name: oracleId, set, printings: [set], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [],
    typeLine: '', types: [], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null,
    rarity: 'common', imageUrl: '', tags: [],
  };
}

describe('mergeCardsAcrossSets', () => {
  it('keeps a single card unchanged', () => {
    const out = mergeCardsAcrossSets([card('a', 'blb')]);
    expect(out).toHaveLength(1);
    expect(out[0]!.printings).toEqual(['blb']);
  });

  it('merges duplicate oracleId entries, accumulating printings', () => {
    const out = mergeCardsAcrossSets([card('a', 'blb'), card('a', 'fdn')]);
    expect(out).toHaveLength(1);
    expect(out[0]!.printings).toEqual(['blb', 'fdn']);
  });

  it('preserves first-seen primary set + image data', () => {
    const out = mergeCardsAcrossSets([card('a', 'blb'), card('a', 'fdn')]);
    expect(out[0]!.set).toBe('blb');
  });

  it('deduplicates printings within the merged list', () => {
    const out = mergeCardsAcrossSets([card('a', 'blb'), card('a', 'blb')]);
    expect(out[0]!.printings).toEqual(['blb']);
  });

  it('does not mutate input cards', () => {
    const a1 = card('a', 'blb');
    const a2 = card('a', 'fdn');
    mergeCardsAcrossSets([a1, a2]);
    expect(a1.printings).toEqual(['blb']);
    expect(a2.printings).toEqual(['fdn']);
  });
});
