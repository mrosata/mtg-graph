import { describe, it, expect } from 'vitest';
import { rule } from './effect.has_flying';
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

describe('effect.has_flying', () => {
  it.each([
    [['Flying'], 'Flying'],
    [['Flying', 'Vigilance'], 'Flying, vigilance'],
    [['Flying', 'Ward'], 'Flying\nWard {2}'],
  ])('matches when keyword Flying is intrinsic: %j', (kw, text) => {
    expect(rule.matchCard!(card(kw, text), text.toLowerCase())).toBeTruthy();
  });

  it.each([
    [[]],
    [['Menace']],
    [['Haste']],
  ])('does not match when keywords lack Flying: %j', (kw) => {
    expect(rule.matchCard!(card(kw), '')).toBe(false);
  });

  it('does not fire when Flying appears only inside a grant clause', () => {
    // Keyword shows up in Scryfall's array because of the grant, but it's
    // not on a standalone keyword-block line.
    const c = card(['Flying'], 'creatures you control have flying.');
    expect(rule.matchCard!(c, c.oracleText.toLowerCase())).toBe(false);
  });
});
