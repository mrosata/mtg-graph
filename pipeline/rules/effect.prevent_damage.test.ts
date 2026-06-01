// pipeline/rules/effect.prevent_damage.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.prevent_damage';

describe('effect.prevent_damage', () => {
  it.each([
    // Eerie Interference
    ['prevent all damage that would be dealt to you and creatures you control this turn by creatures'],
    // Fog / Holy Day
    ['prevent all combat damage that would be dealt this turn'],
    // Healing Salve
    ['prevent the next 3 damage that would be dealt to any target this turn'],
    // "next N damage" with larger numbers
    ['prevent the next 5 damage that would be dealt to target creature or player this turn'],
    // Multi-target variant
    ['prevent all damage that would be dealt to target creature this turn'],
    // v0.22.0 — The Mindskinner: "if a source you control would deal damage
    // to an opponent, prevent that damage and ...". Replacement-effect form
    // gated by `would deal damage` antecedent.
    ['if a source you control would deal damage to an opponent, prevent that damage and each opponent mills that many cards.'],
    ['if a creature would deal combat damage to you, prevent that damage.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Deals damage (the opposite axis)
    ['this creature deals 3 damage to any target'],
    ['__self__ deals damage equal to its power'],
    // Damage trigger
    ['whenever __self__ deals damage to a player'],
    // Unrelated
    ['draw a card'],
    ['destroy target creature'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
