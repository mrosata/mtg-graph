import { describe, it, expect } from 'vitest';
import { rule } from './effect.has_prowess';
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

describe('effect.has_prowess', () => {
  it.each([
    [['Prowess']],
    [['Flying', 'Prowess']],
  ])('matches when keywords include Prowess: %j', (kw) => {
    expect(rule.matchCard!(card(kw), '')).toBeTruthy();
  });

  it.each([
    [[]],
    [['Vigilance']],
    [['Flying']],
  ])('does not match when keywords lack Prowess: %j', (kw) => {
    expect(rule.matchCard!(card(kw), '')).toBe(false);
  });

  it('does not fire on prowess-like trigger text alone', () => {
    const c = card([], 'whenever you cast a noncreature spell, this creature gets +1/+1 until end of turn');
    expect(rule.matchCard!(c, c.oracleText)).toBe(false);
  });
});
