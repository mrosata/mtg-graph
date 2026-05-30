import { describe, it, expect } from 'vitest';
import type { Card } from '../../shared/types';
import { rule } from './trigger.planeswalker_leaves_battlefield';

function makeCard(overrides: Partial<Card>): Card {
  return {
    oracleId: 'oid', name: '', set: '', printings: [], collectorNumber: '', manaCost: null, cmc: 0,
    colors: [], colorIdentity: [], typeLine: '', types: [], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null, rarity: 'common', imageUrl: '',
    tags: [], ...overrides,
  };
}

describe('trigger.planeswalker_leaves_battlefield', () => {
  it.each([
    ['whenever a planeswalker leaves the battlefield'],
    ['whenever another planeswalker you control leaves the battlefield'],
  ])('text-matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['whenever a creature leaves the battlefield'],
    ['whenever a permanent leaves the battlefield'],
  ])('text does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });

  it('matchCard: SELF trigger on a planeswalker card', () => {
    const card = makeCard({ types: ['Planeswalker'] });
    const normalizedText = 'when __self__ leaves the battlefield, draw a card';
    expect(rule.matchCard!(card, normalizedText)).toBeTruthy();
  });

  it('matchCard: SELF trigger on a creature card does NOT match', () => {
    const card = makeCard({ types: ['Creature'] });
    const normalizedText = 'when __self__ leaves the battlefield, draw a card';
    expect(rule.matchCard!(card, normalizedText)).toBe(false);
  });
});
