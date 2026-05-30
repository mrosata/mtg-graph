import { describe, it, expect } from 'vitest';
import { rule } from './effect.has_menace';
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

describe('effect.has_menace', () => {
  it.each([
    [['Menace'], 'Menace'],
    [['Menace', 'Trample'], 'Menace, trample'],
    [['Flying', 'Menace'], 'Flying, menace'],
  ])('matches when keyword Menace is intrinsic: %j', (kw, text) => {
    expect(rule.matchCard!(card(kw, text), text.toLowerCase())).toBeTruthy();
  });

  it.each([
    [[]],
    [['Flying']],
    [['Haste']],
  ])('does not match when keywords lack Menace: %j', (kw) => {
    expect(rule.matchCard!(card(kw), '')).toBe(false);
  });

  it('does not fire when Menace appears only inside a grant clause', () => {
    const c = card(['Menace'], 'other creatures you control have menace.');
    expect(rule.matchCard!(c, c.oracleText.toLowerCase())).toBe(false);
  });
});
