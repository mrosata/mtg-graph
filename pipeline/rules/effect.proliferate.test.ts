import { describe, it, expect } from 'vitest';
import { rule } from './effect.proliferate';
import type { Card } from '../../shared/types';

function card(keywords: string[], oracleText: string): Card {
  return {
    oracleId: 'x', name: 'X', set: 's', printings: ['s'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [], typeLine: 'Instant',
    types: ['Instant'], subtypes: [], supertypes: [], oracleText,
    keywords, power: null, toughness: null, rarity: 'common', imageUrl: '',
    tags: [],
  };
}

describe('effect.proliferate', () => {
  it.each([
    ['proliferate.'],
    ['when __self__ enters, proliferate.'],
    ['whenever you cast a spell, proliferate.'],
    ['proliferate twice.'],
    ['you may proliferate.'],
    // v0.50 (S12) — functional comp-rules proliferate without the keyword
    // (Powerful Broker): "for each kind of counter on target permanent or
    // player, give that permanent or player another counter of that kind."
    ['for each kind of counter on target permanent or player, give that permanent or player another counter of that kind.'],
  ])('matches text: %s', (text) => {
    expect(rule.matchCard!(card([], text), text)).toBeTruthy();
  });

  it.each([
    ['Proliferate'],
  ])('matches keyword: %s', (kw) => {
    const oracleText = 'proliferate.';
    expect(rule.matchCard!(card([kw], oracleText), oracleText)).toBeTruthy();
  });

  it.each([
    ['create a 1/1 soldier creature token.'],
    ['put a +1/+1 counter on target creature.'],
    ['draw a card.'],
  ])('does not match: %s', (text) => {
    expect(rule.matchCard!(card([], text), text)).toBe(false);
  });
});
