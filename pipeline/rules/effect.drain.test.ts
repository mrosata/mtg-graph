// pipeline/rules/effect.drain.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.drain';

describe('effect.drain', () => {
  it.each([
    // Canonical "<opponent> loses N life and you gain N life" — both halves
    // resolve as one effect. Sanguine Bond / Vito family.
    ['each opponent loses 1 life and you gain 1 life'],
    ['target opponent loses 3 life and you gain 3 life'],
    ['that opponent loses 2 life and you gain 2 life'],
    // Variable amounts.
    ['each opponent loses x life and you gain x life, where x is the number of auras you control'],
    ['each opponent loses that many life and you gain that much life'],
    // Reversed order — "you gain N life. Each opponent loses N life."
    ['you gain 3 life. each opponent loses 3 life'],
    // Inside conditional / triggered ability.
    ['when this creature enters, target opponent loses 3 life and you gain 3 life'],
    ['{t}, sacrifice another creature: each opponent loses 1 life and you gain 1 life'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    // Standalone life-loss without paired gain — not drain.
    ['target opponent loses 2 life'],
    ['each opponent loses 4 life'],
    // Standalone lifegain without paired loss — not drain.
    ['you gain 3 life'],
    ['gain life equal to its power'],
    // Lifelink (damage-triggered, not a unified drain effect).
    ['this creature has lifelink'],
    ['target creature gains lifelink until end of turn'],
    // Generic.
    ['draw a card'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
