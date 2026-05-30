import { describe, it, expect } from 'vitest';
import { rule } from './condition.cast_from_graveyard';
import type { Card } from '../../shared/types';

function mk(keywords: string[]): Card {
  return {
    oracleId: 'x', name: 'X', set: 's', printings: ['s'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [], typeLine: 'Sorcery',
    types: ['Sorcery'], subtypes: [], supertypes: [], oracleText: '',
    keywords, power: null, toughness: null, rarity: 'common', imageUrl: '',
    tags: [],
  };
}

describe('condition.cast_from_graveyard', () => {
  it.each([
    [['Harmonize']],
    [['Flashback']],
    [['Disturb']],
    [['Embalm']],
    [['Eternalize']],
    [['Encore']],
    [['Escape']],
    [['Jump-start']],
    [['Unearth']],
    [['Flashback', 'Madness']],
  ])('matches: %j', (kw) => {
    expect(rule.matchCard!(mk(kw), '')).toBeTruthy();
  });

  it.each([
    [[]],
    [['Flying']],
    [['Plot']],
    [['Suspend']],
    [['Flying', 'Lifelink']],
  ])('does not match: %j', (kw) => {
    expect(rule.matchCard!(mk(kw), '')).toBe(false);
  });
});
