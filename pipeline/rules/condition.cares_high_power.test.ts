import { describe, it, expect } from 'vitest';
import { rule } from './condition.cares_high_power';

describe('condition.cares_high_power', () => {
  it.each([
    // Boundary Lands Ranger style — power 4 or greater gate
    ['if you control a creature with power 4 or greater, draw a card'],
    ['creatures with power 5 or greater'],
    ['target creature with power 3 or more'],
    ['whenever a creature with power 4 or greater you control attacks'],
    ['target creature with the greatest power'],
    // v0.14.1 — "is the greatest power" predicate form (Skullspore Nexus).
    ['this spell costs {x} less to cast, where x is the greatest power among creatures you control'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Low power doesn't count — different axis
    ['creatures with power 1 or less'],
    ['creatures with power 2 or less'],
    ['this creature gets +1/+0'],
    ['power and toughness are equal to'],
    ['flying'],
    ['draw a card'],
    // Exit Specialist — "can't be blocked by creatures with power N or greater"
    // is a blocker-restriction (pseudo-evasion), NOT a high-power payoff.
    ["this creature can't be blocked by creatures with power 3 or greater"],
    // Tribal blocker-restriction variant.
    ["this creature can't be blocked by goblins with power 4 or greater"],
    // Delney composite — only the LOW-power half is real cares (different rule);
    // the HIGH-power blocker restriction must NOT fire this tag.
    ["creatures you control with power 2 or less can't be blocked by creatures with power 3 or greater"],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
