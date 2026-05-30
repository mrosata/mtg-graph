import { describe, it, expect } from 'vitest';
import { rule } from './effect.create_map';

describe('effect.create_map', () => {
  it.each([
    ['create a map token'],
    ['create two map tokens'],
    ['create a tapped map token'],
    ['create x map tokens'],
    ['create three map tokens'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['create a creature token'],            // wrong token type
    ['create a treasure token'],            // wrong token type
    ['create a clue token'],                // wrong token type
    ['sacrifice a map'],                    // consuming, not creating
    ['draw a card'],                        // unrelated
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
