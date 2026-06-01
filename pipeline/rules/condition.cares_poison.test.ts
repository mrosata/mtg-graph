import { describe, it, expect } from 'vitest';
import { rule } from './condition.cares_poison';

describe('condition.cares_poison', () => {
  it.each([
    // "for each poison counter" — Vraska's Fall / Toxic Onslaught style scaling.
    ['each opponent loses 1 life for each poison counter they have'],
    ['draw cards equal to the number of poison counters on target opponent'],
    // Vraska, Betrayal's Sting -9: gating-and-scaling on poison counter delta.
    ['if target player has fewer than nine poison counters, they get a number of poison counters equal to the difference.'],
    // "a player with ten or more poison counters loses the game" — the rules-text
    // form (reminder text gets stripped, but plain-rules versions exist).
    ['a player with ten or more poison counters loses the game'],
    // Trigger frame — "whenever an opponent gets a poison counter" payoff.
    ['whenever an opponent gets a poison counter, draw a card'],
    // Gate condition phrasing.
    ['if a player has eight or more poison counters, that player loses'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Pure production frame — Fynn-style "gets two poison counters" should NOT
    // fire on cares_poison; it's an effect.give_poison_counters payload.
    ['that player gets two poison counters'],
    ['target opponent gets a poison counter'],
    ['each opponent gets three poison counters'],
    // Wrong counter type — +1/+1 counter / loyalty.
    ['for each +1/+1 counter on this creature, draw a card'],
    ['for each loyalty counter, deal 1 damage'],
    // Unrelated.
    ['draw a card'],
    // Removal direction — different axis.
    ['remove a poison counter from target player'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
