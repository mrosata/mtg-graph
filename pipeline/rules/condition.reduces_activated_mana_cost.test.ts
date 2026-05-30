// pipeline/rules/condition.reduces_activated_mana_cost.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './condition.reduces_activated_mana_cost';

describe('condition.reduces_activated_mana_cost', () => {
  it.each([
    // Agatha of the Vile Cauldron
    ["activated abilities of creatures you control cost {x} less to activate, where x is __self__'s power"],
    // Blossoming Tortoise — land activations
    ['activated abilities of lands you control cost {1} less to activate'],
    // Forensic Gadgeteer — artifact activations
    ['activated abilities of artifacts you control cost {1} less to activate'],
    // Mutagen Man — token-scoped reducer
    ['activated abilities of artifact tokens you control cost {1} less to activate'],
    // Training Grounds template — bounded ("up to")
    ['activated abilities of creatures you control cost up to {2} less to activate'],
    // Heartstone-style flat reduction without the "of [type]" scope
    ['creature activated abilities cost {1} less to activate'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Generic spell cost reduction — NOT activated abilities
    ['creature spells you cast cost {1} less to cast'],
    // "Whenever you activate" trigger — cares about activations but not cost
    ['whenever you activate an ability, draw a card'],
    // Pithing Needle-style restriction — not a cost reducer
    ["activated abilities of sources with the chosen name can't be activated unless they're mana abilities"],
    // Marvin-style ability grant — not a cost reducer
    ['__self__ has all activated abilities of creatures you control'],
    // Vanilla pump
    ['target creature gets +2/+2 until end of turn'],
    // A card that HAS activated abilities but doesn't reduce their cost
    ['{t}: add {g}'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
