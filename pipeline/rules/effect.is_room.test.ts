import { describe, it, expect } from 'vitest';
import { rule } from './effect.is_room';
import type { Card } from '../../shared/types';

function card(typeLine: string): Card {
  return {
    oracleId: 'x', name: 'X', set: 's', printings: ['s'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [], typeLine,
    types: [], subtypes: [], supertypes: [], oracleText: '',
    keywords: [], power: null, toughness: null, rarity: 'common', imageUrl: '',
    tags: [],
  };
}

describe('effect.is_room', () => {
  it.each([
    ['Enchantment — Room // Enchantment — Room'],
    ['Enchantment — Room'],
  ])('matches Room enchantments: %s', (tl) => {
    expect(rule.matchCard!(card(tl), '')).toBeTruthy();
  });

  it.each([
    ['Enchantment — Saga'],
    ['Enchantment — Aura'],
    ['Creature — Human Warrior'],
    ['Land — Island'],
  ])('does not match non-Room enchantments / non-enchantments: %s', (tl) => {
    expect(rule.matchCard!(card(tl), '')).toBe(false);
  });
});
