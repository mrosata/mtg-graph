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
    // v0.22.0 — The Rollercrusher Ride: "deals double that damage instead".
    // Same axis as the twice-that-much shape; just different lexical phrasing.
    ['delirium — if a source you control would deal noncombat damage to a permanent or player while there are four or more card types among cards in your graveyard, it deals double that damage instead.'],
    ['it deals double that damage instead'],
    ['that player loses double that life instead'],
    // v0.30 — Group 24 — Far Fortune, End Boss: additive "plus N instead"
    // amplifier. Same axis as multiplicative doublers (modifies a damage
    // event to increase it). The +N tail is the structural anchor.
    ['start your engines! whenever you attack, __self__ deals 1 damage to each opponent. max speed — if a source you control would deal damage to an opponent or a permanent an opponent controls, it deals that much damage plus 1 instead.'],
    ['it deals that much damage plus 2 instead'],
    // HIGH-13 (Collective Inferno): "double all damage that sources you control of the chosen type would deal".
    ['double all damage that sources you control of the chosen type would deal'],
    ['double all damage that creatures you control would deal'],
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
