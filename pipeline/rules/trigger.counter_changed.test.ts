// pipeline/rules/trigger.counter_changed.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './trigger.counter_changed';

describe('trigger.counter_changed', () => {
  it.each([
    ['whenever a +1/+1 counter is placed on'],
    ['whenever one or more counters are removed from'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['put a +1/+1 counter on'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });

  it.each([
    ['whenever a +1/+1 counter is put on a creature you control'],
    ['whenever one or more counters are placed on a permanent'],
    ['whenever a counter is removed from a creature'],
    ['whenever you put a counter on a permanent'],
    // v0.20 — counter-type slot (Stocking the Pantry).
    ['whenever you put one or more +1/+1 counters on a creature you control, put a supply counter on this enchantment'],
    ['whenever you put a charge counter on an artifact, draw a card'],
    // v0.45.0 — Doom Reigns Supreme: ordinal-threshold arm.
    ['when the fifth plan counter is put on this enchantment, you win the game.'],
  ])('matches (added): %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });
});
