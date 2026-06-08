// pipeline/rules/effect.drain.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.drain';

describe('effect.drain', () => {
  it.each([
    // Canonical "<opponent> loses N life and you gain N life" — both halves
    // resolve as one effect. Sanguine Bond / Vito family.
    ['each opponent loses 1 life and you gain 1 life'],
    ['target opponent loses 3 life and you gain 3 life'],
    ['that opponent loses 2 life and you gain 2 life'],
    // Variable amounts.
    ['each opponent loses x life and you gain x life, where x is the number of auras you control'],
    ['each opponent loses that many life and you gain that much life'],
    // Reversed order — "you gain N life. Each opponent loses N life."
    ['you gain 3 life. each opponent loses 3 life'],
    // Forward split-sentence drain: "Each opponent loses N life. You gain life equal to..."
    // Exsanguinate, various X-drain spells.
    ['each opponent loses x life. you gain life equal to the life lost this way.'],
    // Inside conditional / triggered ability.
    ['when this creature enters, target opponent loses 3 life and you gain 3 life'],
    ['{t}, sacrifice another creature: each opponent loses 1 life and you gain 1 life'],
    // v0.30 — Group 26 — Haunt the Network: "the chosen player loses X
    // life and you gain X life". SUBJECT slot needs to admit "the chosen
    // player" / "the chosen opponent" — common anaphor after a prior
    // "choose target opponent/player" clause.
    ['choose target opponent. create two 1/1 colorless thopter artifact creature tokens with flying. then the chosen player loses x life and you gain x life, where x is the number of artifacts you control.'],
    ['the chosen player loses 3 life and you gain 3 life'],
    // v0.38.0 — Batch 1: defending/attacking player subject. Agate-Blade
    // Assassin: "whenever __self__ attacks, defending player loses 1 life
    // and you gain 1 life".
    ['whenever __self__ attacks, defending player loses 1 life and you gain 1 life.'],
    ['attacking player loses 2 life and you gain 2 life'],
    // v0.39.0 — 200-card audit Ship 12f — Ark of Hunger. "Deals N damage
    // to each opponent and you gain N life" — the damage half acts as
    // life loss (combat / non-combat damage), and the paired lifegain
    // closes the drain. Distinct verb (`deals damage` rather than `loses
    // life`) but same drain semantic for graph purposes.
    ['this artifact deals 1 damage to each opponent and you gain 1 life.'],
    ['__self__ deals 3 damage to each opponent and you gain 3 life'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    // Standalone life-loss without paired gain — not drain.
    ['target opponent loses 2 life'],
    ['each opponent loses 4 life'],
    // Standalone lifegain without paired loss — not drain.
    ['you gain 3 life'],
    ['gain life equal to its power'],
    // Lifelink (damage-triggered, not a unified drain effect).
    ['this creature has lifelink'],
    ['target creature gains lifelink until end of turn'],
    // Generic.
    ['draw a card'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
