import { describe, it, expect } from 'vitest';
import { rule } from './effect.exile_enchantment';

describe('effect.exile_enchantment', () => {
  it.each([
    ['exile target enchantment'],
    ['exile all enchantments'],
    ['exile target artifact or enchantment'],
    ['exile target permanent'],
    ['exile target nonland permanent'],
    ['exile target noncreature permanent'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['exile target nonenchantment permanent'],
    ['exile target creature'],
    ['exile target enchantment card from a graveyard'],
    ['destroy target enchantment'],
    // Regression: Food Coma — "exile target creature an opponent controls
    // until this enchantment leaves the battlefield" — the target is a
    // creature; "enchantment" is a duration anchor (Banishing-Light pattern).
    ['exile target creature an opponent controls until this enchantment leaves the battlefield'],
    ['exile target artifact until this enchantment leaves the battlefield'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
