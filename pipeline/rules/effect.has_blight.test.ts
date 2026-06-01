import { describe, it, expect } from 'vitest';
import { rule } from './effect.has_blight';
import type { Card } from '../../shared/types';

function card(keywords: string[], oracleText = ''): Card {
  return {
    oracleId: 'x', name: 'X', set: 's', printings: ['s'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [], typeLine: 'Sorcery',
    types: ['Sorcery'], subtypes: [], supertypes: [], oracleText,
    keywords, power: null, toughness: null, rarity: 'common', imageUrl: '',
    tags: [],
  };
}

describe('effect.has_blight', () => {
  it.each([
    [['Blight']],
    [['Flying', 'Blight']],
    [['Blight', 'Trample']],
  ])('matches when keywords include Blight: %j', (kw) => {
    expect(rule.matchCard!(card(kw), '')).toBeTruthy();
  });

  it.each([
    [[]],
    [['Flying']],
    [['Persist']],
  ])('does not match when keywords lack Blight: %j', (kw) => {
    expect(rule.matchCard!(card(kw), '')).toBe(false);
  });

  it('does not fire from grant clauses alone', () => {
    const c = card([], 'target creature gains blight until end of turn');
    expect(rule.matchCard!(c, c.oracleText)).toBe(false);
  });
});
