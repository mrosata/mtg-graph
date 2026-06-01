// pipeline/rules/effect.has_offspring.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.has_offspring';

describe('effect.has_offspring', () => {
  it.each([
    // Canonical BLB offspring keyword line. The reminder text "(You may pay
    // an additional {N} as you cast this spell. If you do, when this creature
    // enters, create a 1/1 token copy of it.)" is stripped pre-tagging.
    ['offspring {2}'],
    ['offspring {b}'],
    ['offspring {3}'],
    // Followed by additional ability lines on the same card.
    ['offspring {2} when this creature enters, you may forage'],
    ['offspring {b} flying'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    // Flavor / non-keyword uses of "offspring" must not match.
    ['the offspring of dragons'],
    ['this is your offspring'],
    ['draw a card'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
