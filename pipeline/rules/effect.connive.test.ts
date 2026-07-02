import { describe, it, expect } from 'vitest';
import { rule } from './effect.connive';
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

describe('effect.connive', () => {
  it.each([
    // A.I.M. Scientists
    ['when this creature enters, it connives.'],
    // Baron Helmut Zemo
    ['whenever you cast a black spell from your hand, __self__ connives.'],
    // Leader, Super-Genius
    ['at the beginning of combat on your turn, target creature you control connives.'],
    // "would connive" replacement form (Leader) — bare verb, no trailing s
    ['if a creature you control would connive, instead you draw a card, then that creature connives.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // draw-then-discard WITHOUT the keyword must not fire connive
    ['draw a card, then discard a card.'],
    ['whenever this creature attacks, put a +1/+1 counter on it.'],
    ['flying\ndestroy target creature.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });

  it('matches on the Connive keyword via matchCard', () => {
    expect(rule.matchCard!(card(['Connive']), '')).toBeTruthy();
  });

  it('does not match unrelated keywords via matchCard', () => {
    expect(rule.matchCard!(card(['Flying', 'Trample']), '')).toBe(false);
  });
});
