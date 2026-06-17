import { describe, it, expect } from 'vitest';
import type { Card } from '@shared/types';
import { buildCardNameLookup, lookupByName } from './cardNameIndex';

function card(
  oracleId: string,
  name: string,
  extra: Partial<Pick<Card, 'printedName' | 'flavorName'>> = {},
): Card {
  return {
    oracleId, name, set: 'tst', printings: ['tst'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [],
    typeLine: '', types: [], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null,
    rarity: 'common', imageUrl: '', tags: [],
    ...extra,
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

  it('resolves by printedName when name does not match (UB crossover Magic-flavor name)', () => {
    const cards = new Map<string, Card>([
      ['spidey', card('spidey', 'Superior Spider-Man', { printedName: 'Kavaero, Mind-Bitten' })],
    ]);
    const lk = buildCardNameLookup(cards);
    expect(lookupByName(lk, 'kavaero, mind-bitten')).toEqual(
      { oracleId: 'spidey', canonicalName: 'Superior Spider-Man' },
    );
  });

  it('resolves by flavorName when name does not match (older UB Godzilla-series style)', () => {
    const cards = new Map<string, Card>([
      ['sphinx', card('sphinx', 'Babylon Sphinx', { flavorName: 'Sphinx of Babylon' })],
    ]);
    const lk = buildCardNameLookup(cards);
    expect(lookupByName(lk, 'Sphinx of Babylon')?.oracleId).toBe('sphinx');
  });

  it('real name wins over a colliding printedName on another card', () => {
    // Two cards: A is canonically "Decoy Card"; B has printedName "Decoy Card"
    // but its real name is "Other Card". The real-name match must win.
    const cards = new Map<string, Card>([
      ['decoy-real', card('decoy-real', 'Decoy Card')],
      ['decoy-flavor', card('decoy-flavor', 'Other Card', { printedName: 'Decoy Card' })],
    ]);
    const lk = buildCardNameLookup(cards);
    expect(lookupByName(lk, 'Decoy Card')?.oracleId).toBe('decoy-real');
  });

  function dfcCard(): Card {
    return {
      oracleId: 'peter', name: 'Peter Parker // Amazing Spider-Man',
      set: 'spm', printings: ['spm'], collectorNumber: '10',
      manaCost: '{1}{W}', cmc: 2, colors: ['W'], colorIdentity: ['G','U','W'],
      typeLine: 'Legendary Creature', types: ['Creature'],
      subtypes: ['Human'], supertypes: ['Legendary'],
      oracleText: '', keywords: [], power: '0', toughness: '1',
      rarity: 'mythic', imageUrl: '',
      layout: 'modal_dfc',
      faces: [
        { name: 'Peter Parker', typeLine: '', types: [], subtypes: [], supertypes: [], oracleText: '', manaCost: '{1}{W}', colors: ['W'], power: '0', toughness: '1' },
        { name: 'Amazing Spider-Man', typeLine: '', types: [], subtypes: [], supertypes: [], oracleText: '', manaCost: '{1}{G}{W}{U}', colors: ['G','U','W'], power: '4', toughness: '4' },
      ],
      tags: [],
    };
  }

  it('resolves back face name to the same oracleId as the combined and front name', () => {
    const lookup = buildCardNameLookup(new Map([['peter', dfcCard()]]));
    const front = lookupByName(lookup, 'Peter Parker');
    const back = lookupByName(lookup, 'Amazing Spider-Man');
    const combined = lookupByName(lookup, 'Peter Parker // Amazing Spider-Man');
    expect(front?.oracleId).toBe('peter');
    expect(back?.oracleId).toBe('peter');
    expect(combined?.oracleId).toBe('peter');
  });
});
