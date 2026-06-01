import { describe, it, expect } from 'vitest';
import { rule } from './condition.gift_promised';

describe('condition.gift_promised', () => {
  it.each([
    // Crumb and Get It style — bonus payoff gated on gift having been promised.
    ['if the gift was promised, draw two cards'],
    ['if the gift was promised, create a 1/1 white rabbit creature token instead'],
    // Variant without leading "the".
    ['if a gift was promised, gain 3 life'],
    // Active-voice variant.
    ['if you promised a gift, return it to its owner\'s hand'],
    ['if you promised the gift, this creature gets +2/+2 until end of turn'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Gift trigger (different axis).
    ['whenever you give a gift, draw a card'],
    // Has-gift producer.
    ['gift a treasure'],
    // Generic conditional unrelated to gift.
    ['if you control a creature, draw a card'],
    // Unrelated.
    ['draw a card'],
    ['destroy target creature'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
