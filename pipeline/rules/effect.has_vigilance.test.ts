import { describe, it, expect } from 'vitest';
import { rule } from './effect.has_vigilance';
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

describe('effect.has_vigilance', () => {
  it.each([
    [['Vigilance']],
    [['Flying', 'Vigilance']],
    [['Vigilance', 'Trample']],
  ])('matches when keywords include Vigilance: %j', (kw) => {
    expect(rule.matchCard!(card(kw), '')).toBeTruthy();
  });

  it.each([
    [[]],
    [['Flying']],
    [['Lifelink', 'Deathtouch']],
  ])('does not match when keywords lack Vigilance: %j', (kw) => {
    expect(rule.matchCard!(card(kw), '')).toBe(false);
  });

  it('does not fire from grant clauses alone (oracle text only, no Scryfall keyword)', () => {
    const c = card([], 'target creature gains vigilance until end of turn');
    expect(rule.matchCard!(c, c.oracleText)).toBe(false);
  });

  it('returns the matched keyword as evidence', () => {
    expect(rule.matchCard!(card(['Vigilance']), '')).toEqual({ evidence: 'Vigilance' });
  });
});
