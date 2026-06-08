import { describe, it, expect } from 'vitest';
import { rule } from './effect.create_clue';

describe('effect.create_clue', () => {
  it.each([
    ['create a clue token'],
    ['create two clue tokens'],
    ['create a tapped clue token'],
    ['create x clue tokens'],
    ['create three clue tokens'],
    // Bare keyword form: reminder text stripped pre-tag, so "investigate" alone must fire.
    // Regression: Auspicious Arrival — "target creature gets +2/+2 until end of turn. investigate."
    ['target creature gets +2/+2 until end of turn. investigate.'],
    ['investigate'],
    // v0.14.6 — Anointed-Procession-style replacement frame (Case of the
    // Pilfered Proof): "those tokens plus a Clue token are created instead"
    // — the verb is "are created" rather than "create", but the produced
    // token IS a clue.
    ['if one or more tokens would be created under your control, those tokens plus a clue token are created instead'],
    // v0.38.0 — Batch 5: multi-subtype token-list template. Academy
    // Manufactor: "if you would create a clue, food, or treasure token,
    // instead create one of each".
    ['if you would create a clue, food, or treasure token, instead create one of each.'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['create a creature token'],            // wrong token type
    ['create a treasure token'],            // wrong token type
    ['create a food token'],                // wrong token type
    ['sacrifice a clue'],                   // consuming, not creating
    ['draw a card'],                        // unrelated
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
