import { describe, it, expect } from 'vitest';
import { rule } from './effect.has_flash';
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

describe('effect.has_flash', () => {
  it.each([
    [['Flash'], 'Flash'],
    [['Flying', 'Flash'], 'Flying, flash'],
    [['Flash', 'Ward'], 'Flash\nWard {2}\nThis creature enters tapped unless it\'s your turn.'],
  ])('matches when keyword Flash is intrinsic: %j', (kw, text) => {
    expect(rule.matchCard!(card(kw, text), text.toLowerCase())).toBeTruthy();
  });

  it.each([
    [[]],
    [['Flying']],
    [['Haste']],
  ])('does not match when keywords lack Flash: %j', (kw) => {
    expect(rule.matchCard!(card(kw), '')).toBe(false);
  });

  it('does not fire when Flash appears only inside a grant clause', () => {
    // Keyword shows up in Scryfall's array because of the grant, but it's
    // not on a standalone keyword-block line.
    const c = card(['Flash'], 'creatures you control have flash.');
    expect(rule.matchCard!(c, c.oracleText.toLowerCase())).toBe(false);
  });
});
