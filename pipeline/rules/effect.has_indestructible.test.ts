import { describe, it, expect } from 'vitest';
import { rule } from './effect.has_indestructible';
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

describe('effect.has_indestructible', () => {
  it.each([
    [['Indestructible'], 'Indestructible'],
    [['Indestructible', 'Vigilance'], 'Indestructible, vigilance'],
    [['Flying', 'Indestructible'], 'Flying, indestructible'],
  ])('matches when keyword Indestructible is intrinsic: %j', (kw, text) => {
    expect(rule.matchCard!(card(kw, text), text.toLowerCase())).toBeTruthy();
  });

  it.each([
    [[]],
    [['Hexproof']],
    [['Haste']],
  ])('does not match when keywords lack Indestructible: %j', (kw) => {
    expect(rule.matchCard!(card(kw), '')).toBe(false);
  });

  it('does not fire when Indestructible appears only inside a grant clause', () => {
    const c = card(['Indestructible'], 'target creature gains indestructible until end of turn.');
    expect(rule.matchCard!(c, c.oracleText.toLowerCase())).toBe(false);
  });
});
