import { describe, it, expect } from 'vitest';
import { rule } from './effect.scry';

describe('effect.scry', () => {
  it.each([
    ['scry 1'],
    ['scry 2'],
    ['then scry 3'],
    ['scry 1, then draw a card'],
    ['when this creature enters, scry 2'],
    // v0.38.0 — Batch 6: variable count slot. Alibou, Ancient Witness:
    // "and you scry x, where x is the number of tapped artifacts you control".
    ['and you scry x'],
    ['scry x'],
    ['scry that many'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['surveil 2'],                  // different keyword
    ['draw a card'],                // unrelated
    ['mill four cards'],            // separate effect
    ['look at the top card of your library'], // separate effect
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
