import { describe, it, expect } from 'vitest';
import { rule } from './condition.cares_bending';

describe('condition.cares_bending', () => {
  it.each([
    ['whenever you waterbend, earthbend, firebend, or airbend, draw a card'],
    ['whenever you earthbend, put a +1/+1 counter on this creature'],
    ['whenever you airbend, scry 1'],
    ['then if you\'ve done all four this turn, transform avatar aang'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['airbend up to one other target creature'], // doing the bending, not caring about it
    ['waterbend {3}: sacrifice this enchantment'],
    ['draw a card'],
    ['put a +1/+1 counter on this creature'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
