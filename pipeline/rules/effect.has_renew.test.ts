import { describe, it, expect } from 'vitest';
import { rule } from './effect.has_renew';
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

describe('effect.has_renew', () => {
  it.each([[['Renew']], [['Renew', 'Flying']]])('matches: %j', (kw) => {
    expect(rule.matchCard!(card(kw), '')).toBeTruthy();
  });

  it.each([[[]], [['Flashback']], [['Mayhem']]])('does not match: %j', (kw) => {
    expect(rule.matchCard!(card(kw), '')).toBe(false);
  });
});
