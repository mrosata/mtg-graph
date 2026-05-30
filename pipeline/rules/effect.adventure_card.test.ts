// pipeline/rules/effect.adventure_card.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.adventure_card';
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

describe('effect.adventure_card', () => {
  it.each([
    ['Creature — Otter // Sorcery — Adventure'],
    ['Creature — Human Warrior // Instant — Adventure'],
    ['Legendary Creature — Faerie // Sorcery — Adventure'],
  ])('matches cards with an Adventure back face: %s', (typeLine) => {
    expect(rule.matchCard!(card(typeLine), '')).toBeTruthy();
  });

  it.each([
    ['Creature — Human'],
    ['Instant'],
    ['Sorcery'],
    ['Enchantment — Saga'],
    ['Creature — Otter // Sorcery'], // back face is sorcery but not an Adventure subtype
    ['Enchantment — Room // Enchantment — Room'],
  ])('does not match non-adventure cards: %s', (typeLine) => {
    expect(rule.matchCard!(card(typeLine), '')).toBe(false);
  });

  it('returns Adventure as evidence', () => {
    const result = rule.matchCard!(card('Creature — Otter // Sorcery — Adventure'), '');
    expect(result).toMatchObject({ evidence: 'Adventure' });
  });
});
