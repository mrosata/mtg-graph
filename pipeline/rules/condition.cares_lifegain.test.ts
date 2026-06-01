import { describe, it, expect } from 'vitest';
import { rule } from './condition.cares_lifegain';

describe('condition.cares_lifegain', () => {
  it.each([
    ['whenever you gain life, draw a card'],
    ['whenever a player gains life, that player draws a card'],
    ['whenever you gain 3 or more life, create a soldier token'],
    ['if you gained life this turn, this creature gets +2/+2'],
    ['for each 1 life you gained this turn, scry 1'],
    ["if you've gained 3 or more life this turn, draw a card"],
    ['as long as you gained life this turn, this creature has trample'],
    // Gumdrop Poisoner — X-scaling on life gained
    ['up to one target creature gets -x/-x until end of turn, where x is the amount of life you gained this turn'],
    ['draw cards equal to the amount of life you gained this turn'],
    // Case of the Uneaten Feast — Case-solve cumulative-lifegain gate.
    ["to solve — you've gained 5 or more life this turn"],
    // Variant without contraction.
    ['to solve — you have gained 3 or more life this turn'],
    // Bare "if you gained N life this turn" already covered by existing pattern;
    // include as smoke-check that the change doesn't break it.
    ['if you gained 3 or more life this turn, draw a card'],
    // v0.20 — "gain or lose life" disjunction (Moonstone Harbinger).
    ['whenever you gain or lose life, put a +1/+1 counter on this creature.'],
    // v0.20 — past-tense disjunction (Star Charter).
    ['if you gained or lost life this turn, draw a card.'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['gain 3 life'],                                  // effect, not condition
    ['target player gains 5 life'],                   // effect, not condition
    ['this creature gains lifelink'],                 // keyword-gain, not life-gain
    ['whenever a player loses life'],                 // life-loss, not life-gain
    ['draw a card'],                                  // unrelated
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
