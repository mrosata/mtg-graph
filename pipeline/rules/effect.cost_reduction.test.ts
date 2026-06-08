// pipeline/rules/effect.cost_reduction.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.cost_reduction';

describe('effect.cost_reduction', () => {
  it.each([
    // Agatha: activated-ability cost reduction
    ['activated abilities of creatures you control cost {x} less to activate'],
    // Goreclaw: spell cost reduction
    ['each creature spell you cast with power 4 or greater costs {2} less to cast'],
    // Flat reduction
    ['creature spells you cast cost {1} less to cast'],
    // "Up to" reduction
    ['activated abilities of creatures you control cost up to {2} less to activate'],
    // "For each" scaling reduction (Emry/Ascendant Acolyte-style)
    ['this spell costs {1} less to cast for each artifact you control'],
    // Variable
    ['this spell costs {x} less to cast'],
    // v0.14.7 — Regression (Fugitive Codebreaker): passive-voice "this cost
    // is reduced by {N}" template. The Disguise cost has an explicit scaling
    // reducer on its own keyword cost rather than on a spell cost.
    ['disguise {5}{r}. this cost is reduced by {1} for each instant and sorcery card in your graveyard.'],
    ['this cost is reduced by {2}'],
    // Eluge, the Shoreless Sea — colored-mana cost reduction. "Costs {U} less"
    // is the same cost-reduction class as numeric; the colored variant is
    // common on colored-mana-cost-reduction designs (Beseech the Mirror-
    // adjacent printings).
    ['the first instant or sorcery spell you cast each turn costs {u} less to cast for each land you control with a flood counter on it.'],
    ['this spell costs {b} less to cast for each creature you control.'],
    // Hybrid mana reduction (rare but exists).
    ['this spell costs {w/b} less to cast.'],
    // v0.39.0 — Avatar Aang back face: "cost {W}{U}{B}{R}{G} less to cast"
    // — colored mana sequence in the cost slot. The single-symbol slot
    // doesn't admit a sequence; the slot must accept a SEQUENCE of symbols.
    ['spells you cast cost {w}{u}{b}{r}{g} less to cast.'],
    // v0.30 — Group 12 — Memory Guardian / Voyage Home: Affinity for
    // <type> is a printed cost-reducer keyword. The reminder text "(This
    // spell costs {1} less ... for each X)" is reminder-stripped before
    // rules run, so only the keyword itself remains as evidence.
    ['affinity for artifacts flying'],
    ['affinity for artifacts you draw three cards and gain 3 life.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Opposite direction: cost MORE (Thalia, Trinisphere)
    ['noncreature spells cost {1} more to cast'],
    // Alternative cost (not "less")
    ["you may pay {2}{u} rather than pay this spell's mana cost"],
    // Generic mana cost mention without "less"
    ['this spell costs {2}{r} to cast'],
    // Vanilla pump
    ['target creature gets +2/+2 until end of turn'],
    // ETB trigger
    ['when this creature enters, draw a card'],
    // Plain activated ability
    ['{t}: add {g}'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
