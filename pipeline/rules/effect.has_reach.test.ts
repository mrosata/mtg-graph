import { describe, it, expect } from 'vitest';
import { rule } from './effect.has_reach';
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

describe('effect.has_reach', () => {
  it.each([
    [['Reach']],
    [['Flying', 'Reach']],
    [['Reach', 'Trample']],
  ])('matches when keywords include Reach: %j', (kw) => {
    expect(rule.matchCard!(card(kw), '')).toBeTruthy();
  });

  it.each([
    [[]],
    [['Flying']],
    [['Lifelink']],
  ])('does not match when keywords lack Reach: %j', (kw) => {
    expect(rule.matchCard!(card(kw), '')).toBe(false);
  });

  it('does not fire from grant clauses alone', () => {
    const c = card([], 'target creature gains reach until end of turn');
    expect(rule.matchCard!(c, c.oracleText)).toBe(false);
  });

  it('does not fire on "breach" or other word-containing-reach false positives', () => {
    const c = card([], 'breach the wall');
    expect(rule.matchCard!(c, c.oracleText)).toBe(false);
  });
});
