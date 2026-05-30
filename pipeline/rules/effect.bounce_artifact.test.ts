import { describe, it, expect } from 'vitest';
import { rule } from './effect.bounce_artifact';

describe('effect.bounce_artifact', () => {
  it.each([
    ['return target artifact to its owner\'s hand'],
    ['return target artifact or enchantment to its owner\'s hand'],
    ['exile target artifact, then return that artifact to the battlefield'],
    ['return target permanent to its owner\'s hand'],
    ['return target nonland permanent to its owner\'s hand'],
    ['return target noncreature permanent to its owner\'s hand'],
    // Cryptic Coat — Equipment self-bounce activated ability.
    ["{1}{u}: return this equipment to its owner's hand"],
    // Vehicle self-bounce analog.
    ["return this vehicle to its owner's hand"],
    // "this artifact" generic form.
    ["return this artifact to its owner's hand"],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['return target nonartifact permanent to its owner\'s hand'],
    ['return target creature to its owner\'s hand'],
    ['return target artifact card from your graveyard'],
    ['destroy target artifact'],
    // Regression (Coati Scavenger): "permanent card from your graveyard to
    // your hand" is graveyard recursion, not a bounce.
    ['descend 4 — when this creature enters, if there are four or more permanent cards in your graveyard, return target permanent card from your graveyard to your hand.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
