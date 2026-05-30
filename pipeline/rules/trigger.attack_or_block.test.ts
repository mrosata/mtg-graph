// pipeline/rules/trigger.attack_or_block.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './trigger.attack_or_block';

describe('trigger.attack_or_block', () => {
  it.each([
    ['whenever __self__ attacks'],
    ['whenever a creature you control blocks'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['all creatures attack if able'],
    // Regression: Experimental Confectioner — "can't block" inside a token's
    // quoted oracle text must not register as an attack/block trigger.
    ['whenever you sacrifice a food, create a 1/1 black rat creature token with "this token can\'t block."'],
    ['this creature can\'t attack or block'],
    ['creatures you control can\'t be blocked'],
    // Regression (Contested Game Ball): participles inside noun phrases
    // ("the attacking player", "the blocking creature") aren't triggers.
    ["whenever you're dealt combat damage, the attacking player gains control of this artifact and untaps it."],
    ["whenever a creature deals combat damage, the blocking player loses 1 life."],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
