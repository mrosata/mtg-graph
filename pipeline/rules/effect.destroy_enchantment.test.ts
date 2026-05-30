import { describe, it, expect } from 'vitest';
import { rule } from './effect.destroy_enchantment';

describe('effect.destroy_enchantment', () => {
  it.each([
    ['destroy target enchantment'],
    ['destroy all enchantments'],
    ['destroy target enchantment or artifact'],
    ['destroy target artifact or enchantment'],
    ['destroy each enchantment you don\'t control'],
    ['destroy target permanent'],
    ['destroy target nonland permanent'],
    ['destroy target noncreature permanent'],
    // v0.14.1 — Molten Collapse two-comma chain.
    ['destroy target noncreature, nonland permanent with mana value 1 or less'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['destroy target nonenchantment permanent'],
    ['destroy target creature'],
    ['destroy target artifact'],
    ['exile target enchantment'],
    ['return target enchantment to its owner\'s hand'],
    ['enchanted creature gets +1/+1'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
