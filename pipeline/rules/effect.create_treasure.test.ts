import { describe, it, expect } from 'vitest';
import { rule } from './effect.create_treasure';

describe('effect.create_treasure', () => {
  it.each([
    ['create a treasure token'],
    ['create two treasure tokens'],
    ['create a tapped treasure token'],
    ['create x treasure tokens'],
    ['create three treasure tokens'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['create a creature token'],            // wrong token type
    ['create a clue token'],                // wrong token type
    ['create a food token'],                // wrong token type
    ['sacrifice a treasure'],               // consuming, not creating
    ['draw a card'],                        // unrelated
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
