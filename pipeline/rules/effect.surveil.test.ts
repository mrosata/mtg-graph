import { describe, it, expect } from 'vitest';
import { rule } from './effect.surveil';

describe('effect.surveil', () => {
  it.each([
    ['surveil 1'],
    ['surveil 3'],
    ['surveil 2, then draw a card'],
    ['when this creature enters, surveil 2'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['scry 2'],                     // different keyword
    ['mill four cards'],            // separate effect
    ['draw a card'],                // unrelated
    ['look at the top card of your library'], // separate effect
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
