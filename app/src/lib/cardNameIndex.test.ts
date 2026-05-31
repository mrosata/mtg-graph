import { describe, it, expect } from 'vitest';
import type { Card } from '@shared/types';
import { buildCardNameLookup, lookupByName } from './cardNameIndex';

function card(oracleId: string, name: string): Card {
  return {
    oracleId, name, set: 'tst', printings: ['tst'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [],
    typeLine: '', types: [], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null,
    rarity: 'common', imageUrl: '', tags: [],
  };
}

const FIXTURE = new Map<string, Card>([
  ['bolt-id', card('bolt-id', 'Lightning Bolt')],
  ['dfc-id',  card('dfc-id',  'Aquatic Alchemist // Bubble Up')],
]);

describe('buildCardNameLookup / lookupByName', () => {
  it('resolves an exact name case-insensitively', () => {
    const lk = buildCardNameLookup(FIXTURE);
    expect(lookupByName(lk, 'lightning bolt')).toEqual(
      { oracleId: 'bolt-id', canonicalName: 'Lightning Bolt' },
    );
  });

  it('resolves a DFC by front-face name', () => {
    const lk = buildCardNameLookup(FIXTURE);
    expect(lookupByName(lk, 'aquatic alchemist')).toEqual(
      { oracleId: 'dfc-id', canonicalName: 'Aquatic Alchemist // Bubble Up' },
    );
  });

  it('resolves a DFC by full "A // B" name', () => {
    const lk = buildCardNameLookup(FIXTURE);
    expect(lookupByName(lk, 'Aquatic Alchemist // Bubble Up')?.oracleId).toBe('dfc-id');
  });

  it('returns undefined for an unknown name', () => {
    const lk = buildCardNameLookup(FIXTURE);
    expect(lookupByName(lk, 'Tarmogoyf')).toBeUndefined();
  });
});
