import { describe, it, expect } from 'vitest';
import { rule } from './effect.has_trample';
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

describe('effect.has_trample', () => {
  it.each([
    [['Trample']],
    [['Flying', 'Trample']],
    [['Trample', 'Vigilance']],
  ])('matches when keywords include Trample: %j', (kw) => {
    expect(rule.matchCard!(card(kw), '')).toBeTruthy();
  });

  it.each([
    [[]],
    [['Flying']],
    [['Lifelink', 'Deathtouch']],
  ])('does not match when keywords lack Trample: %j', (kw) => {
    expect(rule.matchCard!(card(kw), '')).toBe(false);
  });

  // Regression: Charging Hooligan — conditional self-grant ("this creature
  // gains trample until end of turn") is NOT intrinsic. effect.grants_trample
  // handles that case.
  it('does not fire from grant clauses alone (oracle text only, no Scryfall keyword)', () => {
    const c = card([], 'if a rat is attacking, this creature gains trample until end of turn');
    expect(rule.matchCard!(c, c.oracleText)).toBe(false);
  });

  it('does not fire from anthem grants', () => {
    const c = card([], 'other creatures you control have trample');
    expect(rule.matchCard!(c, c.oracleText)).toBe(false);
  });

  it('returns the matched keyword as evidence', () => {
    expect(rule.matchCard!(card(['Trample']), '')).toEqual({ evidence: 'Trample' });
  });
});
