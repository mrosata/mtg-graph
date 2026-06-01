import { describe, it, expect } from 'vitest';
import { rule } from './effect.has_convoke';
import type { Card } from '../../shared/types';

function card(keywords: string[], oracleText = ''): Card {
  return {
    oracleId: 'x', name: 'X', set: 's', printings: ['s'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [], typeLine: 'Creature',
    types: ['Creature'], subtypes: [], supertypes: [], oracleText,
    keywords, power: null, toughness: null, rarity: 'common', imageUrl: '',
    tags: [],
  };
}

describe('effect.has_convoke', () => {
  it.each([
    [['Convoke']],
    [['Flying', 'Convoke']],
    [['Convoke', 'Trample']],
  ])('matches when keywords include Convoke: %j', (kw) => {
    expect(rule.matchCard!(card(kw), '')).toBeTruthy();
  });

  it.each([
    [[]],
    [['Flying']],
    [['Persist']],
  ])('does not match when keywords lack Convoke: %j', (kw) => {
    expect(rule.matchCard!(card(kw), '')).toBe(false);
  });

  it('does not fire from grant clauses alone', () => {
    const c = card([], 'target spell gains convoke until end of turn');
    expect(rule.matchCard!(c, c.oracleText)).toBe(false);
  });
});
