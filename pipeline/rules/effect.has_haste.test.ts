import { describe, it, expect } from 'vitest';
import { rule } from './effect.has_haste';
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

describe('effect.has_haste', () => {
  it.each([
    [['Haste']],
    [['Flying', 'Haste']],
    [['Haste', 'Trample']],
  ])('matches when keywords include Haste: %j', (kw) => {
    expect(rule.matchCard!(card(kw), '')).toBeTruthy();
  });

  it.each([
    [[]],
    [['Flying']],
    [['Lifelink']],
  ])('does not match when keywords lack Haste: %j', (kw) => {
    expect(rule.matchCard!(card(kw), '')).toBe(false);
  });

  it('does not fire from grant clauses alone (Become Brutes-style)', () => {
    const c = card([], 'one or two target creatures each gain haste until end of turn');
    expect(rule.matchCard!(c, c.oracleText)).toBe(false);
  });
});
