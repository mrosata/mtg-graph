import { describe, it, expect } from 'vitest';
import { rule } from './effect.exile_creature';

describe('effect.exile_creature', () => {
  it.each([
    ['exile target creature'],
    ['exile target attacking creature'],
    ['exile all creatures'],
    ['exile each creature with mana value 3 or less'],
    // Replacement form
    ['if a creature would die, exile it instead'],
    ['if that creature would die this turn, exile it instead'],
    // Broad / qualified-broad including creature
    ['exile target permanent'],
    ['exile target nonland permanent'],
    // Regression: Cooped Up — Aura-frame activated exile.
    ['{2}{w}: exile enchanted creature'],
    ['exile enchanted creature'],
    ['exile equipped creature'],
    // Regression (Werefox Bodyguard): "up to one other target" — determiner
    // includes "other" between "up to N" and "target".
    ['exile up to one other target non-fox creature until __self__ leaves the battlefield'],
    ['exile another target creature you control'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  // Anaphoric "exile it" where "it" refers to a prior "target creature" antecedent.
  it.each([
    // Agrus Kos, Spirit of Justice — conditional exile of suspected creature
    ['whenever __self__ enters or attacks, choose up to one target creature. if it\'s suspected, exile it. otherwise, suspect it.'],
    // Generic conditional exile after target creature
    ['choose a target creature. if it has flying, exile it.'],
    // Attacking creature conditional exile
    ['whenever target creature attacks, exile it'],
    // v0.14.9 — Regression (Illicit Masquerade): "dies, exile it" trigger-
    // effect frame. The creature has just died; the trigger exiles it from
    // the graveyard, permanently removing it from the game. Functionally a
    // creature-removal effect for graph-edge purposes.
    ['whenever a creature you control with an impostor counter on it dies, exile it. return up to one other target creature card from your graveyard to the battlefield.'],
    ['when a creature you control dies, exile it'],
  ])('anaphoric exile-it: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['exile target noncreature permanent'],
    ['exile target artifact'],
    ['exile target enchantment'],
    ['destroy target creature'],
    ['return target creature to its owner\'s hand'],
    // Regression (Abuelo, Ancestral Echo): "exile … Return it to the battlefield"
    // is a flicker (bounce/blink axis), not removal. effect.bounce_creature covers it.
    ['{1}{w}{u}: exile another target creature or artifact you control. return it to the battlefield under its owner\'s control at the beginning of the next end step.'],
    ['exile target creature. return it to the battlefield under its owner\'s control at the beginning of the next end step.'],
    ['exile target creature, then return it to the battlefield under its owner\'s control'],
    // Anaphoric negatives — no "target creature" antecedent
    // Exile from graveyard, not battlefield removal
    ['choose a creature. exile it from your graveyard.'],
    // Exile of a hand card, not a creature on the battlefield
    ['target player exiles a card from their hand. they may play it this turn.'],
    // "exile it" with no preceding target creature antecedent
    ['if it has flying, you may exile it'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
