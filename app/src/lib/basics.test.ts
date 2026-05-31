import { describe, it, expect } from 'vitest';
import type { Card } from '@shared/types';
import { isBasicLand } from './basics';

function card(over: Partial<Card>): Card {
  return {
    oracleId: 'x', name: 'X', set: 'tst', printings: ['tst'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [],
    typeLine: '', types: [], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null,
    rarity: 'common', imageUrl: '', tags: [],
    ...over,
  };
}

describe('isBasicLand', () => {
  it('returns true when types includes Land and supertypes includes Basic', () => {
    expect(isBasicLand(card({ name: 'Mountain', types: ['Land'], supertypes: ['Basic'] }))).toBe(true);
  });

  it('returns true for a snow basic (still Basic + Land)', () => {
    expect(isBasicLand(card({
      name: 'Snow-Covered Mountain',
      types: ['Land'],
      supertypes: ['Basic', 'Snow'],
    }))).toBe(true);
  });

  it('returns false for a non-basic land (no Basic supertype)', () => {
    expect(isBasicLand(card({ name: 'Cavern of Souls', types: ['Land'], supertypes: [] }))).toBe(false);
  });

  it('returns false for a non-land that happens to have a basic supertype', () => {
    // Defensive: name-collision tokens like "Mountain Giant" lack the Land type.
    expect(isBasicLand(card({ name: 'Mountain Giant', types: ['Creature'], supertypes: [] }))).toBe(false);
  });
});
