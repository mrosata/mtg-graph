import { describe, it, expect } from 'vitest';
import { rule } from './effect.amplifies_damage_or_lifeloss';

describe('effect.amplifies_damage_or_lifeloss', () => {
  it.each([
    // Bloodletter of Aclazotz — life-loss doubler.
    ['if an opponent would lose life during your turn, they lose twice that much life instead'],
    // Neriv, Heart of the Storm — damage doubler scoped to recent entrants.
    ['if a creature you control that entered this turn would deal damage, it deals twice that much damage instead'],
    // Chocobo Kick — kicker conditional damage doubler.
    ['if this spell was kicked, the creature you control deals twice that much damage instead'],
    // Cut Propulsion — conditional damage doubler.
    ['if that creature has flying, it deals twice that much damage to itself instead'],
    // Classic Furnace-of-Rath wording.
    ['if a source would deal damage to a permanent or player, it deals twice that much damage to that permanent or player instead'],
    // Wound-Reflection wording.
    ['at the beginning of each opponent\'s end step, that player loses twice that much life'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Plain damage / lifeloss without doubling.
    ['deals 3 damage to any target'],
    ['target opponent loses 2 life'],
    // Multiplicative-but-not-doubling phrasings (we deliberately scope to "twice").
    ['deals damage equal to its power'],
    // Lifegain (not life loss).
    ['you gain 2 life'],
    // Token-counter doubling (different axis).
    ['if you would put one or more counters on a creature, put twice that many counters on it instead'],
    // "twice this turn" — Aggressive Mining style, no doubling shape.
    ['you may play an additional land this turn'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
