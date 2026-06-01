import { describe, it, expect } from 'vitest';
import { rule } from './effect.exile_from_battlefield';

describe('effect.exile_from_battlefield (parent, universal-only)', () => {
  it.each([
    ['exile target permanent'],
    ['exile all permanents'],
    ['exile each permanent'],
    ['exile target nontoken permanent'],
    // v0.15 — `nonland permanent` is functionally universal (covers
    // creature/artifact/enchantment/planeswalker) and the canonical
    // Oblivion-Ring / Banishing Light parent frame. Previously excluded
    // as a "type-restricting" qualifier; now accepted.
    ['exile target nonland permanent'],
    ['exile target nonland permanent an opponent controls until this enchantment leaves the battlefield'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['exile target noncreature permanent'],
    ['exile target creature'],
    ['exile target artifact'],
    ['exile target enchantment'],
    ['exile target permanent card from a graveyard'],
    ['destroy target permanent'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
