import { describe, it, expect } from 'vitest';
import { rule } from './effect.has_station';
import type { Card } from '../../shared/types';

function card(keywords: string[], oracleText = ''): Card {
  return {
    oracleId: 'x', name: 'X', set: 's', printings: ['s'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [], typeLine: 'Artifact',
    types: ['Artifact'], subtypes: [], supertypes: [], oracleText,
    keywords, power: null, toughness: null, rarity: 'common', imageUrl: '',
    tags: [],
  };
}

describe('effect.has_station', () => {
  it.each([
    [['Station']],
    [['Flying', 'Station']],
    [['Station', 'Vigilance']],
  ])('matches when keywords include Station: %j', (kw) => {
    expect(rule.matchCard!(card(kw), '')).toBeTruthy();
  });

  it.each([
    [[]],
    [['Flying']],
    [['Mobilize']],
  ])('does not match when keywords lack Station: %j', (kw) => {
    expect(rule.matchCard!(card(kw), '')).toBe(false);
  });

  it('does not fire from grant clauses alone', () => {
    const c = card([], 'target artifact gains station until end of turn');
    expect(rule.matchCard!(c, c.oracleText)).toBe(false);
  });
});
