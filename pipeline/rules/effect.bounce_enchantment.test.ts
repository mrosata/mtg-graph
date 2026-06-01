import { describe, it, expect } from 'vitest';
import { rule } from './effect.bounce_enchantment';

describe('effect.bounce_enchantment', () => {
  it.each([
    ['return target enchantment to its owner\'s hand'],
    ['return target artifact or enchantment to its owner\'s hand'],
    ['exile target enchantment, then return that enchantment to the battlefield'],
    ['return target permanent to its owner\'s hand'],
    ['return target nonland permanent to its owner\'s hand'],
    ['return target noncreature permanent to its owner\'s hand'],
    // v0.21.0 — Get Out: "one or two target creatures and/or enchantments you
    // own to your hand". Count slot admits "one or two" and "up to two".
    ['return one or two target creatures and/or enchantments you own to your hand'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['return target nonenchantment permanent to its owner\'s hand'],
    ['return target creature to its owner\'s hand'],
    ['return target enchantment card from your graveyard'],
    ['destroy target enchantment'],
    // Regression (Coati Scavenger): "permanent card from your graveyard to
    // your hand" is graveyard recursion, not a bounce.
    ['descend 4 — when this creature enters, if there are four or more permanent cards in your graveyard, return target permanent card from your graveyard to your hand.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
