import { describe, it, expect } from 'vitest';
import { rule } from './effect.has_cycling';
import type { Card } from '../../shared/types';

function card(keywords: string[]): Card {
  return {
    oracleId: 'x', name: 'X', set: 's', printings: ['s'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [], typeLine: 'Creature',
    types: ['Creature'], subtypes: [], supertypes: [], oracleText: '',
    keywords, power: null, toughness: null, rarity: 'common', imageUrl: '',
    tags: [],
  };
}

describe('effect.has_cycling', () => {
  it.each([
    [['Cycling']],
    [['Cycling', 'Landcycling']],
    [['Cycling', 'Typecycling']],
    [['Cycling', 'Plainscycling']],
  ])('matches when Cycling is present (with or without variants): %j', (kw) => {
    expect(rule.matchCard!(card(kw), '')).toBeTruthy();
  });

  it.each([[[]], [['Plot']], [['Flying', 'Trample']]])('does not match without Cycling: %j', (kw) => {
    expect(rule.matchCard!(card(kw), '')).toBe(false);
  });
});
