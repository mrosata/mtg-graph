// pipeline/rules/condition.cares_activated_abilities.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './condition.cares_activated_abilities';

describe('condition.cares_activated_abilities', () => {
  it.each([
    // Whenever-you-activate trigger
    ['whenever you activate an ability, draw a card'],
    // Whenever a creature activates trigger
    ["whenever a creature's activated ability resolves, you gain 1 life"],
    // Activation restriction (Pithing Needle)
    ["activated abilities of sources with the chosen name can't be activated unless they're mana abilities"],
    // Blanket activation restriction
    ['activated abilities of creatures your opponents control cannot be activated'],
    // Ability-grant payoff (Marvin, Soul Cauldron) — scope match without
    // cost-reduction frame, so the broad tag still applies.
    ['__self__ has all activated abilities of creatures you control'],
    // 2026-06-01 audit Group 12 — Adrenaline Jockey / Afterburner Expert:
    // "whenever you activate an exhaust ability". Qualifier slot (`exhaust`,
    // `loyalty`, etc.) before "ability" must be admitted.
    ['whenever you activate an exhaust ability, put a +1/+1 counter on this creature'],
    ['whenever you activate a loyalty ability, draw a card'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Just mentioning "ability" without "activated"
    ['whenever a creature with an ability enters the battlefield, draw a card'],
    // A triggered ability — does not care about activated abilities
    ['when this creature enters, draw a card'],
    // Generic spell cost reduction (not activated abilities)
    ['creature spells you cast cost {1} less to cast'],
    // Vanilla pump
    ['target creature gets +2/+2 until end of turn'],
    // Static anthem
    ['other creatures you control get +1/+1'],
    // A card that itself HAS an activated ability but doesn't care about them
    ['{t}: add {g}'],
    // Pure mana-cost reducer (Agatha) — moved out of this tag, now covered by
    // condition.reduces_activated_mana_cost. Drops the false-positive edge
    // to Crew vehicles (54 cards in Standard).
    ["activated abilities of creatures you control cost {x} less to activate, where x is __self__'s power"],
    // Training Grounds template — pure cost reducer
    ['activated abilities of creatures you control cost up to {2} less to activate'],
    // Heartstone-style flat reduction — also pure cost reducer
    ['activated abilities of creatures cost {1} less to activate'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
