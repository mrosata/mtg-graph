import { describe, it, expect } from 'vitest';
import { rule } from './condition.converge';

describe('condition.converge', () => {
  it.each([
    // Rancorous Archaic
    ['trample, reach converge — __self__ enters with a +1/+1 counter on it for each color of mana spent to cast it.'],
    // Arcane Omens
    ['converge — target player discards x cards, where x is the number of colors of mana spent to cast this spell.'],
    // Archaic's Agony
    ["converge — __self__ deals x damage to target creature, where x is the number of colors of mana spent to cast it."],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Bare flavor mention without the em-dash anchor
    ['the armies converge upon the plain.'],
    // No converge keyword at all
    ['target creature gets +1/+1 until end of turn.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
