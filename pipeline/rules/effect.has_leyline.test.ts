// pipeline/rules/effect.has_leyline.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.has_leyline';

describe('effect.has_leyline', () => {
  it.each([
    // Leyline Axe — equipment with the opening-hand clause as its first line.
    ['if this card is in your opening hand, you may begin the game with it on the battlefield. equipped creature gets +1/+1 and has double strike and trample. equip {3}'],
    // Bare Leyline cycle text — same clause is the whole card-front concept.
    ['if this card is in your opening hand, you may begin the game with it on the battlefield. if a card would be put into an opponent\'s graveyard from anywhere, exile it instead.'],
    // Static-flash Leyline of Anticipation
    ['if this card is in your opening hand, you may begin the game with it on the battlefield. you may cast spells as though they had flash.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Self-reference to "this creature" is not the opening-hand clause.
    ['if this creature is in your hand, you may cast it for {2}.'],
    // Begin-the-game text but without the opening-hand gate.
    ['you begin the game with an emblem.'],
    // Generic.
    ['draw a card.'],
    ['put a +1/+1 counter on target creature.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
