// pipeline/rules/effect.cant_lose.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.cant_lose';

describe('effect.cant_lose', () => {
  it.each([
    ["you can't lose the game and your opponents can't win the game"],
    ["you can't lose the game"],
    ["your opponents can't win the game"],
    ["you cannot lose the game"],
    ["you don't lose the game for having 0 or less life"],
    ["you don't lose the game due to having too many poison counters"],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Plain loss condition (no suppression)
    ['if a player has 0 or less life, that player loses the game'],
    // Win condition (different axis)
    ['if you have 50 or more life, you win the game'],
    // Conditional draw (different rule)
    ["you don't lose any life this turn"],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
