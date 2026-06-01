import { describe, it, expect } from 'vitest';
import { rule } from './effect.has_changeling';
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

describe('effect.has_changeling', () => {
  it.each([
    [['Changeling']],
    [['Flying', 'Changeling']],
    [['Changeling', 'Trample']],
  ])('matches when keywords include Changeling: %j', (kw) => {
    expect(rule.matchCard!(card(kw), '')).toBeTruthy();
  });

  it.each([
    [[]],
    [['Flying']],
    [['Wither']],
  ])('does not match when keywords lack Changeling: %j', (kw) => {
    expect(rule.matchCard!(card(kw), '')).toBe(false);
  });

  it('does not fire from grant clauses alone', () => {
    const c = card([], 'target creature gains changeling until end of turn');
    expect(rule.matchCard!(c, c.oracleText)).toBe(false);
  });
});
