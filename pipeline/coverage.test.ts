import { describe, it, expect } from 'vitest';
import { isTaggable } from './coverage';
import type { Card } from '../shared/types';

function card(overrides: Partial<Card>): Card {
  return {
    oracleId: 'x', name: 'X', set: 'tst', printings: ['tst'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [], typeLine: '',
    types: [], subtypes: [], supertypes: [], oracleText: '', keywords: [],
    power: null, toughness: null, rarity: 'common', imageUrl: '', tags: [],
    ...overrides,
  };
}

describe('isTaggable', () => {
  it('returns false for true vanilla', () => {
    expect(isTaggable(card({ oracleText: '' }))).toBe(false);
  });

  it('returns false for a basic land', () => {
    expect(isTaggable(card({
      typeLine: 'Basic Land — Plains',
      types: ['Land'], supertypes: ['Basic'], subtypes: ['Plains'],
      oracleText: '({T}: Add {W}.)',
    }))).toBe(false);
  });

  it('returns false for a plain mana-tap land', () => {
    expect(isTaggable(card({
      typeLine: 'Land', types: ['Land'],
      oracleText: '{T}: Add {G}.',
    }))).toBe(false);
  });

  it('returns false for a multi-mana plain tap land', () => {
    expect(isTaggable(card({
      typeLine: 'Land', types: ['Land'],
      oracleText: '{T}: Add {G} or {U}.',
    }))).toBe(false);
  });

  it('returns true for a vanilla flying creature (Family 11 will tag it)', () => {
    expect(isTaggable(card({
      typeLine: 'Creature — Bird', types: ['Creature'],
      oracleText: 'Flying', keywords: ['Flying'],
    }))).toBe(true);
  });

  it('returns true for a land with a non-mana ability', () => {
    expect(isTaggable(card({
      typeLine: 'Land', types: ['Land'],
      oracleText: '{T}: Add {G}.\nWhen this land enters, scry 1.',
    }))).toBe(true);
  });
});
