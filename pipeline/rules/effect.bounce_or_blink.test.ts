import { describe, it, expect } from 'vitest';
import { rule } from './effect.bounce_or_blink';

describe('effect.bounce_or_blink (parent, universal-only)', () => {
  it.each([
    ['return target permanent to its owner\'s hand'],
    ['return all permanents to their owners\' hands'],
    ['return each permanent to its owner\'s hand'],
    ['exile target permanent, then return that permanent to the battlefield'],
    ['return target nontoken permanent to its owner\'s hand'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['return target nonland permanent to its owner\'s hand'],
    ['return target noncreature permanent to its owner\'s hand'],
    ['return target creature to its owner\'s hand'],
    ['return target artifact to its owner\'s hand'],
    ['return target enchantment to its owner\'s hand'],
    ['return target creature card from your graveyard to your hand'],
    // Regression (Coati Scavenger): "permanent card from your graveyard to
    // your hand" is graveyard recursion, not a bounce.
    ['descend 4 — when this creature enters, if there are four or more permanent cards in your graveyard, return target permanent card from your graveyard to your hand.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
