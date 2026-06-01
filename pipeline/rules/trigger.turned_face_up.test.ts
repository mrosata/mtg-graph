import { describe, it, expect } from 'vitest';
import { rule } from './trigger.turned_face_up';

describe('trigger.turned_face_up', () => {
  it.each([
    // Aurelia's Vindicator
    ['when this creature is turned face up, exile up to x other target creatures.'],
    // Branch of Vitu-Ghazi — land, not creature
    ['{t}: add {c}. disguise {3} when this land is turned face up, add two mana of any one color.'],
    // Bubble Smuggler — "as" replacement variant
    ['disguise {5}{u} as this creature is turned face up, put four +1/+1 counters on it.'],
    // Alley Assailant
    ['when this creature is turned face up, target opponent loses 3 life and you gain 3 life.'],
    // Case of the Pilfered Proof — whenever-any frame with "or" disjunction
    ['whenever a detective you control enters or is turned face up, put a +1/+1 counter on it.'],
    // Whenever-any frame, standalone
    ['whenever a face-down creature you control is turned face up, draw a card.'],
    // Concealed Weapon — equipment subtype (Gap 1)
    ['when this equipment is turned face up, attach it to target creature you control.'],
    // Gadget Technician — "enters or" disjunction, "when" prefix (Gap 2)
    ['when this creature enters or is turned face up, create a 1/1 colorless thopter.'],
    // Crowd-Control Warden — "enters or" disjunction, "as" prefix (Gap 2)
    ['as this creature enters or is turned face up, put x +1/+1 counters on it.'],
    // v0.14.20 — compound subject "this creature or another creature you control"
    // (Pyrotechnic Performer). Disjunctive subject with self-half + tribal-half.
    ['whenever this creature or another creature you control is turned face up, that creature deals damage equal to its power to each opponent.'],
    ['whenever this creature or another detective you control is turned face up, draw a card.'],
    // v0.21.0 — Growing Dread: active-voice "you turn a permanent face up".
    // Same axis as the passive "is turned face up" — just framed from the
    // controller's perspective.
    ['flash when this enchantment enters, manifest dread. whenever you turn a permanent face up, put a +1/+1 counter on it.'],
    ['whenever you turn a creature face up, draw a card.'],
    ['when you turn another permanent face up, gain 1 life.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // ETB trigger, not face-up
    ['when this creature enters, draw a card.'],
    // Bare state statement — no trigger verb prefix
    ['this creature is turned face up.'],
    // Reference to prior face-up events — not a trigger
    ['the cards that were turned face up this turn return to their owners\' hands.'],
    // Karlov Watchdog — static ability, not a trigger
    ["permanents your opponents control can't be turned face up during your turn."],
    // Unable to Scream — static ability on enchantment
    ["as long as enchanted creature is face down, it can't be turned face up."],
    // Unrelated
    ['draw a card.'],
    ['destroy target creature.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
