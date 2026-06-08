import { describe, it, expect } from 'vitest';
import { rule } from './effect.create_food';

describe('effect.create_food', () => {
  it.each([
    ['create a food token'],
    ['create two food tokens'],
    ['create a tapped food token'],
    ['create x food tokens'],
    ['create three food tokens'],
    ['create your choice of a blood token, a clue token, or a food token'],
    // v0.38.0 — Batch 5: multi-subtype token-list template. Academy
    // Manufactor: "create a clue, food, or treasure token".
    ['if you would create a clue, food, or treasure token, instead create one of each.'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['create a creature token'],            // wrong token type
    ['create a treasure token'],            // wrong token type
    ['create a clue token'],                // wrong token type
    ['sacrifice a food'],                   // consuming, not creating
    ['draw a card'],                        // unrelated
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
