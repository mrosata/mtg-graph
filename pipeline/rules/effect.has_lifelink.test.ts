import { describe, it, expect } from 'vitest';
import { rule } from './effect.has_lifelink';
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

describe('effect.has_lifelink', () => {
  it.each([
    [['Lifelink']],
    [['Flying', 'Lifelink']],
    [['Lifelink', 'Trample']],
  ])('matches when keywords include Lifelink: %j', (kw) => {
    expect(rule.matchCard!(card(kw), '')).toBeTruthy();
  });

  it.each([
    [[]],
    [['Flying']],
    [['Deathtouch']],
  ])('does not match when keywords lack Lifelink: %j', (kw) => {
    expect(rule.matchCard!(card(kw), '')).toBe(false);
  });

  it('does not fire from anthem grants alone', () => {
    const c = card([], 'other creatures you control have lifelink');
    expect(rule.matchCard!(c, c.oracleText)).toBe(false);
  });

  it('does not fire from temporary grants alone', () => {
    const c = card([], 'target creature gains lifelink until end of turn');
    expect(rule.matchCard!(c, c.oracleText)).toBe(false);
  });
});
