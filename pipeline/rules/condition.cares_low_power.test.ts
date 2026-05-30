// pipeline/rules/condition.cares_low_power.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './condition.cares_low_power';

describe('condition.cares_low_power', () => {
  it.each([
    // Unstable Glyphbridge // Sandswirl Wanderglyph — pick a low-power
    // creature each player controls; spare them from a wipe.
    ['for each player, choose a creature with power 2 or less that player controls'],
    ['creatures with power 1 or less'],
    ['target creature with power 2 or less'],
    ['target creature with the least power'],
    // "or fewer" variant — rare but valid.
    ['creatures with power 2 or fewer'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // High power — different axis (cares_high_power).
    ['creatures with power 3 or greater'],
    ['target creature with power 4 or more'],
    ['target creature with the greatest power'],
    // Mana-value, not power.
    ['target creature with mana value 2 or less'],
    // Blocker-restriction "can't be blocked by creatures with power N or less"
    // is pseudo-evasion, NOT a low-power payoff. Mirror of cares_high_power
    // BLOCKER_GUARD fix (commit 3d30e74).
    ["this creature can't be blocked by creatures with power 2 or less"],
    ["this creature can't be blocked by goblins with power 1 or less"],
    // Unrelated.
    ['draw a card'],
    ['flying'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
