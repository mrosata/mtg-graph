import { describe, it, expect } from 'vitest';
import { rule } from './effect.land_enters_tapped_conditional';
import type { Card } from '../../shared/types';

function card(types: string[], oracle: string): Card {
  return {
    oracleId: 'x', name: 'X', set: 's', printings: ['s'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [], typeLine: types.join(' '),
    types, subtypes: [], supertypes: [], oracleText: oracle,
    keywords: [], power: null, toughness: null, rarity: 'common', imageUrl: '',
    tags: [],
  };
}

describe('effect.land_enters_tapped_conditional', () => {
  it.each([
    // fastland
    ['this land enters tapped unless you control two or fewer other lands'],
    // painland-likes
    ['this land enters tapped unless a player has 13 or less life'],
    // shockland-style
    ['as this land enters, you may pay 2 life. if you don\'t, it enters tapped'],
    // checkland
    ['this land enters tapped unless you control a plains or a swamp'],
    // pact-of-the-mountain phrasings
    ['this land enters tapped unless you control a basic land'],
    // multi-sentence pay-life conditional (Multiversal Passage)
    ['as this land enters, choose a basic land type. then you may pay 2 life. if you don\'t, it enters tapped'],
  ])('matches lands with conditional ETB-tapped clauses: %s', (text) => {
    expect(rule.matchCard!(card(['Land'], text), text)).toBeTruthy();
  });

  it.each([
    // basic land (no conditional)
    [['Land'], '({t}: add {g}.)'],
    // unconditional ETB tapped
    [['Land'], 'this land enters tapped. {t}: add {b}.'],
    // creature with similar phrasing
    [['Creature'], 'this creature enters tapped unless you control another creature'],
    // card mentioning "tapped" elsewhere
    [['Land'], '{t}: tap target permanent.'],
  ])('does not match non-conditional / non-land: %j', (types, text) => {
    expect(rule.matchCard!(card(types, text), text)).toBe(false);
  });
});
