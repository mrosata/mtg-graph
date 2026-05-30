import { describe, it, expect } from 'vitest';
import type { Card } from '../../shared/types';
import { rule } from './trigger.enchantment_leaves_battlefield';

function makeCard(overrides: Partial<Card>): Card {
  return {
    oracleId: 'oid', name: '', set: '', printings: [], collectorNumber: '', manaCost: null, cmc: 0,
    colors: [], colorIdentity: [], typeLine: '', types: [], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null, rarity: 'common', imageUrl: '',
    tags: [], ...overrides,
  };
}

describe('trigger.enchantment_leaves_battlefield', () => {
  it.each([
    ['whenever an enchantment leaves the battlefield'],
    ['whenever another enchantment you control leaves the battlefield'],
    ['when an aura enchantment leaves the battlefield'],
    // Graveyard-equivalent wording (regression: Bitter Chill).
    ['whenever an enchantment is put into a graveyard from the battlefield'],
    ['when an aura is put into a graveyard from the battlefield'],
  ])('text-matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['whenever a creature leaves the battlefield'],
    ['whenever an artifact leaves the battlefield'],
    ['whenever a permanent leaves the battlefield'],
    ['whenever a creature is put into a graveyard from the battlefield'],
  ])('text does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });

  it('matchCard: SELF trigger on an enchantment card', () => {
    const card = makeCard({ types: ['Enchantment'] });
    const normalizedText = 'when __self__ leaves the battlefield, draw a card';
    expect(rule.matchCard!(card, normalizedText)).toBeTruthy();
  });

  it('matchCard: SELF trigger on a non-enchantment card does NOT match', () => {
    const card = makeCard({ types: ['Artifact'] });
    const normalizedText = 'when __self__ leaves the battlefield, draw a card';
    expect(rule.matchCard!(card, normalizedText)).toBe(false);
  });

  it('matchCard: SELF trigger on an enchantment-creature DOES match', () => {
    const card = makeCard({ types: ['Enchantment', 'Creature'] });
    const normalizedText = 'when __self__ leaves the battlefield, draw a card';
    expect(rule.matchCard!(card, normalizedText)).toBeTruthy();
  });

  // Regression: Bitter Chill — self trigger using "is put into a graveyard from the battlefield".
  it('matchCard: SELF graveyard wording on an enchantment (this aura) DOES match', () => {
    const card = makeCard({ types: ['Enchantment'], subtypes: ['aura'] });
    const normalizedText = 'when this aura is put into a graveyard from the battlefield, you may pay {1}';
    expect(rule.matchCard!(card, normalizedText)).toBeTruthy();
  });

  it('matchCard: SELF graveyard wording on a self-named card DOES match', () => {
    const card = makeCard({ types: ['Enchantment'] });
    const normalizedText = 'when __self__ is put into a graveyard from the battlefield, draw a card';
    expect(rule.matchCard!(card, normalizedText)).toBeTruthy();
  });
});
