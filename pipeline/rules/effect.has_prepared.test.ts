// pipeline/rules/effect.has_prepared.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.has_prepared';
import type { Card } from '../../shared/types';

function card(keywords: string[], typeLine = 'Creature — Wizard // Sorcery'): Card {
  return {
    oracleId: 'x', name: 'X', set: 's', printings: ['s'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [], typeLine,
    types: ['Creature'], subtypes: [], supertypes: [], oracleText: '',
    keywords, power: null, toughness: null, rarity: 'common', imageUrl: '',
    tags: [],
  };
}

describe('effect.has_prepared', () => {
  it.each([
    [['Prepared']],
    [['Flying', 'Prepared']],
    [['First strike', 'Prepared']],
  ])('matches cards with Prepared in keywords: %j', (keywords) => {
    expect(rule.matchCard!(card(keywords), '')).toBeTruthy();
  });

  it.each([
    [['Flying']],
    [['Adventure']],
    [['Plot']],
    [[]],
  ])('does not match cards without Prepared keyword: %j', (keywords) => {
    expect(rule.matchCard!(card(keywords), '')).toBe(false);
  });

  it('returns Prepared as evidence', () => {
    const result = rule.matchCard!(card(['Prepared']), '');
    expect(result).toMatchObject({ evidence: 'Prepared' });
  });
});
