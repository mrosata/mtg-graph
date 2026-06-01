import { describe, it, expect } from 'vitest';
import { rule } from './condition.cares_lifeloss';

describe('condition.cares_lifeloss', () => {
  it.each([
    // Cindering Cutthroat — ETB gate "if an opponent lost life this turn"
    ['this creature enters with a +1/+1 counter on it if an opponent lost life this turn'],
    // Vampire/aristocrat trigger workhorse.
    ['whenever an opponent loses life, you gain that much life'],
    ['whenever a player loses life, this creature gets +1/+1 until end of turn'],
    // Threshold form.
    ['whenever an opponent loses 3 or more life in a single turn, draw a card'],
    // X-scaling on life lost this turn.
    ["target creature gets -x/-x until end of turn, where x is the amount of life you've lost this turn"],
    // OTJ outlaws-care variant — "lost life this turn" gate.
    ['if a player lost 3 or more life this turn, draw a card'],
    // As-long-as duration gate.
    ['as long as an opponent has lost life this turn, this creature has menace'],
    // Variant with "an opponent" subject and "has lost".
    ['if any opponent has lost life this turn, deal 1 damage to that opponent'],
    // v0.21.0 — Kaito, Bane of Nightmares: "for each opponent who lost life
    // this turn" — relative-clause frame ("opponent WHO lost life") gates
    // a per-opponent count. Same axis as the bare "opponent lost life" gate.
    ['draw a card for each opponent who lost life this turn'],
    ['target players who have lost life this turn'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    // Effect, not condition.
    ['target player loses 3 life'],
    ['you lose 1 life'],
    // Lifegain mirror — different axis.
    ['whenever you gain life, draw a card'],
    // Keyword gain.
    ['this creature gains lifelink'],
    // Unrelated.
    ['draw a card'],
    ['destroy target creature'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
