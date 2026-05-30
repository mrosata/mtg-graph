import { describe, it, expect } from 'vitest';
import { rule } from './effect.has_plot';
import type { Card } from '../../shared/types';

function card(keywords: string[]): Card {
  return {
    oracleId: 'x', name: 'X', set: 's', printings: ['s'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [], typeLine: 'Creature',
    types: ['Creature'], subtypes: [], supertypes: [], oracleText: '',
    keywords, power: null, toughness: null, rarity: 'common', imageUrl: '',
    tags: [],
  };
}

describe('effect.has_plot', () => {
  it.each([
    [['Plot']],
    [['Plot', 'Flying']],
    [['Flying', 'Plot', 'Haste']],
  ])('matches when keywords include Plot: %j', (kw) => {
    expect(rule.matchCard!(card(kw), '')).toBeTruthy();
  });

  it.each([
    [[]],
    [['Flying']],
    [['Kicker']],
    [['Foretell']],
  ])('does not match without Plot: %j', (kw) => {
    expect(rule.matchCard!(card(kw), '')).toBe(false);
  });
});
