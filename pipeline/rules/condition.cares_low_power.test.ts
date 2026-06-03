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
    // v0.20 — copula form (Reptilian Recruiter: "if that creature's power
    // is 2 or less"). Mirror of the cares_high_power copula arm.
    ["if that creature's power is 2 or less or if you control another lizard, gain control of that creature"],
    ['if its power is 1 or less, sacrifice it'],
    ["only if your commander's power is 2 or less"],
    // v0.35.0 — Batch 33: "power or toughness N or less" disjunction
    // (Arnyn, Deathbloom Botanist). The power branch should fire on this
    // axis (toughness branch is owned by cares_low_toughness).
    ['whenever a creature you control with power or toughness 1 or less dies, target opponent loses 2 life and you gain 2 life.'],
    ['creatures with power or toughness 2 or less'],
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
