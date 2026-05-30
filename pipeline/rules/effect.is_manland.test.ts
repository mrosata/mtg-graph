import { describe, it, expect } from 'vitest';
import { rule } from './effect.is_manland';
import type { Card } from '../../shared/types';

function card(types: string[], oracle: string): Card {
  return {
    oracleId: 'x', name: 'X', set: 's', printings: ['s'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [], typeLine: types.join(' '),
    types, subtypes: [], supertypes: [], oracleText: oracle,
    keywords: [], power: null, toughness: null, rarity: 'common', imageUrl: '',
    tags: [],
  };
}

describe('effect.is_manland', () => {
  it.each([
    ['{1}{r}{w}: this land becomes a 2/2 red and white ox creature until end of turn'],
    ['{u}{r}: until end of turn, this land becomes a 2/1 blue and red elemental creature'],
    ['{3}{g}{u}: until end of turn, this land becomes a 5/5 green and blue plant creature with trample'],
    ['{2}: this land becomes a 3/3 elemental creature until end of turn'],
  ])('matches lands that become creatures: %s', (text) => {
    expect(rule.matchCard!(card(['Land'], text), text)).toBeTruthy();
  });

  it.each([
    // plain mana ability
    [['Land'], '{t}: add {g}.'],
    // utility ability that doesn't animate
    [['Land'], '{3}{r}, {t}: exile the top card of your library.'],
    // a creature spell that creates a land or makes a creature — not a manland
    [['Creature'], 'this creature becomes a 4/4'],
    // text mentioning creature but not the land becoming one
    [['Land'], 'whenever you cast a creature spell, draw a card.'],
  ])('does not match: %j / %s', (types, text) => {
    expect(rule.matchCard!(card(types, text), text)).toBe(false);
  });
});
