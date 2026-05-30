import { describe, it, expect } from 'vitest';
import { rule } from './effect.has_first_strike';
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

describe('effect.has_first_strike', () => {
  it.each([
    [['First strike']],
    [['Flying', 'First strike']],
    [['First strike', 'Vigilance']],
  ])('matches when keywords include First strike: %j', (kw) => {
    const r = rule.matchCard!(card(kw), '');
    expect(r).toBeTruthy();
    if (typeof r === 'object' && r !== false) {
      expect(r.metadata).toBeUndefined();
    }
  });

  it('matches Double strike and sets metadata.doubleStrike', () => {
    const r = rule.matchCard!(card(['Double strike']), '');
    expect(r).toBeTruthy();
    expect(r).toMatchObject({ metadata: { doubleStrike: true } });
  });

  it('prefers Double strike evidence when both keywords present', () => {
    const r = rule.matchCard!(card(['First strike', 'Double strike']), '');
    expect(r).toMatchObject({ evidence: 'Double strike', metadata: { doubleStrike: true } });
  });

  it.each([
    [[]],
    [['Flying']],
    [['Trample']],
  ])('does not match when keywords lack First/Double strike: %j', (kw) => {
    expect(rule.matchCard!(card(kw), '')).toBe(false);
  });

  it('does not fire from grant clauses alone', () => {
    const c = card([], 'target creature gains first strike until end of turn');
    expect(rule.matchCard!(c, c.oracleText)).toBe(false);
  });
});
