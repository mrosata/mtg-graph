import { describe, it, expect } from 'vitest';
import type { Card } from '@shared/types';
import { isBasicLand, BASIC_LAND_NAMES } from './basics';

function card(name: string, typeLine: string): Card {
  return {
    oracleId: 'x', name, set: 'tst', printings: ['tst'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [],
    typeLine, types: [], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null,
    rarity: 'common', imageUrl: '', tags: [],
  };
}

describe('isBasicLand', () => {
  it('returns true for each of the five basics + Wastes', () => {
    for (const name of BASIC_LAND_NAMES) {
      expect(isBasicLand(card(name, 'Basic Land — ' + name))).toBe(true);
    }
  });

  it('returns true for snow basics (typeLine has "Basic Land")', () => {
    expect(isBasicLand(card('Snow-Covered Mountain', 'Basic Snow Land — Mountain'))).toBe(true);
  });

  it('returns false for a non-basic land', () => {
    expect(isBasicLand(card('Cavern of Souls', 'Land'))).toBe(false);
  });

  it('returns false for a creature named like a basic', () => {
    expect(isBasicLand(card('Mountain Giant', 'Creature — Giant'))).toBe(false);
  });
});
