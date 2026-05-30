import { describe, it, expect } from 'vitest';
import { rule } from './effect.destroy_permanent';

describe('effect.destroy_permanent (parent, universal-only)', () => {
  it.each([
    // Truly universal — no type-restricting modifier
    ['destroy target permanent'],
    ['destroy all permanents'],
    ['destroy each permanent'],
    ['destroy up to two target permanents'],
    // nontoken doesn't restrict type, so universal applies
    ['destroy target nontoken permanent'],
    // v0.14.9 — Regression (Kraul Whipcracker): "target token" — tokens
    // cover all permanent types, so this is semantically wildcard removal.
    ['destroy target token an opponent controls'],
    ['destroy all tokens'],
    ['destroy each token a player controls'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Type-restricting modifiers — parent must NOT match these
    ['destroy target nonland permanent'],
    ['destroy target nonartifact permanent'],
    ['destroy target nonenchantment permanent'],
    ['destroy target noncreature permanent'],
    ['destroy target nonplaneswalker permanent'],
    // Type-specific — parent must NOT match these
    ['destroy target creature'],
    ['destroy target artifact'],
    ['destroy target enchantment'],
    ['destroy target planeswalker'],
    ['destroy target land'],
    // Wrong verb
    ['exile target permanent'],
    ['return target permanent to its owner\'s hand'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
