// pipeline/rules/trigger.life_changed.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './trigger.life_changed';

describe('trigger.life_changed', () => {
  it.each([
    ['whenever you gain life'],
    ['whenever an opponent loses life'],
    // v0.20 — disjunction trigger (Moonstone Harbinger).
    ['whenever you gain or lose life, put a +1/+1 counter on this creature.'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['you gain 3 life'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
