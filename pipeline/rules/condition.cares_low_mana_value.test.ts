// pipeline/rules/condition.cares_low_mana_value.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './condition.cares_low_mana_value';

describe('condition.cares_low_mana_value', () => {
  it.each([
    // Feed the Cauldron
    ['destroy target creature with mana value 3 or less. if it\'s your turn, create a food token'],
    // Cut Down
    ['destroy target creature with mana value 2 or less'],
    // Hypothetical counterspell
    ['counter target spell with mana value 2 or less'],
    // Exile variant
    ['exile target creature with mana value 4 or less'],
    // Pluralized / different attribute (mana value of the spell)
    ['target creature an opponent controls with mana value 3 or less can\'t attack or block'],
    // v0.14.10 — Regression (Beseech the Mirror, Soul Search, Guidelight
    // Pathmaker, Thunderous Velocipede). Some cards use the verb-bearing
    // frame "mana value IS N or less" instead of bare "mana value N or less".
    // Same semantic — a low-MV gate — so the optional "is " arm admits both.
    ['if that spell\'s mana value is 4 or less'],
    ['if its mana value is 2 or less'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // High-mana-value side
    ['counter target spell with mana value 4 or greater'],
    ['whenever you cast a spell with mana value 5 or more'],
    // Self-describing
    ['this creature has mana value 2'],
    // Unrelated
    ['draw a card'],
    ['destroy target creature'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
