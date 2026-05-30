// pipeline/rules/condition.cares_high_mana_value.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './condition.cares_high_mana_value';

describe('condition.cares_high_mana_value', () => {
  it.each([
    ['whenever you cast a spell with mana value 5 or greater, draw a card'],
    ['whenever you cast a spell with mana value 4 or greater, create a treasure token'],
    ['counter target spell with mana value 4 or greater'],
    ['spend this mana only to cast spells with mana value 5 or greater'],
    ['whenever you cast a spell with mana value 6 or more, this creature gains flying'],
    ['if a creature with mana value 5 or greater entered the battlefield'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['put a +1/+1 counter on target creature'],
    ['this spell costs {1} less to cast'],
    ['draw a card'],
    ['this creature has mana value 5'], // describing the card itself, not gating on others
    ['exile cards with total mana value 8 or greater from your graveyard'], // collect-evidence, scales but not a cares-axis trigger
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
