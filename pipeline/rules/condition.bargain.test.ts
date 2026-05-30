import { describe, it, expect } from 'vitest';
import { rule } from './condition.bargain';

describe('condition.bargain', () => {
  it.each([
    ['bargain'],
    ['bargain\ndeal 3 damage to any target'],
    ['if this spell was bargained, draw a card'],
    ['flying\nbargain'],
    ['bargain (you may sacrifice an artifact, creature, or enchantment as you cast this spell.)'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['draw a card'],
    ['destroy target creature'],
    ['flying'],
    ['create a treasure token'],
    ['whenever you sacrifice a permanent, gain 2 life'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
