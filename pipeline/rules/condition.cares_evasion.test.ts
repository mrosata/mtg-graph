import { describe, it, expect } from 'vitest';
import { rule } from './condition.cares_evasion';

describe('condition.cares_evasion', () => {
  it.each([
    ['creatures with flying you control get +1/+1'],
    ['creature with flying'],
    ['creatures you control with menace'],
    ['target creature with intimidate'],
    ['whenever a creature with flying attacks, draw a card'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['flying'],                                            // self-keyword only — that's effect.has_evasion
    ['this creature gains flying until end of turn'],      // grants flying, not a payoff pattern
    ['target creature gains menace'],                      // grants, not cares
    ['draw a card'],
    ['trample'],
    ['creatures with trample'],                            // wrong keyword
    // Regression (Into the Fae Court): "creatures with flying" appearing inside
    // a created token's blocking restriction clause is NOT a payoff-group
    // reference; it's a defensive restriction on the produced token.
    ['create a 1/1 blue faerie creature token with flying and "this token can block only creatures with flying."'],
    ['this token can block only creatures with flying'],
    // Regression (Abuelo's Awakening): "creature with flying" describing the
    // form the reanimated card takes (a granted type+keyword) is not a payoff;
    // it's a grant clause defining the resulting creature.
    ['return target artifact or non-aura enchantment card from your graveyard to the battlefield. it\'s a 1/1 spirit creature with flying in addition to its other types.'],
    ['it\'s a 1/1 spirit creature with flying in addition to its other types'],
    // v0.14.29 — Massacre Girl regression. Printed keyword on ability line 1
    // ("Menace") followed by ability line 2 ("Creatures you control have
    // wither.") collapses post-normalization to "menace creatures you control
    // have wither". The old Pattern 2 ("<kw> creatures you control") matched
    // this cross-ability span as a FP. Pattern 2 was removed (it hit only
    // Massacre Girl in the live artifact); Pattern 1 form is the only real
    // payoff templating in Standard.
    ['menace creatures you control have wither. whenever a creature an opponent controls dies, if its toughness was less than 1, draw a card.'],
    ['flying creatures you control get +1/+0'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
