import { describe, it, expect } from 'vitest';
import { rule } from './effect.has_persist';
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

describe('effect.has_persist', () => {
  it.each([
    [['Persist']],
    [['Flying', 'Persist']],
    [['Persist', 'Wither']],
  ])('matches when keywords include Persist: %j', (kw) => {
    expect(rule.matchCard!(card(kw), '')).toBeTruthy();
  });

  it.each([
    [[]],
    [['Flying']],
    [['Undying']],
  ])('does not match when keywords lack Persist: %j', (kw) => {
    expect(rule.matchCard!(card(kw), '')).toBe(false);
  });

  it('does not fire from grant clauses alone', () => {
    const c = card([], 'target creature gains persist until end of turn');
    expect(rule.matchCard!(c, c.oracleText)).toBe(false);
  });
});
